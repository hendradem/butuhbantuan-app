package handler

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var allowedImageExt = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
}

// UploadFile requires admin or unit auth (dashboard / ops).
func UploadFile(c *fiber.Ctx) error {
	return saveImageUpload(c, 5*1024*1024)
}

// UploadIncidentPhoto is a hardened public endpoint for citizen SOS/order photos.
// Rate-limited via middleware; magic-byte + extension allowlist only.
func UploadIncidentPhoto(c *fiber.Ctx) error {
	return saveImageUpload(c, 5*1024*1024)
}

func saveImageUpload(c *fiber.Ctx, maxBytes int64) error {
	file, err := c.FormFile("file")
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "no file provided")
	}
	if file.Size <= 0 || file.Size > maxBytes {
		return response.Error(c, fiber.StatusBadRequest, "file too large (max 5MB)")
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if _, ok := allowedImageExt[ext]; !ok {
		return response.Error(c, fiber.StatusBadRequest, "only jpg, png, or webp images are allowed")
	}

	src, err := file.Open()
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "failed to read file")
	}
	defer src.Close()

	header := make([]byte, 512)
	n, _ := io.ReadFull(src, header)
	header = header[:n]
	if !isAllowedImageMagic(header) {
		return response.Error(c, fiber.StatusBadRequest, "file content is not a valid image")
	}

	if err := os.MkdirAll("./uploads", 0755); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to create upload directory")
	}

	filename := fmt.Sprintf("%s%s", strings.ReplaceAll(uuid.NewString(), "-", ""), ext)
	dst := filepath.Join("./uploads", filename)

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0644)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to save file")
	}
	defer out.Close()

	if _, err := out.Write(header); err != nil {
		_ = os.Remove(dst)
		return response.Error(c, fiber.StatusInternalServerError, "failed to save file")
	}
	if _, err := io.Copy(out, io.LimitReader(src, maxBytes)); err != nil {
		_ = os.Remove(dst)
		return response.Error(c, fiber.StatusInternalServerError, "failed to save file")
	}

	return response.OK(c, "success", fiber.Map{
		"url": "/uploads/" + filename,
	})
}

func isAllowedImageMagic(b []byte) bool {
	if len(b) < 3 {
		return false
	}
	// JPEG
	if b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF {
		return true
	}
	// PNG
	if len(b) >= 8 && bytes.Equal(b[:8], []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}) {
		return true
	}
	// WebP: RIFF....WEBP
	if len(b) >= 12 && bytes.Equal(b[:4], []byte("RIFF")) && bytes.Equal(b[8:12], []byte("WEBP")) {
		return true
	}
	return false
}
