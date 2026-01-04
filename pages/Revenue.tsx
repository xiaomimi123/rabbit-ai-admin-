
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Search, 
  RefreshCw, 
  ArrowRight,
  ExternalLink,
  Coins
} from 'lucide-react';
import { getAdminRevenue, getRevenueStats } from '../lib/api';
import { RevenueRecord } from '../types';
import { useNotifications, NotificationContainer } from '../components/Notification';
import { useAutoRefresh } from '../hooks';
import { Loading, EmptyState, ActionButton, TableSkeleton } from '../components';
import { paginateData } from '../utils/pagination';

const RevenuePage: React.FC = () => {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<{
    totalRevenue: string;
    trend: string;
    estimatedDaily: string;
    avgFee: string;
  } | null>(null);
  const { notifications, showNotification, removeNotification } = useNotifications();

  // 🟢 优化：使用 useAutoRefresh Hook
  const { refresh, isRefreshing } = useAutoRefresh({
    enabled: true,
    interval: 30000, // 30秒刷新一次
    onRefresh: () => {
      fetchRevenue();
      fetchStats();
    },
  });

  useEffect(() => {
    fetchRevenue();
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      const data = await getRevenueStats();
      setStats(data);
    } catch (e: any) {
      console.error('获取收益统计失败', e);
      showNotification('error', `获取收益统计失败: ${e?.message || '未知错误'}`);
    }
  };

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      // 计算日期范围
      const now = new Date();
      let startDate: string | undefined;
      if (dateRange === '24h') {
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const data = await getAdminRevenue({
        limit: 100,
        offset: 0,
        startDate,
        endDate: dateRange !== 'all' ? now.toISOString() : undefined,
      });

      setRecords(data.items.map((item) => ({
        id: item.id,
        address: item.address,
        feeAmount: item.feeAmount,
        asset: item.asset,
        timestamp: new Date(item.timestamp).toLocaleString(),
        txHash: item.txHash,
      })));
    } catch (e: any) {
      console.error(e);
      showNotification('error', `获取收益记录失败: ${e?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => r.address.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [records, searchTerm]);

  // 🟢 优化：客户端分页
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { paginatedData, totalPages } = useMemo(() => {
    return paginateData(filteredRecords, currentPage, itemsPerPage);
  }, [filteredRecords, currentPage]);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // 搜索时重置到第一页
  }, [searchTerm]);

  const totalRevenue = useMemo(() => {
    // 如果 stats 有数据，优先使用 stats 的 totalRevenue（今日累计）
    // 否则使用当前筛选范围内的记录总和
    if (stats && dateRange === '24h') {
      return stats.totalRevenue;
    }
    return records.reduce((acc, curr) => acc + curr.feeAmount, 0).toFixed(4);
  }, [records, stats, dateRange]);

  const handleExport = () => {
    showNotification('info', '正在准备 CSV 收益报表，请稍候...');
    // 实际逻辑：生成 CSV 并触发下载
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">收益明细</h2>
          <p className="text-zinc-400 text-sm">实时监控空投手续费 (BNB) 收益详情。</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex">
            {['24h', '7d', '30d', 'all'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dateRange === range ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10"
          >
            <Download size={14} /> 导出报表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">累计总收益</span>
            <Coins size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tighter">{totalRevenue}</h3>
            <span className="text-xs font-bold text-zinc-500">BNB</span>
          </div>
          {stats && parseFloat(stats.trend) !== 0 && (
            <p className={`text-[10px] mt-2 font-bold flex items-center gap-1 ${parseFloat(stats.trend) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {parseFloat(stats.trend) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {parseFloat(stats.trend) >= 0 ? '+' : ''}{stats.trend}% 较昨日同期
            </p>
          )}
        </div>

        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">今日预期收益</span>
            <Calendar size={16} className="text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tighter">{stats?.estimatedDaily || '0.000'}</h3>
            <span className="text-xs font-bold text-zinc-500">BNB</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">基于当前采集速率估算</p>
        </div>

        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">平均单笔费率</span>
            <BarChart3 size={16} className="text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tighter">{stats?.avgFee || '0.000'}</h3>
            <span className="text-xs font-bold text-zinc-500">BNB</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">系统标准配置费率</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="搜索用户地址查找收益贡献..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ActionButton
            onClick={() => {
              fetchRevenue();
              fetchStats();
            }}
            loading={loading || isRefreshing}
            variant="secondary"
          >
            <RefreshCw size={18} className={loading || isRefreshing ? 'animate-spin' : ''} />
          </ActionButton>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">时间</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">用户贡献者</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">金额 (BNB)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-20"><TableSkeleton rows={5} cols={4} /></td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-20"><EmptyState variant="database" title="暂无收益记录" description="当前筛选条件下没有找到收益记录" /></td></tr>
              ) : paginatedData.map((rec) => (
                <tr key={rec.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-zinc-400">{rec.timestamp}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                    {rec.address.slice(0, 10)}...{rec.address.slice(-8)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-emerald-400">+{rec.feeAmount}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-emerald-500 transition-all">
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🟢 优化：分页控件 */}
        {!loading && filteredRecords.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-t border-zinc-800">
            <div className="text-xs text-zinc-500">
              显示第 {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredRecords.length)} 条，共 {filteredRecords.length} 条
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-800 border border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
              >
                上一页
              </button>
              <span className="text-xs text-zinc-400 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-800 border border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenuePage;
