package handler

import (
	"github.com/butuhbantuan/api/pkg/config"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct{ cfg *config.Config }

func NewAuthHandler(cfg *config.Config) *AuthHandler { return &AuthHandler{cfg: cfg} }

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var body struct {
		Key string `json:"key"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "key is required")
	}
	// No key configured → open mode; accept any non-empty input and return it as the token.
	if h.cfg.AdminAPIKey == "" {
		if body.Key == "" {
			body.Key = "dev"
		}
		return response.OK(c, "authenticated", fiber.Map{"token": body.Key})
	}
	if body.Key != h.cfg.AdminAPIKey {
		return response.Error(c, fiber.StatusUnauthorized, "invalid key")
	}
	return response.OK(c, "authenticated", fiber.Map{"token": h.cfg.AdminAPIKey})
}
