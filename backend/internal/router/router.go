package router

import (
	"order-platform/backend/internal/config"
	"order-platform/backend/internal/database"
	"order-platform/backend/internal/handlers"
	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/repository"

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

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo)

	// Auth middleware (optional authentication)
	authMiddleware := middleware.AuthMiddleware(userRepo)

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

		// Protected routes example
		protected := api.Group("/protected")
		protected.Use(authMiddleware, middleware.RequireAuth())
		{
			// Add protected routes here
		}

		// Admin routes example
		admin := api.Group("/admin")
		admin.Use(authMiddleware, middleware.RequireAdmin())
		{
			// Add admin routes here
		}
	}

	return r
}

func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowOrigin := ""
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				allowOrigin = origin
				break
			}
		}

		// If no match found and we have allowed origins configured, reject the request
		if allowOrigin == "" && len(allowedOrigins) > 0 {
			// Origin not allowed, but we still need to respond to preflight
			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
			c.Next()
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
