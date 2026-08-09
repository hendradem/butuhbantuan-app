package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/butuhbantuan/api/internal/domain"
	jsonrepo "github.com/butuhbantuan/api/internal/repository/json"
	mysqlrepo "github.com/butuhbantuan/api/internal/repository/mysql"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/router"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/config"
	"github.com/butuhbantuan/api/pkg/database"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	seed := flag.Bool("seed", false, "seed database from data/*.json (requires STORAGE=mysql)")
	flag.Parse()

	cfg := config.Load()

	var (
		emergencyRepo   repository.EmergencyRepository
		typeRepo        repository.EmergencyTypeRepository
		regionRepo      repository.RegionRepository
		feedbackRepo    repository.FeedbackRepository
		orderRepo       repository.OrderRepository
		unitCredRepo    repository.UnitCredentialRepository
	)

	switch cfg.Storage {
	case "mysql":
		db, err := database.Connect(cfg.DSN)
		if err != nil {
			log.Fatalf("failed to connect to mysql: %v", err)
		}

		mysqlEmergency := mysqlrepo.NewEmergencyRepo(db)
		mysqlType := mysqlrepo.NewEmergencyTypeRepo(db)
		mysqlRegion := mysqlrepo.NewRegionRepo(db)
		mysqlFeedback := mysqlrepo.NewFeedbackRepo(db)
		mysqlOrder := mysqlrepo.NewOrderRepo(db)
		mysqlUnitCred := mysqlrepo.NewUnitCredentialRepo(db)

		emergencyRepo = mysqlEmergency
		typeRepo = mysqlType
		regionRepo = mysqlRegion
		feedbackRepo = mysqlFeedback
		orderRepo = mysqlOrder
		unitCredRepo = mysqlUnitCred

		if *seed {
			if err := runSeed(mysqlEmergency, mysqlType, mysqlRegion); err != nil {
				log.Fatalf("seed failed: %v", err)
			}
			log.Println("seeding completed")
			return
		}

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

	emergencySvc := service.NewEmergencyService(emergencyRepo, typeRepo)
	regionSvc := service.NewRegionService(regionRepo)
	var feedbackSvc service.FeedbackUseCase
	if feedbackRepo != nil {
		feedbackSvc = service.NewFeedbackService(feedbackRepo)
	} else {
		feedbackSvc = service.NewNoopFeedbackService()
	}
	var orderSvc service.OrderUseCase
	var unitAuthSvc service.UnitAuthUseCase
	if orderRepo != nil {
		orderSvc = service.NewOrderService(orderRepo)
		unitAuthSvc = service.NewUnitAuthService(unitCredRepo)
	} else {
		orderSvc = service.NewNoopOrderService()
		unitAuthSvc = service.NewNoopUnitAuthService()
		unitCredRepo = &repository.NoopUnitCredentialRepository{}
	}

	app := fiber.New()
	app.Use(logger.New())
	app.Static("/uploads", "./uploads")
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Admin-Key, X-Unit-Token",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowCredentials: true,
	}))

	router.Register(app, emergencySvc, emergencySvc, regionSvc, feedbackSvc, orderSvc, unitAuthSvc, unitCredRepo, cfg)

	// Graceful shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("shutting down server...")
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
// Runs province → regency → district first to satisfy FK constraints.
func runSeed(
	eRepo *mysqlrepo.EmergencyRepo,
	typeRepo *mysqlrepo.EmergencyTypeRepo,
	regionRepo *mysqlrepo.RegionRepo,
) error {
	var emergencies []domain.Emergency
	if err := loadDataFile("data/emergencies.json", &emergencies); err != nil {
		return fmt.Errorf("emergencies.json: %w", err)
	}

	// Extract unique region data from emergency records to satisfy FK constraints.
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
		return fmt.Errorf("region data: %w", err)
	}
	log.Printf("region data seeded: %d provinces, %d regencies, %d districts",
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

	// Available regions
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

func loadDataFile(path string, dest any) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewDecoder(f).Decode(dest)
}
