package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRole string

const (
	RoleUser       UserRole = "user"
	RoleAdmin      UserRole = "admin"
	RoleSuperAdmin UserRole = "dono" // "dono" é o novo valor; "super_admin" é mantido por retrocompatibilidade
)

type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string             `bson:"email" json:"email"`
	Password     string             `bson:"password" json:"-"` // Never return password in JSON
	Name         string             `bson:"name" json:"name"`
	Role         UserRole           `bson:"role" json:"role"`
	IsSuspended  bool               `bson:"isSuspended,omitempty" json:"isSuspended,omitempty"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
	LastSignedIn time.Time          `bson:"lastSignedIn" json:"lastSignedIn"`
}

// IsAdmin checks if the user has admin or super admin role
func (u *User) IsAdmin() bool {
	if u == nil {
		return false
	}
	roleStr := string(u.Role)
	// "admin" → administrador, "dono" → novo valor, "super_admin" → retrocompatibilidade
	return roleStr == string(RoleAdmin) || roleStr == string(RoleSuperAdmin) || roleStr == "super_admin"
}

// IsSuperAdmin checks if the user has super admin (Dono) role
func (u *User) IsSuperAdmin() bool {
	if u == nil {
		return false
	}
	roleStr := string(u.Role)
	// Aceita "dono" (novo) e "super_admin" (legado) para retrocompatibilidade
	return roleStr == string(RoleSuperAdmin) || roleStr == "super_admin"
}
