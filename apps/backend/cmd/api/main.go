package main

import (
	"butuhbantuan/internal/route"
	"butuhbantuan/internal/seeder"
	"butuhbantuan/pkg/config"
	"butuhbantuan/pkg/database"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {

	// Parse CLI flags
	seed := flag.Bool("seed", false, "Run database seeders")
	flag.Parse()

	// Run seeders if --seed is provided
	if *seed {
		log.Println("🔧 Running seeders...")
		if err := seeder.RunSeed(); err != nil {
			log.Fatalf("❌ Seeder failed: %v", err)
		}
		log.Println("✅ Seeding completed.")
		return
	}

	app := fiber.New()
	app.Use(cors.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowHeaders:     "Access-Control-Allow-Origin, Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowCredentials: true,
	}))

	config.LoadEnv()

	port := config.GetEnv("PORT", ":8080")
	database.InitDB()

	route.RegisterRoute(app)

	if err := app.Listen(port); err != nil {
		defer os.Exit(1)
		log.Fatal("failed to start server: %w", err)
	}

	fmt.Printf("server started on port %s", port)
}
