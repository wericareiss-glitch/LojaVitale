/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mapa de IDs de exercício para objetos JSON de animação compatíveis com `lottie-react` (Lottie v5.7.4).
 * Cada animação possui 150 frames a 30fps (5.0 segundos de ciclo biomecânico:
 * 0..78 frames = Fase Excêntrica 2.6s | 78..96 = Transição/Pausa 0.6s | 96..138 = Fase Concêntrica 1.4s | 138..150 = Pico 0.4s).
 */

export type LottieBiomechPattern =
  | 'squat_press'
  | 'knee_extension'
  | 'leg_curl'
  | 'hip_hinge'
  | 'hip_thrust'
  | 'calf_raise'
  | 'chest_press'
  | 'chest_fly'
  | 'vertical_pull'
  | 'horizontal_row'
  | 'shoulder_press'
  | 'lateral_raise'
  | 'triceps_extension'
  | 'biceps_curl'
  | 'core_crunch';

interface Keyframe3D {
  t: number;
  s: number[];
  h?: number;
  i?: { x: number | number[]; y: number | number[] };
  o?: { x: number | number[]; y: number | number[] };
  to?: number[];
  ti?: number[];
}

function easePosKeyframes(
  pStart: [number, number],
  pEccentric: [number, number],
  pPeak: [number, number] = pStart
): Keyframe3D[] {
  return [
    {
      t: 0,
      s: [pStart[0], pStart[1], 0],
      to: [0, 0, 0],
      ti: [0, 0, 0],
      i: { x: 0.42, y: 1 },
      o: { x: 0.58, y: 0 },
    },
    {
      t: 78,
      s: [pEccentric[0], pEccentric[1], 0],
      to: [0, 0, 0],
      ti: [0, 0, 0],
      i: { x: 0.42, y: 1 },
      o: { x: 0.58, y: 0 },
    },
    {
      t: 96,
      s: [pEccentric[0], pEccentric[1], 0],
      to: [0, 0, 0],
      ti: [0, 0, 0],
      i: { x: 0.25, y: 1 },
      o: { x: 0.4, y: 0 },
    },
    {
      t: 138,
      s: [pPeak[0], pPeak[1], 0],
      to: [0, 0, 0],
      ti: [0, 0, 0],
      i: { x: 0.42, y: 1 },
      o: { x: 0.58, y: 0 },
    },
    {
      t: 150,
      s: [pStart[0], pStart[1], 0],
    },
  ];
}

function easeRotKeyframes(degStart: number, degEccentric: number, degPeak: number = degStart): Keyframe3D[] {
  return [
    {
      t: 0,
      s: [degStart],
      i: { x: [0.42], y: [1] },
      o: { x: [0.58], y: [0] },
    },
    {
      t: 78,
      s: [degEccentric],
      i: { x: [0.42], y: [1] },
      o: { x: [0.58], y: [0] },
    },
    {
      t: 96,
      s: [degEccentric],
      i: { x: [0.25], y: [1] },
      o: { x: [0.4], y: [0] },
    },
    {
      t: 138,
      s: [degPeak],
      i: { x: [0.42], y: [1] },
      o: { x: [0.58], y: [0] },
    },
    {
      t: 150,
      s: [degStart],
    },
  ];
}

function easeScalePulseKeyframes(): Keyframe3D[] {
  return [
    {
      t: 0,
      s: [100, 100, 100],
      i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
      o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
    },
    {
      t: 78,
      s: [85, 85, 100],
      i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
      o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
    },
    {
      t: 96,
      s: [90, 90, 100],
      i: { x: [0.25, 0.25, 0.25], y: [1, 1, 1] },
      o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] },
    },
    {
      t: 138,
      s: [128, 128, 100],
      i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
      o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
    },
    {
      t: 150,
      s: [100, 100, 100],
    },
  ];
}

