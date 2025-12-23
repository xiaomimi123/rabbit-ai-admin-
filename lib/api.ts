
const BASE_URL = '/api'; // In production, this would be your API root

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

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json();
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

export async function getAdminUser(address: string) {
  return apiFetch<{
    ok: boolean;
    user: {
      address: string;
      referrer: string | null;
      inviteCount: string;
      energyTotal: string;
      energyLocked: string;
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
  return apiFetch<{ ok: boolean; address: string; asset: string; newTotal?: number }>('/admin/users/adjust-asset', {
    method: 'POST',
    body: JSON.stringify(params),
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
