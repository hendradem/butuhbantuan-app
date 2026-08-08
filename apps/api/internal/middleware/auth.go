package middleware

import "github.com/gofiber/fiber/v2"

// AdminAuth returns middleware that requires an X-Admin-Key header.
// If apiKey is empty (not configured), the middleware is disabled.
func AdminAuth(apiKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if apiKey == "" {
			return c.Next()
		}
		if c.Get("X-Admin-Key") != apiKey {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error", "message": "unauthorized",
			})
		}
		return c.Next()
	}
}
