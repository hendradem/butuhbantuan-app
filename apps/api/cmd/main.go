package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	jsonrepo "github.com/butuhbantuan/api/internal/repository/json"
	mysqlrepo "github.com/butuhbantuan/api/internal/repository/mysql"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/router"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/internal/service/hospitalprovider"
	"github.com/butuhbantuan/api/pkg/config"
	"github.com/butuhbantuan/api/pkg/database"
	"github.com/butuhbantuan/api/pkg/hub"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"gorm.io/gorm"
)

func main() {
	seed := flag.Bool("seed", false, "seed database from data/*.json (requires STORAGE=mysql)")
	seedWilayah := flag.Bool("seed-wilayah", false, "seed national province/regency master only")
	flag.Parse()

	cfg := config.Load()

	var (
		emergencyRepo repository.EmergencyRepository
		typeRepo      repository.EmergencyTypeRepository
		regionRepo    repository.RegionRepository
		feedbackRepo  repository.FeedbackRepository
		orderRepo     repository.OrderRepository
		unitCredRepo  repository.UnitCredentialRepository
		sosRepo       repository.SOSRepository
		pushRepo      repository.PushRepository
		analyticsRepo repository.AnalyticsRepository
		attemptRepo   repository.DispatchAttemptRepository
		eventRepo     repository.OrderEventRepository
		tileRepo       repository.MapTileUsageRepository
		assessmentRepo repository.AssessmentRepository
		db             *gorm.DB
	)

	switch cfg.Storage {
	case "mysql":
		var err error
		db, err = database.Connect(cfg.DSN)
		if err != nil {
			log.Fatalf("failed to connect to mysql: %v", err)
		}

		mysqlEmergency := mysqlrepo.NewEmergencyRepo(db)
		mysqlType := mysqlrepo.NewEmergencyTypeRepo(db)
		mysqlRegion := mysqlrepo.NewRegionRepo(db)
		mysqlFeedback := mysqlrepo.NewFeedbackRepo(db)
		mysqlOrder := mysqlrepo.NewOrderRepo(db)
		mysqlUnitCred := mysqlrepo.NewUnitCredentialRepo(db)
		mysqlSOS := mysqlrepo.NewSOSRepo(db)
		mysqlPush := mysqlrepo.NewPushRepo(db)
		mysqlAnalytics := mysqlrepo.NewAnalyticsRepo(db)
		mysqlAttempt := mysqlrepo.NewDispatchAttemptRepo(db)
		mysqlEvent := mysqlrepo.NewOrderEventRepo(db)
		mysqlTiles := mysqlrepo.NewMapTileUsageRepo(db)
		mysqlAssessment := mysqlrepo.NewAssessmentRepo(db)

		emergencyRepo = mysqlEmergency
		typeRepo = mysqlType
		regionRepo = mysqlRegion
		feedbackRepo = mysqlFeedback
		orderRepo = mysqlOrder
		unitCredRepo = mysqlUnitCred
		sosRepo = mysqlSOS
		pushRepo = mysqlPush
		analyticsRepo = mysqlAnalytics
		attemptRepo = mysqlAttempt
		eventRepo = mysqlEvent
		tileRepo = mysqlTiles

		if *seedWilayah {
			if err := seedNationalWilayah(mysqlEmergency); err != nil {
				log.Fatalf("seed-wilayah failed: %v", err)
			}
			log.Println("wilayah seeding completed")
			return
		}

		if *seed {
			if err := runSeed(mysqlEmergency, mysqlType, mysqlRegion); err != nil {
				log.Fatalf("seed failed: %v", err)
			}
			if err := mysqlAssessment.EnsureDefaultTemplates(); err != nil {
				log.Printf("assessment seed warning: %v", err)
			}
			log.Println("seeding completed")
			return
		}

		// Auto-seed national wilayah on first run (idempotent — INSERT IGNORE).
		var provinceCount int64
		if db.Table("provinces").Count(&provinceCount).Error == nil && provinceCount == 0 {
			log.Println("province table empty — auto-seeding national wilayah...")
			if err := seedNationalWilayah(mysqlEmergency); err != nil {
				log.Printf("auto-seed wilayah warning: %v", err)
			} else {
				log.Println("auto-seed wilayah done")
			}
		}

		if err := mysqlAssessment.EnsureDefaultTemplates(); err != nil {
			log.Printf("assessment template seed warning: %v", err)
		}
		assessmentRepo = mysqlAssessment

	default: // "json"
		if *seed {
			log.Fatalln("--seed requires STORAGE=mysql")
		}
		repo, err := jsonrepo.New("")
		if err != nil {
			log.Fatalf("failed to load json data: %v", err)
		}
		emergencyRepo = repo
		typeRepo = repo
		regionRepo = repo
	}

	regionSvc := service.NewRegionService(regionRepo)
	var feedbackSvc service.FeedbackUseCase
	if feedbackRepo != nil {
		feedbackSvc = service.NewFeedbackService(feedbackRepo)
	} else {
		feedbackSvc = service.NewNoopFeedbackService()
	}
	var analyticsSvc service.AnalyticsUseCase
	if analyticsRepo != nil {
		analyticsSvc = service.NewAnalyticsService(analyticsRepo, emergencyRepo)
	} else {
		analyticsSvc = &service.NoopAnalyticsService{}
	}

	// Push service — active only when VAPID keys are configured and storage is mysql.
	var pushSvc service.PushUseCase
	if pushRepo != nil && cfg.VAPIDPrivateKey != "" && cfg.VAPIDPublicKey != "" {
		pushSvc = service.NewPushService(pushRepo, cfg.VAPIDPrivateKey, cfg.VAPIDPublicKey, cfg.VAPIDSubject)
		log.Println("web push enabled")
	} else {
		pushSvc = service.NewNoopPushService()
	}

	eventHub := hub.New()
	var orderSvc service.OrderUseCase
	var unitAuthSvc service.UnitAuthUseCase
	var sosSvc service.SOSUseCase
	var dispatchSvc service.DispatchUseCase

	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	if orderRepo != nil {
		osvc := service.NewOrderService(orderRepo, eventHub, pushSvc)
		if attemptRepo != nil {
			osvc.WithAttemptRepo(attemptRepo)
		}
		if eventRepo != nil {
			osvc.WithEventRepo(eventRepo)
		}
		orderSvc = osvc
		unitAuthSvc = service.NewUnitAuthService(unitCredRepo)

		if attemptRepo != nil {
			dispatchSvc = service.NewDispatchService(
				emergencyRepo,
				orderRepo,
				attemptRepo,
				orderSvc,
				eventHub,
				pushSvc,
				time.Duration(cfg.DispatchSLASecs)*time.Second,
			).WithTypeRepo(typeRepo)
			escalationWorker := service.NewEscalationWorker(dispatchSvc, 15*time.Second)
			escalationWorker.RecoverOverdue()
			go escalationWorker.Start(workerCtx)
			log.Printf("auto-dispatch enabled (sla=%ds)", cfg.DispatchSLASecs)
		} else {
			dispatchSvc = service.NewNoopDispatchService()
		}

		if sosRepo != nil {
			sosSvc = service.NewSOSService(sosRepo, dispatchSvc).WithOrderRepo(orderRepo)
		}
	} else {
		orderSvc = service.NewNoopOrderService()
		unitAuthSvc = service.NewNoopUnitAuthService()
		unitCredRepo = &repository.NoopUnitCredentialRepository{}
		dispatchSvc = service.NewNoopDispatchService()
	}
	if sosSvc == nil {
		sosSvc = service.NewNoopSOSService()
	}

	emergencySvc := service.NewEmergencyService(emergencyRepo, typeRepo, unitCredRepo)

	mapTilesSvc := service.NewMapTilesService(tileRepo, true)

	var hospitalSvc service.HospitalUseCase
	if db != nil {
		hospitalMasterRepo := mysqlrepo.NewHospitalMasterRepo(db)
		var hospitalProvider domain.HospitalProvider
		if cfg.SatuSehatForceStub || cfg.SatuSehatClientID == "" || cfg.SatuSehatClientSecret == "" {
			hospitalProvider = hospitalprovider.NewStubProvider("data/hospitals/stub_by_regency.json")
			log.Println("hospital master: using stub provider (set SATUSEHAT_CLIENT_ID/SECRET for live MSI)")
		} else {
			hospitalProvider = hospitalprovider.NewSatuSehatProvider(cfg.SatuSehatBaseURL, cfg.SatuSehatClientID, cfg.SatuSehatClientSecret)
			log.Println("hospital master: using SATUSEHAT MSI provider")
		}
		hospitalSvc = service.NewHospitalService(hospitalMasterRepo, regionRepo, emergencyRepo, typeRepo, hospitalProvider)
	}

	var wilayahResolver *service.WilayahResolver
	if regionRepo != nil {
		wilayahResolver = service.NewWilayahResolver(regionRepo, emergencyRepo)
	}

	var assessmentSvc service.AssessmentUseCase
	if assessmentRepo != nil {
		assessmentSvc = service.NewAssessmentService(assessmentRepo, emergencyRepo)
	}

	app := fiber.New(fiber.Config{
		// Multipart incident photos (client compresses; leave headroom for form overhead).
		BodyLimit: 12 * 1024 * 1024,
	})
	app.Use(logger.New())
	app.Static("/uploads", "./uploads")
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Admin-Key, X-Unit-Token, X-Requester-Phone",
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowCredentials: true,
	}))

	complianceSvc := service.NewAmbulanceComplianceService(emergencyRepo)

	// Ticket lookup (citizen "cek tiket saya" via HP + OTP). Falls back to a
	// dev-mode log sender until an SMS/WA gateway is wired.
	var ticketLookupSvc *service.TicketLookupService
	if orderRepo != nil {
		ticketLookupSvc = service.NewTicketLookupService(orderRepo, nil)
	}

	router.Register(app, emergencySvc, emergencySvc, regionSvc, feedbackSvc, orderSvc, unitAuthSvc, sosSvc, pushSvc, analyticsSvc, dispatchSvc, unitCredRepo, mapTilesSvc, wilayahResolver, hospitalSvc, assessmentSvc, complianceSvc, ticketLookupSvc, cfg, eventHub)

	// Graceful shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("shutting down server...")
		workerCancel()
		if err := app.Shutdown(); err != nil {
			log.Printf("shutdown error: %v", err)
		}
	}()

	log.Printf("starting server on %s (storage=%s)", cfg.Port, cfg.Storage)
	if err := app.Listen(cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// runSeed loads data/*.json and inserts into MySQL.
// Runs national wilayah → emergency-derived districts → types → coverage → emergencies.
func runSeed(
	eRepo *mysqlrepo.EmergencyRepo,
	typeRepo *mysqlrepo.EmergencyTypeRepo,
	regionRepo *mysqlrepo.RegionRepo,
) error {
	if err := seedNationalWilayah(eRepo); err != nil {
		return err
	}

	var emergencies []domain.Emergency
	if err := loadDataFile("data/emergencies.json", &emergencies); err != nil {
		return fmt.Errorf("emergencies.json: %w", err)
	}

	// Extract districts (and any missing region rows) from emergency records for FK safety.
	provincesMap := map[string]domain.Province{}
	regenciesMap := map[string]domain.Regency{}
	districtsMap := map[string]domain.District{}

	for _, e := range emergencies {
		a := e.Address
		if a.ProvinceID != "" {
			provincesMap[a.ProvinceID] = domain.Province{ID: a.ProvinceID, Name: a.Province}
		}
		if a.RegencyID != "" {
			regenciesMap[a.RegencyID] = domain.Regency{ID: a.RegencyID, ProvinceID: a.ProvinceID, Name: a.Regency}
		}
		if a.DistrictID != "" && a.RegencyID != "" {
			// Derive the correct regency from the district ID prefix (BPS hierarchy: first 4 chars).
			parentRegency := a.RegencyID
			if len(a.DistrictID) >= 4 {
				parentRegency = a.DistrictID[:4]
			}
			districtsMap[a.DistrictID] = domain.District{ID: a.DistrictID, RegencyID: parentRegency, Name: a.District}
		}
	}

	provinces := make([]domain.Province, 0, len(provincesMap))
	for _, p := range provincesMap {
		provinces = append(provinces, p)
	}
	regencies := make([]domain.Regency, 0, len(regenciesMap))
	for _, r := range regenciesMap {
		regencies = append(regencies, r)
	}
	districts := make([]domain.District, 0, len(districtsMap))
	for _, d := range districtsMap {
		districts = append(districts, d)
	}

	if err := eRepo.UpsertRegionData(provinces, regencies, districts); err != nil {
		return fmt.Errorf("region data from emergencies: %w", err)
	}
	log.Printf("emergency-derived regions upserted: %d provinces, %d regencies, %d districts",
		len(provinces), len(regencies), len(districts))

	// Emergency types
	var types []domain.EmergencyType
	if err := loadDataFile("data/emergency_types.json", &types); err != nil {
		return fmt.Errorf("emergency_types.json: %w", err)
	}
	for _, t := range types {
		if _, err := typeRepo.CreateType(t); err != nil {
			log.Printf("type %q already exists, skipping", t.Name)
		}
	}
	log.Printf("emergency types seeded: %d", len(types))

	// Resolve type IDs by name so seed JSON ids cannot point at the wrong row
	// when types were created earlier with different auto-increment order.
	liveTypes, err := typeRepo.FindAllTypes()
	if err != nil {
		return fmt.Errorf("list types: %w", err)
	}
	typeIDByName := map[string]uint{}
	for _, t := range liveTypes {
		typeIDByName[strings.ToLower(strings.TrimSpace(t.Name))] = t.ID
	}

	// Available regions = coverage allowlist (not the full national master).
	var regions []domain.AvailableRegion
	if err := loadDataFile("data/available_regions.json", &regions); err != nil {
		return fmt.Errorf("available_regions.json: %w", err)
	}
	for _, r := range regions {
		if _, err := regionRepo.CreateAvailableRegion(r); err != nil {
			log.Printf("region %q already exists, skipping", r.Name)
		}
	}
	log.Printf("available regions seeded: %d", len(regions))

	// Emergencies — Upsert so re-seeding doesn't create duplicates.
	ok, fail := 0, 0
	for _, e := range emergencies {
		if id, okName := typeIDByName[strings.ToLower(strings.TrimSpace(e.EmergencyType.Name))]; okName {
			e.EmergencyType.ID = id
		}
		if _, err := eRepo.Upsert(e); err != nil {
			log.Printf("emergency %q: %v", e.Name, err)
			fail++
		} else {
			ok++
		}
	}
	log.Printf("emergencies seeded: %d ok, %d failed", ok, fail)

	return nil
}

type wilayahRow struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	ProvinceID string `json:"province_id"`
}

