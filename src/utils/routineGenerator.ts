/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MuscleGroup,
  SplitOption,
  StrategyOption,
  LevelOption,
  EquipmentRequirement,
  GeneratedWorkoutRoutine,
  WorkoutItem,
  UserProfile,
  FocusOption,
  Exercise,
} from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculateDefaultBudget, getPresetWeights } from './auth';

interface RoutineGeneratorParams {
  user: UserProfile;
  split?: SplitOption;
  strategy?: StrategyOption;
  manualWeeklySets?: number;
  level?: LevelOption;
  equip?: EquipmentRequirement;
  restSeconds?: number;
}

interface DayPlan {
  letter: string;
  name: string;
  subtitle: string;
  split: SplitOption;
  muscleGroups: MuscleGroup[];
}

// Ordem de prioridade anatômica baseada no FOCO do atleta
const FOCUS_PRIORITIES: Record<FocusOption, MuscleGroup[]> = {
  glutes: [
    'glutes',
    'hamstrings',
    'quadriceps',
    'calves',
    'abs',
    'back',
    'chest',
    'shoulders',
    'triceps',
    'biceps',
    'rear_delts',
  ],
  strength: [
    'quadriceps',
    'chest',
    'back',
    'hamstrings',
    'shoulders',
    'glutes',
    'triceps',
    'biceps',
    'calves',
    'abs',
    'rear_delts',
  ],
  v_taper: [
    'back',
    'shoulders',
    'chest',
    'biceps',
    'triceps',
    'rear_delts',
    'quadriceps',
    'hamstrings',
    'glutes',
    'calves',
    'abs',
  ],
  balanced: [
    'chest',
    'back',
    'quadriceps',
    'hamstrings',
    'shoulders',
    'glutes',
    'triceps',
    'biceps',
    'calves',
    'abs',
    'rear_delts',
  ],
};

