package route

import (
	"butuhbantuan/internal/handler"

	"github.com/gofiber/fiber/v2"
)

func GeocodingRouteSetup(apiVersion string, app *fiber.App) {
	mapboxGroup := app.Group(apiVersion + "/geocoding")
	mapboxGroup.Get("/reverse", handler.ReverseGeocoding)
	mapboxGroup.Post("/emergency/trip", handler.GetEmergencyWithTripEstimates)
}
