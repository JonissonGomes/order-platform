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

const departmentsCollection = "departments"

type DepartmentRepository struct {
	collection *mongo.Collection
}

func NewDepartmentRepository(db *mongo.Database) *DepartmentRepository {
	return &DepartmentRepository{
		collection: db.Collection(departmentsCollection),
	}
}

// CreateDepartment creates a new department
func (r *DepartmentRepository) CreateDepartment(ctx context.Context, department *models.Department) error {
	department.CreatedAt = time.Now()
	department.UpdatedAt = time.Now()
	if department.ID.IsZero() {
		department.ID = primitive.NewObjectID()
	}
	_, err := r.collection.InsertOne(ctx, department)
	return err
}

// GetDepartmentByID retrieves a department by ID
func (r *DepartmentRepository) GetDepartmentByID(ctx context.Context, id primitive.ObjectID) (*models.Department, error) {
	var department models.Department
	filter := bson.M{"_id": id}

	err := r.collection.FindOne(ctx, filter).Decode(&department)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &department, nil
}

// UpdateDepartment updates a department
func (r *DepartmentRepository) UpdateDepartment(ctx context.Context, id primitive.ObjectID, department *models.Department) error {
	filter := bson.M{"_id": id}
	department.UpdatedAt = time.Now()
	update := bson.M{"$set": department}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// ListDepartments lists departments
func (r *DepartmentRepository) ListDepartments(ctx context.Context, filter bson.M) ([]*models.Department, error) {
	opts := options.Find().SetSort(bson.M{"name": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var departments []*models.Department
	if err := cursor.All(ctx, &departments); err != nil {
		return nil, err
	}

	return departments, nil
}
