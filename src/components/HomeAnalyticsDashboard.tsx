/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Award, 
  AlertTriangle, 
  Calendar, 
  Dumbbell, 
  Zap, 
  Sparkles,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Info,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { WorkoutSessionSummary, Exercise } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculate1RM } from '../utils/storage';

interface HomeAnalyticsDashboardProps {
  sessions: WorkoutSessionSummary[];
  onGoToWorkout?: () => void;
  onOpenAnalyticsModal?: (exerciseName: string) => void;
}

interface ProgressionPoint {
  date: string;
  fullDate: string;
  rawDate?: number;
  maxWeight: number;
  max1RM: number;
  volume: number;
  reps: number;
  avgRpe?: string;
}

export const HomeAnalyticsDashboard: React.FC<HomeAnalyticsDashboardProps> = ({
  sessions,
  onGoToWorkout,
  onOpenAnalyticsModal,
}) => {
  // Lista de todos os exercícios registrados em sessões concluídas
  const loggedExercises = useMemo(() => {
    const map = new Map<string, { count: number; lastDate: string }>();
    sessions.forEach((s) => {
      s.completedExercises.forEach((ex) => {
        if (ex.name && ex.sets.length > 0) {
          const prev = map.get(ex.name) || { count: 0, lastDate: s.date };
          map.set(ex.name, { count: prev.count + 1, lastDate: s.date });
        }
      });
    });

    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name]) => name);
  }, [sessions]);

  // Se o usuário não tiver treinos, podemos oferecer dados de exemplo para demonstração interativa
  const [showDemoData, setShowDemoData] = useState<boolean>(false);

  // Exercício selecionado para análise
  const [selectedExercise, setSelectedExercise] = useState<string>(() => {
    return loggedExercises[0] || 'Supino Reto com Barra';
  });

  // Atualiza exercício selecionado se a lista mudar e o atual não existir
  React.useEffect(() => {
    if (loggedExercises.length > 0 && !loggedExercises.includes(selectedExercise) && !showDemoData) {
      setSelectedExercise(loggedExercises[0]);
    }
  }, [loggedExercises, selectedExercise, showDemoData]);

  // Tipo de gráfico ativo: 'progression' (1RM e Cargas) | 'scatter' (Dispersão RPE x Carga) | 'monthly' (Volume Mensal)
  const [activeChartType, setActiveChartType] = useState<'progression' | 'scatter' | 'monthly'>('progression');

  // Dados sintéticos de demonstração para quando o app ainda está vazio
  const demoProgressionData: ProgressionPoint[] = useMemo(() => [
    { date: '01/Set', fullDate: '01/09/2026', maxWeight: 70, max1RM: 84, volume: 1680, reps: 8, avgRpe: '8' },
    { date: '08/Set', fullDate: '08/09/2026', maxWeight: 72.5, max1RM: 87, volume: 1740, reps: 8, avgRpe: '8.5' },
    { date: '15/Set', fullDate: '15/09/2026', maxWeight: 75, max1RM: 90, volume: 1800, reps: 8, avgRpe: '9' },
    { date: '22/Set', fullDate: '22/09/2026', maxWeight: 75, max1RM: 90, volume: 1800, reps: 8, avgRpe: '9.5' },
    { date: '29/Set', fullDate: '29/09/2026', maxWeight: 75, max1RM: 90, volume: 1800, reps: 8, avgRpe: '10' },
    { date: '06/Out', fullDate: '06/10/2026', maxWeight: 77.5, max1RM: 93, volume: 1860, reps: 8, avgRpe: '9' },
    { date: '13/Out', fullDate: '13/10/2026', maxWeight: 80, max1RM: 96, volume: 1920, reps: 8, avgRpe: '9' },
  ], []);

  const demoMonthlyData = useMemo(() => [
    { month: 'Jul/26', volume: 5200, sets: 48, sessionsCount: 4 },
    { month: 'Ago/26', volume: 6800, sets: 60, sessionsCount: 5 },
    { month: 'Set/26', volume: 7220, sets: 64, sessionsCount: 5 },
    { month: 'Out/26', volume: 8400, sets: 72, sessionsCount: 6 },
  ], []);

  // 1. Processamento dos dados de Progressão de Carga e 1RM
  const progressionData: ProgressionPoint[] = useMemo(() => {
    if (showDemoData || loggedExercises.length === 0) {
      return demoProgressionData;
    }

    const points: ProgressionPoint[] = [];

    // Percorre sessões em ordem cronológica (da mais antiga para a mais recente)
    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedSessions.forEach((sess) => {
      const match = sess.completedExercises.find(
        (ex) => ex.name.toLowerCase() === selectedExercise.toLowerCase()
      );

      if (match && match.sets.length > 0) {
        let maxWeight = 0;
        let max1RM = 0;
        let volume = 0;
        let bestReps = 0;
        let rpeSum = 0;
        let rpeCount = 0;

        match.sets.forEach((set) => {
          const w = set.weight || 0;
          const r = set.reps || 0;
          volume += w * r;

          if (w > maxWeight) {
            maxWeight = w;
            bestReps = r;
          }

          const calc1RM = calculate1RM(w.toString(), r.toString(), set.rpe || set.rir);
          if (calc1RM && calc1RM > max1RM) {
            max1RM = calc1RM;
          }

          if (set.rpe) {
            const parsedRpe = parseFloat(set.rpe);
            if (!isNaN(parsedRpe)) {
              rpeSum += parsedRpe;
              rpeCount++;
            }
          }
        });

        const d = new Date(sess.date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');

        points.push({
          date: `${day}/${month}`,
          fullDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
          rawDate: d.getTime(),
          maxWeight,
          max1RM,
          volume,
          reps: bestReps,
          avgRpe: rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : undefined,
        });
      }
    });

    return points;
  }, [sessions, selectedExercise, loggedExercises.length, showDemoData, demoProgressionData]);

  // 2. Processamento do Volume Total Mensal (Agrupado por Ano/Mês)
  const monthlyData = useMemo(() => {
    if (showDemoData || loggedExercises.length === 0) {
      return demoMonthlyData;
    }

    const monthMap = new Map<string, { label: string; volume: number; sets: number; sessionsCount: number; timestamp: number }>();

    sessions.forEach((sess) => {
      const d = new Date(sess.date);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      // Busca volume deste exercício na sessão (ou volume total se o exercício estiver presente)
      const match = sess.completedExercises.find(
        (ex) => ex.name.toLowerCase() === selectedExercise.toLowerCase()
      );

      if (match && match.sets.length > 0) {
        let exVolume = 0;
        let exSets = match.sets.length;

        match.sets.forEach((set) => {
          exVolume += (set.weight || 0) * (set.reps || 0);
        });

        const current = monthMap.get(key) || {
          label,
          volume: 0,
          sets: 0,
          sessionsCount: 0,
          timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        };

        current.volume += exVolume;
        current.sets += exSets;
        current.sessionsCount += 1;
        monthMap.set(key, current);
      }
    });

    const list = Array.from(monthMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return list.map((item) => ({
      month: item.label,
      volume: item.volume,
      sets: item.sets,
      sessionsCount: item.sessionsCount,
    }));
  }, [sessions, selectedExercise, loggedExercises.length, showDemoData, demoMonthlyData]);

  // 3. Algoritmo de Identificação de Estagnações & Métricas de Performance
  const diagnosis = useMemo(() => {
    if (progressionData.length < 2) {
      return {
        status: 'baseline' as const,
        badgeTitle: 'Fase de Linha de Base',
        message: 'Poucos dados históricos para determinar platô. Registre ao menos 2 a 3 sessões para ativar o diagnóstico de sobrecarga.',
        color: 'sky',
        prWeight: progressionData[0]?.maxWeight || 0,
        pr1RM: progressionData[0]?.max1RM || 0,
        totalVolume: progressionData.reduce((acc, p) => acc + p.volume, 0),
        growthPercent: 0,
        isPlateau: false,
      };
    }

    const first = progressionData[0];
    const last = progressionData[progressionData.length - 1];
    const prWeight = Math.max(...progressionData.map((p) => p.maxWeight));
    const pr1RM = Math.max(...progressionData.map((p) => p.max1RM));
    const totalVolume = progressionData.reduce((acc, p) => acc + p.volume, 0);

    const growthPercent = first.maxWeight > 0
      ? Math.round(((last.maxWeight - first.maxWeight) / first.maxWeight) * 100)
      : 0;

    // Detecção de Estagnação: verifica as últimas 3 sessões
    const recent = progressionData.slice(-3);
    const isPlateau = recent.length >= 3 && recent.every((p) => p.maxWeight === recent[0].maxWeight);

    if (isPlateau) {
      return {
        status: 'plateau' as const,
        badgeTitle: '⚠️ Estagnação de Força Detectada',
        message: `Carga travada em ${last.maxWeight}kg nas últimas ${recent.length} sessões. Intervenção sugerida: Realize um microciclo de deload (-10% a -15% volume), alterne para uma faixa de repetições mais baixa (ex: 5-6 reps para recrutamento motor) ou varie o ângulo de pegada.`,
        color: 'amber',
        prWeight,
        pr1RM,
        totalVolume,
        growthPercent,
        isPlateau: true,
      };
    }

    if (last.maxWeight > first.maxWeight) {
      return {
        status: 'progressing' as const,
        badgeTitle: '🚀 Sobrecarga Progressiva Ativa',
        message: `Evolução sólida de +${last.maxWeight - first.maxWeight}kg (+${growthPercent}%) desde o início. O estímulo adaptativo está ocorrendo conforme o planejado. Continue incrementando 2.5% a 5% ao atingir o teto de repetições.`,
        color: 'emerald',
        prWeight,
        pr1RM,
        totalVolume,
        growthPercent,
        isPlateau: false,
      };
    }

    return {
      status: 'consolidating' as const,
      badgeTitle: '⚡ Adaptação Neural & Consolidando Cargas',
      message: 'Carga estável com acúmulo de repetições e volume. Busque adicionar +1 repetição na primeira série para engatilhar a próxima sobrecarga.',
      color: 'teal',
      prWeight,
      pr1RM,
      totalVolume,
      growthPercent,
      isPlateau: false,
    };
  }, [progressionData]);

  const hasRealData = loggedExercises.length > 0;

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Header do Dashboard de Analytics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Evolução de Cargas & Força
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Curva de 1RM estimado e volume mensal com detector de estagnações.
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Demonstração / Ação rápida */}
        <div className="flex items-center gap-2 flex-wrap">
          {!hasRealData && (
            <button
              type="button"
              onClick={() => setShowDemoData(!showDemoData)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showDemoData
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {showDemoData ? 'Modo Demonstração (Ativo)' : 'Ver Dados Exemplo'}
            </button>
          )}

          {onOpenAnalyticsModal && (
            <button
              type="button"
              onClick={() => onOpenAnalyticsModal(selectedExercise)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#142036] hover:bg-[#1a2d4f] text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir em tela cheia com histórico completo"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Modal Detalhado</span>
            </button>
          )}
        </div>
      </div>

      {/* Seletor de Exercício e Alternador de Gráficos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Dropdown do Exercício */}
        <div className="flex-1 sm:max-w-md">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
            <span>Selecionar Exercício para Análise:</span>
          </label>
          <div className="relative">
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              disabled={!hasRealData && !showDemoData}
              className="w-full bg-[#090f1d] border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none transition-all cursor-pointer shadow-inner"
            >
              {hasRealData ? (
                loggedExercises.map((name) => (
                  <option key={name} value={name} className="bg-slate-900 text-white">
                    {name}
                  </option>
                ))
              ) : (
                <option value="Supino Reto com Barra" className="bg-slate-900 text-white">
                  Supino Reto com Barra (Exemplo)
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Toggle Tipo de Gráfico */}
        <div className="flex flex-wrap items-center gap-1 bg-[#090f1d] p-1 rounded-2xl border border-slate-800 self-start sm:self-end">
          <button
            type="button"
            onClick={() => setActiveChartType('progression')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeChartType === 'progression'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cargas & 1RM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartType('scatter')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeChartType === 'scatter'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dispersão RPE × Carga</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartType('monthly')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeChartType === 'monthly'
                ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 font-black shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Volume Mensal (kg)</span>
          </button>
        </div>
      </div>

      {/* Cartões de KPIs Rápidos do Exercício Selecionado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#090f1d] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Recorde Pessoal (PR)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {diagnosis.prWeight}
            </span>
            <span className="text-xs text-slate-400 font-mono">kg</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Carga máxima levantada
          </span>
        </div>

        <div className="bg-[#090f1d] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            1RM Máximo Estimado
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-sky-400">
              {diagnosis.pr1RM}
            </span>
            <span className="text-xs text-slate-400 font-mono">kg</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Força máxima teórica (1 rep)
          </span>
        </div>

        <div className="bg-[#090f1d] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Volume Total Acumulado
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-teal-300">
              {diagnosis.totalVolume.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">kg</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Séries × Reps × Cargas
          </span>
        </div>

        <div className="bg-[#090f1d] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Evolução de Carga
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-black font-mono ${
              diagnosis.growthPercent > 0 ? 'text-emerald-400' : 'text-slate-300'
            }`}>
              {diagnosis.growthPercent > 0 ? `+${diagnosis.growthPercent}%` : `${diagnosis.growthPercent}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {progressionData.length} sessões registradas
          </span>
        </div>
      </div>

      {/* Diagnóstico Biomecânico & Alerta de Estagnação */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        diagnosis.isPlateau
          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
          : diagnosis.status === 'progressing'
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
          : 'bg-sky-950/20 border-sky-500/30 text-sky-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
            diagnosis.isPlateau
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : diagnosis.status === 'progressing'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
          }`}>
            {diagnosis.isPlateau ? (
              <AlertTriangle className="w-5 h-5" />
            ) : diagnosis.status === 'progressing' ? (
              <Flame className="w-5 h-5 fill-emerald-400" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div>
            <strong className="text-xs sm:text-sm font-black block mb-0.5">
              {diagnosis.badgeTitle}
            </strong>
            <p className="text-xs leading-relaxed opacity-90">
              {diagnosis.message}
            </p>
          </div>
        </div>

        {diagnosis.isPlateau && (
          <div className="shrink-0">
            <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Intervenção Recomendada
            </span>
          </div>
        )}
      </div>

      {/* ÁREA GRÁFICA INTERATIVA COM RECHARTS */}
      <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-4 sm:p-5">
        {!hasRealData && !showDemoData ? (
          <div className="py-14 text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-500">
              <TrendingUp className="w-8 h-8 opacity-60 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Nenhum dado de carga registrado ainda
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
              Inicie um treino para registrar cargas e repetições. A curva de progressão e análise de volume mensal serão traçadas automaticamente.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDemoData(true)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
              >
                Visualizar Gráficos de Exemplo
              </button>
              {onGoToWorkout && (
                <button
                  type="button"
                  onClick={onGoToWorkout}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Iniciar Treino Agora
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-mono">
              <span className="font-bold text-white">
                {activeChartType === 'progression'
                  ? `Curva de Evolução: ${selectedExercise}`
                  : activeChartType === 'scatter'
                  ? `Dispersão Esforço (RPE/RIR) × Carga (kg): ${selectedExercise}`
                  : `Volume Total Mensal (kg): ${selectedExercise}`}
              </span>
              <span>
                {activeChartType === 'monthly'
                  ? `${monthlyData.length} meses registrados`
                  : `${progressionData.length} pontos de dados`}
              </span>
            </div>

            <div className="h-72 sm:h-80 w-full">
              {activeChartType === 'progression' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={{ stroke: '#334155' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={{ stroke: '#334155' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0b1220] border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-mono">
                              <span className="text-slate-400 block mb-1 font-sans">{data.fullDate}</span>
                              <div className="space-y-1">
                                <div className="text-emerald-400 font-bold">
                                  Carga Máxima: {data.maxWeight} kg ({data.reps} reps)
                                </div>
                                <div className="text-sky-400 font-bold">
                                  1RM Estimado: {data.max1RM} kg
                                </div>
                                <div className="text-teal-300">
                                  Volume da Sessão: {data.volume.toLocaleString()} kg
                                </div>
                                {data.avgRpe && (
                                  <div className="text-amber-300">
                                    RPE Médio: {data.avgRpe}
                                  </div>
                                )}
                              </div>
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
                    <Line
                      type="monotone"
                      name="Carga Máxima (kg)"
                      dataKey="maxWeight"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', stroke: '#022c22', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#34d399' }}
                    />
                    <Line
                      type="monotone"
                      name="1RM Estimado (kg)"
                      dataKey="max1RM"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#38bdf8', stroke: '#082f49', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#7dd3fc' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : activeChartType === 'scatter' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis
                      type="number"
                      dataKey="maxWeight"
                      name="Carga"
                      unit=" kg"
                      stroke="#38bdf8"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    <YAxis
                      type="number"
                      dataKey="rpeNum"
                      name="RPE"
                      unit=" RPE"
                      stroke="#f59e0b"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      domain={[5.5, 10.2]}
                    />
                    <ZAxis type="number" dataKey="reps" range={[90, 260]} name="Repetições" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0b1220] border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-mono space-y-1">
                              <span className="text-slate-400 block mb-1 font-sans">{data.fullDate}</span>
                              <div className="text-sky-400 font-bold">Carga: {data.maxWeight} kg ({data.reps} reps)</div>
                              <div className="text-amber-400 font-bold">
                                Esforço: RPE {data.rpeNum} (RIR {Math.max(0, +(10 - data.rpeNum).toFixed(1))})
                              </div>
                              <div className="text-emerald-400">1RM Est.: ~{data.max1RM} kg</div>
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
                    <ReferenceLine
                      y={8.5}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Zona Ótima (RPE 8-9 / RIR 1-2)',
                        fill: '#10b981',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                    <Scatter
                      name="Relação Esforço (RPE) × Carga (kg)"
                      data={progressionData.map((d) => ({
                        ...d,
                        rpeNum: parseFloat(d.avgRpe || '8') || 8,
                      }))}
                      fill="#f59e0b"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#64748b" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={{ stroke: '#334155' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={{ stroke: '#334155' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0b1220] border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-mono">
                              <span className="text-slate-400 block mb-1 font-sans">{data.month}</span>
                              <div className="space-y-1">
                                <div className="text-teal-400 font-bold">
                                  Volume Total: {data.volume.toLocaleString()} kg
                                </div>
                                <div className="text-slate-300">
                                  Séries Executadas: {data.sets} séries
                                </div>
                                <div className="text-sky-300">
                                  Sessões no Mês: {data.sessionsCount} treinos
                                </div>
                              </div>
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
                      dataKey="volume" 
                      name="Volume Mensal (kg)" 
                      fill="#14b8a6" 
                      radius={[8, 8, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
