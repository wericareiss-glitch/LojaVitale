import React from 'react';
import { Sparkles, ShieldCheck, CreditCard, Zap, Lock } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="bg-onyx-950 border-t border-white/5 pt-12 pb-8 text-neutral-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full border border-gold-500/40 flex items-center justify-center bg-onyx-900">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            </div>
            <span className="font-serif text-lg tracking-widest text-white font-bold">
              VITALE
            </span>
          </div>
          <p className="leading-relaxed mb-3">
            Serviço Concierge de Estética Avançada e Injetáveis com atendimento 100% no domicílio do paciente em Teresina, Piauí.
          </p>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 bg-onyx-900 border border-white/5 px-2.5 py-1.5 rounded-lg">
            <Lock className="w-3 h-3 text-gold-400 shrink-0" />
            <span>WhatsApp VIP: Liberado após confirmação do procedimento</span>
          </div>
        </div>

        <div>
          <h5 className="text-white font-semibold uppercase tracking-wider mb-3">
            Área de Cobertura
          </h5>
          <p className="leading-relaxed">
            Teresina - PI (Zona Leste, Centro, Zona Sul, Grande Dirceu e Zona Norte).<br />
            Segunda a Sábado, das 08:30 às 18:30.
          </p>
          <p className="mt-2 text-gold-400 font-semibold">Horários de atendimento pontual</p>
        </div>

        <div>
          <h5 className="text-white font-semibold uppercase tracking-wider mb-3">
            Normas e Rigor Clínico
          </h5>
          <p className="leading-relaxed">
            Procedimentos realizados com kits cirúrgicos descartáveis de uso único e maleta térmica climatizada, seguindo rigorosas normas de biossegurança.
          </p>
        </div>

        <div>
          <h5 className="text-white font-semibold uppercase tracking-wider mb-3">
            Pagamentos Mercado Pago
          </h5>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-neutral-300">
              <ShieldCheck className="w-4 h-4 text-[#009EE3]" />
              <span>Ambiente Protegido Mercado Pago</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <Zap className="w-4 h-4 text-gold-400" />
              <span>PIX Instantâneo com QR Code</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Cartão de Crédito em até 12x</span>
            </div>

            <div className="pt-2">
              <PWAInstallButton variant="footer" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between text-neutral-600 gap-2">
        <p>© 2026 Vitale Concierge Estética Avançada Ltda. Atendimento Exclusivo a Domicílio em Teresina - PI.</p>
        {/* Único botão discreto para acesso ao painel de administração */}
        <button
          onClick={onOpenAdmin}
          className="text-[11px] text-neutral-600 hover:text-neutral-400 flex items-center gap-1 transition-colors cursor-pointer"
          title="Acesso da equipe / administração"
        >
          <Lock className="w-3 h-3" /> Acesso Administrativo
        </button>
      </div>
    </footer>
  );
};