function defaultShapeTransform() {
  return {
    ty: 'tr',
    p: { a: 0, k: [0, 0] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 },
    sk: { a: 0, k: 0 },
    sa: { a: 0, k: 0 },
  };
}

function rectGroup(
  name: string,
  w: number,
  h: number,
  rgb: [number, number, number],
  cx = 0,
  cy = 0,
  radius = 6,
  opacity = 100
) {
  return {
    ty: 'gr',
    nm: name,
    it: [
      {
        ty: 'rc',
        d: 1,
        s: { a: 0, k: [w, h] },
        p: { a: 0, k: [cx, cy] },
        r: { a: 0, k: radius },
      },
      {
        ty: 'fl',
        c: { a: 0, k: [rgb[0], rgb[1], rgb[2], 1] },
        o: { a: 0, k: opacity },
        r: 1,
      },
      defaultShapeTransform(),
    ],
  };
}

function ellipseGroup(
  name: string,
  w: number,
  h: number,
  rgb: [number, number, number],
  cx = 0,
  cy = 0,
  opacity = 100
) {
  return {
    ty: 'gr',
    nm: name,
    it: [
      {
        ty: 'el',
        d: 1,
        s: { a: 0, k: [w, h] },
        p: { a: 0, k: [cx, cy] },
      },
      {
        ty: 'fl',
        c: { a: 0, k: [rgb[0], rgb[1], rgb[2], 1] },
        o: { a: 0, k: opacity },
        r: 1,
      },
      defaultShapeTransform(),
    ],
  };
}

/**
 * Constrói um objeto JSON Lottie v5.7.4 completo e autocontido para o padrão biomecânico informado.
 */
