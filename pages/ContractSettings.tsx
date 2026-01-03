
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Wallet, AlertCircle, CheckCircle2, XCircle, Settings, Coins, Target } from 'lucide-react';
import { connectWallet, getConnectedAddress, checkMetaMask } from '../utils/web3';
import { ethers } from 'ethers';
import { getAdminKPIs } from '../lib/api';

// 智能合约 ABI（只包含需要的函数）
const AIRDROP_ABI = [
  'function owner() view returns (address)',
  'function claimFee() view returns (uint256)',
  'function minReward() view returns (uint256)',
  'function maxReward() view returns (uint256)',
  'function setRewardRange(uint256 _min, uint256 _max)',
  'function setFee(uint256 _newFee)',
];

// BSC 主网 Chain ID
const BSC_CHAIN_ID = 56;

// 合约地址（可以从后端 API 获取，这里使用默认值）
// 实际使用时可以从后端 API 的 KPI 接口获取 airdrop.contract 字段
const DEFAULT_AIRDROP_CONTRACT = '0x16B7a2e6eD9a0Ace9495b80eF0A5D0e3f72aCD7c';

interface Notification {
  id: string;
  type: 'success' | 'error';
  message: string;
}

const ContractSettingsPage: React.FC = () => {
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_AIRDROP_CONTRACT);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [checkingOwner, setCheckingOwner] = useState(false);
  
  // 当前配置
  const [currentClaimFee, setCurrentClaimFee] = useState<string>('');
  const [currentMinReward, setCurrentMinReward] = useState<string>('');
  const [currentMaxReward, setCurrentMaxReward] = useState<string>('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  
  // 表单数据
  const [newClaimFee, setNewClaimFee] = useState<string>('');
  const [newMinReward, setNewMinReward] = useState<string>('');
  const [newMaxReward, setNewMaxReward] = useState<string>('');
  
  // 交易状态
  const [isSaving, setIsSaving] = useState(false);
  const [savingType, setSavingType] = useState<'fee' | 'range' | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 显示通知
  const showNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // 连接钱包
  const handleConnectWallet = async () => {
    if (!checkMetaMask()) {
      showNotification('error', '请安装 MetaMask 浏览器扩展');
      return;
    }

    setIsConnecting(true);
    try {
      const provider = await connectWallet();
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      
      // 检查是否是合约所有者
      await checkContractOwner(address);
      
      // 加载当前配置
      await loadContractConfig(provider);
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      showNotification('error', error?.message || '连接钱包失败');
    } finally {
      setIsConnecting(false);
    }
  };

  // 检查是否是合约所有者
  const checkContractOwner = async (address: string) => {
    setCheckingOwner(true);
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const contract = new ethers.Contract(contractAddress, AIRDROP_ABI, provider);
      const owner = await contract.owner();
      const isOwnerAddress = owner.toLowerCase() === address.toLowerCase();
      setIsOwner(isOwnerAddress);
      
      if (!isOwnerAddress) {
        showNotification('error', '当前钱包不是合约所有者，无法修改配置');
      }
    } catch (error: any) {
      console.error('检查所有者失败:', error);
      showNotification('error', '检查合约所有者失败: ' + (error?.message || '未知错误'));
      setIsOwner(false);
    } finally {
      setCheckingOwner(false);
    }
  };

  // 加载合约当前配置
  const loadContractConfig = async (provider: ethers.providers.Provider) => {
    setLoadingConfig(true);
    try {
      const contract = new ethers.Contract(contractAddress, AIRDROP_ABI, provider);
      
      const [claimFee, minReward, maxReward] = await Promise.all([
        contract.claimFee(),
        contract.minReward(),
        contract.maxReward(),
      ]);

      // 转换格式
      setCurrentClaimFee(ethers.utils.formatEther(claimFee));
      setCurrentMinReward(minReward.toString());
      setCurrentMaxReward(maxReward.toString());
      
      // 初始化表单数据
      setNewClaimFee(ethers.utils.formatEther(claimFee));
      setNewMinReward(minReward.toString());
      setNewMaxReward(maxReward.toString());
    } catch (error: any) {
      console.error('加载配置失败:', error);
      showNotification('error', '加载合约配置失败: ' + (error?.message || '未知错误'));
    } finally {
      setLoadingConfig(false);
    }
  };

  // 刷新配置
  const handleRefresh = async () => {
    if (!walletAddress) {
      showNotification('error', '请先连接钱包');
      return;
    }
    
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      await loadContractConfig(provider);
      showNotification('success', '配置已刷新');
    } catch (error: any) {
      showNotification('error', '刷新失败: ' + (error?.message || '未知错误'));
    }
  };

  // 设置服务费
  const handleSetFee = async () => {
    if (!walletAddress || !isOwner) {
      showNotification('error', '请先连接合约所有者的钱包');
      return;
    }

    const feeValue = parseFloat(newClaimFee);
    if (isNaN(feeValue) || feeValue <= 0) {
      showNotification('error', '请输入有效的服务费（BNB）');
      return;
    }

    setIsSaving(true);
    setSavingType('fee');
    
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, AIRDROP_ABI, signer);
      
      // 转换为 Wei
      const feeWei = ethers.utils.parseEther(newClaimFee);
      
      // 发送交易
      const tx = await contract.setFee(feeWei);
      showNotification('success', `交易已提交，等待确认... (Tx: ${tx.hash})`);
      
      // 等待交易确认
      await tx.wait();
      
      showNotification('success', '服务费设置成功！');
      
      // 刷新配置
      await loadContractConfig(provider);
    } catch (error: any) {
      console.error('设置服务费失败:', error);
      if (error?.code === 4001) {
        showNotification('error', '用户取消了交易');
      } else {
        showNotification('error', '设置服务费失败: ' + (error?.message || '未知错误'));
      }
    } finally {
      setIsSaving(false);
      setSavingType(null);
    }
  };

  // 设置奖励范围
  const handleSetRewardRange = async () => {
    if (!walletAddress || !isOwner) {
      showNotification('error', '请先连接合约所有者的钱包');
      return;
    }

    const minValue = parseInt(newMinReward);
    const maxValue = parseInt(newMaxReward);
    
    if (isNaN(minValue) || isNaN(maxValue) || minValue <= 0 || maxValue <= 0) {
      showNotification('error', '请输入有效的奖励范围（正整数）');
      return;
    }

    if (minValue >= maxValue) {
      showNotification('error', '最小奖励必须小于最大奖励');
      return;
    }

    setIsSaving(true);
    setSavingType('range');
    
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, AIRDROP_ABI, signer);
      
      // 发送交易
      const tx = await contract.setRewardRange(minValue, maxValue);
      showNotification('success', `交易已提交，等待确认... (Tx: ${tx.hash})`);
      
      // 等待交易确认
      await tx.wait();
      
      showNotification('success', '奖励范围设置成功！');
      
      // 刷新配置
      await loadContractConfig(provider);
    } catch (error: any) {
      console.error('设置奖励范围失败:', error);
      if (error?.code === 4001) {
        showNotification('error', '用户取消了交易');
      } else {
        showNotification('error', '设置奖励范围失败: ' + (error?.message || '未知错误'));
      }
    } finally {
      setIsSaving(false);
      setSavingType(null);
    }
  };

  // 从后端获取合约地址
  useEffect(() => {
    const fetchContractAddress = async () => {
      try {
        const kpis = await getAdminKPIs();
        if (kpis.airdrop?.contract) {
          setContractAddress(kpis.airdrop.contract);
        }
      } catch (error) {
        console.warn('无法从后端获取合约地址，使用默认值:', error);
      }
    };
    fetchContractAddress();
  }, []);

  // 检查已连接的钱包
  useEffect(() => {
    const checkWallet = async () => {
      if (checkMetaMask()) {
        const address = await getConnectedAddress();
        if (address) {
          setWalletAddress(address);
          const provider = new ethers.providers.Web3Provider((window as any).ethereum);
          await checkContractOwner(address);
          await loadContractConfig(provider);
        }
      }
    };
    checkWallet();
  }, [contractAddress]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">智能合约设置</h2>
        <p className="text-zinc-400 text-sm">管理空投合约的奖励范围和服务费配置（需要合约所有者权限）</p>
      </div>

      {/* 通知 */}
      <div className="fixed top-20 right-6 z-50 space-y-2">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md transition-all ${
              notif.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {notif.type === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span className="text-sm font-medium">{notif.message}</span>
          </div>
        ))}
      </div>

      {/* 钱包连接卡片 */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
              <Wallet className="text-indigo-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">钱包连接</h3>
              <p className="text-xs text-zinc-500">连接 MetaMask 钱包以管理合约</p>
            </div>
          </div>
          {walletAddress ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <span className="text-xs font-mono text-emerald-400">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
              {checkingOwner ? (
                <div className="text-xs text-zinc-500">检查中...</div>
              ) : isOwner === true ? (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">合约所有者</span>
                </div>
              ) : isOwner === false ? (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <XCircle size={14} className="text-red-400" />
                  <span className="text-xs font-medium text-red-400">非所有者</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {!walletAddress ? (
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            {isConnecting ? '连接中...' : '连接 MetaMask 钱包'}
          </button>
        ) : (
          <div className="text-sm text-zinc-400">
            <p>合约地址: <span className="font-mono text-zinc-300">{contractAddress}</span></p>
          </div>
        )}
      </div>

      {/* 当前配置 */}
      {walletAddress && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">当前配置</h3>
            <button
              onClick={handleRefresh}
              disabled={loadingConfig}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loadingConfig ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>

          {loadingConfig ? (
            <div className="text-center py-8 text-zinc-500">加载中...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coins size={16} className="text-emerald-400" />
                  <span className="text-xs text-zinc-500 font-medium">项目服务费</span>
                </div>
                <p className="text-xl font-bold text-white">{currentClaimFee || '-'} BNB</p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-indigo-400" />
                  <span className="text-xs text-zinc-500 font-medium">最小奖励</span>
                </div>
                <p className="text-xl font-bold text-white">{currentMinReward || '-'} RAT</p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-purple-400" />
                  <span className="text-xs text-zinc-500 font-medium">最大奖励</span>
                </div>
                <p className="text-xl font-bold text-white">{currentMaxReward || '-'} RAT</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 设置服务费 */}
      {walletAddress && isOwner && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Coins size={20} className="text-emerald-400" />
            设置项目服务费
          </h3>
          <p className="text-sm text-zinc-500 mb-4">调整用户领取空投时需要支付的 BNB 门槛费</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">新的服务费 (BNB)</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={newClaimFee}
                onChange={(e) => setNewClaimFee(e.target.value)}
                placeholder="例如: 0.000444"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <p className="text-xs text-zinc-500 mt-1">当前值: {currentClaimFee} BNB</p>
            </div>
            
            <button
              onClick={handleSetFee}
              disabled={isSaving && savingType === 'fee'}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSaving && savingType === 'fee' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  交易确认中...
                </>
              ) : (
                <>
                  <Save size={16} />
                  保存服务费设置
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 设置奖励范围 */}
      {walletAddress && isOwner && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={20} className="text-indigo-400" />
            设置奖励范围
          </h3>
          <p className="text-sm text-zinc-500 mb-4">调整空投奖励的随机范围（单位：RAT，实际发放时会乘以 10^18）</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">最小奖励 (RAT)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={newMinReward}
                  onChange={(e) => setNewMinReward(e.target.value)}
                  placeholder="例如: 100"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">当前值: {currentMinReward} RAT</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">最大奖励 (RAT)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={newMaxReward}
                  onChange={(e) => setNewMaxReward(e.target.value)}
                  placeholder="例如: 1000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">当前值: {currentMaxReward} RAT</p>
              </div>
            </div>
            
            <button
              onClick={handleSetRewardRange}
              disabled={isSaving && savingType === 'range'}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSaving && savingType === 'range' ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  交易确认中...
                </>
              ) : (
                <>
                  <Save size={16} />
                  保存奖励范围设置
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      {walletAddress && !isOwner && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-400 mb-1">权限不足</h4>
              <p className="text-sm text-yellow-300/80">
                当前连接的钱包不是合约所有者，无法修改合约配置。请使用合约所有者的钱包地址连接。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractSettingsPage;

