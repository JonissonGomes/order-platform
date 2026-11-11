package middleware

import (
	"sync"
	"time"

	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type rateEntry struct {
	count   int
	resetAt time.Time
}

// RateLimitByIP limita requisições por IP em janela fixa (em memória, por instância).
// Usado em rotas públicas sensíveis a força bruta (ex.: consulta do portal do cliente).
// Em múltiplas instâncias, substitua por um limitador compartilhado (ex.: Redis).
func RateLimitByIP(maxRequests int, window time.Duration) gin.HandlerFunc {
	var (
		mu      sync.Mutex
		entries = make(map[string]*rateEntry)
		lastGC  = time.Now()
	)

	return func(c *gin.Context) {
		now := time.Now()
		ip := c.ClientIP()

		mu.Lock()
		if now.Sub(lastGC) > window {
			for key, e := range entries {
				if now.After(e.resetAt) {
					delete(entries, key)
				}
			}
			lastGC = now
		}

		entry, ok := entries[ip]
		if !ok || now.After(entry.resetAt) {
			entry = &rateEntry{resetAt: now.Add(window)}
			entries[ip] = entry
		}
		entry.count++
		exceeded := entry.count > maxRequests
		mu.Unlock()

		if exceeded {
			utils.RespondWithError(c, 429, "Muitas tentativas. Aguarde alguns minutos e tente novamente")
			c.Abort()
			return
		}
		c.Next()
	}
}
