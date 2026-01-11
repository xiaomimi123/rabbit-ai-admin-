/**
 * React Query hooks for Admin API
 * 使用 React Query 自动缓存和管理 API 请求状态
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';

// ==================== Query Keys ====================
// 定义查询键，用于缓存管理
export const queryKeys = {
  kpis: ['admin', 'kpis'] as const,
  vipTiers: ['admin', 'vip', 'tiers'] as const,
  revenue: (params: any) => ['admin', 'revenue', params] as const,
  expenses: (params: any) => ['admin', 'expenses', params] as const,
  pendingWithdrawals: (limit: number) => ['admin', 'withdrawals', 'pending', limit] as const,
  topHolders: (limit: number) => ['admin', 'topHolders', limit] as const,
  revenueStats: ['admin', 'revenue', 'stats'] as const,
  autoPayoutConfig: ['admin', 'autoPayout', 'config'] as const,
  autoPayoutLogs: (params: any) => ['admin', 'autoPayout', 'logs', params] as const,
  energyConfig: ['admin', 'energyConfig'] as const,
  systemConfig: ['admin', 'systemConfig'] as const,
  userList: (params: any) => ['admin', 'users', 'list', params] as const,
  usdtInfo: ['admin', 'usdt', 'info'] as const,
  adminUsdtBalance: ['admin', 'usdt', 'balance'] as const,
};

// ==================== Dashboard Queries ====================

/**
 * 获取KPI数据 - Dashboard 使用
 * 缓存30秒，避免频繁请求
 */
export function useAdminKPIs() {
  return useQuery({
    queryKey: queryKeys.kpis,
    queryFn: api.getAdminKPIs,
    staleTime: 30000, // 30秒内视为新鲜
  });
}

/**
 * 获取 RAT 持币大户排行
 */
export function useTopRATHolders(limit: number = 5) {
  return useQuery({
    queryKey: queryKeys.topHolders(limit),
    queryFn: () => api.getTopRATHolders(limit),
    staleTime: 60000, // 1分钟内视为新鲜
  });
}

/**
 * 获取收益统计
 */
export function useRevenueStats() {
  return useQuery({
    queryKey: queryKeys.revenueStats,
    queryFn: api.getRevenueStats,
    staleTime: 30000,
  });
}

// ==================== VIP Config Queries ====================

/**
 * 获取VIP等级配置
 */
export function useVipTiers() {
  return useQuery({
    queryKey: queryKeys.vipTiers,
    queryFn: api.getVipTiers,
    staleTime: 60000, // VIP配置变化不频繁，1分钟缓存
  });
}

/**
 * 更新VIP等级配置 - Mutation
 */
export function useUpdateVipTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ level, updates }: { level: number; updates: any }) => 
      api.updateVipTier(level, updates),
    onSuccess: () => {
      // 更新成功后，刷新VIP配置缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.vipTiers });
    },
  });
}

// ==================== Auto Payout Queries ====================

/**
 * 获取自动放款配置
 */
export function useAutoPayoutConfig() {
  return useQuery({
    queryKey: queryKeys.autoPayoutConfig,
    queryFn: api.getAutoPayoutConfig,
    staleTime: 10000, // 10秒缓存，配置可能随时变化
  });
}

/**
 * 获取自动放款日志
 */
export function useAutoPayoutLogs(params: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.autoPayoutLogs(params),
    queryFn: () => api.getAutoPayoutLogs(params),
    staleTime: 5000, // 5秒缓存
  });
}

/**
 * 配置自动放款 - Mutation
 */
export function useConfigureAutoPayout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.configureAutoPayout,
    onSuccess: () => {
      // 更新成功后，刷新配置缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.autoPayoutConfig });
    },
  });
}

// ==================== Finance Queries ====================

/**
 * 获取待审核提现列表
 */
export function usePendingWithdrawals(limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.pendingWithdrawals(limit),
    queryFn: () => api.getPendingWithdrawals(limit),
    staleTime: 5000, // 5秒缓存，财务数据实时性要求高
    refetchInterval: 10000, // 每10秒自动刷新
  });
}

/**
 * 完成提现 - Mutation
 */
export function useCompleteWithdrawal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, payoutTxHash }: { id: string; payoutTxHash: string }) => 
      api.completeWithdrawal(id, payoutTxHash),
    onSuccess: () => {
      // 刷新待审核列表
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals', 'pending'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis });
    },
  });
}

/**
 * 拒绝提现 - Mutation
 */
export function useRejectWithdrawal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      api.rejectWithdrawal(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals', 'pending'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis });
    },
  });
}

// ==================== System Queries ====================

/**
 * 获取 USDT 合约信息
 */
export function useUsdtInfo() {
  return useQuery({
    queryKey: queryKeys.usdtInfo,
    queryFn: api.getUsdtInfo,
    staleTime: Infinity, // USDT合约信息不变，永久缓存
  });
}

/**
 * 获取管理员 USDT 余额
 */
export function useAdminUsdtBalance() {
  return useQuery({
    queryKey: queryKeys.adminUsdtBalance,
    queryFn: api.getAdminUsdtBalance,
    staleTime: 15000, // 15秒缓存
    refetchInterval: 30000, // 每30秒自动刷新
  });
}

/**
 * 获取能量配置
 */
export function useEnergyConfig() {
  return useQuery({
    queryKey: queryKeys.energyConfig,
    queryFn: api.getEnergyConfig,
    staleTime: 60000, // 1分钟缓存
  });
}

/**
 * 更新能量配置 - Mutation
 */
export function useUpdateEnergyConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ key, value, reason }: { key: string; value: number; reason?: string }) => 
      api.updateEnergyConfig(key, value, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.energyConfig });
    },
  });
}

/**
 * 获取系统配置
 */
export function useSystemConfig() {
  return useQuery({
    queryKey: queryKeys.systemConfig,
    queryFn: api.getSystemConfig,
    staleTime: 60000,
  });
}

/**
 * 更新系统配置 - Mutation
 */
export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => 
      api.updateSystemConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.systemConfig });
    },
  });
}

// ==================== Users Queries ====================

/**
 * 获取用户列表
 */
export function useUserList(params: {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: 'ratBalance' | 'inviteCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: queryKeys.userList(params),
    queryFn: () => api.getAdminUserList(params),
    staleTime: 30000, // 30秒缓存
    enabled: true, // 默认启用
  });
}

