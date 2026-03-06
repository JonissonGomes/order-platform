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

// InitializeDefaultProfiles inicializa os perfis padrão se a collection estiver vazia
func (r *ProfileRepository) InitializeDefaultProfiles(ctx context.Context) error {
	// Verificar se já existem perfis
	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}

	// Se já existem perfis, não inicializar
	if count > 0 {
		return nil
	}

	// Obter perfis padrão
	defaultProfiles := models.DefaultProfiles()

	// Preparar documentos para inserção
	docs := make([]interface{}, len(defaultProfiles))
	for i, profile := range defaultProfiles {
		profile.CreatedAt = time.Now()
		profile.UpdatedAt = time.Now()
		docs[i] = profile
	}

	// Inserir todos os perfis padrão
	_, err = r.collection.InsertMany(ctx, docs)
	return err
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
