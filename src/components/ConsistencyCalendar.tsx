/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Flame, Trophy, Dumbbell, Activity, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { WorkoutSessionSummary, CardioSession } from '../types/workout';

interface ConsistencyCalendarProps {
  sessions: WorkoutSessionSummary[];
  cardioSessions?: CardioSession[];
  weeklyFrequencyGoal?: number;
}

interface DayData {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  dayOfMonth: number;
  dayOfWeek: number; // 0 = Dom, 1 = Seg...
  isToday: boolean;
  isFuture: boolean;
  workouts: WorkoutSessionSummary[];
  cardios: CardioSession[];
}

export const ConsistencyCalendar: React.FC<ConsistencyCalendarProps> = ({
  sessions = [],
  cardioSessions = [],
  weeklyFrequencyGoal = 4,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Mapeia os últimos 35 dias (5 semanas completas)
  const days = useMemo(() => {
    const list: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Começa 34 dias atrás até hoje
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Encontra treinos nessa data
      const matchedWorkouts = sessions.filter((s) => {
        try {
          const sDate = new Date(s.date);
          const sy = sDate.getFullYear();
          const sm = String(sDate.getMonth() + 1).padStart(2, '0');
          const sd = String(sDate.getDate()).padStart(2, '0');
          return `${sy}-${sm}-${sd}` === dateStr;
        } catch {
          return false;
        }
      });

      // Encontra cardios nessa data
      const matchedCardios = cardioSessions.filter((c) => {
        try {
          const cDate = new Date(c.date);
          const cy = cDate.getFullYear();
          const cm = String(cDate.getMonth() + 1).padStart(2, '0');
          const cd = String(cDate.getDate()).padStart(2, '0');
          return `${cy}-${cm}-${cd}` === dateStr;
        } catch {
          return false;
        }
      });

      list.push({
        dateStr,
        dateObj: d,
        dayOfMonth: d.getDate(),
        dayOfWeek: d.getDay(),
        isToday: i === 0,
        isFuture: false,
        workouts: matchedWorkouts,
        cardios: matchedCardios,
      });
    }

    return list;
  }, [sessions, cardioSessions]);

  // Estatísticas de consistência
  const stats = useMemo(() => {
    let daysWithWorkout = 0;
    let daysWithCardio = 0;
    let totalTonnageKg = 0;
    let currentStreak = 0;

    // Calcula streak
    let streakCount = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      const day = days[i];
      const hasActivity = day.workouts.length > 0 || day.cardios.length > 0;
      if (hasActivity) {
        streakCount++;
      } else if (day.isToday) {
        // Se hoje ainda não treinou, não quebra streak de ontem
        continue;
      } else {
        break;
      }
    }
    currentStreak = streakCount;

    days.forEach((d) => {
      if (d.workouts.length > 0) {
        daysWithWorkout++;
        d.workouts.forEach((w) => {
          totalTonnageKg += w.totalVolumeLoadKg || 0;
        });
      }
      if (d.cardios.length > 0) {
        daysWithCardio++;
      }
    });

    const totalActiveDays = days.filter((d) => d.workouts.length > 0 || d.cardios.length > 0).length;
    const consistencyRate = Math.min(100, Math.round((totalActiveDays / (35 * (weeklyFrequencyGoal / 7))) * 100));

    return {
      daysWithWorkout,
      daysWithCardio,
      totalActiveDays,
      totalTonnageKg,
      currentStreak,
      consistencyRate,
    };
  }, [days, weeklyFrequencyGoal]);

  const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-[#0b1220]/80 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>Calendário de Consistência</span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">(Últimos 35 dias)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Frequência e adesão ao seu plano de hipertrofia
            </span>
          </div>
        </div>

        {/* Badge Streak */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
          <span className="text-xs font-black font-mono">{stats.currentStreak} dias ativos</span>
        </div>
      </div>

      {/* Grid de Dias */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-800/80">
          {weekDayLabels.map((lbl, idx) => (
            <span key={idx}>{lbl}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {days.map((day) => {
            const hasWorkout = day.workouts.length > 0;
            const hasCardio = day.cardios.length > 0;
            const isSelected = selectedDay?.dateStr === day.dateStr;

            let bgClass = 'bg-slate-900/60 border-slate-800/80 text-slate-500 hover:border-slate-700';
            if (hasWorkout && hasCardio) {
              bgClass = 'bg-gradient-to-br from-emerald-600 to-sky-600 border-emerald-400 text-white font-black shadow-sm shadow-emerald-500/30 ring-1 ring-sky-400/40';
            } else if (hasWorkout) {
              bgClass = 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-400/80 text-white font-black shadow-sm shadow-emerald-500/20';
            } else if (hasCardio) {
              bgClass = 'bg-sky-600/90 hover:bg-sky-500 border-sky-400/80 text-white font-black shadow-sm shadow-sky-500/20';
            } else if (day.isToday) {
              bgClass = 'bg-slate-800 border-dashed border-sky-400/80 text-sky-300 font-bold';
            }

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDay((curr) => (curr?.dateStr === day.dateStr ? null : day))}
                className={`h-9 sm:h-10 rounded-xl flex flex-col items-center justify-center relative border transition-all cursor-pointer active:scale-95 ${bgClass} ${
                  isSelected ? 'ring-2 ring-white scale-105 z-10' : ''
                }`}
                title={`${day.dateStr}${hasWorkout ? ' · Musculação' : ''}${hasCardio ? ' · Cardio' : ''}`}
              >
                <span className="text-[11px] sm:text-xs font-mono">{day.dayOfMonth}</span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {hasWorkout && <span className="w-1.5 h-1.5 rounded-full bg-emerald-200" />}
                  {hasCardio && <span className="w-1.5 h-1.5 rounded-full bg-sky-200" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legenda de Cores */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] sm:text-[11px] text-slate-400 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
            <span>Musculação</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-sky-500" />
            <span>Cardio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-gradient-to-r from-emerald-500 to-sky-500" />
            <span>Ambos no dia</span>
          </div>
        </div>

        <span className="font-mono font-bold text-slate-300">
          Adesão: <strong className="text-emerald-400">{stats.consistencyRate}%</strong>
        </span>
      </div>

      {/* Detalhe do Dia Selecionado */}
      {selectedDay && (
        <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-sky-500/30 animate-fadeIn space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">
              📅 {selectedDay.dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Fechar ✕
            </button>
          </div>

          {selectedDay.workouts.length === 0 && selectedDay.cardios.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Nenhum treino registrado neste dia (dia de descanso/recuperação).</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDay.workouts.map((w, wIdx) => (
                <div key={wIdx} className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white">{w.splitName || 'Treino de Força'}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {w.totalSets} séries · {w.totalVolumeLoadKg.toLocaleString('pt-BR')} kg levantados
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {selectedDay.cardios.map((c, cIdx) => (
                <div key={cIdx} className="bg-sky-950/30 border border-sky-500/30 rounded-lg p-2 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white capitalize">{c.type || 'Cardio'}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {Math.round(c.durationSeconds / 60)} min · {c.distanceKm ? `${c.distanceKm} km · ` : ''}{c.calories || 0} kcal
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
