package main

import (
	"context"
	"log"
	"os"
	"time"

	"order-platform/backend/internal/config"
	"order-platform/backend/internal/database"
	"order-platform/backend/internal/jobs"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/router"
	"order-platform/backend/internal/server"
	"order-platform/backend/internal/services"
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

	ctx := context.Background()

	// Migrar usuários com role "super_admin" legado para "dono"
	// Seguro chamar sempre — só atualiza registros com valor antigo
	userRepo := repository.NewUserRepository(db.Database)
	migratedCount, err := userRepo.MigrateSuperAdminRole(ctx)
	if err != nil {
		log.Printf("⚠️  Aviso: falha na migração de roles: %v", err)
	} else if migratedCount > 0 {
		log.Printf("✅ Migração: %d usuário(s) atualizados de 'super_admin' → 'dono'", migratedCount)
	}

	// Garantir que todos os perfis padrão existam no banco (upsert por nome)
	// Seguro chamar sempre — não sobrescreve perfis já customizados
	profileRepo := repository.NewProfileRepository(db.Database)
	if err := profileRepo.InitializeDefaultProfiles(ctx); err != nil {
		log.Fatalf("Falha ao inicializar perfis padrão: %v", err)
	}

	// Initialize alert job (runs every hour)
	notificationRepo := repository.NewNotificationRepository(db.Database)
	serviceOrderRepo := repository.NewServiceOrderRepository(db.Database)
	customerRepo := repository.NewCustomerRepository(db.Database)
	stockRepo := repository.NewStockRepository(db.Database)
	employeeRepo := repository.NewEmployeeRepository(db.Database)

	// Initialize notification service (email and SMS services are optional)
	var emailService *services.EmailService
	var smsService *services.SMSService
	// TODO: Initialize email and SMS services from config if available

	notificationService := services.NewNotificationService(notificationRepo, emailService, smsService)
	alertService := services.NewAlertService(notificationService, serviceOrderRepo, customerRepo, stockRepo, employeeRepo)
	alertJob := jobs.NewAlertJob(alertService, 1*time.Hour)
	alertJob.Start(ctx)
	log.Println("Alert job started (runs every hour)")

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
