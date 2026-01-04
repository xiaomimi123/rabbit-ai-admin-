
import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Info,
  Gem,
  AlertCircle
} from 'lucide-react';
import { getVipTiers, updateVipTier } from '../lib/api';
import { YieldTier } from '../types';
import { useNotifications, NotificationContainer } from '../components/Notification';
import { Loading, EmptyState, ActionButton } from '../components';

const YieldStrategy: React.FC = () => {
  const [tiers, setTiers] = useState<YieldTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { notifications, showNotification, removeNotification } = useNotifications();

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const response = await getVipTiers();
      // 转换后端数据格式为前端格式
      setTiers(response.tiers.map((tier) => ({
        id: tier.level,
        level: `LV${tier.level}`,
        name: tier.name,
        min_hold: parseFloat(tier.minBalance),
        daily_rate: tier.dailyRate * 100, // 后端存的是小数，前端显示百分比
      })));
    } catch (error: any) {
      console.error('获取策略失败', error);
      showNotification('error', `获取策略失败: ${error?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTier = () => {
    const nextId = tiers.length > 0 ? Math.max(...tiers.map(t => t.id)) + 1 : 1;
    const nextLv = tiers.length + 1;
    const newTier: YieldTier = {
      id: nextId,
      level: `LV${nextLv}`,
      name: '',
      min_hold: 0,
      daily_rate: 0.01 // 默认 1%
    };
    setTiers([...tiers, newTier]);
  };

  const handleDeleteTier = (id: number) => {
    if (tiers.length <= 1) {
      showNotification('warning', '请至少保留一个收益等级。');
      return;
    }
    setTiers(tiers.filter(t => t.id !== id));
  };

  const handleUpdateField = (id: number, field: keyof YieldTier, value: any) => {
    setTiers(prev => prev.map(t => {
      if (t.id === id) {
        // 如果是日收益率，这里处理的是显示值（百分比），但我们先存入 state 等待转换
        // 或者我们在这里直接处理数值
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 逐个更新每个等级
      for (const tier of tiers) {
        const level = tier.id;
        const dailyRate = parseFloat(tier.daily_rate.toString()) / 100; // 转换为小数
        await updateVipTier(level, {
          name: tier.name,
          minBalance: tier.min_hold,
          maxBalance: tier.min_hold < 200000 ? tier.min_hold * 5 : null, // 简化处理
          dailyRate: dailyRate,
        });
      }
      
      showNotification('success', '收益策略已更新，即时生效！');
      // 重新拉取一次确保数据同步
      fetchTiers();
    } catch (error: any) {
      console.error('保存失败', error);
      showNotification('error', error.message || '保存配置失败，请检查网络或管理员权限。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">等级收益规则配置</h2>
          <p className="text-zinc-400 text-sm">动态调整 "Hold-to-Earn" 模式下的持币门槛与收益率。</p>
        </div>
        <div className="flex items-center gap-3">
          <ActionButton
            onClick={fetchTiers}
            loading={loading}
            variant="secondary"
          >
            <RefreshCw size={20} />
          </ActionButton>
          <ActionButton
            onClick={handleSave}
            loading={saving}
            disabled={loading}
            variant="primary"
          >
            <Save size={18} />
            保存配置 (Save Changes)
          </ActionButton>
        </div>
      </div>

      {/* 业务逻辑看板 */}
      <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-start gap-4">
        <div className="p-3 bg-indigo-500/10 rounded-xl">
          <Info className="text-indigo-400" size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-zinc-200 uppercase tracking-wider">配置说明</p>
          <ul className="text-xs text-zinc-400 leading-relaxed list-disc list-inside space-y-1">
            <li>最低持仓要求单位为 <span className="text-emerald-400 font-bold">RAT</span>。</li>
            <li>日收益率以 <span className="text-white font-bold">百分比 (%)</span> 输入，系统会自动转换为小数存储。</li>
            <li>修改保存后，系统在下个计息周期将按照新规则计算。</li>
          </ul>
        </div>
      </div>

      {/* 动态表单列表 */}
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          <div className="col-span-2">等级 (Level)</div>
          <div className="col-span-3">等级名称 (Name)</div>
          <div className="col-span-3">最低持仓 (Min Hold)</div>
          <div className="col-span-3">日收益率 (Daily Rate)</div>
          <div className="col-span-1 text-right">操作</div>
        </div>

        {loading ? (
          <Loading type="skeleton" />
        ) : tiers.length === 0 ? (
          <EmptyState variant="database" title="暂无收益等级" description="请添加收益等级配置" />
        ) : (
          <>
            <div className="space-y-3">
              {tiers.map((tier) => (
                <div 
                  key={tier.id} 
                  className="grid grid-cols-12 gap-4 items-center p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all group"
                >
                  {/* Level 显示 */}
                  <div className="col-span-2">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-black text-zinc-500 select-none">
                      {tier.level}
                    </div>
                  </div>

                  {/* 等级名称 */}
                  <div className="col-span-3">
                    <input 
                      type="text" 
                      placeholder="如：新手"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-700"
                      value={tier.name}
                      onChange={(e) => handleUpdateField(tier.id, 'name', e.target.value)}
                    />
                  </div>

                  {/* 最低持仓 */}
                  <div className="col-span-3">
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-4 pr-12 py-2 text-sm font-mono text-zinc-300 outline-none focus:border-emerald-500 transition-all"
                        value={tier.min_hold}
                        onChange={(e) => handleUpdateField(tier.id, 'min_hold', parseInt(e.target.value) || 0)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-bold">RAT</span>
                    </div>
                  </div>

                  {/* 日收益率 */}
                  <div className="col-span-3">
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-4 pr-10 py-2 text-sm font-mono text-emerald-400 outline-none focus:border-emerald-500 transition-all"
                        // UI 显示的是百分比，如果后端存的是 0.02，这里应该显示 2
                        // 但由于我们在 handleSave 处理转换，所以这里输入的就是百分数
                        value={tier.daily_rate} 
                        onChange={(e) => handleUpdateField(tier.id, 'daily_rate', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-bold">% / DAY</span>
                    </div>
                  </div>

                  {/* 删除按钮 */}
                  <div className="col-span-1 text-right">
                    <button 
                      onClick={() => handleDeleteTier(tier.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="删除此等级"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleAddTier}
              className="w-full py-4 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest group"
            >
              <Plus size={16} className="group-hover:scale-125 transition-transform" /> 
              添加新等级 (Add New Tier)
            </button>
          </>
        )}
      </div>

      {/* 收益模拟预览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-800">
        <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Gem size={20} className="text-emerald-400" />
            <h4 className="font-bold text-sm text-white">策略预览 (Preview)</h4>
          </div>
          <div className="space-y-3">
            {tiers.length > 0 ? (
              <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-black text-emerald-500 uppercase">
                    Max
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">{tiers[tiers.length-1].name || '未命名'}</p>
                    <p className="text-[10px] text-zinc-500 italic">最高收益阶梯</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-400">{tiers[tiers.length-1].daily_rate}%</p>
                  <p className="text-[10px] text-zinc-600 font-bold tracking-tighter">DAILY YIELD</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">暂无预览数据</p>
            )}
          </div>
        </div>

        <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl flex flex-col justify-center gap-3">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle size={18} />
            <h4 className="font-bold text-xs uppercase tracking-widest">保存须知</h4>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed italic">
            请确保阶梯之间的 <span className="text-zinc-300">Min Hold</span> 是递增的。系统不会自动校验阶梯顺序，但建议按持币量从小到大进行配置以确保用户体验的一致性。
          </p>
        </div>
      </div>
    </div>
  );
};

export default YieldStrategy;
