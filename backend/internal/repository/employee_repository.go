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

const employeesCollection = "employees"

type EmployeeRepository struct {
	collection *mongo.Collection
}

func NewEmployeeRepository(db *mongo.Database) *EmployeeRepository {
	repo := &EmployeeRepository{
		collection: db.Collection(employeesCollection),
	}

	// Índice único para busca por email (autenticação)
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	// Índice para busca por departmentId
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "departmentId", Value: 1}},
	})

	return repo
}

// CreateEmployee creates a new employee
func (r *EmployeeRepository) CreateEmployee(ctx context.Context, employee *models.Employee) error {
	// Generate ID if not set
	if employee.ID.IsZero() {
		employee.ID = primitive.NewObjectID()
	}
	employee.CreatedAt = time.Now()
	employee.UpdatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, employee)
	return err
}

// GetEmployeeByID retrieves an employee by ID
func (r *EmployeeRepository) GetEmployeeByID(ctx context.Context, id primitive.ObjectID) (*models.Employee, error) {
	var employee models.Employee
	filter := bson.M{"_id": id}

	err := r.collection.FindOne(ctx, filter).Decode(&employee)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &employee, nil
}

// GetEmployeeByEmail retrieves an employee by email (for authentication)
func (r *EmployeeRepository) GetEmployeeByEmail(ctx context.Context, email string) (*models.Employee, error) {
	var employee models.Employee
	filter := bson.M{"email": email}

	err := r.collection.FindOne(ctx, filter).Decode(&employee)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &employee, nil
}

// UpdateLastSignedIn updates the last signed in timestamp
func (r *EmployeeRepository) UpdateLastSignedIn(ctx context.Context, employeeID primitive.ObjectID) error {
	filter := bson.M{"_id": employeeID}
	update := bson.M{
		"$set": bson.M{
			"lastSignedIn": time.Now(),
			"updatedAt":    time.Now(),
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// SetEmployeeSuspended sets the suspended status of an employee
func (r *EmployeeRepository) SetEmployeeSuspended(ctx context.Context, employeeID primitive.ObjectID, suspended bool) error {
	filter := bson.M{"_id": employeeID}
	update := bson.M{
		"$set": bson.M{
			"isSuspended": suspended,
			"updatedAt":   time.Now(),
		},
	}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// CountEmployees counts total employees
func (r *EmployeeRepository) CountEmployees(ctx context.Context) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{})
}

// CountAdmins counts employees with admin or dono role
func (r *EmployeeRepository) CountAdmins(ctx context.Context) (int64, error) {
	filter := bson.M{
		"role": bson.M{
			"$in": []string{string(models.EmployeeRoleAdmin), string(models.EmployeeRoleDono)},
		},
	}
	return r.collection.CountDocuments(ctx, filter)
}

// UpdateEmployee updates an employee
func (r *EmployeeRepository) UpdateEmployee(ctx context.Context, id primitive.ObjectID, employee *models.Employee) error {
	filter := bson.M{"_id": id}
	employee.UpdatedAt = time.Now()
	update := bson.M{"$set": employee}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// ListEmployees lists employees
func (r *EmployeeRepository) ListEmployees(ctx context.Context, filter bson.M) ([]*models.Employee, error) {
	opts := options.Find().SetSort(bson.M{"name": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var employees []*models.Employee
	if err := cursor.All(ctx, &employees); err != nil {
		return nil, err
	}

	return employees, nil
}

// GetEmployeesByDepartmentID retrieves employees by department ID
func (r *EmployeeRepository) GetEmployeesByDepartmentID(ctx context.Context, departmentID primitive.ObjectID) ([]*models.Employee, error) {
	filter := bson.M{"departmentId": departmentID, "isActive": true}
	opts := options.Find().SetSort(bson.M{"name": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var employees []*models.Employee
	if err := cursor.All(ctx, &employees); err != nil {
		return nil, err
	}

	return employees, nil
}
