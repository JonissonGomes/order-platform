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

	// Índice único para CPF apenas quando informado (clientes de balcão podem não ter CPF).
	// O índice antigo (não parcial) é removido para não bloquear cadastros sem CPF.
	ctx := context.Background()
	repo.collection.Indexes().DropOne(ctx, "cpf_1")
	repo.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "cpf", Value: 1}},
		Options: options.Index().SetName("cpf_unique_partial").SetUnique(true).
			SetPartialFilterExpression(bson.M{"cpf": bson.M{"$type": "string"}}),
	})
	repo.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "phone", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "branchId", Value: 1}},
	})

	return repo
}

// CreateCustomer creates a new customer (define timestamps se ausentes)
func (r *CustomerRepository) CreateCustomer(ctx context.Context, customer *models.Customer) error {
	now := time.Now()
	if customer.CreatedAt.IsZero() {
		customer.CreatedAt = now
	}
	if customer.UpdatedAt.IsZero() {
		customer.UpdatedAt = now
	}

	result, err := r.collection.InsertOne(ctx, customer)
	if err != nil {
		return err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		customer.ID = id
	}
	return nil
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

// GetCustomersByIDs retrieves multiple customers at once (indexed by ID)
func (r *CustomerRepository) GetCustomersByIDs(ctx context.Context, ids []primitive.ObjectID) (map[primitive.ObjectID]*models.Customer, error) {
	result := make(map[primitive.ObjectID]*models.Customer, len(ids))
	if len(ids) == 0 {
		return result, nil
	}

	cursor, err := r.collection.Find(ctx, bson.M{"_id": bson.M{"$in": ids}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var customers []*models.Customer
	if err := cursor.All(ctx, &customers); err != nil {
		return nil, err
	}
	for _, customer := range customers {
		result[customer.ID] = customer
	}
	return result, nil
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
