/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Flame, 
  RefreshCw, 
  Check, 
  CheckCircle2,
  AlertCircle,
  Plus, 
  Trash2, 
  TrendingUp, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Pencil, 
  Zap,
  Save,
  Target,
  Dumbbell,
  Minus,
  MoreVertical,
  HelpCircle,
  Sparkles,
  Copy,
  Trophy,
  Calculator,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Mic,
  MicOff
} from 'lucide-react';
import { WorkoutItem, WorkoutLogs, WorkoutSessionSummary, SET_INTENSITY_TYPES, SetIntensityType } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculate1RM, calculate6RM, estimateNextSetWeight, safeStorage } from '../utils/storage';
import { authStorage } from '../utils/auth';
import { getOptimalProgressionSuggestion } from '../utils/progressiveOverload';
import { soundManager } from '../utils/audio';
import { getExerciseHistoricalPR, checkSetPR } from '../utils/prEngine';
import { SmartTermTooltip } from './SmartTermTooltip';
import { isWebSpeechSupported, createSpeechRecognizer } from '../utils/voiceInput';

interface ExerciseCardProps {
  item: WorkoutItem;
  index: number;
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions?: WorkoutSessionSummary[];
  onUpdateLog: (key: string, field: 'weight' | 'reps' | 'rpe' | 'rir' | 'setType', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onOpenWarmup: (name: string, targetWeight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onUpdateRest?: (index: number, newRest: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDeleteExercise?: (index: number) => void;
  targetMuscleRir?: number;
  isBisetWithNext?: boolean;
  isSecondInBiset?: boolean;
  nextExerciseName?: string;
  prevExerciseName?: string;
  onToggleBisetWithNext?: (index: number) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStartCard?: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragOverCard?: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDropCard?: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEndCard?: () => void;
  onPointerDownDragHandle?: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  forceCollapsed?: boolean;
  landscapeSetLayout?: 'grid' | 'inline';
}

export function areExerciseLogsEqualForCard(
  exerciseId: string,
  setsCount: number,
  prevLogs: WorkoutLogs,
  nextLogs: WorkoutLogs
): boolean {
  if (prevLogs === nextLogs) return true;
  const maxSets = Math.max(setsCount, 10);
  for (let s = 1; s <= maxSets; s++) {
    const key = `${exerciseId}_${s}`;
    const a = prevLogs[key];
    const b = nextLogs[key];
    if (a === b) continue;
    if (!a || !b) return false;
    if (
      a.weight !== b.weight ||
      a.reps !== b.reps ||
      a.rpe !== b.rpe ||
      a.rir !== b.rir ||
      a.done !== b.done ||
      a.setType !== b.setType
    ) {
      return false;
    }
  }
  return true;
}

export function areExerciseCardPropsEqual(
  prev: ExerciseCardProps,
  next: ExerciseCardProps
): boolean {
  if (
    prev.index !== next.index ||
    prev.canMoveUp !== next.canMoveUp ||
    prev.canMoveDown !== next.canMoveDown ||
    prev.targetMuscleRir !== next.targetMuscleRir ||
    prev.isBisetWithNext !== next.isBisetWithNext ||
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

// RPE de 6 a 10 com cálculo automático de RIR (RIR = 10 - RPE)
const RPE_PRESETS = [
  { rpe: 6,  rir: 4, label: 'RPE 6', rirDesc: 'RIR 4 (4 reps sobram)', color: 'text-slate-300' },
  { rpe: 7,  rir: 3, label: 'RPE 7', rirDesc: 'RIR 3 (3 reps sobram)', color: 'text-sky-300' },
  { rpe: 8,  rir: 2, label: 'RPE 8', rirDesc: 'RIR 2 (2 reps sobram · Hipertrofia ideal)', color: 'text-emerald-300' },
  { rpe: 9,  rir: 1, label: 'RPE 9', rirDesc: 'RIR 1 (1 rep sobra · Muito pesado)', color: 'text-amber-300' },
  { rpe: 10, rir: 0, label: 'RPE 10', rirDesc: 'RIR 0 (Falha concêntrica total)', color: 'text-rose-300' },
];

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  item,
  index,
  logs,
  history,
  sessions = [],
  onUpdateLog,
  onToggleSet,
  onOpenWarmup,
  onOpenSwap,
  onAddSet,
  onRemoveSet,
  onUpdateRest,
  onOpenAnalytics,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
  targetMuscleRir,
  isBisetWithNext = false,
  isSecondInBiset = false,
  nextExerciseName,
  prevExerciseName,
  onToggleBisetWithNext,
  isDragging = false,
  isDropTarget = false,
  onDragStartCard,
  onDragOverCard,
  onDropCard,
  onDragEndCard,
  onPointerDownDragHandle,
  forceCollapsed,
  landscapeSetLayout = 'grid',
}) => {
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({});
  const [isCardCollapsed, setIsCardCollapsed] = useState<boolean>(() => Boolean(forceCollapsed));

  useEffect(() => {
    if (forceCollapsed !== undefined) {
      setIsCardCollapsed(forceCollapsed);
    }
  }, [forceCollapsed]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [show1RMCalculator, setShow1RMCalculator] = useState(false);
  const [formula1RM, setFormula1RM] = useState<'epley' | 'brzycki'>('epley');
  const menuRef = useRef<HTMLDivElement>(null);

  // Estado para Preenchimento por Voz (Web Speech API)
  const [listeningLogKey, setListeningLogKey] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceFeedback, setVoiceFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const recognizerRef = useRef<{ stop: () => void; abort: () => void } | null>(null);

  useEffect(() => {
    return () => {
      recognizerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const ex = item.exercise;
  const muscleName = MUSCLE_NAMES[item.muscleKey] || item.muscleKey;

  // 1. Estado local para inputs com mecanismo de auto-save debounced contínuo
  // Padrão de RPE é 6 (o que entrega RIR 4: 10 - 6 = 4)
  const [localLogs, setLocalLogs] = useState<Record<string, { weight: string; reps: string; rpe: string; rir: string }>>(() => {
    const initial: Record<string, { weight: string; reps: string; rpe: string; rir: string }> = {};
    for (let s = 1; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      const log = logs[k];
      const initialRpe = log?.rpe || (log?.rir ? (10 - parseInt(log.rir, 10)).toString() : '6');
      const rpeNum = parseInt(initialRpe, 10) || 6;
      const initialRir = (10 - rpeNum).toString();

      initial[k] = {
        weight: log?.weight || '',
        reps: log?.reps || '',
        rpe: initialRpe,
        rir: log?.rir || initialRir,
      };
    }
    return initial;
  });

  // Estado visual do auto-salvamento: 'idle' | 'saving' | 'saved'
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2. Toggle de ativação do Smart Rest automático para RPE 9 ou 10 (RIR 1 ou 0)
  const [isSmartRestEnabled, setIsSmartRestEnabled] = useState<boolean>(() => {
    return safeStorage.get(`smart_rest_enabled_${ex.id}`, true);
  });
  const autoRestAppliedSetsRef = useRef<Set<string>>(new Set());

  // Estado para abrir/fechar tooltip de Smart RIR Suggestion no mobile/touch
  const [activeRirTooltipKey, setActiveRirTooltipKey] = useState<string | null>(null);

  // Sincroniza estado local quando as logs dos props mudarem externamente
  useEffect(() => {
    if (autoSaveStatus === 'saving') return;
    setLocalLogs((prev) => {
      const next = { ...prev };
      let changed = false;
      for (let s = 1; s <= item.sets; s++) {
        const k = `${ex.id}_${s}`;
        const ext = logs[k];
        if (ext) {
          const rpeVal = ext.rpe || (ext.rir ? (10 - parseInt(ext.rir, 10)).toString() : next[k]?.rpe || '6');
          const rirVal = ext.rir || (10 - (parseInt(rpeVal, 10) || 6)).toString();

          if (
            (ext.weight !== undefined && ext.weight !== next[k]?.weight) ||
            (ext.reps !== undefined && ext.reps !== next[k]?.reps) ||
            (ext.rpe !== undefined && ext.rpe !== next[k]?.rpe) ||
            (ext.rir !== undefined && ext.rir !== next[k]?.rir)
          ) {
            next[k] = {
              weight: ext.weight || '',
              reps: ext.reps || '',
              rpe: rpeVal,
              rir: rirVal,
            };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [logs, item.sets, ex.id, autoSaveStatus]);

  // Limpa debounce ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Helper de persistência imediata no storage isolado
  const persistLogsToStorageDirectly = (
    logKey: string,
    partial: Partial<{ weight: string; reps: string; rpe: string; rir: string; setType: SetIntensityType; done: boolean }>
  ) => {
    try {
      const activeUser = authStorage.getActiveUser();
      const storageKey = activeUser ? `alex_u_${activeUser.id}_current_logs` : 'alex_guest_current_logs';
      const stored = safeStorage.get<WorkoutLogs>(storageKey, {});
      stored[logKey] = {
        ...(stored[logKey] || { done: false, weight: '', reps: '' }),
        ...partial,
        timestamp: Date.now(),
      };
      safeStorage.set(storageKey, stored);
    } catch {
      // Storage safe fallback
    }
  };

  const handleUpdateSetType = (logKey: string, newType: SetIntensityType) => {
    onUpdateLog(logKey, 'setType', newType);
    if (newType === 'F') {
      handleUpdateRpe(logKey, 10);
    } else if (newType === 'W') {
      handleUpdateRpe(logKey, 6);
    } else {
      persistLogsToStorageDirectly(logKey, { setType: newType });
    }
    soundManager.vibrate(20);
  };

  // Digitação de peso / reps com persistência debounced e atualização imediata de estado
  const handleInputChange = (logKey: string, field: 'weight' | 'reps', value: string) => {
    setLocalLogs((prev) => ({
      ...prev,
      [logKey]: {
        ...(prev[logKey] || { weight: '', reps: '', rpe: '6', rir: '4' }),
        [field]: value,
      },
    }));

    // Atualiza estado pai (que já persiste em safeStorage via useEffect)
    onUpdateLog(logKey, field, value);
    setAutoSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistLogsToStorageDirectly(logKey, { [field]: value });
      setAutoSaveStatus('saved');
      setTimeout(() => {
        setAutoSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
      }, 1500);
    }, 300);
  };

  // Analisador Inteligente de Sobrecarga Progressiva (Memoizado para evitar recálculo a cada renderização local)
  const progression = useMemo(
    () => getOptimalProgressionSuggestion(ex, item.reps, history, logs, sessions),
    [ex, item.reps, history, logs, sessions]
  );

  // Busca a última sessão que continha este exercício para histórico de 6RM
  const prevSessionExercise = useMemo(() => {
    for (const sess of sessions) {
      const match = sess.completedExercises.find(
        (ce) => ce.name.toLowerCase() === ex.name.toLowerCase()
      );
      if (match && match.sets.length > 0) {
        return match;
      }
    }
    return null;
  }, [sessions, ex.name]);

  // Recorde Pessoal Histórico (PR) deste exercício
  const historicalPR = useMemo(() => {
    return getExerciseHistoricalPR(ex.name, sessions, history);
  }, [ex.name, sessions, history]);

  // Base consolidada de séries anteriores com RPE/RIR para calibrar o Smart RIR Suggestion
  const historicalExerciseSets = useMemo(() => {
    const records: Array<{
      weight: number;
      reps: number;
      rpe: number;
      rir: number;
      setIndex: number;
      dateLabel: string;
    }> = [];

    // 1. Sessões concluídas (da mais recente para a mais antiga)
    for (const sess of sessions) {
      const match = sess.completedExercises.find(
        (ce) => ce.name.toLowerCase() === ex.name.toLowerCase()
      );
      if (match && match.sets.length > 0) {
        const dLabel = new Date(sess.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
        match.sets.forEach((s, idx) => {
          if (s.weight > 0 && s.reps > 0) {
            const parsedRpe = s.rpe
              ? Math.min(10, Math.max(6, Math.round(parseFloat(s.rpe))))
              : s.rir !== undefined
              ? Math.min(10, Math.max(6, 10 - (parseInt(s.rir, 10) || 2)))
              : 8;
            records.push({
              weight: s.weight,
              reps: s.reps,
              rpe: parsedRpe,
              rir: 10 - parsedRpe,
              setIndex: idx,
              dateLabel: dLabel,
            });
          }
        });
      }
    }

    // 2. Complemento com o mapa `history` persistido para este ID de exercício
    for (let s = 1; s <= 10; s++) {
      const hk = `${ex.id}_${s}`;
      const hEntry = history[hk];
      if (hEntry && hEntry.weight && hEntry.reps) {
        const w = parseFloat(hEntry.weight) || 0;
        const r = parseInt(hEntry.reps, 10) || 0;
        if (w > 0 && r > 0) {
          const parsedRpe = hEntry.rpe
            ? Math.min(10, Math.max(6, Math.round(parseFloat(hEntry.rpe))))
            : hEntry.rir
            ? Math.min(10, Math.max(6, 10 - (parseInt(hEntry.rir, 10) || 2)))
            : 8;
          records.push({
            weight: w,
            reps: r,
            rpe: parsedRpe,
            rir: 10 - parsedRpe,
            setIndex: s - 1,
            dateLabel: 'Último treino',
          });
        }
      }
    }

    return records;
  }, [sessions, history, ex.name, ex.id]);

  // Função para replicar a série anterior imediatamente acima com 1 toque
  const handleReplicateSet = (targetSetNum: number, sourceSetNum: number) => {
    const sourceKey = `${ex.id}_${sourceSetNum}`;
    const targetKey = `${ex.id}_${targetSetNum}`;
    const src = localLogs[sourceKey] || logs[sourceKey];
    if (!src || !src.weight) return;

    handleInputChange(targetKey, 'weight', src.weight);
    if (src.reps) {
      handleInputChange(targetKey, 'reps', src.reps);
    }
    if (src.rpe) {
      handleUpdateRpe(targetKey, parseInt(src.rpe, 10) || 6);
    }
    soundManager.vibrate(30);
  };

  // Função para preencher todas as séries pendentes com os dados da Série #1
  const handleReplicateFirstSetToAll = () => {
    const firstKey = `${ex.id}_1`;
    const first = localLogs[firstKey] || logs[firstKey];
    if (!first || !first.weight) return;

    for (let s = 2; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      if (!logs[k]?.done) {
        handleInputChange(k, 'weight', first.weight);
        if (first.reps) handleInputChange(k, 'reps', first.reps);
        if (first.rpe) handleUpdateRpe(k, parseInt(first.rpe, 10) || 6);
      }
    }
    soundManager.vibrate([40, 30, 40]);
  };

  // CÁLCULO HISTÓRICO DE 6RM DA ÚLTIMA VEZ QUE O EXERCÍCIO FOI REALIZADO
  const historical6RMSuggestion = useMemo(() => {
    // 1. Procura na última sessão concluída
    if (prevSessionExercise && prevSessionExercise.sets.length > 0) {
      let bestW = 0;
      let bestR = 0;
      let bestRpe: string | undefined = undefined;

      for (const s of prevSessionExercise.sets) {
        if (s.weight > 0 && s.reps > 0) {
          if (s.weight > bestW) {
            bestW = s.weight;
            bestR = s.reps;
            bestRpe = s.rpe || (s.rir ? (10 - parseInt(s.rir, 10)).toString() : undefined);
          }
        }
      }

      if (bestW > 0 && bestR > 0) {
        const val6 = calculate6RM(bestW.toString(), bestR.toString(), bestRpe);
        if (val6 && val6 > 0) {
          return {
            weight: val6,
            source: `Último treino (${bestW}kg × ${bestR} reps${bestRpe ? ` @RPE ${bestRpe}` : ''})`,
            rawWeight: bestW,
            rawReps: bestR,
          };
        }
      }
    }

    // 2. Fallback no histórico isolado
    const histKey = `${ex.id}_1`;
    if (history[histKey]?.weight && history[histKey]?.reps) {
      const hw = parseFloat(history[histKey].weight);
      const hr = parseInt(history[histKey].reps, 10);
      const hrpe = history[histKey].rpe;
      if (hw > 0 && hr > 0) {
        const val6 = calculate6RM(hw.toString(), hr.toString(), hrpe);
        if (val6 && val6 > 0) {
          return {
            weight: val6,
            source: `Histórico anterior (${hw}kg × ${hr} reps)`,
            rawWeight: hw,
            rawReps: hr,
          };
        }
      }
    }

    return null;
  }, [ex.id, prevSessionExercise, history]);

  // Atualização de RPE com botões +/- ou seleção direta (Range: 6 a 10)
  // RPE 6 = RIR 4, RPE 7 = RIR 3, RPE 8 = RIR 2, RPE 9 = RIR 1, RPE 10 = RIR 0
  const handleUpdateRpe = (logKey: string, newRpe: number) => {
    const clampedRpe = Math.max(6, Math.min(10, newRpe));
    const derivedRir = (10 - clampedRpe).toString();
    const rpeStr = clampedRpe.toString();

    setLocalLogs((prev) => ({
      ...prev,
      [logKey]: {
        ...(prev[logKey] || { weight: '', reps: '' }),
        rpe: rpeStr,
        rir: derivedRir,
      },
    }));

    // onUpdateLog('rpe') sincroniza automaticamente o RIR correspondente no estado global
    onUpdateLog(logKey, 'rpe', rpeStr);
    persistLogsToStorageDirectly(logKey, { rpe: rpeStr, rir: derivedRir });

    // Se RPE for 9 ou 10 (RIR 1 ou 0) e Smart Rest estiver ligado, adiciona +30s de descanso
    if (isSmartRestEnabled && clampedRpe >= 9) {
      if (!autoRestAppliedSetsRef.current.has(logKey)) {
        autoRestAppliedSetsRef.current.add(logKey);
        if (onUpdateRest) {
          onUpdateRest(index, item.rest + 30);
        }
      }
    }

    setAutoSaveStatus('saved');
    setTimeout(() => {
      setAutoSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
    }, 1500);
  };

  const handleAdjustRest = (delta: number) => {
    if (onUpdateRest) {
      onUpdateRest(index, Math.max(15, item.rest + delta));
    }
  };

  const handleToggleSmartRest = () => {
    setIsSmartRestEnabled((prev) => {
      const next = !prev;
      safeStorage.set(`smart_rest_enabled_${ex.id}`, next);
      return next;
    });
  };

  // Aplica o 6RM calculado a todas as séries abertas
  const handleApply6RM = (weightVal: number) => {
    for (let s = 1; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      if (!logs[k]?.done) {
        handleInputChange(k, 'weight', weightVal.toString());
      }
    }
  };

  // Comando de Preenchimento por Voz (Web Speech API)
  const handleToggleVoiceInput = (explicitLogKey?: string) => {
    if (!isWebSpeechSupported()) {
      setVoiceFeedback({
        text: 'Seu navegador não suporta ditado por voz.',
        isError: true,
      });
      setTimeout(() => setVoiceFeedback(null), 3500);
      return;
    }

    // Se já estiver ouvindo, encerra a gravação atual
    if (listeningLogKey) {
      recognizerRef.current?.stop();
      setListeningLogKey(null);
      return;
    }

    // Determina a primeira série ainda não concluída se não foi passada explicitamente
    let targetKey = explicitLogKey;
    if (!targetKey) {
      for (let s = 1; s <= item.sets; s++) {
        const k = `${ex.id}_${s}`;
        if (!logs[k]?.done) {
          targetKey = k;
          break;
        }
      }
      if (!targetKey) {
        targetKey = `${ex.id}_1`;
      }
    }

    const targetSetNum = parseInt(targetKey.split('_').pop() || '1', 10);
    setIsCardCollapsed(false);
    setVoiceTranscript('');
    setVoiceFeedback(null);
    setListeningLogKey(targetKey);
    soundManager.vibrate(25);

    const recognizer = createSpeechRecognizer({
      onInterimResult: (transcript) => {
        setVoiceTranscript(transcript);
      },
      onFinalResult: (parsed) => {
        const appliedParts: string[] = [];
        if (parsed.weight) {
          handleInputChange(targetKey!, 'weight', parsed.weight);
          appliedParts.push(`${parsed.weight}kg`);
        }
        if (parsed.reps) {
          handleInputChange(targetKey!, 'reps', parsed.reps);
          appliedParts.push(`${parsed.reps} reps`);
        }
        if (parsed.rpe) {
          handleUpdateRpe(targetKey!, parsed.rpe);
          appliedParts.push(`RPE ${parsed.rpe}`);
        }
        if (parsed.completeSet && (parsed.weight || localLogs[targetKey!]?.weight || logs[targetKey!]?.weight)) {
          if (!logs[targetKey!]?.done) {
            onToggleSet(targetKey!, isBisetWithNext ? 0 : item.rest);
            appliedParts.push('Concluída ✓');
          }
        }

        if (appliedParts.length > 0) {
          soundManager.vibrate([30, 40, 60]);
          setVoiceFeedback({
            text: `🎙️ Série #${targetSetNum}: ${appliedParts.join(' · ')}`,
            isError: false,
          });
        } else {
          setVoiceFeedback({
            text: `Não entendi números em "${parsed.rawTranscript}". Diga ex: "80 quilos 10 repetições RPE 8"`,
            isError: true,
          });
        }
        setTimeout(() => setVoiceFeedback(null), 4000);
      },
      onError: (msg) => {
        setVoiceFeedback({ text: msg, isError: true });
        setListeningLogKey(null);
        setTimeout(() => setVoiceFeedback(null), 4000);
      },
      onEnd: () => {
        setListeningLogKey(null);
      },
    });

    if (recognizer) {
      recognizerRef.current = recognizer;
      try {
        recognizer.start();
      } catch {
        setListeningLogKey(null);
      }
    } else {
      setListeningLogKey(null);
    }
  };

  const firstSetKey = `${ex.id}_1`;
  const firstSetWeight = localLogs[firstSetKey]?.weight || logs[firstSetKey]?.weight || '60';

  // Meta de 1RM para o próximo mês (persistida por exercício)
  const goalStorageKey = `meutreino_1rm_goal_${ex.name.toLowerCase().trim()}`;
  const [monthly1RMGoal, setMonthly1RMGoal] = useState<string>(() => {
    return safeStorage.get<string>(goalStorageKey, '');
  });
  const [goalSavedToast, setGoalSavedToast] = useState(false);

  // Inputs da Calculadora Preditiva de 1RM (pré-preenchidos com a melhor série registrada)
  const bestRecordedSet = useMemo(() => {
    let bestW = 0;
    let bestR = 8;
    for (let s = 1; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      const w = parseFloat(localLogs[k]?.weight || logs[k]?.weight || '0');
      const r = parseInt(localLogs[k]?.reps || logs[k]?.reps || '0', 10);
      if (w > bestW && r > 0) {
        bestW = w;
        bestR = r;
      }
    }
    if (bestW === 0 && prevSessionExercise && prevSessionExercise.sets.length > 0) {
      for (const s of prevSessionExercise.sets) {
        if (s.weight > bestW && s.reps > 0) {
          bestW = s.weight;
          bestR = s.reps;
        }
      }
    }
    if (bestW === 0 && historicalPR.maxWeight > 0) {
      bestW = historicalPR.maxWeight;
      bestR = 8;
    }
    return { weight: bestW || 40, reps: bestR || 8 };
  }, [ex.id, item.sets, localLogs, logs, prevSessionExercise, historicalPR]);

  const [calcWeightInput, setCalcWeightInput] = useState<string>(() => bestRecordedSet.weight.toString());
  const [calcRepsInput, setCalcRepsInput] = useState<string>(() => bestRecordedSet.reps.toString());

  useEffect(() => {
    if (bestRecordedSet.weight > 0) {
      setCalcWeightInput(bestRecordedSet.weight.toString());
      setCalcRepsInput(bestRecordedSet.reps.toString());
    }
  }, [bestRecordedSet.weight, bestRecordedSet.reps]);

  const predictive1RMStats = useMemo(() => {
    const w = parseFloat(calcWeightInput) || 0;
    const r = Math.max(1, Math.min(30, parseInt(calcRepsInput, 10) || 1));
    if (w <= 0) return { epley: 0, brzycki: 0, active1RM: 0 };
    const epley = r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;
    const brzycki = r === 1 ? w : Math.round((w / (1.0278 - 0.0278 * Math.min(29, r))) * 10) / 10;
    const active1RM = formula1RM === 'epley' ? epley : brzycki;
    return { epley, brzycki, active1RM };
  }, [calcWeightInput, calcRepsInput, formula1RM]);

  const handleSaveMonthly1RMGoal = (val: string) => {
    setMonthly1RMGoal(val);
    safeStorage.set(goalStorageKey, val);
    setGoalSavedToast(true);
    soundManager.vibrate(20);
    setTimeout(() => setGoalSavedToast(false), 2000);
  };

  // Topo da faixa de repetições (ex: "8-10" -> 10)
  const targetMaxReps = useMemo(() => {
    const nums = item.reps.match(/\d+/g)?.map(Number) || [10];
    return Math.max(...nums);
  }, [item.reps]);

  // Contagem de séries concluídas neste exercício
  const completedSetsForEx = useMemo(() => {
    let count = 0;
    for (let s = 1; s <= item.sets; s++) {
      if (logs[`${ex.id}_${s}`]?.done) count++;
    }
    return count;
  }, [logs, ex.id, item.sets]);

  const isAllSetsDone = completedSetsForEx === item.sets && item.sets > 0;

  return (
    <div
      id={`exercise-card-${index}`}
      data-exercise-card-index={index}
      draggable={Boolean(onDragStartCard)}
      onDragStart={(e) => onDragStartCard?.(index, e)}
      onDragOver={(e) => onDragOverCard?.(index, e)}
      onDrop={(e) => onDropCard?.(index, e)}
      onDragEnd={() => onDragEndCard?.()}
      className={`active-workout-card bg-slate-900 border rounded-2xl overflow-hidden shadow-lg transition-all scroll-mt-20 ${
        isDragging ? 'card-dragging' : ''
      } ${isDropTarget ? 'card-drop-target' : ''} ${
        isAllSetsDone
          ? 'border-emerald-500/45 ring-1 ring-emerald-500/15'
          : isBisetWithNext || isSecondInBiset
          ? 'border-purple-500/50 ring-1 ring-purple-500/20'
          : 'border-slate-800 hover:border-slate-700/80'
      }`}
    >
      {/* 1. Header do Exercício (Layout Espaçoso & Otimizado para Mobile com Alça de Segurar e Arrastar) */}
      <div className="p-3 sm:p-3.5 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Alça de Segurar e Arrastar (Drag Handle) + Título & Músculo */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 flex-wrap">
            <button
              type="button"
              onPointerDown={(e) => onPointerDownDragHandle?.(index, e)}
              className="drag-handle-touch p-1.5 -ml-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 cursor-grab active:cursor-grabbing flex items-center gap-0.5 shrink-0 transition-all"
              title="Segurar e arrastar para reordenar este exercício"
              aria-label={`Segurar e arrastar exercício ${index + 1}`}
            >
              <GripVertical className="w-4 h-4" />
              <span className="text-[10px] font-mono font-black text-slate-300 pr-0.5">
                #{index + 1}
              </span>
            </button>

            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 shrink-0">
              {muscleName}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-full">
              {ex.name}
            </h3>

            {/* Badge de Progresso de Séries do Exercício */}
            <button
              type="button"
              onClick={() => setIsCardCollapsed((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                isAllSetsDone
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                  : completedSetsForEx > 0
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700'
              }`}
              title={isCardCollapsed ? 'Expandir séries deste exercício' : 'Recolher séries deste exercício'}
            >
              <span>
                {isAllSetsDone ? '✓ Concluído' : `${completedSetsForEx}/${item.sets} séries`}
              </span>
              {isCardCollapsed ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>

            {/* Badge de 6RM histórico */}
            {historical6RMSuggestion && (
              <button
                type="button"
                onClick={() => handleApply6RM(historical6RMSuggestion.weight)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all cursor-pointer shrink-0 active:scale-95"
                title={`${historical6RMSuggestion.source}. Clique para aplicar nas séries abertas.`}
              >
                <Target className="w-3 h-3 text-amber-400" />
                <span>6RM: ~{historical6RMSuggestion.weight}kg</span>
              </button>
            )}

            {/* Badge de RIR Alvo configurado no perfil com Smart Tooltip */}
            {targetMuscleRir !== undefined && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                <Target className="w-3 h-3 text-amber-400" />
                <SmartTermTooltip term="RIR" align="left">
                  <span>RIR Alvo: {targetMuscleRir}</span>
                </SmartTermTooltip>
              </div>
            )}
          </div>

          {/* Menu de 3 Pontos para Ações do Exercício */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Opções do exercício"
              aria-label="Opções do exercício"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu de 3 Pontos */}
            {showMenu && (
              <div className="absolute right-0 top-9 w-56 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-40 animate-fadeIn space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSwap(index);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 transition-colors text-left cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Trocar Exercício</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSwap(index);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <span className="block font-bold">Aparelho Ocupado?</span>
                    <span className="block text-[10px] text-slate-400">Trocar por substituto direto</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenWarmup(ex.name, firstSetWeight);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-300 hover:bg-orange-950/40 transition-colors text-left cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Aquecimento Inteligente</span>
                </button>

                {onOpenAnalytics && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenAnalytics(ex.name);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors text-left cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gráficos & Histórico</span>
                  </button>
                )}

                <div className="pt-1 border-t border-slate-800 flex items-center justify-between px-2 py-1">
                  <span className="text-[11px] text-slate-400 font-medium">Ordem:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!canMoveUp}
                      onClick={() => {
                        onMoveUp?.(index);
                      }}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-semibold ${
                        canMoveUp 
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer' 
                          : 'text-slate-600 cursor-not-allowed'
                      }`}
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>Subir</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canMoveDown}
                      onClick={() => {
                        onMoveDown?.(index);
                      }}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-semibold ${
                        canMoveDown 
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer' 
                          : 'text-slate-600 cursor-not-allowed'
                      }`}
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3 h-3" />
                      <span>Descer</span>
                    </button>
                  </div>
                </div>

                {onDeleteExercise && (
                  <div className="pt-1 border-t border-slate-800">
                    {isDeleting ? (
                      <div className="p-2 bg-rose-950/40 rounded-xl border border-rose-900/50 space-y-1.5">
                        <span className="text-[11px] font-bold text-rose-300 block">Excluir este exercício?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDeleting(false);
                              setShowMenu(false);
                              onDeleteExercise(index);
                            }}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer text-center"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDeleting(false)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-center"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeleting(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Remover do Treino</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sub-header com Ações Rápidas Deslizáveis no Mobile (1-Toque sem precisar abrir menu) */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
            {/* Atalho Rápido 1-Toque: Trocar Exercício / Aparelho Ocupado */}
            <button
              type="button"
              onClick={() => onOpenSwap(index)}
              className="h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30 shrink-0 active:scale-95"
              title="Trocar exercício ou substituir aparelho ocupado"
            >
              <RefreshCw className="w-3 h-3 text-sky-400" />
              <span>Trocar</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSmartRest}
              className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 active:scale-95 ${
                isSmartRestEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Descanso Automático: adiciona +30s de descanso quando a série exigir esforço máximo (RPE 9 ou 10)"
            >
              <Zap className={`w-3 h-3 ${isSmartRestEnabled ? 'fill-emerald-400 text-emerald-400' : 'text-slate-500'}`} />
              <span>Descanso Auto {isSmartRestEnabled ? 'Ativo' : 'Inativo'}</span>
            </button>

            {/* Botão Calculadora Preditiva 1RM + Meta do Próximo Mês */}
            <button
              type="button"
              onClick={() => setShow1RMCalculator((prev) => !prev)}
              className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 active:scale-95 ${
                show1RMCalculator
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
              }`}
              title="Abrir Calculadora Preditiva de 1RM (Epley / Brzycki) e Meta do Próximo Mês"
            >
              <Calculator className="w-3 h-3" />
              <span>
                1RM {predictive1RMStats.active1RM > 0 ? `(~${predictive1RMStats.active1RM}kg)` : 'Preditivo'}
              </span>
              {monthly1RMGoal && (
                <span className="px-1 rounded bg-slate-950/40 text-[10px]">
                  Meta: {monthly1RMGoal}kg
                </span>
              )}
            </button>

            {/* Botão de Aquecimento Rápido */}
            <button
              type="button"
              onClick={() => onOpenWarmup(ex.name, firstSetWeight)}
              className="h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border-orange-500/30 shrink-0 active:scale-95"
              title="Calcular séries de aquecimento para este exercício"
            >
              <Flame className="w-3 h-3 text-orange-400" />
              <span>Aquecer</span>
            </button>

            {/* Botão de Preenchimento por Voz (Web Speech API) */}
            <button
              type="button"
              onClick={() => handleToggleVoiceInput()}
              className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 active:scale-95 ${
                listeningLogKey
                  ? 'bg-rose-500 text-white border-rose-400 font-black animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border-teal-500/30'
              }`}
              title="Ditar carga, repetições e RPE por voz (ex: '80 quilos 10 repetições RPE 8')"
            >
              {listeningLogKey ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-teal-400" />}
              <span>{listeningLogKey ? 'Ouvindo...' : 'Ditar Série'}</span>
            </button>

            {/* Botão de Agrupar Bi-set / Super-série com o próximo exercício */}
            {canMoveDown && onToggleBisetWithNext && (
              <button
                type="button"
                onClick={() => onToggleBisetWithNext(index)}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 active:scale-95 ${
                  isBisetWithNext
                    ? 'bg-purple-500 text-white border-purple-400 font-black shadow-sm'
                    : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/30'
                }`}
                title="Agrupar este exercício em Bi-set / Super-série com o próximo exercício (alterna o cronômetro apenas após o 2º exercício)"
              >
                {isBisetWithNext ? <Unlink className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                <span>{isBisetWithNext ? 'Bi-set Ativo' : 'Bi-set'}</span>
              </button>
            )}

            {isSecondInBiset && (
              <span className="h-7 px-2.5 rounded-lg text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1 shrink-0">
                <Link2 className="w-3 h-3" />
                <span>2º Ex. Bi-set {prevExerciseName ? `(c/ ${prevExerciseName})` : ''}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Salvando...</span>
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Salvo</span>
              </span>
            )}
          </div>
        </div>

        {/* Banner de Feedback / Escuta Ativa do Preenchimento por Voz (Web Speech API) */}
        {(listeningLogKey || voiceFeedback) && (
          <div
            className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 animate-fadeIn ${
              listeningLogKey
                ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                : voiceFeedback?.isError
                ? 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {listeningLogKey ? (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="font-semibold truncate">
                {listeningLogKey
                  ? voiceTranscript
                    ? `Ouvindo: "${voiceTranscript}"...`
                    : '🎙️ Fale agora: ex. "80 quilos, 10 repetições, RPE 8"'
                  : voiceFeedback?.text}
              </span>
            </div>
            {listeningLogKey && (
              <button
                type="button"
                onClick={() => handleToggleVoiceInput()}
                className="px-2 py-0.5 rounded-lg bg-rose-500 text-white font-bold text-[10px] shrink-0 cursor-pointer"
              >
                Parar
              </button>
            )}
          </div>
        )}

        {/* Painel Expansível: Calculadora Preditiva de 1RM (Epley & Brzycki) + Meta do Próximo Mês */}
        {show1RMCalculator && (
          <div className="mt-1 p-3.5 rounded-2xl bg-slate-900/95 border border-amber-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Calculadora Preditiva de 1RM & Meta Mensal
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormula1RM('epley')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    formula1RM === 'epley'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Epley
                </button>
                <button
                  type="button"
                  onClick={() => setFormula1RM('brzycki')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    formula1RM === 'brzycki'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Brzycki
                </button>
              </div>
            </div>

            {/* Simulador de Carga x Reps e Resultado Preditivo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Carga Base (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={calcWeightInput}
                  onChange={(e) => setCalcWeightInput(e.target.value)}
                  className="w-full bg-transparent font-mono font-black text-white text-sm focus:outline-none"
                />
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Repetições Máximas
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={calcRepsInput}
                  onChange={(e) => setCalcRepsInput(e.target.value)}
                  className="w-full bg-transparent font-mono font-black text-white text-sm focus:outline-none"
                />
              </div>
              <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-black uppercase text-amber-300 block">
                  1RM Preditivo ({formula1RM === 'epley' ? 'Epley' : 'Brzycki'})
                </span>
                <span className="text-lg font-mono font-black text-white">
                  {predictive1RMStats.active1RM} kg
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  Epley: {predictive1RMStats.epley}kg · Brzycki: {predictive1RMStats.brzycki}kg
                </span>
              </div>
            </div>

            {/* Zonas de Intensidade (% de 1RM) com 1-Toque para Aplicar */}
            {predictive1RMStats.active1RM > 0 && (
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { pct: 0.9, label: '90% (3-4 reps)' },
                  { pct: 0.85, label: '85% (5-6 reps)' },
                  { pct: 0.8, label: '80% (7-8 reps)' },
                  { pct: 0.75, label: '75% (10-12 reps)' },
                ].map((zone) => {
                  const zoneKg = Math.round(predictive1RMStats.active1RM * zone.pct * 2) / 2;
                  return (
                    <button
                      key={zone.label}
                      type="button"
                      onClick={() => handleApply6RM(zoneKg)}
                      className="p-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                      title="Toque para aplicar esta carga nas séries pendentes"
                    >
                      <span className="block text-[10px] text-slate-400">{zone.label}</span>
                      <span className="font-mono font-black text-xs text-sky-400">{zoneKg} kg</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Meta de 1RM para o Próximo Mês */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    Meta de 1RM para o Próximo Mês:
                  </span>
                  {goalSavedToast && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                      ✓ Meta salva!
                    </span>
                  )}
                </div>
                {monthly1RMGoal && parseFloat(monthly1RMGoal) > 0 && predictive1RMStats.active1RM > 0 && (
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Progresso atual: {predictive1RMStats.active1RM} kg / {monthly1RMGoal} kg</span>
                      <span className="font-bold text-emerald-400">
                        {Math.min(100, Math.round((predictive1RMStats.active1RM / parseFloat(monthly1RMGoal)) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((predictive1RMStats.active1RM / parseFloat(monthly1RMGoal)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  placeholder={predictive1RMStats.active1RM > 0 ? `${Math.round((predictive1RMStats.active1RM * 1.05) * 2) / 2}` : 'Ex: 100'}
                  value={monthly1RMGoal}
                  onChange={(e) => setMonthly1RMGoal(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveMonthly1RMGoal(monthly1RMGoal)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer transition-colors"
                >
                  Salvar Meta
                </button>
                {predictive1RMStats.active1RM > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const suggested = (Math.round(predictive1RMStats.active1RM * 1.05 * 2) / 2).toString();
                      handleSaveMonthly1RMGoal(suggested);
                    }}
                    className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] border border-amber-500/30 cursor-pointer"
                    title="Sugerir +5% de evolução sobre o 1RM atual para o próximo mês"
                  >
                    +5%
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Banner Preditivo de Sobrecarga Progressiva */}
        {progression && progression.status === 'progress' && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-white text-xs">
                    ⚡ Sobrecarga Preditiva: <strong className="text-emerald-400 font-mono">{progression.suggestedWeight}kg</strong>
                  </span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                    +{progression.suggestedWeight - (progression.currentWeight || 0)}kg
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 truncate block">
                  {progression.reason}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                for (let s = 1; s <= item.sets; s++) {
                  const k = `${ex.id}_${s}`;
                  if (!logs[k]?.done) {
                    handleInputChange(k, 'weight', progression.suggestedWeight.toString());
                  }
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
            >
              Aplicar Carga
            </button>
          </div>
        )}
      </div>

      {/* 2. Lista de Séries (Ocultável quando o card está recolhido no mobile) */}
      {isCardCollapsed ? (
        <div className="px-3.5 py-2.5 bg-slate-950/50 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">
            {isAllSetsDone
              ? `✓ Todas as ${item.sets} séries concluídas neste exercício.`
              : `${completedSetsForEx} de ${item.sets} séries concluídas (${item.sets - completedSetsForEx} pendentes).`}
          </span>
          <button
            type="button"
            onClick={() => setIsCardCollapsed(false)}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <span>Expandir Séries</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
      <>
      <div className="p-2.5 sm:p-4 landscape:p-3 space-y-2.5 sm:space-y-3">
        {/* Barra Superior da Seção de Séries: Recorde (PR) Histórico & Replicação Rápida */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs flex-wrap pb-1.5 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {historicalPR.maxWeight > 0 ? (
              <span className="inline-flex items-center gap-1 flex-wrap">
                <SmartTermTooltip term="PR" align="left">
                  <span>Recorde Pessoal (PR):</span>
                </SmartTermTooltip>{' '}
                <strong className="text-amber-300 font-mono">{historicalPR.maxWeight}kg</strong>
                {historicalPR.best1RM > 0 && (
                  <SmartTermTooltip term="1RM" align="left" showIcon={false}>
                    <span className="text-sky-300/90 hover:text-sky-200">(1RM ~{historicalPR.best1RM}kg)</span>
                  </SmartTermTooltip>
                )}
              </span>
            ) : (
              <span className="text-slate-500 italic">Primeiro registro deste exercício</span>
            )}
          </div>

          {item.sets > 1 && (
            <button
              type="button"
              onClick={handleReplicateFirstSetToAll}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-500/25 transition-all cursor-pointer active:scale-95"
              title="Preenche todas as séries pendentes com o peso e reps da Série #1"
            >
              <Copy className="w-3 h-3" />
              <span>Preencher restantes com Série #1</span>
            </button>
          )}
        </div>

        {/* Grade Responsiva de Cards de Série (1 col em retrato, 2 cols em landscape smartphone/tablet, 3 cols em tablets largos) */}
        <div
          className={
            item.sets > 1 && landscapeSetLayout === 'grid'
              ? 'grid grid-cols-1 landscape:grid-cols-2 xl:landscape:grid-cols-3 gap-2.5 sm:gap-3 items-stretch'
              : 'grid grid-cols-1 gap-2.5 sm:gap-3'
          }
        >
        {Array.from({ length: item.sets }).map((_, sIdx) => {
          const setNum = sIdx + 1;
          const logKey = `${ex.id}_${setNum}`;
          const setLog = logs[logKey] || { weight: '', reps: '', rpe: '6', rir: '4', done: false };
          const localLog = localLogs[logKey] || { 
            weight: setLog.weight || '', 
            reps: setLog.reps || '', 
            rpe: setLog.rpe || '6', 
            rir: setLog.rir || '4' 
          };

          const currWeightVal = localLog.weight !== undefined ? localLog.weight : setLog.weight;
          const currRepsVal = localLog.reps !== undefined ? localLog.reps : setLog.reps;
          const currentRpeNum = parseInt(localLog.rpe || setLog.rpe || '6', 10) || 6;
          const currentRirNum = 10 - currentRpeNum;
          const currentSetType: SetIntensityType = setLog.setType || 'T';
          const setTypeMeta = SET_INTENSITY_TYPES.find((t) => t.code === currentSetType) || SET_INTENSITY_TYPES[1];

          // Histórico comparativo da série específica no treino anterior
          const prevSetRecord = prevSessionExercise?.sets?.[sIdx]
            ? {
                weight: prevSessionExercise.sets[sIdx].weight.toString(),
                reps: prevSessionExercise.sets[sIdx].reps.toString(),
                rpe: prevSessionExercise.sets[sIdx].rpe?.toString(),
              }
            : (history[logKey]?.weight && history[logKey]?.reps)
            ? {
                weight: history[logKey].weight,
                reps: history[logKey].reps,
                rpe: history[logKey].rpe,
              }
            : null;

          // SUGESTÃO AUTOMÁTICA DE CARGA NA SÉRIE (AUTO-PROGRESSÃO INTELIGENTE)
          // Se no último treino atingiu o topo da faixa de repetições com RIR >= 2 (RPE <= 8), ou se progression.status === 'progress'
          const setAutoProgression = (() => {
            if (progression && progression.status === 'progress' && progression.suggestedWeight > 0) {
              const inc = Math.round((progression.suggestedWeight - (progression.currentWeight || 0)) * 10) / 10;
              return {
                suggestedKg: progression.suggestedWeight,
                incrementKg: inc > 0 ? inc : 2.5,
              };
            }
            if (prevSetRecord) {
              const pw = parseFloat(prevSetRecord.weight) || 0;
              const pr = parseInt(prevSetRecord.reps, 10) || 0;
              const prpe = prevSetRecord.rpe ? parseFloat(prevSetRecord.rpe) : 8;
              if (pw > 0 && pr >= targetMaxReps && prpe <= 8) {
                const inc = pw >= 40 ? 2.5 : 2;
                return {
                  suggestedKg: Math.round((pw + inc) * 10) / 10,
                  incrementKg: inc,
                };
              }
            }
            return null;
          })();

          // CÁLCULO DE 1RM E 6RM COM O RPE/RIR DA SÉRIE
          const est1RM = calculate1RM(currWeightVal, currRepsVal, currentRpeNum.toString());
          const est6RM = calculate6RM(currWeightVal, currRepsVal, currentRpeNum.toString());

          // DETECÇÃO DE RECORDE PESSOAL (PR) NA SÉRIE
          const setWeightNum = parseFloat(currWeightVal) || 0;
          const setRepsNum = parseInt(currRepsVal, 10) || 0;
          const prResult = checkSetPR(ex.name, setWeightNum, setRepsNum, historicalPR);

          // CÁLCULO DE CARGA ESTIMADA PARA A PRÓXIMA SÉRIE
          const prevW = parseFloat(currWeightVal) || 0;
          const prevR = parseInt(currRepsVal, 10) || 0;
          const nextSetSuggestedWeight = (prevW > 0 && prevR > 0)
            ? estimateNextSetWeight(prevW, prevR, currentRpeNum, prevR, 8)
            : null;

          // SMART RIR SUGGESTION: Calibração preditiva de RIR quando o peso digitado alinha com dados históricos de RPE/RIR
          const smartRirSuggestion = (() => {
            if (setWeightNum <= 0) return null;

            // Combina histórico de sessões anteriores + séries anteriores já concluídas hoje neste exercício
            const intraSessionRecords: Array<{
              weight: number;
              reps: number;
              rpe: number;
              rir: number;
              setIndex: number;
              dateLabel: string;
            }> = [];

            for (let prevS = 1; prevS < setNum; prevS++) {
              const pk = `${ex.id}_${prevS}`;
              const pLog = logs[pk];
              if (pLog?.done) {
                const pw = parseFloat(pLog.weight || '0') || 0;
                const pr = parseInt(pLog.reps || '0', 10) || 0;
                if (pw > 0 && pr > 0) {
                  const prpe = Math.min(10, Math.max(6, parseInt(pLog.rpe || '8', 10) || 8));
                  intraSessionRecords.push({
                    weight: pw,
                    reps: pr,
                    rpe: prpe,
                    rir: 10 - prpe,
                    setIndex: prevS - 1,
                    dateLabel: `Série #${prevS} de hoje`,
                  });
                }
              }
            }

            const allCandidates = [...historicalExerciseSets, ...intraSessionRecords];
            if (allCandidates.length === 0) return null;

            // Filtra registros com carga alinhada (dentro de ±15% ou ±5 kg da carga inserida)
            const maxToleranceKg = Math.max(5, setWeightNum * 0.15);
            const alignedCandidates = allCandidates.filter(
              (c) => Math.abs(c.weight - setWeightNum) <= maxToleranceKg
            );

            if (alignedCandidates.length === 0) return null;

            // Ordena pela menor diferença de peso (priorizando mesma série e registros mais recentes)
            const sorted = [...alignedCandidates].sort((a, b) => {
              const diffA = Math.abs(a.weight - setWeightNum);
              const diffB = Math.abs(b.weight - setWeightNum);
              if (Math.abs(diffA - diffB) > 0.25) return diffA - diffB;
              const sameSetA = a.setIndex === sIdx ? 0 : 1;
              const sameSetB = b.setIndex === sIdx ? 0 : 1;
              return sameSetA - sameSetB;
            });

            const bestMatch = sorted[0];
            const isExactWeight = Math.abs(bestMatch.weight - setWeightNum) <= 0.5;
            const expectedReps = setRepsNum > 0 ? setRepsNum : bestMatch.reps || targetMaxReps;

            // Estima o 1RM efetivo a partir do registro histórico (Epley com RIR embutido)
            const effectiveHistorical1RM =
              bestMatch.weight * (1 + (bestMatch.reps + bestMatch.rir) / 30);

            let predictedRir: number;
            if (isExactWeight && expectedReps === bestMatch.reps) {
              predictedRir = bestMatch.rir;
            } else {
              // Quantas repetições totais até a falha (RIR 0) são possíveis com setWeightNum?
              const maxTotalRepsAtEnteredWeight =
                30 * (effectiveHistorical1RM / setWeightNum - 1);
              const rawRir = Math.round(maxTotalRepsAtEnteredWeight - expectedReps);
              predictedRir = Math.max(0, Math.min(4, rawRir));
            }

            const predictedRpe = 10 - predictedRir;

            return {
              predictedRir,
              predictedRpe,
              expectedReps,
              matchedWeight: bestMatch.weight,
              matchedReps: bestMatch.reps,
              matchedRpe: bestMatch.rpe,
              matchedRir: bestMatch.rir,
              matchedDateLabel: bestMatch.dateLabel,
              isExactWeight,
            };
          })();

          const isExpanded = !!expandedSets[logKey];

          // A) SÉRIE CONCLUÍDA
          if (setLog.done && !isExpanded) {
            return (
              <div
                key={logKey}
                className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-2.5 sm:p-3 transition-all hover:border-emerald-500/60 shadow-sm flex flex-col justify-between gap-2 h-full"
              >
                <div className="space-y-2">
                  {/* Badge de PR batido nesta série */}
                  {prResult && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] animate-pulse">
                      <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      <span>
                        🔥 NOVO RECORDE PESSOAL (PR)!{' '}
                        {prResult.isWeightPR
                          ? `+${prResult.diffWeight}kg na carga máxima!`
                          : `+${prResult.diff1RM}kg no 1RM estimado!`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-emerald-500/20">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-white text-xs sm:text-sm">Série #{setNum}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${setTypeMeta.badgeClass}`}>
                            {setTypeMeta.label}
                          </span>
                          <span className="font-mono font-extrabold text-emerald-400 text-sm sm:text-base">{currWeightVal || '0'} kg</span>
                          <span className="font-mono text-slate-300 text-xs sm:text-sm">× {currRepsVal || '0'} reps</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono">
                            @RPE {currentRpeNum} (RIR {currentRirNum})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                          {est1RM && <span>1RM ~{est1RM}kg</span>}
                          {est6RM && <span>· 6RM ~{est6RM}kg</span>}
                          {nextSetSuggestedWeight && sIdx < item.sets - 1 && (
                            <span className="text-emerald-400 font-medium">
                              · Próx.: ~{nextSetSuggestedWeight}kg
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações da Série Concluída */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedSets((prev) => ({ ...prev, [logKey]: true }))}
                        className="h-7 sm:h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Editar peso, repetições ou RPE"
                      >
                        <Pencil className="w-3 h-3 text-sky-400" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSet(logKey, isBisetWithNext ? 0 : item.rest)}
                        className="h-7 sm:h-8 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer"
                        title="Desmarcar conclusão"
                      >
                        Refazer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Seletor RPE 6 a 10 com botões + e - */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">Esforço:</span>
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateRpe(logKey, currentRpeNum - 1)}
                        disabled={currentRpeNum <= 6}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-1.5 font-mono font-bold text-xs text-white">
                        RPE {currentRpeNum}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateRpe(logKey, currentRpeNum + 1)}
                        disabled={currentRpeNum >= 10}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {smartRirSuggestion && (
                      <div className="relative group/smartrirdone">
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateRpe(logKey, smartRirSuggestion.predictedRpe);
                            soundManager.vibrate(20);
                          }}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                            currentRirNum === smartRirSuggestion.predictedRir
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/40'
                          }`}
                          title={`Smart RIR Suggestion: Baseado em ${smartRirSuggestion.matchedWeight}kg × ${smartRirSuggestion.matchedReps} (@RPE ${smartRirSuggestion.matchedRpe} / RIR ${smartRirSuggestion.matchedRir} em ${smartRirSuggestion.matchedDateLabel}), o RIR previsto para ${setWeightNum}kg × ${smartRirSuggestion.expectedReps} reps é RIR ${smartRirSuggestion.predictedRir} (RPE ${smartRirSuggestion.predictedRpe}). Clique para calibrar.`}
                        >
                          <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>
                            {currentRirNum === smartRirSuggestion.predictedRir
                              ? `Smart RIR (${smartRirSuggestion.predictedRir})`
                              : `Smart RIR: ${smartRirSuggestion.predictedRir} (@${smartRirSuggestion.predictedRpe})`}
                          </span>
                        </button>

                        {/* Subtle Hover Tooltip */}
                        <div className="pointer-events-none opacity-0 group-hover/smartrirdone:opacity-100 transition-opacity duration-200 absolute bottom-full right-0 mb-1.5 w-64 p-2.5 rounded-xl bg-[#070c18] border border-sky-500/40 shadow-2xl text-[10px] text-slate-200 z-30 leading-relaxed">
                          <div className="font-black text-sky-300 mb-0.5 flex items-center justify-between">
                            <span>🎯 Smart RIR Suggestion</span>
                            <span className="font-mono text-emerald-400">
                              RIR {smartRirSuggestion.predictedRir} · RPE {smartRirSuggestion.predictedRpe}
                            </span>
                          </div>
                          <p className="text-slate-300">
                            Alinhado com seu histórico de{' '}
                            <strong className="text-white font-mono">
                              {smartRirSuggestion.matchedWeight}kg × {smartRirSuggestion.matchedReps}
                            </strong>{' '}
                            (RIR {smartRirSuggestion.matchedRir} / RPE {smartRirSuggestion.matchedRpe} · {smartRirSuggestion.matchedDateLabel}).
                          </p>
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      RIR {currentRirNum} ({currentRirNum === 0 ? 'falha' : `${currentRirNum} res.`})
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // B) SÉRIE PENDENTE / EXPANDIDA (Otimizada para Retrato e Paisagem em Smartphones/Tablets)
          return (
            <div
              key={logKey}
              className={`rounded-xl p-2.5 sm:p-3 landscape:p-2.5 border transition-all flex flex-col justify-between h-full ${
                setLog.done
                  ? 'bg-slate-950/90 border-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Cabeçalho do Card de Série: Identificador da Série + Seletor de Técnica (W, T, F, D, RP) */}
                <div className="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-slate-800/70 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/90 font-mono font-black text-[11px] text-sky-400 shrink-0">
                      Série #{setNum}
                    </span>

                    <SmartTermTooltip
                      term="SET_TYPES"
                      align="left"
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline landscape:hidden lg:landscape:inline ml-0.5"
                    >
                      <span>Tipo:</span>
                    </SmartTermTooltip>

                    {SET_INTENSITY_TYPES.map((opt) => {
                      const isActive = currentSetType === opt.code;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => handleUpdateSetType(logKey, opt.code)}
                          title={`${opt.label}: ${opt.description}`}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border transition-all cursor-pointer ${
                            isActive
                              ? `${opt.badgeClass} ring-1 ring-current scale-105`
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt.code === 'T'
                            ? 'T · Trab.'
                            : opt.code === 'W'
                            ? 'W · Aquec.'
                            : opt.code === 'F'
                            ? 'F · Falha'
                            : opt.code === 'D'
                            ? 'D · Drop'
                            : 'RP · Pause'}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dica rápida da técnica selecionada */}
                  {currentSetType === 'D' && (
                    <span className="text-[10px] text-purple-300 font-semibold">
                      💡 Drop-set: -20 a 30% sem descanso
                    </span>
                  )}
                  {currentSetType === 'RP' && (
                    <span className="text-[10px] text-amber-300 font-semibold">
                      💡 Rest-Pause: 15s pausa + 3-5 reps
                    </span>
                  )}
                </div>

                {/* Linha Principal de Entrada (Responsiva p/ Grade Paisagem 2-3 Colunas ou Faixa Horizontal) */}
                {(() => {
                  // Calcula valores de fallback inteligentes caso o usuário toque em +/- ou Concluir com o campo vazio
                  const prevSessionSet = sIdx > 0 ? (localLogs[`${ex.id}_${setNum - 1}`] || logs[`${ex.id}_${setNum - 1}`]) : null;
                  const smartFallbackWeight =
                    (prevSessionSet?.weight && parseFloat(prevSessionSet.weight) > 0 ? prevSessionSet.weight : '') ||
                    (prevSetRecord?.weight && parseFloat(prevSetRecord.weight) > 0 ? prevSetRecord.weight : '') ||
                    (setAutoProgression?.suggestedKg ? setAutoProgression.suggestedKg.toString() : '') ||
                    (historical6RMSuggestion?.rawWeight ? historical6RMSuggestion.rawWeight.toString() : '');

                  const smartFallbackReps =
                    (prevSessionSet?.reps && parseInt(prevSessionSet.reps, 10) > 0 ? prevSessionSet.reps : '') ||
                    (prevSetRecord?.reps && parseInt(prevSetRecord.reps, 10) > 0 ? prevSetRecord.reps : '') ||
                    targetMaxReps.toString();

                  const adjustWeightByStep = (delta: number) => {
                    const baseW = parseFloat(currWeightVal) || parseFloat(smartFallbackWeight) || 20;
                    const nextW = Math.max(0, Math.round((baseW + delta) * 10) / 10);
                    handleInputChange(logKey, 'weight', nextW.toString());
                    soundManager.vibrate(15);
                  };

                  const adjustRepsByStep = (delta: number) => {
                    const baseR = parseInt(currRepsVal, 10) || parseInt(smartFallbackReps, 10) || targetMaxReps;
                    const nextR = Math.max(1, baseR + delta);
                    handleInputChange(logKey, 'reps', nextR.toString());
                    soundManager.vibrate(15);
                  };

                  const isSingleWideSetRow = item.sets === 1 || landscapeSetLayout === 'inline';

                  return (
                    <div
                      className={
                        isSingleWideSetRow
                          ? 'flex flex-col sm:flex-row landscape:flex-row items-stretch sm:items-center landscape:items-center justify-between gap-2 sm:gap-2.5'
                          : 'flex flex-col sm:portrait:flex-row 2xl:landscape:flex-row items-stretch sm:portrait:items-center 2xl:landscape:items-center justify-between gap-2'
                      }
                    >
                      <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                        {/* Input Carga (kg) com Steppers Rápidos -2.5 / +2.5 */}
                        <div className="col-span-1 min-w-0 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 flex items-center justify-between focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
                          <button
                            type="button"
                            onClick={() => adjustWeightByStep(-2.5)}
                            className="w-8 h-9 landscape:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 font-mono font-black text-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                            title="Diminuir 2.5 kg"
                            aria-label="Diminuir peso em 2.5 kg"
                          >
                            -
                          </button>

                          <div className="flex-1 min-w-0 px-1 text-center">
                            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-0.5 truncate">
                              Carga (kg)
                            </span>
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                placeholder={smartFallbackWeight || '0'}
                                value={currWeightVal}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => handleInputChange(logKey, 'weight', e.target.value)}
                                className="w-full bg-transparent font-mono font-black text-white text-center text-base focus:outline-none"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => adjustWeightByStep(2.5)}
                            className="w-8 h-9 landscape:h-8 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 active:bg-sky-500/40 text-sky-300 border border-sky-500/30 font-mono font-black text-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                            title="Aumentar 2.5 kg"
                            aria-label="Aumentar peso em 2.5 kg"
                          >
                            +
                          </button>
                        </div>

                        {/* Input Repetições (reps) com Steppers Rápidos -1 / +1 */}
                        <div className="col-span-1 min-w-0 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 flex items-center justify-between focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
                          <button
                            type="button"
                            onClick={() => adjustRepsByStep(-1)}
                            className="w-8 h-9 landscape:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 font-mono font-black text-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                            title="Menos 1 repetição"
                            aria-label="Diminuir 1 repetição"
                          >
                            -
                          </button>

                          <div className="flex-1 min-w-0 px-1 text-center">
                            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-0.5 truncate">
                              Meta: {item.reps} reps
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder={smartFallbackReps || '10'}
                              value={currRepsVal}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => handleInputChange(logKey, 'reps', e.target.value)}
                              className="w-full bg-transparent font-mono font-black text-white text-center text-base focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => adjustRepsByStep(1)}
                            className="w-8 h-9 landscape:h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 font-mono font-black text-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                            title="Mais 1 repetição"
                            aria-label="Aumentar 1 repetição"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Botão de Ditado por Voz na Série + Botão de Conclusão */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleVoiceInput(logKey)}
                          className={`min-h-[44px] landscape:min-h-[40px] w-11 landscape:w-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer shrink-0 active:scale-95 ${
                            listeningLogKey === logKey
                              ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30'
                              : 'bg-slate-900 hover:bg-slate-800 text-teal-400 border-slate-700/80 hover:border-teal-500/40'
                          }`}
                          title={`Ditar Série #${setNum} por voz (ex: "80 quilos 10 repetições RPE 8")`}
                          aria-label={`Ditar Série ${setNum} por voz`}
                        >
                          {listeningLogKey === logKey ? (
                            <MicOff className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (debounceTimerRef.current) {
                              clearTimeout(debounceTimerRef.current);
                              debounceTimerRef.current = null;
                            }
                            const finalWeight =
                              currWeightVal && parseFloat(currWeightVal) > 0
                                ? currWeightVal
                                : smartFallbackWeight || currWeightVal;
                            const finalReps =
                              currRepsVal && parseInt(currRepsVal, 10) > 0
                                ? currRepsVal
                                : smartFallbackReps || currRepsVal;

                            if (finalWeight !== currWeightVal) {
                              setLocalLogs((prev) => ({
                                ...prev,
                                [logKey]: {
                                  ...(prev[logKey] || { weight: '', reps: '', rpe: '6', rir: '4' }),
                                  weight: finalWeight,
                                },
                              }));
                            }
                            if (finalReps !== currRepsVal) {
                              setLocalLogs((prev) => ({
                                ...prev,
                                [logKey]: {
                                  ...(prev[logKey] || { weight: '', reps: '', rpe: '6', rir: '4' }),
                                  reps: finalReps,
                                },
                              }));
                            }

                            onUpdateLog(logKey, 'weight', finalWeight);
                            onUpdateLog(logKey, 'reps', finalReps);
                            onUpdateLog(logKey, 'rpe', currentRpeNum.toString());
                            onUpdateLog(logKey, 'rir', currentRirNum.toString());
                            onUpdateLog(logKey, 'setType', currentSetType);
                            persistLogsToStorageDirectly(logKey, {
                              weight: finalWeight,
                              reps: finalReps,
                              rpe: currentRpeNum.toString(),
                              rir: currentRirNum.toString(),
                              setType: currentSetType,
                              done: !setLog.done,
                            });

                            if (isSmartRestEnabled && currentRpeNum >= 9) {
                              if (!autoRestAppliedSetsRef.current.has(logKey)) {
                                autoRestAppliedSetsRef.current.add(logKey);
                                if (onUpdateRest) {
                                  onUpdateRest(index, item.rest + 30);
                                }
                              }
                            }

                            // Comemoração especial se for Novo Recorde Pessoal (PR)
                            const checkFinalPR = checkSetPR(
                              ex.name,
                              parseFloat(finalWeight) || 0,
                              parseInt(finalReps, 10) || 0,
                              historicalPR
                            );
                            if (prResult || checkFinalPR) {
                              soundManager.playPRCelebration();
                            } else {
                              soundManager.vibrateSetComplete();
                            }

                            onToggleSet(logKey, isBisetWithNext ? 0 : item.rest);
                            setExpandedSets((prev) => ({ ...prev, [logKey]: false }));
                          }}
                          className={`flex-1 min-h-[44px] landscape:min-h-[40px] px-3.5 sm:px-4 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer gap-1.5 touch-manipulation shadow-md ${
                            setLog.done
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : isBisetWithNext
                              ? 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3] shrink-0" />
                          <span className="truncate">
                            {isBisetWithNext
                              ? 'Concluir (Ir p/ 2º Ex.)'
                              : !currWeightVal && smartFallbackWeight
                              ? `Concluir (${smartFallbackWeight}kg × ${currRepsVal || smartFallbackReps})`
                              : 'Concluir Série'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Badge Piscante de Auto-Progressão Inteligente na Série (1-Toque) */}
                {setAutoProgression && parseFloat(currWeightVal || '0') !== setAutoProgression.suggestedKg && (
                  <div className="mt-2 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 animate-pulse">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300 min-w-0">
                      <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
                      <span className="truncate">
                        Sugestão: <strong className="font-mono text-white">{setAutoProgression.suggestedKg} kg</strong> (+{setAutoProgression.incrementKg} kg)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange(logKey, 'weight', setAutoProgression.suggestedKg.toString());
                        if (!currRepsVal) {
                          handleInputChange(logKey, 'reps', targetMaxReps.toString());
                        }
                        soundManager.vibrate(20);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shrink-0 cursor-pointer transition-all active:scale-95"
                    >
                      Aplicar
                    </button>
                  </div>
                )}

                {/* Badge de Novo Recorde Pessoal em Tempo Real */}
                {prResult && (
                  <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center justify-between gap-2 animate-pulse shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                      <span>
                        🔥 NOVO PR!{' '}
                        {prResult.isWeightPR
                          ? `+${prResult.diffWeight}kg carga máx.!`
                          : `+${prResult.diff1RM}kg 1RM!`}
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
                      Recorde
                    </span>
                  </div>
                )}

                {/* Botões Rápidos de 1-Toque: Copiar Série Anterior + Histórico + 1RM */}
                <div className="flex items-center justify-between gap-1.5 mt-2 px-0.5 text-[11px] text-slate-400 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* 1-Tap: Replicar Série Anterior desta mesma sessão */}
                    {sIdx > 0 && (() => {
                      const prevSetInSession = localLogs[`${ex.id}_${setNum - 1}`] || logs[`${ex.id}_${setNum - 1}`];
                      const hasPrevWeight = prevSetInSession && (parseFloat(prevSetInSession.weight) || 0) > 0;
                      if (!hasPrevWeight) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => handleReplicateSet(setNum, setNum - 1)}
                          className="inline-flex items-center gap-1 font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-0.5 rounded-lg border border-emerald-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
                          title="Copiar carga e repetições da série imediatamente anterior"
                        >
                          <Copy className="w-3 h-3 text-emerald-400" />
                          <span>Copiar #{setNum - 1} ({prevSetInSession.weight}kg×{prevSetInSession.reps || '0'})</span>
                        </button>
                      );
                    })()}

                    {/* Marca d'água comparativa da série no treino anterior (1-toque para repetir) */}
                    {prevSetRecord && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 font-medium">Ant.:</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange(logKey, 'weight', prevSetRecord.weight);
                            handleInputChange(logKey, 'reps', prevSetRecord.reps);
                            if (prevSetRecord.rpe) {
                              handleUpdateRpe(logKey, parseInt(prevSetRecord.rpe, 10) || 6);
                            }
                          }}
                          className="inline-flex items-center gap-1 font-mono font-semibold text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 px-1.5 py-0.5 rounded border border-sky-500/20 transition-colors cursor-pointer"
                          title="Toque para preencher com a carga e repetições do treino anterior"
                        >
                          <span>{prevSetRecord.weight}kg×{prevSetRecord.reps}</span>
                          {prevSetRecord.rpe && <span className="text-amber-400 font-bold">@{prevSetRecord.rpe}</span>}
                          <span className="text-[10px] text-sky-400 font-sans font-bold">(usar)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Informações de 1RM e Carga Sugerida com Smart Tooltips */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    {est1RM && (
                      <SmartTermTooltip term="1RM" align="left" className="text-sky-400 font-mono font-medium">
                        <span>
                          1RM: <strong>~{est1RM}kg</strong>
                        </span>
                      </SmartTermTooltip>
                    )}
                    {est6RM && (
                      <SmartTermTooltip term="6RM" align="left" className="text-amber-400 font-mono font-medium">
                        <span>
                          · 6RM: <strong>~{est6RM}kg</strong>
                        </span>
                      </SmartTermTooltip>
                    )}
                    {nextSetSuggestedWeight && sIdx < item.sets - 1 && (
                      <span className="text-emerald-400 font-medium">
                        · Próx.: <strong>~{nextSetSuggestedWeight}kg</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controle de RPE de 6 a 10 com + e - e cálculo automático de RIR (Horizontalmente Compacto em Paisagem) */}
              <div className="mt-2.5 landscape:mt-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SmartTermTooltip term="RPE" align="left" className="text-[11px] font-semibold text-slate-300">
                      <span>RPE (6–10):</span>
                    </SmartTermTooltip>

                    {/* Smart RIR Suggestion Badge with Subtle Interactive Tooltip */}
                    {smartRirSuggestion && (
                      <div className="relative group/smartrir inline-flex items-center">
                        <div
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                            currentRirNum === smartRirSuggestion.predictedRir
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                              : 'bg-sky-500/15 text-sky-300 border-sky-500/40 shadow-sm'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>
                            Sugerido:{' '}
                            <strong className="font-mono text-white">
                              {smartRirSuggestion.predictedRir}
                            </strong>{' '}
                            <span className="text-[9px] opacity-85 font-mono">
                              (@{smartRirSuggestion.predictedRpe})
                            </span>
                          </span>

                          {currentRirNum !== smartRirSuggestion.predictedRir ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateRpe(logKey, smartRirSuggestion.predictedRpe);
                                soundManager.vibrate(20);
                              }}
                              className="ml-0.5 px-1.5 py-0.2 rounded bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-[9px] uppercase tracking-wider cursor-pointer transition-colors active:scale-95"
                              title="Aplicar RIR sugerido pelo histórico"
                            >
                              Calibrar
                            </button>
                          ) : (
                            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-black">
                              ✓
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setActiveRirTooltipKey((prev) => (prev === logKey ? null : logKey))
                            }
                            className="text-slate-400 hover:text-white cursor-pointer ml-0.5"
                            title="Ver explicação da previsão de RIR"
                            aria-label="Detalhes da sugestão de RIR"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Subtle Tooltip (Hover on Desktop or Tap on Mobile) */}
                        <div
                          className={`left-0 bottom-full mb-2 w-72 sm:w-80 p-3 rounded-xl bg-[#070c18] border border-sky-500/40 shadow-2xl text-[11px] text-slate-200 z-30 leading-relaxed transition-all duration-200 ${
                            activeRirTooltipKey === logKey
                              ? 'block absolute animate-fadeIn'
                              : 'hidden group-hover/smartrir:block absolute pointer-events-none'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                            <span className="font-black text-sky-300 flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-sky-400" />
                              <span>Calibração de Esforço Sugerida</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              {smartRirSuggestion.isExactWeight ? 'Carga Idêntica' : 'Carga Alinhada'}
                            </span>
                          </div>

                          <p className="text-slate-300 text-[10px] sm:text-[11px]">
                            Com base no seu registro anterior de{' '}
                            <strong className="text-white font-mono">
                              {smartRirSuggestion.matchedWeight}kg × {smartRirSuggestion.matchedReps} reps
                            </strong>{' '}
                            reportado com{' '}
                            <strong className="text-amber-300 font-mono">
                              RIR {smartRirSuggestion.matchedRir} (RPE {smartRirSuggestion.matchedRpe})
                            </strong>{' '}
                            ({smartRirSuggestion.matchedDateLabel}), para{' '}
                            <strong className="text-white font-mono">
                              {setWeightNum}kg × {smartRirSuggestion.expectedReps} reps
                            </strong>{' '}
                            sua reserva estimada hoje é{' '}
                            <strong className="text-emerald-300 font-mono">
                              RIR {smartRirSuggestion.predictedRir} (RPE {smartRirSuggestion.predictedRpe})
                            </strong>
                            .
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    <SmartTermTooltip term="RIR" align="right">
                      <span>
                        RPE {currentRpeNum} ➔ RIR {currentRirNum} {currentRirNum === 0 ? '(falha)' : `(${currentRirNum} res.)`}
                      </span>
                    </SmartTermTooltip>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {/* Botões - e + para ajuste do RPE */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateRpe(logKey, currentRpeNum - 1)}
                      disabled={currentRpeNum <= 6}
                      className="w-8 h-8 sm:w-9 sm:h-9 landscape:w-8 landscape:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                      title="Diminuir RPE"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-extrabold text-xs text-white px-1.5 min-w-[54px] text-center">
                      RPE {currentRpeNum}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateRpe(logKey, currentRpeNum + 1)}
                      disabled={currentRpeNum >= 10}
                      className="w-8 h-8 sm:w-9 sm:h-9 landscape:w-8 landscape:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                      title="Aumentar RPE"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Seletor direto RPE 6 a 10 sempre na mesma linha horizontal */}
                  <div className="flex items-center gap-1 flex-1 max-w-xs justify-end">
                    {RPE_PRESETS.map((p) => {
                      const isSelected = currentRpeNum === p.rpe;
                      const isTarget = targetMuscleRir !== undefined && p.rir === targetMuscleRir;
                      const isSmartPredicted =
                        smartRirSuggestion !== undefined &&
                        smartRirSuggestion !== null &&
                        smartRirSuggestion.predictedRpe === p.rpe;
                      return (
                        <button
                          key={p.rpe}
                          type="button"
                          onClick={() => handleUpdateRpe(logKey, p.rpe)}
                          className={`flex-1 py-1.5 sm:py-2 landscape:py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-300 scale-105'
                              : isSmartPredicted
                              ? 'bg-sky-500/20 border-2 border-sky-400/70 text-sky-200 hover:bg-sky-500/30'
                              : isTarget
                              ? 'bg-amber-500/15 border-2 border-amber-500/60 text-amber-300 hover:bg-amber-500/25'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                          title={`RPE ${p.rpe} = RIR ${p.rir}${isSmartPredicted ? ` (Sugestão: RIR ${p.rir})` : ''}${isTarget ? ' (Meta configurada para este músculo)' : ''}`}
                        >
                          <span>{p.rpe}</span>
                          {isSmartPredicted && !isSelected && (
                            <span
                              className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-sky-400 animate-ping"
                              title="RIR previsto pelo histórico"
                            />
                          )}
                          {isTarget && !isSelected && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* 3. Rodapé do Card — Controles de Série e Descanso */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddSet(index)}
            className="h-9 px-3 rounded-lg text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Adicionar Série</span>
          </button>

          {item.sets > 1 && (
            <button
              type="button"
              onClick={() => onRemoveSet(index)}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 transition-colors cursor-pointer touch-manipulation"
              title="Remover série"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {progression.status === 'progress' && (
            <button
              type="button"
              onClick={() => {
                for (let s = 1; s <= item.sets; s++) {
                  const k = `${ex.id}_${s}`;
                  if (!logs[k]?.done) {
                    handleInputChange(k, 'weight', progression.suggestedWeight.toString());
                  }
                }
              }}
              className="h-9 px-3 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer touch-manipulation"
              title="Aplicar carga recomendada de sobrecarga progressiva"
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              <span>+{progression.suggestedWeight}kg</span>
            </button>
          )}
        </div>

        {/* Ajuste Rápido de Descanso */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <Clock className="w-4 h-4 text-sky-400 shrink-0" />
          <button
            type="button"
            onClick={() => handleAdjustRest(-15)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer font-bold text-sm touch-manipulation"
            title="-15s"
          >
            -
          </button>
          <span className="text-white font-mono font-bold text-sm min-w-[36px] text-center">
            {item.rest}s
          </span>
          <button
            type="button"
            onClick={() => handleAdjustRest(15)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer font-bold text-sm touch-manipulation"
            title="+15s"
          >
            +
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}, areExerciseCardPropsEqual);

