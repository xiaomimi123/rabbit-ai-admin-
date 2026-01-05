# Telegram 提现通知功能技术实施文档 - 第1部分

## 📋 文档概述

**功能名称**：Telegram Bot 提现申请实时通知  
**实施时间**：2026-01-05  
**预计开发时间**：2-3 小时  
**总成本**：0 元（完全免费）

---

## 🎯 功能目标

当用户在前端申请提现时，管理员能够：
1. ✅ **实时收到通知**（< 1秒延迟）
2. ✅ **查看提现详情**（用户地址、金额、能量消耗）
3. ✅ **快速跳转审核**（点击按钮直达后台）
4. ✅ **收到完成通知**（提现完成后自动通知）

---

## 📐 系统架构

```
┌─────────────────┐
│   用户前端      │
│  (提现申请)     │
└────────┬────────┘
         │ POST /api/withdraw
         ▼
┌─────────────────────────────────┐
│      后端 API                    │
│  rabbit-ai-backend              │
│                                  │
│  1. ✅ 验证用户余额              │
│  2. ✅ 创建提现记录 (Pending)    │
│  3. ✨ 发送 Telegram 通知        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Telegram Bot API              │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   管理员 Telegram 客户端        │
│                                  │
│  🔔 新提现申请！                │
│  👤 0xd2d2...c760               │
│  💰 2 USDT                       │
│  ⚡ 20 能量                      │
│                                  │
│  [🔍 查看详情] [✅ 立即审核]    │
└──────────────────────────────────┘
```

---

## 🚀 第一步：创建 Telegram Bot

### 1.1 与 BotFather 对话

1. **打开 Telegram**，搜索 `@BotFather`

2. **发送命令创建机器人**：
   ```
   /newbot
   ```

3. **设置机器人名称**（显示名称，可以包含中文）：
   ```
   RabbitDiFi 管理通知机器人
   ```

4. **设置机器人用户名**（必须以 `bot` 结尾，只能英文）：
   ```
   rabbitdifi_admin_bot
   ```

5. **保存 Bot Token**（⚠️ 重要，后面要用）：
   ```
   示例：123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567
   ```

### 1.2 获取管理员 Chat ID

1. **搜索机器人** `@userinfobot`

2. **发送任意消息**

3. **获得你的 Chat ID**（⚠️ 保存下来）：
   ```
   示例：123456789
   ```

### 1.3 启动机器人

1. **在 Telegram 搜索你的机器人**：`@rabbitdifi_admin_bot`

2. **点击 START**（必须先点击，否则机器人无法给你发消息）

---

## 💻 第二步：后端代码实现

### 2.1 安装依赖包

```bash
cd rabbit-ai-backend
npm install node-telegram-bot-api
npm install @types/node-telegram-bot-api --save-dev
```

### 2.2 配置环境变量

**编辑 `rabbit-ai-backend/.env`**，添加以下配置：

```bash
# Telegram Bot 配置
TELEGRAM_BOT_TOKEN=你的Bot Token（第一步获取）
TELEGRAM_ADMIN_CHAT_ID=你的Chat ID（第一步获取）
TELEGRAM_NOTIFICATIONS_ENABLED=true
```

**示例**：
```bash
# Telegram Bot 配置
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567
TELEGRAM_ADMIN_CHAT_ID=123456789
TELEGRAM_NOTIFICATIONS_ENABLED=true
```

### 2.3 更新配置文件

**编辑 `rabbit-ai-backend/src/config.ts`**，在 `config` 对象中添加：

```typescript
// 在文件末尾，config 对象中添加
export const config = {
  // ... 现有配置保持不变 ...
  
  // 🟢 新增：Telegram 通知配置
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
    enabled: process.env.TELEGRAM_NOTIFICATIONS_ENABLED === 'true',
  },
};
```

### 2.4 创建 Telegram 服务文件

**创建新文件 `rabbit-ai-backend/src/services/telegram.ts`**：

