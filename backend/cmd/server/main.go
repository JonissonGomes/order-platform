package main

import (
	"context"
	"log"
	"os"

	"order-platform/backend/internal/config"
	"order-platform/backend/internal/database"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/router"
	"order-platform/backend/internal/server"
)

func main() {
	// Load environment variables
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	cfg := config.Get()

	// Initialize database
	db, err := database.NewMongoClient(cfg.DatabaseURL, cfg.DatabaseName)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Disconnect()

	// Garantir que todos os perfis padrão existam no banco (upsert por nome)
	// Seguro chamar sempre — não sobrescreve perfis já customizados
	profileRepo := repository.NewProfileRepository(db.Database)
	ctx := context.Background()
	if err := profileRepo.InitializeDefaultProfiles(ctx); err != nil {
		log.Fatalf("Falha ao inicializar perfis padrão: %v", err)
	}

	// Initialize router
	r := router.New(db)

	// Create and start server
	srv := server.New(r, cfg.Port)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := srv.Start(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
		os.Exit(1)
	}
}
