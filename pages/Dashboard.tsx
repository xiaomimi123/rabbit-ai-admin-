
import React, { useState, useCallback, useEffect } from 'react';
import { Users, AlertCircle, Coins, Gem, TrendingUp, TrendingDown, PieChart, RefreshCw } from 'lucide-react';
import { getAdminKPIs, getTopRATHolders, getAdminUserList } from '../lib/api';
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
  const [topHolders, setTopHolders] = useState<Array<{ rank: number; address: string; balance: number }>>([]);

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

  // 🟢 优化：持币大户排行独立刷新函数（降低刷新频率）
  const fetchTopHolders = useCallback(async () => {
    try {
      const holders = await getTopRATHolders(5);
      setTopHolders(holders.items || []);
    } catch (error: any) {
      console.error('获取持币大户排行失败:', error);
      // 失败时设置为空数组，不影响主数据
      setTopHolders([]);
    }
  }, []);

  // 🟢 优化：使用 useAutoRefresh Hook（KPI 数据每 15 秒刷新）
  const { refresh, isRefreshing } = useAutoRefresh({
    enabled: true,
    interval: 15000,
    onRefresh: fetchKPIs,
    immediate: false, // 🟢 修复：不立即执行，避免与初始加载冲突
  });

  // 🟢 优化：持币大户排行独立刷新（每 60 秒刷新一次，降低频率）
  useAutoRefresh({
    enabled: true,
    interval: 60000, // 60 秒刷新一次
    onRefresh: fetchTopHolders,
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
      label: '待处理提现', 
      value: kpis?.pendingWithdrawals?.toString() || '0', 
      change: kpis?.trends?.withdrawals || 0, 
      icon: AlertCircle, 
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
    { 
      label: 'RAT 流通量', 
      value: kpis?.totalRATCirculating.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0', 
      change: kpis?.trends?.rat || 0, 
      icon: Gem, 
      color: 'purple', 
      bgClass: 'bg-purple-500/10',
      iconBgClass: 'bg-purple-500/20',
      textClass: 'text-purple-400'
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

        {/* RAT 持币大户排行榜 */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="text-purple-400" size={20} />
            <h2 className="text-xl font-black text-white">RAT 持币大户排行</h2>
            <span className="text-zinc-600 text-xs font-bold">TOP 5</span>
          </div>
          
          {topHolders.length === 0 ? (
            <EmptyState message="暂无持币大户数据" />
          ) : (
            <div className="space-y-3">
              {topHolders.map((holder) => {
                const rankColors = ['text-yellow-400', 'text-zinc-300', 'text-amber-600'];
                const rankColor = rankColors[holder.rank - 1] || 'text-zinc-500';
                
                return (
                  <div key={holder.address} className="flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800 rounded-xl transition-all group">
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl font-black ${rankColor} w-8 text-center`}>#{holder.rank}</span>
                      <code className="text-sm text-zinc-400 font-mono group-hover:text-white transition-colors">
                        {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                      </code>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-purple-400">{holder.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-zinc-600 font-bold uppercase">RAT</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
