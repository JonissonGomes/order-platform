package router

import (
	"context"
	"log"

	"order-platform/backend/internal/config"
	"order-platform/backend/internal/database"
	"order-platform/backend/internal/handlers"
	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/services"

	"github.com/gin-gonic/gin"
)

func New(db *database.MongoDB) *gin.Engine {
	// Set Gin mode based on environment
	gin.SetMode(gin.ReleaseMode)

	r := gin.Default()

	// CORS middleware
	r.Use(corsMiddleware(config.Get().CORSOrigins))

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Database)
	employeeRepo := repository.NewEmployeeRepository(db.Database)
	profileRepo := repository.NewProfileRepository(db.Database)
	customerRepo := repository.NewCustomerRepository(db.Database)
	serviceOrderRepo := repository.NewServiceOrderRepository(db.Database)
	departmentRepo := repository.NewDepartmentRepository(db.Database)
	statusHistoryRepo := repository.NewStatusHistoryRepository(db.Database)
	auditLogRepo := repository.NewAuditLogRepository(db.Database)

	// Initialize default profiles (CCD-Connect pattern)
	// Verifica se a collection existe e cria perfis padrão se estiver vazia
	ctx := context.Background()
	if err := profileRepo.InitializeDefaultProfiles(ctx); err != nil {
		log.Printf("Warning: Failed to initialize default profiles: %v", err)
	} else {
		log.Println("Default profiles initialized/verified successfully")
	}

	// Initialize Cloudinary service (optional, won't fail if not configured)
	var uploadHandler *handlers.UploadHandler
	cfg := config.Get()
	if cfg.CloudinaryCloudName != "" && cfg.CloudinaryAPIKey != "" && cfg.CloudinaryAPISecret != "" {
		cloudinaryService, err := services.NewCloudinaryService()
		if err != nil {
			log.Printf("Warning: Failed to initialize Cloudinary: %v. Image upload will be disabled.", err)
		} else {
			uploadHandler = handlers.NewUploadHandler(cloudinaryService)
			log.Println("Cloudinary service initialized successfully")
		}
	} else {
		log.Println("Cloudinary not configured. Image upload will be disabled.")
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo)
	employeeHandler := handlers.NewEmployeeHandler(userRepo, employeeRepo, profileRepo)
	profileHandler := handlers.NewProfileHandler(profileRepo)
	customerHandler := handlers.NewCustomerHandler(customerRepo, serviceOrderRepo, employeeRepo)
	serviceOrderHandler := handlers.NewServiceOrderHandler(serviceOrderRepo, customerRepo, departmentRepo, employeeRepo, statusHistoryRepo)
	departmentHandler := handlers.NewDepartmentHandler(departmentRepo, employeeRepo, serviceOrderRepo)
	publicHandler := handlers.NewPublicHandler(customerRepo, serviceOrderRepo)

	// Auth middleware (optional authentication)
	authMiddleware := middleware.AuthMiddleware(userRepo)

	// Audit middleware
	auditMiddleware := middleware.AuditMiddleware(auditLogRepo, employeeRepo)

	// API routes
	api := r.Group("/api")
	{
		// Public auth routes
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)

		// Protected auth routes
		auth := api.Group("/auth")
		auth.Use(authMiddleware)
		{
			auth.GET("/me", authHandler.GetMe)
			auth.POST("/logout", authHandler.Logout)
		}

		// User management routes (Super Admin only)
		users := api.Group("/users")
		users.Use(authMiddleware, middleware.RequireSuperAdmin(), auditMiddleware)
		{
			users.PATCH("/:id/role", authHandler.UpdateUserRole)
		}

		// Protected routes example
		protected := api.Group("/protected")
		protected.Use(authMiddleware, middleware.RequireAuth())
		{
			// Add protected routes here
		}

		// Profile routes (public read, protected write)
		profiles := api.Group("/profiles")
		profiles.GET("", profileHandler.ListProfiles)
		profiles.GET("/:id", profileHandler.GetProfile)

		// Employee routes (requires auth)
		employees := api.Group("/employees")
		employees.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			employees.POST("", employeeHandler.CreateEmployee) // Admin only
			employees.GET("", employeeHandler.ListEmployees)
			employees.GET("/:id", employeeHandler.GetEmployee)
			employees.PUT("/:id", employeeHandler.UpdateEmployee)
		}

		// Customer routes (requires auth)
		customers := api.Group("/customers")
		customers.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			customers.POST("", customerHandler.CreateCustomer)
			customers.GET("", customerHandler.ListCustomers)
			customers.GET("/search/cpf", customerHandler.GetCustomerByCPF)
			customers.GET("/search/phone", customerHandler.GetCustomerByPhone)
			customers.GET("/:id", customerHandler.GetCustomer)
			customers.GET("/:id/orders", customerHandler.GetCustomerServiceOrders)
			customers.PUT("/:id", customerHandler.UpdateCustomer)
			customers.DELETE("/:id", customerHandler.DeleteCustomer)
		}

		// Service Order routes (requires auth)
		serviceOrders := api.Group("/service-orders")
		serviceOrders.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			serviceOrders.POST("", serviceOrderHandler.CreateServiceOrder)
			serviceOrders.GET("", serviceOrderHandler.ListServiceOrders)
			serviceOrders.GET("/:id", serviceOrderHandler.GetServiceOrder)
			serviceOrders.GET("/:id/history", serviceOrderHandler.GetServiceOrderHistory)
			serviceOrders.PUT("/:id", serviceOrderHandler.UpdateServiceOrder)
			serviceOrders.PATCH("/:id/status", serviceOrderHandler.UpdateServiceOrderStatus)
			serviceOrders.PATCH("/:id/assign", serviceOrderHandler.AssignServiceOrder)
			serviceOrders.POST("/:id/notes", serviceOrderHandler.AddNote)
			serviceOrders.DELETE("/:id", serviceOrderHandler.DeleteServiceOrder)
		}

		// Department routes (requires auth)
		departments := api.Group("/departments")
		departments.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			departments.POST("", departmentHandler.CreateDepartment)
			departments.GET("", departmentHandler.ListDepartments)
			departments.GET("/:id", departmentHandler.GetDepartment)
			departments.GET("/:id/employees", departmentHandler.GetDepartmentEmployees)
			departments.GET("/:id/orders", departmentHandler.GetDepartmentServiceOrders)
			departments.PUT("/:id", departmentHandler.UpdateDepartment)
			departments.DELETE("/:id", departmentHandler.DeleteDepartment)
		}

		// Upload routes (requires auth)
		if uploadHandler != nil {
			upload := api.Group("/upload")
			upload.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
			{
				upload.POST("/image", uploadHandler.UploadImage)
				upload.DELETE("/image/:id", uploadHandler.DeleteImage)
			}
		}

		// Public routes (no auth required)
		public := api.Group("/public")
		{
			public.GET("/service-orders/:orderNumber", serviceOrderHandler.GetServiceOrderByOrderNumber)
			public.POST("/service-orders/search", publicHandler.SearchServiceOrder)
		}

		// Admin routes
		admin := api.Group("/admin")
		admin.Use(authMiddleware, middleware.RequireAdminOrSuperAdmin(), auditMiddleware)
		{
			// Admin-only routes here
		}

		// Super Admin routes
		superAdmin := api.Group("/super-admin")
		superAdmin.Use(authMiddleware, middleware.RequireSuperAdmin(), auditMiddleware)
		{
			// Super admin-only routes here
		}
	}

	return r
}

