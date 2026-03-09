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

const transactionsCollection = "transactions"

type FinancialRepository struct {
	collection *mongo.Collection
}

func NewFinancialRepository(db *mongo.Database) *FinancialRepository {
	repo := &FinancialRepository{
		collection: db.Collection(transactionsCollection),
	}

	// Índices para consultas frequentes
	repo.collection.Indexes().CreateMany(context.Background(), []mongo.IndexModel{
		{Keys: bson.D{{Key: "type", Value: 1}}},
		{Keys: bson.D{{Key: "referenceDate", Value: -1}}},
		{Keys: bson.D{{Key: "isPaid", Value: 1}}},
		{Keys: bson.D{{Key: "serviceOrderId", Value: 1}}},
	})

	return repo
}

func (r *FinancialRepository) Create(ctx context.Context, t *models.Transaction) error {
	_, err := r.collection.InsertOne(ctx, t)
	return err
}

func (r *FinancialRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Transaction, error) {
	var t models.Transaction
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&t)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &t, err
}

func (r *FinancialRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updatedAt"] = time.Now()
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	return err
}

func (r *FinancialRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// List retorna transações com filtros e paginação
func (r *FinancialRepository) List(ctx context.Context, filter bson.M, page, limit int) ([]*models.Transaction, int64, error) {
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "referenceDate", Value: -1}}).
		SetSkip(int64((page - 1) * limit)).
		SetLimit(int64(limit))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var transactions []*models.Transaction
	if err := cursor.All(ctx, &transactions); err != nil {
		return nil, 0, err
	}
	return transactions, total, nil
}

// GetSummary retorna resumo financeiro para um filtro de datas
func (r *FinancialRepository) GetSummary(ctx context.Context, dateFilter bson.M) (*models.FinancialSummary, error) {
	baseFilter := dateFilter

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: baseFilter}},
		{{Key: "$group", Value: bson.M{
			"_id": nil,
			"totalIncome": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$eq": bson.A{"$type", "income"}},
					bson.M{"$eq": bson.A{"$isPaid", true}},
				}}, "$amount", 0,
			}}},
			"totalExpense": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$eq": bson.A{"$type", "expense"}},
					bson.M{"$eq": bson.A{"$isPaid", true}},
				}}, "$amount", 0,
			}}},
			"pendingIncome": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$eq": bson.A{"$type", "income"}},
					bson.M{"$eq": bson.A{"$isPaid", false}},
				}}, "$amount", 0,
			}}},
			"pendingExpense": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$eq": bson.A{"$type", "expense"}},
					bson.M{"$eq": bson.A{"$isPaid", false}},
				}}, "$amount", 0,
			}}},
			"transactionCount": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		TotalIncome      float64 `bson:"totalIncome"`
		TotalExpense     float64 `bson:"totalExpense"`
		PendingIncome    float64 `bson:"pendingIncome"`
		PendingExpense   float64 `bson:"pendingExpense"`
		TransactionCount int     `bson:"transactionCount"`
	}

	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	summary := &models.FinancialSummary{}
	if len(results) > 0 {
		r := results[0]
		summary.TotalIncome = r.TotalIncome
		summary.TotalExpense = r.TotalExpense
		summary.Balance = r.TotalIncome - r.TotalExpense
		summary.PendingIncome = r.PendingIncome
		summary.PendingExpense = r.PendingExpense
		summary.TransactionCount = r.TransactionCount
	}
	return summary, nil
}

// GetCashFlow retorna o fluxo de caixa dos últimos N meses
func (r *FinancialRepository) GetCashFlow(ctx context.Context, months int) ([]models.CashFlowEntry, error) {
	since := time.Now().AddDate(0, -months, 0)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"referenceDate": bson.M{"$gte": since},
			"isPaid":        true,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"year":  bson.M{"$year": "$referenceDate"},
				"month": bson.M{"$month": "$referenceDate"},
			},
			"income": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$eq": bson.A{"$type", "income"}}, "$amount", 0,
			}}},
			"expense": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$eq": bson.A{"$type", "expense"}}, "$amount", 0,
			}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id.year", Value: 1}, {Key: "_id.month", Value: 1}}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var raw []struct {
		ID struct {
			Year  int `bson:"year"`
			Month int `bson:"month"`
		} `bson:"_id"`
		Income  float64 `bson:"income"`
		Expense float64 `bson:"expense"`
	}
	if err := cursor.All(ctx, &raw); err != nil {
		return nil, err
	}

	entries := make([]models.CashFlowEntry, 0, len(raw))
	for _, v := range raw {
		entries = append(entries, models.CashFlowEntry{
			Month:   fmt(v.ID.Year, v.ID.Month),
			Income:  v.Income,
			Expense: v.Expense,
			Balance: v.Income - v.Expense,
		})
	}
	return entries, nil
}

func fmt(year, month int) string {
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC).Format("2006-01")
}
