
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
    total: number;
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
}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.search) query.set('search', params.search);
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
    }>;
    total: number;
  }>(`/admin/users/list?${query.toString()}`);
}

// 获取用户 RAT 余额（从链上读取）
export async function getRatBalance(address: string) {
  return apiFetch<{
    balance: string;
  }>(`/asset/rat-balance?address=${encodeURIComponent(address)}`);
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

// 8. SystemConfig - 系统配置
// 获取系统公告（管理员）
export async function getSystemAnnouncement() {
  return apiFetch<{
    ok: boolean;
    announcement: {
      content: string;
      updatedAt: string;
    } | null;
  }>('/admin/system/announcement');
}

// 更新系统公告（管理员）
export async function updateSystemAnnouncement(content: string) {
  return apiFetch<{
    ok: boolean;
    announcement: {
      content: string;
      updatedAt: string;
    };
  }>('/admin/system/announcement', {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

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
  return apiFetch<{ ok: boolean }>(`/admin/system/config/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify(value),
  });
}
