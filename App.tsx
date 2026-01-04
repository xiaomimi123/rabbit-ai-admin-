
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import FinanceOps from './pages/FinanceOps';
import OperationRecords from './pages/OperationRecords';
import RevenuePage from './pages/Revenue';
import WithdrawalExpenses from './pages/WithdrawalExpenses';
import YieldStrategy from './pages/YieldStrategy';
import UsersPage from './pages/Users';
import TeamHierarchy from './pages/TeamHierarchy';
import SystemConfigPage from './pages/SystemConfig';
import BroadcastHistoryPage from './pages/BroadcastHistory';
import ContractSettingsPage from './pages/ContractSettings';
import AnalyticsPage from './pages/Analytics';
import { setAdminKey, getAdminKey, verifyAdminKey } from './lib/api';
import { Rabbit, Key, AlertCircle } from 'lucide-react';

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [inputKey, setInputKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = inputKey.trim();
    
    if (!key) {
      setError('请输入管理员密钥');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // 临时设置 key 用于验证
      setAdminKey(key);
      
      // 🟢 修复：使用简单的认证接口验证密钥，不调用 RPC
      // 这样可以避免在登录时触发网络错误
      await verifyAdminKey();
      
      // 验证成功，保存 key 并进入系统
      onLogin();
    } catch (err: any) {
      // 验证失败，清除错误的 key
      setAdminKey('');
      const errorMsg = err?.message || '验证失败';
      if (errorMsg.includes('401') || errorMsg.includes('UNAUTHORIZED') || errorMsg.includes('Invalid admin')) {
        setError('管理员密钥无效，请检查后重试');
      } else if (errorMsg.includes('404')) {
        setError('无法连接到后端服务，请检查网络连接和 API 地址配置');
      } else if (errorMsg.includes('NETWORK_ERROR') || errorMsg.includes('could not detect network')) {
        setError('无法连接到后端服务，请检查网络连接和 API 地址配置');
      } else {
        setError(`验证失败: ${errorMsg}`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-6 relative overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />

      <div className="w-full max-sm relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 mb-6">
            <Rabbit className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white mb-2 uppercase italic">Rabbit Admin</h1>
          <p className="text-zinc-500 text-sm font-medium">输入管理端访问密钥以继续</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="password"
              placeholder="管理员密钥 (Admin Key)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setError(null); // 清除错误信息
              }}
              disabled={isVerifying}
              autoFocus
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          <button 
            type="submit"
            disabled={isVerifying}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-zinc-950 font-black text-sm rounded-2xl transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98]"
          >
            {isVerifying ? '验证中...' : '授权进入系统'}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
          受限访问 &bull; 协议节点 01
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminKey());

  // 监听认证失败事件，自动登出
  React.useEffect(() => {
    const handleAuthFailed = () => {
      setIsAuthenticated(false);
    };
    
    window.addEventListener('admin-auth-failed', handleAuthFailed);
    return () => window.removeEventListener('admin-auth-failed', handleAuthFailed);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/revenue" element={<RevenuePage />} />
            <Route path="/expenses" element={<WithdrawalExpenses />} />
            <Route path="/yield" element={<YieldStrategy />} />
            <Route path="/finance" element={<FinanceOps />} />
            <Route path="/records" element={<OperationRecords />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/team" element={<TeamHierarchy />} />
            <Route path="/broadcast" element={<BroadcastHistoryPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/contract" element={<ContractSettingsPage />} />
            <Route path="/system" element={<SystemConfigPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
