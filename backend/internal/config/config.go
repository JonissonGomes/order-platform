package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	DatabaseName      string
	JWTSecret         string
	AdminEmail        string
	AdminPassword     string // só bootstrap: cria admin se o e-mail ainda não existir
	AdminName         string
	SuperAdminEmail   string
	SuperAdminPassword string // só bootstrap: cria super admin se o e-mail ainda não existir
	SuperAdminName    string
	ForgeAPIURL       string
	ForgeAPIKey       string
	Environment       string
	CORSOrigins       []string
}

var cfg *Config

// Load loads configuration from environment variables (and optional local .env in development).
func Load() error {
	environment := getEnv("NODE_ENV", getEnv("GO_ENV", "development"))
	onRender := getEnv("RENDER", "") == "true"

	// Em produção / Render as variáveis vêm do painel — não exigir arquivo .env.
	if environment != "production" && !onRender {
		loadDotEnv()
	} else {
		log.Println("Using platform environment variables (no .env file expected).")
	}

	corsOriginsStr := getEnv("CORS_ORIGINS", "")
	var corsOrigins []string
	if corsOriginsStr != "" {
		for _, origin := range strings.Split(corsOriginsStr, ",") {
			trimmed := strings.TrimSpace(origin)
			if trimmed != "" {
				corsOrigins = append(corsOrigins, trimmed)
			}
		}
	}

	cfg = &Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		DatabaseName:       getEnv("DATABASE_NAME", "order_platform"),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		AdminEmail:         getEnv("ADMIN_EMAIL", ""),
		AdminPassword:      getEnv("ADMIN_PASSWORD", ""),
		AdminName:          getEnv("ADMIN_NAME", "Administrador"),
		SuperAdminEmail:    getEnv("SUPER_ADMIN_EMAIL", ""),
		SuperAdminPassword: getEnv("SUPER_ADMIN_PASSWORD", ""),
		SuperAdminName:     getEnv("SUPER_ADMIN_NAME", "Super Admin"),
		ForgeAPIURL:        getEnv("BUILT_IN_FORGE_API_URL", ""),
		ForgeAPIKey:        getEnv("BUILT_IN_FORGE_API_KEY", ""),
		Environment:        environment,
		CORSOrigins:        corsOrigins,
	}

	var missing []string
	if cfg.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if cfg.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}
	if len(missing) > 0 {
		return fmt.Errorf(
			"variáveis obrigatórias ausentes: %s — configure-as no painel Environment do Render (não use arquivo .env no deploy)",
			strings.Join(missing, ", "),
		)
	}

	return nil
}

func loadDotEnv() {
	wd, err := os.Getwd()
	if err != nil {
		wd = "."
	}

	envPaths := []string{
		".env",
		filepath.Join(wd, ".env"),
		filepath.Join(wd, "backend", ".env"),
		filepath.Join(wd, "..", ".env"),
		filepath.Join(wd, "..", "backend", ".env"),
		"backend/.env",
		"../.env",
		"./backend/.env",
	}

	for _, path := range envPaths {
		if _, err := os.Stat(path); err != nil {
			continue
		}
		if err := godotenv.Load(path); err != nil {
			log.Printf("Failed to load .env from %s: %v", path, err)
			continue
		}
		absPath, _ := filepath.Abs(path)
		log.Printf("Loaded .env file from: %s", absPath)
		return
	}

	log.Println("No local .env found; using process environment variables.")
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
