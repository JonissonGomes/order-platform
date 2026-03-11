package handlers

import (
	"log"
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

	// Get folder from query parameter (default: "doutor_game")
	// All images should be uploaded to "doutor_game" folder by default
	folder := c.DefaultQuery("folder", "doutor_game")
	
	log.Printf("Upload request - folder: %s", folder)

	// Get file from form
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		log.Printf("Error getting file from form: %v", err)
		utils.RespondWithBadRequest(c, "Arquivo não encontrado")
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	fileName := header.Filename
	log.Printf("Upload attempt - Content-Type: %s, Filename: %s, Size: %d", contentType, fileName, header.Size)
	
	// Validate by Content-Type (common MIME types)
	validContentType := contentType == "image/jpeg" || 
		contentType == "image/jpg" || 
		contentType == "image/png" || 
		contentType == "image/webp"
	
	// If Content-Type is not valid, try to validate by file extension as fallback
	if !validContentType {
		validExtension := false
		if len(fileName) > 4 {
			ext := fileName[len(fileName)-4:]
			if ext == ".jpg" || ext == ".png" || ext == "webp" {
				validExtension = true
			}
		}
		if len(fileName) > 5 {
			ext5 := fileName[len(fileName)-5:]
			if ext5 == ".jpeg" {
				validExtension = true
			}
		}
		if !validExtension {
			log.Printf("Invalid file type - Content-Type: %s, Filename: %s", contentType, fileName)
			utils.RespondWithBadRequest(c, "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP")
			return
		}
		log.Printf("File type validated by extension - Content-Type: %s, Filename: %s", contentType, fileName)
	}

	// Validate file size (max 10MB)
	if header.Size > 10*1024*1024 {
		utils.RespondWithBadRequest(c, "Arquivo muito grande. Tamanho máximo: 10MB")
		return
	}

	ctx := c.Request.Context()
	result, err := h.cloudinaryService.UploadImage(ctx, file, folder)
	if err != nil {
		log.Printf("Error uploading image to Cloudinary: %v", err)
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
		log.Printf("DeleteImage: publicID is empty")
		utils.RespondWithBadRequest(c, "ID da imagem é obrigatório")
		return
	}

	// Validação: verificar se o publicID não está vazio e tem formato válido
	if len(publicID) < 3 {
		log.Printf("DeleteImage: publicID too short: %s", publicID)
		utils.RespondWithBadRequest(c, "ID da imagem inválido")
		return
	}

	log.Printf("DeleteImage: Attempting to delete image with publicID: %s (requested by employee: %s)", publicID, currentEmployee.ID)

	ctx := c.Request.Context()
	if err := h.cloudinaryService.DeleteImage(ctx, publicID); err != nil {
		log.Printf("Error deleting image from Cloudinary: %v (publicID: %s, employee: %s)", err, publicID, currentEmployee.ID)
		utils.RespondWithInternalError(c)
		return
	}

	log.Printf("DeleteImage: Successfully deleted image with publicID: %s (deleted by employee: %s)", publicID, currentEmployee.ID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}
