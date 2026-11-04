/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSessionSummary } from '../types/workout';
import { safeStorage } from './storage';

export interface DailyReminderConfig {
  enabled: boolean;
  time: string; // Horário principal (compatibilidade), ex: "18:00"
  times?: string[]; // Múltiplos horários definidos pelo usuário, ex: ["07:30", "18:00"]
  days: number[]; // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb
  customTitle?: string; // Título personalizado do lembrete (ex: "Hora do treino")
  customMessage?: string; // Mensagem personalizada opcional
  lastNotifiedDate?: string; // Formato YYYY-MM-DD (compatibilidade)
  notifiedSlots?: string[]; // Lista de slots já notificados no formato "YYYY-MM-DD@HH:MM"
}

export const DEFAULT_REMINDER_CONFIG: DailyReminderConfig = {
  enabled: false,
  time: '18:00',
  times: ['18:00'],
  days: [1, 2, 3, 4, 5], // Segunda a Sexta
  customTitle: 'Hora do treino ⚡',
  customMessage: 'Hora do treino! Mantenha sua consistência e sobrecarga progressiva em dia 💪',
  notifiedSlots: [],
};

const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

/**
 * Dispara notificação local via Push (Service Worker registration.showNotification)
 * com fallback imediato para a API Notification nativa do navegador.
 */
export function sendAppNotification(
  title: string,
  body: string,
  tag: string = 'meutreino-workout-push'
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    const iconUrl = '/pwa-192x192.png';

    // Prioriza disparo via Service Worker Push Local quando ativo
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (registration && typeof registration.showNotification === 'function') {
            return registration.showNotification(title, {
              body,
              icon: iconUrl,
              badge: iconUrl,
              tag,
              vibrate: [200, 100, 200],
              data: { url: '/?action=start-workout' },
            } as NotificationOptions);
          } else {
            new Notification(title, {
              body,
              icon: iconUrl,
              badge: iconUrl,
              tag,
            });
          }
        })
        .catch(() => {
          try {
            new Notification(title, {
              body,
              icon: iconUrl,
              badge: iconUrl,
              tag,
            });
          } catch {}
        });
      return true;
    }

    // Fallback direto para API Notification do navegador
    new Notification(title, {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Normaliza a lista de horários definidos garantindo ordenação e formato HH:MM
 */
export function normalizeReminderTimes(config: DailyReminderConfig): string[] {
  const rawList =
    Array.isArray(config.times) && config.times.length > 0
      ? config.times
      : config.time
      ? [config.time]
      : ['18:00'];

  const valid = Array.from(
    new Set(
      rawList
        .map((t) => (t || '').trim())
        .filter((t) => /^\d{2}:\d{2}$/.test(t))
    )
  ).sort();

  return valid.length > 0 ? valid : ['18:00'];
}

/**
 * Lê configuração de lembretes diários do usuário
 */
export function getReminderConfig(userId: string): DailyReminderConfig {
  const raw = safeStorage.get<DailyReminderConfig>(
    `alex_reminder_cfg_${userId}`,
    DEFAULT_REMINDER_CONFIG
  );
  const times = normalizeReminderTimes(raw);
  return {
    ...DEFAULT_REMINDER_CONFIG,
    ...raw,
    time: times[0],
    times,
    days: Array.isArray(raw.days) && raw.days.length > 0 ? raw.days : [1, 2, 3, 4, 5],
    notifiedSlots: Array.isArray(raw.notifiedSlots) ? raw.notifiedSlots : [],
  };
}

/**
 * Salva configuração de lembretes diários do usuário
 */
export function saveReminderConfig(userId: string, config: DailyReminderConfig): void {
  const times = normalizeReminderTimes(config);
  const normalized: DailyReminderConfig = {
    ...config,
    time: times[0],
    times,
  };
  safeStorage.set(`alex_reminder_cfg_${userId}`, normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('meutreino:reminder-updated', { detail: { userId, config: normalized } })
    );
  }
}

/**
 * Calcula quando ocorrerá o próximo disparo de lembrete com base nos horários e dias configurados
 */
export function getNextScheduledReminderInfo(config: DailyReminderConfig): {
  nextTime: string;
  dayLabel: string;
  countdownText: string;
} | null {
  if (!config.enabled || !config.days || config.days.length === 0) {
    return null;
  }

  const times = normalizeReminderTimes(config);
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const checkDay = (currentDay + dayOffset) % 7;
    if (!config.days.includes(checkDay)) continue;

    for (const timeStr of times) {
      const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
      if (isNaN(h) || isNaN(m)) continue;
      const slotMinutes = h * 60 + m;

      if (dayOffset === 0 && slotMinutes <= currentMinutes) {
        continue; // Horário de hoje já passou
      }

      const totalDiffMinutes =
        dayOffset * 24 * 60 + (slotMinutes - currentMinutes);
      const diffHours = Math.floor(totalDiffMinutes / 60);
      const diffRemMinutes = totalDiffMinutes % 60;

      let dayLabel = '';
      if (dayOffset === 0) {
        dayLabel = 'Hoje';
      } else if (dayOffset === 1) {
        dayLabel = `Amanhã (${DAY_NAMES_SHORT[checkDay]})`;
      } else {
        dayLabel = `${DAY_NAMES_SHORT[checkDay]}`;
      }

      let countdownText = '';
      if (diffHours === 0) {
        countdownText = `em ${diffRemMinutes} min`;
      } else if (diffHours < 24) {
        countdownText = `em ${diffHours}h ${diffRemMinutes > 0 ? `${diffRemMinutes}m` : ''}`.trim();
      } else {
        const days = Math.floor(diffHours / 24);
        countdownText = `em ${days}d ${diffHours % 24}h`;
      }

      return {
        nextTime: timeStr,
        dayLabel,
        countdownText,
      };
    }
  }

  return null;
}

