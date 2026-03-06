package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRole string

const (
	RoleUser       UserRole = "user"
	RoleAdmin      UserRole = "admin"
	RoleSuperAdmin UserRole = "super_admin"
)

type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string             `bson:"email" json:"email"`
	Password     string             `bson:"password" json:"-"` // Never return password in JSON
	Name         string             `bson:"name" json:"name"`
	Role         UserRole           `bson:"role" json:"role"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
	LastSignedIn time.Time          `bson:"lastSignedIn" json:"lastSignedIn"`
}

// IsAdmin checks if the user has admin role
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin || u.Role == RoleSuperAdmin
}

// IsSuperAdmin checks if the user has super admin role
func (u *User) IsSuperAdmin() bool {
	return u.Role == RoleSuperAdmin
}
