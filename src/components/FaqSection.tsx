import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'A Vitale atende apenas em Teresina - PI?',
      a: 'Sim. A nossa estrutura logística de maletas estéreis, acondicionamento térmico sob temperatura controlada e maca portátil opera exclusivamente no perímetro urbano de Teresina (Zona Leste, Centro, Zona Sul, Grande Dirceu e Zona Norte). Cidades vizinhas como Timon não estão cobertas nesta fase.',
    },
    {
      q: 'Por que não é permitido agendar para o mesmo dia?',
      a: 'Padrão inegociável de biossegurança: as vitaminas e mesclas de enzimas são fracionadas e preparadas sob demanda estéril em farmácia magistral, e a maleta cirúrgica descartável é montada especificamente para o seu protocolo. O prazo de D+1 (a partir de amanhã) é mandatório.',
    },
    {
      q: 'Como funciona o pagamento via Mercado Pago (PIX e Cartão)?',
      a: 'A Vitale integra a API oficial do Mercado Pago. Para pagamentos via PIX, o QR Code e a chave Copia e Cola são gerados instantaneamente com verificação automática do banco. Para cartão de crédito, você pode parcelar em até 12x com confirmação imediata e criptografia de ponta a ponta.',
    },
    {
      q: 'Como funciona a dedução cortesia da Consulta?',
      a: 'A Consulta e Avaliação Individualizada custa R$ 100,00 e inclui anamnese dérmica e prescrição. Caso você adicione qualquer outro procedimento no mesmo agendamento em Teresina, o sistema concede uma cortesia automática de R$ 100,00 no carrinho.',
    },
    {
      q: 'Quando o WhatsApp da clínica é liberado?',
      a: 'O botão VIP do WhatsApp (com DDD 86 de Teresina) é desbloqueado automaticamente na tela final assim que o pagamento via PIX ou Cartão de Crédito é confirmado pelo Mercado Pago.',
    },
  ];

  return (
    <section id="faq" className="py-16 bg-onyx-900/60 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="text-gold-400 text-xs font-semibold uppercase tracking-widest">
            Teresina - PI
          </span>
          <h3 className="font-serif text-3xl text-white mt-1">Dúvidas Frequentes</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-onyx-850 p-4 rounded-2xl border border-white/5 transition-all cursor-pointer"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <div className="flex justify-between items-center text-sm font-semibold text-white">
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gold-400 transition-transform duration-200 ${
                    openIndex === idx ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {openIndex === idx && (
                <p className="mt-3 text-xs text-neutral-400 leading-relaxed border-t border-white/5 pt-3 animate-in fade-in duration-200">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