/**
 * Verifica se no momento atual deve disparar o lembrete de treino agendado
 * Suporta múltiplos horários definidos pelo usuário no mesmo dia.
 */
export function checkAndTriggerScheduledNotification(
  userId: string,
  athleteName: string = 'Atleta'
): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const config = getReminderConfig(userId);
  if (!config.enabled) return false;

  const now = new Date();
  const currentDay = now.getDay();
  if (!config.days.includes(currentDay)) {
    return false;
  }

  // Data local do atleta (evita bug de UTC no Brasil e fusos negativos)
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  const todayStr = `${localYear}-${localMonth}-${localDay}`;

  const times = normalizeReminderTimes(config);
  const currentH = now.getHours();
  const currentM = now.getMinutes();
  const currentTotalMinutes = currentH * 60 + currentM;

  const notifiedSlots = Array.isArray(config.notifiedSlots)
    ? config.notifiedSlots.filter((slot) => slot.startsWith(todayStr))
    : [];

  let triggeredAny = false;

  for (const timeSlot of times) {
    if (!timeSlot || !timeSlot.includes(':')) continue;

    const slotKey = `${todayStr}@${timeSlot}`;
    if (notifiedSlots.includes(slotKey)) {
      continue; // Este horário já foi notificado hoje
    }

    // Compatibilidade caso lastNotifiedDate antigo tenha sido salvo para horário único
    if (times.length === 1 && config.lastNotifiedDate === todayStr && notifiedSlots.length === 0) {
      continue;
    }

    const [targetH, targetM] = timeSlot.split(':').map((v) => parseInt(v, 10));
    if (isNaN(targetH) || isNaN(targetM)) continue;

    const targetTotalMinutes = targetH * 60 + targetM;
    const diffMinutes = currentTotalMinutes - targetTotalMinutes;

    // Janela segura de tolerância de 5 minutos após o horário definido
    if (diffMinutes >= 0 && diffMinutes <= 5) {
      const defaultMessages = [
        `Hora do treino (${timeSlot}), ${athleteName}! Seu corpo precisa do estímulo de hipertrofia hoje 💪`,
        `Bora treinar, ${athleteName}! Lembrete das ${timeSlot}: a consistência constrói resultados definitivos 🔥`,
        `Seu treino das ${timeSlot} está pronto no MeuTreino Pro! Vamos buscar a sobrecarga progressiva 🏋️‍♂️`,
        `Lembrete de treino (${timeSlot}): Mantenha sua meta semanal em dia! 🎯`,
      ];
      const messageToSend =
        config.customMessage && config.customMessage.trim().length > 0
          ? config.customMessage.trim()
          : defaultMessages[Math.floor(Math.random() * defaultMessages.length)];

      const titleToSend =
        config.customTitle && config.customTitle.trim().length > 0
          ? `${config.customTitle.trim()} • ${timeSlot}`
          : `Hora do treino ⚡ • ${timeSlot}`;

      const success = sendAppNotification(
        titleToSend,
        messageToSend,
        `meutreino-push-${slotKey}`
      );

      if (success) {
        notifiedSlots.push(slotKey);
        config.lastNotifiedDate = todayStr;
        config.notifiedSlots = notifiedSlots;
        saveReminderConfig(userId, config);
        triggeredAny = true;
      }
    }
  }

  return triggeredAny;
}

/**
 * Calcula o progresso do microciclo semanal e consistência do atleta.
 */
