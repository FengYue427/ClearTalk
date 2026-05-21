# 遗留 Web 版本（已归档）

此目录为重构前的单体 Web 应用，仅供参考或紧急回退：

- `app.js` — 原 5000+ 行单体逻辑
- `index.html` / `styles.css` / `sw.js`

**当前推荐使用** 根目录 `npm run dev`（Vite + `src/`）。

场景数据已提取至 `assets/scenes/builtin.json`，由 `npm run scenes:build` 同步到 `src/scenes/builtin-data.js`。
