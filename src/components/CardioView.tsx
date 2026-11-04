/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Flame,
  Gauge,
  Heart,
  Timer,
  Navigation,
  Sparkles,
  Trash2,
  Calendar,
  Zap,
  TrendingUp,
  Activity
} from 'lucide-react';
import { CardioSession, UserProfile } from '../types/workout';
import { safeStorage } from '../utils/storage';
import { wakeLockManager } from '../utils/wakeLock';
import { soundManager } from '../utils/audio';

interface CardioViewProps {
  user: UserProfile;
  onCardioStateChange?: (isRunning: boolean) => void;
}

type CardioType = 'esteira' | 'bike' | 'escada' | 'eliptico' | 'corrida_rua' | 'caminhada';

interface ActiveCardioData {
  id: string;
  isRunning: boolean;
  startTime: number | null;
  accumulatedSeconds: number;
  type: CardioType;
  distanceKm: number;
  calories: number;
  avgHeartRate: number;
  intensity: 'leve' | 'moderado' | 'intenso' | 'hiit';
  speedKmh: number;
  inclinePercent: number;
  notes: string;
  autoEstimate: boolean;
}

const CARDIO_TYPES: { id: CardioType; label: string; icon: string; kcalPerHour: number }[] = [
  { id: 'esteira', label: 'Esteira', icon: '🏃', kcalPerHour: 480 },
  { id: 'bike', label: 'Bicicleta / Bike', icon: '🚴', kcalPerHour: 420 },
  { id: 'escada', label: 'Escada', icon: '🪜', kcalPerHour: 550 },
  { id: 'eliptico', label: 'Elíptico', icon: '⛷️', kcalPerHour: 400 },
  { id: 'corrida_rua', label: 'Corrida de Rua', icon: '👟', kcalPerHour: 520 },
  { id: 'caminhada', label: 'Caminhada', icon: '🚶', kcalPerHour: 280 },
];

