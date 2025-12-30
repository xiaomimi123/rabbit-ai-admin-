
import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Clock, 
  Users, 
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { getBroadcastHistory, broadcastNotification } from '../lib/api';
import { useNotifications, NotificationContainer } from '../components/Notification';

interface BroadcastRecord {
  id: string;
  title: string;
  content: string;
  type: 'SYSTEM' | 'REWARD' | 'NETWORK';
  sent_count: number;
  created_at: string;
}

const BroadcastHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const { notifications, showNotification, removeNotification } = useNotifications();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getBroadcastHistory();
      setHistory(data || []);
    } catch (error: any) {
      showNotification('error', `获取历史记录失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastContent) return;
    setIsSendingBroadcast(true);
    try {
      const result = await broadcastNotification({
        title: broadcastTitle,
        content: broadcastContent,
        type: 'SYSTEM',
      });
      showNotification('success', `广播发送成功，已发送给 ${result.sent} 位用户`);
      setIsBroadcastOpen(false);
      setBroadcastTitle('');
      setBroadcastContent('');
      fetchHistory(); // 刷新历史记录
    } catch (error: any) {
      showNotification('error', `发送失败: ${error.message || '未知错误'}`);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 relative overflow-hidden h-full flex flex-col">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">广播通知</h2>
          <p className="text-zinc-400 text-sm">管理全员广播通知和历史记录。</p>
        </div>
        <button 
          onClick={() => setIsBroadcastOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all"
        >
          <Megaphone size={14} /> 发送广播
        </button>
      </div>

      {/* 历史记录列表 */}
      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-zinc-500" size={24} />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <Megaphone size={48} className="mb-4 opacity-50" />
            <p className="text-sm">暂无广播记录</p>
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            <div className="divide-y divide-zinc-800/50">
              {history.map((record) => (
                <div key={record.id} className="p-6 hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                          <Megaphone size={16} className="text-indigo-400" />
                        </div>
                        <h3 className="font-bold text-white">{record.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          record.type === 'SYSTEM' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          record.type === 'REWARD' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {record.type}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-sm mb-3 ml-12">{record.content}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500 ml-12">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>{formatDate(record.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={12} />
                          <span>已发送给 {record.sent_count} 位用户</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 广播通知模态框 */}
      {isBroadcastOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in" onClick={() => setIsBroadcastOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 bg-indigo-500/5 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-indigo-400">
                    <Megaphone size={20} />
                    <h3 className="font-bold text-lg">全员广播通知</h3>
                  </div>
                  <button
                    onClick={() => setIsBroadcastOpen(false)}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-zinc-500" />
                  </button>
                </div>
                <p className="text-zinc-500 text-xs mt-2">向所有用户发送系统通知。</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">通知标题</label>
                  <input 
                    type="text" 
                    placeholder="输入通知标题..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">通知内容</label>
                  <textarea 
                    placeholder="输入通知内容..."
                    className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500 resize-none"
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-6 bg-zinc-900/50 flex items-center gap-3">
                <button 
                  onClick={() => setIsBroadcastOpen(false)}
                  className="flex-1 py-3 text-zinc-500 hover:text-white font-bold text-sm transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleBroadcast}
                  disabled={!broadcastTitle || !broadcastContent || isSendingBroadcast}
                  className="flex-[2] py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  {isSendingBroadcast ? <RefreshCw className="animate-spin" size={16} /> : <Megaphone size={16} />}
                  发送广播
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BroadcastHistoryPage;

