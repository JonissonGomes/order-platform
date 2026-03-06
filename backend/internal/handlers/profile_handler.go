package handlers

import (
	"net/http"

	"order-platform/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProfileHandler struct {
	profileRepo *repository.ProfileRepository
}

func NewProfileHandler(profileRepo *repository.ProfileRepository) *ProfileHandler {
	return &ProfileHandler{
		profileRepo: profileRepo,
	}
}

// ListProfiles lists all profiles
func (h *ProfileHandler) ListProfiles(c *gin.Context) {
	ctx := c.Request.Context()
	filter := bson.M{}

	// Filter by active status if provided
	if active := c.Query("isActive"); active != "" {
		if active == "true" {
			filter["isActive"] = true
		} else if active == "false" {
			filter["isActive"] = false
		}
	}

	profiles, err := h.profileRepo.ListProfiles(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list profiles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"profiles": profiles})
}

// GetProfile retrieves a profile by ID
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	id := c.Param("id")
	profileID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile ID"})
		return
	}

	ctx := c.Request.Context()
	profile, err := h.profileRepo.GetProfileByID(ctx, profileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get profile"})
		return
	}
	if profile == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"profile": profile})
}
