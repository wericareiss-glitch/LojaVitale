/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, Flame, Navigation, ExternalLink, X, Activity } from 'lucide-react';
import { safeStorage } from '../utils/storage';

interface CardioDockProps {
  userId: string;
  onOpenCardio: () => void;
}

interface ActiveCardioData {
  id: string;
  isRunning: boolean;
  startTime: number | null;
  accumulatedSeconds: number;
  type: string;
  distanceKm: number;
  calories: number;
  speedKmh: number;
  intensity: string;
  autoEstimate: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  esteira: '🏃',
  bike: '🚴',
  escada: '🪜',
  eliptico: '⛷️',
  corrida_rua: '👟',
  caminhada: '🚶',
};

const TYPE_NAMES: Record<string, string> = {
  esteira: 'Esteira',
  bike: 'Bicicleta',
  escada: 'Escada',
  eliptico: 'Elíptico',
  corrida_rua: 'Corrida',
  caminhada: 'Caminhada',
};

export const CardioDock: React.FC<CardioDockProps> = ({ userId, onOpenCardio }) => {
  const activeStorageKey = `mtp_cardio_active_${userId}`;
  const [activeData, setActiveData] = useState<ActiveCardioData | null>(() => {
    return safeStorage.get<ActiveCardioData | null>(activeStorageKey, null);
  });
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Poll storage periodically and on visibility/focus to stay 100% in sync after screen-off
  useEffect(() => {
    const syncFromStorage = () => {
      const data = safeStorage.get<ActiveCardioData | null>(activeStorageKey, null);
      setActiveData(data);
      if (data) {
        if (data.isRunning && data.startTime) {
          const currentSecs = data.accumulatedSeconds + Math.floor((Date.now() - data.startTime) / 1000);
          setDisplaySeconds(currentSecs);
        } else {
          setDisplaySeconds(data.accumulatedSeconds || 0);
        }
      }
    };

    syncFromStorage();
    const interval = setInterval(syncFromStorage, 500);

    document.addEventListener('visibilitychange', syncFromStorage);
    window.addEventListener('focus', syncFromStorage);
    window.addEventListener('pageshow', syncFromStorage);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', syncFromStorage);
      window.removeEventListener('focus', syncFromStorage);
      window.removeEventListener('pageshow', syncFromStorage);
    };
  }, [activeStorageKey]);

  if (isDismissed || !activeData || (!activeData.isRunning && activeData.accumulatedSeconds === 0)) {
    return null;
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hours = displaySeconds / 3600;
  const liveDistance = activeData.autoEstimate && hours > 0
    ? (activeData.speedKmh * hours).toFixed(2)
    : (activeData.distanceKm || 0).toFixed(2);

  const liveCalories = activeData.autoEstimate && hours > 0
    ? Math.round(450 * hours)
    : Math.round(activeData.calories || 0);

  const handleTogglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeData) return;

    if (activeData.isRunning) {
      // Pause
      const additional = activeData.startTime ? Math.floor((Date.now() - activeData.startTime) / 1000) : 0;
      const updated: ActiveCardioData = {
        ...activeData,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: activeData.accumulatedSeconds + additional,
      };
      safeStorage.set(activeStorageKey, updated);
      setActiveData(updated);
    } else {
      // Resume
      const updated: ActiveCardioData = {
        ...activeData,
        isRunning: true,
        startTime: Date.now(),
      };
      safeStorage.set(activeStorageKey, updated);
      setActiveData(updated);
    }
  };

  return (
    <div
      onClick={onOpenCardio}
      className="fixed bottom-[76px] md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-80 z-30 bg-slate-900/95 backdrop-blur-md border border-sky-500/40 rounded-2xl p-2 sm:p-2.5 shadow-2xl shadow-sky-950/50 cursor-pointer transition-all hover:border-sky-400 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-center justify-between gap-2.5">
        {/* Left: Type Icon & Pulse */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sm shrink-0">
            <span>{TYPE_ICONS[activeData.type] || '🏃'}</span>
            {activeData.isRunning && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            )}
            {activeData.isRunning && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                {TYPE_NAMES[activeData.type] || 'Cardio'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {activeData.isRunning ? 'Ativo' : 'Pausa'}
              </span>
            </div>

            <div className="font-mono font-black text-base text-white tracking-tight leading-none mt-0.5">
              {formatTime(displaySeconds)}
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="text-right hidden xs:block">
            <div className="flex items-center justify-end gap-1 text-xs font-bold text-amber-400">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{liveCalories} kcal</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {liveDistance} km
            </div>
          </div>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={handleTogglePlayPause}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              activeData.isRunning
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            }`}
            title={activeData.isRunning ? 'Pausar Cardio' : 'Retomar Cardio'}
          >
            {activeData.isRunning ? (
              <Pause className="w-4 h-4 fill-current stroke-current" />
            ) : (
              <Play className="w-4 h-4 fill-current stroke-current ml-0.5" />
            )}
          </button>

          {/* Open full tab button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCardio();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Abrir tela de cardio"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Ocultar dock flutuante"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
