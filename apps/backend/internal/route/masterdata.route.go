package route

import (
	"butuhbantuan/internal/handler"

	"github.com/gofiber/fiber/v2"
)

func MasterDataRouteSetup(apiVersion string, app *fiber.App) {
	emergencyGroup := app.Group(apiVersion + "/master")

	emergencyGroup.Get("/available-city-service", handler.GetAvailableServiceCity)
	emergencyGroup.Post("/available-city-service", handler.AddAvailableServiceCity)
}