```typescript
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';

// 创建 Telegram Bot 实例（仅在启用时）
let bot: TelegramBot | null = null;

if (config.telegram.enabled && config.telegram.botToken) {
  bot = new TelegramBot(config.telegram.botToken, { polling: false });
  console.log('[Telegram Bot] ✅ 已初始化');
} else {
  console.log('[Telegram Bot] ⚠️ 未启用或配置不完整');
}

/**
 * 发送提现申请通知
 */
export async function sendWithdrawalNotification(params: {
  address: string;
  amount: string;
  energyCost: number;
  withdrawalId: string;
}) {
  if (!bot || !config.telegram.enabled) {
    console.log('[Telegram] 通知功能未启用，跳过发送');
    return;
  }

  const { address, amount, energyCost, withdrawalId } = params;

  // 格式化地址（显示前 6 位和后 4 位）
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  // 构造消息
  const message = `
🔔 *新的提现申请*

👤 *用户地址*: \`${shortAddress}\`
💰 *提现金额*: *${amount} USDT*
⚡ *消耗能量*: ${energyCost}
🆔 *申请ID*: \`${withdrawalId.slice(0, 8)}\`

⏰ *申请时间*: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

📊 *操作*:
• [查看后台](https://admin.rabbitdifi.com/#/finance)
• [查看用户](https://admin.rabbitdifi.com/#/users?address=${address})
  `.trim();

  // 添加快捷按钮
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🔍 查看详情',
          url: `https://admin.rabbitdifi.com/#/finance`,
        },
        {
          text: '✅ 立即审核',
          url: `https://admin.rabbitdifi.com/#/finance`,
        },
      ],
    ],
  };

  try {
    await bot.sendMessage(config.telegram.adminChatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
    console.log(`[Telegram] ✅ 提现通知已发送: ${withdrawalId}`);
  } catch (error) {
    console.error('[Telegram] ❌ 发送通知失败:', error);
    // 不抛出错误，避免影响提现流程
  }
}

/**
 * 发送提现完成通知
 */
export async function sendWithdrawalCompletedNotification(params: {
  address: string;
  amount: string;
  txHash: string;
  withdrawalId: string;
}) {
  if (!bot || !config.telegram.enabled) {
    return;
  }

  const { address, amount, txHash, withdrawalId } = params;
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const shortTxHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;

  const message = `
✅ *提现已完成*

👤 *用户地址*: \`${shortAddress}\`
💰 *提现金额*: *${amount} USDT*
🔗 *交易哈希*: \`${shortTxHash}\`
🆔 *申请ID*: \`${withdrawalId.slice(0, 8)}\`

⏰ *完成时间*: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

[📋 查看交易详情](https://bscscan.com/tx/${txHash})
  `.trim();

  try {
    await bot.sendMessage(config.telegram.adminChatId, message, {
      parse_mode: 'Markdown',
    });
    console.log(`[Telegram] ✅ 提现完成通知已发送: ${withdrawalId}`);
  } catch (error) {
    console.error('[Telegram] ❌ 发送完成通知失败:', error);
  }
}

/**
 * 发送测试通知
 */
export async function sendTestNotification() {
  if (!bot || !config.telegram.enabled) {
    throw new Error('Telegram Bot 未启用或配置不完整');
  }

  const message = `
🤖 *Telegram Bot 测试*

✅ Bot 配置正确！
⏰ 当前时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

您将通过此机器人接收提现申请通知。
  `.trim();

  try {
    await bot.sendMessage(config.telegram.adminChatId, message, {
      parse_mode: 'Markdown',
    });
    console.log('[Telegram] ✅ 测试通知已发送');
    return { success: true, message: '测试通知发送成功' };
  } catch (error) {
    console.error('[Telegram] ❌ 发送测试通知失败:', error);
    throw error;
  }
}
```

### 2.5 集成到提现流程

**编辑 `rabbit-ai-backend/src/services/withdraw.ts`**：

在文件顶部添加导入：

```typescript
// 在文件顶部添加
import { sendWithdrawalNotification } from './telegram.js';
```

在 `applyWithdraw` 函数中，找到创建提现记录的部分（约在第 140-150 行），添加通知逻辑：

```typescript
// 创建提现记录
const { data: withdrawal, error: insertErr } = await supabase
  .from('withdrawals')
  .insert({
    address: addr,
    amount: amountStr,
    energy_cost: requiredEnergy,
    status: 'Pending',
    created_at: nowIso,
  })
  .select()
  .single();

