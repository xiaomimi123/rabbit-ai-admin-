# Telegram 提现通知功能技术实施文档 - 第2部分

## 📋 继续实施

**前置条件**：已完成第1部分的所有步骤

**本部分内容**：
- 功能测试
- 生产环境部署
- 高级功能配置
- 故障排查

---

## 🧪 第四步：功能测试

### 4.1 测试 Bot 连接

**方法1：使用测试 API**

```bash
# 调用测试 API（需要 Admin API Key）
curl -X POST https://api.rabbitdifi.com/api/admin/test-telegram \
  -H "x-admin-api-key: 你的管理员API密钥"
```

**预期结果**：
- ✅ API 返回：`{ "ok": true, "success": true, "message": "测试通知发送成功" }`
- ✅ Telegram 收到消息：
  ```
  🤖 Telegram Bot 测试
  
  ✅ Bot 配置正确！
  ⏰ 当前时间: 2026-01-05 18:45:30
  
  您将通过此机器人接收提现申请通知。
  ```

**如果失败**：
- ❌ 检查 Bot Token 是否正确
- ❌ 检查 Chat ID 是否正确
- ❌ 确认已点击机器人的 START 按钮
- ❌ 检查服务器网络是否能访问 Telegram API

---

### 4.2 测试提现申请通知

**步骤**：
1. 打开用户前端（使用测试账户）
2. 进入"资产"页面
3. 点击"提现"
4. 输入金额：`0.1 USDT`（最小测试金额）
5. 点击"确认提现"

**预期结果**：
- ✅ 用户前端显示"提现申请已提交"
- ✅ Telegram 收到通知（< 2秒）：
  ```
  🔔 新的提现申请
  
  👤 用户地址: `0xd2d2...c760`
  💰 提现金额: 0.1 USDT
  ⚡ 消耗能量: 1
  🆔 申请ID: `85b15fd0`
  
  ⏰ 申请时间: 2026-01-05 18:50:15
  
  📊 操作:
  • 查看后台
  • 查看用户
  
  [🔍 查看详情] [✅ 立即审核]
  ```

**测试快捷按钮**：
- 点击 **"🔍 查看详情"**：应跳转到后台财务审核页面
- 点击 **"✅ 立即审核"**：应跳转到后台财务审核页面

---

### 4.3 测试提现完成通知

**步骤**：
1. 打开后台管理页面
2. 进入"财务审核"
3. 找到刚才的测试提现申请
4. 点击"完成提现"
5. 输入交易哈希（如果有）
6. 点击"确认完成"

**预期结果**：
- ✅ 后台显示"提现已完成"
- ✅ Telegram 收到完成通知：
  ```
  ✅ 提现已完成
  
  👤 用户地址: `0xd2d2...c760`
  💰 提现金额: 0.1 USDT
  🔗 交易哈希: `0x1234567890...abcdef12`
  🆔 申请ID: `85b15fd0`
  
  ⏰ 完成时间: 2026-01-05 18:55:20
  
  [📋 查看交易详情]
  ```

---

## 🚀 第五步：生产环境部署

### 5.1 检查清单

在部署到生产环境之前，确认：

- [ ] ✅ Bot Token 已正确配置
- [ ] ✅ Chat ID 已正确配置
- [ ] ✅ 已启用通知（`TELEGRAM_NOTIFICATIONS_ENABLED=true`）
- [ ] ✅ 本地测试通过
- [ ] ✅ 代码已提交到 Git
- [ ] ✅ 后端已重新编译

### 5.2 部署步骤

**如果使用 Render 或其他云平台**：

1. **推送代码到 Git**：
   ```bash
   cd rabbit-ai-backend
   git add .
   git commit -m "feat: 添加 Telegram 提现通知功能"
   git push
   ```

2. **在 Render 中配置环境变量**：
   - 登录 Render Dashboard
   - 找到 `rabbit-ai-backend` 服务
   - 进入 "Environment" 标签
   - 添加以下环境变量：
     - `TELEGRAM_BOT_TOKEN` = `你的Bot Token`
     - `TELEGRAM_ADMIN_CHAT_ID` = `你的Chat ID`
     - `TELEGRAM_NOTIFICATIONS_ENABLED` = `true`

