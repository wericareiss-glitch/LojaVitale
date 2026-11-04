/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MuscleGroup, UserProfile, WorkoutSessionSummary } from '../types/workout';
import { MUSCLE_VOLUME_LANDMARKS } from './volumeEngine';
import { safeStorage } from './storage';

export interface DeloadState {
  active: boolean;
  startedAt: number;
  expiresAt: number;
  originalWeeklyBudget: number;
  reductionPercentage: number; // Padrão: 40% de redução no volume de séries
  intensityReduction: number; // Padrão: 10% de redução nas cargas
  reason: string;
}

export interface FatigueAnalysis {
  recommendDeload: boolean;
  fatigueScore: number; // 0 a 100
  consecutiveHeavyWeeks: number;
  highRpeSetsCount: number;
  mrvExceededMuscles: string[];
  reasons: string[];
}

/**
 * Analisa o histórico de treinos para avaliar necessidade fisiológica de Deload
 */
export function analyzeFatigueAndDeload(
  user: UserProfile,
  sessions: WorkoutSessionSummary[],
  weeklySets: Partial<Record<MuscleGroup, number>>
): FatigueAnalysis {
  const reasons: string[] = [];
  const mrvExceededMuscles: string[] = [];
  let fatigueScore = 20; // Base baseline

  // 1. Verifica se algum grupo muscular excedeu o MRV (Maximum Recoverable Volume)
  if (weeklySets) {
    Object.entries(weeklySets).forEach(([mKey, sets]) => {
      const landmarks = MUSCLE_VOLUME_LANDMARKS[mKey as MuscleGroup]?.[user.level || 'intermediate'];
      if (landmarks && typeof sets === 'number' && sets > landmarks.mrv) {
        mrvExceededMuscles.push(mKey);
        fatigueScore += 18;
      }
    });
  }

  if (mrvExceededMuscles.length > 0) {
    reasons.push(
      `${mrvExceededMuscles.length} grupamento(s) excederam o MRV (Volume Máximo Recuperável), acumulando fadiga musculoesquelética.`
    );
  }

  // 2. Analisa as últimas 10 sessões para densidade de RPE 9 e 10
  const recentSessions = [...sessions].reverse().slice(0, 10);
  let highRpeSetsCount = 0;
  let totalLoggedSets = 0;

  recentSessions.forEach((s) => {
    s.completedExercises?.forEach((ex) => {
      ex.sets?.forEach((st) => {
        totalLoggedSets++;
        const rpeNum = parseInt(st.rpe || '0', 10);
        if (rpeNum >= 9) {
          highRpeSetsCount++;
        }
      });
    });
  });

  if (totalLoggedSets > 0) {
    const highRpeRatio = highRpeSetsCount / totalLoggedSets;
    if (highRpeRatio > 0.45) {
      fatigueScore += 25;
      reasons.push(
        `${Math.round(highRpeRatio * 100)}% das séries recentes foram realizadas em RPE 9-10 (próximo ou na falha concêntrica).`
      );
    }
  }

  // 3. Verifica consistência prolongada sem intervalo (> 4 semanas seguidas com mais de 3 treinos por semana)
  const now = Date.now();
  const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000;
  const sessionsLast4Weeks = sessions.filter((s) => new Date(s.date).getTime() >= fourWeeksAgo);

  const consecutiveHeavyWeeks = Math.floor(sessionsLast4Weeks.length / Math.max(1, user.frequency || 4));
  if (sessionsLast4Weeks.length >= 16) {
    fatigueScore += 20;
    reasons.push(
      `Você completou ${sessionsLast4Weeks.length} treinos nas últimas 4 semanas sem semana regenerativa.`
    );
  }

  // Cap score entre 0 e 100
  const finalScore = Math.min(100, Math.max(0, fatigueScore));
  const recommendDeload = finalScore >= 65 || mrvExceededMuscles.length >= 2;

  if (recommendDeload && reasons.length === 0) {
    reasons.push('Fadiga sistêmica acumulada detectada após ciclo contínuo de hipertrofia.');
  }

  return {
    recommendDeload,
    fatigueScore: finalScore,
    consecutiveHeavyWeeks,
    highRpeSetsCount,
    mrvExceededMuscles,
    reasons,
  };
}

/**
 * Obtém o estado ativo de Deload para o usuário
 */
export function getDeloadState(userId: string): DeloadState | null {
  const state = safeStorage.get<DeloadState | null>(`alex_u_${userId}_deload_mode`, null);
  if (!state) return null;

  // Se já expirou (passou de 7 dias), desativa automaticamente
  if (state.active && Date.now() > state.expiresAt) {
    state.active = false;
    safeStorage.set(`alex_u_${userId}_deload_mode`, state);
    return state;
  }

  return state;
}

/**
 * Ativa uma semana de Deload
 */
export function activateDeload(
  userId: string,
  currentBudget: number,
  reason: string = 'Recuperação ativa planejada e regeneração de tendões e SNC'
): DeloadState {
  const durationMs = 7 * 24 * 60 * 60 * 1000; // 7 dias
  const newState: DeloadState = {
    active: true,
    startedAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    originalWeeklyBudget: currentBudget,
    reductionPercentage: 40, // 40% a menos de séries
    intensityReduction: 10, // 10% a menos de carga
    reason,
  };

  safeStorage.set(`alex_u_${userId}_deload_mode`, newState);
  return newState;
}

/**
 * Desativa o Deload e restaura configurações normais
 */
export function deactivateDeload(userId: string): void {
  safeStorage.remove(`alex_u_${userId}_deload_mode`);
}
