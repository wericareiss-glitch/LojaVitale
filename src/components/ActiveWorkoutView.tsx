/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { 
  CheckCircle2, 
  RotateCcw, 
  FileEdit, 
  Clock, 
  ArrowLeft,
  Flame,
  Plus,
  Check,
  MoreVertical,
  Sparkles,
  Link2,
  FileDown,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  Dumbbell,
  Maximize2,
  Minimize2,
  Layers,
  LayoutGrid,
  Rows3
} from 'lucide-react';
import {
  GeneratedWorkoutRoutine,
  WorkoutItem,
  WorkoutLogs,
  WorkoutSessionSummary,
  MuscleGroup,
  PeriodizationStrategy,
  PERIODIZATION_PHASES,
  FocusOption,
} from '../types/workout';
import { ExerciseCard, areExerciseLogsEqualForCard } from './ExerciseCard';
import { wakeLockManager } from '../utils/wakeLock';
import { generateJointWarmupRoutine } from '../utils/jointMobilityEngine';
import { safeStorage } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { SmartTermTooltip } from './SmartTermTooltip';

const JointMobilityModal = React.lazy(() =>
  import('./JointMobilityModal').then((m) => ({ default: m.JointMobilityModal }))
);
const WorkoutPdfExportModal = React.lazy(() =>
  import('./WorkoutPdfExportModal').then((m) => ({ default: m.WorkoutPdfExportModal }))
);

export type ActiveWorkoutDisplayMode = 'padrao' | 'compacto' | 'foco';
export type LandscapeSetCardLayout = 'grid' | 'inline';

