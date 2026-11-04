/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Flame, 
  Award, 
  AlertTriangle, 
  Calendar, 
  Dumbbell, 
  Zap, 
  Clock, 
  ChevronRight,
  Filter,
  BarChart3,
  Layers,
  Activity,
  Info,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  RefreshCw,
  Calculator,
  Target
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart,
  LineChart, 
  Line, 
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  ReferenceLine 
} from 'recharts';
import { WorkoutSessionSummary, Exercise, rirToRpe } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculate1RM, safeStorage } from '../utils/storage';

interface ExerciseAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WorkoutSessionSummary[];
  initialExerciseName?: string;
}

interface ProgressionPoint {
  sessionDate: string;
  displayDate: string;
  sessionIndex: number;
  maxWeight: number;
  avgWeight: number;
  estimated1RM: number;
  avgReps: number;
  avgRpe: number | null;
  estimatedRir: number | null;
  totalVolume: number;
  setsCount: number;
  isSimulated?: boolean;
}

// Custom Tooltip component for Recharts load & RPE progression
const CustomLoadRpeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data: ProgressionPoint = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-[#0a101f]/95 border border-[#223354] rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-white text-xs min-w-[220px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>Sessão {data.sessionIndex} · {label}</span>
        </div>
        {data.isSimulated && (
          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
            Simulação
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            Carga Máxima:
          </span>
          <span className="font-mono font-bold text-sky-300 text-sm">
            {data.maxWeight} kg
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-slate-400" />
            Carga Média:
          </span>
          <span className="font-mono font-medium text-slate-300">
            {data.avgWeight} kg
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            RPE Médio (Esforço):
          </span>
          <span className="font-mono font-bold text-amber-300 text-sm">
            {data.avgRpe !== null ? `@RPE ${data.avgRpe}` : '—'}
          </span>
        </div>

        {data.estimatedRir !== null && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 pl-4">
            <span>RIR (Reps na Reserva):</span>
            <span className="font-mono font-medium text-emerald-300">
              ~{data.estimatedRir} reps
            </span>
          </div>
        )}

        <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>{data.setsCount} séries · média {data.avgReps} reps</span>
          <span className="font-mono text-purple-300">{data.totalVolume.toLocaleString('pt-BR')} kg vol</span>
        </div>
      </div>
    </div>
  );
};

