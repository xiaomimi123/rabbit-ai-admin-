import React, { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getAdminKey, setAdminKey } from '../lib/api';
import Dashboard from '../pages/Dashboard';
import FinanceOps from '../pages/FinanceOps';
import Users from '../pages/Users';
import SystemConfig from '../pages/SystemConfig';
import Accounting from './pages/Accounting';
import { 
  LayoutDashboard, 
  DollarSign, 
  Settings, 
  User, 
  BookOpen,
  Key,
  X,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [key, setKey] = useState(getAdminKey() || '');
  const [open, setOpen] = useState(!getAdminKey());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAdminKey()) setOpen(true);
  }, []);

  const selected = useMemo(() => {
    if (location.pathname.startsWith('/finance')) return 'finance';
    if (location.pathname.startsWith('/users')) return 'users';
    if (location.pathname.startsWith('/system')) return 'system';
    if (location.pathname.startsWith('/accounting')) return 'accounting';
    return 'dashboard';
  }, [location.pathname]);

  const handleSaveKey = () => {
    if (!key.trim()) {
      setError('请输入 ADMIN_API_KEY');
      return;
    }
    setAdminKey(key.trim());
    setOpen(false);
    setError(null);
    navigate('/');
    // 刷新页面以应用新的 key
    window.location.reload();
  };

  const menuItems = [
    { key: 'dashboard', name: '仪表盘', icon: LayoutDashboard, path: '/' },
    { key: 'finance', name: '财务审核', icon: DollarSign, path: '/finance' },
    { key: 'accounting', name: '财务流水', icon: BookOpen, path: '/accounting' },
    { key: 'users', name: '用户管理', icon: User, path: '/users' },
    { key: 'system', name: '系统设置', icon: Settings, path: '/system' },
  ];

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] overflow-hidden">
      {/* 侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-[#09090b] border-r border-zinc-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <LayoutDashboard className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Rabbit Admin</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">管理后台</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = selected === item.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-900 text-emerald-400 border border-zinc-800 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-64">
        {/* 顶部导航栏 */}
        <header className="bg-[#09090b] border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-lg">管理后台</div>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition-colors text-sm font-medium"
          >
            设置 Admin Key
          </button>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/finance" element={<FinanceOps />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/users" element={<Users />} />
            <Route path="/system" element={<SystemConfig />} />
          </Routes>
        </main>
      </div>

      {/* Admin Key 设置模态框 */}
      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">输入 ADMIN_API_KEY</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setError(null);
                  }}
                  placeholder="Render 环境变量 ADMIN_API_KEY"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveKey();
                    }
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="text-xs text-zinc-500">
                该 Key 只保存在你的浏览器本地，不会上传到任何地方。
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveKey}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition-colors text-sm font-bold"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
