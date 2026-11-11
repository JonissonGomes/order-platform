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
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "branchId", Value: 1}, {Key: "createdAt", Value: -1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "imei", Value: 1}},
	})

	return repo
}

// AddNote adiciona uma nota à ordem de serviço de forma atômica
func (r *ServiceOrderRepository) AddNote(ctx context.Context, id primitive.ObjectID, note *models.Note, updatedBy primitive.ObjectID) error {
	if note.ID.IsZero() {
		note.ID = primitive.NewObjectID()
	}
	if note.CreatedAt.IsZero() {
		note.CreatedAt = time.Now()
	}
	update := bson.M{
		"$push": bson.M{"notes": note},
		"$set":  bson.M{"updatedAt": time.Now(), "updatedBy": updatedBy},
	}
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, update)
	return err
}

// UpdateStatus altera o status somente se o status atual ainda for o esperado
// (evita corrida entre duas mudanças simultâneas). Retorna false se não houve alteração.
func (r *ServiceOrderRepository) UpdateStatus(ctx context.Context, id primitive.ObjectID, from, to models.ServiceOrderStatus, changedBy primitive.ObjectID) (bool, error) {
	now := time.Now()
	update := bson.M{"$set": bson.M{
		"status":          to,
		"statusChangedBy": changedBy,
		"statusChangedAt": now,
		"updatedAt":       now,
		"updatedBy":       changedBy,
	}}
	result, err := r.collection.UpdateOne(ctx, bson.M{"_id": id, "status": from}, update)
	if err != nil {
		return false, err
	}
	return result.ModifiedCount > 0, nil
}

// AssignTo atribui a ordem a um colaborador
func (r *ServiceOrderRepository) AssignTo(ctx context.Context, id, employeeID, updatedBy primitive.ObjectID) error {
	update := bson.M{"$set": bson.M{"assignedTo": employeeID, "updatedAt": time.Now(), "updatedBy": updatedBy}}
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, update)
	return err
}

// CreateServiceOrder creates a new service order
func (r *ServiceOrderRepository) CreateServiceOrder(ctx context.Context, order *models.ServiceOrder) error {
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	if order.ID.IsZero() {
		order.ID = primitive.NewObjectID()
	}
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

	orders := []*models.ServiceOrder{}
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
