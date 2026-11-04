/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart3, 
  LayoutGrid, 
  Activity, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Zap, 
  Layers,
  FileEdit,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from 'recharts';
import { MuscleGroup } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { getVolumeLandmarks, evaluateVolumeZone } from '../utils/volumeEngine';

interface VolumeDashboardProps {
  completedSetsByMuscle: Record<MuscleGroup, number>;
  activeWorkoutMuscles: MuscleGroup[];
  muscleBudgets?: Record<MuscleGroup, number>;
  totalWeeklyBudget?: number;
  workoutNotes?: string;
  onUpdateWorkoutNotes?: (notes: string) => void;
  onOpenVolumeBudget?: () => void;
}

const NOTE_TAGS = [
  '⚡ Alta Energia',
  '💤 Sono 8h',
  '⚠️ Cansaço Acumulado',
  '🎯 Foco em Cadência',
  '🦴 Conforto Articular',
  '🔥 Recorde Pessoal',
];

const SHORT_NAMES: Record<MuscleGroup, string> = {
  quadriceps: 'Quad',
  hamstrings: 'Isquios',
  glutes: 'Glúteos',
  calves: 'Panturr.',
  chest: 'Peitoral',
  back: 'Dorsal',
  shoulders: 'Delt. Lat.',
  rear_delts: 'Delt. Post.',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  abs: 'Core/Abs',
};

// Periodization classification relative to custom muscle target
function getPeriodizationStatus(sets: number, target: number) {
  if (sets === 0) return { label: 'Sem Estímulo', color: 'text-slate-500' };
  const pct = (sets / target) * 100;
  if (pct < 50) return { label: 'Acúmulo Inicial', color: 'text-sky-400' };
  if (pct < 90) return { label: 'Volume Efetivo', color: 'text-emerald-400' };
  if (pct <= 115) return { label: 'Meta Ótima Atingida', color: 'text-teal-300' };
  return { label: 'Sobretreino / Limite', color: 'text-amber-400' };
}

