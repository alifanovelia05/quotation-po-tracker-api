package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"project1/models"
	"strings"
	"time"
)

type openRouterMessageContent struct {
	Type     string                 `json:"type"`
	Text     string                 `json:"text,omitempty"`
	ImageURL map[string]interface{} `json:"image_url,omitempty"`
}

type openRouterMessage struct {
	Role    string                     `json:"role"`
	Content []openRouterMessageContent `json:"content"`
}

type openRouterRequest struct {
	Model       string              `json:"model"`
	Messages    []openRouterMessage `json:"messages"`
	Temperature float32             `json:"temperature"`
}

type openRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func getAPIKey() string {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey != "" {
		return apiKey
	}

	content, err := os.ReadFile(".env")
	if err == nil {
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "OPENROUTER_API_KEY=") {
				return strings.Trim(strings.TrimPrefix(line, "OPENROUTER_API_KEY="), "\r\"' ")
			}
		}
	}
	return ""
}

func ExtractPOFromDocument(fileBytes []byte, mimeType string) (*models.POExtractionResponse, error) {
	apiKey := getAPIKey()
	if apiKey == "" {
		return nil, errors.New("OPENROUTER_API_KEY belum disetel di file .env")
	}

	base64Doc := base64.StdEncoding.EncodeToString(fileBytes)
	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, base64Doc)

	prompt := `Anda adalah asisten cerdas pemeriksa dokumen Purchase Order (PO). 
Tugas Anda mengekstrak informasi penting dari dokumen PO terlampir ke dalam format JSON yang valid.
Ekstrak kolom berikut:
1. "po_number": Nomor PO (contoh: 4212034242).
2. "po_date": Tanggal PO dalam format standar YYYY-MM-DD.
3. "client_company": Nama perusahaan pembeli/pembuat PO (contoh: PT. Amerta Indah Otsuka).
4. "sub_total": Nominal Sub Total / Sub Total + Charges angka float tanpa titik/koma.
5. "total_vat": Nominal pajak PPN / VAT / Total VAT (angka float). Periksa kolom "VAT (IDR)" atau baris "Total VAT". Jika Grand Total lebih besar dari Sub Total, maka total_vat adalah selisihnya (Grand Total - Sub Total).
6. "grand_total": Nominal total akhir / Grand Total (angka float).
7. "items": Daftar barang/jasa dalam PO, masing-masing berisi:
   - "item_name": Deskripsi/nama barang/pekerjaan
   - "qty": Jumlah angka bulat (int)
   - "unit": Satuan (contoh: AU, PCS, SET, UNIT)
   - "unit_price": Harga satuan angka float
   - "total_price": Total harga baris tersebut angka float

PENTING: Hanya balas dengan JSON murni tanpa tanda kutip markdown (jangan gunakan '''json ... '''). Langsung kurung kurawal { ... }.`

	reqBody := openRouterRequest{
		Model:       "google/gemini-2.5-flash-image",
		Temperature: 0.1,
		Messages: []openRouterMessage{
			{
				Role: "user",
				Content: []openRouterMessageContent{
					{
						Type: "text",
						Text: prompt,
					},
					{
						Type: "image_url",
						ImageURL: map[string]interface{}{
							"url": dataURL,
						},
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("gagal menyusun request JSON: %v", err)
	}

	httpReq, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("gagal membuat http request: %v", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("HTTP-Referer", "http://localhost:8080")
	httpReq.Header.Set("X-Title", "Argra Tracker PO AI")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gagal memanggil OpenRouter: %v", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openrouter error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var orResp openRouterResponse
	if err := json.Unmarshal(bodyBytes, &orResp); err != nil {
		return nil, fmt.Errorf("gagal membaca balasan OpenRouter: %v", err)
	}

	if len(orResp.Choices) == 0 {
		return nil, errors.New("tidak ada respon konten dari AI")
	}

	aiReply := strings.TrimSpace(orResp.Choices[0].Message.Content)
	aiReply = strings.TrimPrefix(aiReply, "```json")
	aiReply = strings.TrimPrefix(aiReply, "```")
	aiReply = strings.TrimSuffix(aiReply, "```")
	aiReply = strings.TrimSpace(aiReply)

	var extracted models.POExtractionResponse
	if err := json.Unmarshal([]byte(aiReply), &extracted); err != nil {
		return nil, fmt.Errorf("gagal mem-parsing teks AI ke struct PO: %v (Isi teks AI: %s)", err, aiReply)
	}

	if extracted.TotalVAT == 0 && extracted.GrandTotal > extracted.SubTotal {
		extracted.TotalVAT = extracted.GrandTotal - extracted.SubTotal
	}

	return &extracted, nil
}
