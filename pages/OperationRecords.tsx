
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpRight, ArrowDownLeft, ExternalLink, Calendar, CheckCircle2, Clock, XCircle, Copy, RefreshCw, Plus, Minus } from 'lucide-react';
import { getAdminOperationRecords } from '../lib/api';
import { OperationRecord } from '../types';
import { useAutoRefresh } from '../hooks';
import { TableSkeleton, EmptyState, ActionButton, useNotifications, NotificationContainer } from '../components';
import { paginateData } from '../utils/pagination';

const OperationRecords: React.FC = () => {
  const { notifications, showNotification, removeNotification } = useNotifications();
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 🟢 新增：区分初始加载和刷新
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Withdrawal' | 'AirdropClaim' | 'AddUSDT' | 'DeductUSDT' | 'AddEnergy' | 'DeductEnergy'>('all');

  // 🟢 优化：客户端分页
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchRecords = async (isRefresh = false) => {
    // 🟢 修复：只在初始加载时显示骨架屏，刷新时不显示
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const data = await getAdminOperationRecords({
        limit: 100,
        offset: 0,
        type: typeFilter === 'all' ? undefined : typeFilter,
      });
      setRecords(data.items);
    } catch (e: any) {
      console.error(e);
      showNotification('error', `获取操作记录失败: ${e?.message || '未知错误'}`);
    } finally {
      setLoading(false);
      setIsInitialLoad(false); // 🟢 修复：标记初始加载完成
    }
  };

  // 🟢 优化：使用 useAutoRefresh Hook
  const { refresh, isRefreshing } = useAutoRefresh({
    enabled: true,
    interval: 30000, // 30秒刷新一次
    immediate: false, // 🟢 修复：不立即执行，避免与初始加载冲突
    onRefresh: () => fetchRecords(true), // 🟢 修复：传递 isRefresh=true，不显示骨架屏
  });

  useEffect(() => {
    setIsInitialLoad(true); // 🟢 修复：筛选条件变化时，重新标记为初始加载
    fetchRecords(false);
  }, [typeFilter]);

  useEffect(() => {
    setCurrentPage(1); // 筛选时重置到第一页
  }, [typeFilter, searchTerm]);

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const matchSearch = rec.address.toLowerCase().includes(searchTerm.toLowerCase()) || rec.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'all' || rec.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [records, searchTerm, typeFilter]);

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

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // 🟢 修复：时间格式化函数
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      console.warn('[formatTimestamp] Failed to parse timestamp:', timestamp, e);
      return timestamp; // 如果解析失败，返回原始字符串
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'Success': return <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={10} /> 成功</span>;
      case 'Pending': return <span className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><Clock size={10} /> 待处理</span>;
      case 'Rejected': return <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><XCircle size={10} /> 已拒绝</span>;
      default: return <span className="text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <>
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">操作记录</h2>
            <p className="text-zinc-400 text-sm">审计全量用户的提现与空投领取流水。</p>
          </div>
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={fetchRecords}
              loading={loading || isRefreshing}
              variant="secondary"
            >
              <RefreshCw size={18} />
            </ActionButton>
          </div>
        </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative group flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="搜索钱包地址或流水编号..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-all text-zinc-300"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">所有类型</option>
            <option value="Withdrawal">USDT 提现</option>
            <option value="AirdropClaim">空投领取</option>
            <option value="AddUSDT">管理员赠送USDT</option>
            <option value="DeductUSDT">管理员扣除USDT</option>
            <option value="AddEnergy">管理员赠送能量值</option>
            <option value="DeductEnergy">管理员扣除能量值</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="overflow-x-auto h-full scroll-smooth">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-950 z-10">
              <tr className="border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">流水编号 / 时间</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">用户</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">操作类型</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">数值</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">链上凭证</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading && isInitialLoad ? (
                <tr><td colSpan={6} className="px-6 py-20"><TableSkeleton rows={5} cols={6} /></td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20"><EmptyState variant="database" title="暂无操作记录" description="当前筛选条件下没有找到操作记录" /></td></tr>
              ) : paginatedData.map((rec) => (
                <tr key={rec.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-zinc-400">{rec.id}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <Calendar size={10} />
                        {formatTimestamp(rec.timestamp)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono truncate">{truncateAddress(rec.address)}</p>
                      <button 
                        onClick={() => navigator.clipboard.writeText(rec.address)}
                        className="text-zinc-600 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {rec.type === 'Withdrawal' ? (
                        <div className="flex items-center gap-2 text-red-400">
                          <ArrowUpRight size={14} />
                          <span className="text-xs font-bold">USDT 提现</span>
                        </div>
                      ) : rec.type === 'AirdropClaim' ? (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <ArrowDownLeft size={14} />
                          <span className="text-xs font-bold">空投领取</span>
                        </div>
                      ) : rec.type === 'AddUSDT' ? (
                        <div className="flex items-center gap-2 text-blue-400">
                          <Plus size={14} />
                          <span className="text-xs font-bold">赠送USDT</span>
                        </div>
                      ) : rec.type === 'DeductUSDT' ? (
                        <div className="flex items-center gap-2 text-orange-400">
                          <Minus size={14} />
                          <span className="text-xs font-bold">扣除USDT</span>
                        </div>
                      ) : rec.type === 'AddEnergy' ? (
                        <div className="flex items-center gap-2 text-purple-400">
                          <Plus size={14} />
                          <span className="text-xs font-bold">赠送能量值</span>
                        </div>
                      ) : rec.type === 'DeductEnergy' ? (
                        <div className="flex items-center gap-2 text-pink-400">
                          <Minus size={14} />
                          <span className="text-xs font-bold">扣除能量值</span>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <span className={`text-sm font-black ${
                        rec.type === 'Withdrawal' ? 'text-zinc-100' : 
                        rec.type === 'AirdropClaim' ? 'text-emerald-500' :
                        rec.type === 'AddUSDT' || rec.type === 'AddEnergy' ? 'text-blue-500' :
                        'text-orange-500'
                      }`}>
                        {rec.amount}
                        {rec.type.includes('USDT') ? ' USDT' : rec.type.includes('Energy') ? ' 能量' : ''}
                      </span>
                      {rec.amountBefore !== undefined && rec.amountAfter !== undefined && (
                        <div className="text-[10px] text-zinc-600">
                          {rec.amountBefore} → {rec.amountAfter}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {rec.txHash ? (
                      <button className="p-2 hover:bg-zinc-800 rounded-lg text-emerald-500 transition-colors" title="在 Explorer 中查看">
                        <ExternalLink size={16} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-700 font-bold uppercase">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </>
  );
};

export default OperationRecords;