3. **触发重新部署**：
   - Render 会自动检测代码变化并重新部署
   - 或手动点击 "Manual Deploy" → "Deploy latest commit"

4. **查看部署日志**：
   - 确认看到：`[Telegram Bot] ✅ 已初始化`

### 5.3 生产环境测试

**重复第四步的所有测试**，确认：
- ✅ 测试 API 正常工作
- ✅ 提现申请通知正常发送
- ✅ 提现完成通知正常发送

---

## 🎨 第六步：高级功能配置（可选）

### 6.1 自定义消息格式

**编辑 `rabbit-ai-backend/src/services/telegram.ts`**，修改消息模板：

```typescript
// 自定义提现申请通知
const message = `
🔥 *【紧急】新的提现申请*

┏━━━━━━━━━━━━━━━━
┃ 👤 *用户*: \`${shortAddress}\`
┃ 💰 *金额*: *${amount} USDT*
┃ ⚡ *能量*: ${energyCost}
┃ 🆔 *ID*: \`${withdrawalId.slice(0, 8)}\`
┃ ⏰ *时间*: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
┗━━━━━━━━━━━━━━━━

⚠️ *请尽快审核，避免用户等待*
  `.trim();
```

### 6.2 添加更多管理员

**支持多个管理员接收通知**：

1. **获取其他管理员的 Chat ID**（重复第一步 1.2）

2. **修改 `telegram.ts`**：
   ```typescript
   // 支持多个 Chat ID
   const adminChatIds = [
     config.telegram.adminChatId,
     '987654321', // 第二个管理员
     '123123123', // 第三个管理员
   ].filter(id => id); // 过滤空值

   // 发送消息时遍历所有管理员
   for (const chatId of adminChatIds) {
     try {
       await bot.sendMessage(chatId, message, {
         parse_mode: 'Markdown',
         reply_markup: keyboard,
       });
     } catch (error) {
       console.error(`[Telegram] 发送给 ${chatId} 失败:`, error);
     }
   }
   ```

### 6.3 添加通知统计

**记录通知发送情况**：

```typescript
// 在 telegram.ts 顶部添加统计变量
let notificationStats = {
  sent: 0,
  failed: 0,
  lastSent: null as Date | null,
};

// 在发送成功后更新统计
notificationStats.sent++;
notificationStats.lastSent = new Date();

// 在发送失败后更新统计
notificationStats.failed++;

// 导出统计数据
export function getNotificationStats() {
  return { ...notificationStats };
}
```

**添加统计 API**：

```typescript
// 在 admin.ts 中添加
app.get('/api/admin/telegram-stats', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!assertAdmin(req, reply)) return;
  
  const stats = getNotificationStats();
  return { ok: true, stats };
});
```

### 6.4 添加通知开关（动态控制）

**在后台管理页面添加开关**：

1. **添加设置 API**：
   ```typescript
   // 在 admin.ts 中添加
   app.post('/api/admin/telegram-toggle', async (req: FastifyRequest, reply: FastifyReply) => {
     if (!assertAdmin(req, reply)) return;
     
     const { enabled } = req.body as { enabled: boolean };
     
     // 更新环境变量或数据库配置
     config.telegram.enabled = enabled;
     
     return { ok: true, enabled };
   });
   ```

2. **在前端添加开关按钮**（`rabbit-ai-admin`）：
   ```tsx
   // 在设置页面添加
   <div>
     <label>Telegram 通知</label>
     <Switch 
       checked={telegramEnabled}
       onChange={(checked) => {
         fetch('/api/admin/telegram-toggle', {
           method: 'POST',
           headers: { 
             'Content-Type': 'application/json',
             'x-admin-api-key': API_KEY,
           },
           body: JSON.stringify({ enabled: checked }),
         });
         setTelegramEnabled(checked);
       }}
     />
   </div>
   ```

---

## 🐛 第七步：故障排查

### 7.1 常见问题

#### 问题1：没有收到通知

**可能原因**：
1. ❌ 没有点击机器人的 START 按钮
2. ❌ Bot Token 错误
3. ❌ Chat ID 错误
4. ❌ 通知未启用（`TELEGRAM_NOTIFICATIONS_ENABLED=false`）
5. ❌ 服务器无法访问 Telegram API

**解决方法**：
```bash
# 1. 检查配置
echo $TELEGRAM_BOT_TOKEN
echo $TELEGRAM_ADMIN_CHAT_ID
echo $TELEGRAM_NOTIFICATIONS_ENABLED

