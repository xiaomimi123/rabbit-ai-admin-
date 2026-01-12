
import React, { useState, useCallback, useEffect } from 'react';
import { Users, Coins, TrendingUp, TrendingDown, RefreshCw, BarChart3, DollarSign } from 'lucide-react';
import { getAdminKPIs, getDailyClaimsStats, getDailyUserGrowthStats, getAdminUserList } from '../lib/api';
import { KPIResponse } from '../types';
import { useAutoRefresh } from '../hooks';
import { CardSkeleton, EmptyState, useNotifications, NotificationContainer } from '../components';

// 🚀 新增：演示 React Query hooks 的使用
// 要使用 React Query 版本，取消注释下面一行并注释掉上面的导入
// import { useAdminKPIs, useTopRATHolders, useUserList } from '../hooks';

const Dashboard: React.FC = () => {
  const { notifications, showNotification, removeNotification } = useNotifications();
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyClaimsStats, setDailyClaimsStats] = useState<Array<{ date: string; count: number }>>([]);
  const [dailyUserGrowthStats, setDailyUserGrowthStats] = useState<Array<{ date: string; count: number }>>([]);

  const fetchKPIs = useCallback(async () => {
    let usersTotal = 0;
    
    try {
      // 🟢 优化：先加载基础 KPI 数据（快速显示）
      const data = await getAdminKPIs();
      
      // 转换后端数据格式为前端格式
      const totalRAT = data.totalHoldings ? parseFloat(data.totalHoldings.amount) : 0;
      const airdropFeesBNB = parseFloat(data.airdropFeeBalance || '0'); // ✅ 修复：现在显示的是累计总收益
      
      // 🟢 修复：确保 usersTotal 正确解析
      usersTotal = typeof data.usersTotal === 'number' ? data.usersTotal : (typeof data.usersTotal === 'string' ? parseInt(data.usersTotal, 10) : 0);
      
      // 暂时移除趋势数据（需要历史数据支持，后续可以实现）
      const mockData: KPIResponse = {
        totalUsers: usersTotal || 0,
        claims24h: data.claims24h || 0, // 🟢 新增：24小时领取次数
        pendingWithdrawals: Math.ceil(parseFloat(data.pendingWithdrawTotal || '0') / 50), // 估算待处理数量
        airdropFeesBNB: airdropFeesBNB,
        totalRATCirculating: totalRAT,
        trends: {
          users: 0, // 暂时设为 0，后续可以实现历史对比
          withdrawals: 0,
          fees: 0,
          rat: 0
        }
      };
      
      // 🟢 优化：先设置基础 KPI，立即显示
      setKpis(mockData);
      // 🟢 修复：持币大户排行已独立刷新，不再在这里调用
    } catch (error: any) {
      console.error('获取 KPI 失败', error);
      showNotification('error', `获取 KPI 失败: ${error?.message || '未知错误'}`);
      
      // 🟢 修复：如果 KPI API 失败，尝试从用户列表 API 获取用户总数
      if (usersTotal === 0) {
        try {
          console.log('[Dashboard] 尝试从用户列表 API 获取用户总数...');
          const userListData = await getAdminUserList({ limit: 1, offset: 0 });
          usersTotal = userListData.total || 0;
          console.log('[Dashboard] 从用户列表获取到的用户总数:', usersTotal);
        } catch (userListError: any) {
          console.error('[Dashboard] 从用户列表获取用户总数也失败:', userListError);
          showNotification('warning', '无法获取用户总数，部分数据可能不准确');
        }
      }
      
      // 🟢 修复：即使失败也设置默认值，避免页面显示空白
      setKpis({
        totalUsers: usersTotal,
        claims24h: 0, // 🟢 新增：默认值
        pendingWithdrawals: 0,
        airdropFeesBNB: 0,
        totalRATCirculating: 0,
        trends: { users: 0, withdrawals: 0, fees: 0, rat: 0 }
      });
    } finally {
      setLoading(false);
    }
    // 🟢 修复：移除 showNotification 依赖（现在 showNotification 引用稳定了）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🟢 新增：获取每日领取次数统计
  const fetchDailyClaimsStats = useCallback(async () => {
    try {
      const data = await getDailyClaimsStats(7); // 最近7天
      setDailyClaimsStats(data.stats || []);
    } catch (error: any) {
      console.error('获取每日领取统计失败:', error);
      setDailyClaimsStats([]);
    }
  }, []);

  // 🟢 新增：获取每日用户增长统计
  const fetchDailyUserGrowthStats = useCallback(async () => {
    try {
      const data = await getDailyUserGrowthStats(7); // 最近7天
      setDailyUserGrowthStats(data.stats || []);
    } catch (error: any) {
      console.error('获取每日用户增长统计失败:', error);
      setDailyUserGrowthStats([]);
    }
  }, []);

  // 🟢 优化：使用 useAutoRefresh Hook（KPI 数据每 15 秒刷新）
  const { refresh, isRefreshing } = useAutoRefresh({
    enabled: true,
    interval: 15000,
    onRefresh: fetchKPIs,
    immediate: false, // 🟢 修复：不立即执行，避免与初始加载冲突
  });

  // 🟢 新增：每日领取次数统计独立刷新（每 60 秒刷新一次）
  useAutoRefresh({
    enabled: true,
    interval: 60000, // 60 秒刷新一次
    onRefresh: fetchDailyClaimsStats,
    immediate: true, // 立即加载一次
  });

  // 🟢 新增：每日用户增长统计独立刷新（每 60 秒刷新一次）
  useAutoRefresh({
    enabled: true,
    interval: 60000, // 60 秒刷新一次
    onRefresh: fetchDailyUserGrowthStats,
    immediate: true, // 立即加载一次
  });

  // 🟢 修复：添加初始加载逻辑
  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  if (loading && !kpis) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <CardSkeleton count={4} />
      </div>
    );
  }

  const cards = [
    { 
      label: '总用户数', 
      value: kpis?.totalUsers.toLocaleString() || '0', 
      change: kpis?.trends?.users || 0, 
      icon: Users, 
      color: 'emerald', 
      bgClass: 'bg-emerald-500/10',
      iconBgClass: 'bg-emerald-500/20',
      textClass: 'text-emerald-400'
    },
    { 
      label: '24小时领取次数', 
      value: kpis?.claims24h?.toLocaleString() || '0', 
      change: 0, 
      icon: TrendingUp, 
      color: 'cyan', 
      bgClass: 'bg-cyan-500/10',
      iconBgClass: 'bg-cyan-500/20',
      textClass: 'text-cyan-400'
    },
    { 
      label: '总累计支出', 
      value: `${kpis?.totalExpenses?.toFixed(2) || '0'} USDT`, 
      change: 0, 
      icon: DollarSign, 
      color: 'amber', 
      bgClass: 'bg-amber-500/10',
      iconBgClass: 'bg-amber-500/20',
      textClass: 'text-amber-400'
    },
    { 
      label: '累计空投收益', 
      value: `${kpis?.airdropFeesBNB.toFixed(4) || '0'} BNB`, 
      change: kpis?.trends?.fees || 0, 
      icon: Coins, 
      color: 'blue', 
      bgClass: 'bg-blue-500/10',
      iconBgClass: 'bg-blue-500/20',
      textClass: 'text-blue-400'
    },
  ];

  return (
    <>
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">概览</h1>
            <p className="text-zinc-500 mt-1 text-sm font-medium">系统整体数据和关键指标</p>
          </div>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white disabled:text-zinc-600 transition-all font-medium text-sm shadow-lg disabled:cursor-not-allowed group"
          >
            <RefreshCw className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} size={16} />
            <span>{isRefreshing ? '刷新中...' : '刷新数据'}</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            const isPositive = (card.change || 0) >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;
            
            return (
              <div key={index} className={`p-6 ${card.bgClass} border border-zinc-800 rounded-2xl hover:scale-[1.02] transition-all shadow-xl backdrop-blur-sm`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 ${card.iconBgClass} rounded-xl`}>
                    <Icon className={card.textClass} size={24} strokeWidth={2} />
                  </div>
                  {card.change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      <TrendIcon size={14} />
                      <span>{Math.abs(card.change || 0).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">{card.label}</p>
                  <p className={`text-3xl font-black ${card.textClass} tracking-tight`}>{card.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 每日领取次数趋势图 */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-cyan-400" size={20} />
              <h2 className="text-xl font-black text-white">每日领取次数趋势</h2>
              <span className="text-zinc-600 text-xs font-bold">最近 7 天</span>
            </div>
          </div>
          
          {dailyClaimsStats.length === 0 ? (
            <EmptyState title="暂无统计数据" />
          ) : (
            <div className="space-y-4">
              {/* 简单的柱状图 */}
              <div className="flex items-end justify-between gap-2 h-48">
                {dailyClaimsStats.map((stat, index) => {
                  const maxCount = Math.max(...dailyClaimsStats.map(s => s.count));
                  const heightPercent = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                  const date = new Date(stat.date);
                  const dayLabel = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
                  
                  return (
                    <div key={stat.date} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="relative w-full">
                        <div 
                          className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-lg transition-all duration-300 group-hover:from-cyan-400 group-hover:to-cyan-300"
                          style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                        />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs font-bold text-cyan-400 whitespace-nowrap">{stat.count}</span>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 font-medium">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* 统计摘要 */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                <div className="text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-1">总计</p>
                  <p className="text-lg font-black text-white">{dailyClaimsStats.reduce((sum, s) => sum + s.count, 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-1">日均</p>
                  <p className="text-lg font-black text-cyan-400">
                    {Math.round(dailyClaimsStats.reduce((sum, s) => sum + s.count, 0) / dailyClaimsStats.length).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-1">峰值</p>
                  <p className="text-lg font-black text-emerald-400">
                    {Math.max(...dailyClaimsStats.map(s => s.count)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🟢 新增：每日用户增长趋势图 */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="text-emerald-400" size={20} />
              <h2 className="text-xl font-black text-white">每日用户增长趋势</h2>
              <span className="text-zinc-600 text-xs font-bold">最近 7 天</span>
            </div>
          </div>
          
          {dailyUserGrowthStats.length === 0 ? (
            <EmptyState title="暂无统计数据" />
          ) : (
            <div className="space-y-4">
              {/* 简单的柱状图 */}
              <div className="flex items-end justify-between gap-2 h-48">
                {dailyUserGrowthStats.map((stat, index) => {
                  const maxCount = Math.max(...dailyUserGrowthStats.map(s => s.count));
                  const heightPercent = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                  const date = new Date(stat.date);
                  const dayLabel = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
                  
                  return (
                    <div key={stat.date} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="relative w-full">
                        <div 
                          className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:from-emerald-400 group-hover:to-emerald-300"
                          style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                        />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">{stat.count}</span>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 font-medium">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* 统计摘要 */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                <div className="text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-1">总计</p>
                  <p className="text-lg font-black text-white">{dailyUserGrowthStats.reduce((sum, s) => sum + s.count, 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-1">日均</p>
                  <p className="text-lg font-black text-emerald-400">
                    {Math.round(dailyUserGrowthStats.reduce((sum, s) => sum + s.count, 0) / dailyUserGrowthStats.length).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-1">峰值</p>
                  <p className="text-lg font-black text-cyan-400">
                    {Math.max(...dailyUserGrowthStats.map(s => s.count)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
