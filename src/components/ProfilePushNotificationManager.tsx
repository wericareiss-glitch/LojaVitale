/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Clock,
  Check,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Trash2,
  Send,
  Timer,
  Sparkles,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import {
  DailyReminderConfig,
  getReminderConfig,
  saveReminderConfig,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  isNotificationSupported,
  sendAppNotification,
  normalizeReminderTimes,
  getNextScheduledReminderInfo,
  analyzeWorkoutHabits,
  syncHabitsToServiceWorker,
} from '../utils/notifications';
import { WorkoutSessionSummary } from '../types/workout';
import { Brain, Zap } from 'lucide-react';

interface ProfilePushNotificationManagerProps {
  userId: string;
  userName: string;
  sessions?: WorkoutSessionSummary[];
}

const PRESET_MESSAGES = [
  {
    label: '⚡ Hora do treino',
    title: 'Hora do treino ⚡',
    message: 'Hora do treino! Seu corpo precisa do estímulo de hipertrofia hoje 💪',
  },
  {
    label: '🏆 Bater PR hoje',
    title: 'Dia de Bater Recorde 🏆',
    message: 'Foco total nas séries principais! Vamos buscar +1 repetição ou carga hoje 🔥',
  },
  {
    label: '🎯 Meta Semanal',
    title: 'Mantenha o Microciclo 🎯',
    message: 'Não fure seu treino de hoje! A consistência constrói o físico definitivo 🏋️‍♂️',
  },
];