# 2. 测试网络连接
curl https://api.telegram.org/bot你的BotToken/getMe

# 3. 查看后端日志
pm2 logs rabbit-ai-backend --lines 100 | grep Telegram

# 4. 调用测试 API
curl -X POST https://api.rabbitdifi.com/api/admin/test-telegram \
  -H "x-admin-api-key: 你的密钥"
```

#### 问题2：通知延迟过高

**可能原因**：
- 服务器网络慢
- Telegram API 响应慢

**解决方法**：
```typescript
// 设置超时，避免阻塞提现流程
const sendWithTimeout = (promise: Promise<any>, timeout: number) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
};

// 在发送通知时使用
try {
  await sendWithTimeout(
    bot.sendMessage(...),
    3000 // 3秒超时
  );
} catch (error) {
  console.error('[Telegram] 通知超时或失败:', error);
}
```

#### 问题3：消息格式错误

**可能原因**：
- Markdown 语法错误
- 特殊字符未转义

**解决方法**：
```typescript
// 转义 Markdown 特殊字符
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// 使用时
const safeAddress = escapeMarkdown(address);
const message = `用户地址: \`${safeAddress}\``;
```

#### 问题4：机器人被封禁

**可能原因**：
- 发送频率过高
- 消息内容被判定为垃圾信息

**解决方法**：
```typescript
// 添加发送频率限制
let lastSentTime = 0;
const MIN_INTERVAL = 1000; // 最小间隔 1 秒

async function sendWithRateLimit(message: string) {
  const now = Date.now();
  const timeSinceLastSent = now - lastSentTime;
  
  if (timeSinceLastSent < MIN_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_INTERVAL - timeSinceLastSent)
    );
  }
  
  await bot.sendMessage(...);
  lastSentTime = Date.now();
}
```

### 7.2 调试技巧

**启用详细日志**：

```typescript
// 在 telegram.ts 顶部添加
const DEBUG = process.env.TELEGRAM_DEBUG === 'true';

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[Telegram Debug]', ...args);
  }
}

// 在关键位置添加日志
log('准备发送通知:', { address, amount, withdrawalId });
log('Bot 配置:', { 
  hasToken: !!config.telegram.botToken, 
  hasChatId: !!config.telegram.adminChatId 
});
```

**在 `.env` 中启用**：
```bash
TELEGRAM_DEBUG=true
```

---

## 📊 第八步：监控和维护

### 8.1 日志监控

**设置日志过滤**：
```bash
# 只查看 Telegram 相关日志
pm2 logs rabbit-ai-backend | grep Telegram

# 查看错误日志
pm2 logs rabbit-ai-backend --err | grep Telegram
```

### 8.2 性能监控

**记录发送耗时**：

```typescript
async function sendWithdrawalNotification(params) {
  const startTime = Date.now();
  
  try {
    await bot.sendMessage(...);
    const duration = Date.now() - startTime;
    console.log(`[Telegram] 通知发送耗时: ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Telegram] 通知失败 (耗时 ${duration}ms):`, error);
  }
}
```

### 8.3 定期测试

**设置定时任务**（可选）：

```typescript
// 每天发送一次健康检查通知
import cron from 'node-cron';

