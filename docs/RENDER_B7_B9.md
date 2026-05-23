# Render 运维：B7 持久化 + B9 运营看板

> 对应 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) **B7**、**B9**。在 [Render Dashboard](https://dashboard.render.com) 完成。

---

## B7 — SQLite 不丢数据

### 检查清单

1. 打开服务 **cleartalk-api** → **Disks**
2. 确认已有 Disk（`render.yaml` 模板：`cleartalk-data`，挂载 `/opt/render/project/src/data`）
3. **Environment** 中 `SQLITE_PATH` = `/opt/render/project/src/data/cleartalk.db`（与 `render.yaml` 一致）
4. 部署后 SSH/Shell（若可用）或看日志：启动时应写入该路径，而非容器临时目录

### 验证

```bash
curl -s https://cleartalk-cu84.onrender.com/health/ready | jq .
```

注册一个测试账号 → 触发 **Manual Deploy** 或重启服务 → 再次登录，历史/账号应仍在。

### 备份（建议每周）

Render Shell 或本机：

```bash
# 从 Disk 路径复制（需在 Render 环境内执行）
cp /opt/render/project/src/data/cleartalk.db ./cleartalk-backup-$(date +%F).db
```

---

## B9 — 反馈/埋点运营看板

### 1. 设置密钥

Render → **Environment** → 新增：

| Key | 说明 |
|-----|------|
| `FEEDBACK_ADMIN_KEY` | 随机长字符串（勿提交 Git） |

保存后等待自动重新部署。

### 2. 打开看板

浏览器访问（生产）：

**https://clear-talk-five.vercel.app/admin.html**

1. **API Base URL**：留空（同源经 Vercel 代理）或填 `https://cleartalk-cu84.onrender.com`
2. **Admin Key**：粘贴 `FEEDBACK_ADMIN_KEY`
3. 点击 **加载统计**

应看到反馈统计与近 7 天埋点；403 表示 Key 错误或环境未配置。

### 3. 勾选签收

在 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) 将 **B7**、**B9** 标为 ☑。

---

相关：[`POST_DEPLOY_DAY1.md`](POST_DEPLOY_DAY1.md) · [`EMAIL_RESEND_RENDER.md`](EMAIL_RESEND_RENDER.md)
