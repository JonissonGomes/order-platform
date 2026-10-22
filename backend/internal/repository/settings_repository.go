package repository

import (
	"context"
	"time"

	"order-platform/backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const settingsCollection = "settings"

type SettingsRepository struct {
	collection *mongo.Collection
}

func NewSettingsRepository(db *mongo.Database) *SettingsRepository {
	return &SettingsRepository{
		collection: db.Collection(settingsCollection),
	}
}

// GetSettings retrieves the singleton settings document
func (r *SettingsRepository) GetSettings(ctx context.Context) (*models.Settings, error) {
	var settings models.Settings
	err := r.collection.FindOne(ctx, bson.M{}).Decode(&settings)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &settings, nil
}

// UpsertSettings creates or updates the settings document
func (r *SettingsRepository) UpsertSettings(ctx context.Context, settings *models.Settings, updatedBy primitive.ObjectID) (*models.Settings, error) {
	settings.UpdatedAt = time.Now()
	settings.UpdatedBy = updatedBy

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	update := bson.M{
		"$set": bson.M{
			"companyName":    settings.CompanyName,
			"companyPhone":   settings.CompanyPhone,
			"companyEmail":   settings.CompanyEmail,
			"companyAddress": settings.CompanyAddress,
			"warrantyTerms":  settings.WarrantyTerms,
			"updatedAt":      settings.UpdatedAt,
			"updatedBy":      settings.UpdatedBy,
		},
	}

	var result models.Settings
	err := r.collection.FindOneAndUpdate(ctx, bson.M{}, update, opts).Decode(&result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}
