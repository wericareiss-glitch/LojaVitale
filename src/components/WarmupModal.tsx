/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Flame, ShieldAlert, Zap } from 'lucide-react';

interface WarmupModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  initialWeight: string;
}

export const WarmupModal: React.FC<WarmupModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  initialWeight,
}) => {
  const [targetWeight, setTargetWeight] = useState(
    parseFloat(initialWeight) > 0 ? parseFloat(initialWeight) : 60
  );

  if (!isOpen) return null;

  const w1 = Math.round(targetWeight * 0.5);
  const w2 = Math.round(targetWeight * 0.7);
  const w3 = Math.round(targetWeight * 0.85);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Aquecimento Específico & Rampa Neural
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">
                {exerciseName}
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

        {/* Target Weight Input */}
        <div className="bg-[#0c1220] p-3.5 rounded-2xl border border-slate-800 mb-4 flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-0.5">
              Carga Efetiva de Trabalho (1ª Série):
            </label>
            <span className="text-[11px] text-slate-500">
              As porcentagens de rampa serão calculadas com base neste valor.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              step="2.5"
              value={targetWeight}
              onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
              className="w-20 bg-[#131d31] border border-slate-700 rounded-xl px-2.5 py-1.5 text-center font-mono font-bold text-white text-base focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs font-bold text-slate-400 font-mono">kg</span>
          </div>
        </div>

        {/* 3-Step Ramp */}
        <div className="space-y-2.5">
          {/* Step 1 */}
          <div className="bg-[#0d1424] border border-sky-500/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Série 1 · Aquecimento Leve (50%)
              </span>
              <span className="text-sm font-black font-mono text-white">
                {w1} kg &times; 5 reps
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Movimento lento e controlado para aquecer as articulações. Descanso: 45s.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#0d1424] border border-emerald-500/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Série 2 · Preparação de Carga (70%)
              </span>
              <span className="text-sm font-black font-mono text-white">
                {w2} kg &times; 3 reps
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Movimento firme e controlado, sem cansar o músculo. Descanso: 60s.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-[#0d1424] border border-amber-500/20 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Série 3 · Teste de Carga (85%)
              </span>
              <span className="text-sm font-black font-mono text-white">
                {w3} kg &times; 1 rep
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sinta o peso nas mãos com postura firme, sem queimar o músculo. Descanso: 90s antes da primeira série pra valer.
            </p>
          </div>
        </div>

        {/* Note */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <strong>Dica:</strong> Séries de aquecimento preparam suas articulações e ajudam a evitar lesões. Faça antes de começar a contar suas séries principais!
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          Fechar Calculadora
        </button>
      </div>
    </div>
  );
};
