/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Dumbbell, 
  Clock, 
  Layers, 
  Search, 
  Check, 
  Sliders,
  Sparkles,
  GripVertical,
  RefreshCw
} from 'lucide-react';
import { 
  GeneratedWorkoutRoutine, 
  WorkoutItem, 
  MuscleGroup, 
  SplitOption, 
  Exercise,
  EquipmentRequirement 
} from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { soundManager } from '../utils/audio';

interface ManualWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRoutine: (routine: GeneratedWorkoutRoutine) => void;
  editingRoutine?: GeneratedWorkoutRoutine | null;
  existingRoutinesCount?: number;
}

const ALL_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'quadriceps',
  'hamstrings',
  'glutes',
  'shoulders',
  'rear_delts',
  'biceps',
  'triceps',
  'calves',
  'abs',
];

export const ManualWorkoutModal: React.FC<ManualWorkoutModalProps> = ({
  isOpen,
  onClose,
  onSaveRoutine,
  editingRoutine = null,
  existingRoutinesCount = 0,
}) => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const nextLetter = letters[existingRoutinesCount % letters.length] || 'A';

  const [name, setName] = useState(() => editingRoutine?.name || `Treino ${nextLetter}`);
  const [letter, setLetter] = useState(() => editingRoutine?.letter || nextLetter);
  const [subtitle, setSubtitle] = useState(() => editingRoutine?.subtitle || 'Treino Personalizado');
  const [split, setSplit] = useState<SplitOption>(() => editingRoutine?.split || 'upper_lower');
  const [items, setItems] = useState<WorkoutItem[]>(() => editingRoutine?.items || []);
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state whenever modal opens or editingRoutine changes
  React.useEffect(() => {
    if (isOpen) {
      setSwappingIdx(null);
      setValidationError(null);
      if (editingRoutine) {
        setName(editingRoutine.name);
        setLetter(editingRoutine.letter);
        setSubtitle(editingRoutine.subtitle);
        setSplit(editingRoutine.split);
        setItems(editingRoutine.items || []);
      } else {
        setName(`Treino ${nextLetter}`);
        setLetter(nextLetter);
        setSubtitle('Treino Personalizado');
        setSplit('upper_lower');
        setItems([]);
      }
    }
  }, [editingRoutine, nextLetter, isOpen]);

  // Exercise selection & search state
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('chest');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom exercise form state
  const [customName, setCustomName] = useState('');
  const [customEquip, setCustomEquip] = useState<EquipmentRequirement>('full_gym');

  if (!isOpen) return null;

  // Exercise database filtered by muscle & search
  const availableExercises = (EXERCISE_DATABASE[selectedMuscle] || []).filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReorderItems = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setItems((prev) => {
      if (fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
    if (swappingIdx === fromIdx) {
      setSwappingIdx(toIdx);
    }
    soundManager.vibrate(20);
  };

  // Pointer Hold & Drag on Handle (Mobile Touch + Desktop Mouse)
  const handlePointerDownItemHandle = (startIdx: number, e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingIdx(startIdx);
    setDropTargetIdx(startIdx);
    soundManager.vibrate(15);

    let latestTarget = startIdx;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const elUnder = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
      const rowEl = elUnder?.closest('[data-manual-ex-index]') as HTMLElement | null;
      if (rowEl) {
        const overIdx = parseInt(rowEl.getAttribute('data-manual-ex-index') || '', 10);
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
        handleReorderItems(startIdx, latestTarget);
      }
      setDraggingIdx(null);
      setDropTargetIdx(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleAddCatalogExercise = (ex: Exercise) => {
    setValidationError(null);
    if (swappingIdx !== null && items[swappingIdx]) {
      setItems((prev) => {
        const copy = [...prev];
        copy[swappingIdx] = {
          ...copy[swappingIdx],
          muscleKey: ex.muscleKey,
          exercise: ex,
        };
        return copy;
      });
      setSwappingIdx(null);
      soundManager.vibrate(25);
      return;
    }

    const newItem: WorkoutItem = {
      id: `manual_${Date.now()}_${ex.id}`,
      muscleKey: ex.muscleKey,
      exercise: ex,
      sets: 3,
      reps: '8 a 10',
      rir: 'RIR 1-2',
      rest: 60,
    };
    setItems((prev) => [...prev, newItem]);
    soundManager.vibrate(18);
  };

  const handleAddCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    setValidationError(null);

    const newEx: Exercise = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      category: 'Personalizado',
      muscleKey: selectedMuscle,
      equip: [customEquip],
      profile: 'Personalizado',
      stability: 'Média',
      target: MUSCLE_NAMES[selectedMuscle] || selectedMuscle,
      bio: 'Exercício personalizado adicionado pelo atleta.',
      cue: 'Execução controlada com foco no grupamento alvo.',
    };

    if (swappingIdx !== null && items[swappingIdx]) {
      setItems((prev) => {
        const copy = [...prev];
        copy[swappingIdx] = {
          ...copy[swappingIdx],
          muscleKey: selectedMuscle,
          exercise: newEx,
        };
        return copy;
      });
      setSwappingIdx(null);
      setCustomName('');
      soundManager.vibrate(25);
      return;
    }

    const newItem: WorkoutItem = {
      id: `manual_${Date.now()}_${newEx.id}`,
      muscleKey: selectedMuscle,
      exercise: newEx,
      sets: 3,
      reps: '8 a 10',
      rir: 'RIR 1-2',
      rest: 60,
    };

    setItems((prev) => [...prev, newItem]);
    setCustomName('');
    soundManager.vibrate(18);
  };

  const handleUpdateItem = (index: number, field: keyof WorkoutItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    handleReorderItems(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    handleReorderItems(index, index + 1);
  };

  const handleRemoveItem = (index: number) => {
    if (swappingIdx === index) setSwappingIdx(null);
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (items.length === 0) {
      setValidationError('Adicione pelo menos um exercício abaixo antes de salvar este treino.');
      return;
    }

    const muscleGroups = Array.from(new Set(items.map((it) => it.muscleKey)));
    const totalSets = items.reduce((acc, curr) => acc + curr.sets, 0);
    const avgRest = items.length > 0 ? items.reduce((acc, curr) => acc + curr.rest, 0) / items.length : 60;
    const estimatedMinutes = Math.max(20, Math.round((totalSets * (45 + avgRest)) / 60));

    const routine: GeneratedWorkoutRoutine = {
      id: editingRoutine?.id || `custom_routine_${Date.now()}`,
      letter: letter.trim().toUpperCase() || 'A',
      name: name.trim() || `Treino ${letter}`,
      subtitle: subtitle.trim() || 'Treino Personalizado',
      split: split,
      muscleGroups,
      items,
      totalSets,
      estimatedMinutes,
      isCustom: true,
    };

    onSaveRoutine(routine);
    onClose();
  };

  const totalSetsCount = items.reduce((acc, curr) => acc + curr.sets, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#0a101d] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {editingRoutine ? 'Editar Treino & Exercícios' : 'Criar Treino Manual'}
              </h2>
              <p className="text-xs text-slate-400">
                Segure e arraste os cards para reordenar ou toque em &ldquo;Trocar&rdquo; para alterar qualquer exercício
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between">
              <span>⚠️ {validationError}</span>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-rose-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Identificação do Treino */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#0a101d] p-3.5 rounded-2xl border border-slate-800/80">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Letra
              </label>
              <input
                type="text"
                maxLength={2}
                value={letter}
                onChange={(e) => setLetter(e.target.value.toUpperCase())}
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2 py-2 text-center font-black text-sm text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Nome do Treino
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Treino A · Peitoral & Bíceps"
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Subtítulo / Foco
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ex: Foco Peito & Braços"
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Divisão (Split)
              </label>
              <select
                value={split}
                onChange={(e) => setSplit(e.target.value as SplitOption)}
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="upper_lower">Upper/Lower</option>
                <option value="ppl">PPL</option>
                <option value="abcde">ABCDE</option>
                <option value="fullbody">Full Body</option>
                <option value="lower">Lower</option>
                <option value="upper">Upper</option>
                <option value="legs">Legs</option>
              </select>
            </div>
          </div>

          {/* Lista de Exercícios Adicionados (Com Segurar e Arrastar + Trocar Exercício em 1 Toque) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exercícios do Treino ({items.length})</span>
                {items.length > 1 && (
                  <span className="text-[10px] font-normal text-slate-400 normal-case">
                    · Segure e arraste <GripVertical className="w-3 h-3 inline text-slate-400" /> para reordenar
                  </span>
                )}
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                Total: {totalSetsCount} séries
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-[#0a101d] border border-slate-800 border-dashed text-slate-400 text-xs">
                Nenhum exercício adicionado ainda. Escolha os exercícios abaixo para compor seu treino.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isSwappingThis = swappingIdx === idx;
                  const isDraggingThis = draggingIdx === idx;
                  const isDropTargetThis = dropTargetIdx === idx && draggingIdx !== idx;

                  return (
                    <div
                      key={item.id}
                      data-manual-ex-index={idx}
                      draggable
                      onDragStart={(e) => {
                        setDraggingIdx(idx);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(idx));
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDropTargetIdx(idx);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIdx =
                          draggingIdx !== null ? draggingIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (!isNaN(fromIdx) && fromIdx !== idx) {
                          handleReorderItems(fromIdx, idx);
                        }
                        setDraggingIdx(null);
                        setDropTargetIdx(null);
                      }}
                      onDragEnd={() => {
                        setDraggingIdx(null);
                        setDropTargetIdx(null);
                      }}
                      className={`p-2.5 rounded-xl bg-[#0a101d] border transition-all flex flex-col gap-2 text-xs ${
                        isDraggingThis ? 'card-dragging' : ''
                      } ${isDropTargetThis ? 'card-drop-target' : ''} ${
                        isSwappingThis
                          ? 'border-sky-400 ring-1 ring-sky-400/40 bg-sky-950/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Alça de Segurar e Arrastar */}
                          <button
                            type="button"
                            onPointerDown={(e) => handlePointerDownItemHandle(idx, e)}
                            className="drag-handle-touch p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 cursor-grab active:cursor-grabbing flex items-center gap-0.5 shrink-0"
                            title="Segurar e arrastar para mover este exercício"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                            <span className="font-mono font-bold text-[11px] text-slate-300">
                              {idx + 1}
                            </span>
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-extrabold uppercase text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                                {MUSCLE_NAMES[item.muscleKey] || item.muscleKey}
                              </span>
                              <strong className="text-white text-xs truncate">
                                {item.exercise.name}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Controles de Trocar Exercício, Séries, Reps, Descanso e Ordem */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isSwappingThis) {
                                setSwappingIdx(null);
                              } else {
                                setSwappingIdx(idx);
                                setSelectedMuscle(item.muscleKey);
                                setSearchQuery('');
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer active:scale-95 ${
                              isSwappingThis
                                ? 'bg-sky-500 text-slate-950 border-sky-400 font-black shadow-sm'
                                : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
                            }`}
                            title="Trocar / alterar este exercício mantendo as séries e repetições"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>{isSwappingThis ? 'Cancel. Troca' : 'Trocar'}</span>
                          </button>

                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-slate-400">Séries:</span>
                            <input
                              type="number"
                              min={1}
                              max={15}
                              value={item.sets}
                              onChange={(e) => handleUpdateItem(idx, 'sets', Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-10 bg-[#070b14] border border-slate-700 rounded py-0.5 text-center font-bold text-emerald-400 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-slate-400">Reps:</span>
                            <input
                              type="text"
                              value={item.reps}
                              onChange={(e) => handleUpdateItem(idx, 'reps', e.target.value)}
                              className="w-16 bg-[#070b14] border border-slate-700 rounded py-0.5 text-center text-slate-200 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-slate-400">Desc:</span>
                            <input
                              type="number"
                              step={15}
                              min={15}
                              max={300}
                              value={item.rest}
                              onChange={(e) => handleUpdateItem(idx, 'rest', parseInt(e.target.value, 10) || 60)}
                              className="w-12 bg-[#070b14] border border-slate-700 rounded py-0.5 text-center text-slate-200 text-xs"
                            />
                            <span className="text-slate-500">s</span>
                          </div>

                          {/* Reordenação e Exclusão */}
                          <div className="flex items-center gap-0.5 bg-[#070b14] p-0.5 rounded border border-slate-800">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveUp(idx)}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === items.length - 1}
                              onClick={() => handleMoveDown(idx)}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 rounded border border-rose-900/30 transition-colors cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Painel Rápido Inline quando o usuário clica em "Trocar" neste exercício */}
                      {isSwappingThis && (
                        <div className="pt-2 border-t border-sky-500/30 space-y-2 animate-fadeIn">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-sky-300 font-bold">
                            <span>
                              🔄 Escolha um substituto rápido de {MUSCLE_NAMES[selectedMuscle] || selectedMuscle} (ou use o catálogo abaixo):
                            </span>
                            <button
                              type="button"
                              onClick={() => setSwappingIdx(null)}
                              className="text-slate-400 hover:text-white text-[10px] underline cursor-pointer"
                            >
                              Fechar
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {(EXERCISE_DATABASE[item.muscleKey] || []).map((candidate) => {
                              const isCurrent = candidate.id === item.exercise.id;
                              return (
                                <button
                                  key={candidate.id}
                                  type="button"
                                  disabled={isCurrent}
                                  onClick={() => handleAddCatalogExercise(candidate)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border shrink-0 transition-all cursor-pointer ${
                                    isCurrent
                                      ? 'bg-slate-800/60 text-slate-500 border-slate-700 cursor-not-allowed'
                                      : 'bg-[#070b14] hover:bg-sky-500/20 text-white hover:text-sky-200 border-sky-500/40 active:scale-95'
                                  }`}
                                >
                                  {isCurrent ? `✓ ${candidate.name}` : `➔ ${candidate.name}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Adicionador / Substituidor de Exercícios */}
          <div className={`bg-[#0a101d] rounded-2xl border p-3.5 space-y-3 transition-colors ${
            swappingIdx !== null ? 'border-sky-500/60 ring-1 ring-sky-500/25' : 'border-slate-800'
          }`}>
            {swappingIdx !== null && items[swappingIdx] && (
              <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-sky-200 font-bold min-w-0">
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                  <span className="truncate">
                    Substituindo #{swappingIdx + 1} ({items[swappingIdx].exercise.name}) — toque em qualquer exercício abaixo:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSwappingIdx(null)}
                  className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 hover:text-white text-[10px] font-bold shrink-0 cursor-pointer"
                >
                  Cancelar Troca
                </button>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'catalog'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {swappingIdx !== null ? 'Escolher Substituto no Catálogo' : 'Do Catálogo Oficial'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'custom'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {swappingIdx !== null ? 'Substituir por Nome Personalizado' : 'Criar Exercício Personalizado'}
                </button>
              </div>
            </div>

            {/* TAB 1: DO CATÁLOGO */}
            {activeTab === 'catalog' && (
              <div className="space-y-3">
                {/* Seletor de Músculo */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {ALL_MUSCLES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMuscle(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedMuscle === m
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      {MUSCLE_NAMES[m] || m}
                    </button>
                  ))}
                </div>

                {/* Busca rápida */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar exercício..."
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Lista de Exercícios Disponíveis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableExercises.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleAddCatalogExercise(ex)}
                      className="p-2 rounded-xl bg-[#070b14] hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300 block truncate">
                          {ex.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {ex.category} · {ex.profile}
                        </span>
                      </div>
                      <Plus className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: CRIAR EXERCÍCIO PERSONALIZADO */}
            {activeTab === 'custom' && (
              <form onSubmit={handleAddCustomExercise} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Nome do Exercício
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ex: Supino Declinado Halteres Pegada Neutra"
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Músculo Alvo
                    </label>
                    <select
                      value={selectedMuscle}
                      onChange={(e) => setSelectedMuscle(e.target.value as MuscleGroup)}
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {ALL_MUSCLES.map((m) => (
                        <option key={m} value={m}>
                          {MUSCLE_NAMES[m] || m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar ao Treino</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0a101d] border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Salvar Treino</span>
          </button>
        </div>
      </div>
    </div>
  );
};
