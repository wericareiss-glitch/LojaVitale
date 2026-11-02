import React from 'react';
import { Compass, Map } from 'lucide-react';

export const CoverageSection: React.FC = () => {
  return (
    <section id="cobertura-teresina" className="py-16 bg-onyx-900 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-gold-400 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Map className="w-3.5 h-3.5" /> Cobertura Geográfica
          </span>
          <h3 className="font-serif text-3xl text-white mt-1">
            Área de Atendimento Exclusiva em Teresina - PI
          </h3>
          <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
            Atendemos residências, condomínios fechados e flats com pontualidade em todas as regiões da capital piauiense:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Zona Leste */}
          <div className="p-5 rounded-2xl bg-onyx-850 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-gold-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" /> Zona Leste
            </div>
            <h4 className="text-sm font-semibold text-white">Polo Nobre & Empresarial</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Jóquei, Fátima, Ininga, Horto Florestal, São Cristóvão, Morada do Sol, Planalto Ininga e Ilhotas.
            </p>
          </div>

          {/* Zona Sul */}
          <div className="p-5 rounded-2xl bg-onyx-850 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-gold-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" /> Zona Sul & Centro
            </div>
            <h4 className="text-sm font-semibold text-white">Central & Tradicional</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Centro, Cabral, Por Enquanto, Vermelha, Pio XII, Cristo Rei, Três Andares e Lourival Parente.
            </p>
          </div>

          {/* Zona Sudeste */}
          <div className="p-5 rounded-2xl bg-onyx-850 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-gold-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" /> Sudeste / Grande Dirceu
            </div>
            <h4 className="text-sm font-semibold text-white">Eixo Sudeste</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Dirceu Arcoverde I e II, Itararé, Colorado, Parque Ideal, Parque Poti e São Sebastião.
            </p>
          </div>

          {/* Zona Norte */}
          <div className="p-5 rounded-2xl bg-onyx-850 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-gold-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" /> Zona Norte
            </div>
            <h4 className="text-sm font-semibold text-white">Eixo Norte</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Mocambinho, Buenos Aires, Primavera, Real Copagre, Marquês, Mafuá e Aeroporto.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
