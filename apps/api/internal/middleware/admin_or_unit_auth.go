package middleware

import (
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/gofiber/fiber/v2"
)

// AdminOrUnitAuth accepts either a valid X-Admin-Key or X-Unit-Token.
// Used for shared write surfaces (e.g. authenticated uploads).
func AdminOrUnitAuth(apiKey string, unitCredRepo repository.UnitCredentialRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if apiKey != "" {
			got := c.Get("X-Admin-Key")
			if got == "" {
				got = c.Query("key")
			}
			if got != "" && got == apiKey {
				c.Locals("auth_role", "admin")
				return c.Next()
			}
		}

		token := c.Get("X-Unit-Token")
		if token == "" {
			token = c.Query("token")
		}
		if token != "" && unitCredRepo != nil {
			cred, err := unitCredRepo.FindByToken(token)
			if err == nil && cred != nil {
				c.Locals("auth_role", "unit")
				c.Locals("emergency_uuid", cred.EmergencyUUID)
				c.Locals("unit_name", cred.UnitName)
				c.Locals("unit_username", cred.Username)
				return c.Next()
			}
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "authentication required",
		})
	}
}
