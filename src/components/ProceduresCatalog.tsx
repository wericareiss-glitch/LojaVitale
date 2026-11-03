import React, { useState } from 'react';
import { Sparkles, Clock, Plus, Check, Tag, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Procedure, PackageType } from '../types';
import { PROCEDURES } from '../data/procedures';
import { calculatePackages, isAvaliacaoProcedure, isTestProcedure, isSinglePricingProcedure, isVideoCallProcedure } from '../utils/packages';

interface ProceduresCatalogProps {
  procedures?: Procedure[];
  onSelectProcedure: (procedure: Procedure, packageType?: PackageType) => void;
  onAddToCart: (procedure: Procedure, packageType?: PackageType) => void;
  cartItemIds: string[];
}

export const ProceduresCatalog: React.FC<ProceduresCatalogProps> = ({
  procedures = PROCEDURES,
  onSelectProcedure,
  onAddToCart,
  cartItemIds,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  // Store selected package per procedure id
  const [selectedPackages, setSelectedPackages] = useState<Record<string, PackageType>>({});
  // Store selected modality for Avaliação (Presencial R$100 vs Videochamada R$50)
  const [consultationModalities, setConsultationModalities] = useState<Record<string, 'presencial' | 'video'>>({});
  // Track recently added procedures for smooth confirmation animation
  const [justAddedMap, setJustAddedMap] = useState<Record<string, boolean>>({});

  const handleAddToCartWithAnim = (proc: Procedure, pkgType?: PackageType) => {
    onAddToCart(proc, pkgType);
    setJustAddedMap(prev => ({ ...prev, [proc.id]: true }));
    setTimeout(() => {
      setJustAddedMap(prev => ({ ...prev, [proc.id]: false }));
    }, 2000);
  };

  const filtered = activeCategory === 'todos' 
    ? procedures 
    : procedures.filter(p => p.category === activeCategory);

  const formatCurrency = (val: number) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSelectPackage = (procId: string, pkg: PackageType, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPackages(prev => ({ ...prev, [procId]: pkg }));
  };

  return (
    <main id="procedimentos" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
      
      {/* Header and Category Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-1.5 text-gold-400 text-xs font-semibold uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Atendimento Domiciliar em Teresina
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-white">
            Procedimentos
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Escolha sessão avulsa ou pacotes com <strong className="text-emerald-400">15% OFF (3 sessões)</strong> e <strong className="text-gold-400">25% OFF (5 sessões)</strong>
          </p>
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {[
            { id: 'todos', label: 'Todos os Procedimentos' },
            { id: 'injetaveis', label: 'Injetáveis & Enzimas' },
            { id: 'facial', label: 'Facial & Renovação Cutânea' },
            { id: 'corporal', label: 'Corporal & Drenagem' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? 'bg-gold-500 text-onyx-950 shadow-md font-bold'
                  : 'bg-onyx-850 hover:bg-onyx-800 text-neutral-300 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Procedures Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map(proc => {
          const isMainConsulta = proc.id === 'consulta-avaliacao';
          const isVideoOnly = proc.id === 'avaliacao-facial-video';
          const isConsulta = isAvaliacaoProcedure(proc);
          const isTest = isTestProcedure(proc);
          const isSinglePrice = isSinglePricingProcedure(proc);

          const evalModality = consultationModalities[proc.id] || 'presencial';
          const isCurrentVideo = isVideoOnly || (isMainConsulta && evalModality === 'video');

          const effectivePrice = (isMainConsulta && evalModality === 'video') ? 50 : proc.price;
          const currentPkgType = selectedPackages[proc.id] || 'single';
          const pkgs = calculatePackages(effectivePrice);
          const activePkg = pkgs[currentPkgType] || pkgs.single;

          // Target procedure when adding to cart or opening modal
          const effectiveProc: Procedure = (isMainConsulta && evalModality === 'video') ? {
            ...proc,
            id: 'avaliacao-facial-video',
            name: 'Avaliação Facial por Videochamada (Online)',
            price: 50,
            duration: '30 min',
            sessions: 'Consulta Online por Vídeo',
            image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=700&q=80',
            description: 'Consulta diagnóstica e anamnese personalizada ao vivo por videochamada (Google Meet ou WhatsApp Vídeo). Avaliação completa da sua pele com especialista sem sair de casa.',
            benefits: [
              'Consulta 100% online por vídeo com especialista',
              'Valor acessível de apenas R$ 50,00',
              'Análise das queixas dérmicas e indicação de tratamentos ideais',
              'Prescrição de rotina home care diária (sem taxa de deslocamento)'
            ]
          } : proc;

          // Check if item or specific package is in cart
          const itemKey = effectiveProc.id;
          const isInCart = cartItemIds.includes(itemKey) || cartItemIds.includes(proc.id);

          return (
            <div
              key={proc.id}
              className="group relative rounded-2xl bg-onyx-900 border border-white/5 hover:border-gold-500/40 p-4 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1"
            >
              <div>
                {/* Image */}
                <div className="relative w-full h-48 rounded-xl overflow-hidden mb-3 bg-onyx-850">
                  <img
                    src={effectiveProc.image}
                    alt={effectiveProc.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                    isTest
                      ? 'bg-blue-950/80 text-blue-400 border-blue-500/30'
                      : isCurrentVideo
                      ? 'bg-blue-950/80 text-blue-300 border-blue-400/40 flex items-center gap-1'
                      : 'bg-onyx-950/80 text-gold-400 border border-gold-500/30'
                  }`}>
                    {isCurrentVideo && <Video className="w-2.5 h-2.5" />}
                    {isTest ? 'Ambiente Real' : isCurrentVideo ? '100% Online (Vídeo)' : 'Domicílio em THE'}
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/70 backdrop-blur-sm text-neutral-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gold-400" /> {effectiveProc.duration}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-serif text-lg font-medium text-white mb-1.5 leading-snug line-clamp-2">
                  {effectiveProc.name}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
                  {effectiveProc.description}
                </p>

                {/* Pacotes / Modalidade Selector */}
                {isTest ? (
                  <div className="mb-3 p-2 rounded-xl bg-onyx-950 border border-blue-500/20 flex items-center justify-between text-[11px]">
                    <span className="text-blue-300 font-medium">Checkout de Teste</span>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded">
                      R$ 0,01
                    </span>
                  </div>
                ) : isMainConsulta ? (
                  <div className="mb-3 p-1 rounded-xl bg-onyx-950 border border-white/5 flex items-center justify-between gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setConsultationModalities(prev => ({ ...prev, [proc.id]: 'presencial' }))}
                      className={`flex-1 py-1.5 px-1.5 rounded-lg font-medium transition-all text-center ${
                        evalModality === 'presencial'
                          ? 'bg-gold-500 text-onyx-950 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Presencial (R$ 100)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsultationModalities(prev => ({ ...prev, [proc.id]: 'video' }))}
                      className={`flex-1 py-1.5 px-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
                        evalModality === 'video'
                          ? 'bg-blue-500 text-white font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Video className="w-3 h-3" />
                      Vídeo (R$ 50)
                    </button>
                  </div>
                ) : isVideoOnly ? (
                  <div className="mb-3 p-2 rounded-xl bg-onyx-950 border border-blue-500/20 flex items-center justify-between text-[11px]">
                    <span className="text-blue-300 font-medium flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-blue-400" /> Videochamada Online
                    </span>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded">
                      R$ 50,00
                    </span>
                  </div>
                ) : isConsulta ? (
                  <div className="mb-3 p-2 rounded-xl bg-onyx-950 border border-gold-500/20 flex items-center justify-between text-[11px]">
                    <span className="text-gold-300 font-medium">Diagnóstico Individualizado</span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">
                      Avaliação
                    </span>
                  </div>
                ) : (
                  <div className="mb-3 p-1 rounded-xl bg-onyx-950 border border-white/5 flex items-center justify-between gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={(e) => handleSelectPackage(proc.id, 'single', e)}
                      className={`flex-1 py-1 px-1 rounded-lg font-medium transition-all text-center ${
                        currentPkgType === 'single'
                          ? 'bg-onyx-800 text-white font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      1 Sessão
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSelectPackage(proc.id, 'package_3', e)}
                      className={`flex-1 py-1 px-1 rounded-lg font-medium transition-all text-center relative ${
                        currentPkgType === 'package_3'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      3 Sessões
                      <span className="block text-[8px] text-emerald-400 font-extrabold uppercase leading-none">
                        -15% OFF
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSelectPackage(proc.id, 'package_5', e)}
                      className={`flex-1 py-1 px-1 rounded-lg font-medium transition-all text-center relative ${
                        currentPkgType === 'package_5'
                          ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      5 Sessões
                      <span className="block text-[8px] text-gold-400 font-extrabold uppercase leading-none">
                        -25% OFF
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Price & Actions */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                        {isTest 
                          ? 'Valor Simbólico de Teste' 
                          : isCurrentVideo 
                          ? 'Consulta Online por Vídeo'
                          : isConsulta 
                          ? 'Valor da Avaliação' 
                          : currentPkgType === 'single' 
                          ? 'Valor da Sessão' 
                          : `${activePkg.title} (${activePkg.discountPercent}% OFF)`}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      {!isSinglePrice && currentPkgType !== 'single' && (
                        <span className="text-xs text-neutral-500 line-through">
                          {formatCurrency(activePkg.originalPrice)}
                        </span>
                      )}
                      <span className="text-lg font-bold text-gold-400 font-sans">
                        {formatCurrency(isSinglePrice ? effectivePrice : activePkg.finalPrice)}
                      </span>
                    </div>

                    {!isSinglePrice && currentPkgType !== 'single' && (
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {formatCurrency(activePkg.pricePerSession)} / visita • Economiza {formatCurrency(activePkg.savings)}
                      </span>
                    )}
                  </div>

                  {isTest ? (
                    <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded">
                      PIX / Cartão
                    </span>
                  ) : isCurrentVideo ? (
                    <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <Video className="w-2.5 h-2.5" /> Sem Frete
                    </span>
                  ) : isConsulta ? (
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                      Cortesia c/ outro
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400">
                      Kit estéril incluso
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSelectProcedure(effectiveProc, isSinglePrice ? 'single' : currentPkgType)}
                    className="py-2 px-3 rounded-xl bg-onyx-850 hover:bg-onyx-800 text-neutral-300 hover:text-white text-xs font-semibold border border-white/5 transition-colors"
                  >
                    Ver Detalhes
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => handleAddToCartWithAnim(effectiveProc, isSinglePrice ? 'single' : currentPkgType)}
                    className={`relative overflow-hidden py-2 px-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                      justAddedMap[effectiveProc.id] || justAddedMap[proc.id]
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-onyx-950 shadow-emerald-500/30 shadow-lg ring-1 ring-emerald-300'
                        : isInCart
                        ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 hover:bg-gold-500/30'
                        : 'gold-gradient-bg text-onyx-950 hover:brightness-110'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {justAddedMap[effectiveProc.id] || justAddedMap[proc.id] ? (
                        <motion.span
                          key="just-added"
                          initial={{ opacity: 0, scale: 0.6, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.7, y: -4 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                          className="flex items-center gap-1.5"
                        >
                          <motion.span
                            initial={{ rotate: -50, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ delay: 0.05, type: 'spring', stiffness: 600, damping: 20 }}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </motion.span>
                          <span>Adicionado!</span>
                        </motion.span>
                      ) : isInCart ? (
                        <motion.span
                          key="in-cart"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-gold-400" />
                          <span>No Carrinho</span>
                        </motion.span>
                      ) : (
                        <motion.span
                          key="default"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isCurrentVideo ? 'Agendar Vídeo' : isConsulta ? 'Agendar' : 'Agendar THE'}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Subtle pulse wave on addition */}
                    <AnimatePresence>
                      {(justAddedMap[effectiveProc.id] || justAddedMap[proc.id]) && (
                        <motion.span
                          key="ripple"
                          initial={{ scale: 0, opacity: 0.75 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          className="absolute inset-0 rounded-xl bg-white/50 pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </main>
  );
};
