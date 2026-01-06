import React, { useState, useEffect } from 'react';
import { Settings, History, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { useNotifications, NotificationContainer } from '../components/Notification';
import { 
  getEnergyConfig, 
  updateEnergyConfig, 
  getEnergyConfigHistory, 
  clearEnergyConfigCache 
} from '../lib/api';

interface EnergyConfig {
  key: string;
  value: number;
  description: string;
  updatedAt: string;
}

interface ConfigHistory {
  id: string;
  key: string;
  oldValue: number | null;
  newValue: number;
  changedBy: string | null;
  changeReason: string | null;
  createdAt: string;
}

const EnergyConfigPage: React.FC = () => {
  const { notifications, showNotification, removeNotification } = useNotifications();
  
  const [configs, setConfigs] = useState<EnergyConfig[]>([]);
  const [history, setHistory] = useState<ConfigHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [editReasons, setEditReasons] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  // 配置显示名称
  const configLabels: Record<string, { name: string; unit: string; hint: string }> = {
    withdraw_energy_ratio: {
      name: '提现能量消耗比例',
      unit: 'Energy/USDT',
      hint: '用户提现 1 USDT 需要消耗的能量值（建议: 5-20）',
    },
    claim_self_reward: {
      name: '领取空投自身奖励',
      unit: 'Energy',
      hint: '用户每次领取空投获得的能量（建议: 1-5）',
    },
    claim_referrer_first: {
      name: '首次邀请推荐人奖励',
      unit: 'Energy',
      hint: '推荐人首次邀请获得的能量（建议: 2-10）',
    },
    claim_referrer_repeat: {
      name: '重复邀请推荐人奖励',
      unit: 'Energy',
      hint: '推荐人非首次邀请获得的能量（建议: 1-5）',
    },
    min_withdraw_energy: {
      name: '最低提现能量要求',
      unit: 'Energy',
      hint: '用户提现至少需要的能量（0表示无限制）',
    },
    energy_lock_enabled: {
      name: '能量锁定机制',
      unit: '',
      hint: '是否启用提现时锁定能量（1=启用，0=禁用）',
    },
  };

  // 加载配置
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await getEnergyConfig();
      
      if (data.ok) {
        setConfigs(data.configs);
        // 初始化编辑值
        const initialValues: Record<string, number> = {};
        data.configs.forEach((config: EnergyConfig) => {
          initialValues[config.key] = config.value;
        });
        setEditValues(initialValues);
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

  // 加载历史记录
  const fetchHistory = async () => {
    try {
      const data = await getEnergyConfigHistory(undefined, 20);
      
      if (data.ok) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('加载历史失败:', error);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchHistory();
  }, []);

  // 保存单个配置
  const handleSave = async (key: string) => {
    const newValue = editValues[key];
    const reason = editReasons[key] || '';
    
    if (newValue === undefined) return;
    
    try {
      setSaving(true);
      const data = await updateEnergyConfig(key, newValue, reason);
      
      if (data.ok) {
        showNotification('success', `✅ ${configLabels[key]?.name || key} 已更新`);
        await fetchConfigs();
        await fetchHistory();
        // 清除变更原因
        setEditReasons(prev => ({ ...prev, [key]: '' }));
      } else {
        showNotification('error', '保存失败');
      }
    } catch (error: any) {
      console.error('保存配置失败:', error);
      showNotification('error', error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置单个配置
  const handleReset = (key: string) => {
    const config = configs.find(c => c.key === key);
    if (config) {
      setEditValues(prev => ({ ...prev, [key]: config.value }));
      setEditReasons(prev => ({ ...prev, [key]: '' }));
    }
  };

  // 清除缓存
  const handleClearCache = async () => {
    try {
      const data = await clearEnergyConfigCache();
      
      if (data.ok) {
        showNotification('success', '✅ 配置缓存已清除，新配置立即生效');
      }
    } catch (error) {
      console.error('清除缓存失败:', error);
      showNotification('error', '清除缓存失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">能量配置管理</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <History size={18} />
            {showHistory ? '隐藏' : '查看'}历史
          </button>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} />
            清除缓存
          </button>
        </div>
      </div>

      {/* 警告提示 */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-200">
          <p className="font-bold mb-1">⚠️ 注意事项</p>
          <ul className="list-disc list-inside space-y-1">
            <li>修改配置会<span className="font-bold">立即影响所有用户</span>，请谨慎操作</li>
            <li>建议在<span className="font-bold">低峰期</span>进行调整</li>
            <li>所有变更都会被<span className="font-bold">记录审计</span></li>
          </ul>
        </div>
      </div>

      {/* 配置列表 */}
      <div className="grid gap-4">
        {configs.map((config) => {
          const label = configLabels[config.key] || { name: config.key, unit: '', hint: '' };
          const currentValue = config.value;
          const editValue = editValues[config.key] ?? currentValue;
          const hasChanged = editValue !== currentValue;
          
          return (
            <div key={config.key} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{label.name}</h3>
                  <p className="text-sm text-zinc-400">{label.hint}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    当前值: <span className="text-blue-400 font-mono">{currentValue}</span> {label.unit}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* 数值输入 */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-zinc-400 w-20">新值:</label>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValues(prev => ({ 
                      ...prev, 
                      [config.key]: parseFloat(e.target.value) || 0 
                    }))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    step={config.key === 'energy_lock_enabled' ? 1 : 0.1}
                    min={0}
                  />
                  <span className="text-sm text-zinc-500 w-24">{label.unit}</span>
                </div>

                {/* 变更原因 */}
                {hasChanged && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-zinc-400 w-20">原因:</label>
                    <input
                      type="text"
                      value={editReasons[config.key] || ''}
                      onChange={(e) => setEditReasons(prev => ({ 
                        ...prev, 
                        [config.key]: e.target.value 
                      }))}
                      placeholder="请输入变更原因（可选）"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* 操作按钮 */}
                {hasChanged && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleSave(config.key)}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => handleReset(config.key)}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                    >
                      重置
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 变更历史 */}
      {showHistory && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            变更历史（最近 20 条）
          </h2>
          
          {history.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">暂无变更记录</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="bg-zinc-800/50 rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-blue-400">
                      {configLabels[item.key]?.name || item.key}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span>{item.oldValue !== null ? item.oldValue : 'N/A'}</span>
                    <span>→</span>
                    <span className="text-green-400">{item.newValue}</span>
                    {item.changedBy && (
                      <span className="text-xs text-zinc-600">by {item.changedBy}</span>
                    )}
                  </div>
                  {item.changeReason && (
                    <p className="text-xs text-zinc-500 mt-1">原因: {item.changeReason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnergyConfigPage;

