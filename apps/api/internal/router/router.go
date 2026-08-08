package router

import (
	"github.com/butuhbantuan/api/internal/handler"
	"github.com/butuhbantuan/api/internal/middleware"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/config"
	"github.com/gofiber/fiber/v2"
)

func Register(
	app *fiber.App,
	emergencySvc service.EmergencyUseCase,
	emergencyTypeSvc service.EmergencyTypeUseCase,
	regionSvc service.RegionUseCase,
	cfg *config.Config,
) {
	emergency := handler.NewEmergencyHandler(emergencySvc, emergencyTypeSvc)
	region := handler.NewRegionHandler(regionSvc)
	directions := handler.NewDirectionsHandler(cfg)
	geocoding := handler.NewGeocodingHandler(cfg, emergencySvc)
	authH := handler.NewAuthHandler(cfg)

	adminAuth := middleware.AdminAuth(cfg.AdminAPIKey)

	v1 := app.Group("/api/v1")
	v1.Get("/health", handler.Health)
	v1.Post("/auth/login", authH.Login)

	em := v1.Group("/emergency")
	em.Get("/", emergency.GetAll)
	em.Get("/type", emergency.GetAllTypes)
	em.Post("/type", adminAuth, emergency.CreateType)
	em.Put("/type/:id", adminAuth, emergency.UpdateType)
	em.Delete("/type/:id", adminAuth, emergency.DeleteType)
	em.Get("/province/:provinceID", emergency.GetByProvince)
	em.Get("/by-region/:regencyID", emergency.GetByRegency)
	em.Get("/dispatcher/:regencyID/:provinceID", emergency.GetDispatchers)
	em.Get("/by-type/:emergencyTypeID", emergency.GetByType)
	em.Post("/", adminAuth, emergency.Create)
	em.Put("/:id", adminAuth, emergency.Update)
	em.Delete("/:id", adminAuth, emergency.Delete)

	svc := v1.Group("/service")
	svc.Get("/available-region", region.GetAvailableRegions)
	svc.Get("/available-region/search/:regionName", region.GetAvailableRegionsByName)
	svc.Post("/available-region", adminAuth, region.CreateAvailableRegion)
	svc.Put("/available-region/:id", adminAuth, region.UpdateAvailableRegion)
	svc.Delete("/available-region/:id", adminAuth, region.DeleteAvailableRegion)

	dir := v1.Group("/directions")
	dir.Get("/", directions.GetDirections)
	dir.Get("/matrix", directions.GetDistanceMatrix)
	dir.Get("/geocoding", directions.GetGeocoding)
	dir.Get("/geolocation", directions.GetGeolocation)

	geo := v1.Group("/geocoding")
	geo.Get("/reverse", geocoding.ReverseGeocoding)
	geo.Post("/emergency/trip", geocoding.GetEmergencyWithTripEstimates)
}
