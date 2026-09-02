import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  level: 'info' | 'success' | 'warn' | 'error';
  title: string;
  message: string;
  duration?: number; // ms — 0 = sem auto-dismiss
  icon?: 'check' | 'warn' | 'error' | 'loading' | 'info';
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const iconMap = {
  check: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  warn: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  loading: <Loader2 className="w-5 h-5 text-blue-400 shrink-0 animate-spin" />,
  info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />
};

const borderMap = {
  info: 'border-blue-500/40 bg-blue-950/70',
  success: 'border-emerald-500/40 bg-emerald-950/70',
  warn: 'border-amber-500/40 bg-amber-950/70',
  error: 'border-rose-500/40 bg-rose-950/70'
};

const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const icon = toast.icon ? iconMap[toast.icon] : iconMap[toast.level] || iconMap.info;
  const borderClass = borderMap[toast.level] || borderMap.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border ${borderClass} backdrop-blur-md shadow-2xl shadow-black/40 min-w-[320px] max-w-[420px] animate-in fade-in slide-in-from-top-4`}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white leading-tight">{toast.title}</div>
        <div className="text-xs text-slate-300 mt-0.5 break-words">{toast.message}</div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white transition-colors p-1 -mt-1 -mr-1 rounded-md hover:bg-slate-800/50"
        aria-label="Fechar notificação"
        title="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-label="Notificações"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default Toast;
