# ClearTalk 法务审阅指南（D 表）

> **用途**：供负责人或律师审阅隐私政策、用户协议、免责声明（中 + 英）。审阅通过后勾选 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) **D1–D3**。  
> **非法律意见**：本清单由产品/技术整理，不构成律师意见。

---

## 1. 审阅文档（生产链接）

| 文档 | 中文 | English |
|------|------|---------|
| 隐私政策 | https://clear-talk-five.vercel.app/privacy.html | https://clear-talk-five.vercel.app/privacy-en.html |
| 用户协议 | https://clear-talk-five.vercel.app/terms.html | https://clear-talk-five.vercel.app/terms-en.html |
| 免责声明 | https://clear-talk-five.vercel.app/disclaimer.html | https://clear-talk-five.vercel.app/disclaimer-en.html |

仓库源文件：`public/privacy.html`、`public/terms.html`、`public/disclaimer.html` 及对应 `*-en.html`。

---

## 2. D 表签收标准

| # | 检查项 | 审阅要点 | 通过 |
|---|--------|----------|------|
| D1 | 六份法务页已审阅 | 中英内容一致；联系邮箱、第三方、账号数据描述准确 | ☐ |
| D2 | 对外表述为「沟通辅助」 | 注册页、生成结果页、免责声明均非法律/医疗建议 | ☐ |
| D3 | 宣传仅 Vite Web 主站 | 内测文案/群公告不写 Flutter Web；主站 `clear-talk-five.vercel.app` | ☐ |

---

## 3. 律师/负责人必核事项

### 3.1 主体与联系

- [ ] **运营主体**：协议中的「服务提供者」是否与工商登记主体一致（个人/公司名、地址）
- [ ] **联系邮箱**：六份页面底部邮箱是否为正式客服/法务邮箱（当前暂定 `18562177928@163.com`，可改）
- [ ] **管辖法律**：用户协议 §7「中华人民共和国法律」与运营地是否匹配

### 3.2 数据处理（与产品一致）

- [ ] **本地 + 云端**：登录后 SQLite 同步、历史、反馈、埋点与隐私政策 §1.3 一致
- [ ] **AI 供应商**：DeepSeek（及可选 OpenAI/Qwen）已披露
- [ ] **邮件**：验证码经 **Resend** 发送（非 163 SMTP 直连）已披露
- [ ] **托管**：API Render、前端 Vercel 已披露
- [ ] **脱敏**：发往 AI 前敏感字段脱敏与代码行为一致
- [ ] **账号邮箱**：隐私政策「不收集」表述已限定为「除注册邮箱外」（避免与 §1.3 矛盾）

### 3.3 产品与风险表述

- [ ] **定位**：沟通文本草稿 / 辅助工具，非律师、非医生
- [ ] **医疗场景**：内置「医疗健康」类场景仅为沟通模板，免责声明已说明不替代诊疗
- [ ] **未成年人**：14 岁条款是否符合目标市场法规
- [ ] **付费/Pro**：若上线订阅，需在用户协议补充计费与退款条款

### 3.4 英文版

- [ ] 英文页为独立审阅（非机器直译即可上线）
- [ ] 英文用户协议 §6 管辖表述是否需改为更明确的司法辖区

---

## 4. 产品内展示（D2 抽检）

| 位置 | 预期表述 |
|------|----------|
| 注册页 | 链接隐私 / 协议 / 免责声明；英文模式打开 `*-en.html` |
| 场景生成结果页 | 底部「仅供参考，非法律或医疗建议」+ 免责声明链接 |
| 设置页 | 同上三链接 |

---

## 5. 审阅记录

| 项目 | 内容 |
|------|------|
| 审阅人 | |
| 审阅日期 | |
| 结论 | ☐ 通过可上线　☐ 需修改后复审 |
| 修改清单 | |

---

## 6. 修改后流程

1. 编辑 `public/*.html`（及必要时 `src/core/i18n.js` 产品文案）  
2. `npm run build` → 部署 Vercel  
3. 本表与 D 表勾选 → 更新 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md)

---

相关：[`BETA_INVITE_READY.txt`](BETA_INVITE_READY.txt) · [`POST_DEPLOY_DAY1.md`](POST_DEPLOY_DAY1.md)
