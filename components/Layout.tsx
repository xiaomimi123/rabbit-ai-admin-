
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Settings, 
  LogOut, 
  Rabbit,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Menu,
  X,
  ClipboardList,
  BarChart3,
  WalletMinimal,
  Percent,
  Network,
  Megaphone,
  FileCode,
  BarChart
} from 'lucide-react';
import { getAdminKey } from '../lib/api';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminKeySet, setIsAdminKeySet] = useState(!!getAdminKey());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const checkKey = () => setIsAdminKeySet(!!getAdminKey());
    window.addEventListener('storage', checkKey);
    return () => window.removeEventListener('storage', checkKey);
  }, []);

  const menuItems = [
    { name: '仪表盘', icon: LayoutDashboard, path: '/' },
    { name: '收益明细', icon: BarChart3, path: '/revenue' },
    { name: '支出明细', icon: WalletMinimal, path: '/expenses' },
    { name: '财务审核', icon: Wallet, path: '/finance' },
    { name: '收益策略', icon: Percent, path: '/yield' },
    { name: '操作记录', icon: ClipboardList, path: '/records' },
    { name: '用户管理', icon: Users, path: '/users' },
    { name: '团队关系', icon: Network, path: '/team' },
    { name: '广播通知', icon: Megaphone, path: '/broadcast' },
    { name: '访问统计', icon: BarChart, path: '/analytics' },
    { name: '智能合约设置', icon: FileCode, path: '/contract' },
    { name: '系统设置', icon: Settings, path: '/system' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('RABBIT_ADMIN_KEY');
    navigate('/login');
  };

  const getPageTitle = (path: string) => {
    const item = menuItems.find(i => i.path === path);
    return item ? item.name : '未知页面';
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] overflow-hidden">
      {/* 🟢 移动端遮罩层 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 移动端菜单切换 */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-zinc-900 rounded-lg border border-zinc-800 shadow-lg touch-manipulation active:scale-95 transition-transform"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* 侧边栏 */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#09090b] border-r border-zinc-800 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Rabbit className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Rabbit AI</h1>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">管理后台</p>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation active:scale-95 ${
                    isActive 
                      ? 'bg-zinc-900 text-emerald-400 border border-zinc-800 shadow-sm' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
                  }`}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto border-t border-zinc-800">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-500">AD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">高级管理员</p>
                <p className="text-[10px] text-zinc-500 truncate">活跃会话_01</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* 顶部栏 */}
        <header className="h-16 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
            <span className="text-zinc-500 hidden sm:inline">管理后台</span>
            <ChevronRight size={14} className="text-zinc-600 hidden sm:inline" />
            <span className="font-medium truncate">{getPageTitle(location.pathname)}</span>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-2">
            <div className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full text-[10px] md:text-[11px] font-bold border transition-all whitespace-nowrap ${
              isAdminKeySet 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {isAdminKeySet ? <ShieldCheck size={12} className="md:w-3.5 md:h-3.5 flex-shrink-0" /> : <ShieldAlert size={12} className="md:w-3.5 md:h-3.5 flex-shrink-0" />}
              <span className="hidden sm:inline">{isAdminKeySet ? '管理员密钥已激活' : '需要配置密钥'}</span>
              <span className="sm:hidden">{isAdminKeySet ? '已激活' : '需配置'}</span>
            </div>
          </div>
        </header>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
