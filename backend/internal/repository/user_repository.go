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

const usersCollection = "users"

type UserRepository struct {
	collection *mongo.Collection
}

func NewUserRepository(db *mongo.Database) *UserRepository {
	return &UserRepository{
		collection: db.Collection(usersCollection),
	}
}

// CreateUser creates a new user
func (r *UserRepository) CreateUser(ctx context.Context, user *models.User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	user.LastSignedIn = time.Now()

	_, err := r.collection.InsertOne(ctx, user)
	return err
}

// GetUserByEmail retrieves a user by email
func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	filter := bson.M{"email": email}

	err := r.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

// UpdateLastSignedIn updates the last signed in timestamp
func (r *UserRepository) UpdateLastSignedIn(ctx context.Context, userID primitive.ObjectID) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"lastSignedIn": time.Now(),
			"updatedAt":    time.Now(),
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// GetUserByID retrieves a user by MongoDB ID
func (r *UserRepository) GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	filter := bson.M{"_id": id}

	err := r.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

// CountUsers counts total users
func (r *UserRepository) CountUsers(ctx context.Context) (int64, error) {
	return r.collection.CountDocuments(ctx, bson.M{})
}

// ListUsers lists users with pagination
func (r *UserRepository) ListUsers(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.User, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []*models.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	return users, nil
}

// CountSuperAdmins conta usuários com perfil Dono ("dono" ou "super_admin" legado)
func (r *UserRepository) CountSuperAdmins(ctx context.Context) (int64, error) {
	filter := bson.M{"role": bson.M{"$in": []string{string(models.RoleSuperAdmin), "super_admin"}}}
	return r.collection.CountDocuments(ctx, filter)
}

// MigrateSuperAdminRole migra registros legados com role "super_admin" para "dono"
// Seguro chamar sempre — só atualiza registros que ainda têm o valor antigo.
func (r *UserRepository) MigrateSuperAdminRole(ctx context.Context) (int64, error) {
	result, err := r.collection.UpdateMany(ctx,
		bson.M{"role": "super_admin"},
		bson.M{"$set": bson.M{"role": string(models.RoleSuperAdmin), "updatedAt": time.Now()}},
	)
	if err != nil {
		return 0, err
	}
	return result.ModifiedCount, nil
}

// SetUserSuspended sets the suspended status of a user
func (r *UserRepository) SetUserSuspended(ctx context.Context, userID primitive.ObjectID, suspended bool) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"isSuspended": suspended,
			"updatedAt":   time.Now(),
		},
	}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// UpdateUserRoleAndSuspension updates a user's role
func (r *UserRepository) UpdateUserRole(ctx context.Context, userID primitive.ObjectID, newRole models.UserRole) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"role":      newRole,
			"updatedAt": time.Now(),
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}
