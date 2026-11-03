import React from 'react';
import { MapPin, ShieldCheck, Calendar, MessageCircle, Sparkles, QrCode, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroProps {
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick }) => {
  return (
    <section className="relative pt-14 pb-20 overflow-hidden border-b border-white/5">
      {/* Background Ambient Glow */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.25 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gold-500/15 rounded-full blur-[140px]" />
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Teresina Location Pill */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-onyx-850 border border-gold-500/30 text-gold-400 text-xs font-semibold uppercase tracking-widest mb-6 shadow-md"
        >
          <MapPin className="w-3.5 h-3.5 text-gold-400" />
          Atendimento Domiciliar Exclusivo em Teresina - PI
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-4xl sm:text-5xl md:text-6xl text-white font-normal max-w-4xl mx-auto leading-tight"
        >
          A mais alta tecnologia estética entregue{' '}
          <span className="italic font-normal gold-gradient-text">
            na sua residência em Teresina
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.25, ease: 'easeOut' }}
          className="mt-6 text-neutral-300 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed"
        >
          Evite o trânsito da Av. Raul Lopes, Frei Serafim e pontes da capital. Nossa equipe comparece ao seu endereço com maca cirúrgica portátil climatizada, maleta estéril e descartáveis hospitalares de uso único.
        </motion.p>

        {/* Quick Payment Info Pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.35 }}
          className="mt-5 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-onyx-900 border border-white/10 text-xs text-neutral-300 shadow-sm"
        >
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
        </motion.div>

        {/* Primary CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto"
        >
          <motion.button
            whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onExploreClick}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full gold-gradient-bg text-onyx-950 font-bold text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Ver Procedimentos & Pacotes
          </motion.button>
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="#cobertura-teresina"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-onyx-850 hover:bg-onyx-800 border border-white/10 hover:border-gold-500/30 text-neutral-300 hover:text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-gold-400" /> Bairros em Teresina
          </motion.a>
        </motion.div>

        {/* Trust Pillars */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            {
              icon: MapPin,
              title: 'Toda Teresina',
              desc: 'Zona Leste, Sul, Sudeste e Norte'
            },
            {
              icon: ShieldCheck,
              title: 'Maleta Cirúrgica',
              desc: '100% estéril e descartável'
            },
            {
              icon: Calendar,
              title: 'Logística D+1',
              desc: 'Preparo individual sob demanda'
            },
            {
              icon: MessageCircle,
              title: 'WhatsApp VIP THE',
              desc: 'Liberado pós-pagamento'
            }
          ].map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * idx }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-3.5 rounded-2xl bg-onyx-900/80 border border-white/5 text-left flex items-center gap-3 hover:border-gold-500/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{pillar.title}</h4>
                  <p className="text-[11px] text-neutral-400">{pillar.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
