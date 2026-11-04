/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Award,
  Flame,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  Dumbbell,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { WorkoutSessionSummary, MuscleGroup } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';

interface WeeklyVolumeOverloadChartProps {
  sessions: WorkoutSessionSummary[];
  onGoToWorkout?: () => void;
}

export interface WeeklyVolumePoint {
  weekKey: string;
  weekLabel: string;
  fullRange: string;
  volumeKg: number;
  targetOverloadKg: number;
  sets: number;
  sessionsCount: number;
  deltaKg: number;
  deltaPercent: number;
  isCurrentWeek?: boolean;
}

/**
 * Retorna a data de início da semana (Segunda-feira 00:00:00) para agrupar sessões por microciclo semanal
 */
function getMondayOfWeek(dateInput: Date | string): Date {
  const d = new Date(dateInput);
  const day = d.getDay();
  // Domingo (0) volta 6 dias; Segunda (1) volta 0 dias
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
  return monday;
}

function formatShortDayMonth(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${day}/${months[d.getMonth()]}`;
}

export const WeeklyVolumeOverloadChart: React.FC<WeeklyVolumeOverloadChartProps> = ({
  sessions,
  onGoToWorkout,
}) => {
  const [selectedMuscle, setSelectedMuscle] = useState<'all' | MuscleGroup>('all');
  const [weeksRange, setWeeksRange] = useState<8 | 12 | 999>(8);
  const [chartStyle, setChartStyle] = useState<'area' | 'bars'>('area');
  const [showDemoData, setShowDemoData] = useState<boolean>(false);

  // Mapa rápido de exercício -> grupo muscular primário
  const exerciseMuscleMap = useMemo(() => {
    const map = new Map<string, MuscleGroup>();
    (Object.entries(EXERCISE_DATABASE) as [MuscleGroup, { name: string }[]][]).forEach(
      ([muscleGroup, list]) => {
        list.forEach((ex) => {
          map.set(ex.name.toLowerCase(), muscleGroup);
        });
      }
    );
    return map;
  }, []);

  // Curva de demonstração realista de 8 semanas mostrando sobrecarga progressiva + 1 semana de deload
  const demoWeeklyData: WeeklyVolumePoint[] = useMemo(
    () => [
      {
        weekKey: '2026-W37',
        weekLabel: '14/Set',
        fullRange: '14/Set a 20/Set',
        volumeKg: 18400,
        targetOverloadKg: 18400,
        sets: 52,
        sessionsCount: 4,
        deltaKg: 0,
        deltaPercent: 0,
      },
      {
        weekKey: '2026-W38',
        weekLabel: '21/Set',
        fullRange: '21/Set a 27/Set',
        volumeKg: 19550,
        targetOverloadKg: 19320,
        sets: 55,
        sessionsCount: 4,
        deltaKg: 1150,
        deltaPercent: 6.3,
      },
      {
        weekKey: '2026-W39',
        weekLabel: '28/Set',
        fullRange: '28/Set a 04/Out',
        volumeKg: 20800,
        targetOverloadKg: 20527,
        sets: 58,
        sessionsCount: 4,
        deltaKg: 1250,
        deltaPercent: 6.4,
      },
      {
        weekKey: '2026-W40',
        weekLabel: '05/Out',
        fullRange: '05/Out a 11/Out',
        volumeKg: 22100,
        targetOverloadKg: 21840,
        sets: 60,
        sessionsCount: 5,
        deltaKg: 1300,
        deltaPercent: 6.3,
      },
      {
        weekKey: '2026-W41',
        weekLabel: '12/Out',
        fullRange: '12/Out a 18/Out (Deload)',
        volumeKg: 15800,
        targetOverloadKg: 16500,
        sets: 42,
        sessionsCount: 4,
        deltaKg: -6300,
        deltaPercent: -28.5,
      },
      {
        weekKey: '2026-W42',
        weekLabel: '19/Out',
        fullRange: '19/Out a 25/Out',
        volumeKg: 22950,
        targetOverloadKg: 22500,
        sets: 61,
        sessionsCount: 5,
        deltaKg: 7150,
        deltaPercent: 45.3,
      },
      {
        weekKey: '2026-W43',
        weekLabel: '26/Out',
        fullRange: '26/Out a 01/Nov',
        volumeKg: 24200,
        targetOverloadKg: 24097,
        sets: 64,
        sessionsCount: 5,
        deltaKg: 1250,
        deltaPercent: 5.4,
      },
      {
        weekKey: '2026-W44',
        weekLabel: '02/Nov',
        fullRange: '02/Nov a 08/Nov (Atual)',
        volumeKg: 25640,
        targetOverloadKg: 25410,
        sets: 66,
        sessionsCount: 5,
        deltaKg: 1440,
        deltaPercent: 6.0,
        isCurrentWeek: true,
      },
    ],
    []
  );

  // Processamento real das sessões agrupadas por semana
  const realWeeklyData: WeeklyVolumePoint[] = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const weekMap = new Map<
      number,
      {
        monday: Date;
        sunday: Date;
        volumeKg: number;
        sets: number;
        sessionsCount: number;
      }
    >();

    sessions.forEach((sess) => {
      const parsedDate = new Date(sess.date);
      if (isNaN(parsedDate.getTime())) return;

      const monday = getMondayOfWeek(parsedDate);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const key = monday.getTime();

      let sessVolumeKg = 0;
      let sessSets = 0;

      if (selectedMuscle === 'all') {
        // Soma volume total da sessão (ou recalcula das séries caso totalVolumeLoadKg seja 0)
        if (sess.totalVolumeLoadKg && sess.totalVolumeLoadKg > 0) {
          sessVolumeKg = sess.totalVolumeLoadKg;
        } else {
          sess.completedExercises.forEach((ex) => {
            ex.sets.forEach((s) => {
              sessVolumeKg += (s.weight || 0) * (s.reps || 0);
            });
          });
        }
        sessSets =
          sess.totalSets ||
          sess.completedExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
      } else {
        // Filtra apenas exercícios do grupo muscular selecionado
        sess.completedExercises.forEach((ex) => {
          const mg = exerciseMuscleMap.get(ex.name.toLowerCase());
          if (mg === selectedMuscle) {
            sessSets += ex.sets.length;
            ex.sets.forEach((s) => {
              sessVolumeKg += (s.weight || 0) * (s.reps || 0);
            });
          }
        });
      }

      if (sessVolumeKg === 0 && sessSets === 0) return;

      const existing = weekMap.get(key) || {
        monday,
        sunday,
        volumeKg: 0,
        sets: 0,
        sessionsCount: 0,
      };

      existing.volumeKg += Math.round(sessVolumeKg);
      existing.sets += sessSets;
      existing.sessionsCount += 1;
      weekMap.set(key, existing);
    });

    const sortedWeeks = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, val]) => val);

    const currentMondayTime = getMondayOfWeek(new Date()).getTime();

    const points: WeeklyVolumePoint[] = sortedWeeks.map((item, idx) => {
      const prev = idx > 0 ? sortedWeeks[idx - 1] : null;
      const deltaKg = prev ? item.volumeKg - prev.volumeKg : 0;
      const deltaPercent =
        prev && prev.volumeKg > 0
          ? Number((((item.volumeKg - prev.volumeKg) / prev.volumeKg) * 100).toFixed(1))
          : 0;

      // Meta cientifica de sobrecarga progressiva (+5% sobre a semana anterior)
      const targetOverloadKg = prev
        ? Math.round(prev.volumeKg * 1.05)
        : item.volumeKg;

      const weekLabel = formatShortDayMonth(item.monday);
      const fullRange = `${formatShortDayMonth(item.monday)} a ${formatShortDayMonth(item.sunday)}`;

      return {
        weekKey: String(item.monday.getTime()),
        weekLabel,
        fullRange,
        volumeKg: item.volumeKg,
        targetOverloadKg,
        sets: item.sets,
        sessionsCount: item.sessionsCount,
        deltaKg,
        deltaPercent,
        isCurrentWeek: item.monday.getTime() === currentMondayTime,
      };
    });

    return weeksRange === 999 ? points : points.slice(-weeksRange);
  }, [sessions, selectedMuscle, weeksRange, exerciseMuscleMap]);

  const hasRealData = realWeeklyData.length > 0;
  const activeData = showDemoData || !hasRealData ? demoWeeklyData : realWeeklyData;

  // Métricas e diagnóstico de sobrecarga semanal
  const metrics = useMemo(() => {
    if (activeData.length === 0) {
      return {
        latestVolume: 0,
        prevVolume: 0,
        peakVolume: 0,
        avgVolume: 0,
        latestDeltaKg: 0,
        latestDeltaPercent: 0,
        totalGrowthPercent: 0,
        status: 'baseline' as const,
        statusTitle: 'Aguardando Primeiras Semanas',
        statusDesc: 'Conclua sessões de treino para plotar sua curva de volume semanal.',
      };
    }

    const first = activeData[0];
    const latest = activeData[activeData.length - 1];
    const prev = activeData.length >= 2 ? activeData[activeData.length - 2] : null;
    const peakVolume = Math.max(...activeData.map((d) => d.volumeKg));
    const avgVolume = Math.round(
      activeData.reduce((acc, d) => acc + d.volumeKg, 0) / activeData.length
    );

    const totalGrowthPercent =
      first.volumeKg > 0 && activeData.length >= 2
        ? Number((((latest.volumeKg - first.volumeKg) / first.volumeKg) * 100).toFixed(1))
        : 0;

    let status: 'optimal' | 'aggressive' | 'deload' | 'stable' = 'stable';
    let statusTitle = 'Volume Semanal Estabilizado';
    let statusDesc =
      'Seu volume total semanal está consistente. Busque incrementar 2.5% a 5% de tonelagem na próxima semana para estimular novas adaptações.';

    if (prev) {
      if (latest.deltaPercent >= 2 && latest.deltaPercent <= 12) {
        status = 'optimal';
        statusTitle = '🚀 Sobrecarga Progressiva Ideal (+2% a +12%)';
        statusDesc = `Aumento de +${latest.deltaKg.toLocaleString()} kg (+${latest.deltaPercent}%) em relação à semana anterior. Estímulo hipertrófico na zona fisiológica ótima sem risco excessivo de overreaching.`;
      } else if (latest.deltaPercent > 12) {
        status = 'aggressive';
        statusTitle = '⚡ Salto Intenso de Volume Semanal';
        statusDesc = `Aumento de +${latest.deltaKg.toLocaleString()} kg (+${latest.deltaPercent}%) nesta semana. Monitore a recuperação articular e qualidade do sono para consolidar o ganho.`;
      } else if (latest.deltaPercent <= -10) {
        status = 'deload';
        statusTitle = '🛡️ Redução de Volume / Microciclo Regenerativo';
        statusDesc = `Volume ${Math.abs(latest.deltaPercent)}% menor que na semana anterior (${latest.volumeKg.toLocaleString()} kg). Caso a semana ainda esteja em andamento, os próximos treinos elevarão a curva.`;
      }
    }

    return {
      latestVolume: latest.volumeKg,
      prevVolume: prev?.volumeKg || 0,
      peakVolume,
      avgVolume,
      latestDeltaKg: latest.deltaKg,
      latestDeltaPercent: latest.deltaPercent,
      totalGrowthPercent,
      status,
      statusTitle,
      statusDesc,
    };
  }, [activeData]);

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Sobrecarga Progressiva — Volume Total Semanal (kg)
              </h2>
              {(!hasRealData || showDemoData) && (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Visualização Exemplo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tonelagem total levantada semana a semana (Séries × Repetições × Carga em kg) para acompanhamento da sobrecarga progressiva.
            </p>
          </div>
        </div>

        {/* Botões de Controle Rápido */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasRealData && (
            <button
              type="button"
              onClick={() => setShowDemoData(!showDemoData)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showDemoData
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {showDemoData ? 'Voltar aos Meus Dados' : 'Ver Curva Exemplo (8 Sem)'}
            </button>
          )}

          {/* Seletor de Janela de Semanas */}
          <div className="flex items-center gap-1 bg-[#090f1d] p-1 rounded-xl border border-slate-800">
            {[
              { value: 8 as const, label: '8 Sem' },
              { value: 12 as const, label: '12 Sem' },
              { value: 999 as const, label: 'Tudo' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWeeksRange(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  weeksRange === opt.value
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Filtros: Grupo Muscular + Estilo do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 sm:max-w-xs">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filtrar Volume por Grupamento:</span>
          </label>
          <select
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value as 'all' | MuscleGroup)}
            className="w-full bg-[#090f1d] border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-2xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none transition-all cursor-pointer"
          >
            <option value="all" className="bg-slate-900 text-white">
              🏋️ Volume Total Global (Todos os Músculos)
            </option>
            {(Object.keys(MUSCLE_NAMES) as MuscleGroup[]).map((mg) => (
              <option key={mg} value={mg} className="bg-slate-900 text-white">
                {MUSCLE_NAMES[mg]}
              </option>
            ))}
          </select>
        </div>

        {/* Alternador entre Área (Curva) e Barras + Séries */}
        <div className="flex items-center gap-1 bg-[#090f1d] p-1 rounded-2xl border border-slate-800 self-start sm:self-end">
          <button
            type="button"
            onClick={() => setChartStyle('area')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              chartStyle === 'area'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Curva de Sobrecarga (kg)</span>
          </button>

          <button
            type="button"
            onClick={() => setChartStyle('bars')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              chartStyle === 'bars'
                ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Barras Semanais + Séries</span>
          </button>
        </div>
      </div>

      {/* KPIs Semanais de Sobrecarga */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Volume da Última Semana */}
        <div className="bg-[#090f1d] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Volume Semanal Atual
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums">
              {metrics.latestVolume.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">kg</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Tonelagem na semana mais recente
          </span>
        </div>

        {/* Delta de Sobrecarga vs Semana Anterior */}
        <div className="bg-[#090f1d] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Progressão Semanal (Δ)
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-black font-mono tabular-nums flex items-center ${
                metrics.latestDeltaPercent > 0
                  ? 'text-emerald-400'
                  : metrics.latestDeltaPercent < 0
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}
            >
              {metrics.latestDeltaPercent > 0 ? (
                <ArrowUpRight className="w-4 h-4 mr-0.5 shrink-0" />
              ) : metrics.latestDeltaPercent < 0 ? (
                <ArrowDownRight className="w-4 h-4 mr-0.5 shrink-0" />
              ) : null}
              {metrics.latestDeltaPercent > 0
                ? `+${metrics.latestDeltaPercent}%`
                : `${metrics.latestDeltaPercent}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
            {metrics.latestDeltaKg >= 0
              ? `+${metrics.latestDeltaKg.toLocaleString()} kg vs sem. anterior`
              : `${metrics.latestDeltaKg.toLocaleString()} kg vs sem. anterior`}
          </span>
        </div>

        {/* Recorde Semanal (PR de Tonelagem) */}
        <div className="bg-[#090f1d] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Pico Semanal (PR)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 tabular-nums">
              {metrics.peakVolume.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">kg</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Maior volume em 1 única semana
          </span>
        </div>

        {/* Média Semanal */}
        <div className="bg-[#090f1d] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Média por Semana
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-sky-400 tabular-nums">
              {metrics.avgVolume.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">kg</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Ao longo de {activeData.length} {activeData.length === 1 ? 'semana' : 'semanas'}
          </span>
        </div>
      </div>

      {/* Diagnóstico Científico da Sobrecarga Semanal */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          metrics.status === 'optimal'
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
            : metrics.status === 'aggressive'
            ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
            : 'bg-sky-950/20 border-sky-500/30 text-sky-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              metrics.status === 'optimal'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : metrics.status === 'aggressive'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}
          >
            {metrics.status === 'optimal' ? (
              <Flame className="w-5 h-5 fill-emerald-400" />
            ) : metrics.status === 'aggressive' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div>
            <strong className="text-xs sm:text-sm font-black block mb-0.5">
              {metrics.statusTitle}
            </strong>
            <p className="text-xs leading-relaxed opacity-90">{metrics.statusDesc}</p>
          </div>
        </div>

        {metrics.totalGrowthPercent !== 0 && (
          <div className="shrink-0">
            <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Acumulado: {metrics.totalGrowthPercent > 0 ? `+${metrics.totalGrowthPercent}%` : `${metrics.totalGrowthPercent}%`}
            </span>
          </div>
        )}
      </div>

      {/* Gráfico Recharts de Volume Semanal (kg) */}
      <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 text-xs text-slate-400 font-mono">
          <span className="font-bold text-white flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {selectedMuscle === 'all'
                ? 'Progressão de Volume Total Semanal (kg)'
                : `Volume Semanal — ${MUSCLE_NAMES[selectedMuscle]} (kg)`}
            </span>
          </span>
          <span>
            Média de referência: {metrics.avgVolume.toLocaleString()} kg/sem
          </span>
        </div>

        <div className="h-72 sm:h-80 w-full">
          {chartStyle === 'area' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeData}
                margin={{ top: 12, right: 12, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="weeklyVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={{ stroke: '#334155' }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d: WeeklyVolumePoint = payload[0].payload;
                      return (
                        <div className="bg-[#0b1220] border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs font-mono space-y-1.5">
                          <div className="text-slate-300 font-sans font-bold border-b border-slate-800 pb-1">
                            Semana: {d.fullRange}
                          </div>
                          <div className="text-emerald-400 font-extrabold text-sm">
                            Volume Total: {d.volumeKg.toLocaleString()} kg
                          </div>
                          <div className="text-sky-400">
                            Meta Progressiva (+5%): {d.targetOverloadKg.toLocaleString()} kg
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-300 pt-0.5">
                            <span>Séries: {d.sets}s</span>
                            <span>Treinos: {d.sessionsCount}x</span>
                          </div>
                          {d.deltaPercent !== 0 && (
                            <div
                              className={`font-bold pt-1 border-t border-slate-800 ${
                                d.deltaPercent > 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              Sobrecarga: {d.deltaPercent > 0 ? `+${d.deltaPercent}%` : `${d.deltaPercent}%`} (
                              {d.deltaKg > 0 ? `+${d.deltaKg.toLocaleString()}` : d.deltaKg.toLocaleString()} kg)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                  formatter={(val) => <span className="text-slate-300 font-bold">{val}</span>}
                />
                {metrics.avgVolume > 0 && (
                  <ReferenceLine
                    y={metrics.avgVolume}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Média',
                      position: 'insideTopRight',
                      fill: '#fbbf24',
                      fontSize: 10,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  name="Volume Semanal (kg)"
                  dataKey="volumeKg"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#weeklyVolumeGrad)"
                  dot={{ r: 4, fill: '#10b981', stroke: '#022c22', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#34d399' }}
                />
                <Line
                  type="monotone"
                  name="Meta Sobrecarga (+5%)"
                  dataKey="targetOverloadKg"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={activeData}
                margin={{ top: 12, right: 12, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={{ stroke: '#334155' }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#38bdf8"
                  tick={{ fill: '#7dd3fc', fontSize: 11 }}
                  tickLine={{ stroke: '#0284c7' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d: WeeklyVolumePoint = payload[0].payload;
                      return (
                        <div className="bg-[#0b1220] border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs font-mono space-y-1.5">
                          <div className="text-slate-300 font-sans font-bold border-b border-slate-800 pb-1">
                            Semana: {d.fullRange}
                          </div>
                          <div className="text-emerald-400 font-extrabold text-sm">
                            Volume Total: {d.volumeKg.toLocaleString()} kg
                          </div>
                          <div className="text-sky-400 font-bold">
                            Séries Concluídas: {d.sets} séries ({d.sessionsCount} treinos)
                          </div>
                          {d.deltaPercent !== 0 && (
                            <div
                              className={`font-bold pt-1 border-t border-slate-800 ${
                                d.deltaPercent > 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              Variação Semanal: {d.deltaPercent > 0 ? `+${d.deltaPercent}%` : `${d.deltaPercent}%`}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                  formatter={(val) => <span className="text-slate-300 font-bold">{val}</span>}
                />
                <Bar
                  yAxisId="left"
                  dataKey="volumeKg"
                  name="Volume Semanal (kg)"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sets"
                  name="Total de Séries"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#38bdf8', stroke: '#082f49', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rodapé informativo quando está exibindo exemplo por falta de treinos */}
        {!hasRealData && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              💡 Exibindo curva simulada de 8 semanas. Assim que você finalizar seu primeiro treino, sua tonelagem real substituirá este exemplo automaticamente.
            </span>
            {onGoToWorkout && (
              <button
                type="button"
                onClick={onGoToWorkout}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shrink-0 cursor-pointer transition-all"
              >
                Registrar 1º Treino
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
