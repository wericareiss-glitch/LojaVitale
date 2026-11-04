/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { 
  Play, 
  Dumbbell, 
  Sparkles, 
  Clock, 
  Layers, 
  Flame, 
  Sliders, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  MoreVertical, 
  Share2, 
  Zap,
  FileDown,
  GripVertical,
  Search,
  X,
  History,
  ArrowUp,
  Target
} from 'lucide-react';
import { GeneratedWorkoutRoutine, UserProfile } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { soundManager } from '../utils/audio';

const WorkoutPdfExportModal = React.lazy(() =>
  import('./WorkoutPdfExportModal').then((m) => ({ default: m.WorkoutPdfExportModal }))
);

interface WorkoutListViewProps {
  user: UserProfile;
  routines: GeneratedWorkoutRoutine[];
  activeRoutineId: string | null;
  onStartWorkout: (routine: GeneratedWorkoutRoutine) => void;
  onGoToProfileGenerator: () => void;
  onCreateManualWorkout?: () => void;
  onGenerateQuickWorkout?: () => void;
  onEditRoutine?: (routine: GeneratedWorkoutRoutine) => void;
  onDeleteRoutine?: (routineId: string) => void;
  onShareRoutine?: (routine: GeneratedWorkoutRoutine) => void;
  onReorderRoutines?: (fromIndex: number, toIndex: number) => void;
}

interface RoutineVisualEntry {
  routine: GeneratedWorkoutRoutine;
  visualIdx: number;
}

type VersionFilterMode = 'all' | 'latest' | 'custom';

