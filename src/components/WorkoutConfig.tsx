/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sliders, Layers, Award, Clock, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { SplitOption, LevelOption, EquipmentRequirement } from '../types/workout';

interface WorkoutConfigProps {
  split: SplitOption;
  setSplit: (s: SplitOption) => void;
  weeklyBudget: number;
  setWeeklyBudget: (b: number) => void;
  level: LevelOption;
  setLevel: (l: LevelOption) => void;
  equip: EquipmentRequirement;
  setEquip: (e: EquipmentRequirement) => void;
  restSeconds: number;
  setRestSeconds: (s: number) => void;
}

export const WorkoutConfig: React.FC<WorkoutConfigProps> = ({
  split,
  setSplit,
  weeklyBudget,
  setWeeklyBudget,
  level,
  setLevel,
  equip,
  setEquip,
  restSeconds,
  setRestSeconds,
}) => {
  const [showManualSets, setShowManualSets] = useState(false);

  const handleLevelChange = (newLevel: LevelOption) => {
    setLevel(newLevel);
    // Volumes padrões baseados no nível:
    // 80 series iniciante, 120 intermediário, 160 avançado
    if (newLevel === 'beginner') {
      setWeeklyBudget(80);
    } else if (newLevel === 'intermediate') {
      setWeeklyBudget(120);
    } else if (newLevel === 'advanced') {
      setWeeklyBudget(160);
    }
  };

  return (
    <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl p-4 sm:p-5 shadow-xl shadow-black/30 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs sm:text-sm font-bold text-emerald-400 tracking-wider uppercase">
            Parâmetros de Geração de Treino
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            {weeklyBudget} séries/sem
          </span>
          <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
            {restSeconds}s descanso
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Nível do Atleta — Somente os titles solicitados */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Nível do Atleta
          </label>
          <select
            value={level}
            onChange={(e) => handleLevelChange(e.target.value as LevelOption)}
            className="w-full bg-[#0d1424] border border-[#223352] text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="beginner">Iniciante</option>
            <option value="intermediate">Intermediário</option>
            <option value="advanced">Avançado</option>
          </select>
        </div>

        {/* 2. Divisão Muscular (Split) */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Divisão Muscular
          </label>
          <select
            value={split}
            onChange={(e) => setSplit(e.target.value as SplitOption)}
            className="w-full bg-[#0d1424] border border-[#223352] text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="fullbody">Full Body (Corpo Inteiro)</option>
            <option value="abcde">ABCDE (5 Dias por Músculo)</option>
            <option value="upper_lower">Upper / Lower (Superiores & Inferiores)</option>
            <option value="ppl">Push / Pull / Legs (PPL)</option>
            <option value="lower">Lower (Foco Inferiores & Glúteos)</option>
            <option value="upper">Upper (Foco Superiores)</option>
            <option value="legs">Legs (Pernas Isoladas)</option>
            <option value="push">Push (Empurrar)</option>
            <option value="pull">Pull (Puxar)</option>
          </select>
        </div>

        {/* 3. Equipamentos */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Equipamentos
          </label>
          <select
            value={equip}
            onChange={(e) => setEquip(e.target.value as EquipmentRequirement)}
            className="w-full bg-[#0d1424] border border-[#223352] text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="full_gym">Academia Completa</option>
            <option value="cables_free">Cabos & Pesos Livres</option>
            <option value="dumbbells_only">Apenas Halteres</option>
          </select>
        </div>

        {/* 4. Descanso por Série */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Descanso p/ Série
          </label>
          <select
            value={restSeconds}
            onChange={(e) => setRestSeconds(parseInt(e.target.value, 10) || 30)}
            className="w-full bg-[#0d1424] border border-[#223352] text-sky-300 font-mono font-bold text-xs sm:text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer"
          >
            <option value="30">30s (Automático)</option>
            <option value="45">45s</option>
            <option value="60">60s (1 minuto)</option>
            <option value="90">90s (1 min e meio)</option>
            <option value="120">120s (2 minutos)</option>
            <option value="180">180s (3 minutos)</option>
          </select>
        </div>
      </div>

      {/* Opção discreta e oculta para inserir séries semanais manualmente */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowManualSets(!showManualSets)}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
        >
          {showManualSets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>Inserir séries semanais manualmente (opcional)</span>
          <span className="text-[10px] font-mono text-slate-600 ml-1">· Atual: {weeklyBudget} séries</span>
        </button>

        {showManualSets && (
          <div className="mt-3 p-3 rounded-2xl bg-[#090e1a] border border-slate-800 max-w-sm animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>Volume Semanal Manual:</span>
              </span>
              <span className="text-xs font-mono font-black text-amber-400">
                {weeklyBudget} séries
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWeeklyBudget(Math.max(10, weeklyBudget - 10))}
                className="w-10 h-9 rounded-xl bg-[#0d1424] border border-[#223352] text-slate-300 hover:text-white font-mono font-bold text-xs flex items-center justify-center hover:bg-slate-800 cursor-pointer"
              >
                -10
              </button>
              <input
                type="number"
                min={10}
                max={300}
                step={1}
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(Math.max(10, parseInt(e.target.value, 10) || 10))}
                className="w-full bg-[#0d1424] border border-[#223352] text-amber-300 text-center font-mono font-bold text-sm rounded-xl px-2 py-1.5 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setWeeklyBudget(Math.min(300, weeklyBudget + 10))}
                className="w-10 h-9 rounded-xl bg-[#0d1424] border border-[#223352] text-slate-300 hover:text-white font-mono font-bold text-xs flex items-center justify-center hover:bg-slate-800 cursor-pointer"
              >
                +10
              </button>
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              {[80, 120, 160].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setWeeklyBudget(preset)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                    weeklyBudget === preset
                      ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40'
                      : 'bg-[#0b1220] hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  {preset} séries
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
