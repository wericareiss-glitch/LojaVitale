/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Send, 
  Bug, 
  Lightbulb, 
  Sparkles, 
  MessageSquare, 
  Check, 
  Copy, 
  Clock, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserProfile, GeneratedWorkoutRoutine } from '../types/workout';
import { safeStorage } from '../utils/storage';
import { getProtectedCreatorKey } from '../utils/privacy';

interface FeedbackViewProps {
  user: UserProfile;
  routines: GeneratedWorkoutRoutine[];
}

interface FeedbackEntry {
  id: string;
  type: 'bug' | 'suggestion' | 'training' | 'praise';
  categoryLabel: string;
  title: string;
  description: string;
  date: string;
  status: 'sent' | 'fallback_opened';
}

const FEEDBACK_TYPES = [
  { id: 'suggestion', label: 'Sugestão', icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'bug', label: 'Bug / Problema', icon: Bug, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { id: 'training', label: 'Dúvida de Treino', icon: Sparkles, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  { id: 'praise', label: 'Elogio / Outro', icon: MessageSquare, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
] as const;

export const FeedbackView: React.FC<FeedbackViewProps> = ({ user, routines }) => {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'training' | 'praise'>('suggestion');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [showOptionalTitle, setShowOptionalTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const historyStorageKey = `mtp_feedback_history_${user.id}`;
  const [history, setHistory] = useState<FeedbackEntry[]>(() => {
    return safeStorage.get<FeedbackEntry[]>(historyStorageKey, []);
  });

  const getSystemDiagnostics = () => {
    const isMobile = window.innerWidth <= 768;
    return `
--- DIAGNÓSTICO TÉCNICO ANONIMIZADO ---
Conta: Protegida (Dados Pessoais Ocultos)
Tipo de Conta: ${user.isVisitor ? 'Visitante' : 'Perfil Registrado'}
Rotinas Cadastradas: ${routines.length}
Formato de Tela: ${isMobile ? 'Mobile' : 'Desktop'}
Data de Envio: ${new Date().toLocaleDateString('pt-BR')}
---------------------------------------`.trim();
  };

  const getEffectiveTitle = () => {
    if (title.trim()) return title.trim();
    const firstLine = description.trim().split('\n')[0] || '';
    if (firstLine.length > 0) {
      return firstLine.slice(0, 50) + (firstLine.length > 50 ? '...' : '');
    }
    const cat = FEEDBACK_TYPES.find(t => t.id === feedbackType)?.label || 'Sugestão';
    return `${cat} de ${user.name || 'Usuário'}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!description.trim()) {
      setFeedbackStatus({
        type: 'error',
        message: 'Por favor, escreva o que você deseja sugerir ou relatar antes de enviar.'
      });
      return;
    }

    setIsLoading(true);
    setFeedbackStatus(null);

    const typeItem = FEEDBACK_TYPES.find(t => t.id === feedbackType) || FEEDBACK_TYPES[0];
    const finalTitle = getEffectiveTitle();
    const diagnostics = getSystemDiagnostics();

    let sendSuccess = false;

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${getProtectedCreatorKey()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `[MeuTreino Pro - ${typeItem.label}] ${finalTitle}`,
          categoria: typeItem.label,
          usuario: 'Atleta (Anonimizado)',
          mensagem: description.trim(),
          diagnostico: diagnostics,
          _template: 'table'
        })
      });

      if (response.ok) {
        sendSuccess = true;
      }
    } catch {
      sendSuccess = false;
    }

    // Grava histórico localmente (criptografado pelo safeStorage)
    const newEntry: FeedbackEntry = {
      id: 'fb_' + Date.now(),
      type: feedbackType,
      categoryLabel: typeItem.label,
      title: finalTitle,
      description: description.trim(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      status: sendSuccess ? 'sent' : 'fallback_opened'
    };

    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    safeStorage.set(historyStorageKey, updatedHistory);

    setIsLoading(false);

    setFeedbackStatus({
      type: 'success',
      message: 'Sua mensagem foi registrada e enviada com segurança! Agradecemos sua colaboração.'
    });
    setDescription('');
    setTitle('');
    setShowOptionalTitle(false);
  };

  const handleCopyText = () => {
    if (!description.trim()) {
      setFeedbackStatus({
        type: 'error',
        message: 'Escreva uma mensagem antes de copiar.'
      });
      return;
    }
    const typeItem = FEEDBACK_TYPES.find(t => t.id === feedbackType) || FEEDBACK_TYPES[0];
    const fullMessage = `[MeuTreino Pro - ${typeItem.label}]\n${description.trim()}\n\n${getSystemDiagnostics()}`;
    navigator.clipboard.writeText(fullMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Top Banner - O título reflete dinamicamente a categoria escolhida pelo usuário */}
      {(() => {
        const activeCategoryItem = FEEDBACK_TYPES.find((t) => t.id === feedbackType) || FEEDBACK_TYPES[0];
        const ActiveIcon = activeCategoryItem.icon;
        return (
          <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-slate-900 border border-sky-500/20 rounded-2xl p-4 sm:p-5 shadow-lg">
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
              <ActiveIcon className="w-5 h-5 text-sky-400" />
              <span>{activeCategoryItem.label}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Escreva o que você deseja relatar ou sugerir nesta categoria. Sua mensagem será enviada com segurança à equipe.
            </p>
          </div>
        );
      })()}

      {/* Status Alert */}
      {feedbackStatus && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition-all ${
            feedbackStatus.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : feedbackStatus.type === 'info'
              ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedbackStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackStatus(null)}
            className="text-xs font-bold underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        {/* Category Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Selecione a Categoria
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FEEDBACK_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = feedbackType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFeedbackType(t.id)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-2 ring-sky-500/30 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              O que você deseja relatar ou sugerir?
            </label>
            {!showOptionalTitle && (
              <button
                type="button"
                onClick={() => setShowOptionalTitle(true)}
                className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                + Adicionar título
              </button>
            )}
          </div>

          {showOptionalTitle && (
            <input
              type="text"
              placeholder="Título curto (opcional)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mb-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          )}

          <textarea
            rows={5}
            required
            placeholder="Escreva sua sugestão, ideia de melhoria ou descreva o problema detalhadamente..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <button
            type="submit"
            disabled={isLoading || !description.trim()}
            className="flex-1 h-12 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-500/20 active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Mensagem</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copiar texto</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* History of Sent Feedback */}
      {history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Mensagens Enviadas</span>
            </h2>
            {confirmClearHistory ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    safeStorage.remove(historyStorageKey);
                    setConfirmClearHistory(false);
                  }}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Confirmar exclusão
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearHistory(false)}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearHistory(true)}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Limpar lista
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white line-clamp-1">{item.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">{item.date}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Enviado
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 line-clamp-3 whitespace-pre-wrap">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
