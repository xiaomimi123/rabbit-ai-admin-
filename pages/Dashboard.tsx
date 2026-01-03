
import React, { useState, useEffect, useCallback } from 'react';
import { Users, AlertCircle, Coins, Gem, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { getAdminKPIs, getTopRATHolders } from '../lib/api';
import { KPIResponse } from '../types';

const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [topHolders, setTopHolders] = useState<Array<{ rank: number; address: string; balance: number }>>([]);

  const fetchKPIs = useCallback(async () => {
    try {
      const [data, holders] = await Promise.all([
        getAdminKPIs(),
        getTopRATHolders(5).catch(() => ({ ok: true, items: [] })), // 如果失败，返回空数组
      ]);
      
      console.log('[Dashboard] KPI 数据:', data); // 🟢 调试日志
      
      // 转换后端数据格式为前端格式
      const totalRAT = data.totalHoldings ? parseFloat(data.totalHoldings.amount) : 0;
      const airdropFeesBNB = parseFloat(data.airdropFeeBalance || '0'); // ✅ 修复：现在显示的是累计总收益
      
      // 🟢 修复：确保 usersTotal 正确解析
      const usersTotal = typeof data.usersTotal === 'number' ? data.usersTotal : (typeof data.usersTotal === 'string' ? parseInt(data.usersTotal, 10) : 0);
      
      console.log('[Dashboard] 解析后的 usersTotal:', usersTotal); // 🟢 调试日志
      
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
      
      console.log('[Dashboard] 最终 KPI 数据:', mockData); // 🟢 调试日志
      
      setKpis(mockData);
      setTopHolders(holders.items || []);
    } catch (error) {
      console.error('获取 KPI 失败', error);
      // 🟢 修复：即使失败也设置默认值，避免页面显示空白
      setKpis({
        totalUsers: 0,
        pendingWithdrawals: 0,
        airdropFeesBNB: 0,
        totalRATCirculating: 0,
        trends: { users: 0, withdrawals: 0, fees: 0, rat: 0 }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(fetchKPIs, 15000);
    return () => clearInterval(interval);
  }, [fetchKPIs]);

  if (loading && !kpis) {
    return <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />)}
      </div>
    </div>;
  }

  const cards = [
    { 
      label: '总用户数', 
      value: kpis?.totalUsers != null ? kpis.totalUsers.toLocaleString() : '0', 
      trend: kpis?.trends.users, 
      icon: Users, 
      color: 'blue' 
    },
    { 
      label: '待处理提现', 
      value: kpis?.pendingWithdrawals != null ? String(kpis.pendingWithdrawals) : '0', 
      trend: kpis?.trends.withdrawals, 
      icon: AlertCircle, 
      color: kpis?.pendingWithdrawals && kpis.pendingWithdrawals > 10 ? 'red' : 'zinc' 
    },
    { 
      label: '空投手续费 (BNB)', 
      value: kpis?.airdropFeesBNB != null ? kpis.airdropFeesBNB.toFixed(2) : '0.00', 
      trend: kpis?.trends.fees, 
      icon: Coins, 
      color: 'emerald' 
    },
    { 
      label: 'RAT 总持仓量', 
      value: `${((kpis?.totalRATCirculating || 0) / 1000000).toFixed(2)}M`, 
      trend: kpis?.trends.rat, 
      icon: Gem, 
      color: 'indigo' 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">数据概览</h2>
        <p className="text-zinc-400 text-sm">RAT 持币生息系统核心指标监控，不含质押 TVL 统计。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div 
            key={i} 
            className={`p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-colors ${
              card.color === 'red' ? 'ring-1 ring-red-500/20 bg-red-500/[0.02]' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${
                card.color === 'red' ? 'bg-red-500/10 text-red-500' :
                card.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                card.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                card.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                <card.icon size={20} />
              </div>
              {card.trend !== undefined && card.trend !== 0 && (
                <div className={`flex items-center text-xs font-medium ${card.trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {card.trend >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                  {Math.abs(card.trend)}%
                </div>
              )}
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">{card.label}</p>
              <h3 className="text-2xl font-bold text-white">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl h-80 flex flex-col">
           <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white">持币生息趋势</h4>
              <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> RAT 持有</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> USDT 收益</span>
              </div>
           </div>
           <div className="flex-1 flex items-center justify-center text-zinc-500">
             <div className="text-center">
               <PieChart size={48} className="mx-auto mb-4 opacity-10" />
               <p className="text-xs opacity-50 font-mono tracking-widest">REAL-TIME DATA STREAM ACTIVE</p>
             </div>
           </div>
        </div>
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl h-80 overflow-hidden flex flex-col">
          <h4 className="text-sm font-semibold mb-4 text-white">RAT 持币大户排行</h4>
          <div className="space-y-4 overflow-y-auto pr-2">
            {topHolders.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">暂无持币数据</div>
            ) : (
              topHolders.map((holder) => {
                const maxBalance = topHolders[0]?.balance || 1;
                const percentage = (holder.balance / maxBalance) * 100;
                return (
                  <div key={holder.address} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-emerald-500">
                      #{holder.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-zinc-300 font-mono">
                        {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                      </p>
                      <div className="w-full bg-zinc-800 h-1 rounded-full mt-1">
                        <div className="bg-emerald-500 h-1 rounded-full" style={{width: `${percentage}%`}}></div>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono font-black text-zinc-100">{holder.balance.toFixed(0)} RAT</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