interface RoutineCardProps {
  entry: RoutineVisualEntry;
  isActive: boolean;
  isMenuOpen: boolean;
  isConfirmingDelete: boolean;
  isDraggingThis: boolean;
  isDropTargetThis: boolean;
  canReorder: boolean;
  hasEditHandler: boolean;
  hasDeleteHandler: boolean;
  onToggleMenu: (routineId: string) => void;
  onCloseMenu: () => void;
  onRequestDeleteConfirm: (routineId: string | null) => void;
  onConfirmDelete: (routineId: string) => void;
  onStartWorkout: (routine: GeneratedWorkoutRoutine) => void;
  onEditRoutine?: (routine: GeneratedWorkoutRoutine) => void;
  onOpenPdfModal: (routine: GeneratedWorkoutRoutine) => void;
  onShareRoutineClick: (routine: GeneratedWorkoutRoutine) => void;
  onPointerDownGrip: (visualIdx: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  onCardDragStart: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDragOver: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDrop: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDragEnd: () => void;
}

function areRoutineCardPropsEqual(prev: RoutineCardProps, next: RoutineCardProps): boolean {
  return (
    prev.entry.routine === next.entry.routine &&
    prev.entry.visualIdx === next.entry.visualIdx &&
    prev.isActive === next.isActive &&
    prev.isMenuOpen === next.isMenuOpen &&
    prev.isConfirmingDelete === next.isConfirmingDelete &&
    prev.isDraggingThis === next.isDraggingThis &&
    prev.isDropTargetThis === next.isDropTargetThis &&
    prev.canReorder === next.canReorder &&
    prev.hasEditHandler === next.hasEditHandler &&
    prev.hasDeleteHandler === next.hasDeleteHandler
  );
}

const RoutineCard = React.memo<RoutineCardProps>(({
  entry,
  isActive,
  isMenuOpen,
  isConfirmingDelete,
  isDraggingThis,
  isDropTargetThis,
  canReorder,
  hasEditHandler,
  hasDeleteHandler,
  onToggleMenu,
  onCloseMenu,
  onRequestDeleteConfirm,
  onConfirmDelete,
  onStartWorkout,
  onEditRoutine,
  onOpenPdfModal,
  onShareRoutineClick,
  onPointerDownGrip,
  onCardDragStart,
  onCardDragOver,
  onCardDrop,
  onCardDragEnd,
}) => {
  const { routine, visualIdx } = entry;

  const formattedCreatedAt = useMemo(() => {
    if (!routine.createdAt) return null;
    try {
      return new Date(routine.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    } catch {
      return null;
    }
  }, [routine.createdAt]);

  return (
    <div
      data-routine-card-index={visualIdx}
      draggable={canReorder}
      onDragStart={(e) => onCardDragStart(visualIdx, e)}
      onDragOver={(e) => onCardDragOver(visualIdx, e)}
      onDrop={(e) => onCardDrop(visualIdx, e)}
      onDragEnd={onCardDragEnd}
      className={`p-4 sm:p-5 rounded-3xl border transition-all relative flex flex-col justify-between h-full ${
        isDraggingThis ? 'card-dragging' : ''
      } ${isDropTargetThis ? 'card-drop-target' : ''} ${
        isActive
          ? 'bg-gradient-to-br from-emerald-950/40 via-[#0d1627] to-slate-900 border-emerald-500/60 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-400/30'
          : 'bg-[#101828] border-[#1e2c45] hover:border-slate-700 shadow-lg'
      }`}
    >
      <div>
        {/* Header do Card com Alça de Segurar e Arrastar + Menu de 3 Pontos */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {canReorder && (
              <button
                type="button"
                onPointerDown={(e) => onPointerDownGrip(visualIdx, e)}
                className="drag-handle-touch p-1.5 -ml-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                title="Segurar e arrastar para mover este card de treino"
                aria-label={`Segurar e arrastar ${routine.name}`}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}

            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'bg-gradient-to-tr from-sky-500/20 to-teal-500/20 text-sky-300 border border-sky-500/30'
              }`}
            >
              {routine.letter}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-extrabold text-white tracking-tight truncate">
                  {routine.name}
                </h2>
                {routine.version && (
                  <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    v{routine.version}
                  </span>
                )}
                {routine.isCustom && (
                  <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/30">
                    Personalizado
                  </span>
                )}
                {formattedCreatedAt && (
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700/60">
                    {formattedCreatedAt}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                {routine.subtitle}
              </p>
            </div>
          </div>

          {/* Botão de 3 Pontos e Menu Dropdown */}
          <div className="relative shrink-0">
            {isActive && (
              <span className="mr-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40 animate-pulse">
                ATIVO
              </span>
            )}

            <button
              type="button"
              onClick={() => onToggleMenu(routine.id)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Mais opções"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={onCloseMenu}
                />
                <div className="absolute right-0 top-10 z-30 w-48 bg-[#0b1220] border border-slate-700 rounded-2xl shadow-2xl py-1.5 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      onCloseMenu();
                      onStartWorkout(routine);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isActive ? 'Continuar Treino' : 'Iniciar Treino'}</span>
                  </button>

                  {hasEditHandler && onEditRoutine && (
                    <button
                      type="button"
                      onClick={() => {
                        onCloseMenu();
                        onEditRoutine(routine);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-400" />
                      <span>Editar / Alterar Exercícios</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onCloseMenu();
                      onOpenPdfModal(routine);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-sky-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-sky-400" />
                    <span>Exportar / Imprimir PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onCloseMenu();
                      onShareRoutineClick(routine);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Compartilhar Texto</span>
                  </button>

                  {hasDeleteHandler && (
                    isConfirmingDelete ? (
                      <div className="px-3 py-2 border-t border-slate-800 mt-1 pt-2 bg-rose-950/20 space-y-1.5">
                        <span className="text-[11px] font-bold text-rose-300 block">
                          Confirmar exclusão?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onConfirmDelete(routine.id)}
                            className="flex-1 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-[11px] font-extrabold transition-colors cursor-pointer"
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDeleteConfirm(null)}
                            className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestDeleteConfirm(routine.id)}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer border-t border-slate-800 mt-1 pt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Treino</span>
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Badges de Grupos Musculares */}
        <div className="flex flex-wrap gap-1 mb-3">
          {routine.muscleGroups.map((m) => (
            <span
              key={m}
              className="text-[10px] font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60"
            >
              {MUSCLE_NAMES[m] || m}
            </span>
          ))}
        </div>

        {/* Informações de Séries & Tempo */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono py-2 px-3 rounded-xl bg-[#0b1220] border border-slate-800/70 mb-3">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <strong className="text-white">{routine.items.length}</strong> {routine.items.length === 1 ? 'exercício' : 'exercícios'}
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-white">{routine.totalSets}</strong> séries
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            ~{routine.estimatedMinutes} min
          </span>
        </div>

        {/* Preview dos Exercícios */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              Exercícios programados:
            </span>
            {hasEditHandler && onEditRoutine && (
              <button
                type="button"
                onClick={() => onEditRoutine(routine)}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Pencil className="w-2.5 h-2.5" />
                <span>Alterar exercícios</span>
              </button>
            )}
          </div>
          {routine.items.slice(0, 5).map((it, idx) => (
            <div key={idx} className="text-xs text-slate-300 truncate flex items-center justify-between gap-1.5 py-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-500 text-[10px]">•</span>
                <span className="font-medium text-slate-200 truncate">{it.exercise.name}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono shrink-0 font-bold">
                {it.sets}s × {it.reps}
              </span>
            </div>
          ))}
          {routine.items.length > 5 && (
            <div className="text-[11px] text-slate-500 italic pl-3">
              + mais {routine.items.length - 5} exercício(s)...
            </div>
          )}
        </div>
      </div>

      {/* Ações: Iniciar Treino + Editar/Alterar + Ficha PDF */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onStartWorkout(routine)}
          className={`flex-1 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98] ${
            isActive
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 ring-2 ring-emerald-400/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
          }`}
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>{isActive ? 'Continuar Treino' : 'Iniciar Este Treino'}</span>
        </button>

        {hasEditHandler && onEditRoutine && (
          <button
            type="button"
            onClick={() => onEditRoutine(routine)}
            className="py-3.5 px-3 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
            title="Editar treino, reordenar ou alterar exercícios"
          >
            <Pencil className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">Editar</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenPdfModal(routine)}
          className="py-3.5 px-3 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-slate-700 text-sky-300 border border-sky-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
          title="Exportar ficha de treino em PDF A4 ou imprimir"
        >
          <FileDown className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>
    </div>
  );
}, areRoutineCardPropsEqual);

RoutineCard.displayName = 'RoutineCard';

export const WorkoutListView: React.FC<WorkoutListViewProps> = ({
  user,
  routines,
  activeRoutineId,
  onStartWorkout,
  onGoToProfileGenerator,
  onCreateManualWorkout,
  onGenerateQuickWorkout,
  onEditRoutine,
  onDeleteRoutine,
  onShareRoutine,
  onReorderRoutines,
}) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [pdfModalRoutine, setPdfModalRoutine] = useState<GeneratedWorkoutRoutine | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [versionFilter, setVersionFilter] = useState<VersionFilterMode>('all');
  const [isDesktopGrid, setIsDesktopGrid] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
  );

  // Detecta breakpoint md (768px) para virtualizar 1 card por linha no mobile e 2 cards por linha no desktop
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => setIsDesktopGrid(e.matches);
    setIsDesktopGrid(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleShareClick = useCallback((routine: GeneratedWorkoutRoutine) => {
    if (onShareRoutine) {
      onShareRoutine(routine);
    } else {
      const lines = [
        `🏋️ *${routine.name}* (${routine.subtitle})`,
        `Frequência: ${user.frequency || 4}x/sem · Total: ${routine.totalSets} séries`,
        '',
        'Exercícios:',
      ];
      routine.items.forEach((it, idx) => {
        lines.push(`${idx + 1}. *${it.exercise.name}* (${MUSCLE_NAMES[it.muscleKey] || it.muscleKey}) — ${it.sets}×${it.reps} (${it.rir})`);
      });
      const text = lines.join('\n');
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: routine.name, text }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      }
    }
  }, [onShareRoutine, user.frequency]);

  // Treinos ordenados do mais recente para o mais antigo (índice visual mapeia para routines.length - 1 - visualIdx)
  const sortedEntries = useMemo<RoutineVisualEntry[]>(() => {
    const len = routines.length;
    const result = new Array<RoutineVisualEntry>(len);
    for (let i = 0; i < len; i++) {
      result[i] = {
        routine: routines[len - 1 - i],
        visualIdx: i,
      };
    }
    return result;
  }, [routines]);

  // Filtra por modo de versão (Todas, Última Versão de cada divisão/nome, ou Personalizados) + busca textual
  const filteredEntries = useMemo<RoutineVisualEntry[]>(() => {
    let baseEntries = sortedEntries;

    if (versionFilter === 'latest') {
      const seenKeys = new Set<string>();
      baseEntries = sortedEntries.filter(({ routine }) => {
        // Mantém sempre a rotina ativa visível
        if (routine.id === activeRoutineId) {
          seenKeys.add(`${routine.letter}::${routine.name.trim().toLowerCase()}`);
          return true;
        }
        const key = `${routine.letter}::${routine.name.trim().toLowerCase()}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });
    } else if (versionFilter === 'custom') {
      baseEntries = sortedEntries.filter(({ routine }) => Boolean(routine.isCustom));
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseEntries;

    return baseEntries.filter(({ routine }) => {
      if (routine.name.toLowerCase().includes(q)) return true;
      if (routine.subtitle.toLowerCase().includes(q)) return true;
      if (routine.letter.toLowerCase().includes(q)) return true;
      if (routine.version && `v${routine.version}`.includes(q)) return true;
      return routine.items.some(
        (it) =>
          it.exercise.name.toLowerCase().includes(q) ||
          (MUSCLE_NAMES[it.muscleKey] || it.muscleKey).toLowerCase().includes(q)
      );
    });
  }, [sortedEntries, versionFilter, activeRoutineId, searchQuery]);