export function createBiomechanicalLottieJson(
  pattern: LottieBiomechPattern,
  accentRgb: [number, number, number] = [0.06, 0.73, 0.51] // Emerald
): Record<string, unknown> {
  const slateLight: [number, number, number] = [0.8, 0.84, 0.9];
  const slateMid: [number, number, number] = [0.45, 0.53, 0.65];
  const slateDark: [number, number, number] = [0.18, 0.24, 0.34];
  const amberLoad: [number, number, number] = [0.96, 0.62, 0.04];

  // Configurações cinemáticas por padrão motor
  let pivotPos: [number, number] = [130, 115];
  let pivotEccPos: [number, number] = [130, 115];
  let primaryArmRot: [number, number] = [-15, 55];
  let secondaryLimbRot: [number, number] = [15, -45];
  let loadStart: [number, number] = [130, 52];
  let loadEcc: [number, number] = [130, 128];
  let benchRect: [number, number, number, number] = [130, 174, 150, 8]; // cx, cy, w, h

  switch (pattern) {
    case 'squat_press':
      pivotPos = [126, 92];
      pivotEccPos = [114, 134];
      primaryArmRot = [-8, 52];
      secondaryLimbRot = [10, -48];
      loadStart = [128, 48];
      loadEcc = [122, 92];
      benchRect = [130, 182, 160, 6];
      break;
    case 'knee_extension':
      pivotPos = [136, 118];
      pivotEccPos = [136, 118];
      primaryArmRot = [-72, 8];
      secondaryLimbRot = [0, 0];
      loadStart = [184, 114];
      loadEcc = [142, 168];
      benchRect = [112, 126, 75, 10];
      break;
    case 'leg_curl':
      pivotPos = [135, 116];
      pivotEccPos = [135, 116];
      primaryArmRot = [68, -12];
      secondaryLimbRot = [0, 0];
      loadStart = [142, 166];
      loadEcc = [186, 120];
      benchRect = [122, 124, 95, 10];
      break;
    case 'hip_hinge':
      pivotPos = [110, 112];
      pivotEccPos = [98, 116];
      primaryArmRot = [8, 72];
      secondaryLimbRot = [-5, 14];
      loadStart = [124, 116];
      loadEcc = [134, 162];
      benchRect = [130, 182, 160, 6];
      break;
    case 'hip_thrust':
      pivotPos = [128, 108];
      pivotEccPos = [128, 146];
      primaryArmRot = [85, 118];
      secondaryLimbRot = [-20, 15];
      loadStart = [128, 102];
      loadEcc = [128, 142];
      benchRect = [78, 136, 46, 36];
      break;
    case 'calf_raise':
      pivotPos = [130, 88];
      pivotEccPos = [130, 112];
      primaryArmRot = [0, 0];
      secondaryLimbRot = [-18, 22];
      loadStart = [130, 44];
      loadEcc = [130, 68];
      benchRect = [130, 178, 90, 10];
      break;
    case 'chest_press':
      pivotPos = [126, 126];
      pivotEccPos = [126, 126];
      primaryArmRot = [0, 58];
      secondaryLimbRot = [0, -42];
      loadStart = [132, 54];
      loadEcc = [132, 114];
      benchRect = [125, 138, 115, 10];
      break;
    case 'chest_fly':
      pivotPos = [130, 100];
      pivotEccPos = [130, 100];
      primaryArmRot = [-12, -68];
      secondaryLimbRot = [12, 68];
      loadStart = [130, 96];
      loadEcc = [184, 96];
      benchRect = [130, 178, 120, 6];
      break;
    case 'vertical_pull':
      pivotPos = [130, 106];
      pivotEccPos = [130, 96];
      primaryArmRot = [42, -55];
      secondaryLimbRot = [-42, 55];
      loadStart = [130, 94];
      loadEcc = [130, 36];
      benchRect = [130, 166, 70, 10];
      break;
    case 'horizontal_row':
      pivotPos = [136, 106];
      pivotEccPos = [126, 106];
      primaryArmRot = [38, -42];
      secondaryLimbRot = [-20, 28];
      loadStart = [118, 108];
      loadEcc = [178, 108];
      benchRect = [130, 168, 90, 8];
      break;
    case 'shoulder_press':
      pivotPos = [130, 98];
      pivotEccPos = [130, 98];
      primaryArmRot = [-65, 25];
      secondaryLimbRot = [65, -25];
      loadStart = [130, 34];
      loadEcc = [130, 92];
      benchRect = [130, 162, 65, 10];
      break;
    case 'lateral_raise':
      pivotPos = [130, 86];
      pivotEccPos = [130, 86];
      primaryArmRot = [-82, -8];
      secondaryLimbRot = [82, 8];
      loadStart = [182, 82];
      loadEcc = [148, 138];
      benchRect = [130, 180, 110, 6];
      break;
    case 'triceps_extension':
      pivotPos = [132, 96];
      pivotEccPos = [132, 96];
      primaryArmRot = [12, -72];
      secondaryLimbRot = [0, 0];
      loadStart = [152, 146];
      loadEcc = [164, 84];
      benchRect = [130, 180, 110, 6];
      break;
    case 'biceps_curl':
      pivotPos = [128, 98];
      pivotEccPos = [128, 98];
      primaryArmRot = [-78, 10];
      secondaryLimbRot = [0, 0];
      loadStart = [158, 72];
      loadEcc = [156, 146];
      benchRect = [130, 180, 110, 6];
      break;
    case 'core_crunch':
      pivotPos = [122, 136];
      pivotEccPos = [122, 136];
      primaryArmRot = [-38, 12];
      secondaryLimbRot = [28, -10];
      loadStart = [136, 92];
      loadEcc = [96, 126];
      benchRect = [130, 156, 130, 8];
      break;
  }

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 150,
    w: 260,
    h: 200,
    nm: `Lottie_${pattern}`,
    ddd: 0,
    assets: [],
    layers: [
      // Layer 1: Indicador de Carga / Haltere / Polia Dinâmica
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'Load_Weight_Marker',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 1, k: easePosKeyframes(loadStart, loadEcc, loadStart) },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          ellipseGroup('WeightPlateOuter', 24, 24, amberLoad, 0, 0, 95),
          ellipseGroup('WeightPlateInner', 10, 10, slateDark, 0, 0, 100),
        ],
        ip: 0,
        op: 150,
        st: 0,
        bm: 0,
      },

      // Layer 2: Halo Pulsante de Ativação Muscular (EMG Target)
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: 'Muscle_EMG_Pulse',
        sr: 1,
        ks: {
          o: { a: 0, k: 45 },
          r: { a: 0, k: 0 },
          p: { a: 1, k: easePosKeyframes(pivotPos, pivotEccPos, pivotPos) },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 1, k: easeScalePulseKeyframes() },
        },
        ao: 0,
        shapes: [
          ellipseGroup('EMG_Glow_Outer', 42, 42, accentRgb, 0, 0, 45),
          ellipseGroup('EMG_Glow_Core', 18, 18, accentRgb, 0, 0, 90),
        ],
        ip: 0,
        op: 150,
        st: 0,
        bm: 0,
      },

      // Layer 3: Segmento Primário Agonista (Articulado)
      {
        ddd: 0,
        ind: 3,
        ty: 4,
        nm: 'Agonist_Segment',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 1, k: easeRotKeyframes(primaryArmRot[0], primaryArmRot[1], primaryArmRot[0]) },
          p: { a: 1, k: easePosKeyframes(pivotPos, pivotEccPos, pivotPos) },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          rectGroup('Primary_Limb', 14, 58, accentRgb, 0, 24, 7, 100),
          ellipseGroup('Distal_Joint', 12, 12, slateLight, 0, 52, 100),
        ],
        ip: 0,
        op: 150,
        st: 0,
        bm: 0,
      },

      // Layer 4: Segmento Secundário / Estabilizador (Articulado)
      {
        ddd: 0,
        ind: 4,
        ty: 4,
        nm: 'Stabilizer_Segment',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: {
            a: 1,
            k: easeRotKeyframes(secondaryLimbRot[0], secondaryLimbRot[1], secondaryLimbRot[0]),
          },
          p: { a: 1, k: easePosKeyframes(pivotPos, pivotEccPos, pivotPos) },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          rectGroup('Torso_Or_Tibia', 12, 54, slateLight, 0, -24, 6, 95),
          ellipseGroup('Head_Or_Anchor', 18, 18, slateMid, 0, -58, 95),
        ],
        ip: 0,
        op: 150,
        st: 0,
        bm: 0,
      },

      // Layer 5: Estrutura de Apoio / Banco / Plataforma
      {
        ddd: 0,
        ind: 5,
        ty: 4,
        nm: 'Support_Structure',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [0, 0, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          rectGroup(
            'Bench_Base',
            benchRect[2],
            benchRect[3],
            slateDark,
            benchRect[0],
            benchRect[1],
            4,
            100
          ),
          rectGroup('Guide_Axis', 2, 145, slateDark, 130, 100, 1, 55),
        ],
        ip: 0,
        op: 150,
        st: 0,
        bm: 0,
      },
    ],
  };
}

