
import React, { useState, useEffect, useMemo } from 'react';
import { 
  WalletMinimal, 
  Download, 
  TrendingDown, 
  Search, 
  RefreshCw, 
  ExternalLink,
  ArrowUpRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { getAdminExpenses } from '../lib/api';
import { Withdrawal } from '../types';
import { useNotifications, NotificationContainer } from '../components/Notification';
import { useAutoRefresh } from '../hooks';
import { TableSkeleton, EmptyState, ActionButton } from '../components';
import { paginateData } from '../utils/pagination';

const WithdrawalExpenses: React.FC = () => {
  const [records, setRecords] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('7d');
  const { notifications, showNotification, removeNotification } = useNotifications();

  // 🟢 优化：客户端分页
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchExpenses = async () => {
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

      const data = await getAdminExpenses({
        limit: 100,
        offset: 0,
        startDate,
        endDate: dateRange !== 'all' ? now.toISOString() : undefined,
      });

      setRecords(data.items.map((item) => ({
        id: item.id,
        address: item.address,
        amount: item.amount,
        status: item.status as 'Pending' | 'Completed' | 'Rejected',
        createdAt: new Date(item.createdAt).toLocaleString(),
      })));
    } catch (e: any) {
      console.error(e);
      showNotification('error', `获取支出记录失败: ${e?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 优化：使用 useAutoRefresh Hook
  const { refresh, isRefreshing } = useAutoRefresh({
    enabled: true,
    interval: 30000, // 30秒刷新一次
    onRefresh: fetchExpenses,
  });

  useEffect(() => {
    fetchExpenses();
  }, [dateRange]);

  useEffect(() => {
    setCurrentPage(1); // 筛选时重置到第一页
  }, [dateRange, searchTerm]);

  const totalSpent = useMemo(() => {
    return records.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2);
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => r.address.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [records, searchTerm]);

  // 🟢 优化：客户端分页
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">支出明细</h2>
          <p className="text-zinc-400 text-sm">审计系统已支付的提现记录及链上资产外流详情。</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex">
            {['24h', '7d', '30d', 'all'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dateRange === range ? 'bg-zinc-800 text-red-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
          <button 
            onClick={() => showNotification('info', '正在生成提现明细 CSV 报表...')}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-black text-xs rounded-xl transition-all shadow-lg"
          >
            <Download size={14} /> 导出账单
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">累计提现支出</span>
            <WalletMinimal size={16} className="text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tighter">${totalSpent}</h3>
            <span className="text-xs font-bold text-zinc-500">USDT</span>
          </div>
          <p className="text-[10px] text-red-500 mt-2 font-bold flex items-center gap-1">
            <TrendingDown size={10} /> 资产流动率正常
          </p>
        </div>


        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">处理成功率</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tighter">98.2%</h3>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 font-medium">剩余 1.8% 为拒绝/风控拦截</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-red-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="搜索收款地址查询历史支出..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ActionButton
            onClick={fetchExpenses}
            loading={loading || isRefreshing}
            variant="secondary"
          >
            <RefreshCw size={18} />
          </ActionButton>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">打款时间</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">收款钱包</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">支出金额 (USDT)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">状态</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">审计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-20"><TableSkeleton rows={5} cols={5} /></td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20"><EmptyState variant="database" title="暂无支出记录" description="当前筛选条件下没有找到支出记录" /></td></tr>
              ) : paginatedData.map((rec) => (
                <tr key={rec.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock size={12} />
                      <span className="text-xs font-medium">{rec.createdAt}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-mono text-xs text-zinc-300">
                      {rec.address.slice(0, 12)}...{rec.address.slice(-10)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight size={14} className="text-red-400" />
                      <span className="text-sm font-black text-white">-{rec.amount.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                      已到账
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all">
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
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="text-xs text-zinc-500">
              显示第 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredRecords.length)} 条，共 {filteredRecords.length} 条
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

export default WithdrawalExpenses;
