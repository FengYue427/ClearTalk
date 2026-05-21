# Vercel 部署修复说明

## 问题

构建日志出现 `flutter: command not found` / `flutter build web --release`，说明 **Vercel 项目设置里覆盖了构建命令**（或正在查看**旧部署**），与仓库主站 **Vite** 不一致。

### 若截图里是 `9b32c53` / “Flutter Web deployment ready”

这是 **修复前的历史失败记录**（Status 常为 Error · Stale），**不是**当前 `main` 上的代码。

| 提交 | 说明 |
|------|------|
| `9b32c53` | 旧：尝试 `flutter build web` → 失败 |
| `b0194a4b` 及之后 | 已改：`vercel.json` + `npm run vercel-build`（Vite → `dist`） |

请到 **Deployments** 列表顶部，找 **`b0194a4b` / `165a0a0e` / `e631417b`** 的部署：

- 若 **Ready**：点 **⋯ → Promote to Production**（提升为生产）
- 若仍跑 `flutter build`：按下方改 Dashboard，再 **Redeploy** 最新 `main`

## 正确配置（与 `vercel.json` 一致）

在 Vercel → Project **clear-talk** → **Settings** → **Build & Development Settings**：

| 项 | 值 |
|----|-----|
| Framework Preset | **Vite** |
| Root Directory | （留空，仓库根目录） |
| Build Command | `npm run vercel-build`（或勾选 “Use vercel.json”；**不要**填 `flutter build web`） |
| Output Directory | `dist` |
| Install Command | `npm ci && npm run scenes:build` |

**务必关闭** Dashboard 里对 Build Command 的自定义覆盖（不要填 `flutter build web`）。

## 环境变量

| 变量 | 值 |
|------|-----|
| `VITE_API_URL` | `https://cleartalk-api.onrender.com`（或你的 Render API 地址） |

## 重新部署

推送 `main` 后 Vercel 会自动构建；或在 Deployments → Redeploy。
