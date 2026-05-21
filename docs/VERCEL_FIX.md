# Vercel 部署修复说明

## 问题

构建日志出现 `flutter: command not found` / `flutter build web --release`，说明 **Vercel 项目设置里覆盖了构建命令**（或旧版 GitHub Action），与仓库主站 **Vite** 不一致。

## 正确配置（与 `vercel.json` 一致）

在 Vercel → Project **clear-talk** → **Settings** → **Build & Development Settings**：

| 项 | 值 |
|----|-----|
| Framework Preset | **Vite** |
| Root Directory | （留空，仓库根目录） |
| Build Command | `npm run build`（或勾选 “Use vercel.json”） |
| Output Directory | `dist` |
| Install Command | `npm ci && npm run scenes:build` |

**务必关闭** Dashboard 里对 Build Command 的自定义覆盖（不要填 `flutter build web`）。

## 环境变量

| 变量 | 值 |
|------|-----|
| `VITE_API_URL` | `https://cleartalk-api.onrender.com`（或你的 Render API 地址） |

## 重新部署

推送 `main` 后 Vercel 会自动构建；或在 Deployments → Redeploy。
