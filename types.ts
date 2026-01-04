
export interface KPIResponse {
  totalUsers: number;
  pendingWithdrawals: number;
  airdropFeesBNB: number;
  totalRATCirculating: number; // 替换 TVL 为 RAT 流通量
  trends: {
    users: number;
    withdrawals: number;
    fees: number;
    rat: number; // 替换 tvl 趋势
  };
}

export interface User {
  address: string;
  energyTotal: number; // 逻辑层仍可保留 energy 变量名，但 UI 显示为 RAT
  energyLocked: number;
  inviteCount: number;
  referrer: string | null;
  registeredAt: string;
  lastActive: string;
  usdtBalance: number;
  ratBalance?: number; // 🟢 新增：RAT 余额（格式化后的值）
  ratBalanceWei?: string; // 🟢 新增：Wei 值（用于精确计算）
  ratBalanceUpdatedAt?: string; // 🟢 新增：更新时间
}

export interface Withdrawal {
  id: string;
  address: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Rejected';
  createdAt: string;
}

export interface ClaimRecord {
  id: string;
  amount: number;
  type: string;
  timestamp: string;
}

export interface RevenueRecord {
  id: string;
  address: string;
  feeAmount: number;
  asset: 'BNB';
  timestamp: string;
  txHash: string;
}

export interface Message {
  id: string;
  title: string;
  content: string;
  status: 'Sent' | 'Read';
  createdAt: string;
}

export interface OperationRecord {
  id: string;
  address: string;
  type: 'Withdrawal' | 'AirdropClaim';
  amount: string;
  status: 'Success' | 'Pending' | 'Failed' | 'Rejected';
  timestamp: string;
  txHash?: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  description?: string;
  category?: 'Business' | 'Technical' | 'UI' | 'Frontend';
}

export interface YieldTier {
  id: number;
  level: string;
  name: string;
  min_hold: number;
  daily_rate: number;
}
