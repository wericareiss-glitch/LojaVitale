import React from 'react';
import { Sparkles, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  cartTotal,
  onOpenCart,
}) => {
  const formatCurrency = (val: number) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <>
      {/* Top Banner Teresina */}
      <div className="bg-gradient-to-r from-onyx-900 via-onyx-850 to-onyx-900 border-b border-gold-500/25 py-2 px-4 text-center text-xs tracking-wider text-neutral-300">
        <span className="inline-flex items-center gap-2 flex-wrap justify-center">
          <span className="inline-block w-2 h-2 rounded-full bg-gold-400 animate-ping" />
          <span className="text-gold-400 font-bold uppercase tracking-widest text-[11px]">
            Exclusivo em Teresina - PI:
          </span>
          Atendimento domiciliar em toda a capital • Pagamento seguro via Mercado Pago (PIX e Cartão até 12x)
        </span>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-onyx-950/90 backdrop-blur-md border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full border border-gold-500/40 flex items-center justify-center bg-onyx-900 group-hover:border-gold-400 transition-colors shadow-lg">
              <Sparkles className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <span className="font-serif text-2xl tracking-[0.2em] font-bold text-white block leading-none">
                VITALE
              </span>
              <span className="text-[9px] tracking-[0.25em] text-gold-400 font-medium uppercase">
                Concierge • Teresina - PI
              </span>
            </div>
          </a>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs text-neutral-300 font-medium">
            <a href="#procedimentos" className="hover:text-gold-400 transition-colors">
              Procedimentos
            </a>
            <a href="#cobertura-teresina" className="hover:text-gold-400 transition-colors">
              Bairros Atendidos
            </a>
            <a href="#como-funciona" className="hover:text-gold-400 transition-colors">
              Como Funciona
            </a>
            <a href="#faq" className="hover:text-gold-400 transition-colors">
              Dúvidas
            </a>
          </nav>

          {/* Actions: PWA Install + Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PWA In-App Install Button */}
            <PWAInstallButton variant="header" />

            {/* Cart Button with motion feedback */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.02 }}
              onClick={onOpenCart}
              className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-full gold-gradient-bg text-onyx-950 font-bold hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="absolute -top-2 -right-2 bg-onyx-950 text-gold-400 font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-gold-400"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-xs uppercase tracking-wider hidden sm:inline">
                Carrinho
              </span>
              <span className="text-xs font-black">
                {formatCurrency(cartTotal)}
              </span>
            </motion.button>

          </div>

        </div>
      </header>
    </>
  );
};
