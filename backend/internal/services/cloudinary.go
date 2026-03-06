package services

import (
	"context"
	"fmt"
	"io"
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

	// Upload options
	overwrite := false
	uploadParams := uploader.UploadParams{
		Folder:       folder,
		PublicID:     filename,
		Overwrite:    &overwrite,
		ResourceType: "image",
		Transformation: "q_auto,f_auto,c_limit,w_1920,h_1080", // Auto quality, auto format, limit dimensions
	}

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Upload to Cloudinary
	result, err := s.cld.Upload.Upload(ctx, fileBytes, uploadParams)
	if err != nil {
		return nil, fmt.Errorf("failed to upload to Cloudinary: %w", err)
	}

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
