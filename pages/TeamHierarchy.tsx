import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users, ArrowUp, ArrowDown, Copy, ExternalLink, Zap, UserPlus, Calendar } from 'lucide-react';
import { getUserTeam } from '../lib/api';
import { useNotifications, NotificationContainer } from '../components/Notification';
import { Loading, EmptyState, ActionButton } from '../components';
import { usePagination } from '../hooks';

interface TeamMember {
  address: string;
  energyTotal: string;
  inviteCount: string;
  registeredAt: string;
}

const TeamHierarchy: React.FC = () => {
  const [searchAddress, setSearchAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<TeamMember | null>(null);
  const [upline, setUpline] = useState<TeamMember | null>(null);
  const [downline, setDownline] = useState<TeamMember[]>([]);
  const [totalDownline, setTotalDownline] = useState(0);
  const { notifications, showNotification, removeNotification } = useNotifications();
  const pagination = usePagination({ pageSize: 50 }); // 🟢 使用分页 Hook，每页 50 条
  const currentAddressRef = useRef<string>(''); // 🟢 记录当前查询的地址

  // 🟢 修复：分离查询逻辑，避免依赖项问题
  const fetchTeamData = useCallback(async (address: string, limit: number, offset: number, isPageChange = false) => {
    setLoading(true);
    try {
      const data = await getUserTeam(address, {
        limit,
        offset,
      });
      if (data.ok) {
        setTarget(data.target);
        setUpline(data.upline);
        setDownline(data.downline || []);
        pagination.setTotal(data.total || 0); // 🟢 设置总数
        setTotalDownline(data.total || 0);
        if (!isPageChange) {
          showNotification('success', '查询成功');
        }
      }
    } catch (e: any) {
      const errorMsg = e?.message || '查询失败';
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        showNotification('error', '用户不存在');
        setTarget(null);
        setUpline(null);
        setDownline([]);
        setTotalDownline(0);
        pagination.reset();
        currentAddressRef.current = '';
      } else {
        showNotification('error', `查询失败: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  }, [pagination, showNotification]);

  const handleSearch = useCallback(async () => {
    const address = searchAddress.trim().toLowerCase();
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      showNotification('error', '请输入有效的钱包地址（0x开头，42字符）');
      return;
    }

    // 🟢 如果是地址变化，重置分页到第一页
    if (currentAddressRef.current !== address) {
      pagination.reset();
      currentAddressRef.current = address;
    }

    // 使用第一页的数据（offset = 0）
    await fetchTeamData(address, pagination.pageSize, 0, false);
  }, [searchAddress, pagination, fetchTeamData, showNotification]);

  // 🟢 分页变化时重新加载数据
  useEffect(() => {
    const address = currentAddressRef.current;
    if (address) {
      // 计算当前页的 offset
      const offset = (pagination.page - 1) * pagination.pageSize;
      // 使用最新的 offset 和 pageSize
      fetchTeamData(
        address,
        pagination.pageSize,
        offset,
        true // 分页变化，不显示成功提示
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize]); // 🟢 依赖 page 和 pageSize

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    showNotification('success', '地址已复制');
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const MemberCard: React.FC<{ member: TeamMember; title: string; icon: React.ReactNode }> = ({ member, title, icon }) => (
    <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">地址</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-zinc-300">{formatAddress(member.address)}</span>
            <button
              onClick={() => copyAddress(member.address)}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              title="复制地址"
            >
              <Copy size={14} className="text-zinc-500 hover:text-zinc-300" />
            </button>
            <a
              href={`https://bscscan.com/address/${member.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              title="在 BSCScan 查看"
            >
              <ExternalLink size={14} className="text-zinc-500 hover:text-emerald-400" />
            </a>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">总能量</span>
          <div className="flex items-center gap-1">
            <Zap size={14} className="text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{Math.floor(member.energyTotal)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">邀请人数</span>
          <div className="flex items-center gap-1">
            <UserPlus size={14} className="text-blue-400" />
            <span className="text-sm font-bold text-blue-400">{member.inviteCount}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">注册时间</span>
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-400">{new Date(member.registeredAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-1">团队关系查询</h1>
          <p className="text-sm text-zinc-500">查询用户的上级推荐人和下级团队成员</p>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="输入钱包地址 (0x...)"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-sm"
            />
          </div>
          <ActionButton
            onClick={handleSearch}
            loading={loading}
            variant="primary"
          >
            <Search size={18} />
            查询
          </ActionButton>
        </div>
      </div>

      {/* 结果展示 */}
      {target && (
        <div className="space-y-6">
          {/* 上级 */}
          {upline && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <ArrowUp className="text-blue-400" size={20} />
                上级推荐人
              </h2>
              <MemberCard member={upline} title="推荐人" icon={<ArrowUp size={16} className="text-blue-400" />} />
            </div>
          )}

          {/* 目标用户 */}
          <div>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Users className="text-emerald-400" size={20} />
              目标用户
            </h2>
            <MemberCard member={target} title="当前用户" icon={<Users size={16} className="text-emerald-400" />} />
          </div>

          {/* 下级团队 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowDown className="text-purple-400" size={20} />
                下级团队 ({totalDownline} 人)
              </h2>
              {/* 🟢 分页控件 */}
              {totalDownline > pagination.pageSize && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-500">
                    显示第 {pagination.offset + 1}-{Math.min(pagination.offset + pagination.pageSize, totalDownline)} 条，
                    共 {totalDownline} 条
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={pagination.prevPage}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                    >
                      上一页
                    </button>
                    <span className="text-sm text-zinc-400 min-w-[80px] text-center">
                      第 {pagination.page} / {pagination.totalPages} 页
                    </span>
                    <button
                      onClick={pagination.nextPage}
                      disabled={!pagination.hasNext}
                      className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
            {downline.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {downline.map((member, index) => (
                  <div key={member.address} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-400">#{index + 1}</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-400">团队成员</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyAddress(member.address)}
                          className="p-1 hover:bg-zinc-800 rounded transition-colors"
                          title="复制地址"
                        >
                          <Copy size={12} className="text-zinc-500 hover:text-zinc-300" />
                        </button>
                        <a
                          href={`https://bscscan.com/address/${member.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-zinc-800 rounded transition-colors"
                          title="在 BSCScan 查看"
                        >
                          <ExternalLink size={12} className="text-zinc-500 hover:text-emerald-400" />
                        </a>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">地址</span>
                        <span className="text-xs font-mono text-zinc-300">{formatAddress(member.address)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">总能量</span>
                        <div className="flex items-center gap-1">
                          <Zap size={12} className="text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-400">{member.energyTotal}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">邀请人数</span>
                        <div className="flex items-center gap-1">
                          <UserPlus size={12} className="text-blue-400" />
                          <span className="text-xs font-bold text-blue-400">{member.inviteCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">注册时间</span>
                        <span className="text-xs text-zinc-400">{new Date(member.registeredAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState variant="database" title="暂无下级团队成员" description="该用户还没有邀请任何下级成员" />
            )}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!target && !loading && (
        <EmptyState variant="search" title="请输入钱包地址进行查询" description="支持查询用户的上级推荐人和下级团队成员关系" />
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loading type="spinner" message="查询中..." />
        </div>
      )}
    </div>
  );
};

export default TeamHierarchy;