interface WorkoutItemRowProps {
  item: WorkoutItem;
  index: number;
  totalItems: number;
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions: WorkoutSessionSummary[];
  targetMuscleRir?: number;
  isBisetFirst: boolean;
  isSecondInBiset: boolean;
  nextExerciseName?: string;
  prevExerciseName?: string;
  isDragging: boolean;
  isDropTarget: boolean;
  forceCollapsed?: boolean;
  landscapeSetLayout?: LandscapeSetCardLayout;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDeleteExercise: (index: number) => void;
  onUpdateLog: (key: string, field: 'weight' | 'reps' | 'rpe' | 'rir' | 'setType', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onUpdateRest: (index: number, newRest: number) => void;
  onOpenWarmup: (name: string, weight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;
  onToggleBisetWithNext: (index: number) => void;
  onDragStartCard: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragOverCard: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDropCard: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEndCard: () => void;
  onPointerDownDragHandle: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
}

function areWorkoutItemRowEqual(prev: WorkoutItemRowProps, next: WorkoutItemRowProps): boolean {
  if (
    prev.index !== next.index ||
    prev.totalItems !== next.totalItems ||
    prev.targetMuscleRir !== next.targetMuscleRir ||
    prev.isBisetFirst !== next.isBisetFirst ||
    prev.isSecondInBiset !== next.isSecondInBiset ||
    prev.nextExerciseName !== next.nextExerciseName ||
    prev.prevExerciseName !== next.prevExerciseName ||
    prev.isDragging !== next.isDragging ||
    prev.isDropTarget !== next.isDropTarget ||
    prev.forceCollapsed !== next.forceCollapsed ||
    prev.landscapeSetLayout !== next.landscapeSetLayout ||
    prev.sessions !== next.sessions
  ) {
    return false;
  }

  if (prev.item !== next.item) {
    if (
      prev.item.id !== next.item.id ||
      prev.item.sets !== next.item.sets ||
      prev.item.reps !== next.item.reps ||
      prev.item.rest !== next.item.rest ||
      prev.item.muscleKey !== next.item.muscleKey ||
      prev.item.exercise.id !== next.item.exercise.id ||
      prev.item.exercise.name !== next.item.exercise.name
    ) {
      return false;
    }
  }

  const exId = next.item.exercise.id;
  if (!areExerciseLogsEqualForCard(exId, next.item.sets, prev.logs, next.logs)) {
    return false;
  }
  if (!areExerciseLogsEqualForCard(exId, next.item.sets, prev.history, next.history)) {
    return false;
  }

  return true;
}

const MemoizedWorkoutItemRow: React.FC<WorkoutItemRowProps> = React.memo(
  ({
    item,
    index,
    totalItems,
    logs,
    history,
    sessions,
    targetMuscleRir,
    isBisetFirst,
    isSecondInBiset,
    nextExerciseName,
    prevExerciseName,
    isDragging,
    isDropTarget,
    forceCollapsed,
    landscapeSetLayout,
    onMoveUp,
    onMoveDown,
    onDeleteExercise,
    onUpdateLog,
    onToggleSet,
    onUpdateRest,
    onOpenWarmup,
    onOpenSwap,
    onAddSet,
    onRemoveSet,
    onOpenAnalytics,
    onToggleBisetWithNext,
    onDragStartCard,
    onDragOverCard,
    onDropCard,
    onDragEndCard,
    onPointerDownDragHandle,
  }) => {
    return (
      <>
        <ExerciseCard
          item={item}
          index={index}
          logs={logs}
          history={history}
          sessions={sessions}
          canMoveUp={index > 0}
          canMoveDown={index < totalItems - 1}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDeleteExercise={onDeleteExercise}
          onUpdateLog={onUpdateLog}
          onToggleSet={onToggleSet}
          onUpdateRest={onUpdateRest}
          onOpenWarmup={onOpenWarmup}
          onOpenSwap={onOpenSwap}
          onAddSet={onAddSet}
          onRemoveSet={onRemoveSet}
          onOpenAnalytics={onOpenAnalytics}
          targetMuscleRir={targetMuscleRir}
          isBisetWithNext={isBisetFirst}
          isSecondInBiset={isSecondInBiset}
          nextExerciseName={nextExerciseName}
          prevExerciseName={prevExerciseName}
          onToggleBisetWithNext={onToggleBisetWithNext}
          isDragging={isDragging}
          isDropTarget={isDropTarget}
          onDragStartCard={onDragStartCard}
          onDragOverCard={onDragOverCard}
          onDropCard={onDropCard}
          onDragEndCard={onDragEndCard}
          onPointerDownDragHandle={onPointerDownDragHandle}
          forceCollapsed={forceCollapsed}
          landscapeSetLayout={landscapeSetLayout}
        />

        {isBisetFirst && nextExerciseName && (
          <div className="flex items-center justify-center -my-1.5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/90 border border-purple-500/50 text-purple-200 text-[11px] font-black shadow-lg">
              <Link2 className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>
                SUPER-SÉRIE / BI-SET: Alterne sem descanso para {nextExerciseName} (Descanso dispara após o 2º)
              </span>
            </div>
          </div>
        )}
      </>
    );
  },
  areWorkoutItemRowEqual
);

interface ActiveWorkoutViewProps {
  routine: GeneratedWorkoutRoutine;
  workoutItems: WorkoutItem[];
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions?: WorkoutSessionSummary[];
  startedAt: number;
  workoutNotes: string;
  onUpdateWorkoutNotes: (notes: string) => void;
  muscleTargetRir?: Partial<Record<MuscleGroup, number>>;
  periodizationStrategy?: PeriodizationStrategy;
  userFocus?: FocusOption;
  onSelectPeriodizationStrategy?: (phase: PeriodizationStrategy) => void;

  onOpenAddExercise: () => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onReorderExercises?: (fromIndex: number, toIndex: number) => void;
  onDeleteExercise: (index: number) => void;
  onUpdateLog: (key: string, field: 'weight' | 'reps' | 'rpe' | 'rir' | 'setType', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onUpdateRest: (index: number, newRest: number) => void;
  onOpenWarmup: (name: string, weight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;

  onFinishSession: () => void;
  onDiscardSession: () => void;
  onBackToList: () => void;
}

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  routine,
  workoutItems,
  logs,
  history,
  sessions = [],
  startedAt,
  workoutNotes,
  onUpdateWorkoutNotes,
  muscleTargetRir,
  periodizationStrategy,
  userFocus,
  onSelectPeriodizationStrategy,
  onOpenAddExercise,
  onMoveUp,
  onMoveDown,
  onReorderExercises,
  onDeleteExercise,
  onUpdateLog,
  onToggleSet,
  onUpdateRest,
  onOpenWarmup,
  onOpenSwap,
  onAddSet,
  onRemoveSet,
  onOpenAnalytics,
  onFinishSession,
  onDiscardSession,
  onBackToList,
}) => {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [isMobilityOpen, setIsMobilityOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [hideCompletedExercises, setHideCompletedExercises] = useState(false);
  const [displayMode, setDisplayMode] = useState<ActiveWorkoutDisplayMode>(() =>
    safeStorage.get<ActiveWorkoutDisplayMode>('meutreino_active_view_mode', 'padrao')
  );
  const [landscapeSetLayout, setLandscapeSetLayout] = useState<LandscapeSetCardLayout>(() =>
    safeStorage.get<LandscapeSetCardLayout>('meutreino_landscape_set_layout', 'grid')
  );
  const [focusedExerciseIdx, setFocusedExerciseIdx] = useState<number>(0);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [isLegendsExpanded, setIsLegendsExpanded] = useState<boolean>(() =>
    safeStorage.get<boolean>('meutreino_legends_expanded', false)
  );
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const handleChangeDisplayMode = React.useCallback((mode: ActiveWorkoutDisplayMode) => {
    setDisplayMode(mode);
    safeStorage.set('meutreino_active_view_mode', mode);
    soundManager.vibrate(15);
  }, []);

  const handleChangeLandscapeSetLayout = React.useCallback((layout: LandscapeSetCardLayout) => {
    setLandscapeSetLayout(layout);
    safeStorage.set('meutreino_landscape_set_layout', layout);
    soundManager.vibrate(15);
  }, []);

  const performReorder = React.useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
      if (onReorderExercises) {
        onReorderExercises(fromIdx, toIdx);
      } else if (toIdx < fromIdx) {
        for (let i = fromIdx; i > toIdx; i--) onMoveUp(i);
      } else {
        for (let i = fromIdx; i < toIdx; i++) onMoveDown(i);
      }
      soundManager.vibrate(25);
    },
    [onReorderExercises, onMoveUp, onMoveDown]
  );

  // HTML5 Drag & Drop Handlers
  const handleDragStartCard = React.useCallback((idx: number, e: React.DragEvent<HTMLDivElement>) => {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOverCard = React.useCallback((idx: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIdx(idx);
  }, []);

  const handleDropCard = React.useCallback(
    (targetIdx: number, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromIdx = draggingIdx !== null ? draggingIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIdx) && fromIdx !== targetIdx) {
        performReorder(fromIdx, targetIdx);
      }
      setDraggingIdx(null);
      setDropTargetIdx(null);
    },
    [draggingIdx, performReorder]
  );

  const handleDragEndCard = React.useCallback(() => {
    setDraggingIdx(null);
    setDropTargetIdx(null);
  }, []);

  // Mobile/Touch & Mouse Pointer Hold-and-Drag on Grip Handle
  const handlePointerDownDragHandle = React.useCallback(
    (startIdx: number, e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingIdx(startIdx);
      setDropTargetIdx(startIdx);
      soundManager.vibrate(15);

      let latestTarget = startIdx;

      const handlePointerMove = (moveEvt: PointerEvent) => {
        // Auto-scroll viewport when dragging near top or bottom edges
        const viewportH = window.innerHeight;
        if (moveEvt.clientY < 90) {
          window.scrollBy({ top: -14, behavior: 'auto' });
        } else if (moveEvt.clientY > viewportH - 90) {
          window.scrollBy({ top: 14, behavior: 'auto' });
        }

        const elUnder = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
        const cardEl = elUnder?.closest('[data-exercise-card-index]') as HTMLElement | null;
        if (cardEl) {
          const overIdx = parseInt(cardEl.getAttribute('data-exercise-card-index') || '', 10);
          if (!isNaN(overIdx) && overIdx !== latestTarget) {
            latestTarget = overIdx;
            setDropTargetIdx(overIdx);
            soundManager.vibrate(10);
          }
        }
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
        if (latestTarget !== startIdx) {
          performReorder(startIdx, latestTarget);
        }
        setDraggingIdx(null);
        setDropTargetIdx(null);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [performReorder]
  );

  // Detecta dinamicamente a fase de periodização a partir da estratégia selecionada, foco ou faixa de repetições da rotina
  const inferPhaseFromWorkout = React.useCallback((): PeriodizationStrategy => {
    if (periodizationStrategy) return periodizationStrategy;
    if (routine.periodizationStrategy) return routine.periodizationStrategy;

    const storedPhase = safeStorage.get<PeriodizationStrategy | null>(
      `meutreino_periodization_${routine.id}`,
      null
    );
    if (storedPhase && PERIODIZATION_PHASES[storedPhase]) {
      return storedPhase;
    }

    if (workoutItems.length > 0) {
      let totalAvgReps = 0;
      let validCount = 0;
      workoutItems.forEach((it) => {
        const matches = (it.reps || '').match(/\d+/g);
        if (matches && matches.length > 0) {
          const nums = matches.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
          if (nums.length > 0) {
            const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
            totalAvgReps += avg;
            validCount++;
          }
        }
      });
      if (validCount > 0) {
        const meanReps = totalAvgReps / validCount;
        if (meanReps <= 6) return 'strength';
        if (meanReps >= 14.5) return 'metabolic';
        return 'hypertrophy';
      }
    }

    if (userFocus === 'strength') return 'strength';
    return 'hypertrophy';
  }, [periodizationStrategy, routine.id, routine.periodizationStrategy, workoutItems, userFocus]);

  const [activePhase, setActivePhase] = useState<PeriodizationStrategy>(() => inferPhaseFromWorkout());

  useEffect(() => {
    if (periodizationStrategy && periodizationStrategy !== activePhase) {
      setActivePhase(periodizationStrategy);
    }
  }, [periodizationStrategy, activePhase]);

  const handleSelectPhase = (phase: PeriodizationStrategy) => {
    setActivePhase(phase);
    safeStorage.set(`meutreino_periodization_${routine.id}`, phase);
    soundManager.vibrate(18);
    if (onSelectPeriodizationStrategy) {
      onSelectPeriodizationStrategy(phase);
    }
  };

  const currentPhaseConfig = PERIODIZATION_PHASES[activePhase] || PERIODIZATION_PHASES.hypertrophy;

  const toggleLegendsExpanded = () => {
    setIsLegendsExpanded((prev) => {
      const next = !prev;
      safeStorage.set('meutreino_legends_expanded', next);
      return next;
    });
  };

  // Estado persistente de pares Bi-set / Super-série por rotina
  const bisetStorageKey = `meutreino_bisets_${routine.id}`;
  const [bisetPairs, setBisetPairs] = useState<Record<string, boolean>>(() => {
    return safeStorage.get<Record<string, boolean>>(bisetStorageKey, {});
  });

  const handleToggleBisetWithNext = React.useCallback((index: number) => {
    const currentItem = workoutItems[index];
    if (!currentItem || index >= workoutItems.length - 1) return;
    setBisetPairs((prev) => {
      const next = { ...prev, [currentItem.id]: !prev[currentItem.id] };
      safeStorage.set(bisetStorageKey, next);
      return next;
    });
    soundManager.vibrate(20);
  }, [workoutItems, bisetStorageKey]);

  // Gera rotina de aquecimento articular dinâmica baseada nos exercícios do treino ativo
  const mobilityRoutine = React.useMemo(() => {
    return generateJointWarmupRoutine(workoutItems, routine.name);
  }, [workoutItems, routine.name]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    if (showToolsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolsMenu]);

  // Debounced auto-save para as anotações do treino
  const [localNotes, setLocalNotes] = useState(workoutNotes);
  const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const notesDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNotesRef = useRef(workoutNotes);

  useEffect(() => {
    latestNotesRef.current = localNotes;
  }, [localNotes]);

  // Sincroniza se o prop workoutNotes mudar externamente sem sobrescrever digitação
  useEffect(() => {
    if (notesSaveStatus !== 'saving') {
      setLocalNotes(workoutNotes);
      latestNotesRef.current = workoutNotes;
    }
  }, [workoutNotes, notesSaveStatus]);

  // Garante salvar imediatamente no unmount para prevenir qualquer perda de anotações
  useEffect(() => {
    return () => {
      if (notesDebounceTimerRef.current) {
        clearTimeout(notesDebounceTimerRef.current);
        onUpdateWorkoutNotes(latestNotesRef.current);
      }
    };
  }, [onUpdateWorkoutNotes]);

  const handleNotesChange = (val: string) => {
    setLocalNotes(val);
    latestNotesRef.current = val;
    setNotesSaveStatus('saving');

    if (notesDebounceTimerRef.current) {
      clearTimeout(notesDebounceTimerRef.current);
    }

    notesDebounceTimerRef.current = setTimeout(() => {
      onUpdateWorkoutNotes(val);
      setNotesSaveStatus('saved');
      notesDebounceTimerRef.current = null;
      setTimeout(() => {
        setNotesSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
      }, 1500);
    }, 450);
  };

  const handleNotesBlur = () => {
    if (notesDebounceTimerRef.current) {
      clearTimeout(notesDebounceTimerRef.current);
      notesDebounceTimerRef.current = null;
      onUpdateWorkoutNotes(localNotes);
      setNotesSaveStatus('saved');
      setTimeout(() => {
        setNotesSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
      }, 1500);
    }
  };

  // Cronômetro do treino ativo (em segundos)
  const [elapsedSecs, setElapsedSecs] = useState<number>(() => {
    return Math.floor((Date.now() - (startedAt || Date.now())) / 1000);
  });

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedSecs(Math.floor((Date.now() - (startedAt || Date.now())) / 1000));
    };

    const interval = setInterval(updateElapsed, 1000);

    document.addEventListener('visibilitychange', updateElapsed);
    window.addEventListener('focus', updateElapsed);
    window.addEventListener('pageshow', updateElapsed);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', updateElapsed);
      window.removeEventListener('focus', updateElapsed);
      window.removeEventListener('pageshow', updateElapsed);
    };
  }, [startedAt]);

  // Screen Wake Lock API & Keep-Alive: impede que a tela apague e mantém timers ativos
  useEffect(() => {
    wakeLockManager.request().catch(() => {});
    const unbind = wakeLockManager.bindVisibilityListener();
    return () => {
      unbind();
      wakeLockManager.release().catch(() => {});
    };
  }, []);

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Contagem de séries totais e concluídas
  let totalSets = 0;
  let completedSets = 0;

  workoutItems.forEach((item) => {
    totalSets += item.sets;
    for (let s = 1; s <= item.sets; s++) {
      const logKey = `${item.exercise.id}_${s}`;
      if (logs[logKey]?.done) {
        completedSets++;
      }
    }
  });

  // Contagem de séries que superaram carga/volume da sessão anterior
  const beatenSetsCount = React.useMemo(() => {
    let count = 0;
    workoutItems.forEach((item) => {
      let prevEx: { sets: { weight: number; reps: number }[] } | undefined;
      for (const sess of sessions) {
        const found = sess.completedExercises.find(
          (ce) => ce.name.toLowerCase() === item.exercise.name.toLowerCase()
        );
        if (found && found.sets.length > 0) {
          prevEx = found;
          break;
        }
      }

      for (let s = 1; s <= item.sets; s++) {
        const key = `${item.exercise.id}_${s}`;
        const log = logs[key];
        const hist = history[key];

        const currW = parseFloat(log?.weight || '0') || 0;
        const currR = parseInt(log?.reps || '0', 10) || 0;
        const currVol = currW * currR;

        let histW = 0;
        let histR = 0;
        if (prevEx && prevEx.sets[s - 1]) {
          histW = prevEx.sets[s - 1].weight || 0;
          histR = prevEx.sets[s - 1].reps || 0;
        } else if (hist) {
          histW = parseFloat(hist.weight || '0') || 0;
          histR = parseInt(hist.reps || '0', 10) || 0;
        }
        const histVol = histW * histR;

        if (histW > 0 && histR > 0 && (log?.done || (currW > 0 && currR > 0))) {
          if (currW > histW || currVol > histVol || (currW === histW && currR > histR)) {
            count++;
          }
        }
      }
    });
    return count;
  }, [workoutItems, logs, history, sessions]);

  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  // Índices e status de conclusão por exercício para navegação rápida no mobile
  const exerciseCompletionStats = React.useMemo(() => {
    return workoutItems.map((item, idx) => {
      let doneCount = 0;
      for (let s = 1; s <= item.sets; s++) {
        if (logs[`${item.exercise.id}_${s}`]?.done) {
          doneCount++;
        }
      }
      return {
        index: idx,
        doneCount,
        totalSets: item.sets,
        isComplete: doneCount === item.sets && item.sets > 0,
      };
    });
  }, [workoutItems, logs]);

  const nextIncompleteExerciseIndex = React.useMemo(() => {
    const found = exerciseCompletionStats.find((st) => !st.isComplete);
    return found ? found.index : -1;
  }, [exerciseCompletionStats]);

  // Mantém o índice focado válido e sincronizado com o próximo exercício pendente quando necessário
  useEffect(() => {
    if (focusedExerciseIdx >= workoutItems.length && workoutItems.length > 0) {
      setFocusedExerciseIdx(workoutItems.length - 1);
    }
  }, [workoutItems.length, focusedExerciseIdx]);

  const scrollToExercise = (idx: number) => {
    if (displayMode === 'foco') {
      setFocusedExerciseIdx(idx);
      soundManager.vibrate(15);
      return;
    }
    const el = document.getElementById(`exercise-card-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      soundManager.vibrate(15);
    }
  };

  return (
    <div className="space-y-4 landscape:space-y-3 animate-fadeIn pb-28 landscape:pb-20 max-w-4xl landscape:max-w-7xl mx-auto">
      {/* 0. Painel Centralizado no Topo — Legendas para Iniciantes e Consulta Rápida (Compacto em Paisagem) */}
      <div className="bg-[#0f172a] border border-sky-500/30 rounded-2xl p-3 sm:p-4 landscape:py-2 landscape:px-3.5 shadow-lg text-center">
        <div className="flex flex-col landscape:flex-row items-center justify-center landscape:justify-between gap-2">
          <div className="inline-flex items-center gap-2 shrink-0">
            <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              Legendas:
            </h2>
            <button
              type="button"
              onClick={toggleLegendsExpanded}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
              title={isLegendsExpanded ? 'Recolher detalhes das legendas' : 'Expandir explicação detalhada'}
            >
              <HelpCircle className="w-3 h-3 text-sky-400" />
              <span>{isLegendsExpanded ? 'Recolher' : 'Ver Explicações'}</span>
              {isLegendsExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Resumo Rápido Sempre Visível e Centralizado com Tooltips Inteligentes */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 text-[10px] sm:text-[11px] text-slate-300 transition-colors">
              <SmartTermTooltip term="SERIES" align="left">
                <span>
                  <strong className="text-emerald-400">Séries:</strong> rodadas do exercício
                </span>
              </SmartTermTooltip>
            </span>

            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-sky-500/40 text-[10px] sm:text-[11px] text-slate-300 transition-colors">
              <SmartTermTooltip term="REPS" align="center">
                <span>
                  <strong className="text-sky-400">Reps:</strong> movimentos seguidos
                </span>
              </SmartTermTooltip>
            </span>

            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 text-[10px] sm:text-[11px] text-slate-300 transition-colors">
              <SmartTermTooltip term="RIR" align="center">
                <span>
                  <strong className="text-amber-400">RIR:</strong> repetições na reserva
                </span>
              </SmartTermTooltip>
            </span>

            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-sky-500/40 text-[10px] sm:text-[11px] text-slate-300 transition-colors">
              <SmartTermTooltip term="RPE" align="center">
                <span>
                  <strong className="text-amber-300">RPE (6–10):</strong> nota de esforço
                </span>
              </SmartTermTooltip>
            </span>

            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 text-[10px] sm:text-[11px] text-slate-300 transition-colors">
              <SmartTermTooltip term="1RM" align="right">
                <span>
                  <strong className="text-purple-400">1RM / 6RM:</strong> carga máx.
                </span>
              </SmartTermTooltip>
            </span>

            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 text-[10px] sm:text-[11px] text-slate-300 transition-colors">
              <SmartTermTooltip term="SET_TYPES" align="right">
                <span>
                  <strong className="text-rose-400">W/T/F/D/RP:</strong> tipos de série
                </span>
              </SmartTermTooltip>
            </span>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 mt-1 block landscape:hidden lg:landscape:block">
          💡 Passe o mouse ou toque em qualquer termo técnico (RPE, RIR, 1RM, etc.) durante o treino para ver como sentir a falha técnica.
        </span>

        {/* Grade Detalhada de Termos para Iniciantes (Expansível) */}
        {isLegendsExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 landscape:grid-cols-3 gap-2 text-left animate-fadeIn">
            <div className="p-2.5 rounded-xl bg-[#090f1d] border border-slate-800/90">
              <div className="text-[11px] font-black text-emerald-400 mb-0.5">
                📌 Séries & Repetições (Reps)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>3 séries × 10 reps</strong> significa fazer 10 movimentos seguidos, descansar, e repetir esse bloco por 3 vezes no total.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090f1d] border border-slate-800/90">
              <div className="text-[11px] font-black text-amber-400 mb-0.5">
                🎯 RIR (Repetições na Reserva)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Quantas repetições você <strong>ainda aguentaria fazer</strong> antes de travar. Ex: <strong>RIR 2</strong> = parou sentindo que cabiam mais 2. <strong>RIR 0</strong> = falha total.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090f1d] border border-slate-800/90">
              <div className="text-[11px] font-black text-sky-400 mb-0.5">
                🔥 RPE (Percepção de Esforço 6 a 10)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Nota de quão difícil foi a série: <strong>RPE 10</strong> = limite máximo (0 sobrando); <strong>RPE 9</strong> = sobrou 1; <strong>RPE 8</strong> = sobraram 2; <strong>RPE 6–7</strong> = leve/moderado.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090f1d] border border-slate-800/90">
              <div className="text-[11px] font-black text-purple-400 mb-0.5">
                🏋️ 1RM e 6RM (Força Máxima)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Cálculo automático de quanto peso você aguentaria levantar em <strong>1 repetição única (1RM)</strong> ou <strong>6 repetições (6RM)</strong>, usado para medir sua evolução.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090f1d] border border-slate-800/90">
              <div className="text-[11px] font-black text-rose-400 mb-0.5">
                ⚡ Tipos de Série (W, T, F, D, RP)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>W:</strong> Aquecimento (peso leve) · <strong>T:</strong> Série principal · <strong>F:</strong> Até a falha · <strong>D (Drop-set):</strong> reduz 20% do peso sem descanso · <strong>RP:</strong> pausa 15s + reps extras.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090f1d] border border-slate-800/90">
              <div className="text-[11px] font-black text-teal-400 mb-0.5">
                🏆 PR & Bi-set (Super-série)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>PR (Recorde Pessoal):</strong> quando você bate seu maior peso ou volume histórico. <strong>Bi-set:</strong> fazer 2 exercícios seguidos e só descansar após o segundo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 1. Header do Treino Ativo (Compacto & Adaptado para Paisagem em Smartphones/Tablets) */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 sm:p-4 landscape:p-3 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBackToList}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
              title="Voltar à lista de treinos"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  {routine.letter}
                </span>
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  {routine.name}
                </h1>
                <span className="text-[11px] text-slate-400 hidden xs:inline truncate">
                  · {routine.subtitle}
                </span>
              </div>
            </div>
          </div>

          {/* Duração & Progresso */}
          <div className="flex items-center gap-2 shrink-0 font-mono">
            <div className="px-2.5 py-1 rounded-xl bg-[#080d19] border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white text-xs">{formatElapsed(elapsedSecs)}</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center gap-1">
              <span>{completedSets}/{totalSets}</span>
              <span className="text-[10px] text-emerald-400/80">({progressPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Fina */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Em modo Paisagem (Landscape), divide Periodização (Rep-Target) e Índice Rápido de Exercícios lado a lado */}
        <div
          className={
            workoutItems.length > 1
              ? 'mt-2.5 grid grid-cols-1 landscape:grid-cols-12 gap-2.5 items-stretch'
              : 'mt-2.5'
          }
        >
          {/* Badge Dinâmico 'Rep-Target' de Periodização (Força 3-5 | Hipertrofia 8-12 | Metabólico 15+) */}
          <div
            className={`${
              workoutItems.length > 1 ? 'landscape:col-span-6' : ''
            } p-2.5 sm:p-3 landscape:p-2.5 rounded-xl border transition-all duration-300 flex flex-col justify-center ${
              activePhase === 'strength'
                ? 'bg-amber-950/25 border-amber-500/35 shadow-sm shadow-amber-500/5'
                : activePhase === 'metabolic'
                ? 'bg-purple-950/25 border-purple-500/35 shadow-sm shadow-purple-500/5'
                : 'bg-emerald-950/25 border-emerald-500/35 shadow-sm shadow-emerald-500/5'
            }`}
          >
            <div className="flex flex-col sm:flex-row landscape:flex-col xl:landscape:flex-row sm:items-center xl:landscape:items-center justify-between gap-2">
              {/* Identificador principal do Rep-Target */}
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`px-2 py-1 rounded-lg border font-mono font-black text-[11px] flex items-center gap-1 shrink-0 shadow-inner ${
                    activePhase === 'strength'
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                      : activePhase === 'metabolic'
                      ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                      : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>META DE REPS: {currentPhaseConfig.repRange}</span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs font-black tracking-tight ${
                        activePhase === 'strength'
                          ? 'text-amber-300'
                          : activePhase === 'metabolic'
                          ? 'text-purple-300'
                          : 'text-emerald-300'
                      }`}
                    >
                      {currentPhaseConfig.label} ({currentPhaseConfig.repBadge})
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 text-slate-300">
                      {currentPhaseConfig.intensityPct} · {currentPhaseConfig.rirTarget}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {currentPhaseConfig.stimulus} · Descanso ~{currentPhaseConfig.restRecommended}s
                  </p>
                </div>
              </div>

              {/* Pílulas de Destaque das 3 Fases de Periodização (Seleção/Destaque em 1 Toque) */}
              <div
                className="grid grid-cols-3 gap-1 bg-[#080d19] p-1 rounded-xl border border-slate-800 shrink-0"
                role="group"
                aria-label="Fase da Estratégia de Periodização (Rep-Target)"
              >
                {/* 1. FORÇA (3-5) */}
                <button
                  type="button"
                  onClick={() => handleSelectPhase('strength')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activePhase === 'strength'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/70 font-semibold'
                  }`}
                  title="Fase de Força Pura: 3 a 5 repetições com alta carga neural (85-92% 1RM)"
                >
                  <Dumbbell className="w-3 h-3 shrink-0" />
                  <span>Força</span>
                  <span className={activePhase === 'strength' ? 'text-slate-950 font-black' : 'text-amber-400/80'}>
                    3-5
                  </span>
                </button>

                {/* 2. HIPERTROFIA (8-12) */}
                <button
                  type="button"
                  onClick={() => handleSelectPhase('hypertrophy')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activePhase === 'hypertrophy'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/70 font-semibold'
                  }`}
                  title="Fase de Hipertrofia Mecânica: 8 a 12 repetições para volume e tensão mecânica (70-80% 1RM)"
                >
                  <Flame className="w-3 h-3 shrink-0" />
                  <span>Hipertrofia</span>
                  <span className={activePhase === 'hypertrophy' ? 'text-slate-950 font-black' : 'text-emerald-400/80'}>
                    8-12
                  </span>
                </button>

                {/* 3. METABÓLICO (15+) */}
                <button
                  type="button"
                  onClick={() => handleSelectPhase('metabolic')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activePhase === 'metabolic'
                      ? 'bg-purple-500 text-slate-950 font-black shadow-md shadow-purple-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/70 font-semibold'
                  }`}
                  title="Fase Metabólica: 15+ repetições para estresse metabólico, resistência e oclusão (55-65% 1RM)"
                >
                  <Zap className="w-3 h-3 shrink-0" />
                  <span>Metabólico</span>
                  <span className={activePhase === 'metabolic' ? 'text-slate-950 font-black' : 'text-purple-400/80'}>
                    15+
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Índice de Navegação Rápida por Exercício (Lado a Lado no Modo Paisagem) */}
          {workoutItems.length > 1 && (
            <div className="landscape:col-span-6 p-2.5 rounded-xl bg-[#0b1220] border border-slate-800/90 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Navegação Rápida ({workoutItems.length} exercícios):
                </span>
                <div className="flex items-center gap-1.5">
                  {nextIncompleteExerciseIndex !== -1 && completedSets > 0 && (
                    <button
                      type="button"
                      onClick={() => scrollToExercise(nextIncompleteExerciseIndex)}
                      className="px-2 py-0.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[10px] font-bold cursor-pointer active:scale-95"
                    >
                      Ir p/ Próximo (#{nextIncompleteExerciseIndex + 1}) ➔
                    </button>
                  )}
                  {exerciseCompletionStats.some((st) => st.isComplete) &&
                    !exerciseCompletionStats.every((st) => st.isComplete) && (
                      <button
                        type="button"
                        onClick={() => setHideCompletedExercises((prev) => !prev)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 ${
                          hideCompletedExercises
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {hideCompletedExercises ? 'Mostrar Todos' : 'Ocultar Concluídos'}
                      </button>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {workoutItems.map((it, idx) => {
                  const st = exerciseCompletionStats[idx];
                  const isNextTarget = idx === nextIncompleteExerciseIndex;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        if (hideCompletedExercises && st?.isComplete) {
                          setHideCompletedExercises(false);
                          setTimeout(() => scrollToExercise(idx), 60);
                        } else {
                          scrollToExercise(idx);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                        st?.isComplete
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : isNextTarget
                          ? 'bg-sky-500/20 text-white border-sky-400/60 ring-1 ring-sky-400/30'
                          : 'bg-[#080d19] text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-mono font-black text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-sky-400">
                        #{idx + 1}
                      </span>
                      <span className="max-w-[115px] sm:max-w-[150px] truncate">
                        {it.exercise.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-extrabold ${
                          st?.isComplete ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {st?.isComplete ? '✓' : `${st?.doneCount || 0}/${it.sets}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Alertas de Recordes Batidos e Aquecimento Articular (Lado a Lado em Paisagem quando ambos visíveis) */}
        {(beatenSetsCount > 0 || completedSets === 0) && (
          <div className="mt-2.5 grid grid-cols-1 landscape:grid-cols-2 gap-2">
            {beatenSetsCount > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <Flame className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
                  <span>{beatenSetsCount} {beatenSetsCount === 1 ? 'série bateu' : 'séries bateram'} o histórico anterior!</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                  +2.5% a 5% próx.
                </span>
              </div>
            )}

            {completedSets === 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-300 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Aquecimento articular ({mobilityRoutine.totalExercises} etapas · ~{mobilityRoutine.totalDurationMinutes} min)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobilityOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 cursor-pointer shadow-sm transition-all active:scale-95"
                >
                  Iniciar Aquecimento
                </button>
              </div>
            )}
          </div>
        )}

        {/* Banner de Treino 100% Concluído (Acesso Rápido no Topo para Salvar sem precisar rolar a página) */}
        {totalSets > 0 && completedSets === totalSets && (
          <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-400/50 flex flex-col sm:flex-row landscape:flex-row items-center justify-between gap-2.5 animate-fadeIn shadow-lg">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-extrabold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>🎉 Parabéns! Todas as {totalSets} séries de hoje foram concluídas!</span>
            </div>
            <button
              type="button"
              onClick={onFinishSession}
              className="w-full sm:w-auto landscape:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 shrink-0"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Concluir & Salvar Treino Agora</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Barra Unificada de Visualização, Layout Paisagem das Séries e Ferramentas Rápidas */}
      <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 shadow-md space-y-2.5 landscape:space-y-0 landscape:grid landscape:grid-cols-12 landscape:gap-3 landscape:items-center">
        {/* Esquerda / Topo: Seletor de Modo de Visualização (Padrão / Compacto / Modo Foco) */}
        <div className="landscape:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold text-white block leading-tight">
                Visualização ({workoutItems.length} {workoutItems.length === 1 ? 'exercício' : 'exercícios'}):
              </span>
              <span className="text-[10px] text-slate-400 truncate block">
                {displayMode === 'foco'
                  ? 'Carrossel 1-Mão: exibe 1 exercício por vez'
                  : displayMode === 'compacto'
                  ? 'Compacto: expande o exercício atual e recolhe os demais'
                  : 'Padrão: exibe todos os exercícios abertos'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-[#060a12] p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => handleChangeDisplayMode('padrao')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                displayMode === 'padrao'
                  ? 'bg-slate-800 text-white border border-slate-600 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Exibir lista completa com todos os exercícios expandidos"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Padrão</span>
            </button>

            <button
              type="button"
              onClick={() => handleChangeDisplayMode('compacto')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                displayMode === 'compacto'
                  ? 'bg-sky-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-sky-300'
              }`}
              title="Manter apenas o exercício atual expandido e recolher automaticamente os não iniciados"
            >
              <Minimize2 className="w-3.5 h-3.5 shrink-0" />
              <span>Compacto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (nextIncompleteExerciseIndex !== -1) {
                  setFocusedExerciseIdx(nextIncompleteExerciseIndex);
                }
                handleChangeDisplayMode('foco');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                displayMode === 'foco'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
              title="Modo Foco 1-Mão: exibe apenas o exercício atual em destaque estilo carrossel"
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>Modo Foco</span>
            </button>
          </div>
        </div>

        {/* Direita / Base: Seletor de Layout de Cards de Série em Paisagem + Ferramentas Rápidas */}
        <div className="landscape:col-span-5 flex items-center justify-between landscape:justify-end gap-1.5 pt-2 landscape:pt-0 border-t landscape:border-t-0 border-slate-800/80 overflow-x-auto no-scrollbar">
          {/* Seletor de Layout dos Cards de Série no Modo Paisagem (Grade 2-3 Cols vs Faixa Horizontal) */}
          <div
            className="inline-flex items-center gap-1 bg-[#060a12] p-1 rounded-xl border border-slate-800 shrink-0"
            role="group"
            aria-label="Layout dos cards de série em modo paisagem"
          >
            <button
              type="button"
              onClick={() => handleChangeLandscapeSetLayout('grid')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                landscapeSetLayout === 'grid'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modo Paisagem em Grade: organiza os cards de série lado a lado (2 a 3 colunas)"
            >
              <LayoutGrid className="w-3 h-3 text-sky-400 shrink-0" />
              <span>Séries: Grade</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeLandscapeSetLayout('inline')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                landscapeSetLayout === 'inline'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modo Paisagem em Linha: exibe cada série em uma faixa horizontal larga"
            >
              <Rows3 className="w-3 h-3 text-sky-400 shrink-0" />
              <span>Linha</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão de Aquecimento Articular Específico */}
            <button
              type="button"
              onClick={() => setIsMobilityOpen(true)}
              className="flex py-1.5 px-2.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Rotina de Aquecimento Articular Específica (3-5 min)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Mobilidade</span>
            </button>

            {/* Exportar Ficha PDF */}
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="flex py-1.5 px-2.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Exportar ou imprimir Ficha de Treino em PDF A4"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>PDF</span>
            </button>

            {/* Adicionar Exercício */}
            <button
              type="button"
              onClick={onOpenAddExercise}
              className="flex py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Adicionar novo exercício ao treino ativo"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exercício</span>
            </button>

            {/* Mobile 3-Dots Menu for Active Workout Tools */}
            <div className="relative sm:hidden landscape:hidden" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setShowToolsMenu((prev) => !prev)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                title="Ferramentas do treino"
                aria-label="Ferramentas do treino"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showToolsMenu && (
                <div className="absolute right-0 top-9 w-56 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-30 animate-fadeIn space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      setIsMobilityOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-950/40 text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="block font-bold">Aquecimento Articular</span>
                      <span className="block text-[10px] text-slate-400">3-5 min de mobilidade específica</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      setIsPdfModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 text-left transition-colors cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="block font-bold">Exportar Ficha PDF</span>
                      <span className="block text-[10px] text-slate-400">Folha A4 imprimível de academia</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Navegação Carrossel Passo a Passo quando no Modo Foco */}
      {displayMode === 'foco' && workoutItems.length > 0 && (
        <div className="bg-gradient-to-r from-[#0c1629] via-[#0f1d33] to-[#0c1629] border border-emerald-500/40 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
          <button
            type="button"
            disabled={focusedExerciseIdx <= 0}
            onClick={() => {
              setFocusedExerciseIdx((prev) => Math.max(0, prev - 1));
              soundManager.vibrate(15);
            }}
            className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-emerald-400" />
            <span>Anterior</span>
          </button>

          <div className="text-center min-w-0 flex-1 px-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-black block">
              Modo Foco 1-Mão · Exercício {focusedExerciseIdx + 1} de {workoutItems.length}
            </span>
            <span className="text-xs sm:text-sm font-black text-white truncate block">
              {workoutItems[focusedExerciseIdx]?.exercise.name}
            </span>
          </div>

          <button
            type="button"
            disabled={focusedExerciseIdx >= workoutItems.length - 1}
            onClick={() => {
              setFocusedExerciseIdx((prev) => Math.min(workoutItems.length - 1, prev + 1));
              soundManager.vibrate(15);
            }}
            className="min-h-[42px] px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-35 disabled:cursor-not-allowed text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
          >
            <span>Próximo</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* 3. Lista de Exercícios Ativos (Com MemoizedWorkoutItemRow, Suporte a Foco/Compacto e Cards de Série em Paisagem) */}
      <div className="space-y-3">
        {workoutItems.map((item, index) => {
          if (displayMode === 'foco' && index !== focusedExerciseIdx) {
            return null;
          }

          const isExComplete = exerciseCompletionStats[index]?.isComplete;
          if (displayMode !== 'foco' && hideCompletedExercises && isExComplete) {
            return null;
          }

          const isBisetFirst = Boolean(bisetPairs[item.id] && index < workoutItems.length - 1);
          const prevItem = index > 0 ? workoutItems[index - 1] : undefined;
          const nextItem = index < workoutItems.length - 1 ? workoutItems[index + 1] : undefined;
          const isSecondInBiset = Boolean(prevItem && bisetPairs[prevItem.id]);

          // No modo Super Compacto, mantém expandido apenas o exercício atual em andamento (ou seu par de bi-set)
          const activeTargetIdx = nextIncompleteExerciseIndex !== -1 ? nextIncompleteExerciseIndex : 0;
          const shouldForceCollapse =
            displayMode === 'foco'
              ? false
              : displayMode === 'compacto'
              ? index !== activeTargetIdx && !(index - 1 === activeTargetIdx && isSecondInBiset)
              : undefined;

          return (
            <MemoizedWorkoutItemRow
              key={item.id}
              item={item}
              index={index}
              totalItems={workoutItems.length}
              logs={logs}
              history={history}
              sessions={sessions}
              targetMuscleRir={muscleTargetRir?.[item.muscleKey as MuscleGroup]}
              isBisetFirst={isBisetFirst}
              isSecondInBiset={isSecondInBiset}
              nextExerciseName={nextItem?.exercise.name}
              prevExerciseName={prevItem?.exercise.name}
              isDragging={draggingIdx === index}
              isDropTarget={dropTargetIdx === index && draggingIdx !== index}
              forceCollapsed={shouldForceCollapse}
              landscapeSetLayout={landscapeSetLayout}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDeleteExercise={onDeleteExercise}
              onUpdateLog={onUpdateLog}
              onToggleSet={onToggleSet}
              onUpdateRest={onUpdateRest}
              onOpenWarmup={onOpenWarmup}
              onOpenSwap={onOpenSwap}
              onAddSet={onAddSet}
              onRemoveSet={onRemoveSet}
              onOpenAnalytics={onOpenAnalytics}
              onToggleBisetWithNext={handleToggleBisetWithNext}
              onDragStartCard={handleDragStartCard}
              onDragOverCard={handleDragOverCard}
              onDropCard={handleDropCard}
              onDragEndCard={handleDragEndCard}
              onPointerDownDragHandle={handlePointerDownDragHandle}
            />
          );
        })}
      </div>

      {/* 4 & 5. Rodapé Responsivo em Paisagem: Anotações do Treino + Ações de Conclusão/Cancelamento Lado a Lado */}
      <div className="grid grid-cols-1 landscape:grid-cols-12 gap-3 items-stretch">
        {/* 4. Anotações do Treino com Auto-Save Debounced */}
        <div className="landscape:col-span-7 bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-slate-300">
              <FileEdit className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Anotações do Treino
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {notesSaveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Salvando...</span>
                </span>
              )}
              {notesSaveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Salvo</span>
                </span>
              )}
              {notesSaveStatus === 'idle' && localNotes.trim().length > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Auto-salvo
                </span>
              )}
            </div>
          </div>
          <textarea
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Observações rápidas: carga subiu fácil, dor zero, etc."
            rows={2}
            className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors resize-none font-medium leading-relaxed"
          />
        </div>

        {/* 5. Ações Finais de Conclusão / Cancelamento */}
        <div className="landscape:col-span-5 p-3.5 rounded-2xl bg-[#090d19] border border-slate-800 flex flex-col sm:flex-row landscape:flex-col items-center justify-center gap-2.5 shadow-lg">
          <button
            type="button"
            onClick={onFinishSession}
            className="w-full sm:w-auto landscape:w-full flex-1 py-3.5 px-5 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Concluir & Salvar Treino</span>
          </button>

          {isConfirmingCancel ? (
            <div className="w-full sm:w-auto landscape:w-full flex items-center justify-between gap-2 bg-slate-900 border border-rose-500/40 p-1.5 rounded-xl animate-fadeIn">
              <span className="text-xs text-rose-300 font-bold px-1.5">Descartar treino?</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmingCancel(false);
                    onDiscardSession();
                  }}
                  className="py-2 px-3 rounded-lg font-black text-xs bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-all shadow-md active:scale-95"
                >
                  Sim, Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingCancel(false)}
                  className="py-2 px-2.5 rounded-lg font-bold text-xs bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingCancel(true)}
              className="w-full sm:w-auto landscape:w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancelar Treino</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Aquecimento Articular Guiado (Lazy Loaded) */}
      {isMobilityOpen && (
        <Suspense fallback={null}>
          <JointMobilityModal
            isOpen={isMobilityOpen}
            onClose={() => setIsMobilityOpen(false)}
            routine={mobilityRoutine}
            routineTitle={routine.name}
          />
        </Suspense>
      )}

      {/* Modal de Exportação de Ficha PDF A4 (Lazy Loaded) */}
      {isPdfModalOpen && (
        <Suspense fallback={null}>
          <WorkoutPdfExportModal
            isOpen={isPdfModalOpen}
            onClose={() => setIsPdfModalOpen(false)}
            routine={{ ...routine, items: workoutItems }}
          />
        </Suspense>
      )}
    </div>
  );
};
