package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"
)

const (
	charset           = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	orderNumberLength = 8
)

// GenerateRandomOrderNumber generates a unique random alphanumeric order number
// Format: ODG-XXXXXXXX (e.g., ODG-A3B7C9D2)
// This replaces the old sequential format (ORD-YYYY-NNNN)
func GenerateRandomOrderNumber() (string, error) {
	bytes := make([]byte, orderNumberLength)
	for i := range bytes {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", fmt.Errorf("failed to generate random byte: %w", err)
		}
		bytes[i] = charset[num.Int64()]
	}
	orderNumber := fmt.Sprintf("ODG-%s", string(bytes))
	return orderNumber, nil
}

// GetCurrentYear returns the current year
func GetCurrentYear() int {
	return time.Now().Year()
}
