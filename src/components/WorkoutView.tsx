/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  CheckCircle2, 
  RotateCcw, 
  Download, 
  Upload, 
  Sliders, 
  Dumbbell,
  FileEdit
} from 'lucide-react';
import { 
  SplitOption, 
  StrategyOption, 
  LevelOption, 
  EquipmentRequirement, 
  WorkoutItem, 
  WorkoutLogs 
} from '../types/workout';
import { WorkoutConfig } from './WorkoutConfig';
import { ExerciseCard } from './ExerciseCard';
import { useI18n } from '../utils/i18n';

interface WorkoutViewProps {
  split: SplitOption;
  setSplit: (s: SplitOption) => void;
  strategy: StrategyOption;
  setStrategy: (s: StrategyOption) => void;
  weeklyBudget: number;
  setWeeklyBudget: (b: number) => void;
  level: LevelOption;
  setLevel: (l: LevelOption) => void;
  equip: EquipmentRequirement;
  setEquip: (e: EquipmentRequirement) => void;
  restSeconds: number;
  setRestSeconds: (s: number) => void;

  workoutItems: WorkoutItem[];
  logs: WorkoutLogs;
  history: WorkoutLogs;
  workoutNotes: string;
  onUpdateWorkoutNotes: (notes: string) => void;

  onGenerateRoutine: () => void;
  onOpenAddExercise: () => void;
  onOpenBudget: () => void;

  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDeleteExercise: (index: number) => void;
  onUpdateLog: (key: string, field: 'weight' | 'reps' | 'rpe' | 'rir' | 'setType', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onUpdateRest: (index: number, newRest: number) => void;
  onOpenWarmup: (name: string, weight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;

  onFinishSession: () => void;
  onResetToday: () => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WorkoutView: React.FC<WorkoutViewProps> = ({
  split,
  setSplit,
  strategy,
  setStrategy,
  weeklyBudget,
  setWeeklyBudget,
  level,
  setLevel,
  equip,
  setEquip,
  restSeconds,
  setRestSeconds,
  workoutItems,
  logs,
  history,
  workoutNotes,
  onUpdateWorkoutNotes,
  onGenerateRoutine,
  onOpenAddExercise,
  onOpenBudget,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
  onUpdateLog,
  onToggleSet,
  onUpdateRest,
  onOpenWarmup,
  onOpenSwap,
  onAddSet,
  onRemoveSet,
  onFinishSession,
  onResetToday,
  onExportBackup,
  onImportBackup,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Prescription Parameters */}
      <WorkoutConfig
        split={split}
        setSplit={setSplit}
        weeklyBudget={weeklyBudget}
        setWeeklyBudget={setWeeklyBudget}
        level={level}
        setLevel={setLevel}
        equip={equip}
        setEquip={setEquip}
        restSeconds={restSeconds}
        setRestSeconds={setRestSeconds}
      />

      {/* Main Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onGenerateRoutine}
          className="flex-1 py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          <span>{t.generateProportionalBtn}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddExercise}
            className="flex-1 sm:flex-none py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm bg-[#131d31] hover:bg-[#192742] text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>{t.addExerciseBtn}</span>
          </button>

          <button
            type="button"
            onClick={onOpenBudget}
            className="py-3.5 px-4 rounded-2xl font-bold text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
            title={t.budgetAdjustBtn}
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">{t.budgetBtn}</span>
          </button>
        </div>
      </div>

      {/* Workout Session Notes Input */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-2 text-slate-300">
          <FileEdit className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {t.sessionNotesTitle}
          </span>
        </div>
        <textarea
          value={workoutNotes}
          onChange={(e) => onUpdateWorkoutNotes(e.target.value)}
          placeholder={t.workoutNotesPlaceholder}
          rows={2}
          className="w-full bg-[#0a101d] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none font-medium leading-relaxed"
        />
      </div>

      {/* Workout Exercise Cards List */}
      {workoutItems.length === 0 ? (
        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-3xl p-10 text-center">
          <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            {t.emptyWorkoutTitle}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            {t.emptyWorkoutDesc}
          </p>
          <button
            type="button"
            onClick={onGenerateRoutine}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.generateProportionalBtn}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {workoutItems.map((item, index) => (
            <ExerciseCard
              key={item.id}
              item={item}
              index={index}
              logs={logs}
              history={history}
              canMoveUp={index > 0}
              canMoveDown={index < workoutItems.length - 1}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDeleteExercise={onDeleteExercise}
              onUpdateLog={onUpdateLog}
              onToggleSet={onToggleSet}
              onUpdateRest={onUpdateRest}
              onOpenWarmup={onOpenWarmup}
              onOpenSwap={onOpenSwap}
              onAddSet={onAddSet}
              onRemoveSet={onRemoveSet}
            />
          ))}
        </div>
      )}

      {/* Bottom Session Management Tools */}
      <div className="pt-6 border-t border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onFinishSession}
            className="py-3.5 px-4 rounded-xl font-extrabold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.finishSessionBtn}</span>
          </button>

          <button
            type="button"
            onClick={onExportBackup}
            className="py-3 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>{t.exportBackupBtn}</span>
          </button>

          <label className="py-3 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors text-center">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>{t.importBackupBtn}</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onResetToday}
            className="py-3 px-4 rounded-xl font-semibold text-xs bg-rose-950/20 hover:bg-rose-950/30 text-rose-400 border border-rose-900/40 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.resetTodayBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
