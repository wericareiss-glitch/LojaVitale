/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MuscleGroup, WorkoutItem } from '../types/workout';

export interface MobilityExercise {
  id: string;
  name: string;
  targetJoint: string; // Ex: "Ombros & Cápsula Glenoumeral", "Quadril & Tornozelos"
  targetMuscles: string;
  durationSeconds: number; // Ex: 45
  repsOrTimeText: string; // Ex: "10 rotações cada lado" ou "45 segundos"
  cue: string;
  benefits: string;
  iconType: 'shoulder' | 'hip' | 'spine' | 'ankle' | 'wrist' | 'fullbody';
}

export interface JointWarmupRoutine {
  title: string;
  description: string;
  totalDurationMinutes: number; // 3 a 5
  totalExercises: number;
  exercises: MobilityExercise[];
  primaryJoints: string[];
}

const MOBILITY_CATALOG: Record<string, MobilityExercise> = {
  // --- OMBROS / CINTURA ESCAPULAR ---
  shoulder_cars: {
    id: 'shoulder_cars',
    name: 'Rotações Articulares Controladas de Ombro (CARs)',
    targetJoint: 'Articulação Glenoumeral & Escapulotorácica',
    targetMuscles: 'Deltoides, Manguito Rotador, Trapézio',
    durationSeconds: 45,
    repsOrTimeText: '5 rotações amplas para frente e 5 para trás por braço',
    cue: 'Mantenha o tronco estável sem girar as costelas. Faça o maior círculo possível com a ponta dos dedos, raspando a orelha.',
    benefits: 'Lubrifica a cápsula articular com líquido sinovial e desperta os estabilizadores do manguito.',
    iconType: 'shoulder'
  },
  scapular_wall_slides: {
    id: 'scapular_wall_slides',
    name: 'Deslizamento Escapular na Parede (Wall Slides)',
    targetJoint: 'Escápulas & Coluna Torácica',
    targetMuscles: 'Serrátil Anterior, Trapézio Inferior',
    durationSeconds: 45,
    repsOrTimeText: '10 repetições lentas com pausa no topo',
    cue: 'Costas e cotovelos encostados na parede. Deslize os braços em formato de "W" para "Y" sem arquear a lombar.',
    benefits: 'Previne impacto no ombro durante supino e desenvolvimento, restaurando o ritmo escapuloumeral.',
    iconType: 'shoulder'
  },
  doorway_chest_dynamic: {
    id: 'doorway_chest_dynamic',
    name: 'Abertura Torácica e Peitoral Dinâmica',
    targetJoint: 'Esternoclavicular & Ombro Anterior',
    targetMuscles: 'Peitoral Maior, Peitoral Menor, Bíceps Braquial',
    durationSeconds: 40,
    repsOrTimeText: '12 pulsações dinâmicas e suaves',
    cue: 'Cotovelos a 90 graus no batente ou parede. Projete o peito suavemente para frente respirando fundo, sem forçar.',
    benefits: 'Aumenta a flexibilidade ativa do peitoral para maior amplitude no supino e crucifixo.',
    iconType: 'shoulder'
  },

  // --- COLUNA / DORSAL / CORE ---
  cat_cow_thoracic: {
    id: 'cat_cow_thoracic',
    name: 'Gato-Camelo Torácico (Cat-Cow Dinâmico)',
    targetJoint: 'Coluna Torácica e Lombar',
    targetMuscles: 'Eretores da Espinha, Latíssimo, Abdômen',
    durationSeconds: 45,
    repsOrTimeText: '8 a 10 ciclos respiratórios fluidos',
    cue: 'Em quatro apoios, expire arredondando a coluna puxando o queixo ao peito. Inspire expandindo o peitoral para frente.',
    benefits: 'Descomprime os discos vertebrais e solta a rigidez nas costas antes de puxadas, remadas ou agachamentos.',
    iconType: 'spine'
  },
  thoracic_rotations: {
    id: 'thoracic_rotations',
    name: 'Rotação Torácica em 4 Apoios (Thread the Needle)',
    targetJoint: 'Coluna Torácica & Cintura Escapular',
    targetMuscles: 'Romboides, Grande Dorsal, Oblíquos',
    durationSeconds: 45,
    repsOrTimeText: '6 rotações lentas por lado',
    cue: 'Uma mão na nuca, aponte o cotovelo para o teto acompanhando com o olhar. Retorne passando por baixo do tronco.',
    benefits: 'Restaura a rotação da caixa torácica, eliminando sobrecarga compensatória na coluna lombar.',
    iconType: 'spine'
  },
  dead_hang_dynamic: {
    id: 'dead_hang_dynamic',
    name: 'Descompressão Escapular Ativa (Depressão & Elevação)',
    targetJoint: 'Glenoumeral & Cintura Escapular',
    targetMuscles: 'Dorsal, Antebraços, Manguito',
    durationSeconds: 40,
    repsOrTimeText: '8 a 10 ativações escapulares lentas',
    cue: 'Pendure-se em uma barra ou segure em apoio alto. Puxe os ombros para longe das orelhas (depressão) e solte devagar.',
    benefits: 'Espaçamento subacromial imediato e aquecimento da empunhadura.',
    iconType: 'spine'
  },

  // --- QUADRIL / MEMBROS INFERIORES ---
  hip_90_90_rotations: {
    id: 'hip_90_90_rotations',
    name: 'Transições de Quadril 90/90',
    targetJoint: 'Articulação Coxofemoral (Acetábulo)',
    targetMuscles: 'Glúteo Médio, Piriforme, Rotadores Profundos',
    durationSeconds: 45,
    repsOrTimeText: '8 trocas suaves de lado',
    cue: 'Sentado com pernas a 90 graus no chão, gire os joelhos de um lado para o outro mantendo o peito erguido.',
    benefits: 'Aquece a rotação interna e externa do fêmur, essencial para agachar fundo sem pinçamento no quadril.',
    iconType: 'hip'
  },
  world_greatest_stretch: {
    id: 'world_greatest_stretch',
    name: 'O Maior Alongamento do Mundo (Passada com Rotação)',
    targetJoint: 'Quadril, Tornozelo e Coluna Torácica',
    targetMuscles: 'Psoas, Isquiotibiais, Glúteos, Peitoral',
    durationSeconds: 60,
    repsOrTimeText: '5 repetições fluidas por lado',
    cue: 'Dê um passo longo à frente em afundo, apoie a mão oposta no chão e gire o braço do mesmo lado para o teto.',
    benefits: 'Ativa simultaneamente tornozelo, flexores do quadril e torácica em cadeia cinética fechada.',
    iconType: 'fullbody'
  },
  deep_squat_prying: {
    id: 'deep_squat_prying',
    name: 'Agachamento Profundo com Abertura de Joelhos (Squat Pry)',
    targetJoint: 'Quadris, Joelhos e Tornozelos',
    targetMuscles: 'Adutores, Glúteos, Tendão Patelar, Tibial',
    durationSeconds: 45,
    repsOrTimeText: '40 a 45 segundos explorando os limites no fundo',
    cue: 'Agache no ponto mais baixo confortável, coloque cotovelos dentro dos joelhos e empurre suavemente para fora respirando fundo.',
    benefits: 'Aumenta a profundidade natural do agachamento e prepara o tendão patelar para altas cargas.',
    iconType: 'hip'
  },
  ankle_dorsiflexion_dynamic: {
    id: 'ankle_dorsiflexion_dynamic',
    name: 'Mobilidade de Tornozelo em Dorsiflexão (Parede/Afundo)',
    targetJoint: 'Talocrural (Tornozelo)',
    targetMuscles: 'Gastrocnêmio, Sóleo, Tendão de Aquiles',
    durationSeconds: 45,
    repsOrTimeText: '10 pulsações de avanço de joelho por perna',
    cue: 'A 8cm da parede em posição de passada, projete o joelho à frente passando da ponta dos dedos sem levantar o calcanhar do chão.',
    benefits: 'Elimina o colapso dos joelhos (valgo dinâmico) e impede que o calcanhar saia do chão em agachamentos e leg press.',
    iconType: 'ankle'
  },
  leg_swings_dynamic: {
    id: 'leg_swings_dynamic',
    name: 'Balanço Pendular Dinâmico de Pernas (Frontal & Lateral)',
    targetJoint: 'Coxofemoral',
    targetMuscles: 'Isquiotibiais, Quadríceps, Adutores',
    durationSeconds: 40,
    repsOrTimeText: '10 balanços frontais e 10 laterais por perna',
    cue: 'Apoie uma mão firme na parede e balance a perna de forma controlada, aumentando a amplitude progressivamente.',
    benefits: 'Elongação balística segura das fibras musculares antes de exercícios de força.',
    iconType: 'hip'
  },

  // --- BRAÇOS E PUNHOS ---
  wrist_circles_flexion: {
    id: 'wrist_circles_flexion',
    name: 'Descompressão e Ondas de Punho',
    targetJoint: 'Radiocarpal e Ulna',
    targetMuscles: 'Flexores e Extensores dos Dedos',
    durationSeconds: 30,
    repsOrTimeText: '15 círculos em cada sentido com dedos entrelaçados',
    cue: 'Entrelace os dedos e trace o símbolo do infinito com os punhos sem aplicar força excessiva.',
    benefits: 'Previne dor e epicondilite em pegadas pesadas, barras e roscas.',
    iconType: 'wrist'
  }
};

