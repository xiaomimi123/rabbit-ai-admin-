
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FinanceOps from './pages/FinanceOps';
import OperationRecords from './pages/OperationRecords';
import RevenuePage from './pages/Revenue';
import WithdrawalExpenses from './pages/WithdrawalExpenses';
import YieldStrategy from './pages/YieldStrategy';
import UsersPage from './pages/Users';
import SystemConfigPage from './pages/SystemConfig';
import { setAdminKey, getAdminKey } from './lib/api';
import { Rabbit, Key } from 'lucide-react';

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [inputKey, setInputKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      setAdminKey(inputKey);
      onLogin();
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono tracking-widest"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              autoFocus
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm rounded-2xl transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98]"
          >
            授权进入系统
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

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
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
          <Route path="/system" element={<SystemConfigPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