  // Em dispositivos mobile (<768px), cada item virtualizado do Virtuoso contém exatamente 1 card,
  // garantindo medição individual de altura e reciclagem de nós DOM para milhares de rotinas.
  // No desktop (>=768px), agrupa 2 cards por linha para preservar o grid de 2 colunas.
  const columnsPerRow = isDesktopGrid ? 2 : 1;

  const virtualizedRows = useMemo<RoutineVisualEntry[][]>(() => {
    const rows: RoutineVisualEntry[][] = [];
    for (let i = 0; i < filteredEntries.length; i += columnsPerRow) {
      rows.push(filteredEntries.slice(i, i + columnsPerRow));
    }
    return rows;
  }, [filteredEntries, columnsPerRow]);

  // Índice da linha virtual onde está o treino ativo (para salto rápido com VirtuosoHandle)
  const activeVirtualRowIdx = useMemo<number>(() => {
    if (!activeRoutineId) return -1;
    return virtualizedRows.findIndex((row) =>
      row.some((entry) => entry.routine.id === activeRoutineId)
    );
  }, [virtualizedRows, activeRoutineId]);

  const handleScrollToActiveRoutine = useCallback(() => {
    if (activeVirtualRowIdx < 0) return;
    virtuosoRef.current?.scrollToIndex({
      index: activeVirtualRowIdx,
      align: 'center',
      behavior: 'smooth',
    });
  }, [activeVirtualRowIdx]);

