/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Droplets, Beef, Plus, RotateCcw, CheckCircle2, Flame, Sparkles, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types/workout';
import { safeStorage } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface DailyNutritionTrackerWidgetProps {
  user: UserProfile | null;
  onOpenNutritionCalculator?: () => void;
}

interface DailyNutritionLog {
  date: string;
  waterMl: number;
  proteinGrams: number;
}

const getTodayKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const DailyNutritionTrackerWidget: React.FC<DailyNutritionTrackerWidgetProps> = ({
  user,
  onOpenNutritionCalculator,
}) => {
  const userId = user?.id || 'guest';
  const todayKey = getTodayKey();
  const storageKey = `meutreino_daily_nutrition_${userId}_${todayKey}`;

  // Calculate targets from saved nutrition plan or athlete weight fallback
  const weightKg = user?.weightKg || 75;
  const targetWaterMl = user?.nutritionPlan?.waterMl || Math.round(weightKg * 35);
  const targetProteinGrams = user?.nutritionPlan?.proteinGrams || Math.round(weightKg * 2.0);
  const hasSavedPlan = Boolean(user?.nutritionPlan);

  const [log, setLog] = useState<DailyNutritionLog>(() => {
    const saved = safeStorage.get<DailyNutritionLog | null>(storageKey, null);
    if (saved && saved.date === todayKey) {
      return saved;
    }
    return { date: todayKey, waterMl: 0, proteinGrams: 0 };
  });

  useEffect(() => {
    const saved = safeStorage.get<DailyNutritionLog | null>(storageKey, null);
    if (saved && saved.date === todayKey) {
      setLog(saved);
    } else {
      setLog({ date: todayKey, waterMl: 0, proteinGrams: 0 });
    }
  }, [storageKey, todayKey]);

  const updateLog = (nextWater: number, nextProtein: number) => {
    const updated: DailyNutritionLog = {
      date: todayKey,
      waterMl: Math.max(0, nextWater),
      proteinGrams: Math.max(0, nextProtein),
    };
    setLog(updated);
    safeStorage.set(storageKey, updated);
    soundManager.vibrate(20);
  };

  const waterPct = Math.min(100, Math.round((log.waterMl / Math.max(1, targetWaterMl)) * 100));
  const proteinPct = Math.min(100, Math.round((log.proteinGrams / Math.max(1, targetProteinGrams)) * 100));
  const waterGoalMet = log.waterMl >= targetWaterMl;
  const proteinGoalMet = log.proteinGrams >= targetProteinGrams;
  const bothMet = waterGoalMet && proteinGoalMet;

  return (
    <div className="rounded-3xl bg-[#0f172a]/90 border border-slate-800 p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                Check-in Diário · Água & Meta de Proteína
              </h3>
              {bothMet && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  <CheckCircle2 className="w-3 h-3" /> Meta Diária Batida!
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {hasSavedPlan
                ? `Sincronizado com seu plano nutricional (${(targetWaterMl / 1000).toFixed(1)}L água · ${targetProteinGrams}g proteína/dia)`
                : `Estimativa para ${weightKg} kg (${(targetWaterMl / 1000).toFixed(1)}L água · ${targetProteinGrams}g proteína/dia)`}
            </p>
          </div>
        </div>

        {onOpenNutritionCalculator && (
          <button
            type="button"
            onClick={onOpenNutritionCalculator}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-[11px] font-bold text-amber-400 border border-amber-500/25 transition-all cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{hasSavedPlan ? 'Ver TMB & Macros' : 'Configurar TMB'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dual Tracker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
        {/* Water Card */}
        <div
          className={`rounded-2xl p-3.5 border transition-all ${
            waterGoalMet
              ? 'bg-sky-500/10 border-sky-500/40'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                  Hidratação Diária
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-black font-mono text-white">
                    {(log.waterMl / 1000).toFixed(2)}L
                  </span>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    / {(targetWaterMl / 1000).toFixed(1)}L ({waterPct}%)
                  </span>
                </div>
              </div>
            </div>

            {log.waterMl > 0 && (
              <button
                type="button"
                onClick={() => updateLog(log.waterMl - 250, log.proteinGrams)}
                title="Desfazer 250ml"
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${waterPct}%` }}
            />
          </div>

          {/* Quick Add Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateLog(log.waterMl + 250, log.proteinGrams)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 active:scale-[0.98] text-sky-300 border border-sky-500/30 font-black text-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+250 ml de Água</span>
            </button>
            <button
              type="button"
              onClick={() => updateLog(log.waterMl + 500, log.proteinGrams)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 active:scale-[0.98] text-sky-300 border border-sky-500/20 font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+500 ml (Garrafa)</span>
            </button>
          </div>
        </div>

        {/* Protein Card */}
        <div
          className={`rounded-2xl p-3.5 border transition-all ${
            proteinGoalMet
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Beef className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                  Meta de Proteína
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-black font-mono text-white">
                    {log.proteinGrams}g
                  </span>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    / {targetProteinGrams}g ({proteinPct}%)
                  </span>
                </div>
              </div>
            </div>

            {log.proteinGrams > 0 && (
              <button
                type="button"
                onClick={() => updateLog(log.waterMl, log.proteinGrams - 15)}
                title="Desfazer 15g"
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${proteinPct}%` }}
            />
          </div>

          {/* Quick Add Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateLog(log.waterMl, log.proteinGrams + 30)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-[0.98] text-emerald-300 border border-emerald-500/30 font-black text-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+30g Proteína</span>
            </button>
            <button
              type="button"
              onClick={() => updateLog(log.waterMl, log.proteinGrams + 15)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] text-emerald-300 border border-emerald-500/20 font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+15g Lanche/Ovos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
