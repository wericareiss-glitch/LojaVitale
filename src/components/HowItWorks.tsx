import React from 'react';
import { CheckSquare, Calendar, ShieldCheck, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: CheckSquare,
      title: 'Escolha o Procedimento',
      desc: 'Selecione no cardápio os tratamentos estéticos desejados para atendimento domiciliar ou consulta online.'
    },
    {
      step: '02',
      icon: Calendar,
      title: 'Marque Dia e Horário',
      desc: 'Agendamentos estritamente com antecedência mínima de 24h (D+1). Não realizamos atendimentos no mesmo dia.'
    },
    {
      step: '03',
      icon: ShieldCheck,
      title: 'Mercado Pago Integrado',
      desc: 'Validação do CEP de Teresina e pagamento instantâneo via Mercado Pago (PIX com QR Code ou Cartão em até 12x).'
    },
    {
      step: '04',
      icon: MessageCircle,
      title: 'WhatsApp VIP Desbloqueado',
      desc: 'Após a confirmação, o WhatsApp direto de suporte é liberado para orientações e confirmação de condomínio/portaria.'
    }
  ];

  return (
    <section id="como-funciona" className="py-16 bg-onyx-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="text-gold-400 text-xs font-semibold uppercase tracking-widest">
            Experiência Sem Burocracia
          </span>
          <h3 className="font-serif text-3xl text-white mt-1">
            Como funciona a visita na sua casa em Teresina?
          </h3>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="p-6 rounded-2xl bg-onyx-900 border border-white/5 hover:border-gold-500/30 relative transition-colors hover:shadow-xl hover:shadow-gold-500/5 flex flex-col justify-between"
              >
                <span className="text-3xl font-serif text-gold-500/30 font-bold absolute top-4 right-4 select-none">
                  {item.step}
                </span>
                <div>
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif text-base text-white font-semibold mb-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
