import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'warning',
}) => {
  if (!isOpen) return null;

  const bgColor = type === 'danger' 
    ? 'bg-red-500/10 border-red-500/20' 
    : type === 'warning'
    ? 'bg-yellow-500/10 border-yellow-500/20'
    : 'bg-blue-500/10 border-blue-500/20';

  const buttonColor = type === 'danger'
    ? 'bg-red-500 hover:bg-red-400'
    : type === 'warning'
    ? 'bg-yellow-500 hover:bg-yellow-400'
    : 'bg-blue-500 hover:bg-blue-400';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onCancel} />
      <div className="relative bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`p-6 ${bgColor} border-b border-zinc-800`}>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className={type === 'danger' ? 'text-red-400' : type === 'warning' ? 'text-yellow-400' : 'text-blue-400'} />
            <h3 className="font-bold text-lg text-white">{title}</h3>
            <button
              onClick={onCancel}
              className="ml-auto text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-zinc-400 text-sm">{message}</p>
        </div>

        <div className="p-6 bg-zinc-900/50 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-zinc-500 hover:text-white font-bold text-sm transition-colors rounded-xl border border-zinc-800 hover:border-zinc-700"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 ${buttonColor} text-white font-black text-sm rounded-xl transition-all`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for managing confirm dialog
export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: 'danger' | 'warning' | 'info';
    }
  ) => {
    setConfig({
      title,
      message,
      onConfirm: () => {
        setIsOpen(false);
        onConfirm();
      },
      ...options,
    });
    setIsOpen(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setConfig(null);
  };

  return {
    isOpen,
    config,
    showConfirm,
    handleCancel,
  };
};