func seedNationalWilayah(eRepo *mysqlrepo.EmergencyRepo) error {
	var provincesRaw []wilayahRow
	if err := loadDataFile("data/wilayah/provinces.json", &provincesRaw); err != nil {
		return fmt.Errorf("wilayah/provinces.json: %w", err)
	}
	var regenciesRaw []wilayahRow
	if err := loadDataFile("data/wilayah/regencies.json", &regenciesRaw); err != nil {
		return fmt.Errorf("wilayah/regencies.json: %w", err)
	}

	provinces := make([]domain.Province, 0, len(provincesRaw))
	for _, p := range provincesRaw {
		name := strings.TrimSpace(p.Name)
		if name == "" || p.ID == "" {
			continue
		}
		provinces = append(provinces, domain.Province{ID: p.ID, Name: titleWilayah(name)})
	}

	regencies := make([]domain.Regency, 0, len(regenciesRaw))
	for _, r := range regenciesRaw {
		if r.ID == "" || r.ProvinceID == "" {
			continue
		}
		regencies = append(regencies, domain.Regency{
			ID:         r.ID,
			ProvinceID: r.ProvinceID,
			Name:       titleWilayah(strings.TrimSpace(r.Name)),
		})
	}

	if err := eRepo.UpsertRegionData(provinces, regencies, nil); err != nil {
		return fmt.Errorf("national wilayah: %w", err)
	}
	log.Printf("national wilayah seeded: %d provinces, %d regencies", len(provinces), len(regencies))
	return nil
}

func titleWilayah(s string) string {
	parts := strings.Fields(strings.ToLower(s))
	for i, p := range parts {
		if p == "" {
			continue
		}
		// Keep common Indonesian particles lowercase after first word? Keep simple Title Case.
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	out := strings.Join(parts, " ")
	repl := []struct{ old, neu string }{
		{"Di Yogyakarta", "DI Yogyakarta"},
		{"Dki Jakarta", "DKI Jakarta"},
		{"Kabupaten ", "Kabupaten "},
		{"Kota ", "Kota "},
	}
	for _, r := range repl {
		out = strings.ReplaceAll(out, r.old, r.neu)
	}
	return out
}

func loadDataFile(path string, dest any) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewDecoder(f).Decode(dest)
}
