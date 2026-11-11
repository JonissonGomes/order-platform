package bootstrap

import (
	"context"
	"log"
	"strings"

	"order-platform/backend/internal/auth"
	"order-platform/backend/internal/config"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
)

// EnsureAdminsFromEnv cria admin/super-admin a partir do .env somente se o e-mail
// ainda não existir. A senha no env é só para o 1º bootstrap (ex.: Render);
// depois do login, troque a senha e remova *_PASSWORD das variáveis.
func EnsureAdminsFromEnv(
	ctx context.Context,
	userRepo *repository.UserRepository,
	employeeRepo *repository.EmployeeRepository,
	profileRepo *repository.ProfileRepository,
) {
	cfg := config.Get()

	if cfg.SuperAdminEmail != "" && cfg.SuperAdminPassword != "" {
		if err := ensureUser(ctx, userRepo, employeeRepo, profileRepo, seedUser{
			email:    cfg.SuperAdminEmail,
			password: cfg.SuperAdminPassword,
			name:     cfg.SuperAdminName,
			role:     models.RoleSuperAdmin,
			profile:  "", // permissões via user.IsSuperAdmin() → ["*"]; sem perfil atribuível
			empRole:  models.EmployeeRoleAdmin,
		}); err != nil {
			log.Printf("Warning: bootstrap SUPER_ADMIN: %v", err)
		}
	}

	if cfg.AdminEmail != "" && cfg.AdminPassword != "" {
		if err := ensureUser(ctx, userRepo, employeeRepo, profileRepo, seedUser{
			email:    cfg.AdminEmail,
			password: cfg.AdminPassword,
			name:     cfg.AdminName,
			role:     models.RoleAdmin,
			profile:  "Admin",
			empRole:  models.EmployeeRoleAdmin,
		}); err != nil {
			log.Printf("Warning: bootstrap ADMIN: %v", err)
		}
	}
}

type seedUser struct {
	email    string
	password string
	name     string
	role     models.UserRole
	profile  string
	empRole  models.EmployeeRole
}

func ensureUser(
	ctx context.Context,
	userRepo *repository.UserRepository,
	employeeRepo *repository.EmployeeRepository,
	profileRepo *repository.ProfileRepository,
	s seedUser,
) error {
	email := strings.TrimSpace(strings.ToLower(s.email))
	if email == "" || len(s.password) < 6 {
		log.Printf("bootstrap: e-mail/senha inválidos para %s (senha mín. 6)", s.role)
		return nil
	}

	existing, err := userRepo.GetUserByEmail(ctx, email)
	if err != nil {
		return err
	}
	if existing != nil {
		log.Printf("bootstrap: usuário %s já existe — senha do env ignorada", email)
		// Garante Employee se o user existe sem colaborador
		return ensureEmployee(ctx, employeeRepo, profileRepo, existing, s)
	}

	if s.role == models.RoleSuperAdmin {
		n, err := userRepo.CountSuperAdmins(ctx)
		if err != nil {
			return err
		}
		if n >= 3 {
			log.Printf("bootstrap: limite de 3 super admins atingido — pulando %s", email)
			return nil
		}
	}

	hash, err := auth.HashPassword(s.password)
	if err != nil {
		return err
	}

	user := &models.User{
		Email:    email,
		Password: hash,
		Name:     strings.TrimSpace(s.name),
		Role:     s.role,
	}
	if user.Name == "" {
		user.Name = string(s.role)
	}
	if err := userRepo.CreateUser(ctx, user); err != nil {
		return err
	}
	log.Printf("bootstrap: criado %s (%s)", s.role, email)

	return ensureEmployee(ctx, employeeRepo, profileRepo, user, s)
}

func ensureEmployee(
	ctx context.Context,
	employeeRepo *repository.EmployeeRepository,
	profileRepo *repository.ProfileRepository,
	user *models.User,
	s seedUser,
) error {
	emp, err := employeeRepo.GetEmployeeByUserID(ctx, user.ID)
	if err != nil {
		return err
	}
	if emp != nil {
		return nil
	}

	employee := &models.Employee{
		UserID:   user.ID,
		Name:     user.Name,
		Email:    user.Email,
		Role:     s.empRole,
		IsActive: true,
	}
	profileLabel := "(nenhum)"
	if s.profile != "" {
		profile, err := profileRepo.GetProfileByName(ctx, s.profile)
		if err != nil {
			return err
		}
		if profile != nil && profile.IsActive && !models.IsSuperAdminProfile(profile) {
			employee.ProfileID = profile.ID
			profileLabel = s.profile
		}
	}
	if err := employeeRepo.CreateEmployee(ctx, employee); err != nil {
		return err
	}
	log.Printf("bootstrap: colaborador criado para %s (perfil %s)", user.Email, profileLabel)
	return nil
}
