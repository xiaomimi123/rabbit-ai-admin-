import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 全局错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // 这里可以添加错误上报逻辑
    // 例如：上报到错误监控服务
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null,
    });
    // 重新加载页面以确保状态完全重置
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-400" size={24} />
              <h2 className="text-xl font-bold text-red-400">出现错误</h2>
            </div>
            
            <p className="text-zinc-400 mb-2">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-4 mb-4">
                <summary className="text-sm text-zinc-500 cursor-pointer hover:text-zinc-400">
                  查看错误详情
                </summary>
                <pre className="mt-2 p-3 bg-zinc-950 rounded-lg text-xs text-zinc-400 overflow-auto max-h-40">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
            
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors font-medium"
            >
              <RefreshCw size={16} />
              重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

