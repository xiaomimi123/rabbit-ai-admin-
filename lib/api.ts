
// 支持环境变量配置后端地址，开发环境使用代理，生产环境使用完整 URL
// 统一确保最终 BASE_URL 以 /api 结尾，便于拼接 /admin/... 路由
function getBaseUrl(): string {
  const envUrl = (import.meta.env?.VITE_API_BASE as string | undefined)?.trim();

  // 如果没有配置环境变量，使用相对路径（开发环境由 Vite 代理到本地后端）
  if (!envUrl) {
    return '/api';
  }

  let url = envUrl;

  // 如果缺少协议，生产默认补 https，开发默认补 http
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = import.meta.env.PROD ? `https://${url}` : `http://${url}`;
  }

  // 移除末尾斜杠
  url = url.replace(/\/+$/, '');

  // 确保以 /api 结尾（后端路由为 /api/admin/...）
  if (!url.toLowerCase().endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;
}

const BASE_URL = getBaseUrl();

export const getAdminKey = () => localStorage.getItem('RABBIT_ADMIN_KEY');
export const setAdminKey = (key: string) => localStorage.setItem('RABBIT_ADMIN_KEY', key);

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const adminKey = getAdminKey();
  
  const headers = new Headers(options.headers);
  if (adminKey) {
    // 后端使用 x-admin-api-key header
    headers.set('x-admin-api-key', adminKey);
  }
  headers.set('Content-Type', 'application/json');

  const url = `${BASE_URL}${endpoint}`;
  
  // 开发环境打印调试信息
  if (import.meta.env.DEV) {
    console.log('[API] Request:', url, { headers: Object.fromEntries(headers) });
  }

  const response = await fetch(url, {
    ...options,
    headers,
    signal: options.signal, // 支持 AbortController
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.message || `API error: ${response.status}`;
    console.error('[API] Error:', url, response.status, errorMsg);
    
    // 如果是 401 未授权错误，清除无效的 admin key 并触发登出
    if (response.status === 401 && (errorMsg.includes('UNAUTHORIZED') || errorMsg.includes('Invalid admin'))) {
      setAdminKey('');
      // 触发自定义事件，通知 App 组件需要重新登录
      window.dispatchEvent(new CustomEvent('admin-auth-failed'));
    }
    
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (import.meta.env.DEV) {
    console.log('[API] Response:', url, data);
  }
  return data;
}

// ==================== 管理后台 API 函数 ====================

// 0. Auth - 认证验证（只验证密钥，不调用 RPC）
export async function verifyAdminKey() {
  return apiFetch<{
    ok: boolean;
    message: string;
    timestamp: string;
  }>('/admin/auth/verify');
}

// 1. Dashboard - KPI数据
export async function getAdminKPIs() {
  return apiFetch<{
    ok: boolean;
    usersTotal: number;
    pendingWithdrawTotal: string;
    pendingWithdrawUnit: string;
    airdropFeeRecipient: string;
    airdropFeeBalance: string;
    airdropFeeUnit: string;
    airdrop: {
      contract: string;
      token: string;
      claimFee: string;
      claimFeeUnit: string;
      cooldownSec: number;
      rewardRange: { min: string; max: string };
    };
    totalHoldings: { amount: string; symbol: string } | null;
    time: string;
  }>('/admin/kpis');
}

// 2. Revenue - 收益明细
export async function getAdminRevenue(params: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  return apiFetch<{
    ok: boolean;
    items: Array<{
      id: string;
      address: string;
      feeAmount: number;
      asset: 'BNB';
      timestamp: string;
      txHash: string;
    }>;
    total: number;
  }>(`/admin/revenue?${query.toString()}`);
}

// 3. Expenses - 支出明细
export async function getAdminExpenses(params: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  return apiFetch<{
    ok: boolean;
    items: Array<{
      id: string;
      address: string;
      amount: number;
      status: string;
      createdAt: string;
      payoutTxHash: string | null;
    }>;
    total: number; // 总支出金额
    totalCount: number; // 🟢 新增：总记录数
  }>(`/admin/expenses?${query.toString()}`);
}

// 4. FinanceOps - 财务审核
export async function getPendingWithdrawals(limit = 50) {
  return apiFetch<{
    ok: boolean;
    items: Array<{
      id: string;
      address: string;
      amount: string;
      status: string;
      energyLockedAmount: string;
      payoutTxHash: string | null;
      createdAt: string;
      updatedAt: string;
      alert: boolean;
    }>;
  }>(`/admin/withdrawals/pending?limit=${limit}`);
}

export async function rejectWithdrawal(id: string, reason?: string) {
  return apiFetch<{ ok: boolean; id: string; status: string }>(`/admin/withdrawals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function completeWithdrawal(id: string, payoutTxHash: string) {
  return apiFetch<{ ok: boolean; id: string; status: string; payoutTxHash: string; verified: boolean }>(
    `/admin/withdrawals/${id}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ payoutTxHash }),
    }
  );
}

