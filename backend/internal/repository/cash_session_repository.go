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

const (
	cashSessionsCollection  = "cash_sessions"
	cashMovementsCollection = "cash_movements"
)

type CashSessionRepository struct {
	sessions  *mongo.Collection
	movements *mongo.Collection
}

func NewCashSessionRepository(db *mongo.Database) *CashSessionRepository {
	repo := &CashSessionRepository{
		sessions:  db.Collection(cashSessionsCollection),
		movements: db.Collection(cashMovementsCollection),
	}

	// Garante no máximo uma sessão aberta por filial
	repo.sessions.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "branchId", Value: 1}},
		Options: options.Index().SetUnique(true).SetPartialFilterExpression(
			bson.M{"status": models.CashSessionOpen},
		),
	})
	repo.movements.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "sessionId", Value: 1}, {Key: "createdAt", Value: 1}},
	})

	return repo
}

// CreateSession abre uma nova sessão de caixa
func (r *CashSessionRepository) CreateSession(ctx context.Context, session *models.CashSession) error {
	if session.OpenedAt.IsZero() {
		session.OpenedAt = time.Now()
	}
	session.Status = models.CashSessionOpen

	result, err := r.sessions.InsertOne(ctx, session)
	if err != nil {
		return err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		session.ID = id
	}
	return nil
}

// GetSessionByID retrieves a cash session by ID
func (r *CashSessionRepository) GetSessionByID(ctx context.Context, id primitive.ObjectID) (*models.CashSession, error) {
	return r.findOne(ctx, bson.M{"_id": id})
}

// GetOpenByBranch retorna a sessão aberta da filial (nil se não houver)
func (r *CashSessionRepository) GetOpenByBranch(ctx context.Context, branchID primitive.ObjectID) (*models.CashSession, error) {
	return r.findOne(ctx, bson.M{"branchId": branchID, "status": models.CashSessionOpen})
}

// Close fecha a sessão (somente se ainda estiver aberta). Retorna a sessão atualizada ou nil.
func (r *CashSessionRepository) Close(ctx context.Context, session *models.CashSession) (*models.CashSession, error) {
	now := time.Now()
	update := bson.M{"$set": bson.M{
		"status":         models.CashSessionClosed,
		"closedBy":       session.ClosedBy,
		"closedAt":       now,
		"closingCounted": session.ClosingCounted,
		"expectedTotal":  session.ExpectedTotal,
		"difference":     session.Difference,
		"notes":          session.Notes,
	}}

	var closed models.CashSession
	err := r.sessions.FindOneAndUpdate(ctx,
		bson.M{"_id": session.ID, "status": models.CashSessionOpen}, update,
		options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&closed)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &closed, nil
}

// CreateMovement registra um lançamento no caixa
func (r *CashSessionRepository) CreateMovement(ctx context.Context, movement *models.CashMovement) error {
	if movement.CreatedAt.IsZero() {
		movement.CreatedAt = time.Now()
	}
	result, err := r.movements.InsertOne(ctx, movement)
	if err != nil {
		return err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		movement.ID = id
	}
	return nil
}

// SumInByRef soma entradas (type=in) de um documento referenciado (ex.: OS).
func (r *CashSessionRepository) SumInByRef(ctx context.Context, refType string, refID primitive.ObjectID) (float64, error) {
	cursor, err := r.movements.Find(ctx, bson.M{
		"refType": refType,
		"refId":   refID,
		"type":    models.CashIn,
	})
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var total float64
	for cursor.Next(ctx) {
		var m models.CashMovement
		if err := cursor.Decode(&m); err != nil {
			return 0, err
		}
		total += m.Amount
	}
	return total, cursor.Err()
}

// ListMovements lista os lançamentos de uma sessão em ordem cronológica
func (r *CashSessionRepository) ListMovements(ctx context.Context, sessionID primitive.ObjectID) ([]*models.CashMovement, error) {
	cursor, err := r.movements.Find(ctx, bson.M{"sessionId": sessionID},
		options.Find().SetSort(bson.M{"createdAt": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	movements := []*models.CashMovement{}
	if err := cursor.All(ctx, &movements); err != nil {
		return nil, err
	}
	return movements, nil
}

func (r *CashSessionRepository) findOne(ctx context.Context, filter bson.M) (*models.CashSession, error) {
	var session models.CashSession
	if err := r.sessions.FindOne(ctx, filter).Decode(&session); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}
