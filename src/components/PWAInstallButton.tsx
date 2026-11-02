import React, { useState } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'footer' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'header',
  className = '' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone PWA mode, don't show prompt
  if (isInstalled) {
    return null;
  }

  // Handle click for Android/Chromium or iOS
  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback for browsers without beforeinstallprompt or desktop
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-onyx-850 hover:bg-onyx-800 border border-gold-500/40 hover:border-gold-400 text-gold-300 hover:text-white transition-all shadow-md group cursor-pointer ${className}`}
          title="Instalar Vitale como aplicativo no seu celular"
        >
          <Smartphone className="w-3.5 h-3.5 text-gold-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {variant === 'footer' && (
        <button
          onClick={handleClick}
          className={`text-[11px] text-neutral-400 hover:text-gold-300 flex items-center gap-1.5 transition-colors cursor-pointer ${className}`}
          title="Instalar Vitale no celular"
        >
          <Smartphone className="w-3.5 h-3.5 text-gold-400" />
          <span>Instalar Aplicativo (PWA) no Celular</span>
        </button>
      )}

      {/* Guided Modal for iOS Safari / Mobile Browser Manual Installation */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-onyx-900 border border-gold-500/30 p-6 shadow-2xl text-white relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6" />
            </div>

            <h3 className="text-base font-serif font-bold text-center text-white mb-2">
              Instalar Vitale no seu Celular
            </h3>
            <p className="text-xs text-neutral-300 text-center mb-5 leading-relaxed">
              Tenha o agendamento concierge a domicílio sempre na tela inicial do seu celular, com acesso rápido e offline.
            </p>

            <div className="space-y-3 bg-onyx-950 p-4 rounded-xl border border-white/10 text-xs text-neutral-300">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  No seu navegador (Safari ou Chrome), toque no botão de <strong className="text-white">Compartilhar</strong> ou no menu de <strong className="text-white">3 pontos</strong>.
                  <div className="flex items-center gap-1 text-[11px] text-gold-300 mt-1">
                    <Share2 className="w-3.5 h-3.5" /> Ícone de compartilhamento
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
                <div className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  Role as opções e toque em <strong className="text-white">Adicionar à Tela de Início</strong> (ou <em>Instalar Aplicativo</em>).
                  <div className="flex items-center gap-1 text-[11px] text-gold-300 mt-1">
                    <PlusSquare className="w-3.5 h-3.5" /> Adicionar à Tela de Início
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl gold-gradient-bg text-onyx-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
