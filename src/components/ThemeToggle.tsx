/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sun, Moon, Monitor, CheckCircle2, Lock, Sparkles, Palette } from 'lucide-react';
import { useTheme, ACCENT_PALETTES, AccentColor, Theme } from '../utils/theme';

interface ThemeToggleProps {
  variant?: 'compact' | 'full' | 'segmented' | 'profile-card';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const {
    theme,
    accentColor,
    isDark,
    isOled,
    isSystem,
    isAutoDetectDisabled,
    toggleTheme,
    setTheme,
    setAccentColor,
    setSystemTheme,
  } = useTheme();
  const [justSaved, setJustSaved] = useState(false);

  const handleForceTheme = (target: Theme) => {
    setTheme(target);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const handleSelectAccent = (targetAccent: AccentColor) => {
    setAccentColor(targetAccent);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const handleToggleForce = () => {
    toggleTheme();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  if (variant === 'profile-card') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Linha principal: Botão de Alternância Rápida (Dark / Light) + Seletor Direto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a101d] p-4 rounded-2xl border border-slate-800">
          <div className="flex items-start gap-3">
            <div
              className={`p-3 rounded-2xl border shrink-0 transition-colors ${
                isOled
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                  : isDark
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}
            >
              {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  {isOled
                    ? 'Modo Escuro Intenso (Economia de Bateria)'
                    : isDark
                    ? 'Modo Escuro Ativo'
                    : 'Modo Claro Ativo'}
                </h3>
                {isAutoDetectDisabled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Lock className="w-3 h-3" />
                    <span>Tema Fixado</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    <Monitor className="w-3 h-3" />
                    <span>Automático</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {isAutoDetectDisabled
                  ? 'Sua preferência de cor está fixa e salva neste aparelho.'
                  : 'Segue automaticamente o tema do seu celular ou computador. Clique ao lado para fixar sua cor preferida.'}
              </p>
            </div>
          </div>

          {/* Botão Principal de Alternância (Switch Dark/Light) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleForce}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md ${
                isDark
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
              }`}
              title="Alternar entre modo escuro e modo claro"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 stroke-[2.5]" />
                  <span>Mudar para Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 stroke-[2.5]" />
                  <span>Mudar para Modo Escuro</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Botões de seleção explícita para Forçar Dark, Dark OLED Absoluto ou Forçar Light */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleForceTheme('dark')}
            aria-pressed={!isSystem && theme === 'dark'}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              !isSystem && theme === 'dark'
                ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-md'
                : 'bg-[#0a101d] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${!isSystem && theme === 'dark' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-sky-400'}`}>
                <Moon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block text-white truncate">Modo Escuro</span>
                <span className="text-[10px] text-slate-400 block truncate">Alto contraste clássico</span>
              </div>
            </div>
            {!isSystem && theme === 'dark' && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 shrink-0">
                ATIVO
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleForceTheme('oled')}
            aria-pressed={!isSystem && theme === 'oled'}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              !isSystem && theme === 'oled'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md'
                : 'bg-[#0a101d] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${!isSystem && theme === 'oled' ? 'bg-emerald-500 text-slate-950' : 'bg-black border border-slate-700 text-emerald-400'}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block text-white truncate">Escuro Intenso</span>
                <span className="text-[10px] text-slate-400 block truncate">Preto profundo • Poupa bateria</span>
              </div>
            </div>
            {!isSystem && theme === 'oled' && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                ATIVO
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleForceTheme('light')}
            aria-pressed={!isSystem && theme === 'light'}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              !isSystem && theme === 'light'
                ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md'
                : 'bg-[#0a101d] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${!isSystem && theme === 'light' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                <Sun className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black block text-white truncate">Modo Claro (Light)</span>
                <span className="text-[10px] text-slate-400 block truncate">Alta legibilidade diurna</span>
              </div>
            </div>
            {!isSystem && theme === 'light' && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shrink-0">
                FIXADO
              </span>
            )}
          </button>
        </div>

        {/* Paletas de Destaque Personalizadas */}
        <div className="bg-[#0a101d] p-4 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Paleta de Destaque (Identidade Visual)
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Personalize os botões e indicadores
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ACCENT_PALETTES.map((pal) => {
              const isSelected = accentColor === pal.id;
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => handleSelectAccent(pal.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/30 text-white shadow-md'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 border border-white/20 shadow-sm"
                    style={{ backgroundColor: pal.previewHex }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black block text-white truncate">
                      {pal.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {pal.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rodapé informativo e opção secundária de sistema */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
          {justSaved ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Preferência de tema salva com sucesso!</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              Modo atual: <strong className="text-white">{isAutoDetectDisabled ? (isOled ? 'Escuro Intenso' : isDark ? 'Escuro' : 'Claro') : 'Automático pelo aparelho'}</strong>
            </span>
          )}

          {isAutoDetectDisabled && (
            <button
              type="button"
              onClick={setSystemTheme}
              className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 underline underline-offset-2 self-start sm:self-auto cursor-pointer transition-colors"
            >
              Reativar detecção automática do sistema
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'segmented') {
    return (
      <div 
        className={`flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 transition-colors ${className}`}
        role="group"
        aria-label="Selecionar tema visual"
      >
        <button
          type="button"
          onClick={() => handleForceTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            !isSystem && isDark
              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm border border-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={!isSystem && isDark}
          title="Forçar Modo Escuro (salva no localStorage e desativa detecção automática)"
        >
          <Moon className={`w-3.5 h-3.5 ${!isSystem && isDark ? 'text-slate-950' : 'text-sky-400'}`} />
          <span>Dark (Escuro)</span>
        </button>
        <button
          type="button"
          onClick={() => handleForceTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            !isSystem && !isDark
              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm border border-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={!isSystem && !isDark}
          title="Forçar Modo Claro (salva no localStorage e desativa detecção automática)"
        >
          <Sun className={`w-3.5 h-3.5 ${!isSystem && !isDark ? 'text-slate-950' : 'text-amber-500'}`} />
          <span>Light (Claro)</span>
        </button>
        <button
          type="button"
          onClick={setSystemTheme}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isSystem
              ? 'bg-slate-700 text-white font-black shadow-sm border border-slate-600'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-pressed={isSystem}
          title="Sincronizar automaticamente com o tema do sistema operacional"
        >
          <Monitor className={`w-3.5 h-3.5 ${isSystem ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-slate-800/60 ${className}`}>
        <button
          type="button"
          onClick={handleToggleForce}
          className="flex items-center gap-2.5 flex-1 text-left cursor-pointer"
          aria-label={isDark ? 'Forçar Modo Claro (Light)' : 'Forçar Modo Escuro (Dark)'}
          title={isDark ? 'Alternar e forçar Modo Claro' : 'Alternar e forçar Modo Escuro'}
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <div>
            <span className="block font-bold text-white">Tema Visual (Dark / Light)</span>
            <span className="block text-[10px] text-slate-400">
              {isDark ? 'Modo Escuro (Dark)' : 'Modo Claro (Light)'}
              {isSystem ? ' • Auto (Sistema)' : ' • Forçado (Salvo)'}
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1">
          {!isSystem && (
            <button
              type="button"
              onClick={setSystemTheme}
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border bg-slate-800/80 text-slate-400 hover:text-emerald-400 border-slate-700 cursor-pointer transition-colors"
              title="Restaurar detecção automática do sistema"
            >
              Auto
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleForce}
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-slate-800 text-slate-300 border-slate-700 cursor-pointer"
          >
            {isSystem ? `Auto (${isDark ? 'Dark' : 'Light'})` : isDark ? 'Dark Fixo' : 'Light Fixo'}
          </button>
        </div>
      </div>
    );
  }

  // Compact variant (icon button for Header and quick bars)
  return (
    <button
      type="button"
      onClick={handleToggleForce}
      className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 hover:border-slate-600'
          : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm'
      } ${className}`}
      aria-label={isDark ? 'Forçar Modo Claro (Light)' : 'Forçar Modo Escuro (Dark)'}
      title={
        isSystem
          ? `Tema sincronizado com o sistema (${isDark ? 'Escuro' : 'Claro'}) — Clique para forçar modo e desativar detecção automática`
          : isDark
          ? 'Modo Escuro Forçado — Clique para mudar para Modo Claro (Light)'
          : 'Modo Claro Forçado — Clique para mudar para Modo Escuro (Dark)'
      }
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-sky-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};
