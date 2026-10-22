package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type WhatsAppService struct {
	apiURL   string
	apiToken string
	phoneID  string
}

type WhatsAppMessage struct {
	To      string `json:"to"`
	Message string `json:"message"`
	Type    string `json:"type"` // text, template
}

type WhatsAppResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

func NewWhatsAppService(apiURL, apiToken, phoneID string) *WhatsAppService {
	return &WhatsAppService{
		apiURL:   apiURL,
		apiToken: apiToken,
		phoneID:  phoneID,
	}
}

// SendMessage sends a text message via WhatsApp Business API
func (s *WhatsAppService) SendMessage(to, message string) error {
	if s.apiURL == "" || s.apiToken == "" {
		return fmt.Errorf("WhatsApp não configurado")
	}

	url := fmt.Sprintf("%s/%s/messages", s.apiURL, s.phoneID)
	
	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                to,
		"type":              "text",
		"text": map[string]string{
			"body": message,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiToken))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("WhatsApp API error: %s", string(body))
	}

	return nil
}

// SendServiceOrderStatus sends a service order status update message
func (s *WhatsAppService) SendServiceOrderStatus(to, orderNumber, status, customerName string) error {
	statusLabels := map[string]string{
		"pending":      "Aguardando Avaliação",
		"evaluating":   "Em Avaliação",
		"approved":     "Aprovado",
		"waiting_parts": "Aguardando Peças",
		"in_repair":    "Em Reparo",
		"testing":      "Em Teste",
		"ready":        "Pronto para Retirada",
		"delivered":    "Entregue",
		"cancelled":    "Cancelado",
	}

	statusLabel := statusLabels[status]
	if statusLabel == "" {
		statusLabel = status
	}

	message := fmt.Sprintf(
		"Olá %s!\n\n"+
			"Atualização da sua Ordem de Serviço:\n"+
			"📋 OS: %s\n"+
			"📊 Status: %s\n\n"+
			"Acompanhe o status em tempo real através do nosso sistema.",
		customerName,
		orderNumber,
		statusLabel,
	)

	return s.SendMessage(to, message)
}

// SendDeliveryNotification sends a delivery notification
func (s *WhatsAppService) SendDeliveryNotification(to, orderNumber, customerName string) error {
	message := fmt.Sprintf(
		"Olá %s!\n\n"+
			"🎉 Sua Ordem de Serviço está pronta!\n\n"+
			"📋 OS: %s\n"+
			"✅ Status: Pronto para Retirada\n\n"+
			"Você já pode retirar seu equipamento em nossa loja.",
		customerName,
		orderNumber,
	)

	return s.SendMessage(to, message)
}

// SendWarrantyTerms sends warranty terms to customer
func (s *WhatsAppService) SendWarrantyTerms(to, orderNumber, warrantyTerms string) error {
	message := fmt.Sprintf(
		"📋 Ordem de Serviço: %s\n\n"+
			"📜 Termos de Garantia:\n\n%s",
		orderNumber,
		warrantyTerms,
	)

	return s.SendMessage(to, message)
}
