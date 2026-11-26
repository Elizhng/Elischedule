package gemini

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Elizhng/Elischedule/backend/internal/schedule"
)

const (
	DefaultBaseURL = "https://generativelanguage.googleapis.com"
	DefaultModel   = "gemini-3.8-flash"
)

var ErrMissingAPIKey = errors.New("GEMINI_API_KEY is not configured")

// ImageInput represents a single uploaded timetable screenshot.
type ImageInput struct {
	MIMEType string
	Data     []byte
}

// Client invokes the Gemini Vision REST API for USST timetable extraction.
type Client struct {
	APIKey     string
	Model      string
	BaseURL    string
	HTTPClient *http.Client
}

// NewClient constructs a Gemini API client with sensible defaults.
func NewClient(apiKey, model string) *Client {
	if strings.TrimSpace(model) == "" {
		model = DefaultModel
	}
	return &Client{
		APIKey:  strings.TrimSpace(apiKey),
		Model:   strings.TrimSpace(model),
		BaseURL: DefaultBaseURL,
		HTTPClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

const usstSystemPrompt = `你是一位专门解析上海理工大学（USST）正方教务系统 / 新教务系统课程表截图的精确结构化提取引擎。

上海理工大学标准作息时间表：
- 第1-2节: 08:00 - 09:35
- 第3-4节: 09:55 - 11:30
- 第5-6节: 13:30 - 15:05
- 第7-8节: 15:20 - 16:55
- 第9-10节: 18:30 - 20:05
- 第11-12节: 20:15 - 21:50

提取规则：
1. 仔细识别课表中的星期列（周一=1 ... 周日=7）与纵轴节次（1..12）。
2. 如果同一个时间格内包含多门课程（例如单周 A 课、双周 B 课，或 1-8 周与 9-16 周不同课程），必须拆分为多条独立的课程记录。
3. 解析周次范围（如 "[1-16周]"、"1-15周(单)"、"2-16周(双)"、"1,3,5-9周"），输出完整的整数数组 weeks，以及 weekType（"all" / "odd" / "even"）与原始 weeksText。
4. 教学楼教室尽量保留完整原始信息于 rawLocation，同时可在 location 中给出简明名称（如 "一教 204"、"光电 305"）。
5. 严格只输出合法的 JSON 对象，不要包含任何额外的解释或 Markdown 代码块，格式如下：
{
  "term": "2026-2027-1",
  "courses": [
    {
      "name": "高等数学A(上)",
      "teacher": "张明远",
      "location": "一教 204",
      "rawLocation": "第一教学楼204",
      "dayOfWeek": 1,
      "startPeriod": 1,
      "endPeriod": 2,
      "weeks": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      "weeksText": "1-16周",
      "weekType": "all",
      "notes": ""
    }
  ],
  "warnings": []
}`

type generateContentRequest struct {
	SystemInstruction *contentPart      `json:"system_instruction,omitempty"`
	Contents          []contentPart     `json:"contents"`
	GenerationConfig  *generationConfig `json:"generationConfig,omitempty"`
}

type contentPart struct {
	Parts []part `json:"parts"`
}

type part struct {
	Text       string      `json:"text,omitempty"`
	InlineData *inlineData `json:"inline_data,omitempty"`
}

type inlineData struct {
	MIMEType string `json:"mime_type"`
	Data     string `json:"data"`
}

type generationConfig struct {
	Temperature      float64 `json:"temperature"`
	ResponseMimeType string  `json:"responseMimeType"`
}

type generateContentResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error,omitempty"`
}

// ParseSchedule sends one or more timetable screenshots to Gemini Vision and returns normalized courses.
func (c *Client) ParseSchedule(ctx context.Context, images []ImageInput) (*schedule.ParseResponse, error) {
	if c.APIKey == "" {
		return nil, ErrMissingAPIKey
	}
	if len(images) == 0 {
		return nil, errors.New("at least one image is required")
	}

	parts := make([]part, 0, len(images)+1)
	parts = append(parts, part{
		Text: "请提取以下上海理工大学教务系统课程表截图中的所有课程，严格按照 JSON 结构输出。",
	})
	for _, img := range images {
		parts = append(parts, part{
			InlineData: &inlineData{
				MIMEType: img.MIMEType,
				Data:     base64.StdEncoding.EncodeToString(img.Data),
			},
		})
	}

	reqBody := generateContentRequest{
		SystemInstruction: &contentPart{
			Parts: []part{{Text: usstSystemPrompt}},
		},
		Contents: []contentPart{{Parts: parts}},
		GenerationConfig: &generationConfig{
			Temperature:      0.1,
			ResponseMimeType: "application/json",
		},
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal gemini request: %w", err)
	}

	baseURL := strings.TrimRight(c.BaseURL, "/")
	endpoint := fmt.Sprintf("%s/v1beta/models/%s:generateContent", baseURL, c.Model)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("create gemini request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", c.APIKey)

	httpClient := c.HTTPClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call gemini api: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, fmt.Errorf("read gemini response: %w", err)
	}

	var apiResp generateContentResponse
	if err := json.Unmarshal(bodyBytes, &apiResp); err != nil {
		return nil, fmt.Errorf("decode gemini response (status %d): %w", resp.StatusCode, err)
	}
	if apiResp.Error != nil {
		return nil, fmt.Errorf("gemini api error (%d %s): %s", apiResp.Error.Code, apiResp.Error.Status, apiResp.Error.Message)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("gemini api returned HTTP %d", resp.StatusCode)
	}
	if len(apiResp.Candidates) == 0 || len(apiResp.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("gemini returned empty candidates")
	}

	rawJSON := cleanJSONFence(apiResp.Candidates[0].Content.Parts[0].Text)
	var parsed schedule.ParseResponse
	if err := json.Unmarshal([]byte(rawJSON), &parsed); err != nil {
		return nil, fmt.Errorf("parse structured schedule JSON: %w", err)
	}

	parsed.Courses = schedule.NormalizeCourses(parsed.Courses)
	return &parsed, nil
}

func cleanJSONFence(s string) string {
	trimmed := strings.TrimSpace(s)
	if strings.HasPrefix(trimmed, "```") {
		if idx := strings.Index(trimmed, "\n"); idx != -1 {
			trimmed = trimmed[idx+1:]
		}
		trimmed = strings.TrimSuffix(trimmed, "```")
	}
	return strings.TrimSpace(trimmed)
}
