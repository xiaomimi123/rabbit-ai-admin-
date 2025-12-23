
import React, { useState, useEffect, useCallback } from 'react';
import { Users, AlertCircle, Coins, Gem, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { getAdminKPIs } from '../lib/api';
import { KPIResponse } from '../types';

const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKPIs = useCallback(async () => {
    try {
      const data = await getAdminKPIs();
      // 转换后端数据格式为前端格式
      const totalRAT = data.totalHoldings ? parseFloat(data.totalHoldings.amount) : 0;
      const airdropFeesBNB = parseFloat(data.airdropFeeBalance || '0');
      
      // 计算趋势（这里简化处理，实际应该对比历史数据）
      const mockData: KPIResponse = {
        totalUsers: data.usersTotal || 0,
        pendingWithdrawals: Math.ceil(parseFloat(data.pendingWithdrawTotal || '0') / 50), // 估算待处理数量
        airdropFeesBNB: airdropFeesBNB,
        totalRATCirculating: totalRAT,
        trends: {
          users: 12, // TODO: 从历史数据计算
          withdrawals: -5,
          fees: 8.4,
          rat: 5.2
        }
      };
      setKpis(mockData);
    } catch (error) {
      console.error('获取 KPI 失败', error);
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
      value: kpis?.totalUsers.toLocaleString(), 
      trend: kpis?.trends.users, 
      icon: Users, 
      color: 'blue' 
    },
    { 
      label: '待处理提现', 
      value: kpis?.pendingWithdrawals, 
      trend: kpis?.trends.withdrawals, 
      icon: AlertCircle, 
      color: kpis?.pendingWithdrawals && kpis.pendingWithdrawals > 10 ? 'red' : 'zinc' 
    },
    { 
      label: '空投手续费 (BNB)', 
      value: kpis?.airdropFeesBNB.toFixed(2), 
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
              {card.trend !== undefined && (
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
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-emerald-500">
                  #{i}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-zinc-300">0x71C...3a5{i}</p>
                  <div className="w-full bg-zinc-800 h-1 rounded-full mt-1">
                    <div className="bg-emerald-500 h-1 rounded-full" style={{width: `${90 - i * 15}%`}}></div>
                  </div>
                </div>
                <p className="text-[10px] font-mono font-black text-zinc-100">{2000 - i * 250} RAT</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
