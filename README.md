# Elischedule

上海理工大学（USST）暖调纸感课程表与 AI 视觉课表解析应用。

## 核心特性

- **Claude 暖调纸感 + iA Writer 排版秩序**：日间羊皮纸米白（`#FAF9F5`）、夜间暖炭黑（`#1F1E1D`）、陶土橙（`#D97757`）实时时间线与低饱和莫兰迪矿物色卡；时间/周次/教室使用 `iA Writer Mono`，课程与教师信息使用 `iA Writer Quattro` + `PingFang SC`。
- **本地优先 + 物理弹簧动效**：课表数据同步持久化在本地 `localStorage`，冷启动秒开；基于 Framer Motion 实现共享元素展开、交错落格动画与左右拖拽切换周次。
- **Gemini Vision 教务截图解析**：Go 后端接入 Gemini Vision API，针对上理 1–12 节作息时间表、单双周、一格多课与教学楼简称（如 `第一教学楼204` → `一教 204`）进行结构化提取。

## 本地运行

### 1. 启动 Go 后端

```bash
cd backend
export GEMINI_API_KEY="your-gemini-api-key" # 可选：启用真实 AI 截图解析
go run ./cmd/server
```

默认监听 `http://localhost:8080`。

### 2. 启动前端（Web / PWA）

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认运行在 `http://localhost:5173`，并将 `/api` 代理至 Go 后端。

## 测试与构建

```bash
# Go 后端测试
cd backend && go test -v ./...

# 前端单元测试与生产构建
cd frontend && pnpm test && pnpm build
```
