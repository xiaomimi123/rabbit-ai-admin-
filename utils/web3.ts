import { ethers } from 'ethers';

// ERC20 ABI (只需要 transfer 函数)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// BSC 主网 Chain ID
const BSC_CHAIN_ID = 56;

/**
 * 检查 MetaMask 是否安装
 */
export function checkMetaMask(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
}

/**
 * 连接 MetaMask 钱包
 */
export async function connectWallet(): Promise<ethers.providers.Web3Provider> {
  if (!checkMetaMask()) {
    throw new Error('请安装 MetaMask 浏览器扩展');
  }

  const provider = new ethers.providers.Web3Provider((window as any).ethereum);
  
  // 请求连接账户
  await provider.send('eth_requestAccounts', []);
  
  // 检查网络
  const network = await provider.getNetwork();
  if (network.chainId !== BSC_CHAIN_ID) {
    throw new Error(`请切换到 BSC 主网 (Chain ID: ${BSC_CHAIN_ID})，当前网络: ${network.chainId}`);
  }
  
  return provider;
}

/**
 * 获取当前连接的地址
 */
export async function getConnectedAddress(): Promise<string | null> {
  if (!checkMetaMask()) return null;
  
  try {
    const provider = new ethers.providers.Web3Provider((window as any).ethereum);
    const signer = provider.getSigner();
    return await signer.getAddress();
  } catch {
    return null;
  }
}

/**
 * 切换网络到 BSC 主网
 */
export async function switchToBSC(): Promise<void> {
  if (!checkMetaMask()) {
    throw new Error('请安装 MetaMask');
  }

  try {
    await (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${BSC_CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError: any) {
    // 如果网络不存在，尝试添加
    if (switchError.code === 4902) {
      await (window as any).ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
            chainName: 'BNB Smart Chain',
            nativeCurrency: {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18,
            },
            rpcUrls: ['https://bsc-dataseed1.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com/'],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * 发送 USDT 转账
 * @param usdtAddress USDT 合约地址
 * @param to 接收地址
 * @param amount 金额（字符串，例如 "100.5"）
 * @param decimals USDT 精度（通常是 18）
 */
export async function transferUSDT(
  usdtAddress: string,
  to: string,
  amount: string,
  decimals: number = 18
): Promise<ethers.ContractTransaction> {
  if (!checkMetaMask()) {
    throw new Error('请安装 MetaMask');
  }

  const provider = new ethers.providers.Web3Provider((window as any).ethereum);
  const signer = provider.getSigner();
  
  // 检查网络
  const network = await provider.getNetwork();
  if (network.chainId !== BSC_CHAIN_ID) {
    await switchToBSC();
    // 重新获取 provider（网络切换后）
    const newProvider = new ethers.providers.Web3Provider((window as any).ethereum);
    const newSigner = newProvider.getSigner();
    const contract = new ethers.Contract(usdtAddress, ERC20_ABI, newSigner);
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    return await contract.transfer(to, amountWei);
  }
  
  const contract = new ethers.Contract(usdtAddress, ERC20_ABI, signer);
  const amountWei = ethers.utils.parseUnits(amount, decimals);
  
  return await contract.transfer(to, amountWei);
}

/**
 * 获取 USDT 余额
 */
export async function getUSDTBalance(
  usdtAddress: string,
  accountAddress: string
): Promise<string> {
  if (!checkMetaMask()) {
    throw new Error('请安装 MetaMask');
  }

  const provider = new ethers.providers.Web3Provider((window as any).ethereum);
  const contract = new ethers.Contract(usdtAddress, ERC20_ABI, provider);
  const balance = await contract.balanceOf(accountAddress);
  const decimals = await contract.decimals();
  return ethers.utils.formatUnits(balance, decimals);
}

/**
 * 获取 USDT 精度
 */
export async function getUSDTDecimals(usdtAddress: string): Promise<number> {
  if (!checkMetaMask()) {
    throw new Error('请安装 MetaMask');
  }

  const provider = new ethers.providers.Web3Provider((window as any).ethereum);
  const contract = new ethers.Contract(usdtAddress, ERC20_ABI, provider);
  return await contract.decimals();
}

