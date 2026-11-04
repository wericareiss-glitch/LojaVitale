/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MuscleGroup, SplitOption } from '../types/workout';

export type Language = 'pt' | 'en' | 'es';

export interface Translations {
  // Navigation
  tabHome: string;
  tabWorkout: string;
  tabActiveWorkout: string;
  tabCardio: string;
  tabProfile: string;
  appTitle: string;
  appSubtitle: string;
  badgePro: string;

  // Header
  budgetBtn: string;
  historyBtn: string;
  shareBtn: string;
  progressHeader: string;
  soundOn: string;
  soundOff: string;

  // Home Tab
  homeGreeting: string;
  homeSubtitle: string;
  startWorkoutCta: string;
  continueWorkoutCta: string;
  kpiCompletedWorkouts: string;
  kpiTotalTonnage: string;
  kpiWeeklyTarget: string;
  kpiMaxLoadPR: string;
  weeklyTrackingTitle: string;
  weeklyTrackingSubtitle: string;
  historySectionTitle: string;
  historySectionSubtitle: string;
  historyEmptyTitle: string;
  historyEmptyDesc: string;
  historyEmptyCta: string;
  viewSummaryAndShare: string;
  sessionNotesLabel: string;
  tonnageLabel: string;
  setsCompletedLabel: string;
  seriesLabel: string;

  // Workout Tab
  workoutConfigTitle: string;
  splitLabel: string;
  strategyLabel: string;
  levelLabel: string;
  equipLabel: string;
  generateProportionalBtn: string;
  addExerciseBtn: string;
  workoutNotesPlaceholder: string;
  sessionNotesTitle: string;
  emptyWorkoutTitle: string;
  emptyWorkoutDesc: string;
  finishSessionBtn: string;
  resetTodayBtn: string;
  exportBackupBtn: string;
  importBackupBtn: string;
  backupSuccess: string;
  backupRestored: string;
  resetConfirm: string;
  resetSuccess: string;

  // Exercise Card
  colSet: string;
  colPrev: string;
  colWeight: string;
  colReps: string;
  colDone: string;
  btnWarmup: string;
  btnSwap: string;
  btnAddSet: string;
  btnRemoveSet: string;
  cueLabel: string;
  bioLabel: string;

  // Profile Tab
  profileTitle: string;
  profileSubtitle: string;
  athleteCardTitle: string;
  usernameLabel: string;
  nameLabel: string;
  weightLabel: string;
  heightLabel: string;
  bmiLabel: string;
  bmiNormal: string;
  bmiUnderweight: string;
  bmiOverweight: string;
  bmiObese: string;
  saveProfileBtn: string;
  profileSavedSuccess: string;
  changePasswordBtn: string;
  oldPasswordLabel: string;
  newPasswordLabel: string;
  savePasswordBtn: string;
  languageSectionTitle: string;
  languageSectionSubtitle: string;
  deviceLanguage: string;
  portuguese: string;
  english: string;
  spanish: string;

  // Budget & Metas
  budgetSectionTitle: string;
  budgetSectionSubtitle: string;
  budgetCeilingLabel: string;
  budgetAllocatedLabel: string;
  budgetAdjustBtn: string;
  budgetPresetsTitle: string;
  presetBalance: string;
  presetVTaper: string;
  presetLowerGlutes: string;
  presetPushPull: string;

  // Tools & Organization
  toolsSectionTitle: string;
  toolsSectionSubtitle: string;
  toolBackup: string;
  toolBackupDesc: string;

  // Athlete History in Profile
  profileHistoryTitle: string;
  profileHistorySubtitle: string;
  clearHistoryBtn: string;
  clearHistoryConfirm: string;
  clearHistorySuccess: string;
  logoutBtn: string;

  // Summary Modal & Share
  workoutCompletedCongrats: string;
  greatJobMessage: string;
  congratsAthlete: string;
  shareWorkoutBtn: string;
  downloadCardBtn: string;
  generatingImage: string;
  copiedToClipboard: string;
  sessionMaxLoad: string;
  workoutTonnage: string;
  totalSetsDone: string;
  topExerciseLabel: string;
  closeBtn: string;

  // Muscle groups
  muscles: Record<MuscleGroup, string>;
  splits: Record<SplitOption, string>;
}

