package config

import "errors"

// Mantidos por compatibilidade com imports existentes.
var (
	ErrMissingDatabaseURL = errors.New("DATABASE_URL is required")
	ErrMissingJWTSecret   = errors.New("JWT_SECRET is required")
)
