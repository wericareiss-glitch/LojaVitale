/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MuscleGroup, LevelOption } from '../types/workout';

export interface VolumeLandmarks {
  mv: number;     // Volume de Manutenção (séries/semana)
  mev: number;    // Volume Mínimo Efetivo (séries/semana)
  mavMin: number; // Início do Volume Adaptativo Máximo (Faixa Ótima)
  mavMax: number; // Teto do Volume Adaptativo Máximo
  mrv: number;    // Volume Máximo Recuperável (Teto de Overtraining)
}

export interface VolumeZoneResult {
  zone: 'sub_mev' | 'mev_mav' | 'mav_mrv' | 'over_mrv';
  label: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  percentOfMrv: number;
  recommendation: string;
}

/**
 * Tabela fisiológica de marcos volumétricos (Israetel, Schoenfeld) por grupamento muscular e nível do atleta.
 * Músculos menores ou com menor dano excêntrico (ex: deltoide lateral, panturrilhas, costas) toleram e exigem mais volume.
 * Músculos com maior dano estrutural excêntrico e estresse articular (ex: isquiotibiais, peito) possuem MRVs menores.
 */
export const MUSCLE_VOLUME_LANDMARKS: Record<MuscleGroup, Record<LevelOption, VolumeLandmarks>> = {
  quadriceps: {
    beginner:     { mv: 6,  mev: 8,  mavMin: 10, mavMax: 14, mrv: 18 },
    intermediate: { mv: 8,  mev: 10, mavMin: 12, mavMax: 18, mrv: 22 },
    advanced:     { mv: 10, mev: 12, mavMin: 16, mavMax: 22, mrv: 26 },
  },
  hamstrings: {
    beginner:     { mv: 4,  mev: 6,  mavMin: 8,  mavMax: 12, mrv: 16 },
    intermediate: { mv: 6,  mev: 8,  mavMin: 10, mavMax: 16, mrv: 20 },
    advanced:     { mv: 8,  mev: 10, mavMin: 14, mavMax: 18, mrv: 22 },
  },
  glutes: {
    beginner:     { mv: 4,  mev: 6,  mavMin: 8,  mavMax: 14, mrv: 18 },
    intermediate: { mv: 6,  mev: 8,  mavMin: 12, mavMax: 18, mrv: 22 },
    advanced:     { mv: 8,  mev: 10, mavMin: 14, mavMax: 22, mrv: 26 },
  },
  chest: {
    beginner:     { mv: 6,  mev: 8,  mavMin: 10, mavMax: 14, mrv: 18 },
    intermediate: { mv: 8,  mev: 10, mavMin: 12, mavMax: 16, mrv: 20 },
    advanced:     { mv: 10, mev: 12, mavMin: 14, mavMax: 20, mrv: 24 },
  },
  back: {
    beginner:     { mv: 8,  mev: 10, mavMin: 12, mavMax: 16, mrv: 22 },
    intermediate: { mv: 10, mev: 12, mavMin: 14, mavMax: 20, mrv: 26 },
    advanced:     { mv: 12, mev: 14, mavMin: 18, mavMax: 24, mrv: 30 },
  },
  shoulders: {
    beginner:     { mv: 6,  mev: 8,  mavMin: 12, mavMax: 16, mrv: 22 },
    intermediate: { mv: 8,  mev: 12, mavMin: 16, mavMax: 22, mrv: 28 },
    advanced:     { mv: 10, mev: 14, mavMin: 18, mavMax: 26, mrv: 32 },
  },
  rear_delts: {
    beginner:     { mv: 4,  mev: 6,  mavMin: 8,  mavMax: 14, mrv: 18 },
    intermediate: { mv: 6,  mev: 8,  mavMin: 12, mavMax: 18, mrv: 24 },
    advanced:     { mv: 8,  mev: 10, mavMin: 14, mavMax: 22, mrv: 28 },
  },
  triceps: {
    beginner:     { mv: 4,  mev: 6,  mavMin: 8,  mavMax: 12, mrv: 16 },
    intermediate: { mv: 6,  mev: 8,  mavMin: 10, mavMax: 16, mrv: 20 },
    advanced:     { mv: 8,  mev: 10, mavMin: 12, mavMax: 18, mrv: 24 },
  },
  biceps: {
    beginner:     { mv: 4,  mev: 6,  mavMin: 8,  mavMax: 12, mrv: 16 },
    intermediate: { mv: 6,  mev: 8,  mavMin: 10, mavMax: 16, mrv: 20 },
    advanced:     { mv: 8,  mev: 10, mavMin: 12, mavMax: 18, mrv: 24 },
  },
  calves: {
    beginner:     { mv: 6,  mev: 8,  mavMin: 10, mavMax: 14, mrv: 18 },
    intermediate: { mv: 8,  mev: 10, mavMin: 12, mavMax: 18, mrv: 24 },
    advanced:     { mv: 10, mev: 12, mavMin: 16, mavMax: 22, mrv: 28 },
  },
  abs: {
    beginner:     { mv: 0,  mev: 4,  mavMin: 6,  mavMax: 10, mrv: 16 },
    intermediate: { mv: 4,  mev: 6,  mavMin: 8,  mavMax: 14, mrv: 20 },
    advanced:     { mv: 6,  mev: 8,  mavMin: 10, mavMax: 16, mrv: 24 },
  },
};

export function getVolumeLandmarks(muscle: MuscleGroup, level: LevelOption = 'intermediate'): VolumeLandmarks {
  const muscleTable = MUSCLE_VOLUME_LANDMARKS[muscle];
  if (!muscleTable) {
    return { mv: 6, mev: 8, mavMin: 12, mavMax: 18, mrv: 22 };
  }
  return muscleTable[level] || muscleTable.intermediate;
}

export function evaluateVolumeZone(currentSets: number, landmarks: VolumeLandmarks): VolumeZoneResult {
  const percentOfMrv = Math.round((currentSets / Math.max(1, landmarks.mrv)) * 100);

  if (currentSets < landmarks.mev) {
    return {
      zone: 'sub_mev',
      label: 'Sub-Estímulo (< MEV)',
      badge: 'Manutenção / Abaixo do MEV',
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/15',
      borderColor: 'border-sky-500/30',
      percentOfMrv,
      recommendation: `Faltam ${landmarks.mev - currentSets} séries para atingir o Volume Mínimo Efetivo (${landmarks.mev}s). Adicione séries para sinalizar hipertrofia.`,
    };
  }

  if (currentSets <= landmarks.mavMax) {
    return {
      zone: 'mev_mav',
      label: 'Faixa Ótima (MEV - MAV)',
      badge: 'Volume Adaptativo Ótimo',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/30',
      percentOfMrv,
      recommendation: `Volume ideal (${currentSets}s). Excelente equilíbrio entre síntese proteica e capacidade recuperativa.`,
    };
  }

  if (currentSets <= landmarks.mrv) {
    return {
      zone: 'mav_mrv',
      label: 'Volume Máximo (MAV - MRV)',
      badge: 'Perto do Limite Recuperável',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/30',
      percentOfMrv,
      recommendation: `Próximo ao teto recuperável (${landmarks.mrv}s). Monitore dores articulares e percepção de fadiga.`,
    };
  }

  return {
    zone: 'over_mrv',
    label: 'Sobretreino (> MRV)',
    badge: 'Alerta de Overtraining',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
    borderColor: 'border-rose-500/40',
    percentOfMrv,
    recommendation: `Excedeu o MRV em ${currentSets - landmarks.mrv} séries! Risco de regressão adaptativa e fadiga central. Reduza o volume.`,
  };
}
