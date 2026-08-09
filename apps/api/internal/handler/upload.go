package handler

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

func UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "no file provided")
	}

	ct := file.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		return response.Error(c, fiber.StatusBadRequest, "only image files are allowed")
	}

	if file.Size > 5*1024*1024 {
		return response.Error(c, fiber.StatusBadRequest, "file too large (max 5MB)")
	}

	if err := os.MkdirAll("./uploads", 0755); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to create upload directory")
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dst := filepath.Join("./uploads", filename)

	if err := c.SaveFile(file, dst); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to save file")
	}

	return response.OK(c, "success", fiber.Map{
		"url": "/uploads/" + filename,
	})
}
