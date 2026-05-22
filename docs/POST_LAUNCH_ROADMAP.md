# ClearTalk 上市后拓展与优化路线图

> 基线：S8c Vercel Ready（`985a2219`）+ S7 对齐计划见 [`PLAN_S7_LAUNCH_ALIGNMENT.md`](PLAN_S7_LAUNCH_ALIGNMENT.md)  
> 主站：Vite Web · API：Render · 场景：35

---

## 阶段 9：运营稳固（0–4 周）

| 优先级 | 任务 | 价值 | 工作量 |
|--------|------|------|--------|
| P0 | 配置生产 SMTP，关闭 API 模拟模式回传 `code`/`resetUrl` | 账号体系可真实使用 | 小 |
| P0 | 确认 Vercel 生产 URL 为 **35 场景 Vite 主站**（非其他项目占用域名） | 避免用户进错站 | 小 |
| P0 | Render API 部署 + `/health/ready` 200 | 登录/生成/配额/市场 | 中 |
| P1 | Sentry（前端 + API） | 5xx/JS 错误可见 | 小 |
| P1 | 自定义域名 + `ALLOWED_ORIGINS` / `VITE_API_URL` 统一 | 品牌与 CORS | 小 |
| P1 | SQLite 每日备份（Render disk 路径） | 防数据丢失 | 小 |
| P2 | `file://` 协议警告 i18n | 英文用户友好 | 极小 |
| P2 | CI 增加 `launch:verify` job | 防回归 | 小 |

---

## 阶段 10：体验与增长（1–2 月）

| 任务 | 说明 |
|------|------|
| 场景字段 100% 英文化 | ✅ 8d：`field-label-en.json` 451 条 + `scenes:build` EN 零 CJK 校验 |
| 静态法务页中英 | `web/` privacy/terms/disclaimer 双语或独立 `/en/` 路径 |
| 语气卡片 UI | 去掉 `substring(0,20)` 截断，改用完整 `tone.desc` 键 |
| 对话页内容区 | 小屏下验证固定底栏不遮挡最后一条消息 |
| 市场 UGC | 引导用户分享场景；运营位推荐模板 |
| 分析看板增强 | `admin.html` 增加 DAU、场景 TOP、反馈率 |
| 邮件模板双语 | 验证码/重置邮件 zh/en |
| Flutter 商店（可选） | 与 Web 功能 parity 表对照发布 |

---

## 阶段 11：商业化（有稳定 DAU）

| 任务 | 说明 |
|------|------|
| Stripe / 微信支付 | 对接 Pro 订阅，替换白名单 |
| 配额策略产品化 | 免费/Pro 档位、续费提醒 |
| 发票与退款政策 | 法务页补充 |
| Postgres / Turso | 替代单机 SQLite，多实例 API |

---

## 阶段 12：智能化（差异化）

| 任务 | 说明 |
|------|------|
| 粘贴分析多轮对话 | 基于分类结果追问 1–2 个澄清问题 |
| 场景推荐个性化 | 历史 + 反馈加权排序 |
| 多语言扩展 | ja/ko（复用 `scene-translations` 管线） |
| 企业版 | 团队账号、统一话术库、审计日志 |

---

## 技术债清偿顺序

1. 生产邮箱模拟回传验证码（安全/合规）  
2. 双前端宣传口径（仅 Vite 主站）  
3. `legacy` 本地模板 id 与场景 id 不一致（离线模式）  
4. E2E 纳入 CI（preview + Playwright）  
5. Flutter `history_page` 硬编码中文  

---

## 成功指标（首月建议）

| 指标 | 目标 |
|------|------|
| 生产可用性 | API `/health/ready` 7 天可用率 > 99% |
| 核心转化 | 访问 → 完成至少 1 次生成 > 15% |
| 反馈率 | 生成结果页反馈提交 > 5% |
| 错误率 | 5xx < 0.5%（有 Sentry 后统计） |
| 英文用户 | 设置切换 en 后关键路径无中文漏网 |
