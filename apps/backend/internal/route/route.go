package route

import (
	"github.com/gofiber/fiber/v2"
)

func RegisterRoute(app *fiber.App) {
	var apiVersion string = "/api/v1"
	UserRouteSetup(apiVersion, app)
	EmergencyRouteSetup(apiVersion, app)
	DirectionsRouteSetup(apiVersion, app)
}
