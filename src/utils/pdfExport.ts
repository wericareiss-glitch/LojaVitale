/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import {
  GeneratedWorkoutRoutine,
  WorkoutSessionSummary,
  UserProfile,
} from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculate1RM } from './storage';

export interface PdfExportOptions {
  includeBiomechanicalCues?: boolean;
  includeBlankLogBoxes?: boolean;
  athleteName?: string;
}

/**
 * Generates and downloads an elegant, print-ready A4 PDF for a planned workout routine
 * (ideal for taking to the gym floor or archiving the training split).
 */
export function exportRoutineToPDF(
  routine: GeneratedWorkoutRoutine,
  user?: UserProfile | null,
  options: PdfExportOptions = {}
): void {
  const {
    includeBiomechanicalCues = true,
    includeBlankLogBoxes = true,
    athleteName = user?.name || 'Atleta',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 3, 3, 'F');

  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MEUTREINO PRO • FICHA CIENTÍFICA DE HIPERTROFIA', margin + 5, y + 7);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(`Treino ${routine.letter}: ${routine.name}`, margin + 5, y + 15);

  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const dateStr = new Date().toLocaleDateString('pt-BR');
  doc.text(
    `Atleta: ${athleteName}   |   Séries Totais: ${routine.totalSets}   |   Duração Est.: ~${routine.estimatedMinutes} min   |   Data: ____/____/202__ (Gerado em ${dateStr})`,
    margin + 5,
    y + 23
  );

  y += 34;

  // Muscle Groups Summary Bar
  const musclesText = routine.muscleGroups
    .map((m) => MUSCLE_NAMES[m] || m)
    .join(' • ');
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 2, 2, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Músculos Alvo da Sessão: ${musclesText}`, margin + 4, y + 6);

  y += 14;

  // Exercises Table / Cards
  routine.items.forEach((item, idx) => {
    const ex = item.exercise;
    const muscleLabel = MUSCLE_NAMES[item.muscleKey] || item.muscleKey;
    const cardBaseHeight = includeBlankLogBoxes ? 24 + item.sets * 6 : 22;
    const cueHeight = includeBiomechanicalCues && ex.cue ? 8 : 0;

    checkPageBreak(cardBaseHeight + cueHeight + 6);

    // Exercise Header Box
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(
      margin,
      y,
      pageWidth - margin * 2,
      cardBaseHeight + cueHeight,
      2,
      2,
      'FD'
    );

    // Index badge & Exercise Name
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`${idx + 1}. ${ex.name}`, margin + 4, y + 6.5);

    // Right metadata: Muscle, Sets x Reps, RIR, Rest
    doc.setFontSize(8.5);
    doc.setTextColor(14, 116, 144); // Cyan-700
    const metaRight = `${muscleLabel.toUpperCase()}  |  ${item.sets} séries × ${item.reps} reps  |  Meta: ${item.rir}  |  Descanso: ${item.rest}s`;
    doc.text(metaRight, pageWidth - margin - 4, y + 6.5, { align: 'right' });

    // Target fiber & stability
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Foco Anatômico: ${ex.target} • Estabilidade: ${ex.stability} • Perfil: ${ex.profile}`,
      margin + 4,
      y + 12
    );

    let innerY = y + 16;

    if (includeBiomechanicalCues && ex.cue) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105); // Emerald-600
      const cueLine = `Dica de Execução: "${ex.cue}"`;
      const splitCue = doc.splitTextToSize(cueLine, pageWidth - margin * 2 - 8);
      doc.text(splitCue[0], margin + 4, innerY);
      innerY += 6;
    }

    // Printable Set Log Rows for the Gym Floor
    if (includeBlankLogBoxes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      for (let s = 1; s <= item.sets; s++) {
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 4, innerY + 1, pageWidth - margin - 4, innerY + 1);
        doc.text(
          `Série #${s}:   Carga: _________ kg    ×    Reps: _________    |    RPE / RIR: _______    |    Tipo: ( )W  ( )T  ( )F  ( )D    |    [  ] Concluída`,
          margin + 6,
          innerY + 5
        );
        innerY += 6;
      }
    }

    y += cardBaseHeight + cueHeight + 4;
  });

  // Footer
  checkPageBreak(18);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Anotações do Treino: ___________________________________________________________________________________________',
    margin,
    y + 8
  );
  doc.text(
    'Gerado por MeuTreino Pro — Periodização e Biomecânica Baseada em Evidências.',
    margin,
    y + 14
  );

  const safeName = routine.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`meutreino-ficha-${routine.letter.toLowerCase()}-${safeName || 'treino'}.pdf`);
}

/**
 * Generates and downloads an elegant A4 PDF report for a completed workout session
 * (ideal for archiving progressive overload, PRs, and volume tonnage).
 */
