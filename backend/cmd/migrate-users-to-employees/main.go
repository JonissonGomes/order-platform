package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"order-platform/backend/internal/config"
	"order-platform/backend/internal/database"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func main() {
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("  Migração: Users → Employees/Customers")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println()

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

	// Get collections
	usersCollection := db.Database.Collection("users")
	employeesCollection := db.Database.Collection("employees")
	customersCollection := db.Database.Collection("customers")

	// Count existing users
	userCount, err := usersCollection.CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Failed to count users: %v", err)
	}

	if userCount == 0 {
		fmt.Println("✅ Nenhum usuário encontrado para migrar.")
		return
	}

	fmt.Printf("📊 Total de usuários encontrados: %d\n\n", userCount)

	// Get all users
	cursor, err := usersCollection.Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Failed to find users: %v", err)
	}
	defer cursor.Close(ctx)

	var migratedEmployees int
	var migratedCustomers int
	var skipped int

	employeeRepo := repository.NewEmployeeRepository(db.Database)
	profileRepo := repository.NewProfileRepository(db.Database)
	customerRepo := repository.NewCustomerRepository(db.Database)

	for cursor.Next(ctx) {
		var user bson.M
		if err := cursor.Decode(&user); err != nil {
			log.Printf("⚠️  Failed to decode user: %v", err)
			skipped++
			continue
		}

		userID, ok := user["_id"].(primitive.ObjectID)
		if !ok {
			log.Printf("⚠️  Invalid user ID: %v", user["_id"])
			skipped++
			continue
		}

		email, _ := user["email"].(string)
		name, _ := user["name"].(string)
		password, _ := user["password"].(string)
		role, _ := user["role"].(string)
		isSuspended, _ := user["isSuspended"].(bool)
		createdAt, _ := user["createdAt"].(time.Time)
		updatedAt, _ := user["updatedAt"].(time.Time)
		lastSignedIn, _ := user["lastSignedIn"].(time.Time)

		// Check if employee with this email already exists
		existingEmployee, err := employeeRepo.GetEmployeeByEmail(ctx, email)
		if err == nil && existingEmployee != nil {
			fmt.Printf("⏭️  Employee já existe para %s, pulando...\n", email)
			skipped++
			continue
		}

		// Check if customer with this email already exists
		existingCustomer, err := customerRepo.GetCustomerByEmail(ctx, email)
		if err == nil && existingCustomer != nil {
			fmt.Printf("⏭️  Customer já existe para %s, pulando...\n", email)
			skipped++
			continue
		}

		// Determine if user should become employee or customer
		// Admin, super_admin, department_manager, attendant, technician → Employee
		// user → Customer (if has password, otherwise skip)
		if role == "user" || role == "" {
			// Create as customer only if has password
			if password != "" {
				customer := &models.Customer{
					Name:        name,
					Email:       email,
					Password:    password,
					Phone:       "", // Will need to be filled manually
					CPF:         "", // Will need to be filled manually
					IsTemporary: false,
					CreatedAt:   createdAt,
					UpdatedAt:   updatedAt,
					LastSignedIn: lastSignedIn,
					CreatedBy:   primitive.NilObjectID,
					UpdatedBy:   primitive.NilObjectID,
				}

				if err := customerRepo.CreateCustomer(ctx, customer); err != nil {
					log.Printf("❌ Failed to create customer for %s: %v", email, err)
					skipped++
					continue
				}

				fmt.Printf("✅ Customer criado: %s (%s)\n", name, email)
				migratedCustomers++
			} else {
				fmt.Printf("⏭️  User %s sem senha, pulando...\n", email)
				skipped++
			}
		} else {
			// Create as employee
			// Map role to EmployeeRole
			var employeeRole models.EmployeeRole
			switch role {
			case "dono", "super_admin":
				employeeRole = models.EmployeeRoleAdmin
			case "admin":
				employeeRole = models.EmployeeRoleAdmin
			case "department_manager":
				employeeRole = models.EmployeeRoleDepartmentManager
			case "attendant":
				employeeRole = models.EmployeeRoleAttendant
			case "technician":
				employeeRole = models.EmployeeRoleTechnician
			default:
				employeeRole = models.EmployeeRoleAttendant // Default
			}

			// Get profile based on role
			profileName := "Atendente" // Default
			switch employeeRole {
			case models.EmployeeRoleAdmin:
				profileName = "Dono"
			case models.EmployeeRoleDepartmentManager:
				profileName = "Gerente"
			case models.EmployeeRoleAttendant:
				profileName = "Atendente"
			case models.EmployeeRoleTechnician:
				profileName = "Técnico"
			}

			profile, err := profileRepo.GetProfileByName(ctx, profileName)
			if err != nil || profile == nil {
				// Try "Administrador" as fallback
				profile, err = profileRepo.GetProfileByName(ctx, "Administrador")
				if err != nil || profile == nil {
					log.Printf("⚠️  Profile '%s' não encontrado para %s, usando perfil padrão", profileName, email)
					// Continue without profile, will need manual assignment
				}
			}

			employee := &models.Employee{
				Email:        email,
				Password:     password,
				Name:         name,
				Role:         employeeRole,
				IsActive:     !isSuspended,
				IsSuspended:  isSuspended,
				LastSignedIn: lastSignedIn,
				CreatedAt:    createdAt,
				UpdatedAt:    updatedAt,
				CreatedBy:    primitive.NilObjectID,
				UpdatedBy:    primitive.NilObjectID,
			}

			if profile != nil {
				employee.ProfileID = profile.ID
			}

			if err := employeeRepo.CreateEmployee(ctx, employee); err != nil {
				log.Printf("❌ Failed to create employee for %s: %v", email, err)
				skipped++
				continue
			}

			fmt.Printf("✅ Employee criado: %s (%s) - Role: %s\n", name, email, employeeRole)
			migratedEmployees++
		}
	}

	if err := cursor.Err(); err != nil {
		log.Fatalf("Cursor error: %v", err)
	}

	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("  Migração Concluída")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Printf("✅ Employees criados: %d\n", migratedEmployees)
	fmt.Printf("✅ Customers criados: %d\n", migratedCustomers)
	fmt.Printf("⏭️  Pulos: %d\n", skipped)
	fmt.Println()
	fmt.Println("⚠️  IMPORTANTE:")
	fmt.Println("   1. Verifique os dados migrados antes de remover a collection 'users'")
	fmt.Println("   2. Preencha dados faltantes (telefone, CPF, departamento) manualmente")
	fmt.Println("   3. Teste o login com as credenciais migradas")
	fmt.Println("   4. Após confirmar que tudo funciona, você pode remover a collection 'users'")
	fmt.Println("═══════════════════════════════════════════════════════════")
}
