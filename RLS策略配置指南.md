# RLS (Row Level Security) 策略配置指南

## ⚠️ 重要提示

**在您当前的架构下，启用 RLS 不是必需的**，因为：
- 前端不直接访问 Supabase
- 后端使用 `service_role` key（绕过 RLS）
- 所有数据访问都通过后端 API

**但如果您想要额外的安全层**，可以按照以下步骤配置。

---

## 📋 配置步骤

### 1️⃣ 为主要表启用 RLS

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_sync_state ENABLE ROW LEVEL SECURITY;
```

### 2️⃣ 创建允许 service_role 完全访问的策略

```sql
-- users 表策略
CREATE POLICY "Service role has full access to users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- withdrawals 表策略
CREATE POLICY "Service role has full access to withdrawals"
  ON withdrawals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- claims 表策略
CREATE POLICY "Service role has full access to claims"
  ON claims
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- expenses 表策略
CREATE POLICY "Service role has full access to expenses"
  ON expenses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- admin_operations 表策略
CREATE POLICY "Service role has full access to admin_operations"
  ON admin_operations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- chain_sync_state 表策略
CREATE POLICY "Service role has full access to chain_sync_state"
  ON chain_sync_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 3️⃣ 验证配置

```sql
-- 检查 RLS 是否已启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 检查策略是否已创建
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🧪 测试影响

### 测试 1：后端 API 是否正常工作

```bash
# 测试获取用户信息
curl https://api.rabbitdifi.com/api/user/stats/0xYourAddress

# 测试管理后台
curl https://api.rabbitdifi.com/api/admin/users?page=1&limit=10 \
  -H "x-admin-api-key: YOUR_ADMIN_KEY"
```

**预期结果**：所有 API 应该正常返回数据

### 测试 2：前端功能是否正常

1. 打开前端页面
2. 连接钱包
3. 查看挖矿页面、资产页面
4. 执行一次小额提现

**预期结果**：所有功能正常

### 测试 3：管理后台是否正常

1. 登录管理后台
2. 查看用户列表
3. 查看提现记录
4. 完成一笔提现

**预期结果**：所有功能正常

---

## 🔄 如果出现问题

### 问题 1：API 返回权限错误

**症状**：
```json
{
  "error": "permission denied for table users"
}
```

**解决方案**：
检查 `service_role` 策略是否正确创建：

```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### 问题 2：部分操作失败

**可能原因**：
- 某些表忘记创建策略
- 策略权限不足

**解决方案**：
为遗漏的表补充策略（参考步骤 2）

---

## 🔙 回滚方案

如果启用 RLS 后遇到问题，可以快速回滚：

```sql
-- 禁用所有表的 RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE chain_sync_state DISABLE ROW LEVEL SECURITY;

-- 删除所有策略（可选）
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Service role has full access to withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Service role has full access to claims" ON claims;
DROP POLICY IF EXISTS "Service role has full access to expenses" ON expenses;
DROP POLICY IF EXISTS "Service role has full access to admin_operations" ON admin_operations;
DROP POLICY IF EXISTS "Service role has full access to chain_sync_state" ON chain_sync_state;
```

---

## 📊 总结

### ✅ 启用 RLS 的好处
- 多一层安全防护
- 防止 anon key 泄露导致的数据泄露

### ⚠️ 启用 RLS 的注意事项
- 需要为每个表配置策略
- 增加配置复杂度
- 对您当前架构**没有实际影响**（因为后端用 service_role）

### 🎯 建议
**如果您不是数据库安全专家，建议保持 RLS 禁用。**

您当前的架构已经足够安全：
- 前端不直接访问数据库
- 后端 API 有权限控制
- service_role key 不泄露

---

**生成时间**：2026-01-05
**文档状态**：✅ 完成

