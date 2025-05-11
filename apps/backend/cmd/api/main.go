package main

import (
	"butuhbantuan/internal/route"
	"butuhbantuan/pkg/database"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
	var PORT string = ":8080"
	app := fiber.New()
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowHeaders:     "Access-Control-Allow-Origin, Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowCredentials: true,
	}))
	database.InitDB()
	route.RegisterRoute(app)

	if err := app.Listen(PORT); err != nil {
		defer os.Exit(1)
		log.Fatal("failed to start server: %w", err)
	}

	fmt.Printf("server started on port %s", PORT)
}