/**
 * Pré-instancia os arquivos JSON de animação Lottie para cada padrão biomecânico
 */
const LOTTIE_BY_PATTERN: Record<LottieBiomechPattern, Record<string, unknown>> = {
  squat_press: createBiomechanicalLottieJson('squat_press', [0.06, 0.73, 0.51]),
  knee_extension: createBiomechanicalLottieJson('knee_extension', [0.14, 0.83, 0.93]),
  leg_curl: createBiomechanicalLottieJson('leg_curl', [0.66, 0.33, 0.97]),
  hip_hinge: createBiomechanicalLottieJson('hip_hinge', [0.96, 0.62, 0.04]),
  hip_thrust: createBiomechanicalLottieJson('hip_thrust', [0.93, 0.28, 0.6]),
  calf_raise: createBiomechanicalLottieJson('calf_raise', [0.06, 0.73, 0.51]),
  chest_press: createBiomechanicalLottieJson('chest_press', [0.22, 0.74, 0.97]),
  chest_fly: createBiomechanicalLottieJson('chest_fly', [0.16, 0.82, 0.68]),
  vertical_pull: createBiomechanicalLottieJson('vertical_pull', [0.38, 0.65, 0.98]),
  horizontal_row: createBiomechanicalLottieJson('horizontal_row', [0.06, 0.73, 0.51]),
  shoulder_press: createBiomechanicalLottieJson('shoulder_press', [0.96, 0.62, 0.04]),
  lateral_raise: createBiomechanicalLottieJson('lateral_raise', [0.66, 0.33, 0.97]),
  triceps_extension: createBiomechanicalLottieJson('triceps_extension', [0.22, 0.74, 0.97]),
  biceps_curl: createBiomechanicalLottieJson('biceps_curl', [0.06, 0.73, 0.51]),
  core_crunch: createBiomechanicalLottieJson('core_crunch', [0.96, 0.62, 0.04]),
};

