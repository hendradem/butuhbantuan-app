package router

import (
	"github.com/butuhbantuan/api/internal/handler"
	"github.com/butuhbantuan/api/internal/middleware"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/config"
	"github.com/butuhbantuan/api/pkg/hub"
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
	sosSvc service.SOSUseCase,
	pushSvc service.PushUseCase,
	analyticsSvc service.AnalyticsUseCase,
	dispatchSvc service.DispatchUseCase,
	unitCredRepo repository.UnitCredentialRepository,
	mapTilesSvc service.MapTilesUseCase,
	cfg *config.Config,
	eventHub *hub.Hub,
) {
	emergency := handler.NewEmergencyHandler(emergencySvc, emergencyTypeSvc)
	region := handler.NewRegionHandler(regionSvc)
	directions := handler.NewDirectionsHandler(cfg)
	geocoding := handler.NewGeocodingHandler(cfg, emergencySvc)
	authH := handler.NewAuthHandler(cfg)
	feedbackH := handler.NewFeedbackHandler(feedbackSvc)
	orderH := handler.NewOrderHandler(orderSvc, emergencySvc)
	unitH := handler.NewUnitHandler(unitAuthSvc, orderSvc, emergencySvc, feedbackSvc).WithDispatch(dispatchSvc)
	sosH := handler.NewSOSHandler(sosSvc)
	pushH := handler.NewPushHandler(pushSvc)
	streamH := handler.NewStreamHandler(eventHub)
	analyticsH := handler.NewAnalyticsHandler(analyticsSvc)
	mapTilesH := handler.NewMapTilesHandler(mapTilesSvc)

	adminAuth := middleware.AdminAuth(cfg.AdminAPIKey)
	unitAuth := middleware.UnitAuth(unitCredRepo)

	v1 := app.Group("/api/v1")
	v1.Get("/health", handler.Health)
	v1.Post("/auth/login", authH.Login)
	v1.Post("/upload", handler.UploadFile)

	// Map tiles: public status + usage reporting for free-tier fallback
	maps := v1.Group("/maps")
	maps.Get("/tiles", mapTilesH.Status)
	maps.Post("/tiles/usage", mapTilesH.Report)

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
	em.Patch("/:id/operational", adminAuth, emergency.UpdateOperational)
	em.Patch("/:id/active", adminAuth, emergency.ToggleActive)

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

	track := v1.Group("/track")
	track.Post("/:token/arrive", orderH.MarkArrived)
	track.Get("/:token", orderH.GetTrackSession)
	track.Post("/:token", orderH.PingTrackLocation)

	unit := v1.Group("/unit")
	unit.Post("/auth/login", unitH.Login)
	unit.Get("/profile", unitAuth, unitH.GetProfile)
	unit.Get("/orders", unitAuth, unitH.GetOrders)
	unit.Post("/orders", unitAuth, unitH.CreateOrder)
	unit.Put("/orders/:id", unitAuth, unitH.UpdateOrder)
	unit.Post("/orders/:id/accept", unitAuth, unitH.AcceptOrder)
	unit.Post("/orders/:id/reject", unitAuth, unitH.RejectOrder)
	unit.Post("/orders/:id/reassign", unitAuth, unitH.ReassignOrder)
	unit.Post("/orders/:id/escalate-psc", unitAuth, unitH.EscalateOrder)
	unit.Get("/orders/:id/candidates", unitAuth, unitH.ListOrderCandidates)
	unit.Get("/orders/:id/history", unitAuth, unitH.GetOrderHistory)
	unit.Post("/orders/:id/track/enable", unitAuth, unitH.EnableTrack)
	unit.Post("/orders/:id/track/disable", unitAuth, unitH.DisableTrack)
	unit.Post("/orders/:id/arrive", unitAuth, unitH.MarkArrived)
	unit.Put("/orders/:id/report", unitAuth, unitH.SaveIncidentReport)
	unit.Get("/feedback", unitAuth, unitH.GetFeedback)
	unit.Patch("/fleet", unitAuth, unitH.UpdateFleet)
	unit.Patch("/availability", unitAuth, unitH.UpdateAvailability)
	unit.Get("/stream", unitAuth, streamH.Stream)

	// Dispatcher wilayah ops — gated server-side (403 if not dispatcher).
	unit.Get("/ops/orders", unitAuth, unitH.GetOpsOrders)
	unit.Get("/ops/units", unitAuth, unitH.GetOpsUnits)
	unit.Get("/ops/stats", unitAuth, unitH.GetOpsStats)

	sos := v1.Group("/sos")
	sos.Post("/", sosH.Submit)
	sos.Get("/", adminAuth, sosH.GetAll)

	push := v1.Group("/push")
	push.Get("/vapid-key", pushH.VAPIDPublicKey)
	push.Post("/subscribe", pushH.Subscribe)
	push.Delete("/subscribe", pushH.Unsubscribe)

	admin := v1.Group("/admin")
	admin.Post("/units/:uuid/credentials", adminAuth, unitH.SetCredentials)
	admin.Get("/orders", adminAuth, unitH.GetAllOrders)
	admin.Post("/orders", adminAuth, orderH.CreateManual)
	admin.Post("/orders/:id/accept", adminAuth, unitH.AdminAcceptOrder)
	admin.Post("/orders/:id/reject", adminAuth, unitH.AdminRejectOrder)
	admin.Post("/orders/:id/reassign", adminAuth, unitH.AdminReassignOrder)
	admin.Post("/orders/:id/escalate-psc", adminAuth, unitH.AdminEscalateOrder)
	admin.Post("/orders/:id/cancel", adminAuth, unitH.AdminCancelOrder)
	admin.Get("/orders/:id/candidates", adminAuth, unitH.AdminListOrderCandidates)
	admin.Get("/orders/:id/history", adminAuth, unitH.GetOrderHistory)
	admin.Post("/orders/:id/track/enable", adminAuth, unitH.AdminEnableTrack)
	admin.Post("/orders/:id/track/disable", adminAuth, unitH.AdminDisableTrack)
	admin.Post("/orders/:id/arrive", adminAuth, unitH.AdminMarkArrived)
	admin.Put("/orders/:id/report", adminAuth, unitH.AdminSaveIncidentReport)
	admin.Get("/analytics", adminAuth, analyticsH.Get)
	admin.Get("/analytics/heatmap", adminAuth, analyticsH.GetHeatmap)
	admin.Get("/maps/tiles", adminAuth, mapTilesH.Status)
	admin.Get("/stream", adminAuth, streamH.AdminStream)
}
