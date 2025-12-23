
import React, { useState, useEffect, useMemo } from 'react';
// Added RefreshCw to imports
import { Search, Filter, ArrowUpRight, ArrowDownLeft, ExternalLink, Calendar, CheckCircle2, Clock, XCircle, Copy, RefreshCw } from 'lucide-react';
import { getAdminOperationRecords } from '../lib/api';
import { OperationRecord } from '../types';

const OperationRecords: React.FC = () => {
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Withdrawal' | 'AirdropClaim'>('all');

  useEffect(() => {
    fetchRecords();
  }, [typeFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await getAdminOperationRecords({
        limit: 100,
        offset: 0,
        type: typeFilter === 'all' ? undefined : typeFilter,
      });
      setRecords(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const matchSearch = rec.address.toLowerCase().includes(searchTerm.toLowerCase()) || rec.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'all' || rec.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [records, searchTerm, typeFilter]);

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'Success': return <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={10} /> 成功</span>;
      case 'Pending': return <span className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><Clock size={10} /> 待处理</span>;
      case 'Rejected': return <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><XCircle size={10} /> 已拒绝</span>;
      default: return <span className="text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">操作记录</h2>
          <p className="text-zinc-400 text-sm">审计全量用户的提现与空投领取流水。</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchRecords}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
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
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-zinc-500 animate-pulse">正在同步审计记录...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-zinc-500">暂无相关操作记录。</td></tr>
              ) : filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-zinc-400">{rec.id}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <Calendar size={10} />
                        {rec.timestamp}
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
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <ArrowDownLeft size={14} />
                          <span className="text-xs font-bold">空投领取</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black ${rec.type === 'Withdrawal' ? 'text-zinc-100' : 'text-emerald-500'}`}>
                      {rec.amount}
                    </span>
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
    </div>
  );
};

export default OperationRecords;
