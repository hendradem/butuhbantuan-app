package route

import (
	"butuhbantuan/internal/handler"

	"github.com/gofiber/fiber/v2"
)

func DirectionsRouteSetup(apiVersion string, app *fiber.App) {
	mapboxGroup := app.Group(apiVersion + "/directions")
	mapboxGroup.Get("/", handler.GetDirectionsRoute)
	mapboxGroup.Get("/matrix", handler.GetDistanceMatrixRoute)
	mapboxGroup.Get("/geocoding", handler.GetGeocodingApi)
	mapboxGroup.Get("/geolocation", handler.GetGeolocation)
}
