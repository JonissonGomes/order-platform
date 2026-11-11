package repository

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const countersCollection = "counters"

// CounterRepository gera sequências atômicas (ex.: número da ordem de serviço)
type CounterRepository struct {
	collection *mongo.Collection
}

func NewCounterRepository(db *mongo.Database) *CounterRepository {
	return &CounterRepository{collection: db.Collection(countersCollection)}
}

// Next incrementa atomicamente a sequência e retorna o novo valor.
// Na primeira chamada retorna start; depois start+1, start+2...
func (r *CounterRepository) Next(ctx context.Context, name string, start int64) (int64, error) {
	var doc struct {
		Seq int64 `bson:"seq"`
	}

	// Pipeline de update: se "seq" não existe (upsert), parte de start-1 e soma 1
	err := r.collection.FindOneAndUpdate(ctx,
		bson.M{"_id": name},
		bson.A{bson.M{"$set": bson.M{"seq": bson.M{"$add": bson.A{bson.M{"$ifNull": bson.A{"$seq", start - 1}}, 1}}}}},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	).Decode(&doc)
	if err != nil {
		return 0, err
	}
	return doc.Seq, nil
}
