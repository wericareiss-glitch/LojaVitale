/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Trophy, 
  Dumbbell, 
  Calendar, 
  Award, 
  ArrowRight, 
  FileText, 
  Share2, 
  TrendingUp, 
  Sparkles, 
  Zap, 
  Target,
  Clock,
  Bell,
  Camera,
  Flame,
  Check,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { 
  UserProfile, 
  WorkoutSessionSummary, 
  MuscleGroup 
} from '../types/workout';
import { VolumeDashboard } from './VolumeDashboard';
import { TopLoadProgressComponent } from './TopLoadProgressComponent';
import { DailyNutritionTrackerWidget } from './DailyNutritionTrackerWidget';
import { MuscleRecoveryHeatmap } from './MuscleRecoveryHeatmap';
import { ConsistencyCalendar } from './ConsistencyCalendar';
import { useI18n } from '../utils/i18n';

const HomeAnalyticsDashboard = React.lazy(() =>
  import('./HomeAnalyticsDashboard').then((m) => ({ default: m.HomeAnalyticsDashboard }))
);
const WeeklyVolumeOverloadChart = React.lazy(() =>
  import('./WeeklyVolumeOverloadChart').then((m) => ({ default: m.WeeklyVolumeOverloadChart }))
);
const MuscleSymmetryRadar = React.lazy(() =>
  import('./MuscleSymmetryRadar').then((m) => ({ default: m.MuscleSymmetryRadar }))
);
import { 
  getWeeklyMicrocycleStatus, 
  requestNotificationPermission, 
  sendAppNotification, 
  isNotificationSupported,
  getReminderConfig,
  saveReminderConfig,
  checkAndTriggerScheduledNotification,
  getNotificationPermissionStatus,
  normalizeReminderTimes,
  getNextScheduledReminderInfo,
  DailyReminderConfig
} from '../utils/notifications';