/**
 * Mapa explícito de IDs de exercício (de `exerciseDatabase.ts`) para seus respectivos
 * objetos JSON de animação Lottie (`lottie-react`).
 */
export const EXERCISE_LOTTIE_MAP: Record<string, Record<string, unknown>> = {
  // Quadríceps
  quad_hack: LOTTIE_BY_PATTERN.squat_press,
  quad_legpress: LOTTIE_BY_PATTERN.squat_press,
  quad_extensora: LOTTIE_BY_PATTERN.knee_extension,
  quad_bulgarian: LOTTIE_BY_PATTERN.squat_press,
  quad_goblet: LOTTIE_BY_PATTERN.squat_press,

  // Isquiotibiais / Posteriores
  ham_seated_curl: LOTTIE_BY_PATTERN.leg_curl,
  ham_rdl_dumbbells: LOTTIE_BY_PATTERN.hip_hinge,
  ham_lying_curl: LOTTIE_BY_PATTERN.leg_curl,
  ham_db_feet_curl: LOTTIE_BY_PATTERN.leg_curl,

  // Glúteos
  glute_hip_thrust: LOTTIE_BY_PATTERN.hip_thrust,
  glute_abductor_lean: LOTTIE_BY_PATTERN.hip_thrust,
  glute_cable_kickback: LOTTIE_BY_PATTERN.hip_thrust,
  glute_stepup: LOTTIE_BY_PATTERN.squat_press,

  // Panturrilhas
  calf_standing: LOTTIE_BY_PATTERN.calf_raise,
  calf_seated: LOTTIE_BY_PATTERN.calf_raise,
  calf_single_db: LOTTIE_BY_PATTERN.calf_raise,

  // Peitoral
  chest_incline_db: LOTTIE_BY_PATTERN.chest_press,
  chest_cable_crossover: LOTTIE_BY_PATTERN.chest_fly,
  chest_machine_press: LOTTIE_BY_PATTERN.chest_press,
  chest_flat_db_press: LOTTIE_BY_PATTERN.chest_press,
  chest_dips_weighted: LOTTIE_BY_PATTERN.chest_press,

  // Costas / Dorsal
  back_chest_supported_row: LOTTIE_BY_PATTERN.horizontal_row,
  back_lat_pulldown: LOTTIE_BY_PATTERN.vertical_pull,
  back_cable_unilateral_row: LOTTIE_BY_PATTERN.horizontal_row,
  back_one_arm_db_row: LOTTIE_BY_PATTERN.horizontal_row,
  back_pullover_db: LOTTIE_BY_PATTERN.vertical_pull,

  // Deltoide Lateral / Anterior
  sh_cable_lateral: LOTTIE_BY_PATTERN.lateral_raise,
  sh_db_lateral: LOTTIE_BY_PATTERN.lateral_raise,
  sh_seated_db_press: LOTTIE_BY_PATTERN.shoulder_press,
  sh_incline_lateral_db: LOTTIE_BY_PATTERN.lateral_raise,

  // Deltoide Posterior
  rear_pecdeck_reverse: LOTTIE_BY_PATTERN.lateral_raise,
  rear_facepull: LOTTIE_BY_PATTERN.horizontal_row,
  rear_bent_over_db: LOTTIE_BY_PATTERN.lateral_raise,

  // Tríceps
  tri_overhead_cable: LOTTIE_BY_PATTERN.triceps_extension,
  tri_pushdown_rope: LOTTIE_BY_PATTERN.triceps_extension,
  tri_skullcrusher_db: LOTTIE_BY_PATTERN.triceps_extension,
  tri_db_overhead_single: LOTTIE_BY_PATTERN.triceps_extension,

  // Bíceps
  bi_incline_curl: LOTTIE_BY_PATTERN.biceps_curl,
  bi_preacher_machine: LOTTIE_BY_PATTERN.biceps_curl,
  bi_hammer_db: LOTTIE_BY_PATTERN.biceps_curl,
  bi_cable_behind_back: LOTTIE_BY_PATTERN.biceps_curl,

  // Abdômen & Core
  abs_cable_crunch: LOTTIE_BY_PATTERN.core_crunch,
  abs_hanging_raise: LOTTIE_BY_PATTERN.core_crunch,
  abs_declined_crunch: LOTTIE_BY_PATTERN.core_crunch,
};

