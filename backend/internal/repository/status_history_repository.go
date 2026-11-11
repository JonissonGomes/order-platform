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

const statusHistoryCollection = "status_history"

type StatusHistoryRepository struct {
	collection *mongo.Collection
}

func NewStatusHistoryRepository(db *mongo.Database) *StatusHistoryRepository {
	repo := &StatusHistoryRepository{
		collection: db.Collection(statusHistoryCollection),
	}

	// Índice para busca por serviceOrderId
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "serviceOrderId", Value: 1}},
	})

	return repo
}

// CreateStatusHistory creates a new status history entry
func (r *StatusHistoryRepository) CreateStatusHistory(ctx context.Context, history *models.StatusHistory) error {
	history.ChangedAt = time.Now()
	if history.ID.IsZero() {
		history.ID = primitive.NewObjectID()
	}
	_, err := r.collection.InsertOne(ctx, history)
	return err
}

// GetStatusHistoryByServiceOrderID retrieves all status history for a service order
func (r *StatusHistoryRepository) GetStatusHistoryByServiceOrderID(ctx context.Context, serviceOrderID primitive.ObjectID) ([]*models.StatusHistory, error) {
	filter := bson.M{"serviceOrderId": serviceOrderID}
	opts := options.Find().SetSort(bson.M{"changedAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var history []*models.StatusHistory
	if err := cursor.All(ctx, &history); err != nil {
		return nil, err
	}

	return history, nil
}
