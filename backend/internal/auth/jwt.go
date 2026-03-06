package auth

import (
	"errors"
	"time"

	"order-platform/backend/internal/config"

	"github.com/golang-jwt/jwt/v5"
)

type SessionPayload struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Role   string `json:"role"`
}

type Claims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
)

const oneYear = 365 * 24 * time.Hour

// CreateSessionToken creates a JWT session token
func CreateSessionToken(payload SessionPayload, expiresIn time.Duration) (string, error) {
	if expiresIn == 0 {
		expiresIn = oneYear
	}

	claims := &Claims{
		UserID: payload.UserID,
		Email:  payload.Email,
		Name:   payload.Name,
		Role:   payload.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.Get().JWTSecret))
}

// VerifySessionToken verifies and parses a JWT session token
func VerifySessionToken(tokenString string) (*SessionPayload, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(config.Get().JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.UserID == "" || claims.Email == "" {
		return nil, ErrInvalidToken
	}

	return &SessionPayload{
		UserID: claims.UserID,
		Email:  claims.Email,
		Name:   claims.Name,
		Role:   claims.Role,
	}, nil
}
