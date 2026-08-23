package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	AllowOrigins    string
	Storage         string // "json" or "mysql"
	DSN             string
	AdminAPIKey     string // X-Admin-Key header — required for write endpoints; empty = disabled
	MapboxURL       string
	MapboxAPIKey    string
	MapboxPublicKey string // pk.* token for client Static Tiles (optional; clients may use their own)
	GeoapifyURL     string
	GeoapifyKey     string
	NominatimURL    string
	VAPIDPublicKey  string
	VAPIDPrivateKey string
	VAPIDSubject    string
	DispatchSLASecs int
	// SATUSEHAT MSI (hospital master). Empty credentials → stub provider.
	SatuSehatBaseURL      string
	SatuSehatClientID     string
	SatuSehatClientSecret string
	SatuSehatForceStub    bool
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
		Port:            getEnv("PORT", ":8080"),
		AllowOrigins:    getEnv("ALLOW_ORIGINS", "http://localhost:3000,http://localhost:3001"),
		Storage:         storage,
		DSN:             getEnv("DB", ""),
		AdminAPIKey:     getEnv("ADMIN_API_KEY", ""),
		MapboxURL:       getEnv("MAPBOX_URL", "https://api.mapbox.com"),
		MapboxAPIKey:    getEnv("MAPBOX_API_KEY", ""),
		MapboxPublicKey: getEnv("MAPBOX_PUBLIC_KEY", getEnv("MAPBOX_API_KEY", "")),
		GeoapifyURL:     getEnv("GEOAPIFY_URL", "https://api.geoapify.com/v1/geocode"),
		GeoapifyKey:     getEnv("GEOAPIFY_API_KEY", ""),
		NominatimURL:    getEnv("NOMINATIM_URL", "https://nominatim.openstreetmap.org"),
		VAPIDPublicKey:  getEnv("VAPID_PUBLIC_KEY", ""),
		VAPIDPrivateKey: getEnv("VAPID_PRIVATE_KEY", ""),
		VAPIDSubject:    getEnv("VAPID_SUBJECT", "mailto:admin@butuhbantuan.id"),
		DispatchSLASecs: getEnvInt("DISPATCH_SLA_SECONDS", 90),
		SatuSehatBaseURL:      getEnv("SATUSEHAT_BASE_URL", "https://api-satusehat-stg.dto.kemkes.go.id"),
		SatuSehatClientID:     getEnv("SATUSEHAT_CLIENT_ID", ""),
		SatuSehatClientSecret: getEnv("SATUSEHAT_CLIENT_SECRET", ""),
		SatuSehatForceStub:    getEnv("SATUSEHAT_FORCE_STUB", "0") == "1" || getEnv("SATUSEHAT_FORCE_STUB", "") == "true",
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
