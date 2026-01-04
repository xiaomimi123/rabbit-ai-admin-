
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Copy, 
  ExternalLink, 
  X, 
  Plus, 
  Minus, 
  History, 
  Award, 
  Users, 
  Clock, 
  Zap, 
  Gift, 
  ChevronRight,
  Send,
  Bell,
  MessageSquare,
  RefreshCw,
  UserPlus,
  AlertCircle,
  Gem,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { getAdminUserList, getAdminUser, adjustUserAsset, sendUserNotification, getRatBalance, getUserEarnings } from '../lib/api';
import { User, Withdrawal, ClaimRecord, Message } from '../types';
import { useNotifications, NotificationContainer } from '../components/Notification';
import { useAutoRefresh } from '../hooks';
import { Loading, EmptyState, TableSkeleton } from '../components';
import { paginateData } from '../utils/pagination';

// 扩展 User 类型，添加 RAT 余额字段
interface UserWithRatBalance extends User {
  ratBalance?: number;
  ratLocked?: number;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithRatBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 🟢 新增：区分初始加载和刷新
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRatBalance | null>(null);
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'energy' | 'airdrops' | 'messages'>('energy');
  
  // 详情数据状态
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [energyClaims, setEnergyClaims] = useState<ClaimRecord[]>([]);
  const [airdropClaims, setAirdropClaims] = useState<any[]>([]);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // 私信表单状态 (针对单个用户)
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  
  
  // 资产调整状态
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  
  // 通知系统
  const { notifications, showNotification, removeNotification } = useNotifications();

  // 使用 useRef 跟踪上次加载的地址和标签，避免重复调用
  const lastFetchedAddressRef = useRef<string | null>(null);
  const lastFetchedTabRef = useRef<string | null>(null);
  
  // 当选中用户或标签页变化时，重新加载数据
  useEffect(() => {
    if (selectedUser) {
      const addressChanged = selectedUser.address !== lastFetchedAddressRef.current;
      const tabChanged = activeTab !== lastFetchedTabRef.current;
      
      if (addressChanged || tabChanged) {
        lastFetchedAddressRef.current = selectedUser.address;
        lastFetchedTabRef.current = activeTab;
        fetchUserDetails();
      }
    }
  }, [selectedUser?.address, activeTab]); // 只依赖 address 而不是整个对象