// 获取 USDT 合约信息（地址和精度）
export async function getUsdtInfo() {
  return apiFetch<{ ok: boolean; address: string; decimals: number; symbol: string }>('/admin/system/usdt');
}

// 获取管理员支付地址的 USDT 余额
export async function getAdminUsdtBalance() {
  return apiFetch<{ ok: boolean; balance: string }>('/admin/usdt-balance');
}

// 获取 RAT 持币大户排行
export async function getTopRATHolders(limit: number = 5) {
  return apiFetch<{
    ok: boolean;
    items: Array<{
      rank: number;
      address: string;
      balance: number;
    }>;
  }>(`/admin/top-holders?limit=${limit}`);
}

// 获取收益统计信息
export async function getRevenueStats() {
  return apiFetch<{
    ok: boolean;
    totalRevenue: string;
    trend: string; // 百分比
    estimatedDaily: string;
    avgFee: string;
  }>('/admin/revenue/stats');
}

// 5. YieldStrategy - VIP等级配置
export async function getVipTiers() {
  return apiFetch<{
    ok: boolean;
    tiers: Array<{
      level: number;
      name: string;
      minBalance: string;
      maxBalance: string | null;
      dailyRate: number;
      isActive: boolean;
      displayOrder: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }>('/admin/vip/tiers');
}

export async function updateVipTier(level: number, updates: {
  name?: string;
  minBalance?: number;
  maxBalance?: number | null;
  dailyRate?: number;
  isActive?: boolean;
}) {
  return apiFetch<{
    ok: boolean;
    tier: {
      level: number;
      name: string;
      minBalance: string;
      maxBalance: string | null;
      dailyRate: number;
      isActive: boolean;
      displayOrder: number;
      updatedAt: string;
    };
  }>(`/admin/vip/tiers/${level}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// 6. OperationRecords - 操作记录
export async function getAdminOperationRecords(params: {
  limit?: number;
  offset?: number;
  type?: 'all' | 'Withdrawal' | 'AirdropClaim';
  address?: string;
}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.type) query.set('type', params.type);
  if (params.address) query.set('address', params.address);
  return apiFetch<{
    ok: boolean;
    items: Array<{
      id: string;
      address: string;
      type: 'Withdrawal' | 'AirdropClaim';
      amount: string;
      status: 'Success' | 'Pending' | 'Failed' | 'Rejected';
      timestamp: string;
      txHash?: string;
    }>;
    total: number;
  }>(`/admin/operations?${query.toString()}`);
}

// 7. Users - 用户管理
export async function getAdminUserList(params: {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: 'ratBalance' | 'inviteCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  return apiFetch<{
    ok: boolean;
    items: Array<{
      address: string;
      energyTotal: number;
      energyLocked: number;
      inviteCount: number;
      referrer: string | null;
      registeredAt: string;
      lastActive: string;
      usdtBalance: number;
      ratBalance?: number; // 🟢 新增：RAT 余额（格式化后的值）
      ratBalanceWei?: string; // 🟢 新增：Wei 值（用于精确计算）
      ratBalanceUpdatedAt?: string; // 🟢 新增：更新时间
    }>;
    total: number;
  }>(`/admin/users/list?${query.toString()}`);
}

// 8. Analytics - 访问统计
export async function getVisitStats(params: {
  startDate?: string;
  endDate?: string;
  country?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.country) query.set('country', params.country);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  return apiFetch<{
    ok: boolean;
    items: Array<{
      id: number;
      ip_address: string;
      country: string;
      country_code: string;
      city: string | null;
      user_agent: string;
      page_path: string;
      wallet_address: string | null;
      referrer: string | null;
      language: string | null;
      is_mobile: boolean;
      session_id: string;
      created_at: string;
    }>;
    total: number;
  }>(`/admin/analytics/visits?${query.toString()}`);
}

export async function getVisitSummary(params?: {
  startDate?: string;
  endDate?: string;
}) {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  return apiFetch<{
    ok: boolean;
    totalVisits: number;
    todayVisits: number;
    walletVisits: number;
    countryDistribution: Array<{
      name: string;
      code: string;
      count: number;
    }>;
  }>(`/admin/analytics/summary?${query.toString()}`);
}

// 🟢 新增：获取访问统计数据统计信息
export async function getAnalyticsStats() {
  return apiFetch<{
    ok: boolean;
    totalRecords: number;
    oldestRecord: string | null;
    newestRecord: string | null;
    estimatedSize: string;
    recordsByMonth: Array<{ month: string; count: number }>;
  }>('/admin/analytics/stats');
}

// 🟢 新增：清理旧访问数据
export async function cleanupOldVisits(daysToKeep: number = 90) {
  return apiFetch<{
    ok: boolean;
    deletedCount: number;
    error?: string;
  }>('/admin/analytics/cleanup', {
    method: 'POST',
    body: JSON.stringify({ daysToKeep }),
  });
}

// 获取用户 RAT 余额（从链上读取）
export async function getRatBalance(address: string) {
  // 🟢 添加前端超时保护（15秒），防止请求无限等待
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const result = await apiFetch<{
      balance: string;
    }>(`/asset/rat-balance?address=${encodeURIComponent(address)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn(`[API] RAT balance request timeout for ${address}`);
      // 返回默认值，不抛出错误
      return { balance: '0.00' };
    }
    throw error;
  }
}

// 获取用户实时收益（使用管理 API，需要 admin key 认证）
export async function getUserEarnings(address: string) {
  // 🟢 修复：使用管理 API，需要 admin key 认证，更安全
  return apiFetch<{
    ok: boolean;
    pendingUsdt: string;
    dailyRate: number;
    currentTier: number;
    holdingDays: number;
  }>(`/admin/users/${encodeURIComponent(address)}/earnings`);
}

export async function getAdminUser(address: string) {
  return apiFetch<{
    ok: boolean;
    user: {
      address: string;
      referrer: string | null;
      inviteCount: string;
      energyTotal: string;
      energyLocked: string;
      usdtTotal: string;
      usdtLocked: string;
      createdAt: string;
      updatedAt: string;
    } | null;
    claims: Array<{
      txHash: string;
      referrer: string;
      amount: string;
      unit: string;
      blockNumber: number | null;
      blockTime: string | null;
      createdAt: string;
    }>;
    withdrawals: Array<{
      id: string;
      amount: string;
      status: string;
      payoutTxHash: string | null;
      createdAt: string;
    }>;
    invitees: string[];
    onchain: {
      lastClaimTime: number;
      inviteCount: string;
    };
  }>(`/admin/users?address=${encodeURIComponent(address)}`);
}

export async function adjustUserAsset(params: {
  address: string;
  asset: 'RAT' | 'USDT';
  action: 'add' | 'sub';
  amount: string;
}) {
  const delta = params.action === 'add' ? parseFloat(params.amount) : -parseFloat(params.amount);
  const endpoint = params.asset === 'RAT' 
    ? `/admin/users/${encodeURIComponent(params.address)}/energy`
    : `/admin/users/${encodeURIComponent(params.address)}/usdt`;
  
  return apiFetch<{ ok: boolean; address: string; energyTotal?: string; usdtTotal?: string }>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ delta }),
  });
}