export function exportCompletedSessionToPDF(
  session: WorkoutSessionSummary,
  athleteName = 'Atleta'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const formattedDate = new Date(session.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, 'F');

  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MEUTREINO PRO • RELATÓRIO DE SESSÃO CONCLUÍDA', margin + 5, y + 7);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(`${session.splitName}`, margin + 5, y + 15);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Atleta: ${athleteName}   |   Data: ${formattedDate}`,
    margin + 5,
    y + 22
  );
  doc.text(
    `Tonelagem Total: ${session.totalVolumeLoadKg.toLocaleString('pt-BR')} kg   |   Séries Efetivas: ${session.totalSets} séries   |   Exercícios: ${session.completedExercises.length}`,
    margin + 5,
    y + 27
  );

  y += 36;

  if (session.notes && session.notes.trim().length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Observações da Sessão:', margin + 4, y + 4.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(15, 23, 42);
    const cleanNotes = doc.splitTextToSize(session.notes.trim(), pageWidth - margin * 2 - 8);
    doc.text(cleanNotes[0] || '', margin + 4, y + 9.5);
    y += 16;
  }

  // ============================================================================
  // GRÁFICO DE VOLUME TOTAL DA SESSÃO (Tonelagem por Exercício em kg e %)
  // ============================================================================
  if (session.completedExercises.length > 0) {
    const exerciseVolumes = session.completedExercises.map((ex, i) => {
      const vol = ex.sets.reduce((acc, s) => acc + (s.weight || 0) * (s.reps || 0), 0);
      return {
        index: i + 1,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        setsCount: ex.sets.length,
        volumeKg: vol,
      };
    });

    const maxExVol = Math.max(...exerciseVolumes.map((e) => e.volumeKg), 1);
    const totalVol = Math.max(session.totalVolumeLoadKg, 1);
    const chartRowHeight = 7.5;
    const chartBoxHeight = 20 + exerciseVolumes.length * chartRowHeight;

    checkPageBreak(chartBoxHeight + 6);

    // Chart Container Box
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.roundedRect(margin, y, pageWidth - margin * 2, chartBoxHeight, 2.5, 2.5, 'FD');

    // Chart Title & Total Tonnage Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      'GRÁFICO DE VOLUME TOTAL DA SESSÃO (DISTRIBUIÇÃO DE TONELAGEM POR EXERCÍCIO)',
      margin + 4,
      y + 6.5
    );

    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text(
      `Volume Total: ${session.totalVolumeLoadKg.toLocaleString('pt-BR')} kg (100%)`,
      pageWidth - margin - 4,
      y + 6.5,
      { align: 'right' }
    );

    // Subtle divider line
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 4, y + 9.5, pageWidth - margin - 4, y + 9.5);

    let barY = y + 13;
    const labelStartX = margin + 4;
    const barStartX = margin + 68;
    const maxBarWidth = pageWidth - margin * 2 - 112;

    exerciseVolumes.forEach((item, idx) => {
      const ratio = Math.min(1, Math.max(0.04, item.volumeKg / maxExVol));
      const sharePct = Math.round((item.volumeKg / totalVol) * 100);
      const barWidth = Math.max(3, ratio * maxBarWidth);

      // Exercise Short Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      const truncatedName =
        item.name.length > 32 ? `${item.name.slice(0, 30)}...` : item.name;
      doc.text(`${item.index}. ${truncatedName}`, labelStartX, barY + 3.5);

      // Bar Track Background
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barStartX, barY, maxBarWidth, 4.5, 1.2, 1.2, 'F');

      // Filled Volume Bar (Alternating Emerald / Sky for visual clarity)
      if (idx % 2 === 0) {
        doc.setFillColor(16, 185, 129); // Emerald-500
      } else {
        doc.setFillColor(14, 165, 233); // Sky-500
      }
      doc.roundedRect(barStartX, barY, barWidth, 4.5, 1.2, 1.2, 'F');

      // Volume Value & Percentage Label on the right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `${item.volumeKg.toLocaleString('pt-BR')} kg (${sharePct}%)`,
        pageWidth - margin - 4,
        barY + 3.5,
        { align: 'right' }
      );

      barY += chartRowHeight;
    });

    y += chartBoxHeight + 6;
  }

  // Completed Exercises Breakdown
  session.completedExercises.forEach((ex, idx) => {
    const boxHeight = 14 + ex.sets.length * 6;
    checkPageBreak(boxHeight + 5);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${ex.name}`, margin + 4, y + 6);

    doc.setFontSize(8.5);
    doc.setTextColor(14, 116, 144);
    const exVol = ex.sets.reduce((acc, s) => acc + (s.weight || 0) * (s.reps || 0), 0);
    doc.text(
      `${ex.muscleGroup}  •  Volume: ${exVol.toLocaleString('pt-BR')} kg`,
      pageWidth - margin - 4,
      y + 6,
      { align: 'right' }
    );

    let setY = y + 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    ex.sets.forEach((s, sIdx) => {
      const est1RM = calculate1RM(s.weight.toString(), s.reps.toString(), s.rpe || s.rir);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 4, setY, pageWidth - margin - 4, setY);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `Série #${sIdx + 1}:   ${s.weight} kg  ×  ${s.reps} repetições`,
        margin + 6,
        setY + 4.2
      );
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Esforço: ${s.rpe ? `RPE ${s.rpe}` : 'RPE 8'} ${s.rir !== undefined ? `(RIR ${s.rir})` : ''}   |   1RM Est.: ~${est1RM || s.weight} kg   |   Vol: ${(s.weight * s.reps).toLocaleString('pt-BR')} kg`,
        pageWidth - margin - 6,
        setY + 4.2,
        { align: 'right' }
      );
      setY += 6;
    });

    y += boxHeight + 4;
  });

  // Footer
  checkPageBreak(12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Relatório oficial exportado pelo MeuTreino Pro — Histórico de Sobrecarga Progressiva.',
    margin,
    y + 6
  );

  const dateSlug = new Date(session.date).toISOString().slice(0, 10);
  doc.save(`meutreino-sessao-${dateSlug}.pdf`);
}
