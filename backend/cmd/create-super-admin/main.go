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
	userRepo := repository.NewUserRepository(db.Database)

	// Check current super admin count
	superAdminCount, err := userRepo.CountSuperAdmins(ctx)
	if err != nil {
		log.Fatalf("Falha ao contar donos: %v", err)
	}

	if superAdminCount >= 3 {
		fmt.Println("❌ Erro: Máximo de 3 usuários com perfil Dono permitido no sistema")
		fmt.Printf("Total de Donos atual: %d\n", superAdminCount)
		os.Exit(1)
	}

	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("  Criar Dono do Sistema")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Printf("Donos cadastrados: %d/3\n\n", superAdminCount)

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

	// Verificar se usuário já existe
	existingUser, err := userRepo.GetUserByEmail(ctx, email)
	if err != nil {
		log.Fatalf("Falha ao verificar usuário: %v", err)
	}
	if existingUser != nil {
		fmt.Printf("❌ Erro: Já existe um usuário com o email %s\n", email)
		if existingUser.IsSuperAdmin() {
			fmt.Println("Este usuário já possui o perfil Dono.")
		} else {
			fmt.Printf("Perfil atual: %s\n", existingUser.Role)
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

	// Criar usuário com perfil Dono
	user := &models.User{
		Email:    email,
		Password: hashedPassword,
		Name:     name,
		Role:     models.RoleSuperAdmin, // "dono"
	}

	if err := userRepo.CreateUser(ctx, user); err != nil {
		log.Fatalf("Falha ao criar o Dono: %v", err)
	}

	fmt.Println()
	fmt.Println("✅ Dono criado com sucesso!")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Printf("Nome:   %s\n", user.Name)
	fmt.Printf("Email:  %s\n", user.Email)
	fmt.Printf("Perfil: Dono (role: %s)\n", user.Role)
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("⚠️  Guarde as credenciais em local seguro.")
}
