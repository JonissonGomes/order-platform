package router

import (
	"order-platform/backend/internal/handlers"
	"order-platform/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// registerAuthRoutes registra autenticação, gestão de usuários e grupos administrativos
func registerAuthRoutes(api *gin.RouterGroup, d *deps, authHandler *handlers.AuthHandler) {
	// Public auth routes
	api.POST("/auth/register", authHandler.Register)
	api.POST("/auth/login", authHandler.Login)

	// Protected auth routes (GetMe devolve user, employee e permissions)
	auth := api.Group("/auth")
	auth.Use(d.auth, d.context)
	{
		auth.GET("/me", authHandler.GetMe)
		auth.POST("/logout", authHandler.Logout)
	}

	// User management routes (Super Admin only)
	users := api.Group("/users")
	users.Use(d.auth, middleware.RequireSuperAdmin(), d.audit)
	{
		users.PATCH("/:id/role", authHandler.UpdateUserRole)
	}

	// Protected routes example
	protected := api.Group("/protected")
	protected.Use(d.auth, middleware.RequireAuth())
	{
		// Add protected routes here
	}

	// Admin routes
	admin := api.Group("/admin")
	admin.Use(d.auth, middleware.RequireAdminOrSuperAdmin(), d.audit)
	{
		// Admin-only routes here
	}

	// Super Admin routes
	superAdmin := api.Group("/super-admin")
	superAdmin.Use(d.auth, middleware.RequireSuperAdmin(), d.audit)
	{
		// Super admin-only routes here
	}
}

// registerOrganizationRoutes registra perfis, colaboradores, filiais e departamentos
func registerOrganizationRoutes(api *gin.RouterGroup, d *deps) {
	// Profile routes (public read, protected write)
	profiles := api.Group("/profiles")
	profiles.GET("", d.profile.ListProfiles)
	profiles.GET("/:id", d.profile.GetProfile)
	profilesWrite := profiles.Group("")
	profilesWrite.Use(d.auth, middleware.RequireAuth(), middleware.RequireAdminOrSuperAdmin(), d.context, d.audit)
	{
		profilesWrite.POST("", d.profile.CreateProfile)
		profilesWrite.PUT("/:id", d.profile.UpdateProfile)
	}

	// Employee routes
	employees := api.Group("/employees")
	employees.Use(d.auth, middleware.RequireAuth(), d.context, d.audit)
	{
		employees.POST("", middleware.RequirePermission("employees.create"), d.employee.CreateEmployee)
		employees.GET("", d.employee.ListEmployees)
		employees.GET("/:id", d.employee.GetEmployee)
		employees.PUT("/:id", middleware.RequirePermission("employees.update"), d.employee.UpdateEmployee)
	}

	// Branch routes (leitura para qualquer autenticado; escrita exige branches.*)
	branches := api.Group("/branches")
	branches.Use(d.auth, middleware.RequireAuth(), d.context, d.audit)
	{
		branches.GET("", d.branch.ListBranches)
		branches.GET("/:id", d.branch.GetBranch)
		branches.POST("", middleware.RequirePermission("branches.create"), d.branch.CreateBranch)
		branches.PUT("/:id", middleware.RequirePermission("branches.update"), d.branch.UpdateBranch)
	}

	// Department routes (leitura para qualquer autenticado; escrita exige departments.*)
	departments := api.Group("/departments")
	departments.Use(d.auth, middleware.RequireAuth(), d.context, d.audit)
	{
		departments.GET("", d.department.ListDepartments)
		departments.GET("/:id", d.department.GetDepartment)
		departments.POST("", middleware.RequirePermission("departments.create"), d.department.CreateDepartment)
		departments.PUT("/:id", middleware.RequirePermission("departments.update"), d.department.UpdateDepartment)
	}
}
