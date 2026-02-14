package route

import (
	"butuhbantuan/internal/handler"

	"github.com/gofiber/fiber/v2"
)

func ServiceRouteSetup(apiVersion string, app *fiber.App) {
	serviceGroup := app.Group(apiVersion + "/service")

	serviceGroup.Get("/available-region", handler.GetAvailabelRegion)
	serviceGroup.Get("/available-region/:regionName", handler.GetAvailableServicesByRegion)
	serviceGroup.Post("/available-region", handler.AddAvailableRegion)
}