  const fetchUsers = async (isRefresh = false) => {
    // 🟢 修复：只在初始加载时显示骨架屏，刷新时不显示
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const data = await getAdminUserList({
        limit: 100,
        offset: 0,
        search: searchTerm || undefined,
      });
      
      // 初始化用户列表，RAT 余额稍后异步获取
      const usersList = data.items.map((item) => ({
        address: item.address,
        energyTotal: item.energyTotal,
        energyLocked: item.energyLocked,
        inviteCount: item.inviteCount,
        referrer: item.referrer,
        registeredAt: new Date(item.registeredAt).toLocaleString(),
        lastActive: new Date(item.lastActive).toLocaleString(),
        usdtBalance: item.usdtBalance,
        ratBalance: undefined as number | undefined,
        ratLocked: 0, // RAT 锁定余额暂时设为 0，后续可以从数据库获取
      }));
      
      // 🟢 优化：先显示用户列表，不等待 RAT 余额加载
      setUsers(usersList);
      setLoading(false); // 立即关闭 loading，让用户看到列表
      setIsInitialLoad(false); // 🟢 修复：标记初始加载完成
      
      // 异步获取每个用户的 RAT 余额（从链上读取）
      // 使用 Promise.allSettled 避免单个失败影响整体
      // 注意：这里不阻塞 loading 状态，让用户先看到列表
      const ratBalancePromises = usersList.map(async (user) => {
        try {
          const ratData = await getRatBalance(user.address);
          return {
            address: user.address,
            balance: parseFloat(ratData.balance),
          };
        } catch (e) {
          console.warn(`Failed to fetch RAT balance for ${user.address}:`, e);
          return {
            address: user.address,
            balance: 0,
          };
        }
      });
      
      // 后台异步更新 RAT 余额，不阻塞 UI
      Promise.allSettled(ratBalancePromises).then((ratBalances) => {
        // 更新用户列表中的 RAT 余额
        setUsers((prevUsers) =>
          prevUsers.map((user) => {
            const index = usersList.findIndex((u) => u.address === user.address);
            if (index >= 0 && index < ratBalances.length) {
              const result = ratBalances[index];
              if (result.status === 'fulfilled') {
                return { ...user, ratBalance: result.value.balance };
              }
            }
            return { ...user, ratBalance: user.ratBalance ?? 0 };
          })
        );
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchUserDetails = async () => {
    if (!selectedUser) return;
    setDetailsLoading(true);
    try {
      // 🟢 修复：同时获取用户基本信息和实时收益（与前端使用相同的计算逻辑）
      const [data, earningsData] = await Promise.all([
        getAdminUser(selectedUser.address),
        getUserEarnings(selectedUser.address).catch(() => null) // 如果失败，返回 null
      ]);
      
      if (data.user) {
        // 使用函数式更新，避免依赖 selectedUser 对象本身
        setSelectedUser((prev) => {
          if (!prev) return prev;
          // 🟢 修复：使用实时计算的收益（与前端一致），如果获取失败则回退到数据库值
          // earningsData 格式：{ ok: true, pendingUsdt: string, ... }
          const usdtBalance = earningsData && earningsData.ok
            ? parseFloat(earningsData.pendingUsdt || '0') 
            : parseFloat(data.user.usdtTotal || '0') - parseFloat(data.user.usdtLocked || '0');
          
          return {
            ...prev,
            energyTotal: parseFloat(data.user.energyTotal),
            energyLocked: parseFloat(data.user.energyLocked),
            inviteCount: parseInt(data.user.inviteCount),
            usdtBalance: usdtBalance, // 更新可提现 USDT 余额（实时计算）
          };
        });
      }
      
      // ✅ 修复：无论当前标签是什么，都加载所有数据
      // 这样切换标签时就能立即显示数据，不需要重新加载
      if (data.withdrawals && data.withdrawals.length > 0) {
        setWithdrawals(data.withdrawals.map((w: any) => ({
          id: w.id,
          address: selectedUser.address,
          amount: parseFloat(w.amount),
          status: w.status as 'Pending' | 'Completed' | 'Rejected',
          createdAt: new Date(w.createdAt).toLocaleString(),
        })));
      } else {
        setWithdrawals([]);
      }
      
      if (data.claims && data.claims.length > 0) {
        setAirdropClaims(data.claims.map((c: any) => ({
          id: c.txHash,
          amount: parseFloat(c.amount),
          type: '空投领取',
          timestamp: new Date(c.createdAt).toLocaleString(),
        })));
      } else {
        setAirdropClaims([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !msgTitle || !msgContent) return;
    setIsSendingMsg(true);
    try {
      await sendUserNotification({
        address: selectedUser.address,
        title: msgTitle,
        content: msgContent,
        type: 'SYSTEM',
      });
      showNotification('success', '私信已发送');
      setMsgTitle('');
      setMsgContent('');
    } catch (e: any) {
      showNotification('error', e.message || '发送失败');
    } finally {
      setIsSendingMsg(false);
    }
  };


  const handleAdjustAsset = async (asset: 'RAT' | 'USDT', action: 'add' | 'sub') => {
    if (!selectedUser || !adjustAmount) return;
    setIsAdjusting(true);
    try {
      await adjustUserAsset({
        address: selectedUser.address,
        asset,
        action,
        amount: adjustAmount,
      });
      showNotification('success', `${asset} 资产已${action === 'add' ? '增加' : '扣除'}: ${adjustAmount}`);
      setAdjustAmount('');
      fetchUsers(true); // 🟢 修复：资产调整后刷新，不显示骨架屏
      if (selectedUser) {
        fetchUserDetails();
      }
    } catch (e: any) {
      showNotification('error', e.message || '调整失败');
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    // 搜索已经在API层面处理，这里直接返回users
    return users;
  }, [users]);

  // 🟢 优化：客户端分页
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { paginatedData, totalPages } = useMemo(() => {
    return paginateData(filteredUsers, currentPage, itemsPerPage);
  }, [filteredUsers, currentPage]);

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

  // 当搜索词变化时，重新获取用户列表
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(true); // 🟢 修复：搜索时重新标记为初始加载
      fetchUsers(false);
    }, 500); // 防抖
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1); // 搜索时重置到第一页
  }, [searchTerm]);

  // 🟢 优化：使用 useAutoRefresh Hook
  const { refresh, isRefreshing } = useAutoRefresh({
    enabled: true,
    interval: 30000, // 30秒刷新一次
    immediate: false, // 🟢 修复：不立即执行，避免与初始加载冲突
    onRefresh: () => fetchUsers(true), // 🟢 修复：传递 isRefresh=true，不显示骨架屏
  });

  useEffect(() => {
    fetchUsers(false); // 🟢 修复：初始加载
  }, []);

  const truncateAddress = (addr: string | null) => {
    if (!addr) return '无';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    showNotification('success', '地址已复制到剪贴板');
  };

  return (
    <div className="space-y-6 relative overflow-hidden h-full flex flex-col">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">用户管理</h2>
          <p className="text-zinc-400 text-sm">监控用户 RAT 持仓与 USDT 收益状态。</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative group flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="输入钱包地址搜索"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="overflow-x-auto h-full scroll-smooth">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#09090b] z-10">
              <tr className="border-b border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">用户</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">RAT 持仓/能量值</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">邀请人数</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading && isInitialLoad ? (
                <tr><td colSpan={4} className="px-6 py-20"><TableSkeleton rows={5} cols={4} /></td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-20"><EmptyState variant="database" title="暂无用户" description="当前搜索条件下没有找到用户" /></td></tr>
              ) : paginatedData.map((user) => (
                <tr key={user.address} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-black text-emerald-500">
                        {user.address.substring(2, 4).toUpperCase()}
                      </div>
                      <p className="text-xs font-mono font-bold text-zinc-200">{truncateAddress(user.address)}</p>
                      <button
                        onClick={() => copyAddress(user.address)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-800 rounded transition-all"
                        title="复制地址"
                      >
                        <Copy size={14} className="text-zinc-500 hover:text-emerald-400" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Gem size={12} className="text-emerald-500" />
                      {user.ratBalance !== undefined ? (
                        <>
                          <span className="text-sm font-black text-emerald-400">{user.ratBalance.toLocaleString()}</span>
                          <span className="text-[10px] text-zinc-600">/ {user.energyTotal} 能量值</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-black text-zinc-500">链上查询中...</span>
                          <span className="text-[10px] text-zinc-600">/ {user.energyTotal} 能量值</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-zinc-300">{user.inviteCount}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-emerald-500 hover:text-zinc-950 text-emerald-500 text-[10px] font-black uppercase rounded-lg border border-emerald-500/20 transition-all"
                    >
                      详情 / 调账
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 优化：分页控件 */}
      {!loading && filteredUsers.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="text-xs text-zinc-500">
            显示第 {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredUsers.length)} 条，共 {filteredUsers.length} 条
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

      {/* 用户详情抽屉 */}
      {selectedUser && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in" 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(null);
            }} 
          />
          <div 
            className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#09090b] border-l border-zinc-800 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight text-white">账户管理</h3>
                <p className="text-[10px] text-zinc-500 font-mono">{selectedUser.address}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-lg"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">能量值</p>
                  <p className="text-3xl font-black text-emerald-400">{selectedUser.energyTotal}</p>
                </div>
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">可提现 USDT</p>
                  <p className="text-3xl font-black text-blue-400">${selectedUser.usdtBalance.toFixed(6)}</p>
                </div>
              </div>

              {/* 资产手动调整 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Award size={16} className="text-emerald-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">资产紧急调账</h4>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
                  <input 
                    type="number" placeholder="输入调整数值..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-lg font-black text-white outline-none focus:border-emerald-500"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-[10px] text-center font-bold text-zinc-600 uppercase tracking-tighter">能量值</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleAdjustAsset('RAT', 'add')} className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/20 rounded-xl text-[10px] font-black transition-all">增加</button>
                        <button onClick={() => handleAdjustAsset('RAT', 'sub')} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 rounded-xl text-[10px] font-black transition-all">扣减</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-center font-bold text-zinc-600 uppercase tracking-tighter">USDT 余额</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleAdjustAsset('USDT', 'add')} className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-zinc-950 border border-blue-500/20 rounded-xl text-[10px] font-black transition-all">增加</button>
                        <button onClick={() => handleAdjustAsset('USDT', 'sub')} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 rounded-xl text-[10px] font-black transition-all">扣减</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 私信 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Bell size={16} className="text-yellow-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">发送个人通知</h4>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4">
                  <input 
                    type="text" placeholder="通知标题..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                  />
                  <textarea 
                    placeholder="请输入详细通知内容..."
                    className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none"
                    value={msgContent}
                    onChange={(e) => setMsgContent(e.target.value)}
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-black text-[10px] uppercase rounded-xl transition-all"
                  >
                    发送私信
                  </button>
                </div>
              </div>

              {/* 历史记录 */}
              <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/20">
                <div className="flex bg-zinc-900/50 border-b border-zinc-800 p-1">
                  {['withdrawals', 'airdrops'].map((tab) => (
                    <button 
                      key={tab}
                      className={`flex-1 py-2 text-[10px] font-black tracking-widest uppercase transition-all rounded-lg ${
                        activeTab === tab ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500'
                      }`}
                      onClick={() => setActiveTab(tab as any)}
                    >
                      {tab === 'withdrawals' ? '提现记录' : '空投记录'}
                    </button>
                  ))}
                </div>
                <div className="p-4 min-h-[160px] max-h-[300px] overflow-y-auto">
                  {detailsLoading ? (
                    <Loading type="spinner" />
                  ) : activeTab === 'withdrawals' ? (
                    withdrawals.length > 0 ? (
                      <div className="space-y-2">
                        {withdrawals.map((w) => (
                          <div key={w.id} className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-300">{w.amount} USDT</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                w.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                w.status === 'Rejected' ? 'bg-red-500/10 text-red-400' :
                                'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                {w.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">{w.createdAt}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState variant="database" title="暂无提现记录" description="该用户还没有提现记录" />
                    )
                  ) : activeTab === 'airdrops' ? (
                    airdropClaims.length > 0 ? (
                      <div className="space-y-2">
                        {airdropClaims.map((c) => (
                          <div key={c.id} className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-400">{c.amount} RAT</span>
                              <span className="text-[10px] text-zinc-500">{c.type}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">{c.timestamp}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState variant="database" title="暂无空投记录" description="该用户还没有空投记录" />
                    )
                  ) : (
                    <EmptyState variant="database" title="暂无记录" description="该用户还没有相关记录" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 广播通知模态框 */}
    </div>
  );
};

export default UsersPage;
