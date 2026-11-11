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

const branchesCollection = "branches"

type BranchRepository struct {
	collection *mongo.Collection
}

func NewBranchRepository(db *mongo.Database) *BranchRepository {
	repo := &BranchRepository{collection: db.Collection(branchesCollection)}

	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "code", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	return repo
}

// InitializeDefaultBranch cria a filial padrão (ZTS Cell) caso não exista nenhuma filial
func (r *BranchRepository) InitializeDefaultBranch(ctx context.Context) error {
	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	_, err = r.collection.InsertOne(ctx, models.EnsureDefaultBranch())
	return err
}

// CreateBranch creates a new branch
func (r *BranchRepository) CreateBranch(ctx context.Context, branch *models.Branch) error {
	now := time.Now()
	branch.CreatedAt = now
	branch.UpdatedAt = now

	result, err := r.collection.InsertOne(ctx, branch)
	if err != nil {
		return err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		branch.ID = id
	}
	return nil
}

// GetBranchByID retrieves a branch by ID
func (r *BranchRepository) GetBranchByID(ctx context.Context, id primitive.ObjectID) (*models.Branch, error) {
	return r.findOne(ctx, bson.M{"_id": id})
}

// GetBranchByCode retrieves a branch by code
func (r *BranchRepository) GetBranchByCode(ctx context.Context, code string) (*models.Branch, error) {
	return r.findOne(ctx, bson.M{"code": code})
}

// GetDefault retorna a filial padrão (ou a primeira ativa, como fallback)
func (r *BranchRepository) GetDefault(ctx context.Context) (*models.Branch, error) {
	branch, err := r.findOne(ctx, bson.M{"isDefault": true})
	if err != nil || branch != nil {
		return branch, err
	}
	return r.findOne(ctx, bson.M{"isActive": true})
}

// UpdateBranch updates a branch
func (r *BranchRepository) UpdateBranch(ctx context.Context, id primitive.ObjectID, branch *models.Branch) error {
	branch.UpdatedAt = time.Now()
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": branch})
	return err
}

// ListBranches lists branches
func (r *BranchRepository) ListBranches(ctx context.Context, filter bson.M) ([]*models.Branch, error) {
	cursor, err := r.collection.Find(ctx, filter, options.Find().SetSort(bson.M{"name": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	branches := []*models.Branch{}
	if err := cursor.All(ctx, &branches); err != nil {
		return nil, err
	}
	return branches, nil
}

func (r *BranchRepository) findOne(ctx context.Context, filter bson.M) (*models.Branch, error) {
	var branch models.Branch
	if err := r.collection.FindOne(ctx, filter).Decode(&branch); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &branch, nil
}
