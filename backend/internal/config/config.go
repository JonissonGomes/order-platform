package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DatabaseURL  string
	DatabaseName string
	JWTSecret    string
	AdminEmail   string
	ForgeAPIURL  string
	ForgeAPIKey  string
	Environment  string
	CORSOrigins  []string
}

var cfg *Config

// Load loads configuration from environment variables
func Load() error {
	// Try to load .env file (ignore error if it doesn't exist)
	_ = godotenv.Load()

	corsOriginsStr := getEnv("CORS_ORIGINS", "")
	var corsOrigins []string
	if corsOriginsStr != "" {
		// Split by comma and trim spaces
		origins := strings.Split(corsOriginsStr, ",")
		for _, origin := range origins {
			trimmed := strings.TrimSpace(origin)
			if trimmed != "" {
				corsOrigins = append(corsOrigins, trimmed)
			}
		}
	}
	// If CORS_ORIGINS is not set, corsOrigins will be empty
	// The CORS middleware will handle this appropriately

	cfg = &Config{
		Port:         getEnv("PORT", "8080"),
		DatabaseURL:  getEnv("DATABASE_URL", ""),
		DatabaseName: getEnv("DATABASE_NAME", "order_platform"),
		JWTSecret:    getEnv("JWT_SECRET", ""),
		AdminEmail:   getEnv("ADMIN_EMAIL", ""),
		ForgeAPIURL:  getEnv("BUILT_IN_FORGE_API_URL", ""),
		ForgeAPIKey:  getEnv("BUILT_IN_FORGE_API_KEY", ""),
		Environment:  getEnv("NODE_ENV", "development"),
		CORSOrigins:  corsOrigins,
	}

	// Validate required variables
	if cfg.DatabaseURL == "" {
		return ErrMissingDatabaseURL
	}
	if cfg.JWTSecret == "" {
		return ErrMissingJWTSecret
	}

	return nil
}

// Get returns the current configuration
func Get() *Config {
	if cfg == nil {
		panic("config not loaded, call Load() first")
	}
	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
