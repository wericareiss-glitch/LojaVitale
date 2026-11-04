/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  Plus, 
  Minus, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { MuscleGroup } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { BUDGET_PRESETS, ALL_MUSCLE_GROUPS, scaleWeightsToBudget } from '../utils/auth';

interface VolumeBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyBudget: number;
  muscleBudgets: Record<MuscleGroup, number>;
  onSaveBudgets: (totalBudget: number, newBudgets: Record<MuscleGroup, number>) => void;
}

export const VolumeBudgetModal: React.FC<VolumeBudgetModalProps> = ({
  isOpen,
  onClose,
  weeklyBudget: initialBudget,
  muscleBudgets: initialMuscles,
  onSaveBudgets,
}) => {
  const [targetBudget, setTargetBudget] = useState(initialBudget || 88);
  const [budgets, setBudgets] = useState<Record<MuscleGroup, number>>(() => ({
    ...initialMuscles,
  }));

  if (!isOpen) return null;

  const totalAllocated = Object.values(budgets).reduce((a, b) => a + b, 0);
  const diff = targetBudget - totalAllocated;

  // Status color logic
  let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let balanceMessage = 'Séries 100% equilibradas e perfeitas!';
  let barColor = 'bg-emerald-400';

  if (diff > 0) {
    statusColor = 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    balanceMessage = `Abaixo do teto: restam ${diff} séries para distribuir.`;
    barColor = 'bg-sky-400';
  } else if (diff < 0) {
    statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    balanceMessage = `Alerta de Sobretreino: ${Math.abs(diff)} séries acima do teto!`;
    barColor = 'bg-rose-500';
  }

  const handleAdjustMuscle = (m: MuscleGroup, delta: number) => {
    setBudgets((prev) => ({
      ...prev,
      [m]: Math.max(1, (prev[m] || 0) + delta),
    }));
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = BUDGET_PRESETS[presetKey];
    if (!preset) return;
    const scaled = scaleWeightsToBudget(preset.weights, targetBudget);
    setBudgets(scaled);
  };

  const handleSave = () => {
    onSaveBudgets(targetBudget, budgets);
    onClose();
  };

  const percentAllocated = Math.min(100, Math.round((totalAllocated / targetBudget) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Gestão de Séries Semanais
              </h3>
              <p className="text-xs text-slate-400">
                Metas de Séries & Recuperação Semanal
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

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Teto Maximo Semanal */}
          <div className="bg-[#0b1220] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-0.5">
                Total de Séries na Semana
              </span>
              <p className="text-[11px] text-slate-400">
                Total de séries que você planeja fazer na semana para evoluir sem cansaço excessivo.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {[70, 80, 88, 100].map((presetVal) => (
                <button
                  key={presetVal}
                  type="button"
                  onClick={() => {
                    setTargetBudget(presetVal);
                    // auto rescale current proportions
                    setBudgets((prev) => scaleWeightsToBudget(prev, presetVal));
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                    targetBudget === presetVal
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#121c2e] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {presetVal}s
                </button>
              ))}
              <input
                type="number"
                step="2"
                min="30"
                max="180"
                value={targetBudget}
                onChange={(e) => setTargetBudget(parseInt(e.target.value, 10) || 70)}
                className="w-16 bg-[#131d31] border border-slate-700 rounded-xl px-2 py-1 text-center font-mono font-black text-amber-400 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Real-time Balance Bar */}
          <div className={`p-4 rounded-2xl border transition-all ${statusColor}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                {diff === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>Balanço: {totalAllocated} / {targetBudget} séries</span>
              </span>
              <span className="text-xs font-mono font-bold">{percentAllocated}%</span>
            </div>

            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${Math.min(100, (totalAllocated / targetBudget) * 100)}%` }}
              />
            </div>

            <p className="text-[11px] font-medium mt-1.5">{balanceMessage}</p>
          </div>

          {/* Modelos Sugeridos de Séries */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modelos Prontos de Treino</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.keys(BUDGET_PRESETS).map((key) => {
                const preset = BUDGET_PRESETS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyPreset(key)}
                    className="p-3 rounded-xl bg-[#0c1322] hover:bg-[#121c31] border border-slate-800/80 hover:border-slate-700 text-left transition-all group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ajuste Fino (+ e -) por Grupo Muscular */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Distribuição por Grupo Muscular (11 Grupamentos)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">
                Séries semanais recomendadas: 6 a 16
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_MUSCLE_GROUPS.map((m) => {
                const val = budgets[m] || 0;
                return (
                  <div
                    key={m}
                    className="p-2.5 rounded-xl bg-[#0b1220] border border-slate-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="truncate flex-1">
                      <span className="text-xs font-semibold text-white truncate block">
                        {MUSCLE_NAMES[m]}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ~{Math.round((val / (totalAllocated || 1)) * 100)}% do volume total
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAdjustMuscle(m, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="w-8 text-center font-mono font-black text-sm text-amber-300">
                        {val}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAdjustMuscle(m, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-[#0c1220]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar Séries</span>
          </button>
        </div>
      </div>
    </div>
  );
};
