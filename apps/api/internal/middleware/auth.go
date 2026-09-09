package middleware

import "github.com/gofiber/fiber/v2"

// AdminAuth returns middleware that requires an X-Admin-Key header
// (or ?key= query for EventSource, which cannot set custom headers).
// If apiKey is empty (not configured), the middleware is disabled.
func AdminAuth(apiKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if apiKey == "" {
			return c.Next()
		}
		got := c.Get("X-Admin-Key")
		if got == "" {
			got = c.Query("key")
		}
		if got != apiKey {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error", "message": "unauthorized",
			})
		}
		return c.Next()
	}
}
