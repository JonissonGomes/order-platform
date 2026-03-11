package handlers

import (
	"net/http"

	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/services"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	cloudinaryService *services.CloudinaryService
}

func NewUploadHandler(cloudinaryService *services.CloudinaryService) *UploadHandler {
	return &UploadHandler{
		cloudinaryService: cloudinaryService,
	}
}

// UploadImage handles image upload to Cloudinary
func (h *UploadHandler) UploadImage(c *gin.Context) {
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Get folder from query parameter (default: "products")
	folder := c.DefaultQuery("folder", "products")

	// Get file from form
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.RespondWithBadRequest(c, "Arquivo não encontrado")
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		utils.RespondWithBadRequest(c, "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP")
		return
	}

	// Validate file size (max 10MB)
	if header.Size > 10*1024*1024 {
		utils.RespondWithBadRequest(c, "Arquivo muito grande. Tamanho máximo: 10MB")
		return
	}

	ctx := c.Request.Context()
	result, err := h.cloudinaryService.UploadImage(ctx, file, folder)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":      result.URL,
		"publicId": result.PublicID,
		"width":    result.Width,
		"height":   result.Height,
		"format":   result.Format,
		"size":     result.Size,
	})
}

// DeleteImage deletes an image from Cloudinary
func (h *UploadHandler) DeleteImage(c *gin.Context) {
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	publicID := c.Param("id")
	if publicID == "" {
		utils.RespondWithBadRequest(c, "ID da imagem é obrigatório")
		return
	}

	ctx := c.Request.Context()
	if err := h.cloudinaryService.DeleteImage(ctx, publicID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
