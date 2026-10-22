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

const preOrdersCollection = "pre_orders"

type PreOrderRepository struct {
	collection *mongo.Collection
}

func NewPreOrderRepository(db *mongo.Database) *PreOrderRepository {
	repo := &PreOrderRepository{
		collection: db.Collection(preOrdersCollection),
	}

	// Unique human identifier
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "preOrderNumber", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	// Common filters
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "status", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "departmentId", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "customerPhone", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "createdAt", Value: -1}},
	})

	return repo
}

func (r *PreOrderRepository) CreatePreOrder(ctx context.Context, preOrder *models.PreOrder) error {
	preOrder.CreatedAt = time.Now()
	preOrder.UpdatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, preOrder)
	return err
}

func (r *PreOrderRepository) GetPreOrderByID(ctx context.Context, id primitive.ObjectID) (*models.PreOrder, error) {
	var preOrder models.PreOrder
	filter := bson.M{"_id": id}
	err := r.collection.FindOne(ctx, filter).Decode(&preOrder)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &preOrder, nil
}

func (r *PreOrderRepository) UpdatePreOrder(ctx context.Context, id primitive.ObjectID, preOrder *models.PreOrder) error {
	filter := bson.M{"_id": id}
	preOrder.UpdatedAt = time.Now()

	// Keep update simple: $set with full struct. MongoDB will reject _id changes if present.
	// In practice, _id is the same value for this update.
	update := bson.M{"$set": preOrder}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *PreOrderRepository) ListPreOrders(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.PreOrder, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var preOrders []*models.PreOrder
	if err := cursor.All(ctx, &preOrders); err != nil {
		return nil, err
	}
	return preOrders, nil
}

func (r *PreOrderRepository) CountPreOrders(ctx context.Context, filter bson.M) (int64, error) {
	return r.collection.CountDocuments(ctx, filter)
}

