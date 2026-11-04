/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exercise, WorkoutLogs, WorkoutSessionSummary, ProgressionSuggestion } from '../types/workout';

/**
 * Retorna o descanso biomecânico ideal baseado na exigência sistêmica e articular do exercício.
 * Multiarticulares pesados exigem maior tempo de recuperação para ressintese de fosfocreatina (ATP-CP).
 */
export function getSmartExerciseRest(exercise: Exercise): { restSeconds: number; label: string; isCompound: boolean } {
  const exId = exercise.id.toLowerCase();
  const muscle = exercise.muscleKey;

  // Multiarticulares pesados de membros inferiores (Agachamento Hack, Leg Press, RDL, Stiff, Smith Squat)
  if (
    exId.includes('hack') ||
    exId.includes('legpress') ||
    exId.includes('rdl') ||
    exId.includes('stiff') ||
    exId.includes('squat') ||
    exId.includes('thrust')
  ) {
    return {
      restSeconds: 150,
      label: 'Composto Pesado (Pernas / Quadril)',
      isCompound: true,
    };
  }

  // Multiarticulares de membros superiores (Supinos, Remadas com barra/livre, Desenvolvimento)
  if (
    (muscle === 'chest' && (exId.includes('smith') || exId.includes('flat') || exId.includes('convergent') || exId.includes('incline'))) ||
    (muscle === 'back' && (exId.includes('row') || exId.includes('pulldown') || exId.includes('barbell'))) ||
    (muscle === 'shoulders' && (exId.includes('press') || exId.includes('military')))
  ) {
    return {
      restSeconds: 120,
      label: 'Multiarticular Superior',
      isCompound: true,
    };
  }

  // Exercícios em cabos / polias e estabilidade média (Puxadas, Remadas apoiadas, Peck Deck)
  if (
    exId.includes('pulldown') ||
    exId.includes('cable') ||
    exId.includes('deck') ||
    exId.includes('convergent')
  ) {
    return {
      restSeconds: 90,
      label: 'Cabo / Máquina Estabilizada',
      isCompound: false,
    };
  }

  // Isoladores e músculos menores (Bíceps, Tríceps, Deltoide Lateral, Panturrilhas, Abdômen)
  return {
    restSeconds: 60,
    label: 'Isolador / Menor Fadiga Sistêmica',
    isCompound: false,
  };
}

/**
 * Analisa os registros históricos e sessões anteriores do exercício para sugerir a progressão ideal de RPE, carga, repetições e descanso.
 */