export const CardioView: React.FC<CardioViewProps> = ({ user, onCardioStateChange }) => {
  const activeStorageKey = `mtp_cardio_active_${user.id}`;
  const historyStorageKey = `mtp_cardio_history_${user.id}`;

  // Recupera o estado ativo do safeStorage para NUNCA resetar ao mudar de aba
  const [activeData, setActiveData] = useState<ActiveCardioData>(() => {
    const saved = safeStorage.get<ActiveCardioData | null>(activeStorageKey, null);
    if (saved) {
      return saved;
    }
    return {
      id: 'cardio_' + Date.now(),
      isRunning: false,
      startTime: null,
      accumulatedSeconds: 0,
      type: 'esteira',
      distanceKm: 0,
      calories: 0,
      avgHeartRate: 130,
      intensity: 'moderado',
      speedKmh: 8.0,
      inclinePercent: 0,
      notes: '',
      autoEstimate: true,
    };
  });

  const [displaySeconds, setDisplaySeconds] = useState<number>(() => {
    if (activeData.isRunning && activeData.startTime) {
      return activeData.accumulatedSeconds + Math.floor((Date.now() - activeData.startTime) / 1000);
    }
    return activeData.accumulatedSeconds;
  });

  const [history, setHistory] = useState<CardioSession[]>(() => {
    return safeStorage.get<CardioSession[]>(historyStorageKey, []);
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sincroniza activeData no safeStorage sempre que mudar
  useEffect(() => {
    safeStorage.set(activeStorageKey, activeData);
    if (onCardioStateChange) {
      onCardioStateChange(activeData.isRunning);
    }
  }, [activeData, activeStorageKey, onCardioStateChange]);

  // Keep-alive e WakeLock durante cardio ativo para manter funcionando mesmo com tela bloqueada ou trocando de aba
  useEffect(() => {
    if (activeData.isRunning) {
      soundManager.startBackgroundKeepAlive();
      wakeLockManager.request().catch(() => {});
    } else {
      soundManager.stopBackgroundKeepAlive();
    }
  }, [activeData.isRunning]);

  // Sincronização instantânea ao religar a tela ou focar na aba
  useEffect(() => {
    const syncCardioTime = () => {
      if (activeData.isRunning && activeData.startTime) {
        const totalSecs = activeData.accumulatedSeconds + Math.floor((Date.now() - activeData.startTime) / 1000);
        setDisplaySeconds(totalSecs);
      }
    };

    document.addEventListener('visibilitychange', syncCardioTime);
    window.addEventListener('focus', syncCardioTime);
    window.addEventListener('pageshow', syncCardioTime);

    return () => {
      document.removeEventListener('visibilitychange', syncCardioTime);
      window.removeEventListener('focus', syncCardioTime);
      window.removeEventListener('pageshow', syncCardioTime);
    };
  }, [activeData.isRunning, activeData.startTime, activeData.accumulatedSeconds]);

  // Timer loop resiliente: calcula o delta real via Date.now()
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeData.isRunning && activeData.startTime) {
      interval = setInterval(() => {
        const totalSecs = activeData.accumulatedSeconds + Math.floor((Date.now() - (activeData.startTime || Date.now())) / 1000);
        setDisplaySeconds(totalSecs);
      }, 500);
    } else {
      setDisplaySeconds(activeData.accumulatedSeconds);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeData.isRunning, activeData.startTime, activeData.accumulatedSeconds]);

  // Iniciar / Retomar
  const handleStart = () => {
    soundManager.startBackgroundKeepAlive();
    wakeLockManager.request().catch(() => {});
    setActiveData((prev) => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
    }));
  };

  // Pausar
  const handlePause = () => {
    if (!activeData.isRunning) return;
    const additional = activeData.startTime ? Math.floor((Date.now() - activeData.startTime) / 1000) : 0;
    const newAccumulated = activeData.accumulatedSeconds + additional;

    // Se auto-estimar ativo, calcula distância e calorias acumuladas até a pausa
    let newDist = activeData.distanceKm;
    let newKcal = activeData.calories;
    if (activeData.autoEstimate && newAccumulated > 0) {
      const typeConfig = CARDIO_TYPES.find((t) => t.id === activeData.type) || CARDIO_TYPES[0];
      const hours = newAccumulated / 3600;
      const estimatedDist = parseFloat((activeData.speedKmh * hours).toFixed(2));
      const mult = activeData.intensity === 'hiit' ? 1.3 : activeData.intensity === 'intenso' ? 1.15 : activeData.intensity === 'leve' ? 0.8 : 1.0;
      const estimatedKcal = Math.round(typeConfig.kcalPerHour * hours * mult);
      if (newDist === 0) newDist = estimatedDist;
      if (newKcal === 0) newKcal = estimatedKcal;
    }

    setActiveData((prev) => ({
      ...prev,
      isRunning: false,
      startTime: null,
      accumulatedSeconds: newAccumulated,
      distanceKm: newDist,
      calories: newKcal,
    }));
    setDisplaySeconds(newAccumulated);
  };

  // Zerar sessão atual
  const handleReset = () => {
    const fresh: ActiveCardioData = {
      id: 'cardio_' + Date.now(),
      isRunning: false,
      startTime: null,
      accumulatedSeconds: 0,
      type: activeData.type,
      distanceKm: 0,
      calories: 0,
      avgHeartRate: 130,
      intensity: 'moderado',
      speedKmh: 8.0,
      inclinePercent: 0,
      notes: '',
      autoEstimate: true,
    };
    setActiveData(fresh);
    setDisplaySeconds(0);
    safeStorage.set(activeStorageKey, fresh);
  };

  // Salvar sessão no histórico
  const handleSaveSession = () => {
    let finalSeconds = activeData.accumulatedSeconds;
    if (activeData.isRunning && activeData.startTime) {
      finalSeconds += Math.floor((Date.now() - activeData.startTime) / 1000);
    }

    if (finalSeconds < 10 && activeData.distanceKm <= 0 && activeData.calories <= 0) {
      setSaveSuccessMsg('⚠️ Sessão muito curta para salvar. Realize pelo menos 10 segundos de cardio!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      return;
    }

    let finalDist = activeData.distanceKm;
    let finalKcal = activeData.calories;
    if (activeData.autoEstimate && finalSeconds > 0) {
      const typeConfig = CARDIO_TYPES.find((t) => t.id === activeData.type) || CARDIO_TYPES[0];
      const hours = finalSeconds / 3600;
      const estimatedDist = parseFloat((activeData.speedKmh * hours).toFixed(2));
      const mult = activeData.intensity === 'hiit' ? 1.3 : activeData.intensity === 'intenso' ? 1.15 : activeData.intensity === 'leve' ? 0.8 : 1.0;
      const estimatedKcal = Math.round(typeConfig.kcalPerHour * hours * mult);
      if (finalDist <= 0) finalDist = estimatedDist;
      if (finalKcal <= 0) finalKcal = estimatedKcal;
    }

    const newSession: CardioSession = {
      id: 'cardio_hist_' + Date.now(),
      date: new Date().toISOString(),
      durationSeconds: finalSeconds,
      type: activeData.type,
      distanceKm: finalDist,
      calories: finalKcal,
      avgHeartRate: activeData.avgHeartRate > 0 ? activeData.avgHeartRate : undefined,
      intensity: activeData.intensity,
      notes: activeData.notes.trim() || undefined,
    };

    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    safeStorage.set(historyStorageKey, updatedHistory);

    // Reseta o ativo
    handleReset();

    setSaveSuccessMsg('Sessão de cardio concluída e salva com sucesso!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteHistory = (id: string) => {
    const updated = history.filter((s) => s.id !== id);
    setHistory(updated);
    safeStorage.set(historyStorageKey, updated);
  };

  // Formatar HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Métricas agregadas de histórico
  const totalDurationMinutes = Math.round(history.reduce((acc, curr) => acc + curr.durationSeconds, 0) / 60);
  const totalDistance = history.reduce((acc, curr) => acc + (curr.distanceKm || 0), 0);
  const totalCalories = history.reduce((acc, curr) => acc + (curr.calories || 0), 0);

  // Métricas dinâmicas em tempo real durante a corrida/cardio
  const liveHours = displaySeconds / 3600;
  const currentTypeConfig = CARDIO_TYPES.find((t) => t.id === activeData.type) || CARDIO_TYPES[0];
  const intensityMult = activeData.intensity === 'hiit' ? 1.3 : activeData.intensity === 'intenso' ? 1.15 : activeData.intensity === 'leve' ? 0.8 : 1.0;
  const liveDistance = activeData.autoEstimate && liveHours > 0
    ? (activeData.speedKmh * liveHours).toFixed(2)
    : (activeData.distanceKm ? activeData.distanceKm.toFixed(2) : '0.00');
  const liveCalories = activeData.autoEstimate && liveHours > 0
    ? Math.round(currentTypeConfig.kcalPerHour * liveHours * intensityMult)
    : Math.round(activeData.calories || 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-1">
      {/* Banner de Aviso de Persistência */}
      <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-300 font-medium">
            <strong>Cardio Contínuo:</strong> Pode mudar de aba ou alternar para o treino, seu cronômetro não reinicia!
          </span>
        </div>
        {activeData.isRunning && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/40">
            EM ANDAMENTO
          </span>
        )}
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* PAINEL PRINCIPAL DO CRONÔMETRO DE CARDIO */}
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl p-4 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Escolha do tipo de cardio */}
        <div className="mb-5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Modalidade de Cardio
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CARDIO_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setActiveData((p) => ({ ...p, type: type.id }))}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  activeData.type === type.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md scale-[1.02]'
                    : 'bg-[#0b1220] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{type.icon}</span>
                <span className="text-[11px] font-bold tracking-tight">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Display Central do Cronômetro (Mobile First Gigante) */}
        <div className="py-6 sm:py-8 px-4 bg-[#080d17] border border-slate-800/90 rounded-3xl text-center relative shadow-inner mb-5">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Tempo Decorrido
          </span>
          <div className="font-mono text-5xl sm:text-7xl font-black text-white tracking-wider my-1 drop-shadow-md">
            {formatTime(displaySeconds)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${activeData.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs font-bold text-slate-400 uppercase">
              {activeData.isRunning ? 'Gravando Sessão' : 'Pausado'}
            </span>
          </div>
        </div>

        {/* 3. Métricas em tempo real: Distância, Calorias, Velocidade, Frequência */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          {/* Distância */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                <span>Distância</span>
              </span>
              <span className="font-mono text-[10px] text-sky-400">km</span>
            </div>
            <input
              type="number"
              step="0.05"
              value={activeData.isRunning ? liveDistance : (activeData.distanceKm || '')}
              placeholder="0.00"
              onChange={(e) => setActiveData((p) => ({ ...p, distanceKm: parseFloat(e.target.value) || 0, autoEstimate: false }))}
              className="w-full bg-transparent text-xl font-mono font-black text-white focus:outline-none"
            />
            <div className="flex gap-1 mt-1 pt-1 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setActiveData((p) => ({ ...p, distanceKm: parseFloat(((p.distanceKm || 0) + 0.5).toFixed(2)), autoEstimate: false }))}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 hover:bg-slate-700 cursor-pointer"
              >
                +0.5
              </button>
              <button
                type="button"
                onClick={() => setActiveData((p) => ({ ...p, distanceKm: parseFloat(((p.distanceKm || 0) + 1.0).toFixed(2)), autoEstimate: false }))}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 hover:bg-slate-700 cursor-pointer"
              >
                +1.0
              </button>
            </div>
          </div>

          {/* Calorias */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Calorias</span>
              </span>
              <span className="font-mono text-[10px] text-rose-400">kcal</span>
            </div>
            <input
              type="number"
              step="5"
              value={activeData.isRunning ? liveCalories : (activeData.calories || '')}
              placeholder="0"
              onChange={(e) => setActiveData((p) => ({ ...p, calories: parseInt(e.target.value, 10) || 0, autoEstimate: false }))}
              className="w-full bg-transparent text-xl font-mono font-black text-white focus:outline-none"
            />
            <div className="flex gap-1 mt-1 pt-1 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setActiveData((p) => ({ ...p, calories: (p.calories || 0) + 25, autoEstimate: false }))}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-rose-300 hover:bg-slate-700 cursor-pointer"
              >
                +25
              </button>
              <button
                type="button"
                onClick={() => setActiveData((p) => ({ ...p, calories: (p.calories || 0) + 50, autoEstimate: false }))}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-rose-300 hover:bg-slate-700 cursor-pointer"
              >
                +50
              </button>
            </div>
          </div>

          {/* Velocidade / Ritmo */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Velocidade</span>
              </span>
              <span className="font-mono text-[10px] text-amber-400">km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <input
                type="number"
                step="0.5"
                value={activeData.speedKmh}
                onChange={(e) => setActiveData((p) => ({ ...p, speedKmh: parseFloat(e.target.value) || 0 }))}
                className="w-20 bg-transparent text-xl font-mono font-black text-white focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveData((p) => ({ ...p, speedKmh: Math.max(1, parseFloat((p.speedKmh - 0.5).toFixed(1))) }))}
                  className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setActiveData((p) => ({ ...p, speedKmh: parseFloat((p.speedKmh + 0.5).toFixed(1)) }))}
                  className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Ritmo: {activeData.speedKmh > 0 ? (60 / activeData.speedKmh).toFixed(1) : 0} min/km
            </div>
          </div>

          {/* Frequência Cardíaca (BPM) */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Freq. Cardíaca</span>
              </span>
              <span className="font-mono text-[10px] text-rose-400">bpm</span>
            </div>
            <input
              type="number"
              step="1"
              value={activeData.avgHeartRate || ''}
              placeholder="130"
              onChange={(e) => setActiveData((p) => ({ ...p, avgHeartRate: parseInt(e.target.value, 10) || 0 }))}
              className="w-full bg-transparent text-xl font-mono font-black text-white focus:outline-none"
            />
            <div className="text-[10px] text-slate-500 mt-1">
              {activeData.avgHeartRate > 155 ? 'Zona 4 - Anaeróbica' : activeData.avgHeartRate > 135 ? 'Zona 3 - Aeróbica' : 'Zona 2 - Queima Gordura'}
            </div>
          </div>
        </div>

        {/* 4. Intensidade do Esforço */}
        <div className="mb-5 bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Intensidade da Sessão</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['leve', 'moderado', 'intenso', 'hiit'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setActiveData((p) => ({ ...p, intensity: lvl }))}
                className={`py-2 px-1 rounded-xl border text-center text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeData.intensity === lvl
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Botões de Ação Principais (Grandes e Thumb-Friendly para celular) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {!activeData.isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="py-4 px-6 rounded-2xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>{displaySeconds > 0 ? 'Retomar Cardio' : 'Iniciar Cardio'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="py-4 px-6 rounded-2xl font-black text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Pause className="w-5 h-5 fill-slate-950" />
              <span>Pausar Cardio</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveSession}
            disabled={displaySeconds < 10}
            className={`py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              displaySeconds >= 10
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/25 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Concluir & Salvar</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="py-3 px-4 rounded-2xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Zerar Cronômetro</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE ESTATÍSTICAS TOTAIS DE CARDIO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#101828] border border-[#1e2c45] p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Timer className="w-4 h-4 text-emerald-400" />
            <span>Tempo Total</span>
          </div>
          <div className="text-xl font-mono font-black text-white">
            {totalDurationMinutes} <span className="text-xs text-slate-400 font-normal">min</span>
          </div>
        </div>

        <div className="bg-[#101828] border border-[#1e2c45] p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Navigation className="w-4 h-4 text-sky-400" />
            <span>Distância Total</span>
          </div>
          <div className="text-xl font-mono font-black text-white">
            {totalDistance.toFixed(1)} <span className="text-xs text-slate-400 font-normal">km</span>
          </div>
        </div>

        <div className="bg-[#101828] border border-[#1e2c45] p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Calorias Totais</span>
          </div>
          <div className="text-xl font-mono font-black text-white">
            {totalCalories} <span className="text-xs text-slate-400 font-normal">kcal</span>
          </div>
        </div>

        <div className="bg-[#101828] border border-[#1e2c45] p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Sessões Salvas</span>
          </div>
          <div className="text-xl font-mono font-black text-white">
            {history.length} <span className="text-xs text-slate-400 font-normal">treinos</span>
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE SESSÕES DE CARDIO */}
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Histórico de Cardio
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {history.length} {history.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500 mb-3 text-2xl">
              🏃
            </div>
            <p className="text-sm font-semibold text-slate-300">Nenhum cardio salvo ainda</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Inicie o cronômetro acima na esteira, bike ou corrida e salve suas sessões para acompanhar seu gasto calórico.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => {
              const typeCfg = CARDIO_TYPES.find((t) => t.id === item.type) || CARDIO_TYPES[0];
              const dateStr = new Date(item.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-900 border border-slate-800">
                      {typeCfg.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{typeCfg.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium capitalize border border-slate-700/60">
                          {item.intensity || 'moderado'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3 mt-1">
                        <span>⏱️ {formatTime(item.durationSeconds)}</span>
                        {item.distanceKm ? <span>📍 {item.distanceKm} km</span> : null}
                        {item.calories ? <span className="text-rose-400 font-bold">🔥 {item.calories} kcal</span> : null}
                        {item.avgHeartRate ? <span>❤️ {item.avgHeartRate} bpm</span> : null}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{dateStr}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(item.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Excluir registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
