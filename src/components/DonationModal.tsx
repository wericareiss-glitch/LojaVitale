/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Heart, 
  Copy, 
  Check, 
  X, 
  QrCode, 
  ShieldCheck,
  Lock
} from 'lucide-react';
import { getProtectedCreatorKey, getMaskedCreatorKey, getMaskedCreatorName } from '../utils/privacy';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  { value: '5', label: 'Café de Incentivo', icon: '☕', amount: 'R$ 5,00', desc: 'Um café expresso para manter o foco no código!' },
  { value: '15', label: 'Dose de Whey', icon: '🥤', amount: 'R$ 15,00', desc: 'Apoio para o pós-treino e servidores da plataforma.' },
  { value: '30', label: 'Apoiador Pro', icon: '⚡', amount: 'R$ 30,00', desc: 'Ajuda a financiar novas atualizações e recursos científicos.' },
  { value: '50', label: 'Patrocinador Elite', icon: '🏆', amount: 'R$ 50,00', desc: 'Incentivo máximo para a evolução contínua do app!' },
];

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState('15');

  if (!isOpen) return null;

  const handleCopyPix = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(getProtectedCreatorKey()).then(() => {
        setCopied(true);
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate([60, 40, 80]);
          } catch {}
        }
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1220] border border-slate-800 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden ring-1 ring-pink-500/20">
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-pink-500/15 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#0d1424]/90 flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Apoie o MeuTreino Pro 💖
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  PIX
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Incentive o desenvolvimento independente e a ciência do app
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="bg-[#070c18] border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
            <p className="text-slate-300 leading-relaxed">
              O <strong>MeuTreino Pro</strong> é um projeto independente, feito com dedicação para quem leva a hipertrofia e a periodização a sério.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Sua contribuição via PIX ajuda a cobrir custos de servidores, novas ferramentas de biomecânica e atualizações contínuas para a comunidade. Qualquer valor é imensamente bem-vindo!
            </p>
          </div>

          {/* Sugestões de Apoio */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Escolha uma sugestão ou doe qualquer valor:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => {
                const isSelected = selectedAmount === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSelectedAmount(s.value)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-pink-500/15 border-pink-500 text-white shadow-md shadow-pink-500/10 ring-1 ring-pink-500/30'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center gap-1.5">
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </span>
                      <span className="text-xs font-mono font-black text-pink-300">{s.amount}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{s.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caixa da Chave PIX */}
          <div className="bg-gradient-to-br from-[#12192c] to-[#0c1222] border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <QrCode className="w-4 h-4" />
                <span>Chave PIX Oficial (Protegida):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Destino: <strong className="text-white">{getMaskedCreatorName()}</strong>
              </span>
            </div>

            {/* Chave mascarada com botão de copiar */}
            <div className="bg-slate-950 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Chave Oculta por Segurança:</span>
                </span>
                <span className="font-mono font-black text-sm text-slate-200 select-none truncate block mt-0.5">
                  {getMaskedCreatorKey()}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyPix}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-md ${
                  copied
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar PIX</span>
                  </>
                )}
              </button>
            </div>

            {/* Instruções Rápidas */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Abra o app do seu banco, escolha <strong>Área PIX ➔ Transferir ➔ E-mail</strong> e cole a chave acima.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0d1424] flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 font-medium">
            Muito obrigado pelo seu apoio e confiança! 🙏
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
