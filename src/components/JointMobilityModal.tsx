/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  Activity,
  Volume2,
  VolumeX,
  Clock,
  ArrowRight
} from 'lucide-react';
import { JointWarmupRoutine, MobilityExercise } from '../utils/jointMobilityEngine';
import { soundManager } from '../utils/audio';

interface JointMobilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine: JointWarmupRoutine;
  routineTitle?: string;
}

export const JointMobilityModal: React.FC<JointMobilityModalProps> = ({
  isOpen,
  onClose,
  routine,
  routineTitle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentExercise: MobilityExercise | undefined = routine.exercises[currentIndex];

  // Reseta estado ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsCompleted(false);
      setIsRunning(false);
      if (routine.exercises[0]) {
        setSecondsRemaining(routine.exercises[0].durationSeconds);
      }
    } else {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  // Atualiza tempo ao avançar/retroceder exercício
  useEffect(() => {
    if (isOpen && currentExercise) {
      setSecondsRemaining(currentExercise.durationSeconds);
      setIsRunning(false);
    }
  }, [currentIndex]);

  // Contagem regressiva
  useEffect(() => {
    if (!isRunning || !isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Finalizou o exercício atual
          if (!isMuted) {
            soundManager.playTimerFinish();
          }
          if (currentIndex < routine.exercises.length - 1) {
            setCurrentIndex((idx) => idx + 1);
          } else {
            setIsRunning(false);
            setIsCompleted(true);
            if (!isMuted) {
              soundManager.playCelebration();
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isOpen, currentIndex, routine.exercises.length, isMuted]);

  if (!isOpen) return null;

  const progressPercent = currentExercise 
    ? Math.round(((currentExercise.durationSeconds - secondsRemaining) / currentExercise.durationSeconds) * 100)
    : 0;

  const totalProgressPercent = Math.round(((currentIndex + (progressPercent / 100)) / routine.exercises.length) * 100);

  const handleToggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const handleResetCurrent = () => {
    setIsRunning(false);
    if (currentExercise) {
      setSecondsRemaining(currentExercise.durationSeconds);
    }
  };

  const handleNext = () => {
    if (currentIndex < routine.exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-gradient-to-b from-[#0f172a] to-[#0a101f] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0c1424]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
              🤸‍♂️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  Aquecimento Articular & Mobilidade
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {routine.totalDurationMinutes} min
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {routineTitle ? `Adaptado para ${routineTitle}` : routine.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 transition-colors cursor-pointer"
              title={isMuted ? 'Ativar avisos sonoros' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Progresso Global do Aquecimento */}
        <div className="w-full bg-slate-900 h-1.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full transition-all duration-300"
            style={{ width: `${totalProgressPercent}%` }}
          />
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isCompleted ? (
            <div className="text-center py-6 space-y-4 animate-scaleUp">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Articulações 100% Lubrificadas!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto mt-1 leading-relaxed">
                  Líquido sinovial aquecido, manguito e estabilizadores ativados. Suas cápsulas articulares estão protegidas contra atrito e prontas para carga pesada.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#080d1a] border border-slate-800 max-w-sm mx-auto text-left space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Articulações preparadas:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {routine.primaryJoints.map((j) => (
                    <span key={j} className="text-[10px] bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-medium">
                      {j}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-300 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 mx-auto"
                >
                  <span>Iniciar Séries de Força</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : currentExercise ? (
            <>
              {/* Etapa & Nome do Exercício */}
              <div className="bg-[#0b1220] p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    Exercício {currentIndex + 1} de {routine.exercises.length}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    {currentExercise.targetJoint}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {currentExercise.name}
                </h3>

                <div className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 inline-block">
                  🎯 Meta: {currentExercise.repsOrTimeText}
                </div>
              </div>

              {/* Cronômetro Central Grande com Controles */}
              <div className="bg-[#080d19] p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-wider">
                    00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {isRunning ? 'Em Execução' : 'Pausado'}
                  </span>
                </div>

                {/* Controles de Play/Pause/Reset */}
                <div className="flex items-center gap-3 mt-4 relative z-10">
                  <button
                    type="button"
                    onClick={handleResetCurrent}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                    title="Reiniciar tempo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleTimer}
                    className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>Iniciar Cronômetro</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instrução Biomecânica / Como Fazer */}
              <div className="p-3.5 rounded-2xl bg-[#0b1220] border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                  Como Executar com Precisão:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {currentExercise.cue}
                </p>
              </div>

              {/* Por que fazer este exercício */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-200/90 leading-relaxed">
                  <strong className="text-emerald-300">Benefício Fisiológico: </strong>
                  {currentExercise.benefits}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Rodapé / Navegação entre exercícios */}
        {!isCompleted && (
          <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#0c1424] flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className="py-2 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-1.5">
              {routine.exercises.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex 
                      ? 'w-5 bg-emerald-400' 
                      : idx < currentIndex 
                      ? 'bg-emerald-600' 
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="py-2 px-3.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
            >
              <span>{currentIndex === routine.exercises.length - 1 ? 'Concluir' : 'Próximo'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
