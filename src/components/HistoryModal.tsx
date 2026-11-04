/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { X, Calendar, Dumbbell, Trash2, Award, FileText, Share2, FileDown, Search } from 'lucide-react';
import { WorkoutSessionSummary } from '../types/workout';
import { exportCompletedSessionToPDF } from '../utils/pdfExport';
import { authStorage } from '../utils/auth';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WorkoutSessionSummary[];
  onClearHistory: () => void;
  onViewSummary?: (session: WorkoutSessionSummary) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onClearHistory,
  onViewSummary,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((sess) => {
      if (sess.splitName.toLowerCase().includes(q)) return true;
      if (sess.notes && sess.notes.toLowerCase().includes(q)) return true;
      return sess.completedExercises.some(
        (ex) => ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q)
      );
    });
  }, [sessions, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                <Calendar className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Histórico de Sessões Concluídas
                </h3>
                <p className="text-xs text-slate-400">
                  {filteredSessions.length} de {sessions.length}{' '}
                  {sessions.length === 1 ? 'treino registrado' : 'treinos registrados'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {sessions.length > 2 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por treino, exercício, grupo muscular ou nota..."
                className="w-full bg-[#0a101d] border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Virtualized Scrollable Content via react-virtuoso */}
        <div className="flex-1 min-h-0 px-5 py-3">
          {filteredSessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-500 text-xs">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              {sessions.length === 0
                ? 'Nenhum treino concluído ainda. Ao terminar o seu treino, clique em “Concluir Sessão” para registrar sua evolução de carga e volume!'
                : 'Nenhuma sessão encontrada para o filtro pesquisado.'}
            </div>
          ) : (
            <Virtuoso
              style={{ height: '100%' }}
              data={filteredSessions}
              overscan={250}
              computeItemKey={(_, sess) => sess.id}
              itemContent={(_, sess) => (
                <div className="pb-3.5">
                  <div className="bg-[#0c1220] border border-slate-800/80 rounded-2xl p-4 transition-all hover:border-slate-700">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/60 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          {sess.splitName}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(sess.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-slate-400 font-mono">
                          {sess.totalSets} séries
                        </span>
                        <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {sess.totalVolumeLoadKg.toLocaleString()} kg tonelagem
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const user = authStorage.getActiveUser();
                            exportCompletedSessionToPDF(sess, user?.name || 'Atleta');
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Baixar relatório desta sessão em PDF A4"
                        >
                          <FileDown className="w-3 h-3 text-emerald-400" />
                          <span>PDF</span>
                        </button>
                        {onViewSummary && (
                          <button
                            type="button"
                            onClick={() => onViewSummary(sess)}
                            className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Ver Resumo e Compartilhar"
                          >
                            <Share2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Resumo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Session Notes if available */}
                    {sess.notes && (
                      <div className="mb-3 p-2.5 rounded-xl bg-[#080d18] border border-purple-500/20 text-xs text-slate-300 flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[10px] uppercase font-bold text-purple-400 block tracking-wider mb-0.5">
                            Notas da Sessão:
                          </strong>
                          <p className="text-slate-300 italic">{sess.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Exercises list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                      {sess.completedExercises.map((ex, idx) => (
                        <div
                          key={idx}
                          className="bg-[#101828] p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="truncate mr-2">
                              <span className="font-semibold text-white truncate block">
                                {ex.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {ex.muscleGroup}
                              </span>
                            </div>
                            <span className="font-mono text-slate-400 text-[11px] shrink-0 font-bold">
                              {ex.sets.length} {ex.sets.length === 1 ? 'série' : 'séries'}
                            </span>
                          </div>

                          {/* Sets breakdown */}
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/60 font-mono text-[10px]">
                            {ex.sets.map((s, sI) => (
                              <span
                                key={sI}
                                className="bg-[#0b1220] px-1.5 py-0.5 rounded text-slate-300 border border-slate-800"
                              >
                                {s.weight}kg &times; {s.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>

        {/* Footer */}
        {sessions.length > 0 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-400">Apagar histórico?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-500 hover:bg-rose-400 text-slate-950 transition-colors cursor-pointer"
                >
                  Sim, apagar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Histórico</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
