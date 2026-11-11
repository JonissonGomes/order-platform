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

const profilesCollection = "profiles"

type ProfileRepository struct {
	collection *mongo.Collection
}

func NewProfileRepository(db *mongo.Database) *ProfileRepository {
	repo := &ProfileRepository{
		collection: db.Collection(profilesCollection),
	}

	// Criar índice único para name
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	repo.collection.Indexes().CreateOne(context.Background(), indexModel)

	return repo
}

// InitializeDefaultProfiles garante que todos os perfis padrão existam.
// Perfis novos são inseridos; em perfis IsDefault existentes, permissões ausentes
// do catálogo atual são mescladas (edições manuais já presentes são preservadas).
// O perfil legado "Super Admin" é desativado (acesso total fica só via ENV).
func (r *ProfileRepository) InitializeDefaultProfiles(ctx context.Context) error {
	now := time.Now()
	if err := r.deactivateLegacySuperAdminProfile(ctx, now); err != nil {
		return err
	}
	for _, profile := range models.DefaultProfiles() {
		existing, err := r.GetProfileByName(ctx, profile.Name)
		if err != nil {
			return err
		}
		if existing == nil {
			profile.ID = primitive.NewObjectID()
			profile.CreatedAt = now
			profile.UpdatedAt = now
			if err := r.CreateProfile(ctx, profile); err != nil {
				return err
			}
			continue
		}
		if !existing.IsDefault {
			continue
		}
		merged := mergePermissions(existing.Permissions, profile.Permissions)
		if len(merged) == len(existing.Permissions) {
			continue
		}
		existing.Permissions = merged
		existing.Description = profile.Description
		existing.UpdatedAt = now
		if err := r.UpdateProfile(ctx, existing.ID, existing); err != nil {
			return err
		}
	}
	return nil
}

func (r *ProfileRepository) deactivateLegacySuperAdminProfile(ctx context.Context, now time.Time) error {
	existing, err := r.GetProfileByName(ctx, models.ProfileNameSuperAdmin)
	if err != nil || existing == nil {
		return err
	}
	if !existing.IsActive && !existing.IsDefault {
		return nil
	}
	existing.IsActive = false
	existing.IsDefault = false
	existing.UpdatedAt = now
	return r.UpdateProfile(ctx, existing.ID, existing)
}

func mergePermissions(current, desired []string) []string {
	seen := make(map[string]struct{}, len(current)+len(desired))
	out := make([]string, 0, len(current)+len(desired))
	for _, p := range current {
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		out = append(out, p)
	}
	for _, p := range desired {
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		out = append(out, p)
	}
	return out
}

// GetProfileByID retrieves a profile by ID
func (r *ProfileRepository) GetProfileByID(ctx context.Context, id primitive.ObjectID) (*models.Profile, error) {
	var profile models.Profile
	filter := bson.M{"_id": id}

	err := r.collection.FindOne(ctx, filter).Decode(&profile)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &profile, nil
}

// GetProfileByName retrieves a profile by name
func (r *ProfileRepository) GetProfileByName(ctx context.Context, name string) (*models.Profile, error) {
	var profile models.Profile
	filter := bson.M{"name": name}

	err := r.collection.FindOne(ctx, filter).Decode(&profile)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &profile, nil
}

// ListProfiles lists all profiles
func (r *ProfileRepository) ListProfiles(ctx context.Context, filter bson.M) ([]*models.Profile, error) {
	opts := options.Find().SetSort(bson.M{"name": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var profiles []*models.Profile
	if err := cursor.All(ctx, &profiles); err != nil {
		return nil, err
	}

	return profiles, nil
}

// CreateProfile creates a new profile
func (r *ProfileRepository) CreateProfile(ctx context.Context, profile *models.Profile) error {
	profile.CreatedAt = time.Now()
	profile.UpdatedAt = time.Now()
	if profile.ID.IsZero() {
		profile.ID = primitive.NewObjectID()
	}
	_, err := r.collection.InsertOne(ctx, profile)
	return err
}

// UpdateProfile updates a profile
func (r *ProfileRepository) UpdateProfile(ctx context.Context, id primitive.ObjectID, profile *models.Profile) error {
	filter := bson.M{"_id": id}
	profile.UpdatedAt = time.Now()
	update := bson.M{"$set": profile}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}