  const handleScrollToTop = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: 'start',
      behavior: 'smooth',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleReorderVisualCards = useCallback(
    (fromVisualIdx: number, toVisualIdx: number) => {
      if (fromVisualIdx === toVisualIdx || !onReorderRoutines) return;
      const total = routines.length;
      const fromOriginalIdx = total - 1 - fromVisualIdx;
      const toOriginalIdx = total - 1 - toVisualIdx;
      if (fromOriginalIdx >= 0 && toOriginalIdx >= 0 && fromOriginalIdx < total && toOriginalIdx < total) {
        onReorderRoutines(fromOriginalIdx, toOriginalIdx);
        soundManager.vibrate(25);
      }
    },
    [routines.length, onReorderRoutines]
  );

  // Pointer Hold-and-Drag on Routine Card Grip Handle (Mobile Touch + Desktop Mouse)
  const handlePointerDownRoutineHandle = useCallback(
    (startVisualIdx: number, e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingIdx(startVisualIdx);
      setDropTargetIdx(startVisualIdx);
      soundManager.vibrate(15);

      let latestTarget = startVisualIdx;

      const handlePointerMove = (moveEvt: PointerEvent) => {
        const viewportH = window.innerHeight;
        if (moveEvt.clientY < 90) {
          window.scrollBy({ top: -14, behavior: 'auto' });
        } else if (moveEvt.clientY > viewportH - 90) {
          window.scrollBy({ top: 14, behavior: 'auto' });
        }

        const elUnder = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
        const cardEl = elUnder?.closest('[data-routine-card-index]') as HTMLElement | null;
        if (cardEl) {
          const overIdx = parseInt(cardEl.getAttribute('data-routine-card-index') || '', 10);
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
        if (latestTarget !== startVisualIdx) {
          handleReorderVisualCards(startVisualIdx, latestTarget);
        }
        setDraggingIdx(null);
        setDropTargetIdx(null);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [handleReorderVisualCards]
  );

  const handleToggleMenu = useCallback((routineId: string) => {
    setOpenMenuId((prev) => (prev === routineId ? null : routineId));
    setConfirmDeleteId(null);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setOpenMenuId(null);
    setConfirmDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(
    (routineId: string) => {
      setConfirmDeleteId(null);
      setOpenMenuId(null);
      onDeleteRoutine?.(routineId);
    },
    [onDeleteRoutine]
  );

  const handleCardDragStart = useCallback(
    (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => {
      setDraggingIdx(visualIdx);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(visualIdx));
    },
    []
  );

  const handleCardDragOver = useCallback(
    (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTargetIdx((prev) => (prev === visualIdx ? prev : visualIdx));
    },
    []
  );

  const handleCardDrop = useCallback(
    (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromIdx =
        draggingIdx !== null ? draggingIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIdx) && fromIdx !== visualIdx) {
        handleReorderVisualCards(fromIdx, visualIdx);
      }
      setDraggingIdx(null);
      setDropTargetIdx(null);
    },
    [draggingIdx, handleReorderVisualCards]
  );

  const handleCardDragEnd = useCallback(() => {
    setDraggingIdx(null);
    setDropTargetIdx(null);
  }, []);

  const canReorder = Boolean(onReorderRoutines) && routines.length > 1;
  const hasEditHandler = Boolean(onEditRoutine);
  const hasDeleteHandler = Boolean(onDeleteRoutine);

  return (
    <div className="space-y-5 animate-fadeIn pb-24 max-w-4xl mx-auto relative">
      {copiedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-1.5 animate-fadeIn border border-emerald-400">
          <span>✓</span>
          <span>Treino copiado para a área de transferência!</span>
        </div>
      )}

      {/* Top Banner do Programa Semanal */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#101828] border border-[#1e2c45] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                Rotinas Acumuladas ({routines.length}) · {user.frequency || 4}x por semana
              </span>
              <span className="text-[10px] font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                {user.focus === 'glutes' 
                  ? '🍑 Foco Glúteos' 
                  : user.focus === 'strength' 
                  ? '🏋️ Foco Força' 
                  : user.focus === 'v_taper' 
                  ? '🔱 Foco Shape em V' 
                  : '⚖️ Foco Equilíbrio'}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Seus Treinos & Rotinas
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Escolha uma rotina para treinar, segure e arraste para reordenar ou toque em &ldquo;Alterar&rdquo; para editar exercícios.
            </p>
          </div>

          {/* Quick Creation Actions */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center shrink-0">
            {onGenerateQuickWorkout && (
              <button
                type="button"
                onClick={onGenerateQuickWorkout}
                className="py-2.5 px-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                title="Gera um treino aleatório e equilibrado de corpo inteiro estilo dobradiça/push/pull"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>⚡ Treino Rápido</span>
              </button>
            )}

            {onCreateManualWorkout && (
              <button
                type="button"
                onClick={onCreateManualWorkout}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-[#142036] hover:bg-[#1a2b4a] text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Novo Treino</span>
              </button>
            )}

            <button
              type="button"
              onClick={onGoToProfileGenerator}
              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Gerador</span>
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtros de Versão (otimizada para listas extensas de rotinas versionadas) */}
        {routines.length > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, divisão (A/B/C), versão (v1, v2), músculo ou exercício..."
                className="w-full bg-[#0a101d] border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setVersionFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 border ${
                    versionFilter === 'all'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3 h-3" />
                  <span>Todas as Versões ({routines.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVersionFilter('latest')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                    versionFilter === 'latest'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Exibe apenas a versão mais recente de cada treino A/B/C"
                >
                  Últimas Versões
                </button>

                {routines.some((r) => r.isCustom) && (
                  <button
                    type="button"
                    onClick={() => setVersionFilter('custom')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                      versionFilter === 'custom'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Personalizados
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeVirtualRowIdx >= 0 && (
                  <button
                    type="button"
                    onClick={handleScrollToActiveRoutine}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Rolar diretamente para o treino ativo na lista virtualizada"
                  >
                    <Target className="w-3 h-3" />
                    <span>Ir ao Ativo</span>
                  </button>
                )}

                <span className="text-[11px] font-mono text-slate-500">
                  Exibindo <strong className="text-slate-300">{filteredEntries.length}</strong> de {routines.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Se não houver treinos gerados */}
      {routines.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-[#101828] border border-slate-800">
          <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            Nenhum treino gerado ainda
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            Você pode gerar automaticamente com base nos seus parâmetros científicos, criar um treino rápido agora ou montar do zero.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {onGenerateQuickWorkout && (
              <button
                type="button"
                onClick={onGenerateQuickWorkout}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Gerar Treino Rápido (Full Body)</span>
              </button>
            )}
            {onCreateManualWorkout && (
              <button
                type="button"
                onClick={onCreateManualWorkout}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>Criar Treino Manual</span>
              </button>
            )}
            <button
              type="button"
              onClick={onGoToProfileGenerator}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Gerar na Aba Perfil</span>
            </button>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-[#101828] border border-slate-800 text-xs text-slate-400 space-y-3">
          <p>Nenhuma rotina encontrada para os filtros selecionados.</p>
          {(searchQuery || versionFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setVersionFilter('all');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        /* Lista Virtualizada de Treinos Acumulados (react-virtuoso com useWindowScroll e reciclagem mobile individual) */
        <>
          <Virtuoso
            ref={virtuosoRef}
            useWindowScroll
            data={virtualizedRows}
            defaultItemHeight={320}
            increaseViewportBy={{ top: 320, bottom: 480 }}
            computeItemKey={(rowIdx, row) => row.map((r) => r.routine.id).join('_') || String(rowIdx)}
            itemContent={(_, row) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {row.map((entry) => (
                  <RoutineCard
                    key={entry.routine.id}
                    entry={entry}
                    isActive={activeRoutineId === entry.routine.id}
                    isMenuOpen={openMenuId === entry.routine.id}
                    isConfirmingDelete={confirmDeleteId === entry.routine.id}
                    isDraggingThis={draggingIdx === entry.visualIdx}
                    isDropTargetThis={dropTargetIdx === entry.visualIdx && draggingIdx !== entry.visualIdx}
                    canReorder={canReorder}
                    hasEditHandler={hasEditHandler}
                    hasDeleteHandler={hasDeleteHandler}
                    onToggleMenu={handleToggleMenu}
                    onCloseMenu={handleCloseMenu}
                    onRequestDeleteConfirm={setConfirmDeleteId}
                    onConfirmDelete={handleConfirmDelete}
                    onStartWorkout={onStartWorkout}
                    onEditRoutine={onEditRoutine}
                    onOpenPdfModal={setPdfModalRoutine}
                    onShareRoutineClick={handleShareClick}
                    onPointerDownGrip={handlePointerDownRoutineHandle}
                    onCardDragStart={handleCardDragStart}
                    onCardDragOver={handleCardDragOver}
                    onCardDrop={handleCardDrop}
                    onCardDragEnd={handleCardDragEnd}
                  />
                ))}
              </div>
            )}
          />

          {filteredEntries.length > 10 && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleScrollToTop}
                className="px-4 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voltar ao topo da lista ({filteredEntries.length} rotinas)</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Exportação e Impressão de Ficha A4 PDF (Lazy Loaded) */}
      {pdfModalRoutine && (
        <Suspense fallback={null}>
          <WorkoutPdfExportModal
            isOpen={Boolean(pdfModalRoutine)}
            onClose={() => setPdfModalRoutine(null)}
            routine={pdfModalRoutine}
            user={user}
          />
        </Suspense>
      )}
    </div>
  );
};

