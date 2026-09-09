export function usePhotoUpload() {
  const photoFile = ref<File | null>(null);
  const photoPreview = ref<string | null>(null);
  const uploading = ref(false);
  const uploadError = ref<string | null>(null);

  /** Keep under Fiber BodyLimit + server 5MB handler cap (with multipart overhead). */
  const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
  const TARGET_BYTES = 1.6 * 1024 * 1024;

  function selectPhoto(event: Event) {
    uploadError.value = null;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      uploadError.value = "File harus berupa gambar";
      return;
    }
    // Large phone photos are OK — we compress before upload.
    if (file.size > 40 * 1024 * 1024) {
      uploadError.value = "Ukuran file terlalu besar";
      return;
    }
    if (photoPreview.value) URL.revokeObjectURL(photoPreview.value);
    photoFile.value = file;
    photoPreview.value = URL.createObjectURL(file);
  }

  async function canvasFromFile(file: File): Promise<HTMLCanvasElement | null> {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      bitmap = null;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const maxEdge = 1600;

    if (bitmap) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      return canvas;
    }

    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("decode"));
        el.src = url;
      });
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
  }

  /** Always JPEG-compress for upload so HEIC / huge camera files pass server checks. */
  async function fileAsJpeg(file: File): Promise<File> {
    const canvas = await canvasFromFile(file);
    if (!canvas) {
      // Decode failed — only send original if already small enough
      if (file.size <= MAX_UPLOAD_BYTES && (file.type === "image/jpeg" || file.type === "image/jpg")) {
        return file;
      }
      throw new Error("Gagal memproses foto — coba JPG/PNG lain");
    }

    let quality = 0.82;
    let blob = await canvasToJpeg(canvas, quality);
    while (blob && blob.size > TARGET_BYTES && quality > 0.45) {
      quality -= 0.12;
      blob = await canvasToJpeg(canvas, quality);
    }

    // Still too big — shrink canvas further
    if (blob && blob.size > MAX_UPLOAD_BYTES) {
      const shrink = document.createElement("canvas");
      const sctx = shrink.getContext("2d");
      if (sctx) {
        const scale = 0.7;
        shrink.width = Math.max(1, Math.round(canvas.width * scale));
        shrink.height = Math.max(1, Math.round(canvas.height * scale));
        sctx.drawImage(canvas, 0, 0, shrink.width, shrink.height);
        blob = await canvasToJpeg(shrink, 0.7);
      }
    }

    if (!blob || blob.size > MAX_UPLOAD_BYTES) {
      throw new Error("Foto terlalu besar setelah kompresi — coba foto lain");
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "incident";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  }

  async function uploadPhoto(baseUrl: string): Promise<string | null> {
    if (!photoFile.value) return null;
    uploading.value = true;
    uploadError.value = null;
    try {
      const uploadFile = await fileAsJpeg(photoFile.value);
      const form = new FormData();
      form.append("file", uploadFile, uploadFile.name);
      const res = await $fetch<{ data?: { url?: string }; url?: string }>(
        `${baseUrl.replace(/\/$/, "")}/api/v1/upload/incident`,
        { method: "POST", body: form },
      );
      const url = res?.data?.url || res?.url || null;
      if (!url) {
        uploadError.value = "Upload berhasil tapi URL kosong";
        return null;
      }
      return url;
    } catch (e: any) {
      const status = e?.statusCode || e?.status || e?.response?.status;
      let msg = e?.data?.message || e?.statusMessage || e?.message || "Gagal mengunggah foto";
      if (status === 413) {
        msg = "Foto terlalu besar untuk server — coba foto lain";
      }
      uploadError.value = msg;
      return null;
    } finally {
      uploading.value = false;
    }
  }

  function removePhoto() {
    if (photoPreview.value) URL.revokeObjectURL(photoPreview.value);
    photoFile.value = null;
    photoPreview.value = null;
    uploadError.value = null;
  }

  onUnmounted(() => {
    if (photoPreview.value) URL.revokeObjectURL(photoPreview.value);
  });

  return {
    photoFile,
    photoPreview,
    uploading,
    uploadError,
    selectPhoto,
    uploadPhoto,
    removePhoto,
    hasPhoto: computed(() => !!photoFile.value),
  };
}