export const VolumeDashboard: React.FC<VolumeDashboardProps> = ({
  completedSetsByMuscle,
  activeWorkoutMuscles,
  muscleBudgets,
  totalWeeklyBudget,
  workoutNotes = '',
  onUpdateWorkoutNotes,
  onOpenVolumeBudget,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'grid'>('chart');
  const [isNotesOpen, setIsNotesOpen] = useState(true);

  const allMuscles = Object.keys(MUSCLE_NAMES) as MuscleGroup[];

  // Global calculations across all muscle groups based on user's custom budget
  const totalTargetSets = totalWeeklyBudget || (
    muscleBudgets
      ? Object.values(muscleBudgets).reduce((a, b) => a + b, 0)
      : 88
  );

  const totalCompletedSets = allMuscles.reduce(
    (acc, m) => acc + (completedSetsByMuscle[m] || 0),
    0
  );

  const globalPercentage = totalTargetSets > 0 
    ? Math.min(100, Math.round((totalCompletedSets / totalTargetSets) * 100))
    : 0;

  const musclesAtTarget = allMuscles.filter((m) => {
    const target = muscleBudgets?.[m] || 8;
    return (completedSetsByMuscle[m] || 0) >= target;
  }).length;

  const musclesWithProgress = allMuscles.filter(
    (m) => (completedSetsByMuscle[m] || 0) > 0
  ).length;

  // Global progress cycle status
  const getCycleStatus = (pct: number) => {
    if (pct === 0) return { title: 'Início da Semana', desc: 'Nenhuma série registrada ainda', badge: 'bg-slate-800 text-slate-400' };
    if (pct < 30) return { title: 'Fase de Acúmulo Inicial', desc: 'Construindo volume mínimo efetivo', badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/30' };
    if (pct < 70) return { title: 'Faixa Adaptativa Ótima', desc: 'Estímulo de hipertrofia máxima em andamento', badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' };
    if (pct < 100) return { title: 'Aproximação de Pico', desc: 'Volume semanal quase completo nas séries programadas', badge: 'bg-teal-500/15 text-teal-300 border border-teal-500/30' };
    return { title: 'Meta Semanal Atingida', desc: '100% das séries semanais completas', badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' };
  };

  const cycleStatus = getCycleStatus(globalPercentage);

  // SVG circular ring geometry
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalPercentage / 100) * circumference;

  // Format dataset for Recharts with user's specific muscle budget & physiological volume landmarks (MRV/MEV)
  const chartData = allMuscles.map((muscle) => {
    const sets = completedSetsByMuscle[muscle] || 0;
    const muscleTarget = muscleBudgets?.[muscle] || 8;
    const isActive = activeWorkoutMuscles.includes(muscle);
    const landmarks = getVolumeLandmarks(muscle, 'intermediate');
    const zone = evaluateVolumeZone(sets, landmarks);

    return {
      key: muscle,
      name: SHORT_NAMES[muscle],
      fullName: MUSCLE_NAMES[muscle],
      sets: sets,
      target: muscleTarget,
      isActive,
      landmarks,
      zone,
      statusLabel: zone.badge,
    };
  });

  return (
    <div className="bg-[#101828] border border-[#1e2c45] rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/20 mb-6 transition-all">
      {/* =========================================================
          CAMPO DE NOTAS DE TREINO (OPCIONAL)
          ========================================================= */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-3.5 sm:p-4 mb-4 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Notas & Percepções do Treino (Opcional)
              </h3>
              <p className="text-[11px] text-slate-400">
                Observações sobre disposição, dores ou ajustes que fez no treino
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isNotesOpen ? 'Recolher notas' : 'Expandir notas'}
          >
            {isNotesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isNotesOpen && (
          <div className="mt-3 space-y-2.5">
            {/* Quick observation tag chips */}
            {onUpdateWorkoutNotes && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-semibold mr-1">Atalhos:</span>
                {NOTE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const current = workoutNotes ? workoutNotes.trim() : '';
                      const updated = current ? `${current} · ${tag}` : tag;
                      onUpdateWorkoutNotes(updated);
                    }}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#131d31] hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              rows={2}
              value={workoutNotes}
              onChange={(e) => onUpdateWorkoutNotes?.(e.target.value)}
              placeholder="Ex: Dormi 8h com excelente recuperação, energia alta, boa estabilidade na cadeia posterior e sem dores articulares..."
              className="w-full bg-[#080d18] border border-slate-800 focus:border-purple-500 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors resize-none font-normal"
            />
          </div>
        )}
      </div>

      {/* =========================================================
          INDICADOR VISUAL DE PROGRESSO GLOBAL (CIRCULAR & LINEAR)
          ========================================================= */}
      <div className="bg-[#0b1220] border border-sky-500/20 rounded-2xl p-4 sm:p-5 mb-5 shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Left: Circular Progress Ring with % */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
                {/* Background Track */}
                <circle
                  cx="34"
                  cy="34"
                  r={radius}
                  className="stroke-slate-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                {/* Progress Stroke */}
                <circle
                  cx="34"
                  cy="34"
                  r={radius}
                  className={`transition-all duration-700 ease-out ${
                    globalPercentage >= 100
                      ? 'stroke-amber-400'
                      : globalPercentage >= 50
                      ? 'stroke-emerald-400'
                      : 'stroke-sky-400'
                  }`}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Inner Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-white">
                  {globalPercentage}%
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400 -mt-0.5">
                  Meta
                </span>
              </div>
            </div>

            {/* Title & Overview Metrics */}
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${cycleStatus.badge}`}>
                  {cycleStatus.title}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {cycleStatus.desc}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
                  {totalCompletedSets}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  de <strong className="text-slate-200">{totalTargetSets} séries totais</strong>
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mt-0.5 sm:hidden">
                {cycleStatus.desc}
              </p>
            </div>
          </div>

          {/* Right: Key Performance Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full md:w-auto shrink-0">
            {/* Grupos na Meta */}
            <div className="bg-[#0f172a] p-2.5 rounded-xl border border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold mb-0.5">
                <Target className="w-3 h-3 text-amber-400" />
                <span>Na Meta</span>
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-amber-400">
                {musclesAtTarget} <span className="text-[10px] font-normal text-slate-500">/ 11</span>
              </div>
            </div>

            {/* Grupos Estimulados */}
            <div className="bg-[#0f172a] p-2.5 rounded-xl border border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold mb-0.5">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Estimulados</span>
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-emerald-400">
                {musclesWithProgress} <span className="text-[10px] font-normal text-slate-500">/ 11</span>
              </div>
            </div>

            {/* Divisão Ativa */}
            <div className="bg-[#0f172a] p-2.5 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold mb-0.5">
                <Layers className="w-3 h-3 text-sky-400" />
                <span>Hoje</span>
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-sky-400">
                {activeWorkoutMuscles.length} <span className="text-[10px] font-normal text-slate-500">grupos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Horizontal Progress Bar with Milestones */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
            <span>0% (Início)</span>
            <span className="text-sky-400">50% MEV Mínimo</span>
            <span className="text-emerald-400 font-bold">100% Meta Semanal (176 séries)</span>
          </div>

          <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                globalPercentage >= 100
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400'
                  : globalPercentage >= 50
                  ? 'bg-gradient-to-r from-sky-400 to-emerald-400'
                  : 'bg-gradient-to-r from-sky-500 to-sky-400'
              }`}
              style={{ width: `${globalPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Header & View Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
              <span>Volume Semanal por Grupamento</span>
              <span className="text-[10px] font-mono text-sky-400 font-semibold lowercase bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                recharts
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Distribuição anatômica das séries efetivas no microciclo
            </p>
          </div>
        </div>

        {/* Segmented Controller */}
        <div className="flex items-center gap-1 bg-[#0b1120] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'chart'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Gráfico de Barras</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grade Detalhada</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'chart' ? (
        <div className="space-y-4">
          {/* Recharts Bar Chart Container */}
          <div className="w-full h-[260px] sm:h-[280px] bg-[#0c1220] rounded-xl p-3 border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 12, left: -18, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, (dataMax: number) => Math.max(18, dataMax + 2)]}
                  ticks={[0, 6, 10, 16, 20]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(56, 189, 248, 0.06)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const sets = data.sets;
                      const target = data.target || 8;
                      const landmarks = data.landmarks;
                      const zone = data.zone;

                      return (
                        <div className="bg-[#0b1220] border border-sky-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
                          <div className="font-bold text-white text-sm flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
                            <span>{data.fullName}</span>
                            {data.isActive && (
                              <span className="text-[10px] text-sky-400 font-semibold bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                                Treino de Hoje
                              </span>
                            )}
                          </div>
                          <div className="text-slate-300 font-mono text-xs flex items-center justify-between">
                            <span>Séries Concluídas:</span>
                            <span className="text-base font-extrabold text-white">
                              {sets} <span className="text-slate-500 text-[11px] font-normal">/ {target}s meta</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400">Zona Fisiológica:</span>
                            <span className={zone.color}>
                              {zone.badge}
                            </span>
                          </div>
                          {/* Landmarks MEV - MAV - MRV */}
                          <div className="bg-[#070c17] p-2 rounded-xl border border-slate-800 text-[10px] font-mono grid grid-cols-3 gap-1 text-center">
                            <div>
                              <span className="text-slate-500 block">MEV Mín.</span>
                              <strong className="text-sky-300">{landmarks.mev}s</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">MAV Ótimo</span>
                              <strong className="text-emerald-400">{landmarks.mavMin}-{landmarks.mavMax}s</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block">MRV Máx.</span>
                              <strong className="text-rose-400">{landmarks.mrv}s</strong>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight italic pt-0.5">
                            {zone.recommendation}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Bars with dynamic physiological landmark colors (MEV, MAV, MRV) */}
                <Bar
                  dataKey="sets"
                  radius={[6, 6, 2, 2]}
                  animationDuration={600}
                >
                  {chartData.map((entry) => {
                    let fillColor = '#334155'; // 0 sets
                    if (entry.zone.zone === 'over_mrv') {
                      fillColor = '#f43f5e'; // Rose (Over MRV)
                    } else if (entry.zone.zone === 'mav_mrv') {
                      fillColor = '#f59e0b'; // Amber (MAV to MRV)
                    } else if (entry.zone.zone === 'mev_mav') {
                      fillColor = '#10b981'; // Emerald (Optimal MEV-MAV)
                    } else if (entry.sets > 0) {
                      fillColor = '#38bdf8'; // Sky (Sub-MEV)
                    }

                    return (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={fillColor}
                        opacity={entry.isActive ? 1 : 0.85}
                        stroke={entry.isActive ? '#e0f2fe' : 'transparent'}
                        strokeWidth={entry.isActive ? 1.5 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Periodization Benchmark Legend with MEV/MAV/MRV */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-3.5 flex-wrap font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" />
                <span className="text-slate-300">Sub-MEV (&lt; Mínimo)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                <span className="text-slate-300">Faixa Ótima (MEV - MAV)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />
                <span className="text-slate-300">Pico (MAV - MRV)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f43f5e]" />
                <span className="text-rose-300 font-semibold">&gt; MRV (Sobretreino)</span>
              </span>
            </div>
            {onOpenVolumeBudget && (
              <button
                type="button"
                onClick={onOpenVolumeBudget}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                Personalizar Séries
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Detailed Grid View with MEV and MRV references */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {chartData.map((item) => {
            const target = item.target || 8;
            const landmarks = item.landmarks;
            const zone = item.zone;
            const pct = Math.min(100, Math.round((item.sets / landmarks.mrv) * 100));

            return (
              <div
                key={item.key}
                className={`rounded-2xl p-3 transition-all border ${
                  item.isActive
                    ? 'bg-[#0d1424] border-sky-500/40 ring-1 ring-sky-500/20'
                    : 'bg-[#0a0f1d] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                  <span className="truncate pr-1">{item.fullName}</span>
                  {item.isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 animate-pulse"
                      title="No treino de hoje"
                    />
                  )}
                </div>

                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black font-mono tabular-nums text-white">
                      {item.sets}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 font-mono">
                      / {target}s
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded ${zone.bgColor} ${zone.color}`}>
                    {zone.zone === 'over_mrv' ? 'Sobretreino' : zone.zone === 'mev_mav' ? 'Ótimo' : zone.zone === 'mav_mrv' ? 'Pico' : 'Sub-MEV'}
                  </span>
                </div>

                {/* Progress bar relative to MRV */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      zone.zone === 'over_mrv'
                        ? 'bg-rose-500'
                        : zone.zone === 'mav_mrv'
                        ? 'bg-amber-400'
                        : zone.zone === 'mev_mav'
                        ? 'bg-emerald-400'
                        : 'bg-sky-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* MEV & MRV range hint */}
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span>MEV: {landmarks.mev}s</span>
                  <span className="text-slate-400">MRV: {landmarks.mrv}s</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

