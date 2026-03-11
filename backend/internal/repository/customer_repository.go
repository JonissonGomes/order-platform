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

const customersCollection = "customers"

type CustomerRepository struct {
	collection *mongo.Collection
}

func NewCustomerRepository(db *mongo.Database) *CustomerRepository {
	repo := &CustomerRepository{
		collection: db.Collection(customersCollection),
	}

	// Criar índice único para CPF (apenas para CPFs não vazios)
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "cpf", Value: 1}},
		Options: options.Index().SetUnique(true).SetPartialFilterExpression(bson.M{"cpf": bson.M{"$ne": ""}}),
	}
	repo.collection.Indexes().CreateOne(context.Background(), indexModel)

	// Índice para busca por email (autenticação - não único pois email é opcional)
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "email", Value: 1}},
	})

	return repo
}

// CreateCustomer creates a new customer
func (r *CustomerRepository) CreateCustomer(ctx context.Context, customer *models.Customer) error {
	_, err := r.collection.InsertOne(ctx, customer)
	return err
}

// GetCustomerByID retrieves a customer by ID
func (r *CustomerRepository) GetCustomerByID(ctx context.Context, id primitive.ObjectID) (*models.Customer, error) {
	var customer models.Customer
	filter := bson.M{"_id": id}

	err := r.collection.FindOne(ctx, filter).Decode(&customer)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &customer, nil
}

// GetCustomerByCPF retrieves a customer by CPF
func (r *CustomerRepository) GetCustomerByCPF(ctx context.Context, cpf string) (*models.Customer, error) {
	var customer models.Customer
	filter := bson.M{"cpf": cpf}

	err := r.collection.FindOne(ctx, filter).Decode(&customer)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &customer, nil
}

// GetCustomerByPhone retrieves a customer by phone
func (r *CustomerRepository) GetCustomerByPhone(ctx context.Context, phone string) (*models.Customer, error) {
	var customer models.Customer
	filter := bson.M{"phone": phone}

	err := r.collection.FindOne(ctx, filter).Decode(&customer)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &customer, nil
}

// GetCustomerByEmail retrieves a customer by email (for authentication)
func (r *CustomerRepository) GetCustomerByEmail(ctx context.Context, email string) (*models.Customer, error) {
	var customer models.Customer
	filter := bson.M{"email": email, "password": bson.M{"$exists": true, "$ne": ""}} // Only customers with password can login

	err := r.collection.FindOne(ctx, filter).Decode(&customer)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &customer, nil
}

// UpdateLastSignedIn updates the last signed in timestamp
func (r *CustomerRepository) UpdateLastSignedIn(ctx context.Context, customerID primitive.ObjectID) error {
	filter := bson.M{"_id": customerID}
	update := bson.M{
		"$set": bson.M{
			"lastSignedIn": time.Now(),
			"updatedAt":    time.Now(),
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// UpdateCustomer updates a customer
func (r *CustomerRepository) UpdateCustomer(ctx context.Context, id primitive.ObjectID, customer *models.Customer) error {
	filter := bson.M{"_id": id}
	update := bson.M{"$set": customer}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// ListCustomers lists customers with pagination
func (r *CustomerRepository) ListCustomers(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.Customer, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var customers []*models.Customer
	if err := cursor.All(ctx, &customers); err != nil {
		return nil, err
	}

	return customers, nil
}

// CountCustomers counts customers matching the filter
func (r *CustomerRepository) CountCustomers(ctx context.Context, filter bson.M) (int64, error) {
	return r.collection.CountDocuments(ctx, filter)
}

// Collection returns the MongoDB collection for aggregation queries
func (r *CustomerRepository) Collection() *mongo.Collection {
	return r.collection
}

// DeleteCustomer deletes a customer
func (r *CustomerRepository) DeleteCustomer(ctx context.Context, id primitive.ObjectID) error {
	filter := bson.M{"_id": id}
	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}
