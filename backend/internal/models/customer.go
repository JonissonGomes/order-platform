package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Customer struct {
	ID    primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name  string             `bson:"name" json:"name"`
	CPF   string             `bson:"cpf" json:"cpf"` // Único, indexado (pode ser vazio para avulsos)
	Phone string             `bson:"phone" json:"phone"`
	// Authentication fields (for customers who can login)
	Email        string     `bson:"email,omitempty" json:"email,omitempty"`
	Password     string     `bson:"password,omitempty" json:"-"` // Never return password in JSON, optional for customers
	Address      *Address   `bson:"address,omitempty" json:"address,omitempty"`
	IsTemporary  bool       `bson:"isTemporary,omitempty" json:"isTemporary,omitempty"` // Cliente avulso
	IsSuspended  bool       `bson:"isSuspended,omitempty" json:"isSuspended,omitempty"` // Customer suspension
	Notes        string     `bson:"notes,omitempty" json:"notes,omitempty"`             // Observações sobre o cliente
	LastSignedIn *time.Time `bson:"lastSignedIn,omitempty" json:"lastSignedIn,omitempty"`

	// Fidelização e manutenção periódica
	MaintenanceIntervalMonths int        `bson:"maintenanceIntervalMonths,omitempty" json:"maintenanceIntervalMonths,omitempty"` // 0 = sem intervalo
	LastMaintenanceDate       *time.Time `bson:"lastMaintenanceDate,omitempty" json:"lastMaintenanceDate,omitempty"`
	NextMaintenanceDate       *time.Time `bson:"nextMaintenanceDate,omitempty" json:"nextMaintenanceDate,omitempty"`
	MaintenanceAlertSent      bool       `bson:"maintenanceAlertSent,omitempty" json:"maintenanceAlertSent,omitempty"`

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
