package main

import (
	"butuhbantuan/internal/route"
	"butuhbantuan/pkg/database"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
)

func main() {
	var PORT string = ":8080"
	app := fiber.New()
	database.InitDB()
	route.RegisterRoute(app)

	if err := app.Listen(PORT); err != nil {
		defer os.Exit(1)
		log.Fatal("failed to start server: %w", err)
	}

	fmt.Printf("server started on port %s", PORT)
}
