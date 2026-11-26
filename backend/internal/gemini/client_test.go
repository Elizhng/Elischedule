package gemini

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientParseSchedule(t *testing.T) {
	mockPayload := `{
		"term": "2026-2027-1",
		"courses": [
			{
				"name": "大学物理B",
				"teacher": "李清照",
				"location": "第二教学楼305",
				"dayOfWeek": 2,
				"startPeriod": 3,
				"endPeriod": 4,
				"weeksText": "2-16周(双)"
			}
		]
	}`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-goog-api-key") != "test-key" {
			t.Errorf("unexpected api key header: %q", r.Header.Get("x-goog-api-key"))
		}
		resp := map[string]any{
			"candidates": []map[string]any{
				{
					"content": map[string]any{
						"parts": []map[string]any{
							{"text": "```json\n" + mockPayload + "\n```"},
						},
					},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	client := NewClient("test-key", "gemini-2.5-flash")
	client.BaseURL = srv.URL

	res, err := client.ParseSchedule(context.Background(), []ImageInput{
		{MIMEType: "image/png", Data: []byte("fake-png-bytes")},
	})
	if err != nil {
		t.Fatalf("ParseSchedule returned error: %v", err)
	}
	if res.Term != "2026-2027-1" {
		t.Errorf("term = %q, want 2026-2027-1", res.Term)
	}
	if len(res.Courses) != 1 {
		t.Fatalf("expected 1 course, got %d", len(res.Courses))
	}
	c := res.Courses[0]
	if c.Location != "二教 305" {
		t.Errorf("location = %q, want 二教 305", c.Location)
	}
	if c.WeekType != "even" {
		t.Errorf("weekType = %q, want even", c.WeekType)
	}
	if len(c.Weeks) != 8 {
		t.Errorf("len(weeks) = %d, want 8", len(c.Weeks))
	}
}
