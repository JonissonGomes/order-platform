package router

import (
	"log"
	"net/http"

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
	cfg := config.Get()
	if cfg.Environment == "development" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS middleware
	r.Use(corsMiddleware(cfg.CORSOrigins))

	// Initialize repositories
	employeeRepo := repository.NewEmployeeRepository(db.Database)
	profileRepo := repository.NewProfileRepository(db.Database)
	customerRepo := repository.NewCustomerRepository(db.Database)
	serviceOrderRepo := repository.NewServiceOrderRepository(db.Database)
	departmentRepo := repository.NewDepartmentRepository(db.Database)
	statusHistoryRepo := repository.NewStatusHistoryRepository(db.Database)
	auditLogRepo := repository.NewAuditLogRepository(db.Database)
	stockRepo := repository.NewStockRepository(db.Database)
	financialRepo := repository.NewFinancialRepository(db.Database)
	settingsRepo := repository.NewSettingsRepository(db.Database)

	// Initialize Cloudinary service (optional, won't fail if not configured)
	var uploadHandler *handlers.UploadHandler
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

	// Initialize WhatsApp service (optional, won't fail if not configured)
	var whatsappHandler *handlers.WhatsAppHandler
	if cfg.WhatsAppAPIURL != "" && cfg.WhatsAppAPIToken != "" && cfg.WhatsAppPhoneID != "" {
		whatsappService := services.NewWhatsAppService(cfg.WhatsAppAPIURL, cfg.WhatsAppAPIToken, cfg.WhatsAppPhoneID)
		whatsappHandler = handlers.NewWhatsAppHandler(whatsappService)
		log.Println("WhatsApp service initialized successfully")
	} else {
		log.Println("WhatsApp not configured. WhatsApp notifications will be disabled.")
	}

	// Initialize Payment service (optional, won't fail if not configured)
	var paymentHandler *handlers.PaymentHandler
	if cfg.PaymentProvider != "" && cfg.PaymentAPIKey != "" && cfg.PaymentAPIURL != "" {
		paymentService := services.NewPaymentService(cfg.PaymentProvider, cfg.PaymentAPIKey, cfg.PaymentAPIURL)
		paymentHandler = handlers.NewPaymentHandler(paymentService, serviceOrderRepo)
		log.Println("Payment service initialized successfully")
	} else {
		log.Println("Payment gateway not configured. Payment processing will be disabled.")
	}

	// Initialize NFE service (optional, won't fail if not configured)
	var nfeHandler *handlers.NFEHandler
	if cfg.NFEAPIURL != "" && cfg.NFEAPIToken != "" && cfg.NFEAPIKey != "" {
		nfeService := services.NewNFEService(cfg.NFEAPIURL, cfg.NFEAPIToken, cfg.NFEAPIKey)
		nfeHandler = handlers.NewNFEHandler(nfeService)
		log.Println("NF-e service initialized successfully")
	} else {
		log.Println("NF-e service not configured. NF-e emission will be disabled.")
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(employeeRepo, customerRepo)
	employeeHandler := handlers.NewEmployeeHandler(employeeRepo, profileRepo, departmentRepo)
	profileHandler := handlers.NewProfileHandler(profileRepo)
	customerHandler := handlers.NewCustomerHandler(customerRepo, serviceOrderRepo, employeeRepo)
	serviceOrderHandler := handlers.NewServiceOrderHandler(serviceOrderRepo, customerRepo, departmentRepo, employeeRepo, statusHistoryRepo)
	departmentHandler := handlers.NewDepartmentHandler(departmentRepo, employeeRepo, serviceOrderRepo)
	publicHandler := handlers.NewPublicHandler(customerRepo, serviceOrderRepo, employeeRepo)
	stockHandler := handlers.NewStockHandler(stockRepo, employeeRepo)
	financialHandler := handlers.NewFinancialHandler(financialRepo, employeeRepo)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo, employeeRepo)

	quotationRepo := repository.NewQuotationRepository(db.Database)
	supplierRepo := repository.NewSupplierRepository(db.Database)
	notificationRepo := repository.NewNotificationRepository(db.Database)
	quotationHandler := handlers.NewQuotationHandler(quotationRepo, customerRepo, departmentRepo, serviceOrderRepo, employeeRepo)
	supplierHandler := handlers.NewSupplierHandler(supplierRepo, employeeRepo, stockRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationRepo)

	preOrderRepo := repository.NewPreOrderRepository(db.Database)
	preOrderHandler := handlers.NewPreOrderHandler(preOrderRepo, customerRepo, departmentRepo, serviceOrderRepo)

	// Initialize report service and handler
	reportService := services.NewReportService(
		serviceOrderRepo,
		customerRepo,
		stockRepo,
		financialRepo,
		departmentRepo,
		employeeRepo,
	)
	reportHandler := handlers.NewReportHandler(reportService)

	// Auth middleware (optional authentication)
	authMiddleware := middleware.AuthMiddleware(employeeRepo, customerRepo)

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

		// Employee role management routes (Admin only)
		employeeRoleRoutes := api.Group("/employees")
		employeeRoleRoutes.Use(authMiddleware, middleware.RequireAdmin(), auditMiddleware)
		{
			employeeRoleRoutes.PATCH("/:id/role", authHandler.UpdateEmployeeRole)
		}

		// Protected routes example
		protected := api.Group("/protected")
		protected.Use(authMiddleware, middleware.RequireAuth())
		{
			// Add protected routes here
		}

		// Profile routes (public read, protected write)
		// IMPORTANT: static routes and more specific routes must be registered BEFORE dynamic routes to avoid conflicts
		profiles := api.Group("/profiles")
		profiles.GET("", profileHandler.ListProfiles)
		profiles.GET("/name/:name", profileHandler.GetProfileByName)
		profiles.GET("/modules/available", profileHandler.GetAvailableModules)
		profiles.POST("/sync-defaults", authMiddleware, middleware.RequireAuth(), middleware.RequireSuperAdmin(), profileHandler.SyncDefaultProfiles)
		// Rotas com mais segmentos devem vir ANTES de rotas com menos segmentos
		profiles.PUT("/:name/permissions", authMiddleware, middleware.RequireAuth(), auditMiddleware, middleware.RequireAdminOrSuperAdmin(), profileHandler.UpdateProfilePermissions)
		// Rota genérica por ID deve vir por último
		profiles.GET("/:id", profileHandler.GetProfile)

		// Employee routes (requires auth)
		employees := api.Group("/employees")
		employees.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			employees.POST("", middleware.RequireAdminOrSuperAdmin(), employeeHandler.CreateEmployee) // Admin or Super Admin only
			employees.GET("", employeeHandler.ListEmployees)
			// Specific routes before generic /:id
			employees.POST("/:id/suspend", middleware.RequireAdminOrSuperAdmin(), employeeHandler.SuspendEmployee)
			employees.POST("/:id/unsuspend", middleware.RequireAdminOrSuperAdmin(), employeeHandler.UnsuspendEmployee)
			// Generic routes
			employees.GET("/:id", employeeHandler.GetEmployee)
			employees.PUT("/:id", middleware.RequireAdminOrSuperAdmin(), employeeHandler.UpdateEmployee)
		}

		// Customer routes (requires auth)
		// IMPORTANT: Rotas mais específicas (com mais segmentos) devem vir ANTES de rotas genéricas
		customers := api.Group("/customers")
		customers.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			customers.POST("", customerHandler.CreateCustomer)
			customers.GET("", customerHandler.ListCustomers)
			customers.GET("/search/cpf", customerHandler.GetCustomerByCPF)
			customers.GET("/search/phone", customerHandler.GetCustomerByPhone)
			// Rotas específicas primeiro
			customers.GET("/:id/orders", customerHandler.GetCustomerServiceOrders)
			// Rotas genéricas depois
			customers.GET("/:id", customerHandler.GetCustomer)
			customers.PUT("/:id", customerHandler.UpdateCustomer)
			customers.DELETE("/:id", customerHandler.DeleteCustomer)
		}

		// Service Order routes (requires auth)
		// IMPORTANT: Rotas mais específicas (com mais segmentos) devem vir ANTES de rotas genéricas
		serviceOrders := api.Group("/service-orders")
		serviceOrders.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			serviceOrders.POST("", serviceOrderHandler.CreateServiceOrder)
			serviceOrders.GET("", serviceOrderHandler.ListServiceOrders)
			// Rotas específicas primeiro (com mais segmentos)
			serviceOrders.GET("/:id/history", serviceOrderHandler.GetServiceOrderHistory)
			serviceOrders.PATCH("/:id/status", serviceOrderHandler.UpdateServiceOrderStatus)
			serviceOrders.PATCH("/:id/assign", serviceOrderHandler.AssignServiceOrder)
			serviceOrders.POST("/:id/notes", serviceOrderHandler.AddNote)
			// Rotas genéricas depois
			serviceOrders.GET("/:id", serviceOrderHandler.GetServiceOrder)
			serviceOrders.PUT("/:id", serviceOrderHandler.UpdateServiceOrder)
			serviceOrders.DELETE("/:id", serviceOrderHandler.DeleteServiceOrder)
		}

		// Department routes (requires auth)
		// IMPORTANT: Rotas mais específicas (com mais segmentos) devem vir ANTES de rotas genéricas
		departments := api.Group("/departments")
		departments.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			departments.POST("", middleware.RequireAdminOrSuperAdmin(), departmentHandler.CreateDepartment)
			departments.GET("", departmentHandler.ListDepartments)
			// Rotas específicas primeiro
			departments.GET("/:id/employees", departmentHandler.GetDepartmentEmployees)
			departments.GET("/:id/orders", departmentHandler.GetDepartmentServiceOrders)
			// Rotas genéricas depois
			departments.GET("/:id", departmentHandler.GetDepartment)
			departments.PUT("/:id", middleware.RequireAdminOrSuperAdmin(), departmentHandler.UpdateDepartment)
			departments.DELETE("/:id", middleware.RequireAdminOrSuperAdmin(), departmentHandler.DeleteDepartment)
		}

		// Upload routes (requires auth)
		if uploadHandler != nil {
			upload := api.Group("/upload")
			upload.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
			{
				upload.POST("/image", uploadHandler.UploadImage)
				upload.DELETE("/image/:id", uploadHandler.DeleteImage)
			}
		} else {
			// Return error if Cloudinary is not configured
			upload := api.Group("/upload")
			upload.Use(authMiddleware, middleware.RequireAuth())
			{
				upload.POST("/image", func(c *gin.Context) {
					c.JSON(http.StatusServiceUnavailable, gin.H{
						"error": "Serviço de upload de imagens não está configurado. Configure as credenciais do Cloudinary.",
					})
				})
				upload.DELETE("/image/:id", func(c *gin.Context) {
					c.JSON(http.StatusServiceUnavailable, gin.H{
						"error": "Serviço de upload de imagens não está configurado. Configure as credenciais do Cloudinary.",
					})
				})
			}
		}

		// Public routes (no auth required)
		public := api.Group("/public")
		{
			public.GET("/service-orders/:orderNumber", serviceOrderHandler.GetServiceOrderByOrderNumber)
			public.POST("/service-orders/search", publicHandler.SearchServiceOrder)
			public.POST("/register", publicHandler.RegisterCustomer)
			public.POST("/pre-orders", preOrderHandler.CreatePreOrderPublic)
			public.POST("/pre-orders/search", preOrderHandler.SearchPreOrdersPublic)
		}

		// Pre-orders routes (requires auth)
		preOrders := api.Group("/pre-orders")
		preOrders.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			preOrders.GET("", preOrderHandler.ListPreOrders)
			preOrders.PATCH("/:id/status", preOrderHandler.UpdatePreOrderStatusAndConvert)
		}

		// Stock routes (requires auth)
		// IMPORTANT: Rotas mais específicas (com mais segmentos) devem vir ANTES de rotas genéricas
		stock := api.Group("/stock")
		stock.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			stock.GET("/summary", stockHandler.GetSummary)
			stock.GET("/movements", stockHandler.ListMovements)
			stock.POST("", middleware.RequireAdminOrSuperAdmin(), stockHandler.CreateItem)
			stock.GET("", stockHandler.ListItems)
			// Rotas específicas primeiro
			stock.POST("/:id/movements", stockHandler.CreateMovement)
			stock.GET("/:id/movements", stockHandler.ListMovements)
			// Rotas genéricas depois
			stock.GET("/:id", stockHandler.GetItem)
			stock.PUT("/:id", middleware.RequireAdminOrSuperAdmin(), stockHandler.UpdateItem)
		}

		// Financial routes (requires auth)
		// IMPORTANT: Rotas mais específicas (com mais segmentos) devem vir ANTES de rotas genéricas
		financial := api.Group("/financial")
		financial.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			financial.GET("/summary", financialHandler.GetSummary)
			financial.GET("/cash-flow", financialHandler.GetCashFlow)
			financial.POST("/transactions", financialHandler.CreateTransaction)
			financial.GET("/transactions", financialHandler.ListTransactions)
			// Rotas específicas primeiro
			financial.PATCH("/transactions/:id/pay", financialHandler.MarkAsPaid)
			// Rotas genéricas depois
			financial.GET("/transactions/:id", financialHandler.GetTransaction)
			financial.PUT("/transactions/:id", financialHandler.UpdateTransaction)
			financial.DELETE("/transactions/:id", middleware.RequireAdminOrSuperAdmin(), financialHandler.DeleteTransaction)
		}

		// Settings routes (public GET, admin PUT)
		settings := api.Group("/settings")
		{
			settings.GET("", settingsHandler.GetSettings) // Público para ler termos de garantia na impressão
			settings.PUT("", authMiddleware, middleware.RequireAuth(), middleware.RequireAdminOrSuperAdmin(), auditMiddleware, settingsHandler.UpdateSettings)
		}

		// WhatsApp routes (requires auth, optional if not configured)
		if whatsappHandler != nil {
			whatsapp := api.Group("/whatsapp")
			whatsapp.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
			{
				whatsapp.POST("/send", whatsappHandler.SendMessage)
				whatsapp.POST("/service-order-status", whatsappHandler.SendServiceOrderStatus)
			}
		}

		// Payment routes (requires auth, optional if not configured)
		if paymentHandler != nil {
			payments := api.Group("/payments")
			payments.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
			{
				payments.POST("/create", paymentHandler.CreatePayment)
				payments.GET("/:id/status", paymentHandler.GetPaymentStatus)
			}
			// Webhook route (public, no auth required)
			api.POST("/payments/webhook/:provider", paymentHandler.Webhook)
		}

		// NFE routes (requires auth, optional if not configured)
		if nfeHandler != nil {
			nfe := api.Group("/nfe")
			nfe.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
			{
				nfe.POST("/emit", nfeHandler.EmitNFE)
				nfe.GET("/:accessKey/status", nfeHandler.GetNFEStatus)
				nfe.POST("/:accessKey/cancel", nfeHandler.CancelNFE)
			}
		}

		// Reports routes (requires auth)
		reports := api.Group("/reports")
		reports.Use(authMiddleware, middleware.RequireAuth())
		{
			reports.GET("/service-orders", reportHandler.GetServiceOrderReport)
			reports.GET("/financial", reportHandler.GetFinancialReport)
			reports.GET("/stock", reportHandler.GetStockReport)
			reports.GET("/customers", reportHandler.GetCustomerReport)
			reports.GET("/dashboard", reportHandler.GetDashboardReport)
			reports.GET("/export", reportHandler.ExportReport)
		}

		// Quotation routes (requires auth)
		quotations := api.Group("/quotations")
		quotations.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			quotations.POST("", quotationHandler.CreateQuotation)
			quotations.GET("", quotationHandler.ListQuotations)
			// Specific routes before generic /:id
			quotations.POST("/:id/convert", quotationHandler.ConvertToServiceOrder)
			// Generic routes
			quotations.GET("/:id", quotationHandler.GetQuotation)
			quotations.PUT("/:id", quotationHandler.UpdateQuotation)
			quotations.DELETE("/:id", quotationHandler.DeleteQuotation)
		}

		// Supplier routes (requires auth)
		suppliers := api.Group("/suppliers")
		suppliers.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			suppliers.POST("", middleware.RequireAdminOrSuperAdmin(), supplierHandler.CreateSupplier)
			suppliers.GET("", supplierHandler.ListSuppliers)
			suppliers.GET("/:id", supplierHandler.GetSupplier)
			suppliers.PUT("/:id", middleware.RequireAdminOrSuperAdmin(), supplierHandler.UpdateSupplier)
			suppliers.DELETE("/:id", middleware.RequireAdminOrSuperAdmin(), supplierHandler.DeleteSupplier)
		}

		// Purchase Order routes (requires auth)
		purchaseOrders := api.Group("/purchase-orders")
		purchaseOrders.Use(authMiddleware, middleware.RequireAuth(), auditMiddleware)
		{
			purchaseOrders.POST("", middleware.RequireAdminOrSuperAdmin(), supplierHandler.CreatePurchaseOrder)
			purchaseOrders.GET("", supplierHandler.ListPurchaseOrders)
			purchaseOrders.GET("/:id", supplierHandler.GetPurchaseOrder)
			purchaseOrders.PUT("/:id", middleware.RequireAdminOrSuperAdmin(), supplierHandler.UpdatePurchaseOrder)
			purchaseOrders.DELETE("/:id", middleware.RequireAdminOrSuperAdmin(), supplierHandler.DeletePurchaseOrder)
		}

		// Notification routes (requires auth)
		notifications := api.Group("/notifications")
		notifications.Use(authMiddleware, middleware.RequireAuth())
		{
			notifications.GET("", notificationHandler.ListNotifications)
			notifications.GET("/unread-count", notificationHandler.GetUnreadCount)
			notifications.POST("/:id/read", notificationHandler.MarkAsRead)
			notifications.POST("/read-all", notificationHandler.MarkAllAsRead)
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