if (insertErr || !withdrawal) {
  throw new ApiError('INSERT_FAILED', insertErr?.message || 'Failed to create withdrawal');
}

// 🟢 新增：发送 Telegram 通知
try {
  await sendWithdrawalNotification({
    address: addr,
    amount: amountStr,
    energyCost: requiredEnergy,
    withdrawalId: withdrawal.id,
  });
} catch (notificationError) {
  // 通知失败不影响提现流程
  console.error('[Withdraw] Telegram 通知发送失败:', notificationError);
}

return {
  ok: true,
  message: 'Withdrawal request submitted',
  withdrawalId: withdrawal.id,
};
```

### 2.6 集成到提现完成流程

**编辑 `rabbit-ai-backend/src/services/admin.ts`**：

在文件顶部添加导入：

```typescript
// 在文件顶部添加
import { sendWithdrawalCompletedNotification } from './telegram.js';
```

找到 `completeWithdrawal` 函数（约在第 330-366 行），在更新提现记录状态之后添加通知逻辑：

```typescript
// 更新提现记录状态
await supabase
  .from('withdrawals')
  .update({
    status: 'Completed',
    payout_tx_hash: params.payoutTxHash,
    updated_at: new Date().toISOString(),
  })
  .eq('id', params.withdrawalId);

// 🟢 新增：发送完成通知
try {
  await sendWithdrawalCompletedNotification({
    address: w.address,
    amount: w.amount,
    txHash: params.payoutTxHash,
    withdrawalId: params.withdrawalId,
  });
} catch (notificationError) {
  console.error('[CompleteWithdrawal] Telegram 通知发送失败:', notificationError);
}

return { ok: true };
```

### 2.7 添加测试 API

**编辑 `rabbit-ai-backend/src/api/routes/admin.ts`**：

在文件顶部添加导入：

```typescript
// 在文件顶部添加
import { sendTestNotification } from '../../services/telegram.js';
```

在文件末尾（注册其他路由的地方）添加测试路由：

```typescript
// 🟢 新增：测试 Telegram 通知
app.post('/api/admin/test-telegram', async (req: FastifyRequest, reply: FastifyReply) => {
  if (!assertAdmin(req, reply)) return;

  try {
    const result = await sendTestNotification();
    return { ok: true, ...result };
  } catch (error: any) {
    return reply.status(500).send({
      ok: false,
      code: 'TEST_FAILED',
      message: error.message || 'Failed to send test notification',
    });
  }
});
```

---

## 🔧 第三步：编译和重启后端

### 3.1 编译 TypeScript

```bash
cd rabbit-ai-backend
npm run build
```

### 3.2 重启后端服务

**如果使用 PM2**：
```bash
pm2 restart rabbit-ai-backend
pm2 logs rabbit-ai-backend --lines 50
```

**如果使用其他方式**：
```bash
# 停止现有进程，然后重新启动
npm start
```

### 3.3 检查日志

确认看到以下日志：
```
[Telegram Bot] ✅ 已初始化
```

如果看到：
```
[Telegram Bot] ⚠️ 未启用或配置不完整
```

请检查 `.env` 文件中的配置是否正确。

---

## ✅ 第一部分完成

**已完成的工作**：
- ✅ 创建 Telegram Bot
- ✅ 获取 Bot Token 和 Chat ID
- ✅ 安装依赖包
- ✅ 配置环境变量
- ✅ 创建 Telegram 服务
- ✅ 集成到提现流程
- ✅ 集成到完成流程
- ✅ 添加测试 API
- ✅ 编译和重启

**下一步**：
- ⏳ 测试通知功能
- ⏳ 测试提现流程
- ⏳ 生产环境部署
- ⏳ 高级功能配置

---

**第1部分完成时间**：2026-01-05  
**预计用时**：1-1.5 小时  
**下一步**：查看第2部分（测试与部署）

