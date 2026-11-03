import React from 'react';
import { Compass, Map } from 'lucide-react';
import { motion } from 'framer-motion';

export const CoverageSection: React.FC = () => {
  const zones = [
    {
      title: 'Zona Leste',
      sub: 'Polo Nobre & Empresarial',
      desc: 'Jóquei, Fátima, Ininga, Horto Florestal, São Cristóvão, Morada do Sol, Planalto Ininga e Ilhotas.'
    },
    {
      title: 'Zona Sul & Centro',
      sub: 'Central & Tradicional',
      desc: 'Centro, Cabral, Por Enquanto, Vermelha, Pio XII, Cristo Rei, Três Andares e Lourival Parente.'
    },
    {
      title: 'Sudeste / Grande Dirceu',
      sub: 'Eixo Sudeste',
      desc: 'Dirceu Arcoverde I e II, Itararé, Colorado, Parque Ideal, Parque Poti e São Sebastião.'
    },
    {
      title: 'Zona Norte',
      sub: 'Eixo Norte',
      desc: 'Mocambinho, Buenos Aires, Primavera, Real Copagre, Marquês, Mafuá e Aeroporto.'
    }
  ];

  return (
    <section id="cobertura-teresina" className="py-16 bg-onyx-900 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="text-gold-400 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Map className="w-3.5 h-3.5" /> Cobertura Geográfica
          </span>
          <h3 className="font-serif text-3xl text-white mt-1">
            Área de Atendimento Exclusiva em Teresina - PI
          </h3>
          <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
            Atendemos residências, condomínios fechados e flats com pontualidade em todas as regiões da capital piauiense:
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {zones.map((zone, idx) => (
            <motion.div
              key={zone.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: idx * 0.09, ease: [0.21, 0.47, 0.32, 0.98] }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="p-5 rounded-2xl bg-onyx-850 border border-white/5 hover:border-gold-500/30 space-y-2 transition-colors hover:shadow-xl hover:shadow-gold-500/5"
            >
              <div className="flex items-center gap-2 text-gold-400 font-bold text-xs uppercase tracking-wider">
                <Compass className="w-4 h-4" /> {zone.title}
              </div>
              <h4 className="text-sm font-semibold text-white">{zone.sub}</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {zone.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
