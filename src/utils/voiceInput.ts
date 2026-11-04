/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedVoiceSetCommand {
  weight?: string;
  reps?: string;
  rpe?: number;
  completeSet?: boolean;
  rawTranscript: string;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

const PORTUGUESE_WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
};

function normalizeSpokenPortugueseNumbers(input: string): string {
  let text = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');

  // Re-apply common accented words before stripping or handle unaccented equivalents
  text = input.toLowerCase();

  // Convert "X e meio" or "X vírgula 5" -> "X.5"
  text = text.replace(/(\d+)\s*(?:,|vírgula|virgula|ponto)\s*(\d+)/gi, '$1.$2');
  text = text.replace(/(\d+)\s+e\s+meio/gi, '$1.5');

  // Replace compound tens + units like "oitenta e cinco" -> "85"
  const tensWords = ['vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa', 'cento'];
  const unitWords = ['um', 'uma', 'dois', 'duas', 'tres', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];

  for (const tenW of tensWords) {
    for (const unitW of unitWords) {
      const reg = new RegExp(`\\b${tenW}\\s+e\\s+${unitW}\\b`, 'gi');
      const val = (PORTUGUESE_WORD_NUMBERS[tenW] || 0) + (PORTUGUESE_WORD_NUMBERS[unitW] || 0);
      text = text.replace(reg, String(val));
    }
  }

  // Replace standalone number words
  for (const [word, num] of Object.entries(PORTUGUESE_WORD_NUMBERS)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    text = text.replace(reg, String(num));
  }

  // Again handle "80 e meio" if "oitenta" was converted to 80
  text = text.replace(/(\d+)\s+e\s+meio/gi, '$1.5');

  return text;
}

/**
 * Interpreta comandos de voz em português para preenchimento rápido de série:
 * Exemplos suportados:
 * - "80 quilos 10 repetições rpe 8"
 * - "80 por 10" / "80 x 10"
 * - "100 kg 8 reps rir 2"
 * - "62 e meio 12 repetições concluir"
 */
