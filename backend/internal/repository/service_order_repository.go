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

const serviceOrdersCollection = "service_orders"

type ServiceOrderRepository struct {
	collection *mongo.Collection
}

func NewServiceOrderRepository(db *mongo.Database) *ServiceOrderRepository {
	repo := &ServiceOrderRepository{
		collection: db.Collection(serviceOrdersCollection),
	}

	// Criar índice único para orderNumber
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "orderNumber", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	repo.collection.Indexes().CreateOne(context.Background(), indexModel)

	// Índices para buscas comuns
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "customerId", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "departmentId", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "status", Value: 1}},
	})

	return repo
}

// CreateServiceOrder creates a new service order
func (r *ServiceOrderRepository) CreateServiceOrder(ctx context.Context, order *models.ServiceOrder) error {
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, order)
	return err
}

// GetServiceOrderByID retrieves a service order by ID
func (r *ServiceOrderRepository) GetServiceOrderByID(ctx context.Context, id primitive.ObjectID) (*models.ServiceOrder, error) {
	var order models.ServiceOrder
	filter := bson.M{"_id": id}

	err := r.collection.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &order, nil
}

// GetServiceOrderByOrderNumber retrieves a service order by order number
func (r *ServiceOrderRepository) GetServiceOrderByOrderNumber(ctx context.Context, orderNumber string) (*models.ServiceOrder, error) {
	var order models.ServiceOrder
	filter := bson.M{"orderNumber": orderNumber}

	err := r.collection.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &order, nil
}

// UpdateServiceOrder updates a service order
func (r *ServiceOrderRepository) UpdateServiceOrder(ctx context.Context, id primitive.ObjectID, order *models.ServiceOrder) error {
	filter := bson.M{"_id": id}
	order.UpdatedAt = time.Now()
	update := bson.M{"$set": order}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// ListServiceOrders lists service orders with pagination
func (r *ServiceOrderRepository) ListServiceOrders(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.ServiceOrder, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []*models.ServiceOrder
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}

	return orders, nil
}

// CountServiceOrders counts service orders matching the filter
func (r *ServiceOrderRepository) CountServiceOrders(ctx context.Context, filter bson.M) (int64, error) {
	return r.collection.CountDocuments(ctx, filter)
}

// GetServiceOrdersByCustomerID retrieves all service orders for a customer
func (r *ServiceOrderRepository) GetServiceOrdersByCustomerID(ctx context.Context, customerID primitive.ObjectID) ([]*models.ServiceOrder, error) {
	filter := bson.M{"customerId": customerID}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []*models.ServiceOrder
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}

	return orders, nil
}

// DeleteServiceOrder deletes a service order
func (r *ServiceOrderRepository) DeleteServiceOrder(ctx context.Context, id primitive.ObjectID) error {
	filter := bson.M{"_id": id}
	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}
