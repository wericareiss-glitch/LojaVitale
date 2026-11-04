/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, HelpCircle, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export type TechnicalTermKey =
  | 'RPE'
  | 'RIR'
  | 'SERIES'
  | 'REPS'
  | '1RM'
  | '6RM'
  | 'SET_TYPES'
  | 'BISET'
  | 'PR';

interface TermMetadata {
  code: TechnicalTermKey;
  title: string;
  shortSubtitle: string;
  conciseExplanation: string;
  technicalFailureGuide: string;
  practicalExamples: string[];
  accentColor: string;
}

export const TECHNICAL_TERMS_DICTIONARY: Record<TechnicalTermKey, TermMetadata> = {
  RPE: {
    code: 'RPE',
    title: 'RPE (Percepção Subjetiva de Esforço · 6 a 10)',
    shortSubtitle: 'Mede o quão perto do limite você terminou a série',
    conciseExplanation:
      'Escala de 6 a 10 que traduz o esforço real da série. RPE 10 significa esforço máximo (0 repetições sobrando); RPE 8 significa que você parou com 2 repetições na reserva.',
    technicalFailureGuide:
      'Como sentir a Falha Técnica no RPE: A falha técnica acontece quando a velocidade de subida (concêntrica) cai drasticamente e você sente que, se tentar mais uma repetição, precisará "roubar" com o corpo ou desalinhar a articulação.',
    practicalExamples: [
      'RPE 8 (Ideal p/ maioria das séries): As últimas 2 reps ficam lentas, mas saem limpas.',
      'RPE 9 (Quase no limite): A barra quase para no meio do caminho; caberia só mais 1 rep.',
      'RPE 10 (Falha Técnica): Última repetição possível com postura 100% correta.',
    ],
    accentColor: 'text-sky-400 border-sky-500/40',
  },
  RIR: {
    code: 'RIR',
    title: 'RIR (Repetições na Reserva · 0 a 4)',
    shortSubtitle: 'Quantas repetições limpas ainda cabiam antes de travar',
    conciseExplanation:
      'Indica quantas repetições completas você ainda conseguiria fazer com boa postura antes de atingir a falha. É o inverso direto do RPE (RIR = 10 - RPE).',
    technicalFailureGuide:
      'Como identificar seu RIR real: Observe a perda involuntária de velocidade da carga. Quando o músculo começa a queimar intensamente e a subida demora o dobro da primeira repetição, você está a 1 ou 2 repetições da falha técnica (RIR 1–2).',
    practicalExamples: [
      'RIR 2: Movimento exige foco total, mas sem tremedeira ou perda de estabilidade.',
      'RIR 1: A repetição sobe "arrastada" — qualquer tentativa além da próxima falharia.',
      'RIR 0 (Falha Técnica): Você encerra porque uma próxima repetição encurtaria a amplitude.',
    ],
    accentColor: 'text-amber-400 border-amber-500/40',
  },
  SERIES: {
    code: 'SERIES',
    title: 'Séries (Sets de Trabalho)',
    shortSubtitle: 'Rodadas completas de um mesmo exercício',
    conciseExplanation:
      'Cada bloco de repetições seguido por um período de descanso. Exemplo: "3 séries" significa executar o exercício 3 vezes com pausa de recuperação entre elas.',
    technicalFailureGuide:
      'Como validar uma Série Efetiva: Para gerar hipertrofia, a série precisa terminar próxima da falha técnica (entre RIR 0 e RIR 3). Se a última repetição subiu na mesma velocidade da primeira, o peso está leve (série de aquecimento).',
    practicalExamples: [
      '1ª Série: Músculo descansado — controle a descida em 2 a 3 segundos.',
      'Última Série: Fadiga acumulada — mantenha a postura sem compensar com a lombar.',
    ],
    accentColor: 'text-emerald-400 border-emerald-500/40',
  },
  REPS: {
    code: 'REPS',
    title: 'Repetições (Reps)',
    shortSubtitle: 'Ciclos completos de movimento dentro de uma série',
    conciseExplanation:
      'Quantidade de vezes seguidas que você levanta (fase concêntrica) e desce (fase excêntrica) o peso antes de descansar.',
    technicalFailureGuide:
      'Falha Técnica vs. Repetição Parcial: Uma repetição só conta como completa quando atinge a mesma amplitude das primeiras. Quando você não consegue mais completar o curso todo sem impulso, atingiu a falha técnica.',
    practicalExamples: [
      'Faixa 6–8 reps: Maior foco em tensão mecânica e carga alta.',
      'Faixa 10–15 reps: Excelente controle articular e estresse metabólico.',
    ],
    accentColor: 'text-sky-400 border-sky-500/40',
  },
  '1RM': {
    code: '1RM',
    title: '1RM (Uma Repetição Máxima Estimada)',
    shortSubtitle: 'Carga máxima teórica para 1 única repetição perfeita',
    conciseExplanation:
      'Calculado automaticamente pelas fórmulas científicas de Epley/Brzycki com base no peso, repetições e RIR que você registrou na série.',
    technicalFailureGuide:
      'Segurança Articular: Você nunca precisa testar 1 repetição máxima real (o que traz risco de lesão). Basta treinar próximo da falha técnica (RIR 1 ou 2) na sua faixa normal de 6 a 12 reps para descobrir seu 1RM real.',
    practicalExamples: [
      'Ex: 80kg × 8 reps com RIR 2 projeta um 1RM estimado de ~107kg.',
      'Se seu 1RM estimado subiu ao longo das semanas, houve sobrecarga progressiva!',
    ],
    accentColor: 'text-purple-400 border-purple-500/40',
  },
  '6RM': {
    code: '6RM',
    title: '6RM (Seis Repetições Máximas Estimadas)',
    shortSubtitle: 'Peso estimado que levaria à falha técnica na 6ª repetição',
    conciseExplanation:
      'Mostra qual carga você aguentaria para fazer exatamente 6 repetições até o limite técnico (RIR 0). Ideal para calibrar séries pesadas de força e hipertrofia.',
    technicalFailureGuide:
      'Como usar na prática: Na carga de 6RM, a 4ª repetição já começa a pesar, a 5ª desacelera bastante e a 6ª é a última repetição possível sem roubar.',
    practicalExamples: [
      'Use o 6RM sugerido quando quiser fazer uma série mais pesada (Top Set) de 6 reps.',
    ],
    accentColor: 'text-amber-400 border-amber-500/40',
  },
  SET_TYPES: {
    code: 'SET_TYPES',
    title: 'Tipos de Série (W · T · F · D · RP)',
    shortSubtitle: 'Classificação biomecânica de intensidade da série',
    conciseExplanation:
      'Permite diferenciar séries preparatórias de séries principais e técnicas avançadas de intensificação.',
    technicalFailureGuide:
      'Como sentir o limite em técnicas avançadas: Em séries de Falha (F), Drop-set (D) ou Rest-Pause (RP), pare no exato segundo em que a técnica quebrar (ex: cotovelos abrindo demais ou coluna saindo do banco).',
    practicalExamples: [
      'W (Warm-up / Aquecimento): 50% a 70% da carga, longe da falha (RIR 4+).',
      'T (Trabalho): Série principal controlada (RIR 1 a 2).',
      'F (Falha): Série levada até RIR 0 com postura estrita.',
      'D (Drop-set): Atingiu a falha técnica ➔ reduza 20–30% do peso e faça mais reps imediatamente.',
      'RP (Rest-Pause): Atingiu a falha técnica ➔ respire 15s e faça +3 a 5 reps.',
    ],
    accentColor: 'text-rose-400 border-rose-500/40',
  },
  BISET: {
    code: 'BISET',
    title: 'Bi-set / Super-série',
    shortSubtitle: 'Dois exercícios realizados em sequência sem pausa entre eles',
    conciseExplanation:
      'Você executa a série do 1º exercício e vai imediatamente para o 2º exercício. O cronômetro de descanso só dispara após concluir o segundo.',
    technicalFailureGuide:
      'Controle de Fadiga: No 1º exercício do Bi-set, pare a 1 repetição da falha técnica (RIR 1) para manter o controle motor e não comprometer a postura no 2º exercício.',
    practicalExamples: [
      'Bi-set Agonista/Antagonista (ex: Peito + Costas): Economiza tempo mantendo alta carga.',
    ],
    accentColor: 'text-purple-400 border-purple-500/40',
  },
  PR: {
    code: 'PR',
    title: 'PR (Personal Record / Recorde Pessoal)',
    shortSubtitle: 'Maior marca histórica de peso ou 1RM naquele exercício',
    conciseExplanation:
      'Dispara automaticamente quando você supera o maior peso absoluto ou o maior 1RM estimado já registrado no seu histórico para o exercício.',
    technicalFailureGuide:
      'Regra de Ouro do PR Limpo: Um novo recorde só é verdadeiro se a amplitude (descer tudo) e o controle excêntrico forem iguais aos treinos anteriores — nunca sacrifique a postura por anilhas extras.',
    practicalExamples: [
      'PR de Carga: Subiu de 60kg para 62.5kg mantendo a mesma faixa de repetições.',
      'PR de Repetições/1RM: Manteve 60kg, mas subiu de 8 para 10 repetições limpas!',
    ],
    accentColor: 'text-amber-400 border-amber-500/40',
  },
};

