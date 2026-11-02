import React from 'react';
import { CheckSquare, Calendar, ShieldCheck, MessageCircle } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <section id="como-funciona" className="py-16 bg-onyx-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-gold-400 text-xs font-semibold uppercase tracking-widest">
            Experiência Sem Burocracia
          </span>
          <h3 className="font-serif text-3xl text-white mt-1">
            Como funciona a visita na sua casa em Teresina?
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-onyx-900 border border-white/5 relative">
            <span className="text-3xl font-serif text-gold-500/30 font-bold absolute top-4 right-4">
              01
            </span>
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center mb-4">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white font-semibold mb-2">
              Escolha o Procedimento
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Selecione no cardápio os tratamentos estéticos desejados para atendimento domiciliar.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-onyx-900 border border-white/5 relative">
            <span className="text-3xl font-serif text-gold-500/30 font-bold absolute top-4 right-4">
              02
            </span>
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white font-semibold mb-2">
              Marque Dia e Horário
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Agendamentos estritamente com antecedência mínima de 24h (D+1). Não realizamos atendimentos no mesmo dia.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-onyx-900 border border-white/5 relative">
            <span className="text-3xl font-serif text-gold-500/30 font-bold absolute top-4 right-4">
              03
            </span>
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white font-semibold mb-2">
              Mercado Pago Integrado
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Validação do CEP de Teresina e pagamento instantâneo via Mercado Pago (PIX com QR Code ou Cartão em até 12x).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-onyx-900 border border-white/5 relative">
            <span className="text-3xl font-serif text-gold-500/30 font-bold absolute top-4 right-4">
              04
            </span>
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white font-semibold mb-2">
              WhatsApp VIP Desbloqueado
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Após a confirmação, o WhatsApp direto de suporte é liberado para orientações e confirmação de condomínio/portaria.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