const translations: Record<Language, Translations> = {
  pt: {
    tabHome: 'Início',
    tabWorkout: 'Treino',
    tabActiveWorkout: 'Treino Ativo',
    tabCardio: 'Cardio',
    tabProfile: 'Perfil',
    appTitle: 'MeuTreino Pro',
    appSubtitle: 'Hipertrofia individualizada',
    badgePro: 'Hipertrofia Pro',

    budgetBtn: 'Séries',
    historyBtn: 'Histórico',
    shareBtn: 'Compartilhar',
    progressHeader: 'Progresso',
    soundOn: 'Sons Ativados',
    soundOff: 'Áudio Mudo',

    homeGreeting: 'Bem-vindo de volta',
    homeSubtitle: 'Evolua suas cargas e organize seus treinos semanais sem complicação.',
    startWorkoutCta: 'Montar Treino de Hoje',
    continueWorkoutCta: 'Continuar Treino Ativo',
    kpiCompletedWorkouts: 'Treinos Concluídos',
    kpiTotalTonnage: 'Volume Total (kg)',
    kpiWeeklyTarget: 'Meta Semanal de Séries',
    kpiMaxLoadPR: 'Carga Máxima (PR)',
    weeklyTrackingTitle: 'Acompanhamento de Volume Semanal',
    weeklyTrackingSubtitle: 'Distribuição e acúmulo de séries por grupo muscular em relação à sua meta semanal.',
    historySectionTitle: 'Histórico de Treinos Resumido',
    historySectionSubtitle: 'Todas as suas sessões salvas com cargas, tonelagem e notas.',
    historyEmptyTitle: 'Nenhum treino concluído ainda',
    historyEmptyDesc: 'Assim que você concluir sua primeira sessão de treino, ela aparecerá aqui com métricas completas e opção de gerar cards para compartilhar!',
    historyEmptyCta: 'Iniciar Primeiro Treino',
    viewSummaryAndShare: 'Ver Resumo & Compartilhar',
    sessionNotesLabel: 'Notas da Sessão',
    tonnageLabel: 'tonelagem',
    setsCompletedLabel: 'séries concluídas',
    seriesLabel: 'séries',

    workoutConfigTitle: 'Configurações do Treino',
    splitLabel: 'Divisão Muscular',
    strategyLabel: 'Estilo do Treino',
    levelLabel: 'Nível de Treinamento',
    equipLabel: 'Equipamentos',
    generateProportionalBtn: 'Gerar Treino com Séries Proporcionais',
    addExerciseBtn: 'Adicionar Exercício',
    workoutNotesPlaceholder: 'Como foi o treino hoje? Anote cansaço, dores ou ajustes que fez...',
    sessionNotesTitle: 'Notas de Treino da Sessão',
    emptyWorkoutTitle: 'Nenhum exercício montado ainda',
    emptyWorkoutDesc: 'Escolha os parâmetros acima e clique em "Gerar Treino com Séries Proporcionais" ou monte individualmente adicionando exercícios.',
    finishSessionBtn: 'Concluir Sessão & Salvar',
    resetTodayBtn: 'Zerar Anotações de Hoje',
    exportBackupBtn: 'Salvar Cópia de Segurança',
    importBackupBtn: 'Restaurar Cópia',
    backupSuccess: 'Backup do perfil exportado com sucesso!',
    backupRestored: 'Dados restaurados com sucesso para este perfil!',
    resetConfirm: 'Deseja realmente zerar todos os registros de séries e notas de hoje?',
    resetSuccess: 'Anotações de hoje foram zeradas.',

    colSet: 'Série',
    colPrev: 'Anterior',
    colWeight: 'Carga (kg)',
    colReps: 'Reps',
    colDone: 'Status',
    btnWarmup: 'Aquecer',
    btnSwap: 'Substituir',
    btnAddSet: 'Adicionar Série',
    btnRemoveSet: 'Remover',
    cueLabel: 'Dica de Execução',
    bioLabel: 'Dicas de Execução & Postura',

    profileTitle: 'Perfil & Gestão do Atleta',
    profileSubtitle: 'Suas informações corporais, metas de séries, ferramentas e backup.',
    athleteCardTitle: 'Dados do Atleta',
    usernameLabel: 'Nome de Usuário',
    nameLabel: 'Nome / Apelido',
    weightLabel: 'Peso Corporal (kg)',
    heightLabel: 'Estatura (m)',
    bmiLabel: 'Índice de Massa Corporal (IMC)',
    bmiNormal: 'Faixa Saudável',
    bmiUnderweight: 'Abaixo do peso',
    bmiOverweight: 'Sobrepeso',
    bmiObese: 'Obesidade',
    saveProfileBtn: 'Salvar Dados Pessoais',
    profileSavedSuccess: 'Perfil atualizado com sucesso!',
    changePasswordBtn: 'Alterar Senha de Acesso',
    oldPasswordLabel: 'Senha Atual',
    newPasswordLabel: 'Nova Senha',
    savePasswordBtn: 'Confirmar Nova Senha',
    languageSectionTitle: 'Idioma do Aplicativo',
    languageSectionSubtitle: 'Detecta automaticamente o idioma do seu aparelho ou permite seleção manual.',
    deviceLanguage: 'Detectar pelo Dispositivo (Automático)',
    portuguese: 'Português (Brasil)',
    english: 'English (US)',
    spanish: 'Español',

    budgetSectionTitle: 'Metas & Séries Semanais',
    budgetSectionSubtitle: 'Controle fácil do volume de séries que você faz por semana.',
    budgetCeilingLabel: 'Total Semanal de Séries',
    budgetAllocatedLabel: 'Séries Planejadas',
    budgetAdjustBtn: 'Ajustar Séries',
    budgetPresetsTitle: 'Modelos Sugeridos de Séries',
    presetBalance: 'Equilíbrio Total',
    presetVTaper: 'Foco Tronco em V',
    presetLowerGlutes: 'Foco Pernas & Glúteos',
    presetPushPull: 'Foco Empurrar / Puxar',

    toolsSectionTitle: 'Organização de Treinos & Ferramentas',
    toolsSectionSubtitle: 'Salve uma cópia dos seus dados ou instale o aplicativo no celular.',
    toolBackup: 'Cópia de Segurança do Perfil',
    toolBackupDesc: 'Salve ou restaure seus treinos e histórico caso troque de aparelho.',

    profileHistoryTitle: 'Histórico Geral do Perfil',
    profileHistorySubtitle: 'Gerencie e consulte todas as sessões salvas na sua conta.',
    clearHistoryBtn: 'Limpar Todo Histórico',
    clearHistoryConfirm: 'Tem certeza que deseja apagar todo o histórico de treinos deste perfil? Esta ação não pode ser desfeita.',
    clearHistorySuccess: 'Histórico do perfil foi apagado.',
    logoutBtn: 'Desconectar / Trocar de Perfil',

    workoutCompletedCongrats: 'Parabéns pelo Treino!',
    greatJobMessage: 'Você concluiu sua sessão com dedicação e consistência de campeão!',
    congratsAthlete: 'Treino Finalizado com Sucesso',
    shareWorkoutBtn: 'Compartilhar Treino',
    downloadCardBtn: 'Baixar Card em Imagem HD',
    generatingImage: 'Gerando Card HD...',
    copiedToClipboard: 'Texto do treino copiado para a área de transferência!',
    sessionMaxLoad: 'Carga Máxima (PR)',
    workoutTonnage: 'Volume Total Levantado',
    totalSetsDone: 'Séries Concluídas',
    topExerciseLabel: 'Melhor Desempenho (Top Set)',
    closeBtn: 'Fechar',

    muscles: {
      quadriceps: 'Quadríceps',
      hamstrings: 'Isquiotibiais',
      glutes: 'Glúteos',
      calves: 'Panturrilhas',
      chest: 'Peitoral',
      back: 'Costas / Dorsal',
      shoulders: 'Deltoide Lateral',
      rear_delts: 'Deltoide Posterior',
      triceps: 'Tríceps',
      biceps: 'Bíceps',
      abs: 'Abdômen & Core',
    },
    splits: {
      fullbody: 'Full Body (Corpo Inteiro)',
      abcde: 'ABCDE (5 Dias por Músculo)',
      upper_lower: 'Upper / Lower (Superiores & Inferiores)',
      ppl: 'Push / Pull / Legs (PPL)',
      upper: 'Superior (Upper)',
      lower: 'Inferior (Lower)',
      push: 'Empurrar (Push)',
      pull: 'Puxar (Pull)',
      legs: 'Pernas & Panturrilhas (Legs)',
    },
  },

  en: {
    tabHome: 'Home',
    tabWorkout: 'Workouts',
    tabActiveWorkout: 'Active Workout',
    tabCardio: 'Cardio',
    tabProfile: 'Profile',
    appTitle: 'MeuTreino Pro',
    appSubtitle: 'Individualized Hypertrophy',
    badgePro: 'Hypertrophy Pro',

    budgetBtn: 'Sets',
    historyBtn: 'History',
    shareBtn: 'Share',
    progressHeader: 'Progress',
    soundOn: 'Audio Enabled',
    soundOff: 'Muted',

    homeGreeting: 'Welcome back',
    homeSubtitle: 'Progress your weights and organize your weekly workouts with ease.',
    startWorkoutCta: 'Set Today’s Workout',
    continueWorkoutCta: 'Continue Active Workout',
    kpiCompletedWorkouts: 'Completed Workouts',
    kpiTotalTonnage: 'Total Tonnage (kg)',
    kpiWeeklyTarget: 'Weekly Sets Target',
    kpiMaxLoadPR: 'Peak Load (PR)',
    weeklyTrackingTitle: 'Weekly Volume Tracking',
    weeklyTrackingSubtitle: 'Weekly sets distribution and accumulation per muscle group versus weekly target.',
    historySectionTitle: 'Summarized Workout History',
    historySectionSubtitle: 'All your completed sessions with loads, tonnage, and notes.',
    historyEmptyTitle: 'No workouts completed yet',
    historyEmptyDesc: 'Once you finish your first workout session, it will show up here with full analytics and instant shareable image cards!',
    historyEmptyCta: 'Start First Workout',
    viewSummaryAndShare: 'View Summary & Share',
    sessionNotesLabel: 'Session Notes',
    tonnageLabel: 'tonnage',
    setsCompletedLabel: 'completed sets',
    seriesLabel: 'sets',

    workoutConfigTitle: 'Workout Setup',
    splitLabel: 'Muscle Split',
    strategyLabel: 'Workout Style',
    levelLabel: 'Training Level',
    equipLabel: 'Available Equipment',
    generateProportionalBtn: 'Generate Workout with Proportional Sets',
    addExerciseBtn: 'Add Exercise',
    workoutNotesPlaceholder: 'How did the workout feel? Note your energy, recovery, or adjustments made...',
    sessionNotesTitle: 'Session Workout Notes',
    emptyWorkoutTitle: 'No exercises added yet',
    emptyWorkoutDesc: 'Select parameters above and tap "Generate Workout with Proportional Sets" or add exercises customly.',
    finishSessionBtn: 'Finish Session & Save',
    resetTodayBtn: 'Reset Today’s Logs',
    exportBackupBtn: 'Export Backup (.json)',
    importBackupBtn: 'Restore Backup',
    backupSuccess: 'Profile backup successfully exported!',
    backupRestored: 'Data restored successfully for this profile!',
    resetConfirm: 'Do you really want to clear all sets and notes logged today?',
    resetSuccess: 'Today’s notes and sets have been cleared.',

    colSet: 'Set',
    colPrev: 'Previous',
    colWeight: 'Weight (kg)',
    colReps: 'Reps',
    colDone: 'Status',
    btnWarmup: 'Warmup',
    btnSwap: 'Swap',
    btnAddSet: 'Add Set',
    btnRemoveSet: 'Remove',
    cueLabel: 'Execution Tip',
    bioLabel: 'Form & Execution Tips',

    profileTitle: 'Athlete Profile & Settings',
    profileSubtitle: 'Your body metrics, weekly set goals, training tools, and backup.',
    athleteCardTitle: 'Athlete Details',
    usernameLabel: 'Username',
    nameLabel: 'Full Name / Nickname',
    weightLabel: 'Body Weight (kg)',
    heightLabel: 'Height (m)',
    bmiLabel: 'Body Mass Index (BMI)',
    bmiNormal: 'Normal Range',
    bmiUnderweight: 'Underweight',
    bmiOverweight: 'Overweight',
    bmiObese: 'Obese',
    saveProfileBtn: 'Save Personal Info',
    profileSavedSuccess: 'Profile updated successfully!',
    changePasswordBtn: 'Change Password',
    oldPasswordLabel: 'Current Password',
    newPasswordLabel: 'New Password',
    savePasswordBtn: 'Confirm New Password',
    languageSectionTitle: 'App Language',
    languageSectionSubtitle: 'Automatically matches your device language or choose manually below.',
    deviceLanguage: 'Match Device Language (Auto)',
    portuguese: 'Português (Brasil)',
    english: 'English (US)',
    spanish: 'Español',
    budgetSectionTitle: 'Weekly Sets & Targets',
    budgetSectionSubtitle: 'Easy control of your weekly sets per muscle group.',
    budgetCeilingLabel: 'Weekly Total Sets',
    budgetAllocatedLabel: 'Sets Planned',
    budgetAdjustBtn: 'Adjust Weekly Sets',
    budgetPresetsTitle: 'Suggested Set Presets',
    presetBalance: 'Full Balance',
    presetVTaper: 'V-Taper Focus',
    presetLowerGlutes: 'Legs & Glutes Focus',
    presetPushPull: 'Push / Pull Focus',

    toolsSectionTitle: 'Workout Organization & Tools',
    toolsSectionSubtitle: 'IndexedDB storage and profile data backup.',
    toolBackup: 'Profile Backup (.json)',
    toolBackupDesc: 'Export or restore isolated athlete training logs and history.',

    profileHistoryTitle: 'Athlete Workout Archive',
    profileHistorySubtitle: 'Review and manage all sessions stored in your profile.',
    clearHistoryBtn: 'Clear All History',
    clearHistoryConfirm: 'Are you sure you want to delete all workout history for this profile? This cannot be undone.',
    clearHistorySuccess: 'Profile history cleared.',
    logoutBtn: 'Log Out / Switch Athlete',

    workoutCompletedCongrats: 'Workout Completed! Great Job!',
    greatJobMessage: 'You finished your session with outstanding effort and consistency!',
    congratsAthlete: 'Session Successfully Recorded',
    shareWorkoutBtn: 'Share Workout',
    downloadCardBtn: 'Download HD Image Card',
    generatingImage: 'Generating HD Card...',
    copiedToClipboard: 'Workout summary copied to clipboard!',
    sessionMaxLoad: 'Peak Load (PR)',
    workoutTonnage: 'Total Tonnage Lifted',
    totalSetsDone: 'Completed Sets',
    topExerciseLabel: 'Top Lift (Peak Load)',
    closeBtn: 'Close',

    muscles: {
      quadriceps: 'Quadriceps',
      hamstrings: 'Hamstrings',
      glutes: 'Glutes',
      calves: 'Calves',
      chest: 'Chest / Pectorals',
      back: 'Back / Lats',
      shoulders: 'Lateral Deltoids',
      rear_delts: 'Rear Deltoids',
      triceps: 'Triceps',
      biceps: 'Biceps',
      abs: 'Abs & Core',
    },
    splits: {
      fullbody: 'Full Body',
      abcde: 'ABCDE (5-Day Split)',
      upper_lower: 'Upper / Lower',
      ppl: 'Push / Pull / Legs (PPL)',
      upper: 'Upper Body',
      lower: 'Lower Body',
      push: 'Push',
      pull: 'Pull',
      legs: 'Legs & Calves',
    },
  },

  es: {
    tabHome: 'Inicio',
    tabWorkout: 'Rutinas',
    tabActiveWorkout: 'Entrenamiento Activo',
    tabCardio: 'Cardio',
    tabProfile: 'Perfil',
    appTitle: 'MeuTreino Pro',
    appSubtitle: 'Hipertrofia individualizada',
    badgePro: 'Hipertrofia Pro',

    budgetBtn: 'Series',
    historyBtn: 'Historial',
    shareBtn: 'Compartir',
    progressHeader: 'Progreso',
    soundOn: 'Audio Activado',
    soundOff: 'Silenciado',

    homeGreeting: 'Bienvenido de nuevo',
    homeSubtitle: 'Aumenta tus cargas y organiza tus entrenamientos semanales de forma simple.',
    startWorkoutCta: 'Armar Entrenamiento de Hoy',
    continueWorkoutCta: 'Continuar Entrenamiento Activo',
    kpiCompletedWorkouts: 'Entrenamientos Completados',
    kpiTotalTonnage: 'Volumen Total (kg)',
    kpiWeeklyTarget: 'Meta Semanal de Series',
    kpiMaxLoadPR: 'Carga Máxima (PR)',
    weeklyTrackingTitle: 'Seguimiento de Volumen Semanal',
    weeklyTrackingSubtitle: 'Distribución y acumulación de series por grupo muscular en relación con tu meta semanal.',
    historySectionTitle: 'Historial Resumido de Entrenamientos',
    historySectionSubtitle: 'Todas tus sesiones guardadas con cargas, tonelaje y notas.',
    historyEmptyTitle: 'Aún no hay entrenamientos completados',
    historyEmptyDesc: '¡En cuanto termines tu primera sesión, aparecerá aquí con métricas completas y opción para generar tarjetas de imagen para compartir!',
    historyEmptyCta: 'Iniciar Primer Entrenamiento',
    viewSummaryAndShare: 'Ver Resumen y Compartir',
    sessionNotesLabel: 'Notas de la Sesión',
    tonnageLabel: 'tonelaje',
    setsCompletedLabel: 'series completadas',
    seriesLabel: 'series',

    workoutConfigTitle: 'Configuraciones del Entrenamiento',
    splitLabel: 'División Muscular',
    strategyLabel: 'Estilo de Entrenamiento',
    levelLabel: 'Nivel de Entrenamiento',
    equipLabel: 'Equipamiento Disponible',
    generateProportionalBtn: 'Generar Rutina con Series Proporcionales',
    addExerciseBtn: 'Agregar Ejercicio',
    workoutNotesPlaceholder: '¿Cómo estuvo el entrenamiento? Anota cansancio, dolores o cambios que hiciste...',
    sessionNotesTitle: 'Notas de la Sesión',
    emptyWorkoutTitle: 'Aún no hay ejercicios configurados',
    emptyWorkoutDesc: 'Selecciona los parámetros arriba y presiona "Generar Rutina con Series Proporcionales" o agrega ejercicios individualmente.',
    finishSessionBtn: 'Finalizar Sesión y Guardar',
    resetTodayBtn: 'Reiniciar Registros de Hoy',
    exportBackupBtn: 'Exportar Copia (.json)',
    importBackupBtn: 'Restaurar Copia',
    backupSuccess: '¡Copia de seguridad del perfil exportada con éxito!',
    backupRestored: '¡Datos restaurados con éxito para este perfil!',
    resetConfirm: '¿Seguro que deseas reiniciar todos los registros de series y notas de hoy?',
    resetSuccess: 'Los registros de hoy han sido reiniciados.',

    colSet: 'Serie',
    colPrev: 'Anterior',
    colWeight: 'Carga (kg)',
    colReps: 'Reps',
    colDone: 'Estado',
    btnWarmup: 'Calentar',
    btnSwap: 'Cambiar',
    btnAddSet: 'Agregar Serie',
    btnRemoveSet: 'Eliminar',
    cueLabel: 'Consejo de Ejecución',
    bioLabel: 'Consejos de Postura y Ejecución',

    profileTitle: 'Perfil y Gestión del Atleta',
    profileSubtitle: 'Tus datos corporales, metas de series, herramientas y copias de seguridad.',
    athleteCardTitle: 'Datos del Atleta',
    usernameLabel: 'Nombre de Usuario',
    nameLabel: 'Nombre / Apodo',
    weightLabel: 'Peso Corporal (kg)',
    heightLabel: 'Estatura (m)',
    bmiLabel: 'Índice de Massa Corporal (IMC)',
    bmiNormal: 'Rango Saludable',
    bmiUnderweight: 'Bajo peso',
    bmiOverweight: 'Sobrepeso',
    bmiObese: 'Obesidad',
    saveProfileBtn: 'Guardar Datos Personales',
    profileSavedSuccess: '¡Perfil actualizado con éxito!',
    changePasswordBtn: 'Cambiar Contraseña',
    oldPasswordLabel: 'Contraseña Actual',
    newPasswordLabel: 'Nueva Contraseña',
    savePasswordBtn: 'Confirmar Nueva Contraseña',
    languageSectionTitle: 'Idioma de la Aplicación',
    languageSectionSubtitle: 'Detecta automáticamente el idioma de tu dispositivo o selecciónalo manualmente.',
    deviceLanguage: 'Detectar por el Dispositivo (Automático)',
    portuguese: 'Português (Brasil)',
    english: 'English (US)',
    spanish: 'Español',

    budgetSectionTitle: 'Metas y Series Semanales',
    budgetSectionSubtitle: 'Control sencillo de tus series semanales por grupo muscular.',
    budgetCeilingLabel: 'Total Semanal de Series',
    budgetAllocatedLabel: 'Series Planificadas',
    budgetAdjustBtn: 'Ajustar Series',
    budgetPresetsTitle: 'Plantillas Sugeridas de Series',
    presetBalance: 'Equilibrio Total',
    presetVTaper: 'Enfoque Torso en V',
    presetLowerGlutes: 'Enfoque Piernas y Glúteos',
    presetPushPull: 'Enfoque Empuje / Tirón',

    toolsSectionTitle: 'Organización de Entrenamientos y Herramientas',
    toolsSectionSubtitle: 'Almacenamiento IndexedDB y copia de seguridad de datos.',
    toolBackup: 'Copia del Perfil en .JSON',
    toolBackupDesc: 'Exporta o restaura tus registros e historial aislados por atleta.',

    profileHistoryTitle: 'Historial General del Atleta',
    profileHistorySubtitle: 'Gestiona y consulta todas las sesiones guardadas en tu cuenta.',
    clearHistoryBtn: 'Borrar Todo el Historial',
    clearHistoryConfirm: '¿Seguro que deseas eliminar todo el historial de entrenamientos de este perfil? Esta acción no se puede deshacer.',
    clearHistorySuccess: 'Historial del perfil borrado.',
    logoutBtn: 'Cerrar Sesión / Cambiar de Perfil',

    workoutCompletedCongrats: '¡Felicitaciones por el Entrenamiento!',
    greatJobMessage: '¡Completaste tu sesión con gran esfuerzo y consistencia!',
    congratsAthlete: 'Entrenamiento Finalizado con Éxito',
    shareWorkoutBtn: 'Compartir Entrenamiento',
    downloadCardBtn: 'Descargar Tarjeta en Imagen HD',
    generatingImage: 'Generando Imagen HD...',
    copiedToClipboard: '¡Resumen copiado al portapapeles!',
    sessionMaxLoad: 'Carga Máxima (PR)',
    workoutTonnage: 'Volumen Total Levantado',
    totalSetsDone: 'Series Completadas',
    topExerciseLabel: 'Mejor Desempeño (Top Set)',
    closeBtn: 'Cerrar',

    muscles: {
      quadriceps: 'Cuádriceps',
      hamstrings: 'Isquiotibiales',
      glutes: 'Glúteos',
      calves: 'Pantorrillas / Gemelos',
      chest: 'Pectoral',
      back: 'Espalda / Dorsal',
      shoulders: 'Deltoides Lateral',
      rear_delts: 'Deltoides Posterior',
      triceps: 'Tríceps',
      biceps: 'Bíceps',
      abs: 'Abdomen y Core',
    },
    splits: {
      fullbody: 'Cuerpo Completo (Full Body)',
      abcde: 'ABCDE (5 Días por Músculo)',
      upper_lower: 'Upper / Lower (Superior e Inferior)',
      ppl: 'Push / Pull / Legs (PPL)',
      upper: 'Torso Superior (Upper)',
      lower: 'Tren Inferior (Lower)',
      push: 'Empuje (Push)',
      pull: 'Tirón (Pull)',
      legs: 'Piernas y Pantorrillas (Legs)',
    },
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isAutoDetect: boolean;
  setIsAutoDetect: (auto: boolean) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | null>(null);

function detectSystemLanguage(): Language {
  if (typeof navigator === 'undefined') return 'pt';
  const navLangs = navigator.languages || [navigator.language || ''];
  for (const l of navLangs) {
    const lower = (l || '').toLowerCase();
    if (lower.startsWith('pt')) return 'pt';
    if (lower.startsWith('es')) return 'es';
    if (lower.startsWith('en')) return 'en';
  }
  const single = (navigator.language || '').toLowerCase();
  if (single.startsWith('es')) return 'es';
  if (single.startsWith('en')) return 'en';
  return 'pt';
}

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => detectSystemLanguage());

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguageState(detectSystemLanguage());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('languagechange', handleLanguageChange);
      return () => window.removeEventListener('languagechange', handleLanguageChange);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
  };

  const setIsAutoDetect = () => {};

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        isAutoDetect: true,
        setIsAutoDetect,
        t: translations[language] || translations.pt,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      language: 'pt' as Language,
      setLanguage: () => {},
      isAutoDetect: true,
      setIsAutoDetect: () => {},
      t: translations.pt,
    };
  }
  return ctx;
}