func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Log for debugging in development
		if config.Get().Environment == "development" {
			log.Printf("CORS: Request from origin: '%s' (Method: %s, Path: %s)", origin, c.Request.Method, c.Request.URL.Path)
		}

		// If no origin header (same-origin request), allow it
		if origin == "" {
			// Same-origin request, allow it
			c.Next()
			return
		}

		// Check if origin is allowed
		allowOrigin := ""
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				allowOrigin = origin
				break
			}
		}

		// If no match found and we have allowed origins configured
		if allowOrigin == "" && len(allowedOrigins) > 0 {
			// Log the rejected origin for debugging (only in development)
			if config.Get().Environment == "development" {
				log.Printf("CORS: Origin '%s' not allowed. Allowed origins: %v", origin, allowedOrigins)
				log.Printf("CORS: Request details - Method: %s, Path: %s, Headers: %v", c.Request.Method, c.Request.URL.Path, c.Request.Header)
			}
			// For OPTIONS (preflight), we need to respond but without CORS headers
			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
			// Origin not allowed - reject the request for security
			c.JSON(403, gin.H{"error": "Origin not allowed"})
			c.Abort()
			return
		}

		// Set CORS headers only if origin is allowed
		if allowOrigin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		} else if len(allowedOrigins) == 0 {
			// If CORS_ORIGINS is not configured, allow all (for backward compatibility)
			// WARNING: This should be configured in production!
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
