/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  Activity, 
  Flame, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { MuscleGroup, WorkoutSessionSummary } from '../types/workout';
import { MUSCLE_NAMES, EXERCISE_DATABASE } from '../data/exerciseDatabase';

interface MuscleRecoveryHeatmapProps {
  sessions: WorkoutSessionSummary[];
  className?: string;
}

interface MuscleRecoveryStatus {
  muscle: MuscleGroup;
  name: string;
  hoursElapsed: number | null; // null if never trained
  percentRecovered: number; // 0 to 100
  status: 'fatigued' | 'recovering' | 'ready';
  lastTrainedDate: Date | null;
}

const ALL_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'quadriceps',
  'hamstrings',
  'glutes',
  'shoulders',
  'triceps',
  'biceps',
  'rear_delts',
  'calves',
  'abs',
];

const findMuscleKey = (item: { name: string; muscleGroup?: string; muscleKey?: string }): MuscleGroup | null => {
  if (item.muscleKey && ALL_MUSCLES.includes(item.muscleKey as MuscleGroup)) {
    return item.muscleKey as MuscleGroup;
  }
  if (item.muscleGroup && ALL_MUSCLES.includes(item.muscleGroup as MuscleGroup)) {
    return item.muscleGroup as MuscleGroup;
  }
  if (item.muscleGroup) {
    const entry = Object.entries(MUSCLE_NAMES).find(
      ([, name]) => name.toLowerCase() === item.muscleGroup?.toLowerCase()
    );
    if (entry) return entry[0] as MuscleGroup;
  }
  for (const m of ALL_MUSCLES) {
    const list = EXERCISE_DATABASE[m] || [];
    if (list.some((ex) => ex.name.toLowerCase() === item.name.toLowerCase())) {
      return m;
    }
  }
  return null;
};

export const MuscleRecoveryHeatmap: React.FC<MuscleRecoveryHeatmapProps> = ({
  sessions,
  className = '',
}) => {
  // 1. Calcula o tempo decorrido desde o último treino de cada grupo muscular
  const recoveryData = useMemo(() => {
    const now = Date.now();
    const lastTrainedMap: Partial<Record<MuscleGroup, number>> = {};

    // Ordena sessões da mais recente para a mais antiga
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sorted.forEach((sess) => {
      const sessTime = new Date(sess.date).getTime();
      if (isNaN(sessTime)) return;

      sess.completedExercises.forEach((item) => {
        const mKey = findMuscleKey(item);
        if (mKey && !lastTrainedMap[mKey]) {
          lastTrainedMap[mKey] = sessTime;
        }
      });
    });

    const list: MuscleRecoveryStatus[] = ALL_MUSCLES.map((muscle) => {
      const lastTimestamp = lastTrainedMap[muscle];
      if (!lastTimestamp) {
        return {
          muscle,
          name: MUSCLE_NAMES[muscle] || muscle,
          hoursElapsed: null,
          percentRecovered: 100,
          status: 'ready',
          lastTrainedDate: null,
        };
      }

      const diffMs = Math.max(0, now - lastTimestamp);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));

      // 48 horas como linha de base para recuperação ótima de hipertrofia
      const percent = Math.min(100, Math.round((hours / 48) * 100));

      let status: 'fatigued' | 'recovering' | 'ready' = 'ready';
      if (hours < 24) {
        status = 'fatigued';
      } else if (hours < 48) {
        status = 'recovering';
      } else {
        status = 'ready';
      }

      return {
        muscle,
        name: MUSCLE_NAMES[muscle] || muscle,
        hoursElapsed: hours,
        percentRecovered: percent,
        status,
        lastTrainedDate: new Date(lastTimestamp),
      };
    });

    return list;
  }, [sessions]);

  // Contagem rápida de prontos vs recuperando
  const readyCount = recoveryData.filter((r) => r.status === 'ready').length;
  const recoveringCount = recoveryData.filter((r) => r.status === 'recovering').length;
  const fatiguedCount = recoveryData.filter((r) => r.status === 'fatigued').length;

  return (
    <div className={`bg-[#0c1424] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl ${className}`}>
      {/* Header com legenda rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
              <span>Mapa de Recuperação Muscular</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                48h Bio
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Janela de regeneração proteica e prontidão para novo estímulo
            </p>
          </div>
        </div>

        {/* Badges de Status Geral */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{readyCount} 100% Prontos</span>
          </span>
          {recoveringCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{recoveringCount} Em Reparo</span>
            </span>
          )}
          {fatiguedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>{fatiguedCount} Fadiga &lt;24h</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid de Músculos em Cards Responsivos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {recoveryData.map((item) => {
          let badgeBorder = 'border-emerald-500/30 bg-emerald-950/20';
          let textColor = 'text-emerald-400';
          let barBg = 'bg-emerald-500';
          let statusLabel = 'Pronto';

          if (item.status === 'fatigued') {
            badgeBorder = 'border-rose-500/30 bg-rose-950/20';
            textColor = 'text-rose-400';
            barBg = 'bg-rose-500';
            statusLabel = 'Fadiga Alta';
          } else if (item.status === 'recovering') {
            badgeBorder = 'border-amber-500/30 bg-amber-950/20';
            textColor = 'text-amber-400';
            barBg = 'bg-amber-400';
            statusLabel = 'Recuperando';
          }

          return (
            <div
              key={item.muscle}
              className={`p-2.5 sm:p-3 rounded-2xl border ${badgeBorder} flex flex-col justify-between transition-all hover:border-slate-600`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {item.name}
                </span>
                <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${textColor} bg-slate-900/80 shrink-0`}>
                  {item.hoursElapsed === null ? '100%' : `${item.percentRecovered}%`}
                </span>
              </div>

              {/* Barra de progresso de recuperação */}
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full ${barBg} transition-all duration-500 rounded-full`}
                  style={{ width: `${item.percentRecovered}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">
                  {item.hoursElapsed === null 
                    ? 'Descansado' 
                    : item.hoursElapsed < 1 
                    ? 'Treinado agora' 
                    : `Há ${item.hoursElapsed}h`}
                </span>
                <span className={`font-semibold ${textColor}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