interface HomeViewProps {
  user: UserProfile | null;
  sessions: WorkoutSessionSummary[];
  completedSetsByMuscle: Record<MuscleGroup, number>;
  activeWorkoutMuscles: MuscleGroup[];
  totalSetsInWorkout: number;
  totalCompletedSetsInWorkout: number;
  workoutNotes: string;
  onUpdateWorkoutNotes: (notes: string) => void;
  onOpenVolumeBudget: () => void;
  onGoToWorkout: () => void;
  onViewSummary: (session: WorkoutSessionSummary) => void;
  onOpenAnalytics?: (exerciseName?: string) => void;
  onOpenMeasurements?: () => void;
  onOpenDeloadAssistant?: () => void;
  isDeloadActive?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  sessions,
  completedSetsByMuscle,
  activeWorkoutMuscles,
  totalSetsInWorkout,
  totalCompletedSetsInWorkout,
  workoutNotes,
  onUpdateWorkoutNotes,
  onOpenVolumeBudget,
  onGoToWorkout,
  onViewSummary,
  onOpenAnalytics,
  onOpenMeasurements,
  onOpenDeloadAssistant,
  isDeloadActive = false,
}) => {
  const { t, language } = useI18n();

  // Weekly microcycle consistency calculation
  const microcycle = useMemo(
    () => getWeeklyMicrocycleStatus(sessions, user?.frequency || 4),
    [sessions, user?.frequency]
  );
  const [notifStatus, setNotifStatus] = useState<'idle' | 'success' | 'blocked'>('idle');
  const [permStatus, setPermStatus] = useState<NotificationPermission>(() => getNotificationPermissionStatus());
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [testNotifSuccess, setTestNotifSuccess] = useState(false);
  const [newTimeInput, setNewTimeInput] = useState('07:00');
  const [showAllSessions, setShowAllSessions] = useState(false);

  const [reminderConfig, setReminderConfig] = useState<DailyReminderConfig>(() => {
    return user
      ? getReminderConfig(user.id)
      : { enabled: false, time: '18:00', times: ['18:00'], days: [1, 2, 3, 4, 5], customMessage: '' };
  });

  // Sincroniza configuração quando o usuário ativo muda ou quando atualizada na aba Perfil
  useEffect(() => {
    if (user) {
      setReminderConfig(getReminderConfig(user.id));
    }
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; config: DailyReminderConfig }>;
      if (user && customEvent.detail && customEvent.detail.userId === user.id) {
        setReminderConfig(customEvent.detail.config);
      }
    };
    window.addEventListener('meutreino:reminder-updated', handleSync);
    return () => window.removeEventListener('meutreino:reminder-updated', handleSync);
  }, [user?.id]);

  // Atualiza permissão atual e escuta clique na notificação Push do Service Worker
  useEffect(() => {
    setPermStatus(getNotificationPermissionStatus());

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK_ACTION') {
          onGoToWorkout();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  }, [onGoToWorkout]);

  // Lista normalizada de horários configurados
  const configuredTimes = useMemo(() => normalizeReminderTimes(reminderConfig), [reminderConfig]);

  // Próximo lembrete agendado (ex: "Hoje às 18:00 • em 2h 15m")
  const nextReminderInfo = useMemo(
    () => getNextScheduledReminderInfo(reminderConfig),
    [reminderConfig]
  );

  // Verifica imediatamente ao alterar configurações de lembrete (o polling global de 25s e visibilitychange já roda em App.tsx)
  const userId = user?.id;
  const userName = user?.name;
  const reminderEnabled = reminderConfig.enabled;
  const reminderTimesKey = configuredTimes.join(',');
  const reminderDaysStr = reminderConfig.days.join(',');

  useEffect(() => {
    if (!userId || !reminderEnabled) return;
    checkAndTriggerScheduledNotification(userId, userName || 'Atleta');
  }, [userId, userName, reminderEnabled, reminderTimesKey, reminderDaysStr]);

  const handleToggleReminder = async () => {
    if (!user) return;

    if (!reminderConfig.enabled) {
      const currentPerm = getNotificationPermissionStatus();
      if (currentPerm !== 'granted') {
        const granted = await requestNotificationPermission();
        setPermStatus(getNotificationPermissionStatus());
        if (!granted) {
          setNotifStatus('blocked');
          setTimeout(() => setNotifStatus('idle'), 4000);
          return;
        }
      }
      const times = normalizeReminderTimes(reminderConfig);
      const nextConfig: DailyReminderConfig = {
        ...reminderConfig,
        enabled: true,
        time: times[0],
        times,
      };
      setReminderConfig(nextConfig);
      saveReminderConfig(user.id, nextConfig);
      sendAppNotification(
        'MeuTreino Pro ⚡ • Lembretes Ativos',
        `Lembretes agendados para: ${times.join(', ')} nos dias selecionados!`
      );
      setNotifStatus('success');
      setTimeout(() => setNotifStatus('idle'), 3000);
    } else {
      const nextConfig = { ...reminderConfig, enabled: false };
      setReminderConfig(nextConfig);
      saveReminderConfig(user.id, nextConfig);
    }
  };

  const handleUpdatePrimaryTime = (index: number, newTime: string) => {
    if (!user || !newTime) return;
    const currentList = [...configuredTimes];
    currentList[index] = newTime;
    const nextTimes = Array.from(new Set(currentList)).sort();
    const nextConfig: DailyReminderConfig = {
      ...reminderConfig,
      time: nextTimes[0] || '18:00',
      times: nextTimes,
    };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleAddReminderTime = (timeToAdd?: string) => {
    if (!user) return;
    const target = (timeToAdd || newTimeInput || '07:00').trim();
    if (!/^\d{2}:\d{2}$/.test(target)) return;
    const nextTimes = Array.from(new Set([...configuredTimes, target])).sort();
    const nextConfig: DailyReminderConfig = {
      ...reminderConfig,
      time: nextTimes[0],
      times: nextTimes,
    };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleRemoveReminderTime = (timeToRemove: string) => {
    if (!user || configuredTimes.length <= 1) return;
    const nextTimes = configuredTimes.filter((t) => t !== timeToRemove);
    const nextConfig: DailyReminderConfig = {
      ...reminderConfig,
      time: nextTimes[0] || '18:00',
      times: nextTimes,
    };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleUpdateCustomMessage = (msg: string) => {
    if (!user) return;
    const nextConfig: DailyReminderConfig = {
      ...reminderConfig,
      customMessage: msg,
    };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleToggleDay = (day: number) => {
    if (!user) return;
    const exists = reminderConfig.days.includes(day);
    const nextDays = exists 
      ? reminderConfig.days.filter((d) => d !== day)
      : [...reminderConfig.days, day].sort();
    
    const nextConfig = { ...reminderConfig, days: nextDays.length > 0 ? nextDays : [day] };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleSendTestNotification = async () => {
    const currentPerm = getNotificationPermissionStatus();
    if (currentPerm !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermStatus(getNotificationPermissionStatus());
      if (!granted) return;
    }
    const msg =
      reminderConfig.customMessage && reminderConfig.customMessage.trim().length > 0
        ? reminderConfig.customMessage.trim()
        : `Hora do treino! Seus horários definidos (${configuredTimes.join(', ')}) estão ativos 💪`;
    const sent = sendAppNotification('MeuTreino Pro ⚡ • Aviso de Teste', msg);
    if (sent) {
      setTestNotifSuccess(true);
      setTimeout(() => setTestNotifSuccess(false), 3000);
    }
  };

  // Detecção científica de Deload: 4+ semanas consecutivas de alta frequência
  const isDeloadRecommended = useMemo(() => {
    if (microcycle.consecutiveWeeksStreak >= 4) return true;
    if (sessions.length >= 16) {
      const recent = sessions.filter((s) => {
        const time = new Date(s.date).getTime();
        return !isNaN(time) && Date.now() - time < 28 * 24 * 60 * 60 * 1000;
      });
      return recent.length >= 14;
    }
    return false;
  }, [microcycle.consecutiveWeeksStreak, sessions]);

  // Aggregate stats across all sessions
  const stats = useMemo(() => {
    let totalTonnage = 0;
    let highestWeight = 0;

    sessions.forEach((s) => {
      totalTonnage += s.totalVolumeLoadKg || 0;
      s.completedExercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          if (set.weight > highestWeight) highestWeight = set.weight;
        });
      });
    });

    const totalWeeklyTarget = user?.weeklyBudget || 88;
    const weeklyCompleted = Object.values(completedSetsByMuscle).reduce((a, b) => a + b, 0);
    const weeklyPercent = totalWeeklyTarget > 0 
      ? Math.min(100, Math.round((weeklyCompleted / totalWeeklyTarget) * 100)) 
      : 0;

    return {
      totalTonnage,
      highestWeight,
      weeklyCompleted,
      totalWeeklyTarget,
      weeklyPercent,
    };
  }, [sessions, completedSetsByMuscle, user?.weeklyBudget]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121c32] via-[#0e1628] to-[#0a101f] border border-[#213252] p-5 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.homeGreeting}, {user?.name || 'Atleta'}!</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t.appTitle} — {t.appSubtitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              {t.homeSubtitle}
            </p>

            {/* Profile setup badges */}
            {user && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-800/90 text-slate-200 border border-slate-700/80 flex items-center gap-1">
                  <span>{user.gender === 'female' ? '👩 Feminino' : '👨 Masculino'}</span>
                </span>

                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-800/90 text-amber-300 border border-amber-500/30">
                  {user.level === 'beginner' ? '🌱 Iniciante' : user.level === 'intermediate' ? '⚡ Intermediário' : '🔥 Avançado'}
                </span>

                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-800/90 text-sky-300 border border-sky-500/30">
                  {user.focus === 'glutes' 
                    ? '🍑 Foco Glúteos & Pernas' 
                    : user.focus === 'strength' 
                    ? '🏋️ Foco Força & Cargas' 
                    : user.focus === 'v_taper' 
                    ? '🔱 Foco Shape em V' 
                    : '⚖️ Foco Equilíbrio Total'}
                </span>

                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {user.frequency || 4}x por semana
                </span>
              </div>
            )}
          </div>

          {/* Quick CTA to active workout */}
          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={onGoToWorkout}
              className="w-full md:w-auto px-6 py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
            >
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
              <span>
                {totalSetsInWorkout > 0
                  ? 'Continuar Treino'
                  : t.startWorkoutCta}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 💧🥩 RASTREADOR RÁPIDO DE ÁGUA & BATER META DE PROTEÍNA NO TOPO DA ABA INÍCIO */}
      <DailyNutritionTrackerWidget user={user} />

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Completed Workouts */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t.kpiCompletedWorkouts}</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
              {sessions.length}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              {sessions.length === 1 ? 'sessão finalizada' : 'sessões finalizadas'}
            </span>
          </div>
        </div>

        {/* Total Tonnage Lifted */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t.kpiTotalTonnage}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tabular-nums">
              {stats.totalTonnage.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              kg tonelagem acumulada
            </span>
          </div>
        </div>

        {/* Weekly Sets Target */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t.kpiWeeklyTarget}</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-teal-300 tabular-nums">
                {stats.weeklyCompleted}
              </span>
              <span className="text-xs font-mono text-slate-400">/ {stats.totalWeeklyTarget} s</span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.weeklyPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Max Load (PR) */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">{t.kpiMaxLoadPR}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tabular-nums">
                {stats.highestWeight}
              </span>
              <span className="text-xs font-mono text-slate-400">kg</span>
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">
              maior carga registrada
            </span>
          </div>
        </div>
      </div>

      {/* 🚀 HUB DE AÇÕES AVANÇADAS: Analytics, Diário de Medições e Lembretes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {onOpenAnalytics && (
          <button
            type="button"
            onClick={() => onOpenAnalytics()}
            className="p-4 rounded-2xl bg-[#0f172a] hover:bg-[#142038] border border-slate-800 hover:border-emerald-500/40 text-left transition-all group cursor-pointer shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Gráficos
              </span>
            </div>
            <strong className="text-xs sm:text-sm font-black text-white block">
              Evolução de Cargas & 1RM
            </strong>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Curvas de força e detecção de platôs por exercício
            </p>
          </button>
        )}

        {onOpenMeasurements && (
          <button
            type="button"
            onClick={onOpenMeasurements}
            className="p-4 rounded-2xl bg-[#0f172a] hover:bg-[#142038] border border-slate-800 hover:border-teal-500/40 text-left transition-all group cursor-pointer shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 font-mono">
                Check-in
              </span>
            </div>
            <strong className="text-xs sm:text-sm font-black text-white block">
              Medições & Fotos Corporais
            </strong>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Perímetros musculares e comparador antes/depois
            </p>
          </button>
        )}

        {/* Card do Sistema de Notificações Locais via Push */}
        <div className={`p-4 rounded-2xl border transition-all shadow-lg flex flex-col justify-between ${
          reminderConfig.enabled
            ? 'bg-gradient-to-br from-[#0f172a] via-[#101b33] to-[#0d162b] border-amber-500/40'
            : 'bg-[#0f172a] border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl border transition-transform ${
                reminderConfig.enabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <Bell className="w-5 h-5" />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {reminderConfig.enabled && configuredTimes.map((tm) => (
                  <span
                    key={tm}
                    className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30"
                  >
                    {tm}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleToggleReminder}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reminderConfig.enabled
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                  title={reminderConfig.enabled ? 'Desativar lembretes de treino' : 'Ativar lembretes de treino'}
                >
                  {reminderConfig.enabled ? 'Ativo' : 'Ativar'}
                </button>
              </div>
            </div>

            <strong className="text-xs sm:text-sm font-black text-white block">
              Lembretes de Treino
            </strong>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              {reminderConfig.enabled && nextReminderInfo
                ? `Próximo lembrete: ${nextReminderInfo.dayLabel} às ${nextReminderInfo.nextTime} (${nextReminderInfo.countdownText}).`
                : 'Escolha seus horários preferidos para receber avisos nos dias de treino.'}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowReminderSettings(!showReminderSettings)}
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{showReminderSettings ? 'Ocultar Agenda' : 'Horários & Mensagem'}</span>
            </button>

            {permStatus === 'denied' && (
              <span className="text-[10px] text-rose-400 font-medium">Bloqueado no navegador</span>
            )}
            {permStatus === 'granted' && reminderConfig.enabled && (
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Avisos Ativos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Painel Expansível de Configuração dos Horários de Lembrete */}
      {showReminderSettings && (
        <div className="bg-[#0b1220] border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl animate-fadeIn space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Agenda de Lembretes de Treino
                </h3>
                {nextReminderInfo && (
                  <span className="text-[11px] font-mono text-emerald-400 block">
                    ⏱️ Próximo aviso: {nextReminderInfo.dayLabel} às {nextReminderInfo.nextTime} ({nextReminderInfo.countdownText})
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReminderSettings(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer self-end sm:self-auto"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Gerenciador de Horários Definidos */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Horários Definidos para Treinar ({configuredTimes.length}):
              </label>

              {/* Lista de horários ativos */}
              <div className="flex flex-wrap items-center gap-2">
                {configuredTimes.map((slot, idx) => (
                  <div
                    key={`${slot}-${idx}`}
                    className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5"
                  >
                    <input
                      type="time"
                      value={slot}
                      onChange={(e) => handleUpdatePrimaryTime(idx, e.target.value)}
                      className="bg-transparent text-xs sm:text-sm font-mono font-bold text-amber-300 focus:outline-none cursor-pointer"
                    />
                    {configuredTimes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReminderTime(slot)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remover este horário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Adicionar novo horário */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="time"
                  value={newTimeInput}
                  onChange={(e) => setNewTimeInput(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => handleAddReminderTime()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Horário</span>
                </button>
              </div>

              {/* Presets Rápidos */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 font-medium">Atalhos rápidos:</span>
                {['06:30', '08:00', '12:30', '18:00', '19:30', '21:00'].map((preset) => {
                  const isConfigured = configuredTimes.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddReminderTime(preset)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        isConfigured
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dias da Semana & Mensagem Personalizada */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Dias de Treino para Lembrar:
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {[
                    { day: 0, label: 'D', full: 'Domingo' },
                    { day: 1, label: 'S', full: 'Segunda' },
                    { day: 2, label: 'T', full: 'Terça' },
                    { day: 3, label: 'Q', full: 'Quarta' },
                    { day: 4, label: 'Q', full: 'Quinta' },
                    { day: 5, label: 'S', full: 'Sexta' },
                    { day: 6, label: 'S', full: 'Sábado' },
                  ].map((item) => {
                    const isDayActive = reminderConfig.days.includes(item.day);
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => handleToggleDay(item.day)}
                        className={`h-9 rounded-xl font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isDayActive
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                            : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                        }`}
                        title={item.full}
                      >
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mensagem Personalizada */}
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mensagem Personalizada do Lembrete (Opcional):</span>
                </label>
                <input
                  type="text"
                  value={reminderConfig.customMessage || ''}
                  onChange={(e) => handleUpdateCustomMessage(e.target.value)}
                  placeholder="Ex: Hora de esmagar o treino e bater PR hoje! 💪"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {permStatus === 'granted' ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Alertas autorizados! Você receberá lembretes nos horários programados.
                </span>
              ) : permStatus === 'denied' ? (
                <span className="text-rose-400 font-semibold">
                  ⚠️ Permissão bloqueada pelo navegador. Habilite nas configurações do site para receber avisos.
                </span>
              ) : (
                <span className="text-slate-400">
                  A permissão para enviar lembretes será solicitada ao ativar ou testar.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendTestNotification}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>Testar Alerta Agora</span>
              </button>

              {testNotifSuccess && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
                  <Check className="w-3.5 h-3.5" />
                  Enviado!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📅 MICROCICLO SEMANAL & CONSISTÊNCIA */}
      <div className="bg-gradient-to-r from-[#10192e] to-[#0c1322] border border-sky-500/30 rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-sky-400 tracking-wider block">
                Microciclo da Semana Atual
              </span>
              <strong className="text-sm sm:text-base font-black text-white">
                {microcycle.completedThisWeek} de {microcycle.targetFrequency} Treinos Concluídos ({microcycle.percentage}%)
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {microcycle.consecutiveWeeksStreak > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Sequência: {microcycle.consecutiveWeeksStreak} {microcycle.consecutiveWeeksStreak === 1 ? 'semana' : 'semanas'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Barra de Progresso Semanal */}
        <div className="w-full bg-[#080d19] h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div 
            className="bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${microcycle.percentage}%` }}
          />
        </div>

        <p className="text-xs text-slate-300 mt-2 font-medium">
          {microcycle.statusMessage}
        </p>
      </div>

      {/* 🏆 PROGRESSO DE CARGA: TOP 3 EXERCÍCIOS COM MAIOR AUMENTO DE 1RM (ÚLTIMAS 4 SEMANAS) */}
      <TopLoadProgressComponent
        sessions={sessions}
        onOpenExerciseAnalytics={onOpenAnalytics}
        onGoToWorkout={onGoToWorkout}
      />

      {/* 📊 VISUALIZAÇÃO DE DADOS RECHARTS: VOLUME TOTAL SEMANAL (KG) & SOBRECARGA PROGRESSIVA (Lazy Loaded) */}
      <React.Suspense
        fallback={
          <div className="h-48 rounded-3xl bg-[#0f172a]/60 border border-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-500">
            Carregando gráfico de sobrecarga semanal...
          </div>
        }
      >
        <WeeklyVolumeOverloadChart
          sessions={sessions}
          onGoToWorkout={onGoToWorkout}
        />
      </React.Suspense>

      {/* ⚖️ RADAR DE SIMETRIA & PROPORÇÃO AGONISTA/ANTAGONISTA (RECHARTS RADARCHART - Lazy Loaded) */}
      <React.Suspense
        fallback={
          <div className="h-56 rounded-3xl bg-[#0f172a]/60 border border-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-500">
            Carregando radar de simetria muscular...
          </div>
        }
      >
        <MuscleSymmetryRadar
          sessions={sessions}
          completedSetsByMuscle={completedSetsByMuscle}
        />
      </React.Suspense>

      {/* 📅 CALENDÁRIO DE CONSISTÊNCIA & STREAK (Últimos 35 dias) */}
      <ConsistencyCalendar
        sessions={sessions}
        weeklyFrequencyGoal={user?.frequency || 4}
      />

      {/* 🛡️ ALERTA CIENTÍFICO DE DELOAD / FADIGA */}
      {(isDeloadRecommended || isDeloadActive) && (
        <div className={`bg-gradient-to-r ${
          isDeloadActive ? 'from-sky-950/40 via-sky-900/20 to-slate-900 border-sky-500/40' : 'from-amber-950/40 via-amber-900/20 to-slate-900 border-amber-500/40'
        } border rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden animate-fadeIn`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-2xl ${
              isDeloadActive ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            } shrink-0`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-black uppercase tracking-wider ${
                  isDeloadActive ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                } px-2.5 py-0.5 rounded-full border`}>
                  {isDeloadActive ? 'Deload Ativo em Andamento' : 'Fase de Supercompensação Recomendada'}
                </span>
                <span className="text-[11px] text-amber-300 font-bold font-mono">
                  {microcycle.consecutiveWeeksStreak} semanas consecutivas de estímulo
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                {isDeloadActive ? 'Semana de Recuperação e Regeneração Articular' : 'Alerta Fisiológico de Deload Sugerido'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isDeloadActive
                  ? 'Seu volume semanal está adaptado para dissipar a fadiga acumulada e regenerar ligamentos e tendões mantendo sua massa muscular.'
                  : 'Seu acúmulo de volume atingiu a marca de semanas de sobrecarga contínua. Para dissipar a fadiga residual do SNC e consolidar a hipertrofia, recomenda-se uma semana de deload.'}
              </p>
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                {onOpenDeloadAssistant ? (
                  <button
                    type="button"
                    onClick={onOpenDeloadAssistant}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                      isDeloadActive ? 'bg-sky-500 hover:bg-sky-400 text-slate-950' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    } transition-all cursor-pointer shadow-md`}
                  >
                    {isDeloadActive ? 'Gerenciar Semana de Deload' : 'Abrir Assistente de Deload'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenVolumeBudget}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-md"
                  >
                    Ajustar Volume para Deload
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📈 DASHBOARD DE ANALYTICS (Curvas de 1RM, Carga e Volume Mensal Recharts - Lazy Loaded) */}
      <React.Suspense
        fallback={
          <div className="h-64 rounded-3xl bg-[#0f172a]/60 border border-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-500">
            Carregando painel analítico de 1RM...
          </div>
        }
      >
        <HomeAnalyticsDashboard
          sessions={sessions}
          onGoToWorkout={onGoToWorkout}
          onOpenAnalyticsModal={onOpenAnalytics}
        />
      </React.Suspense>

      {/* 🧬 MAPA DE RECUPERAÇÃO MUSCULAR */}
      <MuscleRecoveryHeatmap sessions={sessions} />

      {/* Weekly Volume Tracking & Periodization Dashboard */}
      <VolumeDashboard
        completedSetsByMuscle={completedSetsByMuscle}
        activeWorkoutMuscles={activeWorkoutMuscles}
        muscleBudgets={user?.muscleBudgets}
        totalWeeklyBudget={user?.weeklyBudget}
        workoutNotes={workoutNotes}
        onUpdateWorkoutNotes={onUpdateWorkoutNotes}
        onOpenVolumeBudget={onOpenVolumeBudget}
      />

      {/* Summarized Workout History Section */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 mb-5 gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {t.historySectionTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.historySectionSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              {sessions.length} {sessions.length === 1 ? 'treino' : 'treinos'}
            </span>
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="py-14 text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-500 shadow-inner">
              <Dumbbell className="w-8 h-8 opacity-60 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              {t.historyEmptyTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
              {t.historyEmptyDesc}
            </p>
            <button
              type="button"
              onClick={onGoToWorkout}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>{t.historyEmptyCta}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {(showAllSessions ? sessions : sessions.slice(0, 8)).map((sess) => {
              // Calculate top set for this session
              let sessionMax = 0;
              let topExerciseName = '';
              sess.completedExercises.forEach((ex) => {
                ex.sets.forEach((st) => {
                  if (st.weight > sessionMax) {
                    sessionMax = st.weight;
                    topExerciseName = ex.name;
                  }
                });
              });

              return (
                <div
                  key={sess.id}
                  className="bg-[#0b1220] border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition-all shadow-md group"
                >
                  {/* Top Bar of Session Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                        {sess.splitName}
                      </span>
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(sess.date).toLocaleDateString(
                          language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR',
                          {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      {/* Sets */}
                      <span className="font-mono text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 font-semibold">
                        {sess.totalSets} {t.seriesLabel}
                      </span>

                      {/* Tonnage */}
                      <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        {sess.totalVolumeLoadKg.toLocaleString()} kg
                      </span>

                      {/* Top Load */}
                      {sessionMax > 0 && (
                        <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          PR {sessionMax}kg
                        </span>
                      )}

                      {/* View & Share CTA */}
                      <button
                        type="button"
                        onClick={() => onViewSummary(sess)}
                        className="ml-auto sm:ml-2 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        title={t.viewSummaryAndShare}
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.viewSummaryAndShare}</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes if present */}
                  {sess.notes && (
                    <div className="my-3 p-3 rounded-xl bg-[#070b14] border border-purple-500/20 text-xs text-slate-300 flex items-start gap-2">
                      <FileText className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[10px] uppercase font-bold text-purple-400 block tracking-wider mb-0.5">
                          {t.sessionNotesLabel}:
                        </strong>
                        <p className="text-slate-300 italic">{sess.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Exercises summary chips */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {sess.completedExercises.map((ex, exIdx) => {
                      const maxExWeight = Math.max(...ex.sets.map((s) => s.weight), 0);
                      return (
                        <div
                          key={exIdx}
                          className="bg-[#101828] p-2.5 rounded-xl border border-slate-800/80 flex flex-col justify-between gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white truncate max-w-[170px]" title={ex.name}>
                              {ex.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">
                              {ex.sets.length}s
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                            {ex.sets.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="bg-[#070b14] px-1.5 py-0.5 rounded text-slate-300 border border-slate-800"
                              >
                                {s.weight}kg &times; {s.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {sessions.length > 8 && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllSessions((prev) => !prev)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  {showAllSessions
                    ? 'Recolher Lista de Treinos'
                    : `Ver Todos os ${sessions.length} Treinos Concluídos`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
