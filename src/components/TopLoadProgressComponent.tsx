/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Trophy,
  TrendingUp,
  Flame,
  ArrowUpRight,
  Dumbbell,
  Calendar,
  Sparkles,
  Award,
  Zap,
} from 'lucide-react';
import { WorkoutSessionSummary, MuscleGroup } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculate1RM } from '../utils/storage';

interface TopLoadProgressComponentProps {
  sessions: WorkoutSessionSummary[];
  onOpenExerciseAnalytics?: (exerciseName: string) => void;
  onGoToWorkout?: () => void;
}

export interface ExerciseOverloadRankItem {
  exerciseName: string;
  muscleLabel: string;
  baseline1RM: number;
  current1RM: number;
  delta1RMKg: number;
  delta1RMPercent: number;
  baselineWeight: number;
  baselineReps: number;
  currentWeight: number;
  currentReps: number;
  sessionsCount: number;
  firstDateStr: string;
  lastDateStr: string;
}

const DEMO_TOP_3: ExerciseOverloadRankItem[] = [
  {
    exerciseName: 'Supino Inclinado com Halteres',
    muscleLabel: 'Peitoral',
    baseline1RM: 82,
    current1RM: 96,
    delta1RMKg: 14,
    delta1RMPercent: 17.1,
    baselineWeight: 32,
    baselineReps: 8,
    currentWeight: 38,
    currentReps: 8,
    sessionsCount: 5,
    firstDateStr: '06/Out',
    lastDateStr: '01/Nov',
  },
  {
    exerciseName: 'Agachamento Livre com Barra',
    muscleLabel: 'Quadríceps',
    baseline1RM: 118,
    current1RM: 134,
    delta1RMKg: 16,
    delta1RMPercent: 13.6,
    baselineWeight: 95,
    baselineReps: 8,
    currentWeight: 108,
    currentReps: 8,
    sessionsCount: 4,
    firstDateStr: '08/Out',
    lastDateStr: '30/Out',
  },
  {
    exerciseName: 'Remada Curvada com Barra (Pronada)',
    muscleLabel: 'Costas / Dorsais',
    baseline1RM: 88,
    current1RM: 98,
    delta1RMKg: 10,
    delta1RMPercent: 11.4,
    baselineWeight: 70,
    baselineReps: 8,
    currentWeight: 78,
    currentReps: 8,
    sessionsCount: 4,
    firstDateStr: '07/Out',
    lastDateStr: '31/Out',
  },
];

