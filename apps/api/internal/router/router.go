package router

import (
	"github.com/butuhbantuan/api/internal/handler"
	"github.com/butuhbantuan/api/internal/middleware"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/config"
	"github.com/gofiber/fiber/v2"
)

func Register(
	app *fiber.App,
	emergencySvc service.EmergencyUseCase,
	emergencyTypeSvc service.EmergencyTypeUseCase,
	regionSvc service.RegionUseCase,
	feedbackSvc service.FeedbackUseCase,
	orderSvc service.OrderUseCase,
	unitAuthSvc service.UnitAuthUseCase,
	unitCredRepo repository.UnitCredentialRepository,
	cfg *config.Config,
) {
	emergency := handler.NewEmergencyHandler(emergencySvc, emergencyTypeSvc)
	region := handler.NewRegionHandler(regionSvc)
	directions := handler.NewDirectionsHandler(cfg)
	geocoding := handler.NewGeocodingHandler(cfg, emergencySvc)
	authH := handler.NewAuthHandler(cfg)
	feedbackH := handler.NewFeedbackHandler(feedbackSvc)
	orderH := handler.NewOrderHandler(orderSvc)
	unitH := handler.NewUnitHandler(unitAuthSvc, orderSvc, emergencySvc, feedbackSvc)

	adminAuth := middleware.AdminAuth(cfg.AdminAPIKey)
	unitAuth := middleware.UnitAuth(unitCredRepo)

	v1 := app.Group("/api/v1")
	v1.Get("/health", handler.Health)
	v1.Post("/auth/login", authH.Login)
	v1.Post("/upload", adminAuth, handler.UploadFile)

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
	svc.Get("/province", region.GetProvinces)
	svc.Get("/regency", region.GetRegenciesByProvince)
	svc.Get("/regency/search", region.SearchRegencies)
	svc.Get("/available-region", region.GetAvailableRegions)
	svc.Get("/available-region/:regionName", region.GetAvailableRegionsByName)
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
	geo.Get("/search", geocoding.SearchGeocoding)
	geo.Post("/emergency/trip", geocoding.GetEmergencyWithTripEstimates)

	fb := v1.Group("/feedback")
	fb.Post("/", feedbackH.Submit)
	fb.Get("/stats", feedbackH.GetStats)
	fb.Get("/grouped", adminAuth, feedbackH.GetGroupedByUnit)
	fb.Get("/unit/:uuid", adminAuth, feedbackH.GetByUnit)
	fb.Get("/", adminAuth, feedbackH.GetAll)

	ord := v1.Group("/order")
	ord.Post("/", orderH.Create)
	ord.Get("/ticket/:number", orderH.GetByTicketNumber)

	unit := v1.Group("/unit")
	unit.Post("/auth/login", unitH.Login)
	unit.Get("/profile", unitAuth, unitH.GetProfile)
	unit.Get("/orders", unitAuth, unitH.GetOrders)
	unit.Put("/orders/:id", unitAuth, unitH.UpdateOrder)
	unit.Get("/feedback", unitAuth, unitH.GetFeedback)

	admin := v1.Group("/admin")
	admin.Post("/units/:uuid/credentials", adminAuth, unitH.SetCredentials)
	admin.Get("/orders", adminAuth, unitH.GetAllOrders)
}
