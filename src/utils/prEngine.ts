/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSessionSummary, WorkoutLogs } from '../types/workout';

export interface ExercisePRData {
  maxWeight: number;
  maxWeightReps: number;
  best1RM: number;
  lastDate?: string;
}

export interface PRCheckResult {
  isWeightPR: boolean;
  is1RMPR: boolean;
  currentWeight: number;
  currentReps: number;
  current1RM: number;
  historicalMaxWeight: number;
  historicalBest1RM: number;
  diffWeight: number;
  diff1RM: number;
}

/**
 * Fórmula de Brzycki para estimativa de 1RM
 */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  // Brzycki: weight * (36 / (37 - reps))
  const safeReps = Math.min(reps, 30);
  return Math.round(weight * (36 / (37 - safeReps)) * 10) / 10;
}

/**
 * Recupera o histórico de recordes (PR) de um exercício em todas as sessões anteriores
 */
export function getExerciseHistoricalPR(
  exerciseName: string,
  sessions: WorkoutSessionSummary[] = [],
  historyLogs: WorkoutLogs = {}
): ExercisePRData {
  let maxWeight = 0;
  let maxWeightReps = 0;
  let best1RM = 0;
  let lastDate: string | undefined = undefined;

  const targetName = exerciseName.trim().toLowerCase();

  // 1. Vasculha sessões anteriores salvas
  for (const session of sessions) {
    if (!session.completedExercises) continue;

    for (const ex of session.completedExercises) {
      if (ex.name.trim().toLowerCase() === targetName && ex.sets) {
        for (const s of ex.sets) {
          const w = typeof s.weight === 'number' ? s.weight : parseFloat(s.weight as any) || 0;
          const r = typeof s.reps === 'number' ? s.reps : parseInt(s.reps as any, 10) || 0;

          if (w > 0 && r > 0) {
            const current1RM = estimate1RM(w, r);

            if (w > maxWeight) {
              maxWeight = w;
              maxWeightReps = r;
              lastDate = session.date;
            }

            if (current1RM > best1RM) {
              best1RM = current1RM;
            }
          }
        }
      }
    }
  }

  // 2. Vasculha histórico legado (caso existam chaves no historyLogs)
  if (maxWeight === 0 && historyLogs) {
    Object.keys(historyLogs).forEach((k) => {
      const entry = historyLogs[k];
      if (entry && entry.weight && entry.reps) {
        const w = parseFloat(entry.weight) || 0;
        const r = parseInt(entry.reps, 10) || 0;
        if (w > 0 && r > 0) {
          const current1RM = estimate1RM(w, r);
          if (w > maxWeight) {
            maxWeight = w;
            maxWeightReps = r;
          }
          if (current1RM > best1RM) {
            best1RM = current1RM;
          }
        }
      }
    });
  }

  return {
    maxWeight,
    maxWeightReps,
    best1RM,
    lastDate,
  };
}

/**
 * Avalia se o set atual bate o recorde pessoal histórico
 */
export function checkSetPR(
  exerciseName: string,
  weight: number,
  reps: number,
  historicalPR: ExercisePRData
): PRCheckResult | null {
  if (weight <= 0 || reps <= 0) return null;

  const current1RM = estimate1RM(weight, reps);
  const isWeightPR = historicalPR.maxWeight > 0 && weight > historicalPR.maxWeight;
  const is1RMPR = historicalPR.best1RM > 0 && current1RM > historicalPR.best1RM;

  if (!isWeightPR && !is1RMPR) return null;

  return {
    isWeightPR,
    is1RMPR,
    currentWeight: weight,
    currentReps: reps,
    current1RM,
    historicalMaxWeight: historicalPR.maxWeight,
    historicalBest1RM: historicalPR.best1RM,
    diffWeight: Math.round((weight - historicalPR.maxWeight) * 10) / 10,
    diff1RM: Math.round((current1RM - historicalPR.best1RM) * 10) / 10,
  };
}

/**
 * Extrai todos os recordes pessoais batidos em uma sessão de treino
 */
export function extractSessionPRs(
  session: WorkoutSessionSummary,
  previousSessions: WorkoutSessionSummary[]
): Array<{
  exerciseName: string;
  weight: number;
  reps: number;
  isWeightPR: boolean;
  is1RMPR: boolean;
  diffWeight: number;
  diff1RM: number;
}> {
  const prs: Array<{
    exerciseName: string;
    weight: number;
    reps: number;
    isWeightPR: boolean;
    is1RMPR: boolean;
    diffWeight: number;
    diff1RM: number;
  }> = [];

  if (!session.completedExercises) return prs;

  for (const ex of session.completedExercises) {
    const historicalPR = getExerciseHistoricalPR(ex.name, previousSessions);
    let bestSetResult: PRCheckResult | null = null;

    for (const s of ex.sets) {
      const w = typeof s.weight === 'number' ? s.weight : parseFloat(s.weight as any) || 0;
      const r = typeof s.reps === 'number' ? s.reps : parseInt(s.reps as any, 10) || 0;

      const check = checkSetPR(ex.name, w, r, historicalPR);
      if (check && (!bestSetResult || check.diffWeight > bestSetResult.diffWeight || check.diff1RM > bestSetResult.diff1RM)) {
        bestSetResult = check;
      }
    }

    if (bestSetResult) {
      prs.push({
        exerciseName: ex.name,
        weight: bestSetResult.currentWeight,
        reps: bestSetResult.currentReps,
        isWeightPR: bestSetResult.isWeightPR,
        is1RMPR: bestSetResult.is1RMPR,
        diffWeight: bestSetResult.diffWeight,
        diff1RM: bestSetResult.diff1RM,
      });
    }
  }

  return prs;
}
