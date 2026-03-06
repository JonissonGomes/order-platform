package config

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	DatabaseURL         string
	DatabaseName        string
	JWTSecret           string
	AdminEmail          string
	SuperAdminEmail     string
	ForgeAPIURL         string
	ForgeAPIKey         string
	Environment         string
	CORSOrigins         []string
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
}

var cfg *Config

// Load loads configuration from environment variables
func Load() error {
	// Get current working directory
	wd, err := os.Getwd()
	if err != nil {
		log.Printf("Warning: Could not get working directory: %v", err)
		wd = "."
	}

	// Try to load .env file from multiple possible locations
	// This handles different execution contexts (direct run, make, etc.)
	envPaths := []string{
		".env",                                     // Current working directory (most common when running from backend/)
		filepath.Join(wd, ".env"),                  // Absolute path from current dir
		filepath.Join(wd, "backend", ".env"),       // From project root
		filepath.Join(wd, "..", ".env"),            // One level up
		filepath.Join(wd, "..", "backend", ".env"), // From internal/config directory
		"backend/.env",                             // Relative from project root
		"../.env",                                  // Relative from internal/config
		"./backend/.env",                           // Alternative relative path
	}

	// Also try to find backend directory by looking for go.mod
	// This is more reliable when running from different directories
	if wd != "" {
		// Try to find backend directory by checking if we're in it or above it
		if _, err := os.Stat(filepath.Join(wd, "go.mod")); err == nil {
			// We're in the backend directory
			envPaths = append([]string{".env"}, envPaths...)
		} else if _, err := os.Stat(filepath.Join(wd, "backend", "go.mod")); err == nil {
			// We're in the project root
			envPaths = append([]string{filepath.Join("backend", ".env")}, envPaths...)
		}
	}

	// Try each path until one works
	var envLoaded bool
	for _, path := range envPaths {
		absPath, _ := filepath.Abs(path)
		// Check if file exists before trying to load
		if _, err := os.Stat(path); err == nil {
			if err := godotenv.Load(path); err == nil {
				envLoaded = true
				log.Printf("Loaded .env file from: %s", absPath)
				break
			} else {
				// Log the specific error for debugging
				log.Printf("Failed to load .env from %s: %v", absPath, err)
			}
		}
	}

	// If no .env file found, log a warning with debug info
	if !envLoaded {
		log.Printf("Warning: .env file not found. Current working directory: %s", wd)
		log.Println("Tried paths:")
		for _, path := range envPaths {
			absPath, _ := filepath.Abs(path)
			if _, err := os.Stat(path); err == nil {
				log.Printf("  - %s (exists but failed to load)", absPath)
			} else {
				log.Printf("  - %s (not found)", absPath)
			}
		}
		log.Println("Using environment variables directly.")
	}

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
		Port:                getEnv("PORT", "8080"),
		DatabaseURL:         getEnv("DATABASE_URL", ""),
		DatabaseName:        getEnv("DATABASE_NAME", "order_platform"),
		JWTSecret:           getEnv("JWT_SECRET", ""),
		AdminEmail:          getEnv("ADMIN_EMAIL", ""),
		SuperAdminEmail:     getEnv("SUPER_ADMIN_EMAIL", ""),
		ForgeAPIURL:         getEnv("BUILT_IN_FORGE_API_URL", ""),
		ForgeAPIKey:         getEnv("BUILT_IN_FORGE_API_KEY", ""),
		Environment:         getEnv("NODE_ENV", "development"),
		CORSOrigins:         corsOrigins,
		CloudinaryCloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryAPIKey:    getEnv("CLOUDINARY_API_KEY", ""),
		CloudinaryAPISecret: getEnv("CLOUDINARY_API_SECRET", ""),
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
