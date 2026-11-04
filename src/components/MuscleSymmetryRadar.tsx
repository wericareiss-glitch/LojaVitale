/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ShieldAlert,
  CheckCircle2,
  Scale,
  Info,
  Sparkles,
} from 'lucide-react';
import { WorkoutSessionSummary, MuscleGroup, Exercise } from '../types/workout';
import { EXERCISE_DATABASE } from '../data/exerciseDatabase';

interface MuscleSymmetryRadarProps {
  sessions: WorkoutSessionSummary[];
  completedSetsByMuscle?: Record<MuscleGroup, number>;
}

interface AntagonistPairAnalysis {
  id: string;
  pairLabel: string;
  agonistName: string;
  antagonistName: string;
  agonistSets: number;
  antagonistSets: number;
  agonistVolumeKg: number;
  antagonistVolumeKg: number;
  agonistBest1RM: number;
  antagonistBest1RM: number;
  imbalancePct: number;
  dominantSide: 'agonist' | 'antagonist' | 'balanced';
  warningMessage: string | null;
  jointRisk: string;
}

export const MuscleSymmetryRadar: React.FC<MuscleSymmetryRadarProps> = ({
  sessions,
  completedSetsByMuscle,
}) => {
  const [metricMode, setMetricMode] = useState<'sets' | 'volume' | 'strength'>('sets');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Map exercise name (lowercase) to MuscleGroup
  const exerciseMuscleMap = useMemo(() => {
    const map = new Map<string, MuscleGroup>();
    Object.entries(EXERCISE_DATABASE).forEach(([muscleKey, exercises]) => {
      (exercises as Exercise[]).forEach((ex) => {
        map.set(ex.name.toLowerCase(), muscleKey as MuscleGroup);
      });
    });
    return map;
  }, []);

  const analysis = useMemo(() => {
    const stats: Record<
      MuscleGroup,
      { sets: number; volumeKg: number; best1RM: number }
    > = {
      chest: { sets: 0, volumeKg: 0, best1RM: 0 },
      back: { sets: 0, volumeKg: 0, best1RM: 0 },
      quadriceps: { sets: 0, volumeKg: 0, best1RM: 0 },
      hamstrings: { sets: 0, volumeKg: 0, best1RM: 0 },
      glutes: { sets: 0, volumeKg: 0, best1RM: 0 },
      calves: { sets: 0, volumeKg: 0, best1RM: 0 },
      shoulders: { sets: 0, volumeKg: 0, best1RM: 0 },
      rear_delts: { sets: 0, volumeKg: 0, best1RM: 0 },
      biceps: { sets: 0, volumeKg: 0, best1RM: 0 },
      triceps: { sets: 0, volumeKg: 0, best1RM: 0 },
      abs: { sets: 0, volumeKg: 0, best1RM: 0 },
    };

    if (isDemoMode) {
      // Realistic demonstration data highlighting a Push > Pull imbalance (>35%)
      stats.chest = { sets: 18, volumeKg: 11200, best1RM: 105 };
      stats.back = { sets: 12, volumeKg: 7800, best1RM: 95 };
      stats.quadriceps = { sets: 16, volumeKg: 14500, best1RM: 140 };
      stats.hamstrings = { sets: 14, volumeKg: 11800, best1RM: 115 };
      stats.triceps = { sets: 12, volumeKg: 4200, best1RM: 45 };
      stats.biceps = { sets: 11, volumeKg: 3900, best1RM: 42 };
      stats.shoulders = { sets: 15, volumeKg: 5600, best1RM: 60 };
      stats.rear_delts = { sets: 9, volumeKg: 3100, best1RM: 38 };
    } else {
      // Seed sets from active weekly completedSetsByMuscle if available
      if (completedSetsByMuscle) {
        (Object.keys(completedSetsByMuscle) as MuscleGroup[]).forEach((mKey) => {
          if (stats[mKey]) {
            stats[mKey].sets += completedSetsByMuscle[mKey] || 0;
          }
        });
      }

      // Accumulate from last 28 days of sessions (or all sessions if fewer than 2 in 28d)
      const now = Date.now();
      const twentyEightDaysAgo = now - 28 * 24 * 60 * 60 * 1000;
      const recentSessions = sessions.filter((s) => {
        const t = new Date(s.date).getTime();
        return !isNaN(t) && t >= twentyEightDaysAgo;
      });
      const targetSessions = recentSessions.length >= 2 ? recentSessions : sessions;

      targetSessions.forEach((session) => {
        session.completedExercises.forEach((exLog) => {
          const muscle =
            exLog.muscleKey ||
            exerciseMuscleMap.get(exLog.name.toLowerCase());
          if (!muscle || !stats[muscle]) return;

          exLog.sets.forEach((s) => {
            const w = Number(s.weight) || 0;
            const r = Number(s.reps) || 0;
            const rir = s.rir !== undefined && s.rir !== '' ? parseFloat(s.rir) : 1;

            stats[muscle].sets += 1;
            if (w > 0 && r > 0) {
              stats[muscle].volumeKg += w * r;
              const effReps = r + Math.max(0, isNaN(rir) ? 0 : rir);
              const est1RM = w * (1 + effReps / 30);
              if (est1RM > stats[muscle].best1RM) {
                stats[muscle].best1RM = Math.round(est1RM * 10) / 10;
              }
            }
          });
        });
      });
    }

    const buildPair = (
      id: string,
      pairLabel: string,
      agonistKey: MuscleGroup,
      agonistName: string,
      antagonistKey: MuscleGroup,
      antagonistName: string,
      jointRisk: string
    ): AntagonistPairAnalysis => {
      const ag = stats[agonistKey];
      const ant = stats[antagonistKey];

      const agVal =
        metricMode === 'sets'
          ? ag.sets
          : metricMode === 'volume'
          ? ag.volumeKg
          : ag.best1RM;
      const antVal =
        metricMode === 'sets'
          ? ant.sets
          : metricMode === 'volume'
          ? ant.volumeKg
          : ant.best1RM;

      let imbalancePct = 0;
      let dominantSide: 'agonist' | 'antagonist' | 'balanced' = 'balanced';
      let warningMessage: string | null = null;

      if (agVal > 0 || antVal > 0) {
        const minVal = Math.max(1, Math.min(agVal, antVal));
        const maxVal = Math.max(agVal, antVal);
        const diffPct = Math.round(((maxVal - minVal) / minVal) * 100);
        imbalancePct = diffPct;

        if (diffPct > 35) {
          dominantSide = agVal > antVal ? 'agonist' : 'antagonist';
          const dominantLabel = agVal > antVal ? agonistName : antagonistName;
          const weakLabel = agVal > antVal ? antagonistName : agonistName;
          warningMessage = `O volume/força de ${dominantLabel} supera ${weakLabel} em +${diffPct}% (>35%). Risco articular/postural: ${jointRisk}.`;
        }
      }

      return {
        id,
        pairLabel,
        agonistName,
        antagonistName,
        agonistSets: ag.sets,
        antagonistSets: ant.sets,
        agonistVolumeKg: Math.round(ag.volumeKg),
        antagonistVolumeKg: Math.round(ant.volumeKg),
        agonistBest1RM: ag.best1RM,
        antagonistBest1RM: ant.best1RM,
        imbalancePct,
        dominantSide,
        warningMessage,
        jointRisk,
      };
    };

    const pairs: AntagonistPairAnalysis[] = [
      buildPair(
        'push_pull_torso',
        'Peito vs. Costas',
        'chest',
        'Peito (Empurrar)',
        'back',
        'Costas (Puxar)',
        'protrusão escapular e sobrecarga no tendão do supraespinhal (ombro)'
      ),
      buildPair(
        'knee_chain',
        'Quadríceps vs. Posterior',
        'quadriceps',
        'Quadríceps',
        'hamstrings',
        'Posterior de Coxa',
        'tensão excessiva no ligamento cruzado anterior (LCA) e tendão patelar'
      ),
      buildPair(
        'elbow_chain',
        'Bíceps vs. Tríceps',
        'triceps',
        'Tríceps',
        'biceps',
        'Bíceps',
        'epicondilite medial/lateral no cotovelo e assimetria de braço'
      ),
      buildPair(
        'shoulder_caps',
        'Ombro Ant. vs. Delt. Post.',
        'shoulders',
        'Ombros (Ant./Lat.)',
        'rear_delts',
        'Deltoide Posterior',
        'rotação interna de úmero e impacto subacromial'
      ),
    ];

    const radarData = pairs.map((p) => {
      const agRaw =
        metricMode === 'sets'
          ? p.agonistSets
          : metricMode === 'volume'
          ? p.agonistVolumeKg
          : p.agonistBest1RM;
      const antRaw =
        metricMode === 'sets'
          ? p.antagonistSets
          : metricMode === 'volume'
          ? p.antagonistVolumeKg
          : p.antagonistBest1RM;

      const maxAxis = Math.max(1, agRaw, antRaw);
      return {
        axis: p.pairLabel,
        Agonista: Math.round((agRaw / maxAxis) * 100),
        Antagonista: Math.round((antRaw / maxAxis) * 100),
        agRaw,
        antRaw,
        agonistName: p.agonistName,
        antagonistName: p.antagonistName,
      };
    });

    const totalLoggedSets = Object.values(stats).reduce((acc, s) => acc + s.sets, 0);

    return { pairs, radarData, totalLoggedSets };
  }, [sessions, completedSetsByMuscle, exerciseMuscleMap, metricMode, isDemoMode]);

  return (
    <div className="rounded-3xl bg-[#0f172a]/90 border border-slate-800 p-5 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Radar de Simetria & Proporção Agonista/Antagonista
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Recharts RadarChart
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compara volume e força entre cadeias opostas (Peito vs. Costas, Quadríceps vs. Posterior, Bíceps vs. Tríceps), alertando sobre desvios &gt;35%.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {analysis.totalLoggedSets === 0 && !isDemoMode && (
            <button
              type="button"
              onClick={() => setIsDemoMode(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simular Radar</span>
            </button>
          )}
          {isDemoMode && (
            <button
              type="button"
              onClick={() => setIsDemoMode(false)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ver Dados Reais</span>
            </button>
          )}

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              type="button"
              onClick={() => setMetricMode('sets')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                metricMode === 'sets'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Séries
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('volume')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                metricMode === 'volume'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Volume (kg)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('strength')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                metricMode === 'strength'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Força (1RM)
            </button>
          </div>
        </div>
      </div>

      {analysis.totalLoggedSets === 0 ? (
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-6 text-center space-y-2.5">
          <Scale className="w-8 h-8 text-indigo-400 mx-auto opacity-80" />
          <p className="text-sm font-bold text-white">
            Registre seu primeiro treino para calcular sua Simetria Agonista/Antagonista
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Assim que você concluir séries de Peito, Costas, Quadríceps, Posterior e Braços, o radar analisará desvios posturais e risco articular (&gt;35%).
          </p>
          <button
            type="button"
            onClick={() => setIsDemoMode(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Visualizar Simulação de Simetria</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Radar Chart */}
          <div className="lg:col-span-6 h-72 sm:h-80 rounded-2xl bg-slate-950/50 border border-slate-800/80 p-3 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analysis.radarData}>
                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Radar
                  name="Cadeia Agonista (Empurrar / Anterior)"
                  dataKey="Agonista"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <Radar
                  name="Cadeia Antagonista (Puxar / Posterior)"
                  dataKey="Antagonista"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(
                    value: any,
                    name: any,
                    props: any
                  ) => {
                    const p = props?.payload;
                    const unit = metricMode === 'sets' ? 'séries' : 'kg';
                    const nameStr = String(name || '');
                    if (nameStr.includes('Agonista') && p) {
                      return [`${p.agRaw} ${unit} (${value}%)`, p.agonistName || 'Agonista'];
                    }
                    if (p) {
                      return [`${p.antRaw} ${unit} (${value}%)`, p.antagonistName || 'Antagonista'];
                    }
                    return [`${value}%`, nameStr];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Pair Breakdown & Postural Alerts */}
          <div className="lg:col-span-6 space-y-3">
            {analysis.pairs.map((pair) => {
              const isAlert = pair.warningMessage !== null;
              const unit = metricMode === 'sets' ? 'séries' : 'kg';
              const agVal =
                metricMode === 'sets'
                  ? pair.agonistSets
                  : metricMode === 'volume'
                  ? pair.agonistVolumeKg
                  : pair.agonistBest1RM;
              const antVal =
                metricMode === 'sets'
                  ? pair.antagonistSets
                  : metricMode === 'volume'
                  ? pair.antagonistVolumeKg
                  : pair.antagonistBest1RM;

              return (
                <div
                  key={pair.id}
                  className={`rounded-2xl p-3.5 border transition-all ${
                    isAlert
                      ? 'bg-rose-500/10 border-rose-500/40'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      {pair.pairLabel}
                    </span>
                    {isAlert ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        <ShieldAlert className="w-3 h-3" /> Desvio +{pair.imbalancePct}% (&gt;35%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Equilibrado ({pair.imbalancePct}% dif.)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-1.5">
                    <div className="rounded-xl bg-slate-900/80 px-2.5 py-1.5 border border-amber-500/20 flex items-center justify-between">
                      <span className="text-slate-400 truncate pr-1">{pair.agonistName}:</span>
                      <span className="font-black font-mono text-amber-400 shrink-0">
                        {agVal} {unit}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-900/80 px-2.5 py-1.5 border border-sky-500/20 flex items-center justify-between">
                      <span className="text-slate-400 truncate pr-1">{pair.antagonistName}:</span>
                      <span className="font-black font-mono text-sky-400 shrink-0">
                        {antVal} {unit}
                      </span>
                    </div>
                  </div>

                  {pair.warningMessage && (
                    <div className="flex items-start gap-1.5 text-[11px] text-rose-200 bg-rose-950/40 rounded-xl p-2 border border-rose-500/25 mt-1">
                      <Info className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{pair.warningMessage}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
