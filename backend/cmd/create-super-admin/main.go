package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"syscall"

	"order-platform/backend/internal/auth"
	"order-platform/backend/internal/config"
	"order-platform/backend/internal/database"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/term"
)

func main() {
	// Load configuration
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
	employeeRepo := repository.NewEmployeeRepository(db.Database)
	profileRepo := repository.NewProfileRepository(db.Database)

	// Check current admin count
	adminCount, err := employeeRepo.CountAdmins(ctx)
	if err != nil {
		log.Fatalf("Falha ao contar administradores: %v", err)
	}

	if adminCount >= 3 {
		fmt.Println("❌ Erro: Máximo de 3 administradores permitido no sistema")
		fmt.Printf("Total de Administradores atual: %d\n", adminCount)
		os.Exit(1)
	}

	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("  Criar Dono do Sistema")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Printf("Donos cadastrados: %d/3\n\n", adminCount)

	// Get user input
	reader := bufio.NewReader(os.Stdin)

	// Nome
	fmt.Print("Nome: ")
	name, err := reader.ReadString('\n')
	if err != nil {
		log.Fatalf("Falha ao ler o nome: %v", err)
	}
	name = strings.TrimSpace(name)
	if name == "" {
		log.Fatal("Nome é obrigatório")
	}

	// Email
	fmt.Print("Email: ")
	email, err := reader.ReadString('\n')
	if err != nil {
		log.Fatalf("Falha ao ler o email: %v", err)
	}
	email = strings.TrimSpace(email)
	if email == "" {
		log.Fatal("Email é obrigatório")
	}

	if !strings.Contains(email, "@") {
		log.Fatal("Formato de email inválido")
	}

	// Verificar se employee já existe
	existingEmployee, err := employeeRepo.GetEmployeeByEmail(ctx, email)
	if err != nil {
		log.Fatalf("Falha ao verificar colaborador: %v", err)
	}
	if existingEmployee != nil {
		fmt.Printf("❌ Erro: Já existe um colaborador com o email %s\n", email)
		if existingEmployee.Role == models.EmployeeRoleAdmin {
			fmt.Println("Este colaborador já possui o perfil Administrador.")
		} else {
			fmt.Printf("Perfil atual: %s\n", existingEmployee.Role)
			fmt.Println("Use o endpoint da API para alterar o perfil.")
		}
		os.Exit(1)
	}

	// Senha
	fmt.Print("Senha: ")
	passwordBytes, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		log.Fatalf("Falha ao ler a senha: %v", err)
	}
	password := string(passwordBytes)
	fmt.Println()

	if len(password) < 6 {
		log.Fatal("A senha deve ter no mínimo 6 caracteres")
	}

	// Confirmar senha
	fmt.Print("Confirmar Senha: ")
	confirmPasswordBytes, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		log.Fatalf("Falha ao ler a confirmação de senha: %v", err)
	}
	confirmPassword := string(confirmPasswordBytes)
	fmt.Println()

	if password != confirmPassword {
		log.Fatal("As senhas não coincidem")
	}

	// Hash da senha
	hashedPassword, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("Falha ao gerar hash da senha: %v", err)
	}

	// Buscar perfil "Dono" ou "Administrador"
	profile, err := profileRepo.GetProfileByName(ctx, "Dono")
	if err != nil {
		log.Fatalf("Falha ao buscar perfil: %v", err)
	}
	if profile == nil {
		// Tentar "Administrador" como fallback
		profile, err = profileRepo.GetProfileByName(ctx, "Administrador")
		if err != nil {
			log.Fatalf("Falha ao buscar perfil: %v", err)
		}
		if profile == nil {
			log.Fatal("Perfil 'Dono' ou 'Administrador' não encontrado. Execute a sincronização de perfis padrão primeiro.")
		}
	}

	// Determinar role baseado no perfil encontrado
	employeeRole := models.EmployeeRoleAdmin
	if profile.Name == "Dono" {
		employeeRole = models.EmployeeRoleDono
	}

	// Criar employee com perfil Dono
	employee := &models.Employee{
		Email:       email,
		Password:    hashedPassword,
		Name:        name,
		Role:        employeeRole,
		ProfileID:   profile.ID,
		IsActive:    true,
		IsSuspended: false,
		CreatedBy:   primitive.NilObjectID, // Primeiro admin, sem criador
		UpdatedBy:   primitive.NilObjectID,
	}

	if err := employeeRepo.CreateEmployee(ctx, employee); err != nil {
		log.Fatalf("Falha ao criar o Dono: %v", err)
	}

	fmt.Println()
	fmt.Println("✅ Dono criado com sucesso!")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Printf("Nome:   %s\n", employee.Name)
	fmt.Printf("Email:  %s\n", employee.Email)
	fmt.Printf("Role:   %s\n", employee.Role)
	fmt.Printf("Perfil: %s\n", profile.Name)
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("⚠️  Guarde as credenciais em local seguro.")
}