interface SmartTermTooltipProps {
  term: TechnicalTermKey;
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  align?: 'left' | 'center' | 'right';
}

export const SmartTermTooltip: React.FC<SmartTermTooltipProps> = ({
  term,
  children,
  className = '',
  showIcon = true,
  align = 'center',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const meta = TECHNICAL_TERMS_DICTIONARY[term];

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  if (!meta) return <>{children}</>;

  const alignClasses =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center group/smartterm ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-1 cursor-pointer focus:outline-none decoration-dotted underline-offset-2 hover:underline"
        aria-label={`Explicação sobre ${meta.title}`}
      >
        {children || <span>{meta.code}</span>}
        {showIcon && (
          <HelpCircle className="w-3 h-3 text-sky-400/80 group-hover/smartterm:text-sky-300 transition-colors shrink-0" />
        )}
      </button>

      {/* Popover Inteligente (Hover no Desktop ou Toque no Mobile) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-full mb-2 ${alignClasses} z-50 w-72 sm:w-80 p-3.5 rounded-2xl bg-[#070c18] border ${meta.accentColor} shadow-2xl text-left animate-fadeIn space-y-2`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <h4 className="text-xs font-black text-white leading-tight">
                  {meta.title}
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                {meta.shortSubtitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Fechar explicação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Explicação Concisa */}
          <p className="text-[11px] text-slate-200 leading-relaxed">
            {meta.conciseExplanation}
          </p>

          {/* Como sentir a Falha Técnica */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
              <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Como Sentir a Falha Técnica:</span>
            </div>
            <p className="text-[10.5px] text-amber-100/90 leading-relaxed">
              {meta.technicalFailureGuide}
            </p>
          </div>

          {/* Exemplos Práticos */}
          <div className="space-y-1 pt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Exemplos na Prática:
            </span>
            {meta.practicalExamples.map((exText, idx) => (
              <div
                key={idx}
                className="flex items-start gap-1.5 text-[10.5px] text-slate-300 leading-snug"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span>{exText}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
};
