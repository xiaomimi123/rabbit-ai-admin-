import React, { useState, useEffect } from 'react';
import { Settings, History, Save, RefreshCw, AlertCircle, Zap, Wallet, Shield, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { useNotifications, NotificationContainer } from '../components/Notification';
import { 
  configureAutoPayout, 
  getAutoPayoutConfig, 
  getAutoPayoutLogs
} from '../lib/api';
import { Loading, EmptyState, ActionButton } from '../components';

interface AutoPayoutConfig {
  walletAddress: string | null;
  threshold: number;
  enabled: boolean;
  minBalance: number;
  dailyLimit: number | null;
  currentBalance: string;
}

interface AutoPayoutLog {
  id: number;
  withdrawalId: string;
  amount: number;
  txHash: string | null;
  status: 'success' | 'failed' | 'pending';
  errorMessage: string | null;
  createdAt: string;
}

const AutoPayoutConfigPage: React.FC = () => {
  const { notifications, showNotification, removeNotification } = useNotifications();
  
  const [config, setConfig] = useState<AutoPayoutConfig | null>(null);
  const [logs, setLogs] = useState<AutoPayoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  // 表单状态
  const [privateKey, setPrivateKey] = useState('');
  const [threshold, setThreshold] = useState(10);
  const [enabled, setEnabled] = useState(false);
  const [minBalance, setMinBalance] = useState(100);
  const [dailyLimit, setDailyLimit] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // 加载配置
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await getAutoPayoutConfig();
      
      if (data.ok) {
        setConfig(data);
        setThreshold(data.threshold);
        setEnabled(data.enabled);
        setMinBalance(data.minBalance);
        setDailyLimit(data.dailyLimit ? data.dailyLimit.toString() : '');
        // 不加载私钥（安全考虑）
        setPrivateKey('');
      } else {
        showNotification('error', '加载配置失败');
      }
    } catch (error: any) {
      console.error('加载配置失败:', error);
      showNotification('error', error?.message || '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载日志
  const fetchLogs = async () => {
    try {
      const data = await getAutoPayoutLogs({ limit: 50, offset: 0 });
      if (data.ok) {
        setLogs(data.items);
      }
    } catch (error: any) {
      console.error('加载日志失败:', error);
      showNotification('error', error?.message || '加载日志失败');
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (showLogs) {
      fetchLogs();
    }
  }, [showLogs]);

  // 保存配置
  const handleSave = async () => {
    // 验证私钥格式
    if (privateKey && !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
      showNotification('error', '私钥格式不正确，必须以 0x 开头，长度为 66 字符');
      return;
    }

    // 如果未配置过，必须提供私钥
    if (!config?.walletAddress && !privateKey) {
      showNotification('error', '首次配置必须提供私钥');
      return;
    }

    setSaving(true);
    try {
      await configureAutoPayout({
        privateKey: privateKey || '0x0000000000000000000000000000000000000000000000000000000000000000', // 占位符，后端会忽略
        threshold,
        enabled,
        minBalance,
        dailyLimit: dailyLimit ? parseFloat(dailyLimit) : null,
      });
      
      showNotification('success', '配置已保存');
      await fetchConfig();
      setPrivateKey(''); // 清空私钥输入
    } catch (error: any) {
      console.error('保存配置失败:', error);
      showNotification('error', error?.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Loading type="spinner" message="正在加载配置..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">自动放款配置</h2>
          <p className="text-zinc-400 text-sm">配置自动放款功能，提高小额提现处理效率</p>
        </div>
        <div className="flex items-center gap-3">
          <ActionButton
            onClick={() => {
              setShowLogs(!showLogs);
              if (!showLogs) {
                fetchLogs();
              }
            }}
            variant="secondary"
          >
            <History size={18} />
            {showLogs ? '隐藏日志' : '查看日志'}
          </ActionButton>
          <ActionButton
            onClick={fetchConfig}
            variant="secondary"
          >
            <RefreshCw size={18} />
            刷新
          </ActionButton>
        </div>
      </div>

      {/* 配置表单 */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
          <Settings size={16} className="text-zinc-500" />
          <h3 className="text-sm font-semibold">自动放款设置</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* 当前状态 */}
          {config && (
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">当前状态</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-zinc-500 mb-1">钱包地址</div>
                  <div className="text-sm font-mono text-white">
                    {config.walletAddress ? (
                      <span>{config.walletAddress.substring(0, 6)}...{config.walletAddress.substring(38)}</span>
                    ) : (
                      <span className="text-zinc-500">未配置</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 mb-1">当前余额</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {parseFloat(config.currentBalance).toLocaleString()} USDT
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 mb-1">启用状态</div>
                  <div className={`text-sm font-bold ${config.enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {config.enabled ? '✅ 已启用' : '❌ 未启用'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 mb-1">自动放款阈值</div>
                  <div className="text-sm font-bold text-white">
                    {config.threshold} USDT
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 私钥配置 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Wallet size={12} />
              出款钱包私钥
            </label>
            <div className="relative">
              <input
                type={showPrivateKey ? 'text' : 'password'}
                placeholder={config?.walletAddress ? '留空则不更新私钥' : '0x...'}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPrivateKey ? <X size={16} /> : <AlertCircle size={16} />}
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              {config?.walletAddress 
                ? '⚠️ 如需更新私钥，请输入新私钥。留空则保持现有私钥不变。'
                : '⚠️ 首次配置必须提供私钥。私钥将加密存储在服务器端。'
              }
            </p>
          </div>

          {/* 自动放款阈值 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Zap size={12} />
              自动放款阈值 (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1000"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-zinc-500">
              金额低于此值的提现将自动放款，高于此值的需要手动审核
            </p>
          </div>

          {/* 最小余额阈值 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={12} />
              最小余额阈值 (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              value={minBalance}
              onChange={(e) => setMinBalance(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-zinc-500">
              钱包余额低于此值时，自动停止自动放款（防止余额不足）
            </p>
          </div>

          {/* 每日限额 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Settings size={12} />
              每日自动放款总额限制 (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="留空表示无限制"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              每日自动放款总额限制（留空表示无限制）
            </p>
          </div>

          {/* 启用开关 */}
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div>
              <div className="text-sm font-semibold text-white mb-1">启用自动放款</div>
              <div className="text-xs text-zinc-500">
                开启后，系统将每 30 秒自动检查并处理符合条件的提现
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* 保存按钮 */}
          <div className="flex items-center gap-3">
            <ActionButton
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              variant="primary"
              className="flex-1"
            >
              <Save size={18} />
              保存配置
            </ActionButton>
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      {showLogs && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
            <History size={16} className="text-zinc-500" />
            <h3 className="text-sm font-semibold">自动放款日志</h3>
          </div>

          <div className="divide-y divide-zinc-800">
            {logs.length === 0 ? (
              <div className="p-12">
                <EmptyState variant="database" title="暂无日志" description="还没有自动放款记录" />
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(log.status)}`}>
                          {log.status === 'success' ? '✅ 成功' : log.status === 'failed' ? '❌ 失败' : '⏳ 处理中'}
                        </span>
                        <span className="text-xs text-zinc-500">提现 ID: {log.withdrawalId}</span>
                      </div>
                      <div className="text-sm font-bold text-white mb-1">
                        {log.amount.toFixed(2)} USDT
                      </div>
                      {log.txHash && (
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="font-mono">{log.txHash.substring(0, 10)}...{log.txHash.substring(56)}</span>
                          <a
                            href={`https://bscscan.com/tx/${log.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                      {log.errorMessage && (
                        <div className="text-xs text-red-400 mt-1">
                          错误: {log.errorMessage}
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-500 mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoPayoutConfigPage;

