package repository

import (
	"regexp"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
)

// SearchFilter monta um filtro $or com regex case-insensitive (texto escapado)
// para os campos informados. Retorna nil se o termo for vazio.
func SearchFilter(q string, fields ...string) bson.M {
	q = strings.TrimSpace(q)
	if q == "" || len(fields) == 0 {
		return nil
	}
	pattern := regexp.QuoteMeta(q)
	or := make(bson.A, 0, len(fields))
	for _, f := range fields {
		or = append(or, bson.M{f: bson.M{"$regex": pattern, "$options": "i"}})
	}
	return bson.M{"$or": or}
}
