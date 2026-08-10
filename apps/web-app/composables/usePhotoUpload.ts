export function usePhotoUpload() {
  const photoFile = ref<File | null>(null);
  const photoPreview = ref<string | null>(null);
  const uploading = ref(false);
  const uploadError = ref<string | null>(null);

  function selectPhoto(event: Event) {
    uploadError.value = null;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      uploadError.value = "File harus berupa gambar";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      uploadError.value = "Ukuran file maksimal 5MB";
      return;
    }
    if (photoPreview.value) URL.revokeObjectURL(photoPreview.value);
    photoFile.value = file;
    photoPreview.value = URL.createObjectURL(file);
  }

  async function uploadPhoto(baseUrl: string): Promise<string | null> {
    if (!photoFile.value) return null;
    uploading.value = true;
    uploadError.value = null;
    try {
      const form = new FormData();
      form.append("file", photoFile.value);
      const res = await $fetch<{ data: { url: string } }>(`${baseUrl}/api/v1/upload`, {
        method: "POST",
        body: form,
      });
      return res.data?.url ?? null;
    } catch {
      uploadError.value = "Gagal mengunggah foto";
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

  return { photoFile, photoPreview, uploading, uploadError, selectPhoto, uploadPhoto, removePhoto };
}