export const TopLoadProgressComponent: React.FC<TopLoadProgressComponentProps> = ({
  sessions,
  onOpenExerciseAnalytics,
  onGoToWorkout,
}) => {
  const [timeWindow, setTimeWindow] = useState<'4weeks' | 'all'>('4weeks');
  const [showDemo, setShowDemo] = useState<boolean>(false);

  // Mapa rápido de exercício -> nome do grupo muscular
  const exerciseMuscleLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (Object.entries(EXERCISE_DATABASE) as [MuscleGroup, { name: string }[]][]).forEach(
      ([muscleGroup, list]) => {
        const label = MUSCLE_NAMES[muscleGroup] || muscleGroup;
        list.forEach((ex) => {
          map.set(ex.name.toLowerCase(), label);
        });
      }
    );
    return map;
  }, []);

  // Calcula os 3 exercícios com maior aumento de carga (1RM estimado) nas últimas 4 semanas
  const realTopExercises = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    // Ordena sessões cronologicamente (mais antiga -> mais recente)
    const sorted = [...sessions]
      .filter((s) => !isNaN(new Date(s.date).getTime()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sorted.length === 0) return [];

    // Referência das últimas 4 semanas (28 dias) a partir da sessão mais recente ou data atual
    const latestTimestamp = Math.max(
      Date.now(),
      new Date(sorted[sorted.length - 1].date).getTime()
    );
    const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;
    const cutoffTime = latestTimestamp - fourWeeksMs;

    const filteredSessions =
      timeWindow === '4weeks'
        ? sorted.filter((s) => new Date(s.date).getTime() >= cutoffTime)
        : sorted;

    // Agrupa histórico de cada exercício dentro da janela
    const exerciseHistory = new Map<
      string,
      {
        displayName: string;
        entries: {
          date: Date;
          best1RM: number;
          bestWeight: number;
          bestReps: number;
        }[];
      }
    >();

    filteredSessions.forEach((sess) => {
      const sessDate = new Date(sess.date);
      sess.completedExercises.forEach((ex) => {
        if (!ex.name || !ex.sets || ex.sets.length === 0) return;

        let sessBest1RM = 0;
        let sessBestWeight = 0;
        let sessBestReps = 0;

        ex.sets.forEach((set) => {
          const w = Number(set.weight) || 0;
          const r = Number(set.reps) || 0;
          if (w <= 0 || r <= 0) return;

          const est1RM = calculate1RM(w.toString(), r.toString(), set.rpe || set.rir) || w;
          if (est1RM > sessBest1RM) {
            sessBest1RM = est1RM;
            sessBestWeight = w;
            sessBestReps = r;
          }
        });

        if (sessBest1RM <= 0) return;

        const key = ex.name.trim().toLowerCase();
        const record = exerciseHistory.get(key) || {
          displayName: ex.name.trim(),
          entries: [],
        };

        record.entries.push({
          date: sessDate,
          best1RM: sessBest1RM,
          bestWeight: sessBestWeight,
          bestReps: sessBestReps,
        });

        exerciseHistory.set(key, record);
      });
    });

    const ranked: ExerciseOverloadRankItem[] = [];

    exerciseHistory.forEach((record, key) => {
      const entries = record.entries;
      if (entries.length === 0) return;

      const firstEntry = entries[0];
      // Busca o pico de 1RM alcançado após ou na sessão mais recente
      let peakEntry = entries[entries.length - 1];
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].best1RM >= peakEntry.best1RM) {
          peakEntry = entries[i];
        }
      }

      const baseline1RM = Math.round(firstEntry.best1RM);
      const current1RM = Math.round(peakEntry.best1RM);
      const delta1RMKg = Number((current1RM - baseline1RM).toFixed(1));
      const delta1RMPercent =
        baseline1RM > 0
          ? Number((((current1RM - baseline1RM) / baseline1RM) * 100).toFixed(1))
          : 0;

      const formatShort = (d: Date) =>
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

      ranked.push({
        exerciseName: record.displayName,
        muscleLabel: exerciseMuscleLabelMap.get(key) || 'Musculação',
        baseline1RM,
        current1RM,
        delta1RMKg,
        delta1RMPercent,
        baselineWeight: firstEntry.bestWeight,
        baselineReps: firstEntry.bestReps,
        currentWeight: peakEntry.bestWeight,
        currentReps: peakEntry.bestReps,
        sessionsCount: entries.length,
        firstDateStr: formatShort(firstEntry.date),
        lastDateStr: formatShort(peakEntry.date),
      });
    });

    // Ordena pelos maiores ganhos de 1RM estimado (kg e percentual)
    return ranked
      .sort((a, b) => {
        if (b.delta1RMKg !== a.delta1RMKg) return b.delta1RMKg - a.delta1RMKg;
        if (b.delta1RMPercent !== a.delta1RMPercent) return b.delta1RMPercent - a.delta1RMPercent;
        return b.current1RM - a.current1RM;
      })
      .slice(0, 3);
  }, [sessions, timeWindow, exerciseMuscleLabelMap]);

  const hasRealProgression = realTopExercises.length > 0;
  const activeTop3 = showDemo || !hasRealProgression ? DEMO_TOP_3 : realTopExercises;

  const rankStyles = [
    {
      medal: '🥇 #1 Maior Evolução',
      border: 'border-emerald-500/40 hover:border-emerald-400/70',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      barColor: 'from-emerald-500 to-teal-400',
      glow: 'from-emerald-500/10 via-transparent to-transparent',
    },
    {
      medal: '🥈 #2 Destaque de Força',
      border: 'border-teal-500/35 hover:border-teal-400/60',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      barColor: 'from-teal-500 to-sky-400',
      glow: 'from-teal-500/10 via-transparent to-transparent',
    },
    {
      medal: '🥉 #3 Consistência de Carga',
      border: 'border-sky-500/35 hover:border-sky-400/60',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      barColor: 'from-sky-500 to-indigo-400',
      glow: 'from-sky-500/10 via-transparent to-transparent',
    },
  ];

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Progresso de Carga — Top 3 Sobrecarga Progressiva (4 Semanas)
              </h2>
              {(!hasRealProgression || showDemo) && (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Demonstração
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Os 3 exercícios que apresentaram o maior ganho real de força (1RM estimado) nas últimas 4 semanas.
            </p>
          </div>
        </div>

        {/* Controles de Período e Exemplo */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasRealProgression && (
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showDemo
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {showDemo ? 'Ver Meus Dados Reais' : 'Ver Exemplo'}
            </button>
          )}

          <div className="flex items-center gap-1 bg-[#090f1d] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTimeWindow('4weeks')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                timeWindow === '4weeks'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Últimas 4 Sem
            </button>
            <button
              type="button"
              onClick={() => setTimeWindow('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                timeWindow === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tudo
            </button>
          </div>
        </div>
      </div>

      {/* Grid dos 3 Exercícios Campeões de Sobrecarga */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {activeTop3.map((item, idx) => {
          const style = rankStyles[idx] || rankStyles[2];
          const progressBarWidth = Math.min(
            100,
            Math.max(25, item.delta1RMPercent > 0 ? 45 + item.delta1RMPercent * 2.5 : 40)
          );

          return (
            <div
              key={`${item.exerciseName}-${idx}`}
              className={`relative overflow-hidden rounded-2xl bg-[#090f1d] border ${style.border} p-4 sm:p-5 flex flex-col justify-between transition-all shadow-lg group`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${style.glow} pointer-events-none`}
              />

              <div className="relative z-10 space-y-3.5">
                {/* Topo: Medalha + Grupo Muscular */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${style.badgeBg}`}
                  >
                    {style.medal}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded-lg border border-slate-700/70">
                    {item.muscleLabel}
                  </span>
                </div>

                {/* Nome do Exercício */}
                <div>
                  <h3
                    className="text-sm sm:text-base font-black text-white leading-snug line-clamp-1"
                    title={item.exerciseName}
                  >
                    {item.exerciseName}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>
                      {item.firstDateStr} ➔ {item.lastDateStr} ({item.sessionsCount}{' '}
                      {item.sessionsCount === 1 ? 'treino' : 'treinos'})
                    </span>
                  </span>
                </div>

                {/* Bloco Central: Evolução de 1RM Estimado */}
                <div className="bg-[#0d1527] border border-slate-800/90 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Evolução de 1RM Estimado</span>
                    <span className="text-emerald-400 font-mono">Sobrecarga</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-xs text-slate-400 line-through">
                        {item.baseline1RM}kg
                      </span>
                      <span className="text-slate-500 text-xs">➔</span>
                      <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                        {item.current1RM}
                      </span>
                      <span className="text-xs text-emerald-400 font-bold">kg</span>
                    </div>

                    {/* Badge do Aumento */}
                    <div className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-black">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {item.delta1RMKg > 0 ? `+${item.delta1RMKg}kg` : `${item.delta1RMKg}kg`}
                      </span>
                      <span className="text-[10px] text-emerald-400/90 ml-0.5">
                        ({item.delta1RMPercent > 0 ? `+${item.delta1RMPercent}%` : `${item.delta1RMPercent}%`})
                      </span>
                    </div>
                  </div>

                  {/* Barra Visual de Sobrecarga */}
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${style.barColor} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${progressBarWidth}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Rodapé do Card: Carga de Trabalho Real & Botão de Curva */}
              <div className="relative z-10 mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <div className="font-mono text-[11px] text-slate-300">
                  <span className="text-slate-500 block text-[10px]">Série de Trabalho:</span>
                  <span>
                    {item.baselineWeight}kg×{item.baselineReps} ➔{' '}
                    <strong className="text-emerald-400">
                      {item.currentWeight}kg×{item.currentReps}
                    </strong>
                  </span>
                </div>

                {onOpenExerciseAnalytics && (
                  <button
                    type="button"
                    onClick={() => onOpenExerciseAnalytics(item.exerciseName)}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800/90 hover:bg-slate-700 text-sky-300 border border-slate-700 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    title="Abrir gráfico detalhado deste exercício"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ver Curva</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dica de Sobrecarga Progressiva ou Ação para Primeiro Treino */}
      <div className="bg-[#090f1d] border border-slate-800/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Flame className="w-4 h-4 fill-emerald-400" />
          </div>
          <span>
            {hasRealProgression && !showDemo
              ? 'Dica Científica: Aumentos de +2.5% a +10% no 1RM estimado ao longo de 4 semanas confirmam hipertrofia miofibrilar e ganho real de força.'
              : 'Exibindo ranking demonstrativo. Conclua seus treinos da semana para ranquear automaticamente seus 3 exercícios com maior ganho de 1RM!'}
          </span>
        </div>

        {!hasRealProgression && onGoToWorkout && (
          <button
            type="button"
            onClick={onGoToWorkout}
            className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shrink-0 cursor-pointer transition-all"
          >
            Treinar Agora
          </button>
        )}
      </div>
    </div>
  );
};
