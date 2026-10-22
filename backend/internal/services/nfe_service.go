package services

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"time"
)

type NFEService struct {
	apiURL   string
	apiToken string
	apiKey   string
}

type NFERequest struct {
	CustomerName    string
	CustomerCPF     string
	CustomerAddress Address
	Items           []NFEItem
	TotalAmount     float64
	OrderNumber     string
}

type Address struct {
	Street       string
	Number       string
	Complement   string
	Neighborhood string
	City         string
	State        string
	ZipCode      string
}

type NFEItem struct {
	Description string
	Quantity    float64
	UnitPrice   float64
	TotalPrice  float64
}

type NFEResponse struct {
	NFENumber string
	AccessKey string
	XML       string
	Status    string
	URL       string
}

type NFEStatus struct {
	Status    string
	NFENumber string
	AccessKey string
	XML       string
}

func NewNFEService(apiURL, apiToken, apiKey string) *NFEService {
	return &NFEService{
		apiURL:   apiURL,
		apiToken: apiToken,
		apiKey:   apiKey,
	}
}

// EmitNFE emits a NFe (Nota Fiscal Eletrônica)
func (s *NFEService) EmitNFE(req NFERequest) (*NFEResponse, error) {
	if s.apiURL == "" || s.apiToken == "" {
		return nil, fmt.Errorf("Serviço de NF-e não configurado")
	}

	// Build NFe payload (simplified - actual implementation depends on the API provider)
	payload := map[string]interface{}{
		"natureza_operacao": "VENDA",
		"data_emissao":      time.Now().Format("2006-01-02"),
		"destinatario": map[string]interface{}{
			"cpf":             req.CustomerCPF,
			"nome":            req.CustomerName,
			"logradouro":      req.CustomerAddress.Street,
			"numero":          req.CustomerAddress.Number,
			"complemento":     req.CustomerAddress.Complement,
			"bairro":          req.CustomerAddress.Neighborhood,
			"municipio":       req.CustomerAddress.City,
			"uf":              req.CustomerAddress.State,
			"cep":             req.CustomerAddress.ZipCode,
		},
		"items": req.Items,
		"total": req.TotalAmount,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", fmt.Sprintf("%s/v2/nfe", s.apiURL), bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiToken))
	httpReq.Header.Set("X-API-Key", s.apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("NF-e API error: %s", string(body))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	nfeNumber, _ := result["numero"].(string)
	accessKey, _ := result["chave_acesso"].(string)
	xmlData, _ := result["xml"].(string)
	status, _ := result["status"].(string)
	url, _ := result["url"].(string)

	return &NFEResponse{
		NFENumber: nfeNumber,
		AccessKey: accessKey,
		XML:       xmlData,
		Status:    status,
		URL:       url,
	}, nil
}

// GetNFEStatus gets the status of a NFe from SEFAZ
func (s *NFEService) GetNFEStatus(accessKey string) (*NFEStatus, error) {
	if s.apiURL == "" || s.apiToken == "" {
		return nil, fmt.Errorf("Serviço de NF-e não configurado")
	}

	url := fmt.Sprintf("%s/v2/nfe/%s", s.apiURL, accessKey)

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiToken))
	httpReq.Header.Set("X-API-Key", s.apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("NF-e API error: status %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	status, _ := result["status"].(string)
	nfeNumber, _ := result["numero"].(string)
	accessKeyResult, _ := result["chave_acesso"].(string)
	xmlData, _ := result["xml"].(string)

	return &NFEStatus{
		Status:    status,
		NFENumber: nfeNumber,
		AccessKey: accessKeyResult,
		XML:       xmlData,
	}, nil
}

// CancelNFE cancels a NFe
func (s *NFEService) CancelNFE(accessKey, reason string) error {
	if s.apiURL == "" || s.apiToken == "" {
		return fmt.Errorf("Serviço de NF-e não configurado")
	}

	url := fmt.Sprintf("%s/v2/nfe/%s/cancelar", s.apiURL, accessKey)

	payload := map[string]interface{}{
		"justificativa": reason,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiToken))
	httpReq.Header.Set("X-API-Key", s.apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("NF-e API error: %s", string(body))
	}

	return nil
}

// ParseNFEXML parses NFe XML (helper function)
func (s *NFEService) ParseNFEXML(xmlData string) (map[string]interface{}, error) {
	// This is a simplified parser - actual NFe XML is complex
	var nfe struct {
		XMLName xml.Name `xml:"NFe"`
		InfNFe  struct {
			ID string `xml:"Id,attr"`
		} `xml:"infNFe"`
	}

	if err := xml.Unmarshal([]byte(xmlData), &nfe); err != nil {
		return nil, err
	}

	result := make(map[string]interface{})
	result["access_key"] = nfe.InfNFe.ID

	return result, nil
}
