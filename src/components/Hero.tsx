import React from 'react';
import { MapPin, ShieldCheck, Calendar, MessageCircle, Sparkles, QrCode, CreditCard } from 'lucide-react';

interface HeroProps {
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick }) => {
  return (
    <section className="relative pt-14 pb-20 overflow-hidden border-b border-white/5">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gold-500/15 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Teresina Location Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-onyx-850 border border-gold-500/30 text-gold-400 text-xs font-semibold uppercase tracking-widest mb-6 shadow-md">
          <MapPin className="w-3.5 h-3.5 text-gold-400" />
          Atendimento Domiciliar Exclusivo em Teresina - PI
        </div>

        {/* Hero Title */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-white font-normal max-w-4xl mx-auto leading-tight">
          A mais alta tecnologia estética entregue{' '}
          <span className="italic font-normal gold-gradient-text">
            na sua residência em Teresina
          </span>
        </h1>

        <p className="mt-6 text-neutral-300 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed">
          Evite o trânsito da Av. Raul Lopes, Frei Serafim e pontes da capital. Nossa equipe comparece ao seu endereço com maca cirúrgica portátil climatizada, maleta estéril e descartáveis hospitalares de uso único.
        </p>

        {/* Quick Payment Info Pill */}
        <div className="mt-5 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-onyx-900 border border-white/10 text-xs text-neutral-300">
          <span className="text-[#009EE3] font-bold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Mercado Pago Oficial:
          </span>
          <span className="flex items-center gap-1 text-gold-400">
            <QrCode className="w-3.5 h-3.5" /> PIX Instantâneo
          </span>
          <span className="text-neutral-500">•</span>
          <span className="flex items-center gap-1 text-neutral-200">
            <CreditCard className="w-3.5 h-3.5" /> Cartão até 12x
          </span>
        </div>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <button
            onClick={onExploreClick}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full gold-gradient-bg text-onyx-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Ver Procedimentos & Pacotes
          </button>
          <a
            href="#cobertura-teresina"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-onyx-850 hover:bg-onyx-800 border border-white/10 hover:border-gold-500/30 text-neutral-300 hover:text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-gold-400" /> Bairros em Teresina
          </a>
        </div>

        {/* Trust Pillars */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-3.5 rounded-2xl bg-onyx-900/80 border border-white/5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Toda Teresina</h4>
              <p className="text-[11px] text-neutral-400">Zona Leste, Sul, Sudeste e Norte</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-onyx-900/80 border border-white/5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Maleta Cirúrgica</h4>
              <p className="text-[11px] text-neutral-400">100% estéril e descartável</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-onyx-900/80 border border-white/5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Logística D+1</h4>
              <p className="text-[11px] text-neutral-400">Preparo individual sob demanda</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-onyx-900/80 border border-white/5 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">WhatsApp VIP THE</h4>
              <p className="text-[11px] text-neutral-400">Liberado pós-pagamento</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
