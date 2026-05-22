# E2E / CI 故障说明

## 典型错误

```
page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/
```

**含义**：Playwright 启动测试时，**预览服务器没在 4173 端口监听**。测试访问的是空地址，不是业务逻辑断言失败。

## ClearTalk（本仓库）

- 配置：`playwright.config.js` 的 `webServer` 会在跑测前执行 `npm run preview`（需先 `npm run build` 生成 `dist/`）。
- CI：`.github/workflows/ci.yml` 的 `e2e` job 已包含 `scenes:build` + `build` + `test -f dist/index.html`。
- 本地复现：

```bash
npm run scenes:build
npm run build
CI=true npm run test:e2e
```

本地 `5 passed` 即 CI 配置正确；若 GitHub 仍红，看 Actions 日志里 **webServer** 是否 `vite preview` 启动失败。

## 其它项目（如 ai-ide 截图）

若日志路径为 `ai-ide/e2e/helpers.ts` 且 **没有** `webServer` 或 CI **未先 build + preview**，需任选其一：

1. **推荐**：在 `playwright.config.ts` 增加与 ClearTalk 相同的 `webServer`（`vite preview --port 4173`）。
2. 或在 workflow 里显式启动：

```yaml
- run: npm run build
- run: npx vite preview --host 127.0.0.1 --port 4173 &
- run: npx wait-on http://127.0.0.1:4173
- run: npm run test:e2e
```

3. 确认 `gotoApp` / `baseURL` 端口与 preview 一致（4173 为 Vite 默认 preview 端口）。
