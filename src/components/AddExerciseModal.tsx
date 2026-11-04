/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Search, Dumbbell, Sparkles } from 'lucide-react';
import { Exercise, MuscleGroup, WorkoutItem } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { ALL_MUSCLE_GROUPS } from '../utils/auth';

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercise: (item: WorkoutItem) => void;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  isOpen,
  onClose,
  onAddExercise,
}) => {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Custom exercise form
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('chest');
  const [customCategory, setCustomCategory] = useState('Halter/Livre');
  const [customSets, setCustomSets] = useState(3);
  const [customReps, setCustomReps] = useState('8 a 10');
  const [customRest, setCustomRest] = useState(90);

  if (!isOpen) return null;

  // Flatten all exercises from the database
  const allExercises: Exercise[] = [];
  ALL_MUSCLE_GROUPS.forEach((m) => {
    const list = EXERCISE_DATABASE[m] || [];
    allExercises.push(...list);
  });

  const filteredExercises = allExercises.filter((ex) => {
    const matchesMuscle = selectedMuscle === 'all' || ex.muscleKey === selectedMuscle;
    const matchesSearch =
      searchQuery === '' ||
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      MUSCLE_NAMES[ex.muscleKey].toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  const handleSelectPredefined = (ex: Exercise) => {
    const newItem: WorkoutItem = {
      id: `${ex.muscleKey}_${ex.id}_${Date.now()}`,
      muscleKey: ex.muscleKey,
      exercise: ex,
      sets: 3,
      reps: '8 a 10',
      rir: 'RIR 1-2',
      rest: 90,
      tagRole: 'Personalizado',
    };
    onAddExercise(newItem);
    onClose();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const customEx: Exercise = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      category: customCategory,
      muscleKey: customMuscle,
      equip: ['full_gym', 'cables_free', 'dumbbells_only'],
      profile: 'Personalizado',
      stability: 'Alta',
      target: MUSCLE_NAMES[customMuscle],
      bio: 'Exercício personalizado adicionado pelo atleta.',
      cue: 'Mantenha a postura controlada e respeite a cadência de 3 segundos na fase excêntrica.',
    };

    const newItem: WorkoutItem = {
      id: `${customMuscle}_${customEx.id}_${Date.now()}`,
      muscleKey: customMuscle,
      exercise: customEx,
      sets: customSets,
      reps: customReps,
      rir: 'RIR 1-2',
      rest: customRest,
      tagRole: 'Atleta Custom',
    };

    onAddExercise(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Adicionar Exercício ao Treino
              </h3>
              <p className="text-xs text-slate-400">
                Escolha da lista ou crie seu próprio exercício
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Mode */}
        <div className="px-5 pt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
              !isCustomMode
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                : 'bg-[#0b1220] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Da Lista de Exercícios
          </button>
          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
              isCustomMode
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-[#0b1220] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Criar Exercício Personalizado
          </button>
        </div>

        {/* Content */}
        {!isCustomMode ? (
          <div className="p-5 flex flex-col flex-1 overflow-hidden space-y-3">
            {/* Search & Muscle Filters */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nome ou músculo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b1220] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Muscle Pill Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedMuscle('all')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap text-xs transition-colors ${
                  selectedMuscle === 'all'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-[#0b1220] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Todos
              </button>
              {ALL_MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMuscle(m)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap text-xs transition-colors ${
                    selectedMuscle === m
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-[#0b1220] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {MUSCLE_NAMES[m]}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => handleSelectPredefined(ex)}
                  className="p-3 rounded-xl bg-[#0b1220] border border-slate-800 hover:border-emerald-500/40 hover:bg-[#101b31] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase text-sky-400">
                        {MUSCLE_NAMES[ex.muscleKey]}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        · {ex.profile}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate block">
                      {ex.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {ex.target}
                    </span>
                  </div>

                  <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-400 transition-colors shrink-0">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Custom Exercise Form */
          <form onSubmit={handleCreateCustom} className="p-5 space-y-3 overflow-y-auto flex-1">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome do Exercício
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: Crucifixo Inclinado no Cabo"
                className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Grupamento Muscular
                </label>
                <select
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {ALL_MUSCLE_GROUPS.map((m) => (
                    <option key={m} value={m}>
                      {MUSCLE_NAMES[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Equipamento / Tipo
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Halter">Halteres</option>
                  <option value="Cabo">Polia / Cabos</option>
                  <option value="Máquina">Máquina Guiada</option>
                  <option value="Barra">Barra Livre</option>
                  <option value="Peso Corporal">Calistenia / Corporal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Séries
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={customSets}
                  onChange={(e) => setCustomSets(parseInt(e.target.value, 10) || 3)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-2 py-1.5 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Faixa de Reps
                </label>
                <input
                  type="text"
                  value={customReps}
                  onChange={(e) => setCustomReps(e.target.value)}
                  placeholder="8 a 10"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-2 py-1.5 text-center text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Descanso (s)
                </label>
                <input
                  type="number"
                  step="15"
                  value={customRest}
                  onChange={(e) => setCustomRest(parseInt(e.target.value, 10) || 90)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-2 py-1.5 text-center text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Inserir no Treino</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
