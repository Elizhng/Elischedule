# Stage 1: Build PWA frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
RUN npm install -g pnpm@12
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# Stage 2: Build Go backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /elischedule-server ./cmd/server

# Stage 3: Minimal production runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai \
    PORT=8080 \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=backend-builder /elischedule-server /app/elischedule-server
COPY --from=frontend-builder /app/frontend/dist /app/public
EXPOSE 8080
CMD ["/app/elischedule-server"]