export function parseVoiceWorkoutCommand(rawTranscript: string): ParsedVoiceSetCommand {
  const normalized = normalizeSpokenPortugueseNumbers(rawTranscript);
  const result: ParsedVoiceSetCommand = {
    rawTranscript: rawTranscript.trim(),
  };

  // Detecta comando de conclusão ("concluir", "concluído", "feito", "pronto", "finalizar")
  if (/\b(concluir|concluido|concluído|feito|finalizar|pronto)\b/i.test(normalized)) {
    result.completeSet = true;
  }

  // 1. Extrai RPE explícito ("rpe 8", "esforço 9", "nota 8")
  let cleanedForWeightReps = normalized;
  const rpeMatch = cleanedForWeightReps.match(/\b(?:rpe|esforco|esforço|nota)\s*(?:de\s*)?(\d+(?:\.\d+)?)/i);
  if (rpeMatch) {
    const parsedRpe = Math.round(parseFloat(rpeMatch[1]));
    if (parsedRpe >= 6 && parsedRpe <= 10) {
      result.rpe = parsedRpe;
    }
    cleanedForWeightReps = cleanedForWeightReps.replace(rpeMatch[0], ' ');
  }

  // 2. Extrai RIR explícito ("rir 2", "reserva 1", "sobraram 2") e converte para RPE (10 - RIR)
  const rirMatch = cleanedForWeightReps.match(/\b(?:rir|reserva|sobrando|sobraram|sobrou)\s*(?:de\s*)?(\d+)/i);
  if (rirMatch) {
    const parsedRir = Math.min(4, Math.max(0, parseInt(rirMatch[1], 10)));
    result.rpe = 10 - parsedRir;
    cleanedForWeightReps = cleanedForWeightReps.replace(rirMatch[0], ' ');
  }

  // 3. Procura padrão explícito de carga: "80 kg", "80 quilos", "peso 80"
  const weightExplicit =
    cleanedForWeightReps.match(/(\d+(?:\.\d+)?)\s*(?:kg|quilos|quilo|kilos|kilo)\b/i) ||
    cleanedForWeightReps.match(/\b(?:peso|carga)\s*(?:de\s*)?(\d+(?:\.\d+)?)/i);

  if (weightExplicit) {
    result.weight = weightExplicit[1];
    cleanedForWeightReps = cleanedForWeightReps.replace(weightExplicit[0], ' ');
  }

  // 4. Procura padrão explícito de repetições: "10 repetições", "10 reps", "10 movimentos"
  const repsExplicit =
    cleanedForWeightReps.match(/(\d+)\s*(?:repeticoes|repetições|repeticao|repetição|reps|rep|movimentos|vezes)\b/i) ||
    cleanedForWeightReps.match(/\b(?:repeticoes|repetições|reps)\s*(?:de\s*)?(\d+)/i);

  if (repsExplicit) {
    result.reps = String(parseInt(repsExplicit[1], 10));
    cleanedForWeightReps = cleanedForWeightReps.replace(repsExplicit[0], ' ');
  }

  // 5. Padrão curto "80 por 10" ou "80 x 10"
  if (!result.weight || !result.reps) {
    const byPattern = cleanedForWeightReps.match(/(\d+(?:\.\d+)?)\s*(?:por|x|vezes)\s*(\d+)/i);
    if (byPattern) {
      if (!result.weight) result.weight = byPattern[1];
      if (!result.reps) result.reps = String(parseInt(byPattern[2], 10));
      cleanedForWeightReps = cleanedForWeightReps.replace(byPattern[0], ' ');
    }
  }

  // 6. Fallback: se ainda faltam weight ou reps, coleta os números restantes na ordem falada
  const remainingNumbers = Array.from(cleanedForWeightReps.matchAll(/\b(\d+(?:\.\d+)?)\b/g)).map((m) => m[1]);
  if (!result.weight && remainingNumbers.length > 0) {
    result.weight = remainingNumbers.shift();
  }
  if (!result.reps && remainingNumbers.length > 0) {
    const nextNum = parseInt(remainingNumbers.shift()!, 10);
    if (!isNaN(nextNum) && nextNum > 0) {
      result.reps = String(nextNum);
    }
  }
  if (!result.rpe && remainingNumbers.length > 0) {
    const maybeRpe = Math.round(parseFloat(remainingNumbers[0]));
    if (maybeRpe >= 6 && maybeRpe <= 10) {
      result.rpe = maybeRpe;
    }
  }

  return result;
}

export function isWebSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createSpeechRecognizer(options: {
  onInterimResult?: (transcript: string) => void;
  onFinalResult: (parsed: ParsedVoiceSetCommand) => void;
  onError?: (errorMsg: string) => void;
  onEnd?: () => void;
}): SpeechRecognitionLike | null {
  if (!isWebSpeechSupported()) return null;

  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const SpeechConstructor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SpeechConstructor) return null;

  const recognition = new SpeechConstructor();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let latestTranscript = '';
  let deliveredFinal = false;

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    let interimText = '';
    let finalText = '';

    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      const chunk = res[0]?.transcript || '';
      if (res.isFinal) {
        finalText += chunk + ' ';
      } else {
        interimText += chunk + ' ';
      }
    }

    const combined = (finalText || interimText).trim();
    if (combined) {
      latestTranscript = combined;
      options.onInterimResult?.(combined);
    }

    if (finalText.trim() && !deliveredFinal) {
      deliveredFinal = true;
      options.onFinalResult(parseVoiceWorkoutCommand(finalText.trim()));
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
    const code = event?.error || 'unknown';
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      options.onError?.('Permissão de microfone negada no navegador.');
    } else if (code === 'no-speech') {
      options.onError?.('Nenhuma fala detectada. Tente falar ex: "80 quilos 10 reps".');
    } else {
      options.onError?.('Não foi possível capturar o áudio. Tente novamente.');
    }
  };

  recognition.onend = () => {
    if (!deliveredFinal && latestTranscript.trim()) {
      deliveredFinal = true;
      options.onFinalResult(parseVoiceWorkoutCommand(latestTranscript.trim()));
    }
    options.onEnd?.();
  };

  return recognition;
}
