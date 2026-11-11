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

const inventoryMovementsCollection = "inventory_movements"

type InventoryMovementRepository struct {
	collection *mongo.Collection
}

func NewInventoryMovementRepository(db *mongo.Database) *InventoryMovementRepository {
	repo := &InventoryMovementRepository{collection: db.Collection(inventoryMovementsCollection)}

	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "productId", Value: 1}, {Key: "createdAt", Value: -1}},
	})

	return repo
}

// Create registra uma movimentação de estoque
func (r *InventoryMovementRepository) Create(ctx context.Context, movement *models.InventoryMovement) error {
	if movement.CreatedAt.IsZero() {
		movement.CreatedAt = time.Now()
	}
	result, err := r.collection.InsertOne(ctx, movement)
	if err != nil {
		return err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		movement.ID = id
	}
	return nil
}

// ListByProduct lista as movimentações de um produto (mais recentes primeiro)
func (r *InventoryMovementRepository) ListByProduct(ctx context.Context, productID primitive.ObjectID, skip, limit int64) ([]*models.InventoryMovement, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, bson.M{"productId": productID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	movements := []*models.InventoryMovement{}
	if err := cursor.All(ctx, &movements); err != nil {
		return nil, err
	}
	return movements, nil
}
