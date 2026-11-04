import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 border border-amber-500/50 px-3.5 py-2 text-xs font-bold text-amber-300 shadow-xl backdrop-blur-md animate-fadeIn">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Modo Offline — Dados locais e treinos salvos ativos.</span>
    </div>
  );
};