export function generateWeeklyRoutines(params: RoutineGeneratorParams): GeneratedWorkoutRoutine[] {
  const { user } = params;
  const frequency = user.frequency || 4;
  const focus: FocusOption = user.focus || 'balanced';
  const level = params.level || user.level || 'intermediate';
  const equip = params.equip || 'full_gym';
  const restSeconds = params.restSeconds || 30;

  // 1. Determina a divisão muscular solicitada (Split)
  // Padrão biomecânico: 2x ou 4x = Upper/Lower; 3x ou 6x = PPL; 5x = ABCDE (sempre corpo inteiro equilibrado)
  const requestedSplit: SplitOption = params.split || user.preferredSplit || (
    focus === 'glutes' 
      ? 'lower' 
      : frequency === 3 || frequency === 6
      ? 'ppl' 
      : frequency === 5
      ? 'abcde'
      : 'upper_lower'
  );

  // 2. Orçamento semanal total de séries (Controle Manual prioritário ou padrão)
  const defaultWeeklyBudget = calculateDefaultBudget(level, user.gender || 'male');
  const totalWeeklyBudget = params.manualWeeklySets && params.manualWeeklySets > 0
    ? params.manualWeeklySets
    : (user.weeklyBudget && user.weeklyBudget > 0 ? user.weeklyBudget : defaultWeeklyBudget);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  let dayPlans: DayPlan[] = [];

  // =========================================================================
  // MONTAGEM DOS PLANOS DIÁRIOS
  // =========================================================================
  if (requestedSplit === 'fullbody') {
    const fullBodyBaseMuscles: MuscleGroup[] = [
      'quadriceps',
      'hamstrings',
      'glutes',
      'chest',
      'back',
      'shoulders',
      'rear_delts',
      'triceps',
      'biceps',
      'calves',
      'abs',
    ];
    const daysCount = Math.min(Math.max(2, frequency), 6);
    dayPlans = Array.from({ length: daysCount }).map((_, idx) => ({
      letter: letters[idx],
      name: `Treino ${letters[idx]}`,
      subtitle: 'Full Body · Corpo Inteiro',
      split: 'fullbody',
      muscleGroups: [...fullBodyBaseMuscles],
    }));
  } else if (requestedSplit === 'abcde') {
    if (frequency <= 4) {
      dayPlans = [
        { letter: 'A', name: 'Treino A', subtitle: 'Peitoral, Tríceps & Abdômen', split: 'abcde', muscleGroups: ['chest', 'triceps', 'abs'] },
        { letter: 'B', name: 'Treino B', subtitle: 'Costas, Posterior & Bíceps', split: 'abcde', muscleGroups: ['back', 'rear_delts', 'biceps'] },
        { letter: 'C', name: 'Treino C', subtitle: 'Pernas Completas & Panturrilhas', split: 'abcde', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
        { letter: 'D', name: 'Treino D', subtitle: 'Ombros, Deltoides & Braços', split: 'abcde', muscleGroups: ['shoulders', 'rear_delts', 'biceps', 'triceps', 'abs'] },
      ];
    } else {
      dayPlans = [
        { letter: 'A', name: 'Treino A', subtitle: 'Peitoral & Abdômen', split: 'abcde', muscleGroups: ['chest', 'abs'] },
        { letter: 'B', name: 'Treino B', subtitle: 'Costas & Deltoide Posterior', split: 'abcde', muscleGroups: ['back', 'rear_delts'] },
        { letter: 'C', name: 'Treino C', subtitle: 'Pernas & Panturrilhas', split: 'abcde', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
        { letter: 'D', name: 'Treino D', subtitle: 'Ombros & Trapézio', split: 'abcde', muscleGroups: ['shoulders', 'rear_delts', 'abs'] },
        { letter: 'E', name: 'Treino E', subtitle: 'Braços (Bíceps & Tríceps)', split: 'abcde', muscleGroups: ['biceps', 'triceps'] },
      ];
    }
  } else if (requestedSplit === 'lower') {
    const daysCount = Math.min(Math.max(2, frequency), 6);
    dayPlans = Array.from({ length: daysCount }).map((_, idx) => ({
      letter: letters[idx],
      name: `Treino ${letters[idx]}`,
      subtitle: idx % 2 === 0 ? 'Lower · Foco Quadríceps & Panturrilhas' : 'Lower · Foco Glúteos, Posterior & Core',
      split: 'lower',
      muscleGroups: idx % 2 === 0 ? ['quadriceps', 'glutes', 'calves'] : ['hamstrings', 'glutes', 'calves', 'abs'],
    }));
  } else if (requestedSplit === 'upper') {
    const daysCount = Math.min(Math.max(2, frequency), 6);
    dayPlans = Array.from({ length: daysCount }).map((_, idx) => ({
      letter: letters[idx],
      name: `Treino ${letters[idx]}`,
      subtitle: idx % 2 === 0 ? 'Upper · Peitoral, Ombros & Tríceps' : 'Upper · Costas, Posterior & Bíceps',
      split: 'upper',
      muscleGroups: idx % 2 === 0 ? ['chest', 'shoulders', 'triceps'] : ['back', 'rear_delts', 'biceps'],
    }));
  } else if (requestedSplit === 'ppl' || requestedSplit === 'push' || requestedSplit === 'pull' || requestedSplit === 'legs') {
    if (frequency === 3) {
      dayPlans = [
        { letter: 'A', name: 'Treino A', subtitle: 'Push · Peitoral, Ombros & Tríceps', split: 'push', muscleGroups: ['chest', 'shoulders', 'triceps'] },
        { letter: 'B', name: 'Treino B', subtitle: 'Pull · Costas, Posterior & Bíceps', split: 'pull', muscleGroups: ['back', 'rear_delts', 'biceps'] },
        { letter: 'C', name: 'Treino C', subtitle: 'Legs · Pernas Completas & Abdômen', split: 'legs', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'] },
      ];
    } else if (frequency === 4) {
      dayPlans = [
        { letter: 'A', name: 'Treino A', subtitle: 'Push · Peitoral, Ombros & Tríceps', split: 'push', muscleGroups: ['chest', 'shoulders', 'triceps'] },
        { letter: 'B', name: 'Treino B', subtitle: 'Pull · Costas, Posterior & Bíceps', split: 'pull', muscleGroups: ['back', 'rear_delts', 'biceps'] },
        { letter: 'C', name: 'Treino C', subtitle: 'Legs · Pernas Completas & Panturrilhas', split: 'legs', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
        { letter: 'D', name: 'Treino D', subtitle: 'Upper · Superiores & Core', split: 'upper', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs'] },
      ];
    } else {
      const daysCount = Math.min(frequency, 6);
      dayPlans = Array.from({ length: daysCount }).map((_, idx) => {
        const mod = idx % 3;
        if (mod === 0) return { letter: letters[idx], name: `Treino ${letters[idx]}`, subtitle: 'Push · Empurrar', split: 'push', muscleGroups: ['chest', 'shoulders', 'triceps'] };
        if (mod === 1) return { letter: letters[idx], name: `Treino ${letters[idx]}`, subtitle: 'Pull · Puxar', split: 'pull', muscleGroups: ['back', 'rear_delts', 'biceps'] };
        return { letter: letters[idx], name: `Treino ${letters[idx]}`, subtitle: 'Legs · Pernas & Core', split: 'legs', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'] };
      });
    }
  } else {
    // Upper / Lower (Padrão)
    if (frequency === 2) {
      dayPlans = [
        { letter: 'A', name: 'Treino A', subtitle: 'Upper · Superiores', split: 'upper', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
        { letter: 'B', name: 'Treino B', subtitle: 'Lower · Inferiores & Core', split: 'lower', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'] },
      ];
    } else if (frequency === 3) {
      dayPlans = [
        { letter: 'A', name: 'Treino A', subtitle: 'Upper · Peitoral, Costas & Ombros', split: 'upper', muscleGroups: ['chest', 'back', 'shoulders', 'triceps'] },
        { letter: 'B', name: 'Treino B', subtitle: 'Lower · Pernas Completas & Abdômen', split: 'lower', muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'] },
        { letter: 'C', name: 'Treino C', subtitle: 'Upper · Costas, Ombros, Peito & Bíceps', split: 'upper', muscleGroups: ['back', 'chest', 'shoulders', 'rear_delts', 'biceps'] },
      ];
    } else {
      dayPlans = [
        { letter: 'A', name: 'Treino A', subtitle: 'Upper · Peitoral, Costas, Ombros & Tríceps', split: 'upper', muscleGroups: ['chest', 'back', 'shoulders', 'triceps'] },
        { letter: 'B', name: 'Treino B', subtitle: 'Lower · Quadríceps, Glúteos & Panturrilhas', split: 'lower', muscleGroups: ['quadriceps', 'glutes', 'calves', 'abs'] },
        { letter: 'C', name: 'Treino C', subtitle: 'Upper · Costas, Ombros, Bíceps & Peito', split: 'upper', muscleGroups: ['back', 'shoulders', 'rear_delts', 'biceps', 'chest'] },
        { letter: 'D', name: 'Treino D', subtitle: 'Lower · Isquiotibiais, Glúteos & Panturrilhas', split: 'lower', muscleGroups: ['hamstrings', 'glutes', 'quadriceps', 'calves'] },
      ];
    }
  }

  // =========================================================================
  // ALOCAÇÃO ADAPTATIVA E RIGOROSA DE SÉRIES (RESPEITA 100% O LIMITE SEMANAL)
  // Se o orçamento for menor que a quantidade de exercícios, prioriza pelo FOCO!
  // =========================================================================
  const allTrainedMuscles = Array.from(new Set(dayPlans.flatMap((p) => p.muscleGroups)));
  const priorityList = FOCUS_PRIORITIES[focus] || FOCUS_PRIORITIES.balanced;
  // Ordena os músculos participantes de acordo com a prioridade do FOCO do usuário
  const sortedMuscles = allTrainedMuscles.sort(
    (a, b) => priorityList.indexOf(a) - priorityList.indexOf(b)
  );

  const muscleBudgets: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  sortedMuscles.forEach((m) => {
    muscleBudgets[m] = 0;
  });

  // Se o totalWeeklyBudget for menor que o número de músculos, distribui 1 a 1 para os de maior prioridade
  if (totalWeeklyBudget <= sortedMuscles.length) {
    for (let i = 0; i < totalWeeklyBudget; i++) {
      const targetM = sortedMuscles[i % sortedMuscles.length];
      muscleBudgets[targetM] = (muscleBudgets[targetM] || 0) + 1;
    }
  } else {
    // Alocação proporcional com peso ponderado do foco
    const baseWeights = getPresetWeights(focus);
    const sumWeights = sortedMuscles.reduce((acc, m) => acc + (baseWeights[m] || 8), 0);

    let allocated = 0;
    sortedMuscles.forEach((m) => {
      const raw = Math.round(((baseWeights[m] || 8) / (sumWeights || 1)) * totalWeeklyBudget);
      muscleBudgets[m] = raw;
      allocated += raw;
    });

    // Ajusta resíduo exatamente pelo topo da prioridade do FOCO
    let diff = totalWeeklyBudget - allocated;
    let pIdx = 0;
    while (diff !== 0) {
      const targetM = sortedMuscles[pIdx % sortedMuscles.length];
      if (diff > 0) {
        muscleBudgets[targetM] += 1;
        diff -= 1;
      } else if (diff < 0 && muscleBudgets[targetM] > 0) {
        // Remove do final da lista de prioridade (músculos com menor foco)
        const lowPrioMuscle = sortedMuscles[sortedMuscles.length - 1 - (pIdx % sortedMuscles.length)];
        if (muscleBudgets[lowPrioMuscle] > 0) {
          muscleBudgets[lowPrioMuscle] -= 1;
          diff += 1;
        }
      } else {
        break;
      }
      pIdx++;
    }
  }

  // =========================================================================
  // MONTAGEM DOS ITENS DE EXERCÍCIO (SEMPRE 1 EXERCÍCIO POR MÚSCULO)
  // As séries de cada músculo são divididas exatamente entre as sessões
  // =========================================================================
  // Mantém controle de séries já alocadas por músculo para garantir soma exata
  const allocatedSoFar: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  sortedMuscles.forEach((m) => {
    allocatedSoFar[m] = 0;
  });

  const routines: GeneratedWorkoutRoutine[] = dayPlans.map((plan, planIdx) => {
    const items: WorkoutItem[] = [];

    plan.muscleGroups.forEach((mKey) => {
      const totalMuscleBudget = muscleBudgets[mKey] || 0;
      if (totalMuscleBudget <= 0) return; // Músculo não recebeu cota neste orçamento reduzido

      // Calcula quantas sessões desse músculo ainda restam daqui para frente de forma correta
      const futureOccurrences = dayPlans.slice(planIdx).filter((p) => p.muscleGroups.includes(mKey)).length;
      const sessionsRemaining = Math.max(1, futureOccurrences);
      const budgetRemaining = totalMuscleBudget - (allocatedSoFar[mKey] || 0);

      if (budgetRemaining <= 0) return;

      const dailyMuscleSets = Math.max(1, Math.round(budgetRemaining / sessionsRemaining));
      const actualSets = Math.min(budgetRemaining, dailyMuscleSets);

      if (actualSets <= 0) return;

      allocatedSoFar[mKey] = (allocatedSoFar[mKey] || 0) + actualSets;

      const muscleList = EXERCISE_DATABASE[mKey] || [];
      let pool = muscleList.filter((e) => {
        if (equip === 'full_gym') return true;
        if (equip === 'cables_free') return e.equip.includes('cables_free') || e.equip.includes('dumbbells_only');
        return e.equip.includes('dumbbells_only');
      });
      if (pool.length === 0) pool = muscleList;
      if (pool.length === 0) return;

      // Seleção Inteligente Baseada na Curva de Resistência (Alongamento vs. Encurtamento)
      // Alterna o perfil entre os treinos da semana para o grupamento:
      // Dias ímpares priorizam Alongamento (hipertrofia mediada por estiramento)
      // Dias pares priorizam Encurtamento / Tensão Contínua (pico concêntrico e oclusão)
      const prefersLengthened = planIdx % 2 === 0;
      let chosen: Exercise | null = null;
      if (prefersLengthened) {
        chosen = pool.find((e) => e.profile.toLowerCase().includes('alongamento')) || null;
      } else {
        chosen = pool.find((e) => 
          e.profile.toLowerCase().includes('encurtamento') || 
          e.profile.toLowerCase().includes('contínua')
        ) || null;
      }
      if (!chosen) {
        const exIndex = planIdx % pool.length;
        chosen = pool[exIndex] || pool[0];
      }

      const repRange = '8 a 10';
      const rir = level === 'beginner' ? 'RIR 2' : level === 'intermediate' ? 'RIR 1-2' : 'RIR 0-1';

      // Descanso inteligente por categoria do exercício:
      // Multiarticulares/Compostos pesados exigem 90s; Isoladores e acessórios 60s (ou padrão configurado)
      const isCompound = (chosen.category && chosen.category.toLowerCase().includes('compost')) ||
        ['Agachamento', 'Leg Press', 'Levantamento', 'Supino', 'Remada', 'Puxada', 'Desenvolvimento', 'Stiff', 'RDL', 'Barra'].some((kw) =>
          chosen.name.includes(kw)
        );
      const calculatedRest = restSeconds && restSeconds !== 30
        ? restSeconds
        : (isCompound ? 90 : 60);

      items.push({
        id: `${plan.letter.toLowerCase()}_${mKey}_${chosen.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        muscleKey: mKey,
        exercise: chosen,
        sets: actualSets,
        reps: repRange,
        rir: rir,
        rest: calculatedRest,
        tagRole: isCompound ? 'Composto / Base' : 'Isolador',
      });
    });

    // Ordenação Biomecânica da Fadiga: Compostos Pesados > Isolados > Core/Panturrilha
    const sortedItems = sortWorkoutItemsByFatigueHierarchy(items);
    const totalSets = sortedItems.reduce((acc, curr) => acc + curr.sets, 0);
    const estimatedMinutes = Math.round((totalSets * (45 + restSeconds)) / 60);

    return {
      id: `routine_${plan.letter.toLowerCase()}_${Date.now()}_${planIdx}_${Math.random().toString(36).slice(2, 7)}`,
      letter: plan.letter,
      name: plan.name,
      subtitle: plan.subtitle,
      split: plan.split,
      muscleGroups: plan.muscleGroups,
      items: sortedItems,
      totalSets,
      estimatedMinutes: Math.max(20, estimatedMinutes),
      createdAt: new Date(Date.now() + planIdx).toISOString(),
    };
  });

  return routines;
}

/**
 * Ordenação Biomecânica da Fadiga:
 * Classifica os exercícios por demanda neural e fadiga sistêmica decrescente:
 * 1. Compostos axiais pesados (Agachamentos, Stiff, Leg Press, Hip Thrust)
 * 2. Compostos de tronco (Supinos, Remadas pesadas, Desenvolvimento)
 * 3. Compostos em máquinas/polias guiadas (Puxadas, Supino máquina)
 * 4. Isoladores articulares maiores (Extensora, Flexora, Elevação Lateral, Crucifixo)
 * 5. Isoladores de braços (Bíceps e Tríceps)
 * 6. Estabilizadores e Core ao final (Panturrilhas, Abdômen/Core) para não fadigar a postura espinhal antes dos levantamentos pesados
 */
export function getExerciseFatigueRank(item: WorkoutItem): number {
  const ex = item.exercise;
  const name = ex.name.toLowerCase();
  const cat = (ex.category || '').toLowerCase();
  const mKey = item.muscleKey;

  // Rank 1: Carga axial pesada de membros inferiores / quadril
  if (
    name.includes('hack') ||
    name.includes('leg press') ||
    name.includes('agachamento') ||
    name.includes('rdl') ||
    name.includes('stiff') ||
    name.includes('terra') ||
    name.includes('thrust')
  ) {
    return 1;
  }

  // Rank 2: Compostos pesados de tronco livres/banco
  if (
    (mKey === 'chest' && (name.includes('supino') || name.includes('press') || name.includes('paralelas'))) ||
    (mKey === 'back' && (name.includes('remada') || name.includes('row') || name.includes('apoiada'))) ||
    (mKey === 'shoulders' && (name.includes('desenvolvimento') || name.includes('press')))
  ) {
    return 2;
  }

  // Rank 3: Guiados / Puxadas / Cabos multiarticulares
  if (
    name.includes('puxada') ||
    name.includes('pulldown') ||
    name.includes('máquina') ||
    cat.includes('máquina')
  ) {
    return 3;
  }

  // Rank 4: Isoladores principais de tronco e pernas
  if (
    name.includes('extensora') ||
    name.includes('flexora') ||
    name.includes('abdutora') ||
    name.includes('crossover') ||
    name.includes('crucifixo') ||
    name.includes('elevação lateral') ||
    name.includes('face pull')
  ) {
    return 4;
  }

  // Rank 5: Braços (Bíceps e Tríceps)
  if (mKey === 'biceps' || mKey === 'triceps' || name.includes('rosca') || name.includes('tríceps')) {
    return 5;
  }

  // Rank 6: Panturrilhas e Core/Abdômen (sempre no final)
  if (mKey === 'calves' || mKey === 'abs' || name.includes('panturrilha') || name.includes('gêmeos') || name.includes('crunch') || name.includes('core')) {
    return 6;
  }

  return 3;
}

export function sortWorkoutItemsByFatigueHierarchy(items: WorkoutItem[]): WorkoutItem[] {
  return [...items].sort((a, b) => {
    return getExerciseFatigueRank(a) - getExerciseFatigueRank(b);
  });
}

/**
 * GERAÇÃO DE TREINO RÁPIDO (Treino aleatório / surpresa Full Body & Dobradiça)
 * 5 exercícios fundamentais:
 * 1. Padrão Joelho dominante (Agachamento/Leg)
 * 2. Padrão Dobradiça de Quadril (Hinge / RDL / Stiff)
 * 3. Padrão Empurrar (Peito / Supino)
 * 4. Padrão Puxar (Remada / Puxada)
 * 5. Padrão Acessório / Deltoide Lateral ou Core
 */
export function generateQuickWorkoutRoutine(
  optionsOrUser: UserProfile | { user: UserProfile; equip?: EquipmentRequirement; restSeconds?: number },
  fallbackEquip: EquipmentRequirement = 'full_gym'
): GeneratedWorkoutRoutine {
  const user = 'user' in optionsOrUser ? optionsOrUser.user : optionsOrUser;
  const equip = 'equip' in optionsOrUser && optionsOrUser.equip ? optionsOrUser.equip : fallbackEquip;
  const restSeconds = 'restSeconds' in optionsOrUser && optionsOrUser.restSeconds ? optionsOrUser.restSeconds : 60;
  const getFilteredExercise = (mKey: MuscleGroup, preferredProfile?: string) => {
    const list = EXERCISE_DATABASE[mKey] || [];
    let pool = list.filter((e) => {
      if (equip === 'full_gym') return true;
      if (equip === 'cables_free') return e.equip.includes('cables_free') || e.equip.includes('dumbbells_only');
      return e.equip.includes('dumbbells_only');
    });
    if (pool.length === 0) pool = list;
    if (preferredProfile) {
      const match = pool.find((e) => e.profile.toLowerCase().includes(preferredProfile.toLowerCase()));
      if (match) return match;
    }
    // Random selection for variety
    return pool[Math.floor(Math.random() * pool.length)] || pool[0];
  };

  const items: WorkoutItem[] = [
    // 1. Joelho Dominante
    {
      id: `quick_knee_${Date.now()}`,
      muscleKey: 'quadriceps',
      exercise: getFilteredExercise('quadriceps', 'Alongamento'),
      sets: 3,
      reps: '8 a 10',
      rir: 'RIR 1-2',
      rest: 60,
      tagRole: 'Joelho Dominante',
    },
    // 2. Dobradiça de Quadril (Hinge)
    {
      id: `quick_hinge_${Date.now()}`,
      muscleKey: 'hamstrings',
      exercise: getFilteredExercise('hamstrings', 'Alongamento'),
      sets: 3,
      reps: '8 a 10',
      rir: 'RIR 1-2',
      rest: 60,
      tagRole: 'Dobradiça de Quadril (Hinge)',
    },
    // 3. Empurrar (Peitoral)
    {
      id: `quick_push_${Date.now()}`,
      muscleKey: 'chest',
      exercise: getFilteredExercise('chest'),
      sets: 3,
      reps: '8 a 10',
      rir: 'RIR 1-2',
      rest: 60,
      tagRole: 'Empurrar',
    },
    // 4. Puxar (Dorsal)
    {
      id: `quick_pull_${Date.now()}`,
      muscleKey: 'back',
      exercise: getFilteredExercise('back'),
      sets: 3,
      reps: '8 a 10',
      rir: 'RIR 1-2',
      rest: 60,
      tagRole: 'Puxar',
    },
    // 5. Deltoide Lateral ou Glúteo (baseado no foco)
    {
      id: `quick_iso_${Date.now()}`,
      muscleKey: user.focus === 'glutes' ? 'glutes' : 'shoulders',
      exercise: getFilteredExercise(user.focus === 'glutes' ? 'glutes' : 'shoulders'),
      sets: 3,
      reps: '10 a 12',
      rir: 'RIR 1',
      rest: 45,
      tagRole: 'Acessório / Detalhe',
    },
  ];

  const totalSets = items.reduce((acc, curr) => acc + curr.sets, 0);

  const nowTs = Date.now();
  const randSuffix = Math.random().toString(36).slice(2, 7);

  return {
    id: `quick_routine_${nowTs}_${randSuffix}`,
    letter: '⚡',
    name: 'Treino Rápido Full Body',
    subtitle: 'Padrão Dobradiça, Joelho, Empurrar & Puxar (Alta Eficiência)',
    split: 'fullbody',
    muscleGroups: ['quadriceps', 'hamstrings', 'chest', 'back', user.focus === 'glutes' ? 'glutes' : 'shoulders'],
    items,
    totalSets,
    estimatedMinutes: 35,
    isCustom: true,
    createdAt: new Date(nowTs).toISOString(),
  };
}
