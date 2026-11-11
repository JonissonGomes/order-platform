package router

import (
	"log"

	"order-platform/backend/internal/config"

	"github.com/gin-gonic/gin"
)

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
