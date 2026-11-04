import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Share2, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  FileText,
  Dumbbell,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Eye,
  Loader2,
  MessageCircle,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import { WorkoutSessionSummary } from '../types/workout';
import { generateWorkoutCardImage } from '../utils/generateWorkoutCardImage';
import { extractSessionPRs } from '../utils/prEngine';
import { exportCompletedSessionToPDF } from '../utils/pdfExport';
import { WorkoutPdfExportModal } from './WorkoutPdfExportModal';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkoutSessionSummary | null;
  athleteName: string;
  previousSessions?: WorkoutSessionSummary[];
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  onClose,
  session,
  athleteName,
  previousSessions = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'image_card'>('details');
  const [cardFormat, setCardFormat] = useState<'story' | 'post'>('story');
  const [cardImage, setCardImage] = useState<{ blob: Blob; dataUrl: string; file: File } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Extrai recordes pessoais batidos nesta sessão
  const sessionPRs = useMemo(() => {
    if (!session) return [];
    const olderSessions = previousSessions.filter(
      (s) => s.id !== session.id && new Date(s.date).getTime() < new Date(session.date).getTime()
    );
    return extractSessionPRs(session, olderSessions);
  }, [session, previousSessions]);

  // Generate image card automatically whenever modal opens with session or format changes
  useEffect(() => {
    if (!isOpen || !session) {
      setCardImage(null);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    generateWorkoutCardImage(session, athleteName, {
      format: cardFormat,
      prsCount: sessionPRs.length,
    })
      .then((res) => {
        if (isMounted) {
          setCardImage(res);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao gerar imagem do cartão de treino:', err);
        if (isMounted) {
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, session, athleteName, cardFormat, sessionPRs.length]);

  if (!isOpen || !session) return null;

  // Format date
  const sessionDate = new Date(session.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate max load across all sets
  let maxLift = 0;
  session.completedExercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      if (s.weight > maxLift) maxLift = s.weight;
    });
  });

  // Build clean text summary
  const buildShareText = () => {
    const lines = [
      `🏆 *TREINO CONCLUÍDO COM SUCESSO!*`,
      `⚡ *MeuTreino Pro — Hipertrofia Individualizada*`,
      `👤 Atleta: *${athleteName}*`,
      `📅 ${sessionDate}`,
      `💪 Divisão: *${session.splitName}*`,
      `🏋️‍♂️ Tonelagem Total: *${session.totalVolumeLoadKg.toLocaleString('pt-BR')} kg*`,
      `🔥 Séries Efetivas Concluídas: *${session.totalSets}*`,
    ];

    if (maxLift > 0) {
      lines.push(`⚡ Carga Máxima da Sessão: *${maxLift} kg*`);
    }

    if (sessionPRs.length > 0) {
      lines.push('');
      lines.push('🔥 *NOVOS RECORDES PESSOAIS (PRs):*');
      sessionPRs.forEach((pr) => {
        lines.push(`• *${pr.exerciseName}*: ${pr.weight}kg × ${pr.reps} reps (+${pr.isWeightPR ? `${pr.diffWeight}kg na carga` : `${pr.diff1RM}kg no 1RM`})`);
      });
    }

    if (session.notes) {
      lines.push(`📝 Observações: _"${session.notes}"_`);
    }

    lines.push('');
    lines.push('📋 *Destaques dos Exercícios:*');
    session.completedExercises.forEach((ex, idx) => {
      let maxSet = ex.sets[0];
      ex.sets.forEach((s) => {
        if (s.weight > (maxSet?.weight || 0)) maxSet = s;
      });

      lines.push(`${idx + 1}. *${ex.name}* (${ex.sets.length} séries) · Top: *${maxSet?.weight || 0}kg x ${maxSet?.reps || 0}*`);
    });

    lines.push('');
    lines.push('⚡ _Hipertrofia individualizada e periodização com MeuTreino Pro._');
    return lines.join('\n');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(buildShareText());
    const a = document.createElement('a');
    a.href = `https://api.whatsapp.com/send?text=${text}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportSessionCSV = () => {
    if (!session) return;
    const headers = ['Data', 'Divisao', 'Exercicio', 'Serie', 'Carga (kg)', 'Reps', 'RPE', 'RIR'];
    const rows: string[][] = [];
    const dStr = new Date(session.date).toLocaleDateString('pt-BR');
    session.completedExercises.forEach((ex) => {
      ex.sets.forEach((s, sIdx) => {
        rows.push([
          `"${dStr}"`,
          `"${session.splitName}"`,
          `"${ex.name}"`,
          `"${sIdx + 1}"`,
          `"${s.weight}"`,
          `"${s.reps}"`,
          `"${s.rpe || ''}"`,
          `"${s.rir || ''}"`
        ]);
      });
    });
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treino_${session.splitName.toLowerCase().replace(/\s+/g, '_')}_${new Date(session.date).toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShareFeedback('CSV exportado com sucesso!');
    setTimeout(() => setShareFeedback(null), 3000);
  };

  // Direct download of the generated PNG card
  const handleDownloadImage = () => {
    if (!cardImage) return;
    const a = document.createElement('a');
    a.href = cardImage.dataUrl;
    a.download = cardImage.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setShareFeedback('Imagem baixada com sucesso!');
    setTimeout(() => setShareFeedback(null), 3000);
  };

  // Copy image to clipboard (if supported)
  const handleCopyImage = async () => {
    if (!cardImage) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': cardImage.blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
        return;
      }
    } catch {
      // Fallback: download if copy direct image is restricted
      handleDownloadImage();
    }
  };

  // Smart Share with Image File
  const handleShare = async () => {
    const text = buildShareText();

    // Check if navigator.share is available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        // Try sharing WITH image file first
        if (cardImage?.file && navigator.canShare && navigator.canShare({ files: [cardImage.file] })) {
          await navigator.share({
            title: `Treino Concluído - ${athleteName}`,
            text: text,
            files: [cardImage.file],
          });
          setShareFeedback('Treino e imagem compartilhados com sucesso!');
          setTimeout(() => setShareFeedback(null), 3500);
          return;
        }

        // If file sharing is not supported by the environment, share text and trigger image download
        await navigator.share({
          title: `Treino Concluído - ${athleteName}`,
          text: text,
        });

        // Also download image so the user can easily attach it
        if (cardImage) {
          handleDownloadImage();
        }
      } catch (err: unknown) {
        // User aborted share or permission denied
        if (err instanceof Error && err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      // Fallback for desktop browsers without Web Share: copy text + download image
      handleCopy();
      if (cardImage) {
        handleDownloadImage();
      }
    }
  };

  const handleCopy = () => {
    const text = buildShareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101828] border border-emerald-500/30 rounded-3xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl shadow-emerald-500/10 relative overflow-hidden ring-1 ring-emerald-500/20">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 text-center relative z-10 border-b border-slate-800/80 bg-[#0d1424]/90">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Trophy Badge */}
          <div className="relative inline-block mb-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-500 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-400/25">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-emerald-500 text-slate-950">
              <Sparkles className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Parabéns, {athleteName}! 🏆
          </h2>
          <p className="text-xs sm:text-sm text-emerald-400 font-bold mt-1 flex items-center justify-center gap-1.5">
            <span>Sessão Concluída com Sucesso</span>
            <span className="text-slate-400 font-normal">·</span>
            <span className="text-slate-300 uppercase tracking-wider text-[11px] font-extrabold bg-slate-800 px-2 py-0.5 rounded">
              {session.splitName}
            </span>
          </p>

          {/* Tabs: Detalhes vs Cartão Imagem */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Resumo & Métricas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('image_card')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'image_card'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Cartão de Imagem (PNG)</span>
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Detailed Interactive View */}
        {activeTab === 'details' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Key KPI Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Tonelagem Total */}
              <div className="bg-[#0b1220] p-3 rounded-2xl border border-emerald-500/30 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Tonelagem Total</span>
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-white">
                  {session.totalVolumeLoadKg.toLocaleString('pt-BR')}{' '}
                  <span className="text-[10px] font-normal text-slate-400">kg</span>
                </div>
                <span className="text-[9px] text-slate-400">volume de carga pura</span>
              </div>

              {/* Total de Séries */}
              <div className="bg-[#0b1220] p-3 rounded-2xl border border-sky-500/30 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Séries Válidas</span>
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-sky-400">
                  {session.totalSets}
                </div>
                <span className="text-[9px] text-slate-400">estímulos efetivos</span>
              </div>

              {/* Carga Máxima */}
              <div className="bg-[#0b1220] p-3 rounded-2xl border border-amber-500/30 text-center col-span-2 sm:col-span-1">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Carga Máxima</span>
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-amber-300">
                  {maxLift > 0 ? `${maxLift} kg` : `${session.completedExercises.length} exerc.`}
                </div>
                <span className="text-[9px] text-slate-400">pico de sobrecarga</span>
              </div>
            </div>

            {/* Novos Recordes Pessoais (PRs) Batidos nesta Sessão */}
            {sessionPRs.length > 0 && (
              <div className="bg-gradient-to-br from-[#1a1307] via-[#140e04] to-[#0c0902] border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-xl shadow-amber-500/10 animate-fadeIn">
                <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Flame className="w-4 h-4 fill-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-300">
                        🔥 Novos Recordes Pessoais (PRs) Batidos!
                      </h4>
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        {sessionPRs.length} superação(ões) histórica(s) nesta sessão
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    Novo Pico
                  </span>
                </div>

                <div className="space-y-1.5">
                  {sessionPRs.map((pr, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/70 border border-amber-500/25 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-white block truncate">{pr.exerciseName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {pr.weight}kg × {pr.reps} reps
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-amber-400 block text-xs sm:text-sm">
                          +{pr.isWeightPR ? `${pr.diffWeight}kg na carga` : `${pr.diff1RM}kg no 1RM`}
                        </span>
                        <span className="text-[9px] text-amber-300/80 font-bold uppercase">
                          {pr.isWeightPR ? 'Carga Máxima' : '1RM Estimado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Notes if provided */}
            {session.notes && (
              <div className="bg-[#080e1b] border border-purple-500/25 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">
                    Notas Registradas na Sessão:
                  </span>
                  <p className="text-xs text-slate-200 italic font-medium">
                    &ldquo;{session.notes}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Exercise-by-Exercise Highlights */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Desempenho dos Exercícios</span>
              </div>

              <div className="space-y-2">
                {session.completedExercises.map((ex, idx) => {
                  let topSet = ex.sets[0];
                  ex.sets.forEach((s) => {
                    if (s.weight > (topSet?.weight || 0)) topSet = s;
                  });

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0b1220] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold uppercase text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                            {ex.muscleGroup}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {ex.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {ex.sets.length} {ex.sets.length === 1 ? 'série completada' : 'séries completadas'}
                        </span>
                      </div>

                      {/* Top Set Pill */}
                      <div className="bg-[#121c2e] px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Top Set:
                        </span>
                        <strong className="text-emerald-400 font-black">
                          {topSet?.weight || 0} kg &times; {topSet?.reps || 0}
                          {topSet?.rpe ? ` @RPE ${topSet.rpe}` : ''}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Visual Image Card Preview */}
        {activeTab === 'image_card' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 flex flex-col items-center">
            {/* Format Selector: Story do Instagram (9:16) vs Feed */}
            <div className="flex items-center gap-1.5 bg-[#0b1220] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setCardFormat('story')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  cardFormat === 'story'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Story do Instagram (9:16)</span>
              </button>
              <button
                type="button"
                onClick={() => setCardFormat('post')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cardFormat === 'post'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Card Compacto (Feed)</span>
              </button>
            </div>

            {isGenerating ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <p className="text-xs font-semibold">Renderizando Story gráfico em alta resolução...</p>
              </div>
            ) : cardImage ? (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="relative group rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-black max-h-[46vh] flex items-center justify-center">
                  <img
                    src={cardImage.dataUrl}
                    alt="Cartão de Treino Concluído"
                    className="max-h-[46vh] w-auto object-contain rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Story PNG</span>
                    </button>
                  </div>
                </div>

                {/* Sub-actions for the Image Card */}
                <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Imagem PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyImage}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedImage ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Imagem Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Imagem</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-center flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Pronto para publicar no Instagram Stories, WhatsApp Status ou enviar para seu treinador!</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-rose-400 text-xs">
                Não foi possível gerar a imagem. Tente novamente.
              </div>
            )}
          </div>
        )}

        {/* Share Feedback Toast Banner */}
        {shareFeedback && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Modal Footer: Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0d1424] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={handleShare}
              disabled={isGenerating}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>Compartilhar Treino + Imagem</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={!cardImage}
              className="py-3 px-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-400 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              title="Baixar Cartão em PNG"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Baixar Card</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="py-3 px-3 rounded-xl font-bold text-xs bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-500/40 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
              title="Compartilhar no WhatsApp com formatação"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span className="hidden xs:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportCompletedSessionToPDF(session, athleteName);
                setShareFeedback('Relatório em PDF baixado com sucesso!');
                setTimeout(() => setShareFeedback(null), 3000);
              }}
              className="py-3 px-3 rounded-xl font-bold text-xs bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
              title="Baixar relatório completo da sessão concluída em PDF A4"
            >
              <FileDown className="w-4 h-4 text-sky-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPdfPreviewOpen(true)}
              className="py-3 px-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              title="Visualizar e imprimir folha A4"
            >
              <Eye className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">Ver A4</span>
            </button>

            <button
              type="button"
              onClick={handleExportSessionCSV}
              className="py-3 px-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              title="Exportar dados desta sessão em CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden xs:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="py-3 px-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              title="Copiar texto para colar"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden xs:inline">Texto</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de Pré-visualização e Impressão A4 da Sessão Concluída */}
      <WorkoutPdfExportModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        session={session}
        athleteName={athleteName}
      />
    </div>
  );
};
