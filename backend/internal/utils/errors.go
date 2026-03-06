package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// Error messages that are safe to expose to users
const (
	ErrInvalidCredentials     = "Credenciais inválidas"
	ErrUserAlreadyExists      = "Este email já está cadastrado"
	ErrUserNotFound           = "Usuário não encontrado"
	ErrInvalidRequest         = "Dados inválidos. Verifique os campos e tente novamente"
	ErrUnauthorized           = "Autenticação necessária"
	ErrForbidden              = "Você não tem permissão para realizar esta ação"
	ErrNotFound               = "Recurso não encontrado"
	ErrInternalServer         = "Ocorreu um erro interno. Tente novamente mais tarde"
	ErrFailedToCreate         = "Não foi possível criar o recurso. Tente novamente"
	ErrFailedToUpdate         = "Não foi possível atualizar o recurso. Tente novamente"
	ErrFailedToDelete         = "Não foi possível excluir o recurso. Tente novamente"
	ErrInvalidID              = "ID inválido"
	ErrMaxSuperAdmins         = "Limite máximo de super administradores atingido"
	ErrEmailAlreadyExists     = "Este email já está em uso"
)

// RespondWithError sends a standardized error response
func RespondWithError(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, ErrorResponse{Error: message})
}

// RespondWithBadRequest sends a 400 Bad Request error
func RespondWithBadRequest(c *gin.Context, message string) {
	if message == "" {
		message = ErrInvalidRequest
	}
	RespondWithError(c, http.StatusBadRequest, message)
}

// RespondWithUnauthorized sends a 401 Unauthorized error
func RespondWithUnauthorized(c *gin.Context, message string) {
	if message == "" {
		message = ErrInvalidCredentials
	}
	RespondWithError(c, http.StatusUnauthorized, message)
}

// RespondWithForbidden sends a 403 Forbidden error
func RespondWithForbidden(c *gin.Context, message string) {
	if message == "" {
		message = ErrForbidden
	}
	RespondWithError(c, http.StatusForbidden, message)
}

// RespondWithNotFound sends a 404 Not Found error
func RespondWithNotFound(c *gin.Context, message string) {
	if message == "" {
		message = ErrNotFound
	}
	RespondWithError(c, http.StatusNotFound, message)
}

// RespondWithConflict sends a 409 Conflict error
func RespondWithConflict(c *gin.Context, message string) {
	if message == "" {
		message = ErrUserAlreadyExists
	}
	RespondWithError(c, http.StatusConflict, message)
}

// RespondWithInternalError sends a 500 Internal Server Error
// Always uses generic message to avoid exposing technical details
func RespondWithInternalError(c *gin.Context) {
	RespondWithError(c, http.StatusInternalServerError, ErrInternalServer)
}

// SanitizeValidationError sanitizes validation errors from gin binding
// to avoid exposing technical details
func SanitizeValidationError(err error) string {
	// Return generic message for validation errors
	// This prevents exposing field names, validation rules, etc.
	return ErrInvalidRequest
}
