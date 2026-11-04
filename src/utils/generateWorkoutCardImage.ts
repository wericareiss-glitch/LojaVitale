/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSessionSummary } from '../types/workout';

// Helper to draw rounded rectangle with cross-browser fallback
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

export interface WorkoutCardOptions {
  format?: 'story' | 'post';
  prsCount?: number;
  durationMinutes?: number;
}

/**
 * Generates a high-resolution, social-ready image card for the workout session.
 * Supports 9:16 Instagram Story (1080x1920) and Feed Post formats with Total Volume (kg),
 * PRs Broken, Workout Duration, and the MeuTreino PRO official badge.
 */
export async function generateWorkoutCardImage(
  session: WorkoutSessionSummary,
  athleteName: string,
  options: WorkoutCardOptions = {}
): Promise<{ blob: Blob; dataUrl: string; file: File }> {
  const format = options.format || 'story';
  const prsCount = options.prsCount ?? 0;
  const estimatedDuration =
    options.durationMinutes ||
    Math.max(25, Math.round(session.totalSets * 2.5));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  const width = 1080;

  // Calculate height dynamically based on format (1920px for 9:16 Story)
  const baseHeaderHeight = 460;
  const notesHeight = session.notes ? 90 : 0;
  const exerciseRowHeight = 96;
  const exerciseCount = Math.min(session.completedExercises.length, format === 'story' ? 9 : 8);
  const footerHeight = 160;
  const computedHeight = baseHeaderHeight + notesHeight + exerciseCount * exerciseRowHeight + footerHeight;
  const totalHeight = format === 'story' ? Math.max(1920, computedHeight) : Math.max(1080, computedHeight);

  canvas.width = width;
  canvas.height = totalHeight;

  // 1. Deep luxury athletic background
  const bgGradient = ctx.createLinearGradient(0, 0, width, totalHeight);
  bgGradient.addColorStop(0, '#070c18');
  bgGradient.addColorStop(0.5, '#04070f');
  bgGradient.addColorStop(1, '#000000');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, totalHeight);

  // Radial glow accents
  const glow1 = ctx.createRadialGradient(220, 180, 20, 220, 180, 520);
  glow1.addColorStop(0, 'rgba(16, 185, 129, 0.20)'); // emerald
  glow1.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, totalHeight);

  const glow2 = ctx.createRadialGradient(width - 180, 380, 20, width - 180, 380, 520);
  glow2.addColorStop(0, 'rgba(245, 158, 11, 0.16)'); // gold
  glow2.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, totalHeight);

  // Outer border frame
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, 28, 28, width - 56, totalHeight - 56, 42);
  ctx.stroke();

  // 2. Official MeuTreino PRO Seal Banner
  const brandY = 82;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
  drawRoundedRect(ctx, 64, brandY - 30, 310, 44, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'left';
  ctx.fillText('⚡ SELO MEUTREINO PRO', 84, brandY - 1);

  // Date on the right
  const dateFormatted = new Date(session.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText(`📅 ${dateFormatted}`, width - 64, brandY - 2);

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, brandY + 28);
  ctx.lineTo(width - 64, brandY + 28);
  ctx.stroke();

  // 3. Trophy & Athlete Headline
  const heroY = 150;

  // Split badge pill
  ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
  drawRoundedRect(ctx, 64, heroY, 210, 36, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText(`DIVISÃO: ${session.splitName}`, 64 + 105, heroY + 23);

  // Celebration Title
  ctx.textAlign = 'left';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  
  // Gold gradient for text
  const goldGrad = ctx.createLinearGradient(64, heroY + 80, 500, heroY + 80);
  goldGrad.addColorStop(0, '#fef08a');
  goldGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = goldGrad;
  ctx.fillText('🏆 TREINO CONCLUÍDO!', 64, heroY + 80);

  // Athlete name
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`Atleta: ${athleteName}`, 64, heroY + 118);

  // 4. Four Big KPI Blocks (Volume Movido, PRs Batidos, Duração do Treino, Séries/Carga)
  const kpiY = heroY + 150;
  const kpiWidth = (width - 128 - 42) / 4;
  const kpiHeight = 118;

  // Max load calculation
  let maxWeight = 0;
  session.completedExercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      if (s.weight > maxWeight) maxWeight = s.weight;
    });
  });

  const kpis = [
    {
      label: 'VOLUME MOVIDO',
      value: `${session.totalVolumeLoadKg.toLocaleString('pt-BR')} kg`,
      sub: 'Tonelagem Total',
      accent: '#10b981', // emerald
      bg: 'rgba(16, 185, 129, 0.10)',
      border: 'rgba(16, 185, 129, 0.32)',
    },
    {
      label: 'PRs BATIDOS',
      value: prsCount > 0 ? `${prsCount} PR${prsCount > 1 ? 's' : ''} 🔥` : `${session.totalSets} séries`,
      sub: prsCount > 0 ? 'Recordes Superados' : '100% Concluído',
      accent: '#f59e0b', // gold/amber
      bg: 'rgba(245, 158, 11, 0.10)',
      border: 'rgba(245, 158, 11, 0.35)',
    },
    {
      label: 'DURAÇÃO',
      value: `${estimatedDuration} min`,
      sub: 'Tempo de Sessão',
      accent: '#38bdf8', // sky
      bg: 'rgba(56, 189, 248, 0.10)',
      border: 'rgba(56, 189, 248, 0.32)',
    },
    {
      label: 'PICO / SÉRIES',
      value: maxWeight > 0 ? `${maxWeight} kg` : `${session.totalSets}x`,
      sub: `${session.totalSets} séries válidas`,
      accent: '#c084fc', // purple
      bg: 'rgba(192, 132, 252, 0.10)',
      border: 'rgba(192, 132, 252, 0.30)',
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kX = 64 + idx * (kpiWidth + 14);
    // Box
    ctx.fillStyle = kpi.bg;
    drawRoundedRect(ctx, kX, kpiY, kpiWidth, kpiHeight, 20);
    ctx.fill();
    ctx.strokeStyle = kpi.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(kpi.label, kX + 18, kpiY + 30);

    // Value
    ctx.font = '900 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = kpi.accent;
    ctx.fillText(kpi.value, kX + 18, kpiY + 68);

    // Sub
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(kpi.sub, kX + 18, kpiY + 94);
  });

  // 5. Session Notes (if present)
  let currentY = kpiY + kpiHeight + 32;
  if (session.notes) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.07)';
    drawRoundedRect(ctx, 64, currentY, width - 128, 68, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.textAlign = 'left';
    ctx.fillText('📝 NOTAS DA SESSÃO:', 88, currentY + 28);

    ctx.font = 'italic 500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    const noteText = session.notes.length > 95 ? session.notes.slice(0, 92) + '...' : session.notes;
    ctx.fillText(`"${noteText}"`, 88, currentY + 50);

    currentY += 88;
  }

  // 6. Exercises Highlights Section Header
  ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'left';
  ctx.fillText('📋 PERFORMANCE POR EXERCÍCIO & TOP SETS', 64, currentY);

  currentY += 20;

  // 7. Exercise Rows
  const maxExercises = Math.min(session.completedExercises.length, format === 'story' ? 9 : 8);
  for (let i = 0; i < maxExercises; i++) {
    const ex = session.completedExercises[i];
    const rowY = currentY + i * exerciseRowHeight;

    // Background card for exercise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    drawRoundedRect(ctx, 64, rowY, width - 128, 78, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Exercise Name & Muscle Group
    ctx.textAlign = 'left';
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    const truncatedName = ex.name.length > 32 ? ex.name.slice(0, 30) + '...' : ex.name;
    ctx.fillText(`${i + 1}. ${truncatedName}`, 86, rowY + 33);

    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${ex.muscleGroup} • ${ex.sets.length} séries`, 86, rowY + 57);

    // Find top set
    let topSet = ex.sets[0];
    ex.sets.forEach((s) => {
      if (s.weight > (topSet?.weight || 0)) topSet = s;
    });

    // Top Set Pill on the right
    if (topSet) {
      const pillWidth = 230;
      const pillX = width - 64 - pillWidth - 20;
      const pillY = rowY + 19;

      ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
      drawRoundedRect(ctx, pillX, pillY, pillWidth, 40, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.38)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`⭐ TOP: ${topSet.weight}kg × ${topSet.reps}`, pillX + pillWidth / 2, pillY + 25);
    }
  }

  // If there are more exercises than maxExercises, note it
  if (session.completedExercises.length > maxExercises) {
    const extra = session.completedExercises.length - maxExercises;
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(
      `+ ${extra} outro(s) exercício(s) concluído(s)`,
      width / 2,
      currentY + maxExercises * exerciseRowHeight + 16
    );
  }

  // 8. Official MeuTreino PRO Stamp & Footer Signature
  const footerY = totalHeight - 85;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  drawRoundedRect(ctx, width / 2 - 220, footerY - 34, 440, 48, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.40)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText('⚡ MEUTREINO PRO • ATLETA VERIFICADO', width / 2, footerY - 4);

  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Hipertrofia Individualizada • Sobrecarga Progressiva & Ciência', width / 2, footerY + 32);

  // Return Blob, File and DataURL
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Falha ao gerar imagem do treino no Canvas.'));
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const safeAthlete = athleteName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'atleta';
      const file = new File([blob], `meutreino_pro_${safeAthlete}_${Date.now()}.png`, {
        type: 'image/png',
      });
      resolve({ blob, dataUrl, file });
    }, 'image/png', 0.95);
  });
}
