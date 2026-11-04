/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, BodyMeasurement, NutritionPlan, ActivityLevel, NutritionGoal } from '../types/workout';

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; desc: string; multiplier: number }[] = [
  { id: 'sedentary', label: 'Sedentário', desc: 'Trabalho em escritório, pouco ou nenhum exercício', multiplier: 1.2 },
  { id: 'light', label: 'Levemente Ativo', desc: 'Exercício leve ou musculação 1 a 3 dias/semana', multiplier: 1.375 },
  { id: 'moderate', label: 'Moderadamente Ativo', desc: 'Musculação ou cardio 3 a 5 dias/semana', multiplier: 1.55 },
  { id: 'heavy', label: 'Altamente Ativo', desc: 'Treinos intensos 6 a 7 dias/semana', multiplier: 1.725 },
  { id: 'athlete', label: 'Atleta / Muito Intenso', desc: 'Treinos diários duplos ou trabalho físico pesado', multiplier: 1.9 },
];

export const NUTRITION_GOALS: { id: NutritionGoal; label: string; badge: string; deltaPct: number; desc: string }[] = [
  { id: 'cutting_aggressive', label: 'Cutting Agressivo', badge: '🔥 -20%', deltaPct: -0.20, desc: 'Déficit acentuado de 20% para queima acelerada com alta ingestão proteica.' },
  { id: 'cutting', label: 'Cutting Moderado (Recomendado)', badge: '✂️ -10%', deltaPct: -0.10, desc: 'Déficit sustentável de 10% preservando 100% da massa magra, força e performance.' },
  { id: 'maintenance', label: 'Manutenção / Recomposição', badge: '⚖️ 0%', deltaPct: 0.0, desc: 'Equilíbrio calórico ideal para recomposição corporal e adaptação neural.' },
  { id: 'bulking_clean', label: 'Bulking Limpo (Lean Bulking)', badge: '🍗 +10%', deltaPct: 0.10, desc: 'Superávit moderado de 10% para hipertrofia com mínimo acúmulo de gordura.' },
  { id: 'bulking_aggressive', label: 'Bulking Potente', badge: '🚀 +18%', deltaPct: 0.18, desc: 'Superávit de 18% para ectomorfos ou atletas com alta queima calórica.' },
];

/**
 * Deduz o nível de atividade recomendado com base na frequência de treinos do usuário
 */
export function getDefaultActivityLevel(frequency: number = 4): ActivityLevel {
  if (frequency <= 2) return 'light';
  if (frequency <= 4) return 'moderate';
  if (frequency <= 6) return 'heavy';
  return 'athlete';
}

/**
 * Calcula a Taxa Metabólica Basal (TMB) usando Mifflin-St Jeor ou Katch-McArdle
 */
export function calculateBMR(params: {
  weightKg: number;
  heightM: number;
  age: number;
  gender: 'male' | 'female';
  bodyFatPercent?: number;
}): { bmr: number; formulaUsed: 'Katch-McArdle' | 'Mifflin-St Jeor' } {
  const { weightKg, heightM, age, gender, bodyFatPercent } = params;
  const heightCm = heightM > 3 ? heightM : Math.round(heightM * 100);

  // Se tiver percentual de gordura informado/medido, usa Katch-McArdle (baseado em massa magra)
  if (bodyFatPercent && bodyFatPercent > 4 && bodyFatPercent < 50) {
    const leanMassKg = weightKg * (1 - bodyFatPercent / 100);
    const bmr = Math.round(370 + 21.6 * leanMassKg);
    return { bmr, formulaUsed: 'Katch-McArdle' };
  }

  // Fórmula padrão ouro Mifflin-St Jeor
  // Homens: (10 * weight) + (6.25 * height) - (5 * age) + 5
  // Mulheres: (10 * weight) + (6.25 * height) - (5 * age) - 161
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = gender === 'female' ? Math.round(base - 161) : Math.round(base + 5);

  return { bmr, formulaUsed: 'Mifflin-St Jeor' };
}

/**
 * Calcula o Gasto Energético Total (TDEE / GET)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const found = ACTIVITY_LEVELS.find((a) => a.id === activityLevel);
  const mult = found ? found.multiplier : 1.55;
  return Math.round(bmr * mult);
}

/**
 * Distribui macronutrientes com base na literatura científica de nutrição esportiva (Helms, Aragon, Schoenfeld)
 * Restrição mandatória: Gordura fixada em NO MÁXIMO 20% do total calórico.
 */
