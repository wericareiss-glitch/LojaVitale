/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Apple, 
  Flame, 
  Sparkles, 
  Scale, 
  X, 
  Check, 
  TrendingUp, 
  Droplet, 
  Activity, 
  Target, 
  Zap, 
  Save, 
  Info,
  ChevronRight,
  Sliders,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { UserProfile, BodyMeasurement, NutritionGoal, ActivityLevel, NutritionPlan } from '../types/workout';
import { 
  ACTIVITY_LEVELS, 
  NUTRITION_GOALS, 
  calculateBMR, 
  calculateTDEE, 
  calculateMacros,
  getDefaultActivityLevel 
} from '../utils/nutritionEngine';

interface NutritionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  measurements?: BodyMeasurement[];
  onSavePlan: (plan: NutritionPlan) => void;
}

export const NutritionModal: React.FC<NutritionModalProps> = ({
  isOpen,
  onClose,
  user,
  measurements = [],
  onSavePlan,
}) => {
  // Pega medição mais recente se houver
  const latestMeasurement = measurements.length > 0
    ? [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const defaultWeight = latestMeasurement?.weightKg || user.weightKg || 75;
  const defaultHeight = user.heightM || 1.75;

  // Modo de preenchimento: 'auto' (perfil) ou 'manual' (livre)
  const [inputMode, setInputMode] = useState<'auto' | 'manual'>('auto');

  // Dados corporais
  const [weightInput, setWeightInput] = useState<string>(defaultWeight.toString());
  const [heightInput, setHeightInput] = useState<string>(defaultHeight.toString());
  const [ageInput, setAgeInput] = useState<number>(user.age || 26);
  const [genderInput, setGenderInput] = useState<'male' | 'female'>((user.gender === 'female' ? 'female' : 'male'));
  const [bodyFatInput, setBodyFatInput] = useState<string>(() => {
    if (user.bodyFatPercent !== undefined) return user.bodyFatPercent.toString();
    if (latestMeasurement?.bodyFatPercent !== undefined) return latestMeasurement.bodyFatPercent.toString();
    return '';
  });

  const [goal, setGoal] = useState<NutritionGoal>(() => {
    return user.nutritionPlan?.goal || 'cutting';
  });

  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(() => {
    return user.nutritionPlan?.activityLevel || getDefaultActivityLevel(user.frequency || 4);
  });

  // Ajuste fino manual de macros (se o usuário quiser sobrescrever individualmente)
  const [manualMacrosOverride, setManualMacrosOverride] = useState<boolean>(false);
  const [customProteinGrams, setCustomProteinGrams] = useState<string>('');
  const [customCarbsGrams, setCustomCarbsGrams] = useState<string>('');
  const [customFatsGrams, setCustomFatsGrams] = useState<string>('');
  const [customCalories, setCustomCalories] = useState<string>('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Valores numéricos processados
  const weightKg = parseFloat(weightInput) || defaultWeight;
  const heightM = parseFloat(heightInput) || defaultHeight;
  const age = ageInput || 26;
  const bodyFatPercent = bodyFatInput ? parseFloat(bodyFatInput) : undefined;

  // Cálculo de TMB e GET
  const { bmr, formulaUsed } = useMemo(() => {
    return calculateBMR({
      weightKg,
      heightM,
      age,
      gender: genderInput,
      bodyFatPercent,
    });
  }, [weightKg, heightM, age, genderInput, bodyFatPercent]);

  const tdee = useMemo(() => {
    return calculateTDEE(bmr, activityLevel);
  }, [bmr, activityLevel]);

  // Calorias Alvo automáticas baseadas na meta
  const autoTargetCalories = useMemo(() => {
    const goalConfig = NUTRITION_GOALS.find((g) => g.id === goal) || NUTRITION_GOALS[1];
    return Math.max(1200, Math.round(tdee * (1 + goalConfig.deltaPct)));
  }, [tdee, goal]);

  // Macros automáticos com gordura fixada em NO MÁXIMO 20%
  const autoMacros = useMemo(() => {
    const targetCals = manualMacrosOverride && customCalories ? parseInt(customCalories, 10) || autoTargetCalories : autoTargetCalories;
    return calculateMacros(weightKg, targetCals, goal);
  }, [weightKg, autoTargetCalories, goal, manualMacrosOverride, customCalories]);

  // Se manualMacrosOverride estiver ativo, usa valores digitados pelo usuário
  const effectiveCalories = manualMacrosOverride && customCalories
    ? parseInt(customCalories, 10) || autoTargetCalories
    : autoTargetCalories;

  const effectiveProtein = manualMacrosOverride && customProteinGrams
    ? parseInt(customProteinGrams, 10) || autoMacros.proteinGrams
    : autoMacros.proteinGrams;

  const effectiveCarbs = manualMacrosOverride && customCarbsGrams
    ? parseInt(customCarbsGrams, 10) || autoMacros.carbsGrams
    : autoMacros.carbsGrams;

  const effectiveFats = manualMacrosOverride && customFatsGrams
    ? parseInt(customFatsGrams, 10) || autoMacros.fatsGrams
    : autoMacros.fatsGrams;

  const proteinCals = effectiveProtein * 4;
  const carbsCals = effectiveCarbs * 4;
  const fatsCals = effectiveFats * 9;
  const totalCals = proteinCals + carbsCals + fatsCals || effectiveCalories;

  const proteinPct = Math.round((proteinCals / totalCals) * 100);
  const carbsPct = Math.round((carbsCals / totalCals) * 100);
  const fatsPct = Math.max(0, 100 - (proteinPct + carbsPct));

  const proteinPerKg = weightKg > 0 ? Math.round((effectiveProtein / weightKg) * 10) / 10 : 2.0;
  const fatsPerKg = weightKg > 0 ? Math.round((effectiveFats / weightKg) * 10) / 10 : 0.8;
  const waterMl = Math.round(weightKg * 40);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalPlan: NutritionPlan = {
      tmb: bmr,
      tdee,
      targetCalories: effectiveCalories,
      goal,
      activityLevel,
      age,
      bodyFatPercent,
      proteinGrams: effectiveProtein,
      proteinPerKg,
      carbsGrams: effectiveCarbs,
      fatsGrams: effectiveFats,
      fatsPerKg,
      waterMl,
      calculatedAt: new Date().toISOString(),
    };

    onSavePlan(finalPlan);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetToProfile = () => {
    setWeightInput(defaultWeight.toString());
    setHeightInput(defaultHeight.toString());
    setAgeInput(user.age || 26);
    setGenderInput((user.gender === 'female' ? 'female' : 'male'));
    setManualMacrosOverride(false);
    setCustomCalories('');
    setCustomProteinGrams('');
    setCustomCarbsGrams('');
    setCustomFatsGrams('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden ring-1 ring-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#0d1527]/90 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-md">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Calculadora Científica de TMB & Macros
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Nutrição Esportiva
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gasto Energético Total (GET), déficit/superávit calibrado e gordura máxima de 20%
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Seletor de Modo: Perfil vs Manual */}
          <div className="flex items-center justify-between p-1 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setInputMode('auto');
                handleResetToProfile();
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                inputMode === 'auto'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sincronizado com Perfil</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                inputMode === 'manual'
                  ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Preenchimento Manual Livre</span>
            </button>
          </div>

          {/* 1. Seleção do Objetivo */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. Selecione o Objetivo Nutricional:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NUTRITION_GOALS.map((g) => {
                const isSelected = goal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black">{g.label}</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {g.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{g.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Parâmetros Fisiológicos (Automático ou Manual Livre) */}
          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-sky-400" />
                <span>2. Dados Corporais {inputMode === 'manual' ? '(Modo Manual Ativo)' : ''}:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Fórmula: {formulaUsed}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Altura (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={heightInput}
                  disabled={inputMode === 'auto'}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className={`w-full bg-slate-900 border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500 ${
                    inputMode === 'auto' ? 'border-slate-800 opacity-80' : 'border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Idade (anos)</label>
                <input
                  type="number"
                  min="12"
                  max="100"
                  value={ageInput}
                  onChange={(e) => setAgeInput(parseInt(e.target.value, 10) || 26)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                  % Gordura (BF%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="50"
                  placeholder="ex: 14"
                  value={bodyFatInput}
                  onChange={(e) => setBodyFatInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Sexo Biológico (quando em modo manual) */}
            {inputMode === 'manual' && (
              <div className="pt-1">
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Sexo Biológico:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenderInput('male')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      genderInput === 'male'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderInput('female')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      genderInput === 'female'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>
            )}

            {/* Nível de Atividade */}
            <div className="pt-2">
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">Nível de Atividade Física Diária:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {ACTIVITY_LEVELS.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActivityLevel(a.id)}
                    className={`p-2 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      activityLevel === a.id
                        ? 'bg-sky-500/15 border-sky-500 text-sky-200 font-bold'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="block font-black">{a.label}</span>
                    <span className="text-[9px] text-slate-400 block truncate">{a.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Resultados Energéticos: TMB e GET */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#0e1628] rounded-2xl p-3 border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Taxa Basal (TMB)
              </span>
              <span className="text-base sm:text-xl font-black font-mono text-white">
                {bmr} <span className="text-[10px] text-slate-400 font-normal">kcal</span>
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">repouso absoluto</span>
            </div>

            <div className="bg-[#0e1628] rounded-2xl p-3 border border-sky-500/30 text-center">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-0.5">
                Gasto Total (GET)
              </span>
              <span className="text-base sm:text-xl font-black font-mono text-sky-300">
                {tdee} <span className="text-[10px] text-slate-400 font-normal">kcal</span>
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">calorias com treinos</span>
            </div>

            <div className="bg-gradient-to-tr from-emerald-950/60 to-emerald-900/30 rounded-2xl p-3 border border-emerald-500/50 text-center shadow-lg shadow-emerald-500/10">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block mb-0.5">
                Meta Diária
              </span>
              <span className="text-base sm:text-xl font-black font-mono text-emerald-300">
                {effectiveCalories} <span className="text-[10px] text-emerald-400/80 font-normal">kcal</span>
              </span>
              <span className="text-[9px] text-emerald-300/80 block mt-0.5 font-bold">consumo programado</span>
            </div>
          </div>

          {/* 4. Distribuição de Macronutrientes (Com Teto de Gordura em Máx. 20%) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Sugestão Diária de Macronutrientes:</span>
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                  Gordura: Máx. 20% total
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {proteinPct}% Prot · {carbsPct}% Carb · {fatsPct}% Gord
                </span>
              </div>
            </div>

            {/* Barra Visual de Proporção */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-900 border border-slate-800">
              <div style={{ width: `${proteinPct}%` }} className="bg-emerald-500 h-full" title={`Proteína: ${proteinPct}%`} />
              <div style={{ width: `${carbsPct}%` }} className="bg-amber-400 h-full" title={`Carboidratos: ${carbsPct}%`} />
              <div style={{ width: `${fatsPct}%` }} className="bg-rose-500 h-full" title={`Gorduras: ${fatsPct}%`} />
            </div>

            {/* Cards dos 3 Macros + Água */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Proteínas */}
              <div className="bg-slate-950/80 rounded-2xl p-3 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-emerald-400">Proteínas</span>
                  <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                    {proteinPerKg}g/kg
                  </span>
                </div>
                <div className="text-lg sm:text-2xl font-black font-mono text-white">
                  {effectiveProtein} <span className="text-xs text-slate-400 font-normal">g</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {proteinCals} kcal ({proteinPct}%)
                </span>
              </div>

              {/* Carboidratos */}
              <div className="bg-slate-950/80 rounded-2xl p-3 border border-amber-500/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-amber-400">Carboidratos</span>
                  <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">
                    Performance
                  </span>
                </div>
                <div className="text-lg sm:text-2xl font-black font-mono text-white">
                  {effectiveCarbs} <span className="text-xs text-slate-400 font-normal">g</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {carbsCals} kcal ({carbsPct}%)
                </span>
              </div>

              {/* Gorduras (Máximo 20% do total calórico) */}
              <div className="bg-slate-950/80 rounded-2xl p-3 border border-rose-500/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-rose-400">Gorduras</span>
                  <span className="text-[10px] font-mono text-rose-300 font-bold bg-rose-500/15 px-1.5 py-0.2 rounded">
                    ≤ 20% kcal
                  </span>
                </div>
                <div className="text-lg sm:text-2xl font-black font-mono text-white">
                  {effectiveFats} <span className="text-xs text-slate-400 font-normal">g</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {fatsCals} kcal ({fatsPct}%)
                </span>
              </div>

              {/* Hidratação */}
              <div className="bg-slate-950/80 rounded-2xl p-3 border border-sky-500/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-sky-400 flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-sky-400" />
                    Água
                  </span>
                  <span className="text-[10px] font-mono text-sky-300 font-bold bg-sky-500/10 px-1.5 py-0.2 rounded">
                    40ml/kg
                  </span>
                </div>
                <div className="text-lg sm:text-2xl font-black font-mono text-white">
                  {(waterMl / 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">L</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {waterMl} ml / dia
                </span>
              </div>
            </div>

            {/* Opção para Ajuste Fino Manual dos Macros (Sobrescrever gramas) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setManualMacrosOverride(!manualMacrosOverride)}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{manualMacrosOverride ? 'Ocultar Ajuste Manual de Gramas' : 'Deseja personalizar os gramas de macros manualmente?'}</span>
              </button>

              {manualMacrosOverride && (
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-sky-500/30 grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-fadeIn">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Calorias (kcal)</label>
                    <input
                      type="number"
                      placeholder={autoTargetCalories.toString()}
                      value={customCalories}
                      onChange={(e) => setCustomCalories(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Proteínas (g)</label>
                    <input
                      type="number"
                      placeholder={autoMacros.proteinGrams.toString()}
                      value={customProteinGrams}
                      onChange={(e) => setCustomProteinGrams(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Carboidratos (g)</label>
                    <input
                      type="number"
                      placeholder={autoMacros.carbsGrams.toString()}
                      value={customCarbsGrams}
                      onChange={(e) => setCustomCarbsGrams(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Gorduras (g)</label>
                    <input
                      type="number"
                      placeholder={autoMacros.fatsGrams.toString()}
                      value={customFatsGrams}
                      onChange={(e) => setCustomFatsGrams(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0d1424] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Plano Nutricional Salvo!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Meta no Meu Perfil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