// 获取用户团队关系（上级、下级）
// 🟢 优化：支持分页参数
export async function getUserTeam(
  address: string,
  options?: { limit?: number; offset?: number }
) {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  
  const queryString = params.toString();
  return apiFetch<{
    ok: boolean;
    target: {
      address: string;
      energyTotal: string;
      inviteCount: string;
      registeredAt: string;
    };
    upline: {
      address: string;
      energyTotal: string;
      inviteCount: string;
      registeredAt: string;
    } | null;
    downline: Array<{
      address: string;
      energyTotal: string;
      inviteCount: string;
      registeredAt: string;
    }>;
    total: number; // 🟢 新增：总数字段
  }>(`/admin/users/${encodeURIComponent(address)}/team${queryString ? `?${queryString}` : ''}`);
}

export async function sendUserNotification(params: {
  address: string;
  title: string;
  content: string;
  type?: 'SYSTEM' | 'REWARD' | 'NETWORK';
}) {
  return apiFetch<{ ok: boolean }>('/admin/notifications/send', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function broadcastNotification(params: {
  title: string;
  content: string;
  type?: 'SYSTEM' | 'REWARD' | 'NETWORK';
}) {
  return apiFetch<{ ok: boolean; sent: number }>('/admin/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getBroadcastHistory() {
  return apiFetch<Array<{
    id: string;
    title: string;
    content: string;
    type: 'SYSTEM' | 'REWARD' | 'NETWORK';
    sent_count: number;
    created_at: string;
  }>>('/admin/notifications/broadcast/history', {
    method: 'GET',
  });
}

// 8. SystemConfig - 系统配置
export async function getSystemConfig() {
  return apiFetch<{
    ok: boolean;
    items: Array<{
      key: string;
      value: any;
      updatedAt: string;
    }>;
  }>('/admin/system/config');
}

export async function updateSystemConfig(key: string, value: any) {
  // ✅ 特殊处理 admin_payout：需要保存为对象格式 { address: "0x..." }
  let bodyValue: any;
  if (key === 'admin_payout') {
    // 如果已经是对象格式，直接使用；否则转换为对象
    if (typeof value === 'object' && value !== null && 'address' in value) {
      bodyValue = value;
    } else if (typeof value === 'string') {
      bodyValue = { address: value.trim() };
    } else {
      bodyValue = { address: String(value).trim() };
    }
  } else {
    // 其他配置项保存为字符串
    bodyValue = typeof value === 'string' ? value : String(value);
  }
  
  return apiFetch<{ ok: boolean }>(`/admin/system/config/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify(bodyValue),
  });
}

// 9. EnergyConfig - 能量配置管理
export async function getEnergyConfig() {
  return apiFetch<{
    ok: boolean;
    configs: Array<{
      key: string;
      value: number;
      description: string;
      updatedAt: string;
    }>;
  }>('/admin/energy-config');
}

export async function updateEnergyConfig(
  key: string,
  value: number,
  reason?: string
) {
  return apiFetch<{
    ok: boolean;
    oldValue: number;
    newValue: number;
    message: string;
  }>('/admin/energy-config/update', {
    method: 'POST',
    body: JSON.stringify({ key, value, reason }),
  });
}

export async function getEnergyConfigHistory(
  key?: string,
  limit: number = 50
) {
  const params = new URLSearchParams();
  if (key) params.append('key', key);
  params.append('limit', String(limit));
  
  return apiFetch<{
    ok: boolean;
    history: Array<{
      id: string;
      key: string;
      oldValue: number | null;
      newValue: number;
      changedBy: string | null;
      changeReason: string | null;
      createdAt: string;
    }>;
  }>(`/admin/energy-config/history?${params.toString()}`);
}

export async function clearEnergyConfigCache() {
  return apiFetch<{
    ok: boolean;
    message: string;
  }>('/admin/energy-config/clear-cache', {
    method: 'POST',
  });
}
