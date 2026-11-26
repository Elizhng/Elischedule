# Elischedule

上海理工大学（USST）哑光纸感课程表与 AI 视觉课表解析应用（Web / 离线 PWA + Go 后端）。

## 核心特性

- **Geist | Anthropic 哑光物理纸感设计**：日间 `Ivory Light #FAFAF7` / `Ivory Medium #F0F0EB`、夜间 `Slate Dark #191919` / `Slate Medium #262625`、`Book Cloth #CC785C` 强调色；断线圆角线性图标、`160ms–195ms` 零回弹卡纸动效；离线打包 `Source Serif 4` + `iA Writer Mono` + `iA Writer Quattro`。
- **移动端竖屏 + 离线 PWA**：手机竖屏自动切换「今日日程」视图与底部扁平导航栏，内置 Service Worker 离线缓存，添加到 iPhone 主屏幕后飞行模式亦可秒开。
- **每日实用功能**：点击空白节次格或 `+` 手动新建课程、设置学期开学第一周周一自动推算周次与真实日期、一键导出 `.ics` 日历（含课前 15 分钟系统提醒）。
- **Gemini Vision 教务截图解析**：Go 后端接入 Gemini Vision API，针对上理 1–12 节作息时间表、一格多课、单双周与教学楼简称（如 `第一教学楼204` → `一教 204`）进行结构化提取。

## 一键部署上线（推荐）

仓库根目录已提供多阶段 `Dockerfile`（单容器同时运行 Go 后端与离线 PWA 前端，零跨域配置）以及 `render.yaml`：

### 方式 A：Render（免费 HTTPS，支持 Blueprint）
1. 登录 [Render](https://render.com) → **New +** → **Blueprint**，关联你的 `Elizhng/Elischedule` 仓库。
2. 在环境变量中填入 `GEMINI_API_KEY`（可选，未填时除截图 AI 解析外其余功能均可正常使用）。
3. 部署完成后获得 `https://<your-app>.onrender.com`，用 **iPhone Safari** 打开 → 点击底部「分享」→「添加到主屏幕」即可作为离线 App 使用。

### 方式 B：Railway / Fly.io / 自建 Docker
```bash
docker build -t elischedule .
docker run -p 8080:8080 -e GEMINI_API_KEY="your-key" elischedule
```

## 本地开发

```bash
# 1. 启动 Go 后端（默认 :8080；若已构建 frontend/dist，Go 也会直接托管前端）
cd backend
export GEMINI_API_KEY="your-gemini-api-key"
go run ./cmd/server

# 2. 启动前端开发服务（默认 :5173，自动代理 /api 到 :8080）
cd frontend
pnpm install
pnpm dev
```

## 测试与构建

```bash
cd backend && go test -v ./...
cd frontend && pnpm test && pnpm build
```
