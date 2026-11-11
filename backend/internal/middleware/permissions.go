package middleware

import (
	"context"
	"net/http"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// RequireSuperAdmin ensures the user is a super admin
func RequireSuperAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get(UserContextKey)
		if !exists || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		u, ok := user.(*models.User)
		if !ok || !u.IsSuperAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"error": "Super admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAdminOrSuperAdmin ensures the user is admin or super admin
func RequireAdminOrSuperAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get(UserContextKey)
		if !exists || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		u, ok := user.(*models.User)
		if !ok || !u.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// Chaves de contexto preenchidas por LoadEmployeeContext
const (
	EmployeeContextKey    = "employee"
	PermissionsContextKey = "permissions"
)

// LoadEmployeeContext carrega, após a autenticação, o colaborador do usuário e as
// permissões do seu perfil no contexto. Super admins recebem ["*"].
// Deve ser registrado depois do AuthMiddleware.
func LoadEmployeeContext(employeeRepo *repository.EmployeeRepository, profileRepo *repository.ProfileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetUserFromContext(c)
		if user == nil {
			c.Next()
			return
		}

		employee, perms, err := ResolveAccess(c.Request.Context(), user, employeeRepo, profileRepo)
		if err != nil {
			utils.RespondWithInternalError(c)
			c.Abort()
			return
		}

		if employee != nil {
			c.Set(EmployeeContextKey, employee)
		}
		c.Set(PermissionsContextKey, perms)
		c.Next()
	}
}

// ResolveAccess carrega o colaborador do usuário (com Profile) e suas permissões efetivas.
// Super admins recebem ["*"]; colaboradores inativos ou sem perfil ativo ficam sem permissões.
// O colaborador retornado pode ser nil (usuário sem cadastro de colaborador).
func ResolveAccess(
	ctx context.Context,
	user *models.User,
	employeeRepo *repository.EmployeeRepository,
	profileRepo *repository.ProfileRepository,
) (*models.Employee, []string, error) {
	perms := []string{}

	employee, err := employeeRepo.GetEmployeeByUserID(ctx, user.ID)
	if err != nil {
		return nil, nil, err
	}

	if employee != nil && employee.IsActive && !employee.ProfileID.IsZero() {
		profile, err := profileRepo.GetProfileByID(ctx, employee.ProfileID)
		if err != nil {
			return nil, nil, err
		}
		if profile != nil && profile.IsActive {
			employee.Profile = profile
			perms = profile.Permissions
		}
	}

	// Usuário admin sem cadastro de colaborador (ex.: primeiro usuário) usa o perfil padrão "Admin"
	if employee == nil && user.Role == models.RoleAdmin {
		profile, err := profileRepo.GetProfileByName(ctx, "Admin")
		if err != nil {
			return nil, nil, err
		}
		if profile != nil && profile.IsActive {
			perms = profile.Permissions
		}
	}

	if user.IsSuperAdmin() {
		perms = []string{"*"}
	}
	return employee, perms, nil
}

// RequirePermission exige que o usuário possua a permissão informada
// (suporta "*" e curingas como "service_orders.*").
func RequirePermission(required string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetUserFromContext(c) == nil {
			utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
			c.Abort()
			return
		}

		if !models.HasPermission(GetPermissionsFromContext(c), required) {
			utils.RespondWithForbidden(c, "")
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAnyPermission exige que o usuário possua ao menos uma das permissões informadas
func RequireAnyPermission(required ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if GetUserFromContext(c) == nil {
			utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
			c.Abort()
			return
		}

		perms := GetPermissionsFromContext(c)
		for _, r := range required {
			if models.HasPermission(perms, r) {
				c.Next()
				return
			}
		}
		utils.RespondWithForbidden(c, "")
		c.Abort()
	}
}

// GetEmployeeFromContext retorna o colaborador carregado (nil se o usuário não tiver cadastro)
func GetEmployeeFromContext(c *gin.Context) *models.Employee {
	value, exists := c.Get(EmployeeContextKey)
	if !exists {
		return nil
	}
	employee, _ := value.(*models.Employee)
	return employee
}

// GetPermissionsFromContext retorna as permissões do usuário (slice vazio se não houver)
func GetPermissionsFromContext(c *gin.Context) []string {
	value, exists := c.Get(PermissionsContextKey)
	if !exists {
		return []string{}
	}
	perms, _ := value.([]string)
	return perms
}