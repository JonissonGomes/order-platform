package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Customer struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	BranchID  primitive.ObjectID `bson:"branchId,omitempty" json:"branchId,omitempty"`
	Name      string             `bson:"name" json:"name"`
	CPF       string             `bson:"cpf,omitempty" json:"cpf"` // Único (quando informado), indexado
	Phone     string             `bson:"phone" json:"phone"`
	Email     string             `bson:"email,omitempty" json:"email,omitempty"`
	Address   *Address           `bson:"address,omitempty" json:"address,omitempty"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy primitive.ObjectID `bson:"createdBy" json:"createdBy"` // Employee ID
	UpdatedBy primitive.ObjectID `bson:"updatedBy" json:"updatedBy"` // Employee ID
}

type Address struct {
	Street       string `bson:"street" json:"street"`
	Number       string `bson:"number" json:"number"`
	Complement   string `bson:"complement,omitempty" json:"complement,omitempty"`
	Neighborhood string `bson:"neighborhood" json:"neighborhood"`
	City         string `bson:"city" json:"city"`
	State        string `bson:"state" json:"state"`
	ZIPCode      string `bson:"zipCode" json:"zipCode"`
}
