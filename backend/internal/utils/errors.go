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

	ErrDuplicateRecord        = "Já existe um registro com estes dados"
	ErrBranchNotFound         = "Filial não encontrada"
	ErrCustomerNotFound       = "Cliente não encontrado"
	ErrProductNotFound        = "Produto não encontrado"
	ErrOrderNotFound          = "Ordem de serviço não encontrada"
	ErrEmployeeNotFound       = "Colaborador não encontrado"
	ErrProfileNotFound        = "Perfil não encontrado"
	ErrInvalidStatus          = "Status inválido"
	ErrInvalidStatusTransition = "Transição de status não permitida"
	ErrStatusChangeForbidden  = "Você não tem permissão para alterar para este status"
	ErrStatusConflict         = "O status da ordem foi alterado por outra pessoa. Atualize e tente novamente"
	ErrInsufficientStock      = "Estoque insuficiente para esta operação"
	ErrInvalidQuantity        = "Quantidade inválida"
	ErrCashAlreadyOpen        = "Já existe um caixa aberto nesta filial"
	ErrCashNotOpen            = "Não há caixa aberto nesta filial"
	ErrInvalidPaymentMethod   = "Forma de pagamento inválida"
	ErrInvalidAmount          = "Valor inválido"
	ErrDefaultProfileLocked   = "O nome e o status de perfis padrão não podem ser alterados"
	ErrPortalNotFound         = "Ordem não encontrada. Verifique o número e os 4 últimos dígitos do telefone"
	ErrCloseoutIncomplete     = "Preencha o parecer técnico e a resolução antes de marcar pronta/entregue"
	ErrCloseoutPartsOrLabor   = "Inclua as peças usadas ou confirme explicitamente que foi só mão de obra"
	ErrCloseoutLaborWithParts = "Desmarque “só mão de obra” para lançar peças, ou remova as peças"
	ErrOrderClosed            = "Esta ordem não permite mais alterações de laudo ou peças"
	ErrPartNotFound           = "Peça não encontrada nesta ordem"
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
