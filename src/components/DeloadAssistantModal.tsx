/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  X, 
  TrendingDown, 
  Zap, 
  HeartHandshake,
  Activity,
  Flame
} from 'lucide-react';
import { FatigueAnalysis, DeloadState, activateDeload, deactivateDeload } from '../utils/deloadEngine';
import { UserProfile } from '../types/workout';

interface DeloadAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  analysis: FatigueAnalysis;
  currentDeload: DeloadState | null;
  currentBudget: number;
  onDeloadStateChange: () => void;
}

export const DeloadAssistantModal: React.FC<DeloadAssistantModalProps> = ({
  isOpen,
  onClose,
  user,
  analysis,
  currentDeload,
  currentBudget,
  onDeloadStateChange,
}) => {
  if (!isOpen) return null;

  const handleActivate = () => {
    activateDeload(user.id, currentBudget);
    onDeloadStateChange();
    onClose();
  };

  const handleDeactivate = () => {
    deactivateDeload(user.id);
    onDeloadStateChange();
    onClose();
  };

  const isDeloadActive = !!currentDeload?.active;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-2xl ${
              isDeloadActive ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                <span>Assistente de Deload & Fadiga</span>
                {isDeloadActive && (
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                    ATIVO
                  </span>
                )}
              </h3>
              <span className="text-xs text-slate-400">
                Regeneração neuroarticular e supercompensação muscular
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nível de Fadiga Sistêmica */}
        <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Índice de Fadiga Acumulada</span>
            </span>
            <span className={`font-mono font-black ${
              analysis.fatigueScore >= 70 ? 'text-rose-400' : analysis.fatigueScore >= 45 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {analysis.fatigueScore}% ({analysis.fatigueScore >= 70 ? 'Alto / Crítico' : analysis.fatigueScore >= 45 ? 'Moderado' : 'Ótimo'})
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                analysis.fatigueScore >= 70
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : analysis.fatigueScore >= 45
                  ? 'bg-gradient-to-r from-sky-500 to-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${analysis.fatigueScore}%` }}
            />
          </div>

          {analysis.reasons.length > 0 && (
            <div className="pt-2 border-t border-slate-800/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Diagnóstico Fisiológico:
              </span>
              <ul className="space-y-1">
                {analysis.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <span className="text-amber-400 leading-none">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* O que é a Semana de Deload? */}
        <div className="bg-[#070c18] rounded-2xl p-3.5 border border-sky-500/20 text-xs space-y-2">
          <span className="font-bold text-sky-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Como o Deload Funciona no MeuTreino Pro?</span>
          </span>
          <p className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">
            Um microciclo de Deload reduz temporariamente o volume em <strong>-40% de séries</strong> e sugere
            <strong> -10% de carga</strong> mantendo boa técnica e RPE 6 a 7 (RIR 3 a 4). Isso dissipa a fadiga residual do Sistema Nervoso Central e tendões sem perda de massa muscular, permitindo um retorno com força total e quebra de platôs.
          </p>
        </div>

        {/* Status Atual do Deload */}
        {isDeloadActive ? (
          <div className="bg-sky-950/40 border border-sky-500/40 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-sky-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span>Semana de Deload em Andamento</span>
              </span>
              <span className="font-mono text-[11px] bg-sky-500/20 px-2 py-0.5 rounded text-sky-200">
                Ativo até {new Date(currentDeload.expiresAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              O volume semanal está adaptado para recuperação. Ao terminar seus treinos desta semana, desative ou espere o microciclo expirar para retornar ao seu volume habitual.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleDeactivate}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Encerrar Deload e Voltar ao Normal
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Agora Não
            </button>
            <button
              type="button"
              onClick={handleActivate}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Ativar Semana de Deload (-40% séries)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
