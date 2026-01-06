/**
 * 设备检测工具
 * 用于判断当前运行环境（桌面端 vs 移动端，MetaMask 应用内 vs 普通浏览器）
 */

/**
 * 检测是否为移动设备
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 检测是否在 MetaMask 应用内浏览器
 * MetaMask 应用内浏览器会注入 window.ethereum 并且标记 isMetaMask
 */
export function isMetaMaskApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  return Boolean((window as any).ethereum?.isMetaMask);
}

/**
 * 检测是否为桌面端浏览器扩展
 * 桌面端 Chrome/Edge/Firefox + MetaMask 扩展
 */
export function hasMetaMaskExtension(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !isMobile() && typeof (window as any).ethereum !== 'undefined';
}

/**
 * 检测当前环境类型（用于调试）
 */
export function getEnvironmentType(): string {
  if (typeof window === 'undefined') return 'SSR';
  
  if (!isMobile() && hasMetaMaskExtension()) {
    return 'Desktop_Extension';
  }
  
  if (isMobile() && isMetaMaskApp()) {
    return 'Mobile_MetaMaskApp';
  }
  
  if (isMobile()) {
    return 'Mobile_Browser';
  }
  
  return 'Desktop_Browser';
}

