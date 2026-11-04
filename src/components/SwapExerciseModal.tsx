/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, Plus, Dumbbell, Sparkles } from 'lucide-react';
import { Exercise, EquipmentRequirement, MuscleGroup } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { safeStorage } from '../utils/storage';

interface SwapExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItemIndex: number | null;
  currentExerciseId: string;
  muscleKey: string;
  equipmentFilter: EquipmentRequirement;
  onSelectExercise: (index: number, newExercise: Exercise) => void;
}

export const SwapExerciseModal: React.FC<SwapExerciseModalProps> = ({
  isOpen,
  onClose,
  targetItemIndex,
  currentExerciseId,
  muscleKey,
  equipmentFilter,
  onSelectExercise,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customProfile, setCustomProfile] = useState<'Alongamento' | 'Encurtamento' | 'Tensão Contínua'>('Alongamento');
  const [customEquip, setCustomEquip] = useState<'full_gym' | 'cables_free' | 'dumbbells_only'>('full_gym');
  const [customCategory, setCustomCategory] = useState<'compound' | 'isolation'>('compound');

  if (!isOpen || targetItemIndex === null) return null;

  const muscleName = MUSCLE_NAMES[muscleKey as keyof typeof MUSCLE_NAMES] || muscleKey;
  const muscleList = EXERCISE_DATABASE[muscleKey as keyof typeof EXERCISE_DATABASE] || [];

  // Filter options by equipment
  const filteredExercises = muscleList.filter((ex) => {
    if (equipmentFilter === 'dumbbells_only') return ex.equip.includes('dumbbells_only');
    if (equipmentFilter === 'cables_free') {
      return ex.equip.includes('dumbbells_only') || ex.equip.includes('cables_free');
    }
    return true;
  });

  const displayList = filteredExercises.length > 0 ? filteredExercises : muscleList;

  const handleCreateAndSelectCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newEx: Exercise = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      muscleKey: muscleKey as MuscleGroup,
      target: muscleName,
      bio: 'Exercício personalizado adicionado pelo atleta.',
      cue: 'Mantenha cadência controlada e amplitude completa com segurança.',
      profile: customProfile,
      stability: customCategory === 'compound' ? 'Média' : 'Alta',
      equip: [customEquip],
      category: customCategory,
    };

    // Insere no banco em memória e persiste no safeStorage para não perder no refresh
    if (EXERCISE_DATABASE[muscleKey as keyof typeof EXERCISE_DATABASE]) {
      EXERCISE_DATABASE[muscleKey as keyof typeof EXERCISE_DATABASE].unshift(newEx);
    }
    try {
      const existing = safeStorage.get<Exercise[]>('mtp_custom_exercises', []);
      safeStorage.set('mtp_custom_exercises', [newEx, ...existing]);
    } catch {}

    onSelectExercise(targetItemIndex, newEx);
    setIsCreatingNew(false);
    setCustomName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Trocar Exercício
            </h3>
            <p className="text-xs text-emerald-400 font-semibold">
              Grupamento: {muscleName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreatingNew(false);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {/* Botão de Criação de Exercício Personalizado */}
          {!isCreatingNew ? (
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="w-full py-2.5 px-3.5 rounded-2xl border border-dashed border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Criar Novo Exercício para {muscleName}</span>
            </button>
          ) : (
            <form onSubmit={handleCreateAndSelectCustomExercise} className="bg-[#0b1220] p-4 rounded-2xl border border-emerald-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Novo Exercício para {muscleName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nome do Exercício *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supino Inclinado com Halteres (Banco 30°)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Perfil
                  </label>
                  <select
                    value={customProfile}
                    onChange={(e) => setCustomProfile(e.target.value as any)}
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Alongamento">Alongamento (Pico excêntrico)</option>
                    <option value="Encurtamento">Encurtamento (Pico concêntrico)</option>
                    <option value="Tensão Contínua">Tensão Contínua (Cabos)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Equipamento
                  </label>
                  <select
                    value={customEquip}
                    onChange={(e) => setCustomEquip(e.target.value as any)}
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="full_gym">Academia Completa</option>
                    <option value="cables_free">Cabos & Halteres</option>
                    <option value="dumbbells_only">Apenas Halteres</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar e Selecionar no Treino</span>
              </button>
            </form>
          )}

          {/* Lista de Exercícios Existentes */}
          <div className="space-y-2">
            {displayList.map((exercise) => {
              const isSelected = exercise.id === currentExerciseId;

              return (
                <div
                  key={exercise.id}
                  onClick={() => {
                    onSelectExercise(targetItemIndex, exercise);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/30'
                      : 'bg-[#0d1424] border-slate-800/80 hover:border-slate-700 hover:bg-[#111a2f]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        {exercise.profile}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {exercise.category === 'compound' ? 'Composto' : 'Isolador'}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      {exercise.name}
                    </h4>
                  </div>

                  {isSelected && (
                    <div className="p-1 rounded-full bg-sky-500 text-slate-950 shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
