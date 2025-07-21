package route

import (
	"butuhbantuan/internal/handler"

	"github.com/gofiber/fiber/v2"
)

func EmergencyRouteSetup(apiVersion string, app *fiber.App) {
	emergencyGroup := app.Group(apiVersion + "/emergency")

	emergencyGroup.Get("/", handler.GetAllEmergency)
	emergencyGroup.Get("/province/:provinceID", handler.GetAllEmergencyByProvince)
	emergencyGroup.Get("/by-region/:regencyID", handler.GetEmergencyByRegion)
	emergencyGroup.Get("/dispatcher/:regencyID/:provinceID", handler.GetEmergencyDispatcher)
	emergencyGroup.Get("/by-type/:emergencyTypeID", handler.GetEmergencyByType)
	emergencyGroup.Post("/", handler.AddEmergency)
	emergencyGroup.Get("/type", handler.GetEmergencyType)
	emergencyGroup.Post("/type", handler.AddEmergencyType)
	emergencyGroup.Delete("/type/:id", handler.DeleteEmergencyType)
}