if (config.telegram.enabled) {
  cron.schedule('0 9 * * *', async () => {
    // 每天早上 9 点发送
    try {
      await bot.sendMessage(
        config.telegram.adminChatId,
        '✅ Telegram Bot 每日健康检查：运行正常'
      );
    } catch (error) {
      console.error('[Telegram] 健康检查失败:', error);
    }
  });
}
```

---

## 🎉 实施完成检查清单

### 必须完成 ✅

- [ ] ✅ 创建了 Telegram Bot
- [ ] ✅ 获得了 Bot Token 和 Chat ID
- [ ] ✅ 安装了依赖包
- [ ] ✅ 配置了环境变量
- [ ] ✅ 创建了 telegram.ts 服务
- [ ] ✅ 集成到提现申请流程
- [ ] ✅ 集成到提现完成流程
- [ ] ✅ 测试通知功能正常
- [ ] ✅ 部署到生产环境
- [ ] ✅ 生产环境测试通过

### 可选完成 ⚪

- [ ] ⚪ 添加了多个管理员
- [ ] ⚪ 自定义了消息格式
- [ ] ⚪ 添加了通知统计
- [ ] ⚪ 添加了动态开关
- [ ] ⚪ 配置了日志监控
- [ ] ⚪ 设置了定时健康检查

---

## 📚 相关文档

### Telegram Bot API 文档
- [官方文档](https://core.telegram.org/bots/api)
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)

### 项目内部文档
- [提现功能测试计划](./提现功能测试计划.md)
- [后端架构审查报告](./后端架构审查报告.md)

---

## 💰 成本分析

| 项目 | 费用 |
|------|------|
| Telegram Bot | **免费** ✅ |
| 消息发送 | **免费** ✅ |
| API 调用 | **无限制** ✅ |
| 维护成本 | **0 元** ✅ |

**总成本**：**0 元** 🎉

---

## 🚀 性能指标

| 指标 | 预期值 |
|------|--------|
| 通知延迟 | < 1 秒 |
| 消息到达率 | > 99.9% |
| API 响应时间 | < 100ms |
| 服务可用性 | > 99.99% |

---

## ⚠️ 注意事项

### 安全性

1. **保护 Bot Token**：
   - ❌ 不要泄露 Bot Token
   - ✅ 使用环境变量，不写在代码中
   - ✅ 不要提交到 Git

2. **保护 Chat ID**：
   - ❌ Chat ID 是敏感信息
   - ✅ 同样使用环境变量

3. **访问控制**：
   - ✅ 测试 API 需要 Admin API Key
   - ✅ 只有管理员能收到通知

### 隐私保护

1. **用户信息脱敏**：
   - ✅ 地址显示为 `0xd2d2...c760`（前6后4）
   - ✅ 不显示用户敏感信息

2. **通知内容审查**：
   - ✅ 只包含必要的业务信息
   - ✅ 不包含密码、私钥等敏感数据

---

## 🎯 后续优化方向

### 短期（1周内）

1. **添加更多通知类型**：
   - 用户注册通知
   - 大额转账通知
   - 异常登录通知

2. **优化消息格式**：
   - 添加 Emoji 美化
   - 优化按钮布局

### 中期（1个月内）

1. **添加交互功能**：
   - 直接在 Telegram 完成审核（点击按钮）
   - 查询用户信息（发送命令）

2. **添加统计报表**：
   - 每日提现统计
   - 每周数据汇总

### 长期（3个月内）

1. **多语言支持**：
   - 支持英文通知
   - 支持其他语言

2. **智能告警**：
   - 异常金额提醒
   - 频繁提现告警
   - 系统故障通知

---

## ✅ 实施完成

**恭喜！您已经完成了 Telegram 提现通知功能的全部实施。**

**现在您可以**：
1. ✅ 实时接收用户提现申请通知
2. ✅ 快速跳转到后台审核
3. ✅ 收到提现完成确认
4. ✅ 享受 0 成本的实时通知服务

**如有问题，请参考故障排查部分。**

---

**文档创建时间**：2026-01-05  
**预计总用时**：2-3 小时  
**实际难度**：⭐⭐⚪⚪⚪（简单）  
**推荐指数**：⭐⭐⭐⭐⭐（强烈推荐）

---

## 📞 技术支持

如需帮助，请查看：
1. Telegram Bot API 官方文档
2. 项目 GitHub Issues
3. 开发团队技术文档

**祝开发顺利！🚀**

