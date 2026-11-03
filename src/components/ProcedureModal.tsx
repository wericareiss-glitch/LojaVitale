import React, { useState } from 'react';
import { X, Check, CalendarPlus, Sparkles, Tag, ShieldCheck, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Procedure, PackageType } from '../types';
import { calculatePackages, isAvaliacaoProcedure, isTestProcedure, isSinglePricingProcedure, isVideoCallProcedure } from '../utils/packages';

interface ProcedureModalProps {
  procedure: Procedure | null;
  onClose: () => void;
  onAddToCart: (procedure: Procedure, packageType?: PackageType) => void;
}

export const ProcedureModal: React.FC<ProcedureModalProps> = ({
  procedure,
  onClose,
  onAddToCart,
}) => {
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('single');
  const [isJustAdded, setIsJustAdded] = useState(false);
  const [evalModality, setEvalModality] = useState<'presencial' | 'video'>(() => {
    if (procedure?.id === 'avaliacao-facial-video') return 'video';
    return 'presencial';
  });

  if (!procedure) return null;

  const isConsulta = isAvaliacaoProcedure(procedure);
  const isVideoDirect = isVideoCallProcedure(procedure);
  const isVideo = isVideoDirect || (isConsulta && evalModality === 'video');
  const isTest = isTestProcedure(procedure);
  const isSinglePrice = isSinglePricingProcedure(procedure);

  const effectivePrice = isVideo ? 50 : procedure.price;
  const packages = calculatePackages(effectivePrice);
  const currentPkg = packages[selectedPackage] || packages.single;

  const effectiveProc: Procedure = isVideo ? {
    ...procedure,
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
  } : isConsulta ? {
    ...procedure,
    id: 'consulta-avaliacao',
    name: 'Avaliação Facial & Corporal (Presencial)',
    price: 100,
    duration: '45 min',
    sessions: 'Atendimento Presencial Domiciliar',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80',
    description: 'Descubra o tratamento ideal para sua pele e seu corpo no conforto da sua casa. Avaliamos suas necessidades e montamos seu protocolo. (Grátis ao fechar outro procedimento!)',
    benefits: [
      'Atendimento com hora marcada na sua residência em Teresina',
      'Indicação precisa do melhor tratamento para você',
      'Maca confortável e descartáveis hospitalares inclusos',
      'O valor de R$ 100 vira desconto no seu carrinho ao agendar outro serviço'
    ]
  } : procedure;

  const handleAddToCartModal = () => {
    setIsJustAdded(true);
    onAddToCart(effectiveProc, isSinglePrice ? 'single' : selectedPackage);
    setTimeout(() => {
      setIsJustAdded(false);
      onClose();
    }, 850);
  };

  const formatCurrency = (val: number) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-onyx-900 border border-gold-500/30 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white w-8 h-8 rounded-full bg-onyx-850 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-4">
          <div className="relative h-52 rounded-xl overflow-hidden">
            <img
              src={effectiveProc.image}
              alt={effectiveProc.name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80';
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-onyx-950 via-transparent to-transparent" />
            <span className={`absolute bottom-3 left-3 text-xs font-bold px-3 py-1 rounded-full border backdrop-blur-md ${
              isTest
                ? 'text-blue-400 bg-blue-950/90 border-blue-500/30'
                : isVideo
                ? 'text-blue-300 bg-blue-950/90 border-blue-400/40 flex items-center gap-1.5'
                : 'text-gold-400 bg-onyx-900/90 border-gold-500/30'
            }`}>
              {isVideo && <Video className="w-3 h-3" />}
              {isTest ? 'AMBIENTE DE TESTE REAL' : isVideo ? 'CONSULTA ONLINE POR VIDEOCHAMADA' : 'ATENDIMENTO A DOMICÍLIO EM TERESINA'}
            </span>
          </div>

          <div>
            <h3 className="font-serif text-2xl text-white">{effectiveProc.name}</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Duração média: <span className="text-neutral-200 font-semibold">{effectiveProc.duration}</span>
              {!isConsulta && (
                <> | Protocolo: <span className="text-neutral-200 font-semibold">{effectiveProc.sessions}</span></>
              )}
            </p>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            {effectiveProc.description}
          </p>

          {/* Pacotes Promocionais: Ocultado para Avaliação e Teste */}
          {isTest ? (
            <div className="p-4 rounded-xl bg-onyx-850 border border-blue-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Procedimento de Teste Real</span>
                <span className="text-[11px] text-neutral-400">Validação segura do checkout PIX e Cartão no Mercado Pago</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-blue-400 block">{formatCurrency(procedure.price)}</span>
                <span className="text-[10px] text-blue-300 font-semibold">Cobrança de R$ 0,01</span>
              </div>
            </div>
          ) : isConsulta ? (
            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Escolha a Modalidade da Avaliação
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção 1: Presencial a Domicílio */}
                <button
                  type="button"
                  onClick={() => setEvalModality('presencial')}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    evalModality === 'presencial'
                      ? 'border-gold-500 bg-gold-500/15 shadow-md ring-1 ring-gold-500/50'
                      : 'border-white/10 bg-onyx-850 hover:border-gold-500/30 text-neutral-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Presencial a Domicílio</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Em Teresina
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed mb-2">
                      Anamnese completa com especialista, kit descartável hospitalar e maca no seu domicílio.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-baseline justify-between">
                    <span className="text-base font-extrabold text-gold-400 font-sans">
                      {formatCurrency(100)}
                    </span>
                    <span className="text-[9px] text-neutral-400">Cortesia c/ outro serviço</span>
                  </div>
                </button>

                {/* Opção 2: Videochamada Online */}
                <button
                  type="button"
                  onClick={() => setEvalModality('video')}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    evalModality === 'video'
                      ? 'border-blue-500 bg-blue-500/15 shadow-md ring-1 ring-blue-500/50'
                      : 'border-white/10 bg-onyx-850 hover:border-blue-500/30 text-neutral-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-blue-400" /> Videochamada Online
                      </span>
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                        100% Online
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed mb-2">
                      Consulta ao vivo pelo Google Meet ou WhatsApp Vídeo. Análise da pele e prescrição home care.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-baseline justify-between">
                    <span className="text-base font-extrabold text-blue-400 font-sans">
                      {formatCurrency(50)}
                    </span>
                    <span className="text-[9px] text-blue-300">Sem frete</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Escolha o Pacote de Tratamento
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                  Economize até 25% OFF
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Opção 1: Avulsa */}
                <button
                  type="button"
                  onClick={() => setSelectedPackage('single')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    selectedPackage === 'single'
                      ? 'border-gold-500 bg-gold-500/15 shadow-md ring-1 ring-gold-500/50'
                      : 'border-white/10 bg-onyx-850 hover:border-gold-500/30 text-neutral-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">1 Sessão</span>
                      {selectedPackage === 'single' && <Check className="w-3.5 h-3.5 text-gold-400 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] text-neutral-400 block mb-2">Avulsa pontual</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {formatCurrency(packages.single.finalPrice)}
                    </span>
                    <span className="text-[9px] text-neutral-400">Kit estéril incluso</span>
                  </div>
                </button>

                {/* Opção 2: Pacote 3 Sessões (-20% OFF) */}
                <button
                  type="button"
                  onClick={() => setSelectedPackage('package_3')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    selectedPackage === 'package_3'
                      ? 'border-gold-500 bg-gold-500/15 shadow-md ring-1 ring-gold-500/50'
                      : 'border-white/10 bg-onyx-850 hover:border-gold-500/30 text-neutral-300'
                  }`}
                >
                  <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500 text-onyx-950 uppercase tracking-tighter shadow">
                    15% OFF
                  </span>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">3 Sessões</span>
                      {selectedPackage === 'package_3' && <Check className="w-3.5 h-3.5 text-gold-400 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold block mb-2">
                      Economiza {formatCurrency(packages.package_3.savings)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 line-through block">
                      {formatCurrency(packages.package_3.originalPrice)}
                    </span>
                    <span className="text-sm font-extrabold text-gold-400 block">
                      {formatCurrency(packages.package_3.finalPrice)}
                    </span>
                    <span className="text-[9px] text-neutral-300 font-medium">
                      {formatCurrency(packages.package_3.pricePerSession)} / sessão
                    </span>
                  </div>
                </button>

                {/* Opção 3: Pacote 5 Sessões (-25% OFF) */}
                <button
                  type="button"
                  onClick={() => setSelectedPackage('package_5')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    selectedPackage === 'package_5'
                      ? 'border-gold-500 bg-gold-500/15 shadow-md ring-1 ring-gold-500/50'
                      : 'border-white/10 bg-onyx-850 hover:border-gold-500/30 text-neutral-300'
                  }`}
                >
                  <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-gold-500 text-onyx-950 uppercase tracking-tighter shadow">
                    25% OFF
                  </span>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">5 Sessões</span>
                      {selectedPackage === 'package_5' && <Check className="w-3.5 h-3.5 text-gold-400 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] text-gold-400 font-semibold block mb-2">
                      Economiza {formatCurrency(packages.package_5.savings)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 line-through block">
                      {formatCurrency(packages.package_5.originalPrice)}
                    </span>
                    <span className="text-sm font-extrabold text-gold-400 block">
                      {formatCurrency(packages.package_5.finalPrice)}
                    </span>
                    <span className="text-[9px] text-neutral-300 font-medium">
                      {formatCurrency(packages.package_5.pricePerSession)} / sessão
                    </span>
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-neutral-400 italic pt-1">
                {currentPkg.description}
              </p>
            </div>
          )}

          <div className="bg-onyx-850 p-4 rounded-xl border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 mb-2">
              Diferenciais e Benefícios Inclusos
            </h4>
            <ul className="space-y-1.5 text-xs text-neutral-300">
              {effectiveProc.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div>
              <span className="text-[11px] text-neutral-400 block">
                {isTest ? 'Valor Simbólico de Teste' : isVideo ? 'Consulta Online por Vídeo' : isConsulta ? 'Valor da Avaliação' : selectedPackage === 'single' ? 'Valor da Sessão Avulsa' : `${currentPkg.title} (${currentPkg.discountPercent}% OFF)`}
              </span>
              <div className="flex items-baseline gap-2">
                {!isSinglePrice && selectedPackage !== 'single' && (
                  <span className="text-xs text-neutral-500 line-through font-mono">
                    {formatCurrency(currentPkg.originalPrice)}
                  </span>
                )}
                <span className={`text-2xl font-bold font-sans ${isVideo ? 'text-blue-400' : 'text-gold-400'}`}>
                  {formatCurrency(isSinglePrice ? effectivePrice : currentPkg.finalPrice)}
                </span>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={handleAddToCartModal}
              className={`relative overflow-hidden py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                isJustAdded
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-onyx-950 shadow-emerald-500/30 ring-2 ring-emerald-300'
                  : 'gold-gradient-bg text-onyx-950 hover:brightness-110 active:scale-95'
              }`}
            >
              <AnimatePresence mode="wait">
                {isJustAdded ? (
                  <motion.span
                    key="modal-just-added"
                    initial={{ opacity: 0, scale: 0.6, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    className="flex items-center gap-2"
                  >
                    <motion.span
                      initial={{ rotate: -50, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 0.05, type: 'spring', stiffness: 600, damping: 20 }}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </motion.span>
                    <span>Adicionado com Sucesso!</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="modal-default"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <CalendarPlus className="w-4 h-4" /> 
                    <span>
                      {isTest 
                        ? 'Adicionar Teste (R$ 0,01)' 
                        : isVideo 
                        ? 'Agendar Videochamada (R$ 50)' 
                        : isConsulta 
                        ? 'Agendar Avaliação Presencial (R$ 100)' 
                        : selectedPackage === 'single' 
                        ? 'Agendar em Casa' 
                        : `Agendar ${currentPkg.title}`}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Expanding ripple on addition */}
              <AnimatePresence>
                {isJustAdded && (
                  <motion.span
                    key="modal-ripple"
                    initial={{ scale: 0, opacity: 0.75 }}
                    animate={{ scale: 3, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-xl bg-white/50 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