export const ProfilePushNotificationManager: React.FC<ProfilePushNotificationManagerProps> = ({
  userId,
  userName,
  sessions,
}) => {
  const [config, setConfig] = useState<DailyReminderConfig>(() => getReminderConfig(userId));
  const [permStatus, setPermStatus] = useState<NotificationPermission>(() =>
    getNotificationPermissionStatus()
  );
  const [swReady, setSwReady] = useState<boolean>(false);
  const [newTimeInput, setNewTimeInput] = useState<string>('18:00');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // Timer regressivo para lembrete rápido agendado (ex: testar agendamento em 10s, 1m, 5m)
  const [quickTimerSecondsLeft, setQuickTimerSecondsLeft] = useState<number | null>(null);

  const supported = isNotificationSupported();

  // Sincroniza quando o usuário muda ou quando outro componente atualiza a agenda
  useEffect(() => {
    setConfig(getReminderConfig(userId));
    setPermStatus(getNotificationPermissionStatus());

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => setSwReady(Boolean(reg)))
        .catch(() => setSwReady(false));
    }

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; config: DailyReminderConfig }>;
      if (customEvent.detail && customEvent.detail.userId === userId) {
        setConfig(customEvent.detail.config);
      }
    };

    window.addEventListener('meutreino:reminder-updated', handleSync);
    return () => window.removeEventListener('meutreino:reminder-updated', handleSync);
  }, [userId]);

  // Contagem regressiva do lembrete rápido programado
  useEffect(() => {
    if (quickTimerSecondsLeft === null) return;

    if (quickTimerSecondsLeft <= 0) {
      setQuickTimerSecondsLeft(null);
      const title =
        config.customTitle && config.customTitle.trim()
          ? config.customTitle.trim()
          : 'Hora do treino ⚡';
      const body =
        config.customMessage && config.customMessage.trim()
          ? config.customMessage.trim()
          : `Hora do treino, ${userName}! Lembrete agendado disparado com sucesso 💪`;

      sendAppNotification(title, body, 'meutreino-scheduled-timer');
      showFeedback('success', `Notificação "${title}" disparada no horário agendado!`);
      return;
    }

    const timer = setTimeout(() => {
      setQuickTimerSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [quickTimerSecondsLeft, config.customTitle, config.customMessage, userName]);

  const showFeedback = (type: 'success' | 'warning' | 'error', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => {
      setFeedbackBanner((curr) => (curr?.text === text ? null : curr));
    }, 4000);
  };

  const configuredTimes = useMemo(() => normalizeReminderTimes(config), [config]);
  const nextReminderInfo = useMemo(() => getNextScheduledReminderInfo(config), [config]);
  const habitAnalysis = useMemo(() => analyzeWorkoutHabits(sessions || []), [sessions]);

  const updateAndSave = (next: DailyReminderConfig) => {
    setConfig(next);
    saveReminderConfig(userId, next);
    syncHabitsToServiceWorker(next);
  };

  const handleApplyHabitualSchedule = async () => {
    if (permStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermStatus(getNotificationPermissionStatus());
      if (!granted) {
        showFeedback('error', 'Autorize as notificações para ativar o agendamento baseado nos seus hábitos.');
        return;
      }
    }

    const nextConfig = {
      ...config,
      ...habitAnalysis.recommendedReminderConfig,
      enabled: true,
    };
    updateAndSave(nextConfig);
    showFeedback(
      'success',
      `Lembretes sincronizados com seus horários habituais (${habitAnalysis.primaryTime})!`
    );
  };

  const handleRequestPermission = async () => {
    if (!supported) {
      showFeedback('error', 'Este navegador não suporta envio de lembretes.');
      return;
    }
    const granted = await requestNotificationPermission();
    const updatedPerm = getNotificationPermissionStatus();
    setPermStatus(updatedPerm);

    if (granted) {
      showFeedback(
        'success',
        'Lembretes ativados com sucesso! Você já pode agendar seus alertas de treino.'
      );
      sendAppNotification(
        'Lembretes Ativados ⚡',
        `Perfeito, ${userName}! Os avisos de treino do MeuTreino Pro estão prontos.`
      );
    } else if (updatedPerm === 'denied') {
      showFeedback(
        'error',
        'Permissão negada no navegador. Clique no ícone de cadeado na barra de endereço para permitir Notificações.'
      );
    } else {
      showFeedback('warning', 'A solicitação de permissão foi fechada sem confirmação.');
    }
  };

  const handleToggleEnabled = async () => {
    if (!config.enabled) {
      if (permStatus !== 'granted') {
        const granted = await requestNotificationPermission();
        setPermStatus(getNotificationPermissionStatus());
        if (!granted) {
          showFeedback(
            'error',
            'Para ativar o agendamento automático, autorize a permissão de notificações do navegador.'
          );
          return;
        }
      }
      const next: DailyReminderConfig = {
        ...config,
        enabled: true,
        time: configuredTimes[0] || '18:00',
        times: configuredTimes,
      };
      updateAndSave(next);
      showFeedback(
        'success',
        `Agendamento diário ativado para ${configuredTimes.join(', ')}!`
      );
    } else {
      const next: DailyReminderConfig = {
        ...config,
        enabled: false,
      };
      updateAndSave(next);
      showFeedback('warning', 'Lembretes automáticos pausados.');
    }
  };

  const handleAddTime = (timeVal?: string) => {
    const target = (timeVal || newTimeInput || '18:00').trim();
    if (!/^\d{2}:\d{2}$/.test(target)) return;
    const nextTimes = Array.from(new Set([...configuredTimes, target])).sort();
    updateAndSave({
      ...config,
      time: nextTimes[0],
      times: nextTimes,
    });
    showFeedback('success', `Horário ${target} adicionado à agenda de lembretes.`);
  };

  const handleUpdateTimeAt = (idx: number, newVal: string) => {
    if (!newVal) return;
    const copy = [...configuredTimes];
    copy[idx] = newVal;
    const nextTimes = Array.from(new Set(copy)).sort();
    updateAndSave({
      ...config,
      time: nextTimes[0] || '18:00',
      times: nextTimes,
    });
  };

  const handleRemoveTime = (timeVal: string) => {
    if (configuredTimes.length <= 1) return;
    const nextTimes = configuredTimes.filter((t) => t !== timeVal);
    updateAndSave({
      ...config,
      time: nextTimes[0] || '18:00',
      times: nextTimes,
    });
  };

  const handleToggleDay = (day: number) => {
    const exists = config.days.includes(day);
    const nextDays = exists
      ? config.days.filter((d) => d !== day)
      : [...config.days, day].sort();
    updateAndSave({
      ...config,
      days: nextDays.length > 0 ? nextDays : [day],
    });
  };

  const handleTestInstantNotification = async () => {
    if (permStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermStatus(getNotificationPermissionStatus());
      if (!granted) {
        showFeedback(
          'error',
          'Permissão necessária para disparar a notificação de teste.'
        );
        return;
      }
    }

    const title =
      config.customTitle && config.customTitle.trim()
        ? config.customTitle.trim()
        : 'Hora do treino ⚡';
    const body =
      config.customMessage && config.customMessage.trim()
        ? config.customMessage.trim()
        : `Hora do treino, ${userName}! Seus lembretes estão funcionando perfeitamente 💪`;

    const ok = sendAppNotification(title, body, 'meutreino-profile-test');
    if (ok) {
      showFeedback('success', `Alerta de teste "${title}" enviado para o seu aparelho!`);
    } else {
      showFeedback('error', 'Não foi possível enviar o alerta. Verifique se as notificações estão permitidas.');
    }
  };

  const handleScheduleQuickCountdown = async (seconds: number, label: string) => {
    if (permStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermStatus(getNotificationPermissionStatus());
      if (!granted) {
        showFeedback(
          'error',
          'Autorize as notificações primeiro para agendar o disparo programado.'
        );
        return;
      }
    }
    setQuickTimerSecondsLeft(seconds);
    showFeedback(
      'success',
      `Lembrete "${config.customTitle || 'Hora do treino'}" agendado para disparar em ${label}!`
    );
  };

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Cabeçalho do Gerenciador de Push na Aba Perfil */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Lembretes & Alertas de Treino
              </h2>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Avisos no Aparelho
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Escolha os dias e horários para receber lembretes personalizados no seu celular ou computador (ex: &ldquo;Hora do treino&rdquo;).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleEnabled}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
            config.enabled
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{config.enabled ? 'Lembretes Ativos' : 'Ativar Lembretes'}</span>
        </button>
      </div>

      {/* Status de Permissão e Próximo Lembrete */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Status da Permissão */}
        <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Status dos Alertas
            </span>
            <ShieldCheck
              className={`w-4 h-4 ${
                permStatus === 'granted'
                  ? 'text-emerald-400'
                  : permStatus === 'denied'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            />
          </div>

          <div>
            <span
              className={`text-sm font-black block ${
                permStatus === 'granted'
                  ? 'text-emerald-400'
                  : permStatus === 'denied'
                  ? 'text-rose-400'
                  : 'text-amber-300'
              }`}
            >
              {permStatus === 'granted'
                ? '✓ Autorizado'
                : permStatus === 'denied'
                ? '✕ Bloqueado'
                : '• Aguardando Permissão'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {permStatus === 'granted'
                ? 'Pronto para enviar lembretes no aparelho.'
                : permStatus === 'denied'
                ? 'Libere as notificações nas configurações do navegador.'
                : 'Toque abaixo para permitir os lembretes.'}
            </span>
          </div>

          {permStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="mt-1 w-full py-1.5 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer"
            >
              Permitir Lembretes
            </button>
          )}
        </div>

        {/* Card 2: Tipo de Alerta */}
        <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Modo de Aviso
            </span>
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <span className="text-sm font-black text-white block">
              {!supported
                ? 'Indisponível neste aparelho'
                : swReady
                ? 'Alertas Inteligentes Ativos'
                : 'Alertas Padrão do Aparelho'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {swReady
                ? 'Com vibração e atalho rápido para abrir seu treino ao tocar.'
                : 'Avisos diretos na tela do seu celular ou computador.'}
            </span>
          </div>
        </div>

        {/* Card 3: Próximo Disparo Programado */}
        <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Próximo Lembrete
            </span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            {config.enabled && nextReminderInfo ? (
              <>
                <span className="text-sm font-black font-mono text-emerald-400 block">
                  {nextReminderInfo.dayLabel} às {nextReminderInfo.nextTime}
                </span>
                <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                  Disparo previsto {nextReminderInfo.countdownText}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-slate-400 block">
                  Agenda Pausada
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Ative a agenda para monitorar os horários definidos.
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🧠 Card de Detecção Inteligente de Hábitos de Treino (Push Nativo via Service Worker) */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#0f1d33] to-[#0d1627] p-4 sm:p-5 rounded-2xl border border-sky-500/30 space-y-3 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-white">
                  Detecção de Horários Habituais (Baseada no Histórico)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {habitAnalysis.hasEnoughData
                    ? `${habitAnalysis.confidencePercentage}% Confiança`
                    : 'Aguardando Mais Treinos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {habitAnalysis.summaryText}
              </p>
            </div>
          </div>

          {habitAnalysis.hasEnoughData && (
            <button
              type="button"
              onClick={handleApplyHabitualSchedule}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Sincronizar com Meus Hábitos Reais</span>
            </button>
          )}
        </div>

        {habitAnalysis.hasEnoughData && (
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-sky-500/20 text-xs">
            <span className="text-slate-400">
              Horário Habitual Detectado: <strong className="text-amber-300 font-mono">{habitAnalysis.primaryTime}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Dias Preferidos: <strong className="text-emerald-300">{habitAnalysis.habitualDays.map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Amostra: <strong className="text-white">{habitAnalysis.sampleSize} treinos</strong>
            </span>
          </div>
        )}
      </div>

      {/* Personalização do Lembrete (Título & Mensagem - ex: "Hora do treino") */}
      <div className="bg-[#0a101d] p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-white flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span>Personalizar Conteúdo do Lembrete Push</span>
          </label>

          {/* Modelos rápidos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500">Modelos:</span>
            {PRESET_MESSAGES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  updateAndSave({
                    ...config,
                    customTitle: preset.title,
                    customMessage: preset.message,
                  });
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Título do Alerta (ex: Hora do treino):
            </label>
            <input
              type="text"
              value={config.customTitle ?? 'Hora do treino ⚡'}
              onChange={(e) =>
                updateAndSave({
                  ...config,
                  customTitle: e.target.value,
                })
              }
              placeholder="Hora do treino ⚡"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Mensagem de Motivação / Lembrete:
            </label>
            <input
              type="text"
              value={config.customMessage ?? ''}
              onChange={(e) =>
                updateAndSave({
                  ...config,
                  customMessage: e.target.value,
                })
              }
              placeholder="Ex: Hora do treino! Mantenha sua sobrecarga progressiva em dia 💪"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Agendamento de Horários Diários e Dias da Semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coluna 1: Horários Definidos */}
        <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 space-y-3">
          <label className="text-xs font-bold text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Horários Programados ({configuredTimes.length})</span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {configuredTimes.map((slot, idx) => (
              <div
                key={`${slot}-${idx}`}
                className="flex items-center gap-1.5 bg-[#0f172a] border border-slate-700 rounded-xl px-2.5 py-1.5"
              >
                <input
                  type="time"
                  value={slot}
                  onChange={(e) => handleUpdateTimeAt(idx, e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-amber-300 focus:outline-none cursor-pointer"
                />
                {configuredTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(slot)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remover horário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="time"
              value={newTimeInput}
              onChange={(e) => setNewTimeInput(e.target.value)}
              className="bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleAddTime()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Horário</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-slate-500">Atalhos:</span>
            {['06:30', '08:00', '12:00', '18:00', '19:30', '21:00'].map((preset) => {
              const active = configuredTimes.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddTime(preset)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Dias da Semana + Timer de Lembrete Rápido */}
        <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold text-white block mb-2">
              Dias da Semana Ativos
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {[
                { day: 0, label: 'D', full: 'Domingo' },
                { day: 1, label: 'S', full: 'Segunda' },
                { day: 2, label: 'T', full: 'Terça' },
                { day: 3, label: 'Q', full: 'Quarta' },
                { day: 4, label: 'Q', full: 'Quinta' },
                { day: 5, label: 'S', full: 'Sexta' },
                { day: 6, label: 'S', full: 'Sábado' },
              ].map((item) => {
                const isDayActive = config.days.includes(item.day);
                return (
                  <button
                    key={item.day}
                    type="button"
                    onClick={() => handleToggleDay(item.day)}
                    className={`h-9 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                      isDayActive
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                        : 'bg-[#0f172a] text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                    title={item.full}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agendador Rápido por Contagem Regressiva (ex: lembrar em 10s, 1 min, 5 min, 15 min) */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                <span>Agendar Lembrete Rápido (Timer):</span>
              </span>
              {quickTimerSecondsLeft !== null && (
                <span className="text-[11px] font-mono font-bold text-amber-400 animate-pulse">
                  Disparando em {quickTimerSecondsLeft}s...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { sec: 5, label: '5 seg (Teste)' },
                { sec: 60, label: '1 min' },
                { sec: 300, label: '5 min' },
                { sec: 900, label: '15 min' },
              ].map((item) => (
                <button
                  key={item.sec}
                  type="button"
                  onClick={() => handleScheduleQuickCountdown(item.sec, item.label)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-[#0f172a] hover:bg-slate-800 text-sky-300 border border-sky-500/30 cursor-pointer transition-all active:scale-95"
                >
                  Daqui a {item.label}
                </button>
              ))}
              {quickTimerSecondsLeft !== null && (
                <button
                  type="button"
                  onClick={() => setQuickTimerSecondsLeft(null)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner se houver */}
      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : feedbackBanner.type === 'warning'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedbackBanner.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackBanner.text}</span>
        </div>
      )}

      {/* Barra Inferior de Teste Imediato */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-slate-400">
          Clique ao lado para testar imediatamente sua notificação personalizada no dispositivo.
        </span>

        <div className="flex items-center gap-2">
          {permStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verificar Permissão</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTestInstantNotification}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Testar Notificação Push Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
