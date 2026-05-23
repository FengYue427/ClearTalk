# ClearTalk 上市前地毯式清查报告

> 日期：2026-05-23 · 分支 `main`  
> 自动命令：`npm run launch:verify` · `npm run audit` · `npm run smoke:production`

---

## 总览

| 类别 | 结果 |
|------|------|
| 构建 / 单测 / launch:verify | ✅ 全绿 |
| 生产冒烟 smoke:production | ✅ 全绿 |
| 场景 EN 词典（451 键，0 CJK） | ✅ |
| scene-translations.en | ✅ 无汉字 |
| 发信（Resend） | ✅ |
| i18n UI 字典 zh/en | ✅ 已补齐缺口并加 API 错误映射 |
| 后端 API 错误语言 | ✅ 主要接口返回 `errorCode`；英文 UI 优先 `t(errorCode)`，保留中文兜底映射 |
| 法务页同步 | ✅ `legal-constants.js` + `npm run legal:sync` |

---

## 已修复（本次）

1. **i18n.js**：补齐 EN 缺失键（`input.*`、`history.item.*` 等）；ZH 补齐 `auth.error.*` 点号键  
2. **translateApiError**：英文模式下将常见后端中文错误映射为 EN UI 文案（`api-client.js`）  
3. **scripts/final-audit.mjs**：可重复运行的地毯式脚本 → `npm run audit`  
4. **生成结果页**：免责声明提示（前序 commit）  
5. **法务页**：Resend/第三方披露（前序 commit）

---

## 仍需关注（非阻塞内测）

| ID | 项 | 建议 |
|----|-----|------|
| P2-API | AI 分类/生成失败等动态 `error.message` 可能仍为中文 | 后续为 AI 路由增加 `error.ai_failed` 等键 |
| P2-LEG | 仓库根目录 `privacy-policy.html` 等旧副本 | 仅作归档；生产以 `public/` 为准 |
| P2-DIA | `dialogue.js` 用中文关键词判断回复情绪 | 仅影响对话模拟；可改多语言关键词 |
| P2-SC | 通用键 `scene.field.reason` EN 为 “Cancellation Reason” | 各场景优先用 `scene.field.{id}.reason`；请假场景显示正常 |
| P3 | `backend/.env` 本地文件 | 已在 `.gitignore`；勿提交 |
| P3 | Sentry / SQLite 备份 | 见 SOFT_LAUNCH_CHECKLIST |
| D表 | 法务律师审阅 | [`LEGAL_REVIEW.md`](LEGAL_REVIEW.md) |

---

## i18n 抽检清单（人工 10 分钟）

- [ ] 设置 → **English** → 首页 35 场景名为英文  
- [ ] 打开 `package_issue` → 字段/下拉/占位符无汉字  
- [ ] 生成结果页底部有 **For reference only** 免责声明  
- [ ] 验证码登录失败时 Toast 为英文（非中文 API 原文）  
- [ ] 注册页链接 → `privacy-en.html` / `terms-en.html`  
- [ ] 配额用尽提示为英文  

---

## 命令速查

```bash
npm run launch:verify    # 全量预检
npm run audit            # 本清查脚本
npm run scenes:build     # 场景 + EN 0 CJK 校验
npm run smoke:production # 生产 URL 抽检
npm run verify:production
```

---

## 签收建议

- **内测 / B 档**：当前可继续（P0 已覆盖）  
- **C 档正式上架**：完成 D 表法务 + 可选 Sentry + 7 天指标  

相关：[`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) · [`LEGAL_REVIEW.md`](LEGAL_REVIEW.md)
