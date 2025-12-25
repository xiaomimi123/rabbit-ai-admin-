
import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Lock, Info, Wallet, Cpu, Globe } from 'lucide-react';
import { getSystemConfig, updateSystemConfig } from '../lib/api';
import { SystemConfig } from '../types';

const SystemConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await getSystemConfig();
      // 转换后端数据格式为前端格式
      const configMap: Record<string, { value: any; description?: string; category?: 'Business' | 'Technical' | 'Frontend' }> = {
        'WITHDRAWAL_MIN': { value: '10', description: '用户单次提现的最小 USDT 金额。', category: 'Business' },
        'AIRDROP_FEE_BNB': { value: '0.000444', description: '领取空投时用户所需支付的 BNB 燃气费标准。', category: 'Business' },
        'INVITE_BONUS_RAT': { value: '50', description: '每成功邀请一名新用户所获得的 RAT 代币奖励。', category: 'Business' },
        'RAT_CONTRACT_ADDRESS': { value: '', description: 'BSC 网络 RAT 代币合约地址。', category: 'Technical' },
        'USDT_CONTRACT_ADDRESS': { value: '0x55d398326f99059fF775485246999027B3197955', description: 'BSC 网络 USDT 代币合约地址。', category: 'Technical' },
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
          category: defaultConfig.category,
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, newValue: string) => {
    setSavingKey(key);
    try {
      await updateSystemConfig(key, newValue);
      setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: newValue } : c));
    } catch (e: any) {
      alert(e.message || '更新失败');
    } finally {
      setSavingKey(null);
    }
  };

  const businessConfigs = configs.filter(c => c.category === 'Business');
  const technicalConfigs = configs.filter(c => c.category === 'Technical');
  const frontendConfigs = configs.filter(c => c.category === 'Frontend');

  const ConfigSection = ({ title, icon: Icon, items }: { title: string, icon: any, items: SystemConfig[] }) => (
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
                defaultValue={config.value}
                onBlur={(e) => handleUpdate(config.key, e.target.value)}
              />
              <button disabled={savingKey === config.key} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 rounded-xl transition-all">
                {savingKey === config.key ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">系统配置</h2>
          <p className="text-zinc-400 text-sm">管理 RAT 持币生息相关业务参数与智能合约。</p>
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
          <ConfigSection title="持币生息策略参数" icon={Settings} items={businessConfigs} />
          <ConfigSection title="核心合约配置" icon={Cpu} items={technicalConfigs} />
          <ConfigSection title="前端链接配置" icon={Globe} items={frontendConfigs} />
        </>
      )}

      <div className="p-6 bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-2xl flex items-center gap-4">
        <Info className="text-emerald-500 shrink-0" size={24} />
        <p className="text-xs text-zinc-500 leading-relaxed">
          <strong className="text-zinc-300">安全提示：</strong> RAT 合约地址与奖励参数直接关联资产快照逻辑。修改配置将影响全网用户的利息计算，请务必在非高峰时段操作并进行多重审计。
        </p>
      </div>
    </div>
  );
};

export default SystemConfigPage;
