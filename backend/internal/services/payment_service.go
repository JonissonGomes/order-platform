package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PaymentService struct {
	provider string // "stripe", "pagseguro", "mercadopago"
	apiKey   string
	apiURL   string
}

type PaymentRequest struct {
	Amount      float64
	Currency    string
	Description string
	OrderID     primitive.ObjectID
	CustomerID  primitive.ObjectID
	Metadata    map[string]string
}

type PaymentResponse struct {
	PaymentID   string
	PaymentLink string
	Status      string
	Amount      float64
}

type PaymentStatus struct {
	ID     string
	Status string // pending, paid, failed, cancelled
	Amount float64
}

func NewPaymentService(provider, apiKey, apiURL string) *PaymentService {
	return &PaymentService{
		provider: provider,
		apiKey:   apiKey,
		apiURL:   apiURL,
	}
}

// CreatePayment creates a payment and returns a payment link
func (s *PaymentService) CreatePayment(req PaymentRequest) (*PaymentResponse, error) {
	if s.apiKey == "" || s.apiURL == "" {
		return nil, fmt.Errorf("Gateway de pagamento não configurado")
	}

	switch s.provider {
	case "mercadopago":
		return s.createMercadoPagoPayment(req)
	case "pagseguro":
		return s.createPagSeguroPayment(req)
	case "stripe":
		return s.createStripePayment(req)
	default:
		return nil, fmt.Errorf("Provedor de pagamento não suportado: %s", s.provider)
	}
}

// GetPaymentStatus checks the status of a payment
func (s *PaymentService) GetPaymentStatus(paymentID string) (*PaymentStatus, error) {
	if s.apiKey == "" || s.apiURL == "" {
		return nil, fmt.Errorf("Gateway de pagamento não configurado")
	}

	switch s.provider {
	case "mercadopago":
		return s.getMercadoPagoStatus(paymentID)
	case "pagseguro":
		return s.getPagSeguroStatus(paymentID)
	case "stripe":
		return s.getStripeStatus(paymentID)
	default:
		return nil, fmt.Errorf("Provedor de pagamento não suportado: %s", s.provider)
	}
}

// createMercadoPagoPayment creates a payment using Mercado Pago API
func (s *PaymentService) createMercadoPagoPayment(req PaymentRequest) (*PaymentResponse, error) {
	url := fmt.Sprintf("%s/v1/payments", s.apiURL)

	payload := map[string]interface{}{
		"transaction_amount": req.Amount,
		"description":        req.Description,
		"payment_method_id": "pix", // Default to PIX
		"payer": map[string]interface{}{
			"email": req.Metadata["customer_email"],
		},
		"metadata": req.Metadata,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Mercado Pago API error: %s", string(body))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	paymentID, _ := result["id"].(string)
	status, _ := result["status"].(string)

	return &PaymentResponse{
		PaymentID:   paymentID,
		PaymentLink: fmt.Sprintf("%s/payments/%s", s.apiURL, paymentID),
		Status:      status,
		Amount:      req.Amount,
	}, nil
}

// createPagSeguroPayment creates a payment using PagSeguro API
func (s *PaymentService) createPagSeguroPayment(req PaymentRequest) (*PaymentResponse, error) {
	// TODO: Implement PagSeguro integration
	return nil, fmt.Errorf("PagSeguro integration not yet implemented")
}

// createStripePayment creates a payment using Stripe API
func (s *PaymentService) createStripePayment(req PaymentRequest) (*PaymentResponse, error) {
	url := fmt.Sprintf("%s/v1/payment_intents", s.apiURL)

	payload := map[string]interface{}{
		"amount":   int64(req.Amount * 100), // Convert to cents
		"currency": req.Currency,
		"metadata": req.Metadata,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Stripe API error: %s", string(body))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	paymentID, _ := result["id"].(string)
	status, _ := result["status"].(string)
	clientSecret, _ := result["client_secret"].(string)

	return &PaymentResponse{
		PaymentID:   paymentID,
		PaymentLink: clientSecret, // Stripe uses client_secret for frontend
		Status:      status,
		Amount:      req.Amount,
	}, nil
}

// getMercadoPagoStatus gets payment status from Mercado Pago
func (s *PaymentService) getMercadoPagoStatus(paymentID string) (*PaymentStatus, error) {
	url := fmt.Sprintf("%s/v1/payments/%s", s.apiURL, paymentID)

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Mercado Pago API error: status %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	status, _ := result["status"].(string)
	amount, _ := result["transaction_amount"].(float64)

	return &PaymentStatus{
		ID:     paymentID,
		Status: s.mapMercadoPagoStatus(status),
		Amount: amount,
	}, nil
}

// getPagSeguroStatus gets payment status from PagSeguro
func (s *PaymentService) getPagSeguroStatus(paymentID string) (*PaymentStatus, error) {
	// TODO: Implement PagSeguro status check
	return nil, fmt.Errorf("PagSeguro integration not yet implemented")
}

// getStripeStatus gets payment status from Stripe
func (s *PaymentService) getStripeStatus(paymentID string) (*PaymentStatus, error) {
	url := fmt.Sprintf("%s/v1/payment_intents/%s", s.apiURL, paymentID)

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Stripe API error: status %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	status, _ := result["status"].(string)
	amount, _ := result["amount"].(float64)

	return &PaymentStatus{
		ID:     paymentID,
		Status: s.mapStripeStatus(status),
		Amount: amount / 100, // Convert from cents
	}, nil
}

// mapMercadoPagoStatus maps Mercado Pago status to internal status
func (s *PaymentService) mapMercadoPagoStatus(status string) string {
	statusMap := map[string]string{
		"pending":   "pending",
		"approved":  "paid",
		"rejected":  "failed",
		"cancelled": "cancelled",
		"refunded":  "cancelled",
	}
	if mapped, ok := statusMap[status]; ok {
		return mapped
	}
	return "pending"
}

// mapStripeStatus maps Stripe status to internal status
func (s *PaymentService) mapStripeStatus(status string) string {
	statusMap := map[string]string{
		"requires_payment_method": "pending",
		"requires_confirmation":    "pending",
		"requires_action":         "pending",
		"processing":              "pending",
		"succeeded":               "paid",
		"requires_capture":        "pending",
		"canceled":                "cancelled",
	}
	if mapped, ok := statusMap[status]; ok {
		return mapped
	}
	return "pending"
}
