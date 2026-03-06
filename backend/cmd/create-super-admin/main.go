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
		log.Fatalf("Failed to count super admins: %v", err)
	}

	if superAdminCount >= 3 {
		fmt.Println("❌ Error: Maximum of 3 super admins allowed in the system")
		fmt.Printf("Current super admin count: %d\n", superAdminCount)
		os.Exit(1)
	}

	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("  Create Super Admin")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Printf("Current super admin count: %d/3\n\n", superAdminCount)

	// Get user input
	reader := bufio.NewReader(os.Stdin)

	// Name
	fmt.Print("Name: ")
	name, err := reader.ReadString('\n')
	if err != nil {
		log.Fatalf("Failed to read name: %v", err)
	}
	name = strings.TrimSpace(name)
	if name == "" {
		log.Fatal("Name is required")
	}

	// Email
	fmt.Print("Email: ")
	email, err := reader.ReadString('\n')
	if err != nil {
		log.Fatalf("Failed to read email: %v", err)
	}
	email = strings.TrimSpace(email)
	if email == "" {
		log.Fatal("Email is required")
	}

	// Validate email format (basic)
	if !strings.Contains(email, "@") {
		log.Fatal("Invalid email format")
	}

	// Check if user already exists
	existingUser, err := userRepo.GetUserByEmail(ctx, email)
	if err != nil {
		log.Fatalf("Failed to check user: %v", err)
	}
	if existingUser != nil {
		fmt.Printf("❌ Error: User with email %s already exists\n", email)
		if existingUser.Role == models.RoleSuperAdmin {
			fmt.Println("This user is already a super admin.")
		} else {
			fmt.Printf("Current role: %s\n", existingUser.Role)
			fmt.Println("Use the API endpoint to update the role instead.")
		}
		os.Exit(1)
	}

	// Password
	fmt.Print("Password: ")
	passwordBytes, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		log.Fatalf("Failed to read password: %v", err)
	}
	password := string(passwordBytes)
	fmt.Println() // New line after password input

	if len(password) < 6 {
		log.Fatal("Password must be at least 6 characters")
	}

	// Confirm password
	fmt.Print("Confirm Password: ")
	confirmPasswordBytes, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		log.Fatalf("Failed to read confirm password: %v", err)
	}
	confirmPassword := string(confirmPasswordBytes)
	fmt.Println() // New line after password input

	if password != confirmPassword {
		log.Fatal("Passwords do not match")
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Create user
	user := &models.User{
		Email:    email,
		Password: hashedPassword,
		Name:     name,
		Role:     models.RoleSuperAdmin,
	}

	if err := userRepo.CreateUser(ctx, user); err != nil {
		log.Fatalf("Failed to create super admin: %v", err)
	}

	fmt.Println()
	fmt.Println("✅ Super admin created successfully!")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Printf("Name:  %s\n", user.Name)
	fmt.Printf("Email: %s\n", user.Email)
	fmt.Printf("Role:  %s\n", user.Role)
	fmt.Println("═══════════════════════════════════════════════════════════")
}
