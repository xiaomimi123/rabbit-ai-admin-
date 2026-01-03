import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Users, Clock, MapPin, Monitor, Smartphone, RefreshCw, Filter, Download } from 'lucide-react';
import { getVisitStats, getVisitSummary } from '../lib/api';

interface VisitItem {
  id: number;
  ip_address: string;
  country: string;
  country_code: string;
  city: string | null;
  user_agent: string;
  page_path: string;
  wallet_address: string | null;
  referrer: string | null;
  language: string | null;
  is_mobile: boolean;
  session_id: string;
  created_at: string;
}

interface CountryDistribution {
  name: string;
  code: string;
  count: number;
}

const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<{
    totalVisits: number;
    todayVisits: number;
    walletVisits: number;
    countryDistribution: CountryDistribution[];
  } | null>(null);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  
  // 筛选条件
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getVisitSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setSummary(data);
    } catch (error) {
      console.error('获取访问统计摘要失败:', error);
    }
  }, [startDate, endDate]);

  const fetchVisits = useCallback(async () => {
    setLoadingVisits(true);
    try {
      const data = await getVisitStats({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        country: selectedCountry || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setVisits(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('获取访问记录失败:', error);
    } finally {
      setLoadingVisits(false);
    }
  }, [page, pageSize, selectedCountry, startDate, endDate]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchVisits()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSummary, fetchVisits]);

  const handleRefresh = () => {
    fetchSummary();
    fetchVisits();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCountryFlag = (code: string) => {
    // 简单的国家代码到国旗 emoji 的映射（主要国家）
    const flags: Record<string, string> = {
      'CN': '🇨🇳', 'US': '🇺🇸', 'JP': '🇯🇵', 'KR': '🇰🇷',
      'GB': '🇬🇧', 'FR': '🇫🇷', 'DE': '🇩🇪', 'RU': '🇷🇺',
      'IN': '🇮🇳', 'BR': '🇧🇷', 'CA': '🇨🇦', 'AU': '🇦🇺',
    };
    return flags[code] || '🌍';
  };

  if (loading && !summary) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">访问统计</h2>
          <p className="text-zinc-400 text-sm">查看用户访问前端的详细数据（IP、国家、时间等）</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-all"
        >
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Users className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">总访问量</p>
                <h3 className="text-2xl font-bold text-white">{summary.totalVisits.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Clock className="text-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">今日访问</p>
                <h3 className="text-2xl font-bold text-white">{summary.todayVisits.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <Users className="text-indigo-400" size={20} />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">已连接钱包</p>
                <h3 className="text-2xl font-bold text-white">{summary.walletVisits.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Globe className="text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">国家数量</p>
                <h3 className="text-2xl font-bold text-white">{summary.countryDistribution.length}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 国家分布 */}
      {summary && summary.countryDistribution.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-400" />
            国家分布（Top 10）
          </h3>
          <div className="space-y-3">
            {summary.countryDistribution.map((country, index) => {
              const maxCount = summary.countryDistribution[0]?.count || 1;
              const percentage = (country.count / maxCount) * 100;
              return (
                <div key={`${country.code}_${index}`} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg">
                    {getCountryFlag(country.code)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-zinc-300 truncate">{country.name}</p>
                      <p className="text-xs font-bold text-zinc-400 ml-2">{country.count.toLocaleString()}</p>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-zinc-400" />
          <h3 className="text-lg font-semibold text-white">筛选条件</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">国家</label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setPage(1); // 重置到第一页
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">全部国家</option>
              {summary?.countryDistribution.map((country) => (
                <option key={country.code} value={country.name}>
                  {country.name} ({country.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 访问记录列表 */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">访问记录</h3>
          <p className="text-sm text-zinc-400">共 {total.toLocaleString()} 条记录</p>
        </div>
        
        {loadingVisits ? (
          <div className="p-8 text-center text-zinc-500">加载中...</div>
        ) : visits.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">暂无访问记录</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">时间</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">IP地址</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">国家</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">城市</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">设备</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">钱包地址</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">页面路径</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-zinc-300 whitespace-nowrap">
                        {formatDate(visit.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-zinc-400">
                        {visit.ip_address || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        <div className="flex items-center gap-2">
                          <span>{getCountryFlag(visit.country_code || 'XX')}</span>
                          <span>{visit.country || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {visit.city || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        <div className="flex items-center gap-1">
                          {visit.is_mobile ? (
                            <>
                              <Smartphone size={14} />
                              <span>移动</span>
                            </>
                          ) : (
                            <>
                              <Monitor size={14} />
                              <span>桌面</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-zinc-400">
                        {visit.wallet_address ? (
                          <span className="text-emerald-400">
                            {visit.wallet_address.slice(0, 6)}...{visit.wallet_address.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">未连接</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {visit.page_path || '/'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {total > pageSize && (
              <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-lg transition-all"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-zinc-400">
                    第 {page} / {Math.ceil(total / pageSize)} 页
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                    disabled={page >= Math.ceil(total / pageSize)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 text-sm rounded-lg transition-all"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;