/**
 * Gera automaticamente uma rotina de 3 a 5 minutos de mobilidade articular
 * personalizada com base nos exercícios programados para a sessão ativa.
 */
export function generateJointWarmupRoutine(
  workoutItems: WorkoutItem[],
  customTitle?: string
): JointWarmupRoutine {
  const muscleSet = new Set<MuscleGroup>();
  workoutItems.forEach((item) => {
    if (item.muscleKey) muscleSet.add(item.muscleKey);
  });

  const hasLower = 
    muscleSet.has('quadriceps') || 
    muscleSet.has('hamstrings') || 
    muscleSet.has('glutes') || 
    muscleSet.has('calves');

  const hasPush = 
    muscleSet.has('chest') || 
    muscleSet.has('shoulders') || 
    muscleSet.has('triceps');

  const hasPull = 
    muscleSet.has('back') || 
    muscleSet.has('biceps') || 
    muscleSet.has('rear_delts');

  const selectedExercises: MobilityExercise[] = [];
  const primaryJoints: string[] = [];

  // 1. Treino Exclusivo ou Dominante de Pernas (Legs / Lower)
  if (hasLower && !hasPush && !hasPull) {
    primaryJoints.push('Quadris', 'Tornozelos', 'Joelhos', 'Lombar');
    selectedExercises.push(
      MOBILITY_CATALOG.ankle_dorsiflexion_dynamic,
      MOBILITY_CATALOG.hip_90_90_rotations,
      MOBILITY_CATALOG.world_greatest_stretch,
      MOBILITY_CATALOG.deep_squat_prying,
      MOBILITY_CATALOG.cat_cow_thoracic
    );
  }
  // 2. Treino de Empurrar (Push / Peito / Ombros)
  else if (hasPush && !hasLower && !hasPull) {
    primaryJoints.push('Ombros (Glenoumeral)', 'Escápulas', 'Coluna Torácica', 'Punhos');
    selectedExercises.push(
      MOBILITY_CATALOG.shoulder_cars,
      MOBILITY_CATALOG.scapular_wall_slides,
      MOBILITY_CATALOG.doorway_chest_dynamic,
      MOBILITY_CATALOG.thoracic_rotations,
      MOBILITY_CATALOG.wrist_circles_flexion
    );
  }
  // 3. Treino de Puxar (Pull / Costas / Bíceps)
  else if (hasPull && !hasLower && !hasPush) {
    primaryJoints.push('Cintura Escapular', 'Coluna Torácica', 'Ombros', 'Punhos');
    selectedExercises.push(
      MOBILITY_CATALOG.cat_cow_thoracic,
      MOBILITY_CATALOG.thoracic_rotations,
      MOBILITY_CATALOG.dead_hang_dynamic,
      MOBILITY_CATALOG.shoulder_cars,
      MOBILITY_CATALOG.wrist_circles_flexion
    );
  }
  // 4. Treino Superior Completo (Upper)
  else if (hasPush && hasPull && !hasLower) {
    primaryJoints.push('Ombros', 'Escápulas', 'Torácica', 'Cotovelos & Punhos');
    selectedExercises.push(
      MOBILITY_CATALOG.shoulder_cars,
      MOBILITY_CATALOG.scapular_wall_slides,
      MOBILITY_CATALOG.cat_cow_thoracic,
      MOBILITY_CATALOG.thoracic_rotations,
      MOBILITY_CATALOG.doorway_chest_dynamic
    );
  }
  // 5. Treino de Corpo Inteiro (Full Body / Híbrido)
  else {
    primaryJoints.push('Cadeia Articular Global', 'Quadril', 'Ombros', 'Tornozelos');
    selectedExercises.push(
      MOBILITY_CATALOG.world_greatest_stretch,
      MOBILITY_CATALOG.hip_90_90_rotations,
      MOBILITY_CATALOG.shoulder_cars,
      MOBILITY_CATALOG.cat_cow_thoracic,
      MOBILITY_CATALOG.deep_squat_prying
    );
  }

  // Garantir entre 4 e 5 exercícios (3 a 4.5 minutos no total)
  const totalSeconds = selectedExercises.reduce((acc, ex) => acc + ex.durationSeconds, 0);
  const totalDurationMinutes = Math.round((totalSeconds / 60) * 10) / 10;

  return {
    title: customTitle || 'Aquecimento Articular Específico',
    description: `Rotina sinovial projetada para as articulações que receberão carga nesta sessão (${primaryJoints.join(', ')}).`,
    totalDurationMinutes,
    totalExercises: selectedExercises.length,
    exercises: selectedExercises,
    primaryJoints
  };
}
