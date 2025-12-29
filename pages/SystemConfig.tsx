
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Lock, Info, Cpu, Image, Globe, CheckCircle2, XCircle } from 'lucide-react';
import { getSystemConfig, updateSystemConfig } from '../lib/api';
import { SystemConfig } from '../types';

interface Notification {
  id: string;
  type: 'success' | 'error';
  message: string;
}

const SystemConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchConfigs();
  }, []);

  // 显示通知
  const showNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    // 3秒后自动移除
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await getSystemConfig();
      // 转换后端数据格式为前端格式
      const configMap: Record<string, { value: any; description?: string; category?: 'Business' | 'Technical' | 'UI' | 'Frontend' }> = {
        'RAT_CONTRACT_ADDRESS': { value: '0x03853d1B9a6DEeCE10ADf0EE20D836f06aFca47B', description: 'BSC 网络 RAT 代币合约地址。', category: 'Technical' },
        'USDT_CONTRACT_ADDRESS': { value: '0x55d398326f99059fF775485246999027B3197955', description: 'BSC 网络 USDT 代币合约地址。', category: 'Technical' },
        'LISTING_COUNTDOWN_TARGET_DATE': { value: '2026-01-15T12:00:00', description: '上线倒计时目标日期（ISO 格式：YYYY-MM-DDTHH:mm:ss）。', category: 'UI' },
        'LISTING_COUNTDOWN_EXCHANGE_NAME': { value: 'Binance', description: '交易所名称，显示在倒计时组件中。', category: 'UI' },
        'LISTING_COUNTDOWN_BG_IMAGE_URL': { value: '', description: '倒计时组件背景图片 URL（可选，留空则使用 CSS 渐变背景）。', category: 'UI' },
        'FRONTEND_WHITEPAPER_URL': { value: '', description: '前端项目白皮书地址。', category: 'Frontend' },
        'FRONTEND_AUDIT_REPORT_URL': { value: '', description: '安全审计报告地址。', category: 'Frontend' },
        'FRONTEND_SUPPORT_URL': { value: '', description: '联系在线客服地址。', category: 'Frontend' },
      };

      // 合并后端数据和默认配置
      const mergedConfigs: SystemConfig[] = data.items.map((item) => {
        const defaultConfig = configMap[item.key] || { value: '', description: '', category: 'Technical' as const };
        return {
          key: item.key,
          value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value),
          description: defaultConfig.description,
          category: defaultConfig.category || 'Technical',
        };
      });

      // 添加缺失的配置项
      Object.keys(configMap).forEach((key) => {
        if (!mergedConfigs.find((c) => c.key === key)) {
          mergedConfigs.push({
            key,
            value: configMap[key].value,
            description: configMap[key].description,
            category: configMap[key].category,
          });
        }
      });

      setConfigs(mergedConfigs);
      
      // 配置加载完成后，检查并自动填入 RAT 合约地址
      const ratConfig = mergedConfigs.find(c => c.key === 'RAT_CONTRACT_ADDRESS');
      const ratAddress = '0x03853d1B9a6DEeCE10ADf0EE20D836f06aFca47B';
      if (ratConfig && (!ratConfig.value || ratConfig.value.trim() === '')) {
        // 如果 RAT 合约地址为空，自动填入并保存
        setTimeout(() => {
          handleUpdate('RAT_CONTRACT_ADDRESS', ratAddress);
        }, 500);
      }
    } catch (e) {
      console.error(e);
      showNotification('error', '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, newValue: string) => {
    if (!newValue || newValue.trim() === '') {
      showNotification('error', '配置值不能为空');
      return;
    }
    
    setSavingKey(key);
    try {
      console.log(`[SystemConfig] 保存配置: ${key} = ${newValue}`);
      await updateSystemConfig(key, newValue.trim());
      setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: newValue.trim() } : c));
      showNotification('success', `配置 ${key} 保存成功！`);
    } catch (e: any) {
      console.error(`[SystemConfig] 保存失败:`, e);
      const errorMessage = e?.message || e?.toString() || '未知错误';
      showNotification('error', `保存失败: ${errorMessage}`);
    } finally {
      setSavingKey(null);
    }
  };

  const technicalConfigs = configs.filter(c => c.category === 'Technical');
  const uiConfigs = configs.filter(c => c.category === 'UI');
  const frontendConfigs = configs.filter(c => c.category === 'Frontend');

  const ConfigSection = ({ title, icon: Icon, items }: { title: string, icon: any, items: SystemConfig[] }) => {
    // 为每个配置项创建本地状态
    const [localValues, setLocalValues] = useState<Record<string, string>>({});
    
    // 初始化本地值
    useEffect(() => {
      const initialValues: Record<string, string> = {};
      items.forEach(item => {
        initialValues[item.key] = item.value || '';
      });
      setLocalValues(initialValues);
    }, [items]);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
            <Icon size={18} className="text-emerald-500" />
          </div>
          <h3 className="font-bold text-lg text-white">{title}</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {items.map((config) => (
            <div key={config.key} className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-zinc-700 transition-all">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded tracking-widest">{config.key}</span>
                  <Lock size={12} className="text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-200">{config.description}</p>
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <input 
                  type="text" 
                  className="flex-1 lg:w-80 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-emerald-500"
                  value={localValues[config.key] || config.value || ''}
                  onChange={(e) => setLocalValues(prev => ({ ...prev, [config.key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdate(config.key, localValues[config.key] || config.value || '');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const valueToSave = localValues[config.key] !== undefined ? localValues[config.key] : config.value || '';
                    handleUpdate(config.key, valueToSave);
                  }}
                  disabled={savingKey === config.key}
                  className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-400 border border-emerald-500/30 rounded-xl transition-all"
                  title="保存配置"
                >
                  {savingKey === config.key ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* 通知组件 */}
      <div className="fixed top-20 right-6 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-right ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">系统配置</h2>
          <p className="text-zinc-400 text-sm">管理系统参数与智能合约配置。</p>
        </div>
        <button onClick={fetchConfigs} className="p-2 text-zinc-500 hover:text-white transition-colors">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-8 animate-pulse">
           <div className="h-40 bg-zinc-900 rounded-xl" />
           <div className="h-40 bg-zinc-900 rounded-xl" />
        </div>
      ) : (
        <>
          <ConfigSection title="核心合约配置" icon={Cpu} items={technicalConfigs} />
          <ConfigSection title="UI 界面配置" icon={Image} items={uiConfigs} />
          <ConfigSection title="前端链接配置" icon={Globe} items={frontendConfigs} />
        </>
      )}

      <div className="p-6 bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-2xl flex items-center gap-4">
        <Info className="text-emerald-500 shrink-0" size={24} />
        <p className="text-xs text-zinc-500 leading-relaxed">
          <strong className="text-zinc-300">安全提示：</strong> 修改系统配置将影响应用行为，请务必在非高峰时段操作并进行多重审计。
        </p>
      </div>
    </div>
  );
};

export default SystemConfigPage;
