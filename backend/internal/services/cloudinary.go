package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"time"

	"order-platform/backend/internal/config"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

type CloudinaryService struct {
	cld *cloudinary.Cloudinary
}

func NewCloudinaryService() (*CloudinaryService, error) {
	cfg := config.Get()

	if cfg.CloudinaryCloudName == "" || cfg.CloudinaryAPIKey == "" || cfg.CloudinaryAPISecret == "" {
		return nil, fmt.Errorf("Cloudinary credentials not configured")
	}

	cld, err := cloudinary.NewFromParams(
		cfg.CloudinaryCloudName,
		cfg.CloudinaryAPIKey,
		cfg.CloudinaryAPISecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Cloudinary: %w", err)
	}

	return &CloudinaryService{cld: cld}, nil
}

type UploadResult struct {
	URL      string `json:"url"`
	PublicID string `json:"publicId"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Format  string `json:"format"`
	Size    int64  `json:"size"`
}

// UploadImage uploads an image file to Cloudinary
func (s *CloudinaryService) UploadImage(ctx context.Context, file multipart.File, folder string) (*UploadResult, error) {
	// Generate unique filename
	filename := fmt.Sprintf("%s_%d", folder, time.Now().UnixNano())

	// Read file content first (before closing)
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		log.Printf("Error reading file bytes: %v", err)
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	if len(fileBytes) == 0 {
		log.Printf("Error: file is empty")
		return nil, fmt.Errorf("file is empty")
	}

	log.Printf("File read successfully: %d bytes, uploading to folder: %s, filename: %s", len(fileBytes), folder, filename)

	// Upload options
	overwrite := false
	uploadParams := uploader.UploadParams{
		Folder:       folder,
		PublicID:     filename,
		Overwrite:    &overwrite,
		ResourceType: "image",
		// Transformation is applied via EagerTransformation or via URL transformation
		// For now, we'll apply transformations via URL when serving the image
	}

	// Upload to Cloudinary
	// Cloudinary SDK v2 requires an io.Reader, not []byte directly
	fileReader := bytes.NewReader(fileBytes)
	log.Printf("Starting Cloudinary upload...")
	result, err := s.cld.Upload.Upload(ctx, fileReader, uploadParams)
	if err != nil {
		log.Printf("Cloudinary upload error: %v", err)
		return nil, fmt.Errorf("failed to upload to Cloudinary: %w", err)
	}

	log.Printf("Cloudinary upload successful: URL=%s, PublicID=%s", result.SecureURL, result.PublicID)

	return &UploadResult{
		URL:      result.SecureURL,
		PublicID: result.PublicID,
		Width:    result.Width,
		Height:   result.Height,
		Format:   result.Format,
		Size:     int64(result.Bytes),
	}, nil
}

// DeleteImage deletes an image from Cloudinary
func (s *CloudinaryService) DeleteImage(ctx context.Context, publicID string) error {
	_, err := s.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID: publicID,
	})
	return err
}