/**
 * Retorna a animação JSON Lottie correspondente ao ID do exercício,
 * com fallback inteligente baseado no nome ou grupo muscular para exercícios personalizados.
 */
export function getExerciseLottieAnimation(
  exerciseId: string,
  exerciseName = '',
  muscleKey = ''
): Record<string, unknown> {
  if (EXERCISE_LOTTIE_MAP[exerciseId]) {
    return EXERCISE_LOTTIE_MAP[exerciseId];
  }

  const n = exerciseName.toLowerCase();
  if (n.includes('extensora')) return LOTTIE_BY_PATTERN.knee_extension;
  if (n.includes('flexora')) return LOTTIE_BY_PATTERN.leg_curl;
  if (n.includes('stiff') || n.includes('romeno') || n.includes('terra')) return LOTTIE_BY_PATTERN.hip_hinge;
  if (n.includes('elevação pélvica') || n.includes('glúteo') || muscleKey === 'glutes') return LOTTIE_BY_PATTERN.hip_thrust;
  if (muscleKey === 'calves' || n.includes('panturrilha')) return LOTTIE_BY_PATTERN.calf_raise;
  if (n.includes('crucifixo') || n.includes('crossover')) return LOTTIE_BY_PATTERN.chest_fly;
  if (muscleKey === 'chest' || n.includes('supino')) return LOTTIE_BY_PATTERN.chest_press;
  if (n.includes('puxada') || n.includes('barra fixa')) return LOTTIE_BY_PATTERN.vertical_pull;
  if (muscleKey === 'back' || n.includes('remada')) return LOTTIE_BY_PATTERN.horizontal_row;
  if (n.includes('elevação lateral') || muscleKey === 'rear_delts') return LOTTIE_BY_PATTERN.lateral_raise;
  if (muscleKey === 'shoulders' || n.includes('desenvolvimento')) return LOTTIE_BY_PATTERN.shoulder_press;
  if (muscleKey === 'triceps' || n.includes('tríceps')) return LOTTIE_BY_PATTERN.triceps_extension;
  if (muscleKey === 'biceps' || n.includes('rosca')) return LOTTIE_BY_PATTERN.biceps_curl;
  if (muscleKey === 'abs' || n.includes('abdominal')) return LOTTIE_BY_PATTERN.core_crunch;

  return LOTTIE_BY_PATTERN.squat_press;
}
