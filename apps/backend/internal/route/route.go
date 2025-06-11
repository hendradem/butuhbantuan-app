package route

import (
	"github.com/gofiber/fiber/v2"
)

func RegisterRoute(app *fiber.App) {
	var apiVersion string = "api/v1"

	app.Get(apiVersion, func (c *fiber.Ctx) error {
		return c.SendString("butuhbantuan.com - your emergency assistant")
	})

	UserRouteSetup(apiVersion, app)
	EmergencyRouteSetup(apiVersion, app)
	DirectionsRouteSetup(apiVersion, app)
	MasterDataRouteSetup(apiVersion, app)
}
