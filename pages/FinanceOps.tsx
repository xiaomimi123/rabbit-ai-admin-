
import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, Clock, AlertTriangle, ExternalLink, Send, ShieldCheck, Loader2 } from 'lucide-react';
import { getPendingWithdrawals, rejectWithdrawal, completeWithdrawal, getUsdtInfo, getAdminUsdtBalance, getSystemConfig, updateSystemConfig } from '../lib/api';
import { Withdrawal } from '../types';
import { checkMetaMask, connectWallet, getConnectedAddress, transferUSDT } from '../utils/web3';
import { useNotifications, NotificationContainer } from '../components/Notification';
import { useConfirmDialog, ConfirmDialog } from '../components/ConfirmDialog';

const FinanceOps: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [activeWithdrawal, setActiveWithdrawal] = useState<Withdrawal | null>(null);
  const [txHash, setTxHash] = useState('');
  
  // MetaMask 连接状态
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [usdtContractInfo, setUsdtContractInfo] = useState<{ address: string; decimals: number } | null>(null);
  
  // 管理员钱包配置
  const [adminPayoutAddress, setAdminPayoutAddress] = useState<string | null>(null);
  const [walletAddressMatched, setWalletAddressMatched] = useState<boolean | null>(null);

  // 通知系统
  const { notifications, showNotification, removeNotification } = useNotifications();
  
  // 确认对话框
  const { isOpen: isConfirmOpen, config: confirmConfig, showConfirm, handleCancel: handleConfirmCancel } = useConfirmDialog();

  useEffect(() => {
    fetchPending();
    fetchUsdtBalance();
    loadUsdtInfo();
    checkWalletConnection();
    loadAdminPayoutConfig();
  }, []);

  // 加载管理员钱包配置
  const loadAdminPayoutConfig = async () => {
    try {
      const data = await getSystemConfig();
      const adminPayoutConfig = data.items.find(item => item.key === 'admin_payout');
      if (adminPayoutConfig) {
        let address = '';
        if (typeof adminPayoutConfig.value === 'object' && adminPayoutConfig.value !== null && 'address' in adminPayoutConfig.value) {
          address = String((adminPayoutConfig.value as any).address || '');
        } else if (typeof adminPayoutConfig.value === 'string') {
          try {
            const parsed = JSON.parse(adminPayoutConfig.value);
            address = parsed?.address || '';
          } catch {
            address = adminPayoutConfig.value;
          }
        }
        setAdminPayoutAddress(address || null);
      }
    } catch (e) {
      console.error('加载管理员钱包配置失败', e);
    }
  };

  // 验证钱包地址是否匹配管理员配置
  useEffect(() => {
    if (walletAddress && adminPayoutAddress) {
      const matched = walletAddress.toLowerCase() === adminPayoutAddress.toLowerCase();
      setWalletAddressMatched(matched);
      if (!matched) {
        showNotification('warning', `连接的钱包地址与配置的管理员钱包地址不匹配。配置地址: ${adminPayoutAddress.substring(0, 6)}...${adminPayoutAddress.substring(38)}`);
      } else {
        showNotification('success', '钱包地址验证通过，与管理员配置一致');
      }
    } else {
      setWalletAddressMatched(null);
    }
  }, [walletAddress, adminPayoutAddress]);

  // 检查钱包连接状态
  const checkWalletConnection = async () => {
    if (checkMetaMask()) {
      const address = await getConnectedAddress();
      if (address) {
        setWalletConnected(true);
        setWalletAddress(address);
      }
    }
  };

  // 加载 USDT 合约信息
  const loadUsdtInfo = async () => {
    try {
      const info = await getUsdtInfo();
      if (info.ok) {
        setUsdtContractInfo({
          address: info.address,
          decimals: info.decimals,
        });
      }
    } catch (e) {
      console.error('加载 USDT 合约信息失败', e);
    }
  };

  // 连接钱包
  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    try {
      await connectWallet();
      const address = await getConnectedAddress();
      if (address) {
        setWalletConnected(true);
        setWalletAddress(address);
        
        // ✅ 自动保存钱包地址到 admin_payout 配置
        try {
          await updateSystemConfig('admin_payout', { address: address });
          console.log('[FinanceOps] 钱包地址已自动保存到 admin_payout 配置');
          showNotification('success', '钱包连接成功，地址已自动保存到系统配置');
        } catch (saveError: any) {
          console.error('[FinanceOps] 保存钱包地址失败:', saveError);
          showNotification('warning', '钱包连接成功，但保存配置失败，请手动在系统配置中保存');
        }
        
        // 更新本地配置状态
        setAdminPayoutAddress(address);
        
        // 验证地址匹配（useEffect 会自动处理）
        // 同时刷新余额
        fetchUsdtBalance();
      }
    } catch (e: any) {
      showNotification('error', `连接失败: ${e.message || '未知错误'}`);
    } finally {
      setConnectingWallet(false);
    }
  };

  // 手动发放（通过 MetaMask）
  const handleRelease = async (withdrawal: Withdrawal) => {
    if (!walletConnected || !walletAddress) {
      showNotification('warning', '请先连接出款钱包');
      return;
    }

    if (!usdtContractInfo) {
      showNotification('error', 'USDT 合约信息未加载，请稍后重试');
      return;
    }

    // ✅ 在确认前先检查余额
    try {
      const { getUSDTBalance } = await import('../utils/web3');
      const balance = await getUSDTBalance(usdtContractInfo.address, walletAddress);
      const balanceNum = parseFloat(balance);
      const amountNum = withdrawal.amount;

      if (balanceNum < amountNum) {
        showNotification('error', `钱包 USDT 余额不足！当前余额: ${balanceNum.toFixed(2)} USDT，需要: ${amountNum.toFixed(2)} USDT`);
        return;
      }
    } catch (e: any) {
      console.error('检查余额失败:', e);
      showNotification('warning', '无法检查钱包余额，请确认后继续');
    }

    showConfirm(
      '确认发放提现',
      `确认向 ${withdrawal.address.substring(0, 6)}...${withdrawal.address.substring(38)} 发放 ${withdrawal.amount} USDT？`,
      async () => {
        setProcessingId(withdrawal.id);
        try {
          // 1. 再次检查余额（防止在确认期间余额变化）
          const { getUSDTBalance } = await import('../utils/web3');
          const balance = await getUSDTBalance(usdtContractInfo.address, walletAddress);
          const balanceNum = parseFloat(balance);
          const amountNum = withdrawal.amount;

          if (balanceNum < amountNum) {
            showNotification('error', `钱包 USDT 余额不足！当前余额: ${balanceNum.toFixed(2)} USDT，需要: ${amountNum.toFixed(2)} USDT`);
            setProcessingId(null);
            return;
          }

          // 2. 调用 USDT transfer
          const tx = await transferUSDT(
            usdtContractInfo.address,
            withdrawal.address,
            withdrawal.amount.toString(),
            usdtContractInfo.decimals
          );

          console.log('交易已发送:', tx.hash);
          
          // 3. 等待交易确认
          const receipt = await tx.wait();
          console.log('交易已确认:', receipt.transactionHash);

          // 4. 调用后端 API 更新状态
          await completeWithdrawal(withdrawal.id, receipt.transactionHash);
          
          // 5. 刷新列表
          setWithdrawals(prev => prev.filter(w => w.id !== withdrawal.id));
          fetchUsdtBalance(); // 刷新余额
          
          showNotification('success', `发放成功！交易哈希: ${receipt.transactionHash.substring(0, 10)}...`);
        } catch (e: any) {
          console.error('发放失败:', e);
          let errorMessage = '发放失败';
          
          if (e.code === 4001) {
            errorMessage = '用户取消了交易';
            showNotification('warning', errorMessage);
          } else if (e.message?.includes('insufficient funds') || e.message?.includes('exceeds balance')) {
            errorMessage = '钱包 USDT 余额不足，请先充值';
            showNotification('error', errorMessage);
          } else if (e.message?.includes('UNPREDICTABLE_GAS_LIMIT')) {
            // 解析 BEP20 错误信息
            if (e.message?.includes('transfer amount exceeds balance')) {
              errorMessage = '钱包 USDT 余额不足，请先充值';
            } else {
              errorMessage = '交易可能失败，请检查钱包余额和网络状态';
            }
            showNotification('error', errorMessage);
          } else {
            errorMessage = e.message || '未知错误';
            showNotification('error', `发放失败: ${errorMessage}`);
          }
        } finally {
          setProcessingId(null);
        }
      },
      {
        confirmText: '确认发放',
        type: 'warning',
      }
    );
  };

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await getPendingWithdrawals(100);
      setWithdrawals(data.items.map((item) => ({
        id: item.id,
        address: item.address,
        amount: parseFloat(item.amount),
        status: item.status as 'Pending' | 'Completed' | 'Rejected',
        createdAt: new Date(item.createdAt).toLocaleString(),
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsdtBalance = async () => {
    try {
      const data = await getAdminUsdtBalance();
      setUsdtBalance(data.balance || '0');
    } catch (e) {
      console.error('获取 USDT 余额失败', e);
      setUsdtBalance('0'); // 失败时显示 0
    }
  };

  const handleReject = async (id: string) => {
    showConfirm(
      '确认拒绝提现',
      '您确定要拒绝这笔提现申请吗？此操作无法撤销。',
      async () => {
        setProcessingId(id);
        try {
          await rejectWithdrawal(id);
          setWithdrawals(prev => prev.filter(w => w.id !== id));
          showNotification('success', '提现已成功拒绝。');
        } catch (e: any) {
          showNotification('error', e.message || '拒绝失败。');
        } finally {
          setProcessingId(null);
        }
      },
      {
        confirmText: '确认拒绝',
        type: 'danger',
      }
    );
  };

  const handleCompleteApprove = async () => {
    if (!activeWithdrawal || !txHash) return;
    setProcessingId(activeWithdrawal.id);
    try {
      await completeWithdrawal(activeWithdrawal.id, txHash);
      setWithdrawals(prev => prev.filter(w => w.id !== activeWithdrawal.id));
      setIsApproveOpen(false);
      setActiveWithdrawal(null);
      setTxHash('');
      showNotification('success', '提现申请已标记为完成。');
    } catch (e: any) {
      showNotification('error', e.message || '提交失败。');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      {confirmConfig && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          type={confirmConfig.type}
          onConfirm={confirmConfig.onConfirm}
          onCancel={handleConfirmCancel}
        />
      )}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">财务审核</h2>
          <p className="text-zinc-400 text-sm">审核并手动处理用户的提现申请。</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {walletConnected && walletAddress ? (
            <>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                walletAddressMatched === false
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : walletAddressMatched === true
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
              }`}>
                <Wallet size={18} />
                <span className="text-xs font-mono">{walletAddress.substring(0, 6)}...{walletAddress.substring(38)}</span>
                {walletAddressMatched === false && (
                  <AlertTriangle size={14} className="text-red-400" />
                )}
                {walletAddressMatched === true && (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                )}
              </div>
              <button
                onClick={handleConnectWallet}
                className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 rounded-xl text-emerald-400 transition-all cursor-pointer"
                title="点击重新连接钱包或切换账户"
              >
                <Wallet size={18} />
                <span className="text-sm font-bold tracking-tight">流动性余额: ${parseFloat(usdtBalance).toLocaleString()} USDT</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={connectingWallet || !checkMetaMask()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-black text-sm rounded-xl flex items-center gap-2 transition-all"
              title="连接 MetaMask 钱包以便手动发放提现"
            >
              {connectingWallet ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  连接中...
                </>
              ) : (
                <>
                  <Wallet size={18} />
                  连接出款钱包
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
          <Clock size={16} className="text-zinc-500" />
          <h3 className="text-sm font-semibold">待审批提现 ({withdrawals.length})</h3>
        </div>
        
        <div className="divide-y divide-zinc-800">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 animate-pulse">正在获取待审批请求...</div>
          ) : withdrawals.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <CheckCircle2 size={40} className="mx-auto mb-3 opacity-20" />
              <p>全部处理完毕！目前没有待审批的提现。</p>
            </div>
          ) : withdrawals.map(w => (
            <div key={w.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                  <Wallet className="text-emerald-500" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-zinc-300 break-all">{w.address}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-2xl font-black text-white tracking-tighter">${w.amount.toFixed(2)} USDT</p>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded uppercase font-bold text-zinc-500 tracking-wider">编号: {w.id}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">申请于 {w.createdAt}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={() => handleReject(w.id)}
                  disabled={processingId === w.id}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                >
                  拒绝
                </button>
                {walletConnected ? (
                  <button 
                    onClick={() => handleRelease(w)}
                    disabled={processingId === w.id || !usdtContractInfo}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border border-emerald-400 rounded-lg text-sm font-black transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processingId === w.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        发放中...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        发放 (Release)
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setActiveWithdrawal(w);
                      setIsApproveOpen(true);
                    }}
                    disabled={processingId === w.id}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border border-emerald-400 rounded-lg text-sm font-black transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    批准提现
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 批准提现对话框 */}
      {isApproveOpen && activeWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsApproveOpen(false)} />
          <div className="relative bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-emerald-500/5 border-b border-zinc-800">
              <div className="flex items-center gap-3 text-emerald-400 mb-2">
                <ShieldCheck size={20} />
                <h3 className="font-bold text-lg">确认批准提现</h3>
              </div>
              <p className="text-zinc-500 text-xs">请在链上完成转账后记录交易凭证。</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-4 bg-zinc-900/50 border border-yellow-500/20 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                <div className="text-xs space-y-2">
                  <p className="font-bold text-yellow-500 uppercase tracking-wider">操作指南</p>
                  <p className="text-zinc-400 leading-relaxed">
                    1. 打开 MetaMask 或冷钱包。<br/>
                    2. 向下方地址发送 <strong className="text-white">${activeWithdrawal.amount} USDT</strong>。<br/>
                    3. 在下方输入链上生成的 <strong className="text-white">交易哈希 (TxHash)</strong>。
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">收款钱包地址</label>
                <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-xs font-mono text-zinc-400 truncate flex-1">{activeWithdrawal.address}</span>
                  <ExternalLink size={14} className="text-zinc-600 cursor-pointer hover:text-emerald-500" onClick={() => navigator.clipboard.writeText(activeWithdrawal.address)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">交易哈希 (TxHash)</label>
                <input 
                  type="text" 
                  placeholder="0x..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 bg-zinc-900/50 flex items-center gap-3">
              <button 
                onClick={() => setIsApproveOpen(false)}
                className="flex-1 py-3 text-zinc-500 hover:text-white font-bold text-sm transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleCompleteApprove}
                disabled={!txHash || processingId === activeWithdrawal.id}
                className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Send size={16} />
                确认并同步状态
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceOps;

