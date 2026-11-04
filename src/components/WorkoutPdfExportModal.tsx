/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FileDown,
  Printer,
  Check,
  Dumbbell,
  Sparkles,
  FileText,
  Calendar,
  Award,
} from 'lucide-react';
import {
  GeneratedWorkoutRoutine,
  WorkoutSessionSummary,
  UserProfile,
} from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import {
  exportRoutineToPDF,
  exportCompletedSessionToPDF,
} from '../utils/pdfExport';
import { calculate1RM } from '../utils/storage';

interface WorkoutPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine?: GeneratedWorkoutRoutine | null;
  session?: WorkoutSessionSummary | null;
  user?: UserProfile | null;
  athleteName?: string;
}

export const WorkoutPdfExportModal: React.FC<WorkoutPdfExportModalProps> = ({
  isOpen,
  onClose,
  routine,
  session,
  user,
  athleteName: propAthleteName,
}) => {
  const [includeCues, setIncludeCues] = useState(true);
  const [includeBlankBoxes, setIncludeBlankBoxes] = useState(true);
  const [downloadedToast, setDownloadedToast] = useState(false);

  if (!isOpen || (!routine && !session)) return null;

  const athleteName = propAthleteName || user?.name || 'Atleta';

  const handleDownloadPdf = () => {
    if (routine) {
      exportRoutineToPDF(routine, user, {
        includeBiomechanicalCues: includeCues,
        includeBlankLogBoxes: includeBlankBoxes,
        athleteName,
      });
    } else if (session) {
      exportCompletedSessionToPDF(session, athleteName);
    }
    setDownloadedToast(true);
    setTimeout(() => setDownloadedToast(false), 3000);
  };

  const handlePrintPage = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0e1628] border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0a101f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {routine
                  ? `Ficha de Treino Imprimível (PDF) — Treino ${routine.letter}`
                  : 'Relatório de Sessão Concluída (PDF)'}
              </h3>
              <p className="text-xs text-slate-400">
                {routine
                  ? 'Formato A4 elegante para levar para a academia ou arquivar seu programa'
                  : 'Arquivo de progresso de cargas, 1RM estimado e volume acumulado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customization Controls (for Routine sheet) */}
        {routine && (
          <div className="px-4 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Opções da Ficha A4:
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-200">
                <input
                  type="checkbox"
                  checked={includeCues}
                  onChange={(e) => setIncludeCues(e.target.checked)}
                  className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Incluir Dicas Biomecânicas de Execução</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-200">
                <input
                  type="checkbox"
                  checked={includeBlankBoxes}
                  onChange={(e) => setIncludeBlankBoxes(e.target.checked)}
                  className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Incluir Campos para Anotar Carga/Reps na Academia</span>
              </label>
            </div>
          </div>
        )}

        {/* Printable A4 Sheet Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/80">
          <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-7 shadow-xl max-w-2xl mx-auto space-y-5 border border-slate-200">
            {/* Sheet Header */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400 block">
                  MEUTREINO PRO • HIPERTROFIA BASEADA EM EVIDÊNCIAS
                </span>
                <h2 className="text-lg sm:text-xl font-black mt-0.5">
                  {routine
                    ? `Treino ${routine.letter}: ${routine.name}`
                    : session?.splitName}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Atleta: <strong>{athleteName}</strong> ·{' '}
                  {routine
                    ? `${routine.totalSets} séries totais · ~${routine.estimatedMinutes} min`
                    : `${session?.totalSets} séries concluídas · Tonelagem: ${session?.totalVolumeLoadKg.toLocaleString('pt-BR')} kg`}
                </p>
              </div>

              <div className="text-left sm:text-right text-xs font-mono text-slate-300 shrink-0">
                {routine ? (
                  <div>Data: ____/____/202__</div>
                ) : (
                  <div>
                    {session &&
                      new Date(session.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Routine Exercises Preview */}
            {routine && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                  Músculos da Sessão:{' '}
                  <span className="text-slate-900">
                    {routine.muscleGroups
                      .map((m) => MUSCLE_NAMES[m] || m)
                      .join(' • ')}
                  </span>
                </div>

                {routine.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                      <div>
                        <span className="text-xs font-black text-slate-900">
                          {idx + 1}. {item.exercise.name}
                        </span>
                        <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                          {MUSCLE_NAMES[item.muscleKey] || item.muscleKey}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-slate-700">
                        {item.sets} séries × {item.reps} reps · {item.rir} · Descanso: {item.rest}s
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      <strong>Foco Anatômico:</strong> {item.exercise.target} ·{' '}
                      <strong>Estabilidade:</strong> {item.exercise.stability}
                    </div>

                    {includeCues && item.exercise.cue && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 italic">
                        <strong>Dica de Ouro:</strong> &ldquo;{item.exercise.cue}&rdquo;
                      </div>
                    )}

                    {includeBlankBoxes && (
                      <div className="grid grid-cols-1 gap-1 pt-1">
                        {Array.from({ length: item.sets }).map((_, sIdx) => (
                          <div
                            key={sIdx}
                            className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 rounded px-2.5 py-1 flex items-center justify-between"
                          >
                            <span>Série #{sIdx + 1}</span>
                            <span>Carga: _______ kg × _____ reps</span>
                            <span>RPE/RIR: _____</span>
                            <span>[ &nbsp; ] OK</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Completed Session Preview */}
            {session && (
              <div className="space-y-3">
                {session.notes && (
                  <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
                    <strong>Observações Registradas:</strong> &ldquo;{session.notes}&rdquo;
                  </div>
                )}

                {/* Gráfico de Volume Total da Sessão na Folha A4 */}
                {session.completedExercises.length > 0 && (
                  <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-100/80 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                        📊 Gráfico de Volume Total da Sessão (Tonelagem por Exercício)
                      </span>
                      <span className="text-xs font-mono font-black text-emerald-700">
                        Total: {session.totalVolumeLoadKg.toLocaleString('pt-BR')} kg (100%)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(() => {
                        const vols = session.completedExercises.map((ex) =>
                          ex.sets.reduce((acc, s) => acc + (s.weight || 0) * (s.reps || 0), 0)
                        );
                        const maxVol = Math.max(...vols, 1);
                        const totalVol = Math.max(session.totalVolumeLoadKg, 1);

                        return session.completedExercises.map((ex, i) => {
                          const exVol = vols[i];
                          const widthPct = Math.max(4, Math.round((exVol / maxVol) * 100));
                          const sharePct = Math.round((exVol / totalVol) * 100);
                          return (
                            <div key={i} className="grid grid-cols-12 items-center gap-2 text-[11px]">
                              <div className="col-span-4 truncate font-bold text-slate-800">
                                {i + 1}. {ex.name}
                              </div>
                              <div className="col-span-5 h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    i % 2 === 0 ? 'bg-emerald-500' : 'bg-sky-500'
                                  }`}
                                  style={{ width: `${widthPct}%` }}
                                />
                              </div>
                              <div className="col-span-3 text-right font-mono font-bold text-slate-900">
                                {exVol.toLocaleString('pt-BR')} kg ({sharePct}%)
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {session.completedExercises.map((ex, idx) => {
                  const exVol = ex.sets.reduce(
                    (acc, s) => acc + (s.weight || 0) * (s.reps || 0),
                    0
                  );
                  return (
                    <div
                      key={idx}
                      className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <div>
                          <span className="text-xs font-black text-slate-900">
                            {idx + 1}. {ex.name}
                          </span>
                          <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {ex.muscleGroup}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700">
                          Volume: {exVol.toLocaleString('pt-BR')} kg
                        </span>
                      </div>

                      <div className="space-y-1">
                        {ex.sets.map((s, sIdx) => {
                          const est1RM = calculate1RM(
                            s.weight.toString(),
                            s.reps.toString(),
                            s.rpe || s.rir
                          );
                          return (
                            <div
                              key={sIdx}
                              className="text-[11px] font-mono text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 flex items-center justify-between"
                            >
                              <span>
                                <strong>Série #{sIdx + 1}:</strong> {s.weight} kg × {s.reps} reps
                              </span>
                              <span className="text-slate-600">
                                {s.rpe ? `@RPE ${s.rpe}` : ''} · 1RM Est.: ~{est1RM || s.weight} kg
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0a101f] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-5 py-3 rounded-xl font-black text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
            >
              <FileDown className="w-4 h-4 stroke-[2.5]" />
              <span>Baixar Arquivo PDF (.pdf)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPage}
              className="px-4 py-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Folha A4</span>
            </button>

            {downloadedToast && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                <span>PDF gerado e baixado com sucesso!</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