export const ExerciseAnalyticsModal: React.FC<ExerciseAnalyticsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  initialExerciseName,
}) => {
  // Collect all available exercises from database
  const allExercises = useMemo(() => {
    const list: Exercise[] = [];
    Object.values(EXERCISE_DATABASE).forEach((muscleList) => {
      muscleList.forEach((ex) => {
        if (!list.some((item) => item.name === ex.name)) {
          list.push(ex);
        }
      });
    });
    return list;
  }, []);

  // Exercises that have at least one logged session
  const exercisesWithData = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach((s) => {
      s.completedExercises.forEach((e) => names.add(e.name));
    });
    return Array.from(names);
  }, [sessions]);

  // Selected exercise state
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>(() => {
    if (initialExerciseName) return initialExerciseName;
    if (exercisesWithData.length > 0) return exercisesWithData[0];
    return allExercises[0]?.name || 'Agachamento Hack Guiado';
  });

  // Sync initialExerciseName when prop changes
  useEffect(() => {
    if (initialExerciseName) {
      setSelectedExerciseName(initialExerciseName);
    }
  }, [initialExerciseName]);

  // Active chart view tab: 'load_rpe' | 'scatter_rpe_load' | 'estimated_1rm' | 'volume'
  const [chartView, setChartView] = useState<'load_rpe' | 'scatter_rpe_load' | 'estimated_1rm' | 'volume'>('load_rpe');
  const [scatterMetric, setScatterMetric] = useState<'rpe' | 'rir'>('rpe');
  const [formula1RM, setFormula1RM] = useState<'epley' | 'brzycki'>('epley');

  // Demo / Simulation mode toggle for previewing overload curves
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Extract real historical trend data for the selected exercise across all sessions chronologically (oldest to newest)
  const realChartData = useMemo(() => {
    const chronological = [...sessions].reverse();
    const dataPoints: ProgressionPoint[] = [];

    chronological.forEach((session) => {
      const match = session.completedExercises.find((e) => e.name === selectedExerciseName);
      if (match && match.sets.length > 0) {
        let maxWeight = 0;
        let sumWeight = 0;
        let max1RM = 0;
        let totalReps = 0;
        let totalVol = 0;
        const rpes: number[] = [];

        match.sets.forEach((set) => {
          const w = Number(set.weight) || 0;
          const r = Number(set.reps) || 0;
          if (w > maxWeight) maxWeight = w;
          sumWeight += w;

          const rpeStr = set.rpe || (set.rir ? rirToRpe(set.rir) : undefined);
          const e1rm = calculate1RM(w.toString(), r.toString(), rpeStr || set.rir);
          if (e1rm && e1rm > max1RM) max1RM = e1rm;
          totalReps += r;
          totalVol += w * r;

          if (rpeStr) {
            const parsed = parseFloat(rpeStr);
            if (!isNaN(parsed) && parsed > 0) rpes.push(parsed);
          }
        });

        const d = new Date(session.date);
        const displayDate = !isNaN(d.getTime())
          ? `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
          : `Sessão ${dataPoints.length + 1}`;

        const avgRpeVal = rpes.length > 0 ? +(rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null;
        const avgWeight = match.sets.length > 0 ? Math.round((sumWeight / match.sets.length) * 10) / 10 : maxWeight;

        dataPoints.push({
          sessionDate: session.date,
          displayDate,
          sessionIndex: dataPoints.length + 1,
          maxWeight,
          avgWeight,
          estimated1RM: max1RM > 0 ? max1RM : maxWeight,
          avgReps: Math.round(totalReps / match.sets.length),
          avgRpe: avgRpeVal,
          estimatedRir: avgRpeVal !== null ? Math.max(0, +(10 - avgRpeVal).toFixed(1)) : null,
          totalVolume: Math.round(totalVol),
          setsCount: match.sets.length,
          isSimulated: false,
        });
      }
    });

    return dataPoints;
  }, [sessions, selectedExerciseName]);

  // Realistic progressive overload demo data (6 sessions progression)
  const simulatedData = useMemo((): ProgressionPoint[] => {
    // Generate realistic progression curve matching selected exercise
    const baseWeight = 60;
    const progressionSteps = [
      { deltaW: 0, rpe: 7.5, reps: 10, date: '10/10' },
      { deltaW: 2.5, rpe: 8.0, reps: 10, date: '17/10' },
      { deltaW: 2.5, rpe: 7.5, reps: 10, date: '24/10' }, // adaptation: same weight, lower RPE
      { deltaW: 5.0, rpe: 8.5, reps: 9, date: '31/10' },
      { deltaW: 5.0, rpe: 8.0, reps: 10, date: '07/11' }, // adaptation: same weight, more reps, lower RPE
      { deltaW: 7.5, rpe: 8.5, reps: 9, date: '14/11' },
    ];

    return progressionSteps.map((step, idx) => {
      const maxWeight = baseWeight + step.deltaW;
      const avgWeight = maxWeight - 2.5;
      const totalReps = step.reps * 3;
      const totalVol = Math.round(maxWeight * totalReps);
      const e1rm = Math.round(maxWeight * (1 + (step.reps + (10 - step.rpe)) / 30));

      return {
        sessionDate: `2026-${idx + 10}-01`,
        displayDate: step.date,
        sessionIndex: idx + 1,
        maxWeight,
        avgWeight,
        estimated1RM: e1rm,
        avgReps: step.reps,
        avgRpe: step.rpe,
        estimatedRir: +(10 - step.rpe).toFixed(1),
        totalVolume: totalVol,
        setsCount: 3,
        isSimulated: true,
      };
    });
  }, []);

  // Use real data unless demo mode is activated or real data is empty and demo is active
  const chartData = useMemo(() => {
    if (isDemoMode) {
      return simulatedData;
    }
    return realChartData;
  }, [isDemoMode, simulatedData, realChartData]);

  // Overload Diagnostic & Analytical KPIs
  const kpis = useMemo(() => {
    if (chartData.length === 0) {
      return {
        prWeight: 0,
        pr1RM: 0,
        totalSessionsCount: 0,
        growthPercent: 0,
        weightDelta: 0,
        isPlateaued: false,
        avgRpeOverall: null,
        recentRpe: null,
        totalVolumeAccumulated: 0,
        maxSessionVolume: 0,
        avgVolumePerSession: 0,
        diagnosticType: 'neutral' as 'effective' | 'pushing' | 'efficiency' | 'plateau' | 'neutral',
        diagnosticMessage: 'Registre mais sessões para gerar diagnósticos biomecânicos automáticos de sobrecarga.',
        nextSessionSuggestion: null,
      };
    }

    let prWeight = 0;
    let pr1RM = 0;
    let rpeSum = 0;
    let rpeCount = 0;
    let totalVolAcc = 0;
    let maxVol = 0;

    chartData.forEach((d) => {
      if (d.maxWeight > prWeight) prWeight = d.maxWeight;
      if (d.estimated1RM > pr1RM) pr1RM = d.estimated1RM;
      totalVolAcc += d.totalVolume;
      if (d.totalVolume > maxVol) maxVol = d.totalVolume;
      if (d.avgRpe !== null) {
        rpeSum += d.avgRpe;
        rpeCount++;
      }
    });

    const firstPoint = chartData[0];
    const lastPoint = chartData[chartData.length - 1];
    const weightDelta = lastPoint.maxWeight - firstPoint.maxWeight;
    const growthPercent = firstPoint.maxWeight > 0 
      ? Math.round((weightDelta / firstPoint.maxWeight) * 100) 
      : 0;

    const recentRpe = lastPoint.avgRpe;
    const firstRpe = firstPoint.avgRpe;

    // Detect plateau: last 3 sessions have identical or decreasing weight
    let isPlateaued = false;
    if (chartData.length >= 3) {
      const last3 = chartData.slice(-3);
      if (last3[2].maxWeight <= last3[1].maxWeight && last3[1].maxWeight <= last3[0].maxWeight) {
        isPlateaued = true;
      }
    }

    // Diagnostic of Overload (Carga vs RPE relationship)
    let diagnosticType: 'effective' | 'pushing' | 'efficiency' | 'plateau' | 'neutral' = 'neutral';
    let diagnosticMessage = 'Registre sessões subsequentes para comparar a taxa de esforço percebido.';

    if (chartData.length >= 2 && recentRpe !== null && firstRpe !== null) {
      const rpeDelta = recentRpe - firstRpe;

      if (isPlateaued && recentRpe >= 9) {
        diagnosticType = 'plateau';
        diagnosticMessage = 'Carga estagnada com RPE no limite (≥ 9.0). Fadiga acumulada ou necessidade de deload/ajuste técnico.';
      } else if (weightDelta > 0 && rpeDelta <= 0.2) {
        diagnosticType = 'effective';
        diagnosticMessage = 'Sobrecarga Progressiva Efetiva: A carga subiu mantendo o RPE estável. Ganho real de força hipertrófica e adaptação neural!';
      } else if (weightDelta > 0 && rpeDelta > 0.2) {
        diagnosticType = 'pushing';
        diagnosticMessage = 'Progressão com Aumento de Esforço: A carga subiu acompanhada de maior RPE. Bom avanço, mas monitore a proximidade da falha muscular.';
      } else if (weightDelta === 0 && rpeDelta < -0.3) {
        diagnosticType = 'efficiency';
        diagnosticMessage = 'Adaptação de Eficiência: A mesma carga foi movida com menor esforço (RPE caiu). Excelente momento para adicionar 1 a 2.5 kg na próxima sessão!';
      } else {
        diagnosticType = 'neutral';
        diagnosticMessage = 'Intensidade e carga dentro da faixa estável de trabalho.';
      }
    } else if (chartData.length >= 2) {
      if (weightDelta > 0) {
        diagnosticType = 'effective';
        diagnosticMessage = `Evolução positiva de +${weightDelta}kg em relação à primeira sessão!`;
      }
    }

    // Predictive recommendation for next workout
    let nextSessionSuggestion: string | null = null;
    if (lastPoint) {
      const curW = lastPoint.maxWeight;
      const curRpe = lastPoint.avgRpe ?? 8.0;

      if (curRpe <= 7.5) {
        nextSessionSuggestion = `Carga sugerida: ~${Math.round(curW * 1.05)}kg (+5%) mantendo 8-10 reps (@RPE 8)`;
      } else if (curRpe <= 8.5) {
        nextSessionSuggestion = `Carga sugerida: ~${Math.round(curW * 1.025)}kg (+2.5%) mantendo repetições limpas (@RPE 8-9)`;
      } else {
        nextSessionSuggestion = `Manter ${curW}kg e buscar +1 repetição com técnica estrita antes de elevar a carga`;
      }
    }

    return {
      prWeight,
      pr1RM,
      totalSessionsCount: chartData.length,
      growthPercent,
      weightDelta,
      isPlateaued,
      avgRpeOverall: rpeCount > 0 ? +(rpeSum / rpeCount).toFixed(1) : null,
      recentRpe,
      totalVolumeAccumulated: totalVolAcc,
      maxSessionVolume: maxVol,
      avgVolumePerSession: Math.round(totalVolAcc / chartData.length),
      diagnosticType,
      diagnosticMessage,
      nextSessionSuggestion,
    };
  }, [chartData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-[#223354] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Análise de Sobrecarga Progressiva
                </h2>
                {isDemoMode && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    Modo Simulação
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Visualização de progressão de carga (kg) e esforço percebido (RPE/RIR) ao longo das sessões
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 relative z-10">
          {/* Exercise Selector & Demo Mode Bar */}
          <div className="bg-[#080d19] border border-slate-800 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2 shrink-0">
                <Dumbbell className="w-4 h-4 text-sky-400" />
                <span>Exercício:</span>
              </label>

              <select
                value={selectedExerciseName}
                onChange={(e) => {
                  setSelectedExerciseName(e.target.value);
                  setIsDemoMode(false);
                }}
                className="w-full bg-[#0e172a] border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
              >
                {/* Prioritize exercises with recorded data */}
                {exercisesWithData.length > 0 && (
                  <optgroup label="Exercícios com Histórico Gravado">
                    {exercisesWithData.map((name) => (
                      <option key={name} value={name}>
                        ★ {name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Todos os Exercícios do Banco">
                  {allExercises
                    .filter((ex) => !exercisesWithData.includes(ex.name))
                    .map((ex) => (
                      <option key={ex.id} value={ex.name}>
                        {ex.name} ({MUSCLE_NAMES[ex.muscleKey]})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Demo Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDemoMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isDemoMode
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title="Alternar entre dados reais registrados e demonstração de 6 semanas de sobrecarga progressiva"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isDemoMode ? 'Ver Dados Reais' : 'Simular 6 Semanas'}</span>
            </button>
          </div>

          {/* Info Banner if Exercise Has No Real Data */}
          {!isDemoMode && realChartData.length === 0 && (
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sky-200">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-sky-400 shrink-0" />
                <span className="text-xs">
                  Ainda não há sessões salvas para este exercício. Você pode testar o gráfico ativando a demonstração de progressão.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoMode(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black shrink-0 transition-colors cursor-pointer"
              >
                Ativar Demonstração
              </button>
            </div>
          )}

          {/* KPI Stat Cards (Carga, RPE, Evolução e Volume) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorde (PR Carga)</span>
              <span className="text-lg font-black font-mono text-sky-400 block mt-0.5">
                {kpis.prWeight > 0 ? `${kpis.prWeight} kg` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">1RM Estimado: ~{kpis.pr1RM || 0}kg</span>
            </div>

            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RPE Recente</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg font-black font-mono text-amber-400">
                  {kpis.recentRpe !== null ? `@${kpis.recentRpe}` : '—'}
                </span>
                {kpis.recentRpe !== null && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    kpis.recentRpe >= 9 ? 'bg-rose-500/20 text-rose-300' :
                    kpis.recentRpe >= 8 ? 'bg-amber-500/20 text-amber-300' :
                    'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {kpis.recentRpe >= 9 ? 'Falha / Alto' : kpis.recentRpe >= 8 ? 'Zona Ótima' : 'Moderado'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                {kpis.avgRpeOverall !== null ? `Média geral @${kpis.avgRpeOverall}` : 'esforço percebido'}
              </span>
            </div>

            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progressão Total</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-lg font-black font-mono ${
                  kpis.weightDelta > 0 ? 'text-emerald-400' : kpis.weightDelta < 0 ? 'text-rose-400' : 'text-slate-300'
                }`}>
                  {kpis.weightDelta > 0 ? `+${kpis.weightDelta} kg` : `${kpis.weightDelta} kg`}
                </span>
                {kpis.growthPercent !== 0 && (
                  <span className={`text-[10px] font-bold flex items-center ${
                    kpis.growthPercent > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {kpis.growthPercent > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpis.growthPercent)}%
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">desde 1ª sessão</span>
            </div>

            <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Total Acumulado</span>
              <span className="text-lg font-black font-mono text-purple-400 block mt-0.5">
                {kpis.totalVolumeAccumulated > 0 ? `${kpis.totalVolumeAccumulated.toLocaleString('pt-BR')} kg` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">em {kpis.totalSessionsCount} sessões</span>
            </div>
          </div>

          {/* Plateau Warning if detected */}
          {kpis.isPlateaued && !isDemoMode && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="text-xs font-bold block">Alerta de Platô de Sobrecarga</strong>
                <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                  A carga máxima deste exercício está estável há 3 ou mais sessões consecutivas com RPE alto.
                  Recomendado: aumentar o tempo de descanso entre séries (3 min), alternar pegada/inclinação ou aplicar um ciclo de deload para ressensibilizar as fibras.
                </p>
              </div>
            </div>
          )}

          {/* Chart View Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#090f1d] rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setChartView('load_rpe')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'load_rpe'
                    ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Carga (kg) & RPE</span>
              </button>

              <button
                type="button"
                onClick={() => setChartView('scatter_rpe_load')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'scatter_rpe_load'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Dispersão RPE × Carga</span>
              </button>

              <button
                type="button"
                onClick={() => setChartView('estimated_1rm')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'estimated_1rm'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>1RM & Calculadora Preditiva</span>
              </button>

              <button
                type="button"
                onClick={() => setChartView('volume')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'volume'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Volume de Carga (kg)</span>
              </button>
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              {chartData.length} {chartData.length === 1 ? 'sessão mapeada' : 'sessões mapeadas'}
            </span>
          </div>

          {/* ============================================================== */}
          {/* 1. VISUALIZAÇÃO RECHARTS: CARGA (KG) E RPE AO LONGO DAS SESSÕES */}
          {/* ============================================================== */}
          {chartView === 'load_rpe' && (
            <div className="bg-[#090f1d] border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Progressão de Carga (kg) & Intensidade RPE por Sessão
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded">
                    Eixo Esq: Carga (kg)
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                    Eixo Dir: RPE (6-10)
                  </span>
                </div>
              </div>

              {chartData.length > 0 ? (
                <div className="space-y-4">
                  {/* Container Recharts com Eixo Duplo */}
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart 
                        data={chartData} 
                        margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="loadAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2d47" opacity={0.6} />

                        {/* Eixo X: Sessões cronológicas */}
                        <XAxis 
                          dataKey="displayDate" 
                          stroke="#64748b" 
                          fontSize={11} 
                          tickLine={false} 
                        />

                        {/* Eixo Y Esquerdo: Carga (kg) */}
                        <YAxis 
                          yAxisId="weight"
                          stroke="#38bdf8" 
                          fontSize={11} 
                          unit="kg"
                          tickLine={false}
                          domain={['dataMin - 5', 'dataMax + 5']}
                        />

                        {/* Eixo Y Direito: RPE (Escala 5 a 10) */}
                        <YAxis 
                          yAxisId="rpe"
                          orientation="right"
                          stroke="#f59e0b" 
                          fontSize={11} 
                          unit=" RPE"
                          tickLine={false}
                          domain={[5, 10]}
                          ticks={[6, 7, 8, 9, 10]}
                        />

                        {/* Tooltip com formatação detalhada */}
                        <Tooltip content={<CustomLoadRpeTooltip />} />

                        {/* Legenda Customizada */}
                        <Legend 
                          verticalAlign="top" 
                          height={36}
                          formatter={(val) => {
                            if (val === 'maxWeight') return <span className="text-xs text-sky-300 font-bold">Carga Máxima Real (kg)</span>;
                            if (val === 'avgWeight') return <span className="text-xs text-slate-400 font-medium">Carga Média (kg)</span>;
                            if (val === 'avgRpe') return <span className="text-xs text-amber-300 font-bold">RPE Médio (Esforço 1-10)</span>;
                            return val;
                          }}
                        />

                        {/* Linha de Referência da Faixa Ideal de RPE (8.0 a 9.0) */}
                        <ReferenceLine 
                          yAxisId="rpe"
                          y={8.5} 
                          stroke="#10b981" 
                          strokeDasharray="4 4" 
                          strokeWidth={1.5}
                          label={{ 
                            value: 'Zona Ótima (RPE 8-9)', 
                            fill: '#10b981', 
                            fontSize: 10, 
                            position: 'insideTopRight' 
                          }} 
                        />

                        {/* Curva de Área & Linha: Carga Máxima (kg) */}
                        <Area
                          yAxisId="weight"
                          type="monotone"
                          dataKey="maxWeight"
                          fill="url(#loadAreaGradient)"
                          stroke="transparent"
                        />
                        <Line 
                          yAxisId="weight"
                          type="monotone" 
                          dataKey="maxWeight" 
                          stroke="#38bdf8" 
                          strokeWidth={3} 
                          dot={{ fill: '#38bdf8', r: 4, stroke: '#0369a1', strokeWidth: 2 }} 
                          activeDot={{ r: 7, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }} 
                          name="maxWeight"
                        />

                        {/* Curva Pontilhada: Carga Média de Trabalho */}
                        <Line 
                          yAxisId="weight"
                          type="monotone" 
                          dataKey="avgWeight" 
                          stroke="#94a3b8" 
                          strokeWidth={2} 
                          strokeDasharray="4 4"
                          dot={{ fill: '#94a3b8', r: 2.5 }} 
                          name="avgWeight"
                        />

                        {/* Curva de Linha: RPE Médio (Eixo Direito) */}
                        <Line 
                          yAxisId="rpe"
                          type="monotone" 
                          dataKey="avgRpe" 
                          stroke="#f59e0b" 
                          strokeWidth={2.5} 
                          dot={{ fill: '#f59e0b', r: 4, stroke: '#b45309', strokeWidth: 2 }} 
                          activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} 
                          name="avgRpe"
                          connectNulls
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Painel Diagnóstico de Sobrecarga Progressiva */}
                  <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Activity className={`w-4 h-4 ${
                          kpis.diagnosticType === 'effective' ? 'text-emerald-400' :
                          kpis.diagnosticType === 'pushing' ? 'text-amber-400' :
                          kpis.diagnosticType === 'efficiency' ? 'text-cyan-400' :
                          kpis.diagnosticType === 'plateau' ? 'text-rose-400' : 'text-slate-400'
                        }`} />
                        <span className="text-xs font-bold text-white">
                          Diagnóstico Biomecânico de Sobrecarga:
                        </span>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        kpis.diagnosticType === 'effective' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        kpis.diagnosticType === 'pushing' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        kpis.diagnosticType === 'efficiency' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        kpis.diagnosticType === 'plateau' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {kpis.diagnosticType === 'effective' ? 'Sobrecarga Efetiva' :
                         kpis.diagnosticType === 'pushing' ? 'Alta Intensidade' :
                         kpis.diagnosticType === 'efficiency' ? 'Eficiência Neuromuscular' :
                         kpis.diagnosticType === 'plateau' ? 'Platô Detectado' : 'Estabilidade'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {kpis.diagnosticMessage}
                    </p>

                    {/* Sugestão Automatizada para a Próxima Sessão */}
                    {kpis.nextSessionSuggestion && (
                      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Recomendação p/ próxima sessão:</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          {kpis.nextSessionSuggestion}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-14 text-center text-slate-500 text-xs space-y-2">
                  <Dumbbell className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                  <p>Nenhuma sessão concluída ainda com este exercício.</p>
                  <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                    Assim que você registrar séries com peso e RPE e finalizar um treino, o gráfico duplo de sobrecarga será preenchido automaticamente!
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDemoMode(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ver Demonstração de Progressão</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 1.5 VISUALIZAÇÃO DE DISPERSÃO (SCATTER PLOT): RPE/RIR VS CARGA */}
          {/* ============================================================== */}
          {chartView === 'scatter_rpe_load' && (() => {
            const scatterPoints = chartData.map((pt, idx) => {
              const rpeVal = pt.avgRpe ?? 8;
              const rirVal = pt.estimatedRir ?? Math.max(0, +(10 - rpeVal).toFixed(1));
              return {
                ...pt,
                xWeight: pt.maxWeight,
                yEffort: scatterMetric === 'rpe' ? rpeVal : rirVal,
                rpeVal,
                rirVal,
                weekNum: idx + 1,
              };
            });

            return (
              <div className="bg-[#090f1d] border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                        Gráfico de Dispersão: Relação Esforço ({scatterMetric.toUpperCase()}) × Carga (kg)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Identifica como seu esforço percebido varia conforme a carga sobe ao longo das semanas.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setScatterMetric('rpe')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        scatterMetric === 'rpe'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Plotar RPE (6-10)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScatterMetric('rir')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        scatterMetric === 'rir'
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Plotar RIR (0-4)
                    </button>
                  </div>
                </div>

                {scatterPoints.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-64 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 15, right: 20, left: -5, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2d47" opacity={0.6} />
                          <XAxis
                            type="number"
                            dataKey="xWeight"
                            name="Carga"
                            unit=" kg"
                            stroke="#38bdf8"
                            fontSize={11}
                            domain={['dataMin - 5', 'dataMax + 5']}
                            tickLine={false}
                          />
                          <YAxis
                            type="number"
                            dataKey="yEffort"
                            name={scatterMetric === 'rpe' ? 'RPE' : 'RIR'}
                            unit={scatterMetric === 'rpe' ? ' RPE' : ' RIR'}
                            stroke={scatterMetric === 'rpe' ? '#f59e0b' : '#10b981'}
                            fontSize={11}
                            domain={scatterMetric === 'rpe' ? [5.5, 10.2] : [-0.2, 4.5]}
                            tickLine={false}
                          />
                          <ZAxis type="number" dataKey="avgReps" range={[80, 260]} name="Repetições" />
                          <Tooltip
                            cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              const pt = payload[0].payload;
                              return (
                                <div className="bg-[#0a101f]/95 border border-[#223354] rounded-2xl p-3 shadow-2xl text-xs text-white space-y-1.5">
                                  <div className="font-bold text-sky-300 border-b border-slate-800 pb-1">
                                    Semana/Sessão #{pt.sessionIndex} ({pt.displayDate})
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-400">Carga Utilizada:</span>
                                    <span className="font-mono font-black text-white">{pt.xWeight} kg</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-400">Esforço Reportado:</span>
                                    <span className="font-mono font-bold text-amber-300">
                                      RPE {pt.rpeVal} (RIR {pt.rirVal})
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-400">Média de Reps:</span>
                                    <span className="font-mono text-emerald-300">{pt.avgReps} reps</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-400">1RM Estimado:</span>
                                    <span className="font-mono text-cyan-300">~{pt.estimated1RM} kg</span>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <ReferenceLine
                            y={scatterMetric === 'rpe' ? 8.5 : 1.5}
                            stroke="#10b981"
                            strokeDasharray="4 4"
                            label={{
                              value: scatterMetric === 'rpe' ? 'Zona Ótima Hipertrofia (RPE 8-9)' : 'Zona Ótima Hipertrofia (RIR 1-2)',
                              fill: '#10b981',
                              fontSize: 10,
                              position: 'insideTopRight',
                            }}
                          />
                          <Scatter
                            name={scatterMetric === 'rpe' ? 'Sessões (Carga × RPE)' : 'Sessões (Carga × RIR)'}
                            data={scatterPoints}
                            fill={scatterMetric === 'rpe' ? '#f59e0b' : '#10b981'}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-2.5">
                        <span className="text-[10px] font-bold uppercase text-sky-400 block">Leitura Diagonal Direita</span>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Pontos mais à direita com mesmo RPE indicam ganho real de força neural sem aumento da fadiga.
                        </p>
                      </div>
                      <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-2.5">
                        <span className="text-[10px] font-bold uppercase text-emerald-400 block">Zona Alvo (RPE 8-9 / RIR 1-2)</span>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Melhor relação estímulo-fadiga para hipertrofia muscular e progressão sustentável.
                        </p>
                      </div>
                      <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-2.5">
                        <span className="text-[10px] font-bold uppercase text-rose-400 block">Alerta de Fadiga (RPE 10 / RIR 0)</span>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Se a carga estagnar no topo do eixo Y por 3 semanas, considere reduzir 10% (deload).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-14 text-center text-slate-500 text-xs">
                    <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p>Nenhuma sessão concluída ainda com este exercício.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ============================================================== */}
          {/* 2. VISUALIZAÇÃO: 1RM ESTIMADO + CALCULADORA E META MENSAL      */}
          {/* ============================================================== */}
          {chartView === 'estimated_1rm' && (() => {
            const goalKey = `meutreino_1rm_goal_${selectedExerciseName.toLowerCase().trim()}`;
            const savedGoal = safeStorage.get<string>(goalKey, '');
            const savedGoalNum = parseFloat(savedGoal) || 0;
            const latestPt = chartData[chartData.length - 1];
            const baseW = latestPt?.maxWeight || kpis.prWeight || 60;
            const baseR = latestPt?.avgReps || 8;
            const epley1RM = baseR === 1 ? baseW : Math.round(baseW * (1 + baseR / 30) * 10) / 10;
            const brzycki1RM = baseR === 1 ? baseW : Math.round((baseW / (1.0278 - 0.0278 * Math.min(29, baseR))) * 10) / 10;
            const activePred1RM = formula1RM === 'epley' ? epley1RM : brzycki1RM;

            return (
              <div className="bg-[#090f1d] border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      Evolução do 1RM Estimado & Calculadora Preditiva
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFormula1RM('epley')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        formula1RM === 'epley'
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fórmula Epley (~{epley1RM}kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormula1RM('brzycki')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        formula1RM === 'brzycki'
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fórmula Brzycki (~{brzycki1RM}kg)
                    </button>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-64 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2d47" opacity={0.6} />
                          <XAxis 
                            dataKey="displayDate" 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false} 
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={11} 
                            unit="kg"
                            tickLine={false}
                            domain={['dataMin - 5', 'dataMax + 12']}
                          />
                          <Tooltip content={<CustomLoadRpeTooltip />} />
                          <Legend 
                            verticalAlign="top" 
                            height={36}
                            formatter={(val) => {
                              if (val === 'estimated1RM') return <span className="text-xs text-cyan-300 font-bold">1RM Estimado (kg)</span>;
                              if (val === 'maxWeight') return <span className="text-xs text-emerald-300 font-bold">Carga Real Levantada (kg)</span>;
                              return val;
                            }}
                          />
                          {kpis.pr1RM > 0 && (
                            <ReferenceLine 
                              y={kpis.pr1RM} 
                              stroke="#f59e0b" 
                              strokeDasharray="4 4" 
                              strokeWidth={1.5}
                              label={{ 
                                value: `Recorde 1RM: ${kpis.pr1RM}kg`, 
                                fill: '#f59e0b', 
                                fontSize: 10, 
                                position: 'top' 
                              }} 
                            />
                          )}
                          {savedGoalNum > 0 && (
                            <ReferenceLine 
                              y={savedGoalNum} 
                              stroke="#10b981" 
                              strokeDasharray="3 3" 
                              strokeWidth={2}
                              label={{ 
                                value: `Meta Próx. Mês: ${savedGoalNum}kg`, 
                                fill: '#10b981', 
                                fontSize: 10, 
                                position: 'insideBottomRight' 
                              }} 
                            />
                          )}
                          <Line 
                            type="monotone" 
                            dataKey="estimated1RM" 
                            stroke="#06b6d4" 
                            strokeWidth={3} 
                            dot={{ fill: '#06b6d4', r: 4, stroke: '#0891b2', strokeWidth: 2 }} 
                            activeDot={{ r: 7, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="maxWeight" 
                            stroke="#10b981" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            dot={{ fill: '#10b981', r: 3 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Resumo Preditivo Epley vs Brzycki & Meta Mensal */}
                    <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
                      <div className="flex items-center gap-2.5">
                        <Calculator className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            1RM Preditivo ({formula1RM === 'epley' ? 'Epley' : 'Brzycki'})
                          </span>
                          <span className="font-mono font-black text-sm text-white">
                            ~{activePred1RM} kg <span className="text-[11px] text-slate-400">({baseW}kg × {baseR} reps)</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Meta de 1RM (Próximo Mês)
                          </span>
                          <span className="font-mono font-black text-sm text-emerald-400">
                            {savedGoalNum > 0 ? `${savedGoalNum} kg` : `Sugerida: ${Math.round(activePred1RM * 1.05 * 2) / 2} kg (+5%)`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const nextTarget = (Math.round(activePred1RM * 1.05 * 2) / 2).toString();
                            safeStorage.set(goalKey, nextTarget);
                            setFormula1RM((prev) => prev);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs cursor-pointer transition-colors"
                        >
                          Definir Meta +5% ({Math.round(activePred1RM * 1.05 * 2) / 2}kg)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-14 text-center text-slate-500 text-xs">
                    <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p>Nenhuma sessão concluída ainda com este exercício.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ============================================================== */}
          {/* 3. VISUALIZAÇÃO: VOLUME DE CARGA TOTAL (KG)                     */}
          {/* ============================================================== */}
          {chartView === 'volume' && (
            <div className="bg-[#090f1d] border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Volume de Carga Total ao Longo das Sessões (kg movimentados)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  Volume Load = Séries × Reps × Peso
                </span>
              </div>

              {chartData.length > 0 ? (
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2d47" opacity={0.6} />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={11} 
                        unit="kg"
                        tickLine={false}
                        domain={[0, 'auto']}
                      />
                      <Tooltip content={<CustomLoadRpeTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        height={36}
                        formatter={() => <span className="text-xs text-emerald-300 font-bold">Volume Total por Sessão (kg)</span>}
                      />
                      <Bar 
                        dataKey="totalVolume" 
                        fill="#10b981" 
                        radius={[8, 8, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-14 text-center text-slate-500 text-xs">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p>Nenhuma sessão concluída ainda com este exercício.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
