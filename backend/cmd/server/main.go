package main

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/Elizhng/Elischedule/backend/internal/gemini"
)

const (
	maxUploadMemory = 32 << 20 // 32 MB total
	maxSingleFile   = 15 << 20 // 15 MB per screenshot
)

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	client := gemini.NewClient(os.Getenv("GEMINI_API_KEY"), os.Getenv("GEMINI_MODEL"))

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":      "ok",
			"model":       client.Model,
			"geminiReady": client.APIKey != "",
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	mux.HandleFunc("POST /api/parse-schedule", handleParseSchedule(client))

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("Elischedule Go backend listening on :%s (model=%s, geminiReady=%v)", port, client.Model, client.APIKey != "")
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server failed: %v", err)
	}
}

func handleParseSchedule(client *gemini.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(maxUploadMemory); err != nil {
			writeJSON(w, http.StatusBadRequest, apiError{
				Code:    "INVALID_MULTIPART",
				Message: "请上传有效的课程表图片文件（multipart/form-data）。",
			})
			return
		}

		var images []gemini.ImageInput
		fieldNames := []string{"images", "image", "file"}
		for _, field := range fieldNames {
			headers := r.MultipartForm.File[field]
			for _, fh := range headers {
				if fh.Size > maxSingleFile {
					writeJSON(w, http.StatusRequestEntityTooLarge, apiError{
						Code:    "FILE_TOO_LARGE",
						Message: "单张截图不能超过 15MB。",
					})
					return
				}
				f, err := fh.Open()
				if err != nil {
					writeJSON(w, http.StatusBadRequest, apiError{
						Code:    "FILE_OPEN_FAILED",
						Message: "无法读取上传的图片文件。",
					})
					return
				}
				data, readErr := io.ReadAll(io.LimitReader(f, maxSingleFile+1))
				_ = f.Close()
				if readErr != nil {
					writeJSON(w, http.StatusBadRequest, apiError{
						Code:    "FILE_READ_FAILED",
						Message: "读取图片数据失败。",
					})
					return
				}

				mimeType := fh.Header.Get("Content-Type")
				if mimeType == "" || mimeType == "application/octet-stream" {
					mimeType = http.DetectContentType(data)
				}
				if !strings.HasPrefix(mimeType, "image/") {
					writeJSON(w, http.StatusBadRequest, apiError{
						Code:    "UNSUPPORTED_MEDIA_TYPE",
						Message: "仅支持 PNG、JPEG、WebP 或 HEIC 格式的课表截图。",
					})
					return
				}
				images = append(images, gemini.ImageInput{
					MIMEType: mimeType,
					Data:     data,
				})
			}
		}

		if len(images) == 0 {
			writeJSON(w, http.StatusBadRequest, apiError{
				Code:    "NO_IMAGES",
				Message: "请至少选择一张教务系统课表截图。",
			})
			return
		}

		res, err := client.ParseSchedule(r.Context(), images)
		if err != nil {
			if errors.Is(err, gemini.ErrMissingAPIKey) {
				writeJSON(w, http.StatusServiceUnavailable, apiError{
					Code:    "MISSING_API_KEY",
					Message: "后端尚未配置 GEMINI_API_KEY 环境变量，请配置后重启 Go 服务以启用 Gemini 视觉解析。",
				})
				return
			}
			log.Printf("parse schedule error: %v", err)
			writeJSON(w, http.StatusBadGateway, apiError{
				Code:    "GEMINI_PARSE_FAILED",
				Message: "Gemini 视觉解析失败：" + err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, res)
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
