package config

import (
	"log"
	"os"
	"fmt"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	env := os.Getenv("ENV")
	fmt.Println(env)
	if env == "" {
		env = "development"
	}


	var file string
	switch env {
	case "production":
		file = ".env.production"
	default:
		file = ".env"
	}

	err := godotenv.Load(file)
	if err != nil {
		log.Printf("No %s file found or failed to load: %v", file, err)
	} else {
		log.Printf("Loaded environment: %s", file)
	}
}

// Get returns an environment variable with optional fallback
func GetEnv(key string, fallback string) string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	return val
}