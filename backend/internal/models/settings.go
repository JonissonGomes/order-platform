package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Settings é um documento singleton que armazena as configurações gerais da empresa
type Settings struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CompanyName       string             `bson:"companyName,omitempty" json:"companyName,omitempty"`
	CompanyPhone      string             `bson:"companyPhone,omitempty" json:"companyPhone,omitempty"`
	CompanyEmail      string             `bson:"companyEmail,omitempty" json:"companyEmail,omitempty"`
	CompanyAddress    *Address           `bson:"companyAddress,omitempty" json:"companyAddress,omitempty"`
	WarrantyTerms     string             `bson:"warrantyTerms,omitempty" json:"warrantyTerms,omitempty"`
	DeliveryCostPerKm float64            `bson:"deliveryCostPerKm,omitempty" json:"deliveryCostPerKm,omitempty"`
	UpdatedAt         time.Time          `bson:"updatedAt" json:"updatedAt"`
	UpdatedBy         primitive.ObjectID `bson:"updatedBy,omitempty" json:"updatedBy,omitempty"`
}
