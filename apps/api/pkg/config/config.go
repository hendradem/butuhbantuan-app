package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	AllowOrigins string
	Storage      string // "json" or "mysql"
	DSN          string
	AdminAPIKey  string // X-Admin-Key header — required for write endpoints; empty = disabled
	MapboxURL    string
	MapboxAPIKey string
	GeoapifyURL  string
	GeoapifyKey  string
	NominatimURL string
}

func Load() *Config {
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	file := ".env"
	if env == "production" {
		file = ".env.production"
	}

	if err := godotenv.Load(file); err != nil {
		log.Printf("no %s file found, using environment variables", file)
	}

	storage := getEnv("STORAGE", "json")
	if storage != "json" && storage != "mysql" {
		log.Printf("unknown STORAGE=%q, defaulting to json", storage)
		storage = "json"
	}

	return &Config{
		Port:         getEnv("PORT", ":8080"),
		AllowOrigins: getEnv("ALLOW_ORIGINS", "http://localhost:3000,http://localhost:3001"),
		Storage:      storage,
		DSN:          getEnv("DB", ""),
		AdminAPIKey:  getEnv("ADMIN_API_KEY", ""),
		MapboxURL:    getEnv("MAPBOX_URL", "https://api.mapbox.com"),
		MapboxAPIKey: getEnv("MAPBOX_API_KEY", ""),
		GeoapifyURL:  getEnv("GEOAPIFY_URL", "https://api.geoapify.com/v1/geocode"),
		GeoapifyKey:  getEnv("GEOAPIFY_API_KEY", ""),
		NominatimURL: getEnv("NOMINATIM_URL", "https://nominatim.openstreetmap.org"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
