package utils

import (
	"fmt"
	"time"
)

// GenerateOrderNumber generates a unique order number
// Format: ORD-YYYY-NNNN (e.g., ORD-2024-0001)
func GenerateOrderNumber(year int, sequence int) string {
	return fmt.Sprintf("ORD-%d-%04d", year, sequence)
}

// GetCurrentYear returns the current year
func GetCurrentYear() int {
	return time.Now().Year()
}
