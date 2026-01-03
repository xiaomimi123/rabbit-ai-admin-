import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Users, Clock, MapPin, Monitor, Smartphone, RefreshCw, Filter, Download, Database, Trash2, AlertTriangle } from 'lucide-react';
import { getVisitStats, getVisitSummary, getAnalyticsStats, cleanupOldVisits } from '../lib/api';

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

  // 🟢 新增：数据统计和清理状态
  const [stats, setStats] = useState<{
    totalRecords: number;
    oldestRecord: string | null;
    newestRecord: string | null;
    estimatedSize: string;
    recordsByMonth: Array<{ month: string; count: number }>;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);
  const [cleanupResult, setCleanupResult] = useState<{ deletedCount: number; error?: string } | null>(null);

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

  // 🟢 新增：获取数据统计
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getAnalyticsStats();
      setStats(data);
    } catch (error) {
      console.error('获取数据统计失败:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 🟢 新增：清理旧数据
  const handleCleanup = useCallback(async () => {
    if (!confirm(`确定要清理 ${cleanupDays} 天前的数据吗？此操作不可恢复！`)) {
      return;
    }

    setCleaning(true);
    setCleanupResult(null);
    try {
      const result = await cleanupOldVisits(cleanupDays);
      setCleanupResult(result);
      if (result.ok) {
        // 清理成功后刷新数据
        await Promise.all([fetchSummary(), fetchVisits(), fetchStats()]);
      }
    } catch (error) {
      console.error('清理数据失败:', error);
      setCleanupResult({ deletedCount: 0, error: String(error) });
    } finally {
      setCleaning(false);
    }
  }, [cleanupDays, fetchSummary, fetchVisits, fetchStats]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchVisits(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSummary, fetchVisits, fetchStats]);

  const handleRefresh = () => {
    fetchSummary();
    fetchVisits();
    fetchStats();
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

      {/* 🟢 新增：数据统计和清理 */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Database size={20} className="text-blue-400" />
            数据管理
          </h3>
          <button
            onClick={fetchStats}
            disabled={loadingStats}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingStats ? 'animate-spin' : ''} />
            刷新统计
          </button>
        </div>

        {loadingStats ? (
          <div className="text-zinc-400 text-sm">加载中...</div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <p className="text-zinc-400 text-xs mb-1">总记录数</p>
                <p className="text-xl font-bold text-white">{stats.totalRecords.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <p className="text-zinc-400 text-xs mb-1">估算大小</p>
                <p className="text-xl font-bold text-white">{stats.estimatedSize}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <p className="text-zinc-400 text-xs mb-1">数据范围</p>
                <p className="text-sm text-white">
                  {stats.oldestRecord ? new Date(stats.oldestRecord).toLocaleDateString('zh-CN') : 'N/A'} ~ {stats.newestRecord ? new Date(stats.newestRecord).toLocaleDateString('zh-CN') : 'N/A'}
                </p>
              </div>
            </div>

            {stats.recordsByMonth.length > 0 && (
              <div className="mt-4">
                <p className="text-zinc-400 text-xs mb-2">最近 12 个月记录分布</p>
                <div className="space-y-2">
                  {stats.recordsByMonth.slice(0, 6).map((item) => (
                    <div key={item.month} className="flex items-center justify-between">
                      <span className="text-zinc-300 text-sm">{item.month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${Math.min((item.count / (stats.totalRecords || 1)) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-zinc-400 text-xs w-16 text-right">{item.count.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-zinc-700">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-zinc-400 text-xs mb-2">
                    清理 {cleanupDays} 天前的数据
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={cleanupDays}
                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-zinc-500 text-xs mt-1">保留最近 N 天的数据，删除更早的记录</p>
                </div>
                <button
                  onClick={handleCleanup}
                  disabled={cleaning || stats.totalRecords === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cleaning ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      清理中...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      清理旧数据
                    </>
                  )}
                </button>
              </div>

              {cleanupResult && (
                <div className={`mt-4 p-3 rounded-lg ${cleanupResult.error ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                  {cleanupResult.error ? (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertTriangle size={16} />
                      <span>清理失败: {cleanupResult.error}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <span>✅ 成功删除 {cleanupResult.deletedCount.toLocaleString()} 条记录</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-zinc-400 text-sm">暂无统计数据</div>
        )}
      </div>

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