export function getOptimalProgressionSuggestion(
  exercise: Exercise,
  targetRepsRange: string,
  historyLogs: WorkoutLogs,
  currentLogs: WorkoutLogs,
  sessions: WorkoutSessionSummary[]
): ProgressionSuggestion {
  const smartRest = getSmartExerciseRest(exercise).restSeconds;
  const isLowerBody = ['quadriceps', 'hamstrings', 'glutes'].includes(exercise.muscleKey);
  const isCompound = getSmartExerciseRest(exercise).isCompound;

  // Parse rep ceiling from target range (ex: "8 a 10" -> 10, "10 a 12" -> 12)
  const repCeiling = parseInt(targetRepsRange.split('a')[1] || targetRepsRange || '10', 10);
  const repFloor = parseInt(targetRepsRange.split('a')[0] || targetRepsRange || '8', 10);

  // 1. Verificar registros em sessões anteriores
  const prevSets: { weight: number; reps: number; rpe?: string }[] = [];

  // Buscar primeiro na última sessão concluída que teve este exercício
  for (const session of sessions) {
    const foundEx = session.completedExercises.find((e) => e.name === exercise.name);
    if (foundEx && foundEx.sets.length > 0) {
      prevSets.push(...foundEx.sets);
      break;
    }
  }

  // Se não achou em sessões salvas, buscar no histórico de logs
  if (prevSets.length === 0) {
    for (let s = 1; s <= 6; s++) {
      const hist = historyLogs[`${exercise.id}_${s}`];
      if (hist && hist.weight) {
        prevSets.push({
          weight: parseFloat(hist.weight) || 0,
          reps: parseInt(hist.reps, 10) || 0,
          rpe: hist.rpe,
        });
      }
    }
  }

  // Se ainda não há histórico para este exercício: Calibração de Linha de Base
  if (prevSets.length === 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      currentWeight: 0,
      suggestedWeight: isCompound ? (isLowerBody ? 40 : 20) : 10,
      suggestedReps: targetRepsRange,
      suggestedRpe: '7.5',
      suggestedRir: '2-3',
      suggestedRestSeconds: smartRest,
      status: 'baseline',
      reason: 'Primeiro registro deste exercício. Recomendamos iniciar com RPE 7-7.5 (2 a 3 repetições em reserva) para calibrar a técnica.',
      actionText: 'Calibrar carga inicial',
    };
  }

  // Analisar os pesos e repetições da sessão anterior
  const maxWeight = Math.max(...prevSets.map((s) => s.weight));
  const avgReps = prevSets.reduce((acc, s) => acc + s.reps, 0) / prevSets.length;
  const lastSet = prevSets[prevSets.length - 1];

  // Identificar RPE médio ou máximo registrado
  const rpeValues = prevSets
    .map((s) => (s.rpe ? parseFloat(s.rpe) : null))
    .filter((v): v is number => v !== null && !isNaN(v));
  const avgRpe = rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : 8.5;
  const maxRpe = rpeValues.length > 0 ? Math.max(...rpeValues) : 9;

  // Incremento recomendado de carga baseado em grupamento e tipo de exercício
  // Exercícios de pernas/compostos sobem 2.5kg a 5kg. Membros superiores sobem 1kg a 2.5kg.
  const loadIncrement = isLowerBody && isCompound ? 5 : isCompound ? 2.5 : 1;

  const maxReps = Math.max(...prevSets.map((s) => s.reps));

  // REGRA 1: Séries atingiram o teto de repetições com RPE controlado (RPE <= 8.5, RIR >= 1-2)
  // SOBRECARGA PROGRESSIVA CONFIRMADA!
  if ((avgReps >= repCeiling || maxReps >= repCeiling) && maxRpe <= 8.5) {
    const newWeight = maxWeight + loadIncrement;
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      currentWeight: maxWeight,
      suggestedWeight: newWeight,
      suggestedReps: `${repFloor} a ${repFloor + 2}`,
      suggestedRpe: '8',
      suggestedRir: '2',
      suggestedRestSeconds: smartRest,
      status: 'progress',
      reason: `Meta batida com folga! Na sessão anterior você fez ${maxReps} reps com RPE ${avgRpe.toFixed(1)} (RIR ~2). Sua força aumentou!`,
      actionText: `Subir para ${newWeight}kg (+${loadIncrement}kg)`,
    };
  }

  // REGRA 2: Bateu as repetições, mas o RPE foi muito alto (RPE 9.5 ou 10 / RIR 0 - Falha Máxima)
  // MANTER A CARGA PARA CONSOLIDAR A TÉCNICA E ADAPTAÇÃO ARTICULAR
  if (avgReps >= repCeiling && maxRpe >= 9.5) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      currentWeight: maxWeight,
      suggestedWeight: maxWeight,
      suggestedReps: targetRepsRange,
      suggestedRpe: '8.5',
      suggestedRir: '1-2',
      suggestedRestSeconds: smartRest + 30, // dar mais 30s de descanso
      status: 'maintain',
      reason: `Você atingiu o teto de reps, mas chegou na falha extrema (RPE ${maxRpe}). Mantenha ${maxWeight}kg hoje e busque reduzir o esforço percebido antes de subir a carga.`,
      actionText: `Consolidar ${maxWeight}kg`,
    };
  }

  // REGRA 3: Repetições abaixo do teto, mas acima do mínimo (ex: fez 8 ou 9 reps de 10)
  // MANTER CARGA E BUSCAR +1 OU +2 REPETIÇÕES
  if (avgReps >= repFloor) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      currentWeight: maxWeight,
      suggestedWeight: maxWeight,
      suggestedReps: `${Math.min(repCeiling, Math.round(avgReps + 1))} reps`,
      suggestedRpe: '8.5',
      suggestedRir: '1-2',
      suggestedRestSeconds: smartRest,
      status: 'maintain',
      reason: `Na sessão anterior você fez ${avgReps.toFixed(0)} reps com ${maxWeight}kg. Hoje busque ${Math.min(repCeiling, Math.round(avgReps + 1))} reps com a mesma carga antes de subir peso.`,
      actionText: `Manter ${maxWeight}kg (Buscar +1 rep)`,
    };
  }

  // REGRA 4: Repetições caíram abaixo da faixa mínima (ex: menos de 6 reps ou fadiga alta)
  // AJUSTE DE VOLUME OU DELOAD LEVE
  const adjustedWeight = Math.max(1, maxWeight - (isCompound ? 2.5 : 1));
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    currentWeight: maxWeight,
    suggestedWeight: maxWeight,
    suggestedReps: targetRepsRange,
    suggestedRpe: '7.5-8',
    suggestedRir: '2',
    suggestedRestSeconds: smartRest + 30,
    status: 'maintain',
    reason: `Repetições ficaram em ${avgReps.toFixed(0)} (abaixo da meta). Descanse bem entre séries (${smartRest + 30}s) e mantenha a execução limpa. Se necessário reduza para ${adjustedWeight}kg.`,
    actionText: `Manter ${maxWeight}kg com foco na forma`,
  };
}