export function calculateMacros(
  weightKg: number,
  targetCalories: number,
  goal: NutritionGoal
): {
  proteinGrams: number;
  proteinPerKg: number;
  fatsGrams: number;
  fatsPerKg: number;
  carbsGrams: number;
} {
  let proteinPerKg = 2.0;

  switch (goal) {
    case 'cutting_aggressive':
      proteinPerKg = 2.4; // Proteção máxima anticatabólica em déficit alto
      break;
    case 'cutting':
      proteinPerKg = 2.2; // Déficit moderado (-10%)
      break;
    case 'maintenance':
      proteinPerKg = 2.0;
      break;
    case 'bulking_clean':
      proteinPerKg = 1.9;
      break;
    case 'bulking_aggressive':
      proteinPerKg = 1.8;
      break;
  }

  // Gramas de proteína (4 kcal/g)
  const proteinGrams = Math.round(weightKg * proteinPerKg);
  const proteinCals = proteinGrams * 4;

  // GORDURA: Limitada estritamente em NO MÁXIMO 20% do total calórico
  // 1g de gordura = 9 kcal
  const maxFatCalories = targetCalories * 0.20;
  const maxFatGrams = Math.max(25, Math.floor(maxFatCalories / 9));

  // Alvo padrão seria 0.7 - 0.8g/kg, mas sem jamais ultrapassar o teto de 20% total
  const rawFatGrams = Math.round(weightKg * 0.8);
  const fatsGrams = Math.min(rawFatGrams, maxFatGrams);
  const fatsCals = fatsGrams * 9;
  const fatsPerKg = weightKg > 0 ? Math.round((fatsGrams / weightKg) * 10) / 10 : 0.8;

  // Carboidratos completam o restante das calorias alvo (4 kcal/g)
  const remainingCals = Math.max(0, targetCalories - (proteinCals + fatsCals));
  const carbsGrams = Math.round(remainingCals / 4);

  return {
    proteinGrams,
    proteinPerKg: Math.round(proteinPerKg * 10) / 10,
    fatsGrams,
    fatsPerKg,
    carbsGrams,
  };
}

/**
 * Gera um plano nutricional completo para o atleta
 */
export function generateNutritionPlan(
  user: UserProfile,
  measurements: BodyMeasurement[] = [],
  customParams?: {
    goal?: NutritionGoal;
    activityLevel?: ActivityLevel;
    age?: number;
    customWeightKg?: number;
    bodyFatPercent?: number;
  }
): NutritionPlan {
  // Pega o peso mais recente registrado nas medições, ou do perfil
  const latestMeasurement = measurements.length > 0
    ? [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const weightKg = customParams?.customWeightKg || latestMeasurement?.weightKg || user.weightKg || 75;
  const heightM = user.heightM || 1.75;
  const age = customParams?.age || user.age || 26;
  const gender = (user.gender === 'female' ? 'female' : 'male') as 'male' | 'female';
  const bodyFatPercent = customParams?.bodyFatPercent !== undefined ? customParams.bodyFatPercent : latestMeasurement?.bodyFatPercent;

  const activityLevel = customParams?.activityLevel || getDefaultActivityLevel(user.frequency || 4);
  const goal = customParams?.goal || (user.focus === 'strength' || user.focus === 'glutes' ? 'bulking_clean' : 'maintenance');

  const { bmr } = calculateBMR({
    weightKg,
    heightM,
    age,
    gender,
    bodyFatPercent,
  });

  const tdee = calculateTDEE(bmr, activityLevel);

  // Aplica delta do objetivo
  const goalConfig = NUTRITION_GOALS.find((g) => g.id === goal) || NUTRITION_GOALS[2];
  const targetCalories = Math.max(1200, Math.round(tdee * (1 + goalConfig.deltaPct)));

  const macros = calculateMacros(weightKg, targetCalories, goal);
  const waterMl = Math.round(weightKg * 40); // 40ml por kg de peso

  return {
    tmb: bmr,
    tdee,
    targetCalories,
    goal,
    activityLevel,
    age,
    bodyFatPercent,
    proteinGrams: macros.proteinGrams,
    proteinPerKg: macros.proteinPerKg,
    carbsGrams: macros.carbsGrams,
    fatsGrams: macros.fatsGrams,
    fatsPerKg: macros.fatsPerKg,
    waterMl,
    calculatedAt: new Date().toISOString(),
  };
}
