package envutil

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Load loads the appropriate .env file based on ENV variable
func Load() {
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	var file string
	switch env {
	case "production":
		file = ".env.production"
	default:
		file = ".env.dev"
	}

	err := godotenv.Load(file)
	if err != nil {
		log.Printf("No %s file found or failed to load: %v", file, err)
	} else {
		log.Printf("Loaded environment: %s", file)
	}
}

// Get returns an environment variable with optional fallback
func Get(key string, fallback string) string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	return val
}
