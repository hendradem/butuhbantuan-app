package route

import (
	"butuhbantuan/internal/handler"

	"github.com/gofiber/fiber/v2"
)

func EmergencyRouteSetup(apiVersion string, app *fiber.App) {
	emergencyGroup := app.Group(apiVersion + "/emergency")

	emergencyGroup.Get("/", handler.GetEmergency)
	emergencyGroup.Post("/", handler.AddEmergency)
}