export function getWeeklyMicrocycleStatus(
  sessions: WorkoutSessionSummary[],
  targetFrequency: number = 4
): {
  completedThisWeek: number;
  targetFrequency: number;
  percentage: number;
  isComplete: number;
  consecutiveWeeksStreak: number;
  statusMessage: string;
} {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeekSessions = sessions.filter((s) => new Date(s.date) >= oneWeekAgo);
  const completedThisWeek = thisWeekSessions.length;
  const percentage = Math.min(100, Math.round((completedThisWeek / Math.max(1, targetFrequency)) * 100));

  let statusMessage = '';
  if (completedThisWeek >= targetFrequency) {
    statusMessage = `🔥 Meta da semana batida (${completedThisWeek}/${targetFrequency} treinos)! Parabéns pela consistência.`;
  } else {
    const remaining = targetFrequency - completedThisWeek;
    statusMessage = `Resta${remaining > 1 ? 'm' : ''} ${remaining} treino${remaining > 1 ? 's' : ''} para concluir a meta de ${targetFrequency}x nesta semana!`;
  }

  let consecutiveWeeksStreak = completedThisWeek >= targetFrequency ? 1 : 0;
  if (sessions.length >= targetFrequency * 2) {
    consecutiveWeeksStreak = Math.min(12, Math.floor(sessions.length / targetFrequency));
  }

  return {
    completedThisWeek,
    targetFrequency,
    percentage,
    isComplete: completedThisWeek >= targetFrequency ? 1 : 0,
    consecutiveWeeksStreak,
    statusMessage,
  };
}

export interface HabitAnalysisResult {
  hasEnoughData: boolean;
  habitualTimes: string[];
  habitualDays: number[];
  primaryTime: string;
  sampleSize: number;
  confidencePercentage: number;
  summaryText: string;
  recommendedReminderConfig: DailyReminderConfig;
}

/**
 * Analisa o histórico de sessões para detectar os horários e dias habituais de treino
 */
export function analyzeWorkoutHabits(sessions: WorkoutSessionSummary[]): HabitAnalysisResult {
  if (!sessions || sessions.length < 2) {
    return {
      hasEnoughData: false,
      habitualTimes: ['18:00'],
      habitualDays: [1, 3, 5],
      primaryTime: '18:00',
      sampleSize: sessions?.length || 0,
      confidencePercentage: 0,
      summaryText: 'Dados insuficientes. Conclua pelo menos 2 treinos para detecção automática dos seus horários habituais.',
      recommendedReminderConfig: {
        ...DEFAULT_REMINDER_CONFIG,
        time: '18:00',
        times: ['18:00'],
        days: [1, 3, 5],
      },
    };
  }

  // Agrupa treinos por horário arredondado para intervalos de 30 min (ex: 18:30)
  const hourBuckets: Record<string, number> = {};
  const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  sessions.forEach((s) => {
    const d = new Date(s.date);
    if (isNaN(d.getTime())) return;

    const day = d.getDay();
    dayCounts[day] = (dayCounts[day] || 0) + 1;

    const h = d.getHours();
    const m = d.getMinutes();
    const roundedM = m >= 45 ? 0 : m >= 15 ? 30 : 0;
    const resolvedH = m >= 45 ? (h + 1) % 24 : h;
    const timeKey = `${String(resolvedH).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
    hourBuckets[timeKey] = (hourBuckets[timeKey] || 0) + 1;
  });

  const sortedTimes = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1]);
  const primaryTime = sortedTimes.length > 0 ? sortedTimes[0][0] : '18:00';
  const topTimes = sortedTimes.slice(0, 2).map((entry) => entry[0]);

  const activeDays = Object.entries(dayCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([day]) => parseInt(day, 10));

  const habitualDays = activeDays.length > 0 ? activeDays.slice(0, 5).sort() : [1, 3, 5];
  const primaryCount = sortedTimes.length > 0 ? sortedTimes[0][1] : 0;
  const confidencePercentage = Math.min(98, Math.round((primaryCount / sessions.length) * 100) + 20);

  const dayLabels = habitualDays.map((d) => DAY_NAMES_SHORT[d]).join(', ');
  const summaryText = `Com base em ${sessions.length} treinos analisados, você costuma treinar às ${primaryTime} (${dayLabels}).`;

  return {
    hasEnoughData: true,
    habitualTimes: topTimes,
    habitualDays,
    primaryTime,
    sampleSize: sessions.length,
    confidencePercentage,
    summaryText,
    recommendedReminderConfig: {
      enabled: true,
      time: primaryTime,
      times: topTimes,
      days: habitualDays,
      customTitle: 'Hora do treino habitual ⚡',
      customMessage: `Detectamos seu horário habitual de treino (${primaryTime})! Vamos buscar a sobrecarga progressiva hoje 💪`,
      notifiedSlots: [],
    },
  };
}

/**
 * Envia configuração de lembretes habituais diretamente para o Service Worker nativo
 */
export function syncHabitsToServiceWorker(config: DailyReminderConfig): void {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg.active) {
          reg.active.postMessage({
            type: 'SYNC_HABIT_SCHEDULE',
            payload: config,
          });
        }
      })
      .catch((err) => {
        console.warn('[SW] Erro ao sincronizar horários habituais com Service Worker:', err);
      });
  }
}

