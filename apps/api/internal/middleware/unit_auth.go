package middleware

import (
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/gofiber/fiber/v2"
)

func UnitAuth(repo repository.UnitCredentialRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Get("X-Unit-Token")
		if token == "" {
			token = c.Query("token") // fallback for EventSource (can't set headers)
		}
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": "unit token required",
			})
		}
		cred, err := repo.FindByToken(token)
		if err != nil || cred == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": "invalid or expired token",
			})
		}
		c.Locals("emergency_uuid", cred.EmergencyUUID)
		c.Locals("unit_name", cred.UnitName)
		c.Locals("unit_username", cred.Username)
		return c.Next()
	}
}
