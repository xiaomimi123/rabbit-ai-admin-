
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
  Network
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
      {/* 移动端菜单切换 */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 rounded-md border border-zinc-800"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
        <header className="h-16 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">管理后台</span>
            <ChevronRight size={14} className="text-zinc-600" />
            <span className="font-medium">{getPageTitle(location.pathname)}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
              isAdminKeySet 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {isAdminKeySet ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              {isAdminKeySet ? '管理员密钥已激活' : '需要配置密钥'}
            </div>
          </div>
        </header>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
