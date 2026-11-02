import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        const bgClasses = toast.type === 'success'
          ? 'bg-onyx-900 border-emerald-500/50 text-white'
          : toast.type === 'error'
          ? 'bg-onyx-900 border-red-500/50 text-white'
          : 'bg-onyx-900 border-gold-500/50 text-white';

        const icon = toast.type === 'success'
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          : toast.type === 'error'
          ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          : <Info className="w-4 h-4 text-gold-400 shrink-0" />;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${bgClasses} shadow-2xl text-xs font-medium max-w-sm animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
