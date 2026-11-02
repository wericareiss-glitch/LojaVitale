import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Key, Zap, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { MercadoPagoConfig } from '../types';
import { api } from '../services/api';

interface MercadoPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MercadoPagoConfig;
  onConfigUpdated: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MercadoPagoModal: React.FC<MercadoPagoModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
  showToast,
}) => {
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState(config.publicKey || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      showToast('Insira o Access Token do Mercado Pago.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.saveToken(accessToken.trim(), publicKey.trim());
      if (res.success) {
        showToast('Credenciais do Mercado Pago salvas e ativadas com sucesso!', 'success');
        onConfigUpdated();
        onClose();
      } else {
        showToast('Falha ao aplicar credenciais.', 'error');
      }
    } catch {
      showToast('Erro ao comunicar com o servidor.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getModeBadge = () => {
    if (config.mode === 'production') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Modo Produção Ativo
        </span>
      );
    }
    if (config.mode === 'sandbox') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Modo Sandbox (Teste)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" /> Modo Ativo
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-onyx-900 border border-gold-500/30 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white w-8 h-8 rounded-full bg-onyx-850 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#009EE3]/15 border border-[#009EE3]/30 flex items-center justify-center text-[#009EE3]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-white">
                Integração Oficial Mercado Pago
              </h3>
            </div>
            <p className="text-xs text-neutral-400">
              Configuração Segura da API de PIX Instantâneo e Cartão de Crédito
            </p>
          </div>
        </div>

        {/* Status Card */}
        <div className="p-4 rounded-xl bg-onyx-850 border border-white/5 space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Status da API Mercado Pago:</span>
            {getModeBadge()}
          </div>
          <div className="text-xs text-neutral-300 font-mono pt-1 border-t border-white/5 flex items-center justify-between">
            <span className="text-neutral-400 font-sans">Chave de Acesso:</span>
            <span className="text-emerald-400 font-sans flex items-center gap-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> Protegida e Criptografada no Servidor
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Suporta PIX Copia e Cola, QR Code dinâmico, Webhook e Cartão até 12x.</span>
          </div>
        </div>

        {/* Token Update Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-gold-400" /> Atualizar Access Token (Chave Privada)
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[11px] text-neutral-400 hover:text-white transition-colors"
              >
                {showSecret ? 'Ocultar' : 'Exibir'}
              </button>
            </div>
            <input
              type={showSecret ? 'text' : 'password'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full bg-onyx-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold-500 transition-colors"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Insira o token obtido no painel de desenvolvedores do Mercado Pago.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Public Key (Chave Pública)
            </label>
            <input
              type={showSecret ? 'text' : 'password'}
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full bg-onyx-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          {/* Webhook Info Box */}
          <div className="p-3.5 rounded-xl bg-onyx-950 border border-white/5 space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block">
              URL do Webhook IPN (Notificações)
            </span>
            <code className="text-[11px] text-gold-400 font-mono block break-all">
              {window.location.origin}/api/mercadopago/webhook
            </code>
            <p className="text-[10px] text-neutral-500">
              Cadastre esta URL no painel do Mercado Pago para receber atualizações automáticas de pagamentos PIX em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-onyx-850 hover:bg-onyx-800 text-neutral-300 text-xs font-semibold border border-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl gold-gradient-bg text-onyx-950 text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Salvar Credenciais
                </>
              )}
            </button>
          </div>
        </form>

        {/* Instructions guide */}
        <div className="mt-6 pt-5 border-t border-white/10 space-y-2 text-xs text-neutral-400">
          <h4 className="font-semibold text-white flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-gold-400" /> Como testar sem custos:
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-[11px]">
            <li>O sistema já inclui um <strong>simulador automático integrado</strong> para testes imediatos de PIX e Cartão sem precisar de credenciais.</li>
            <li>Para usar a API real do Mercado Pago, basta colar suas credenciais de <em>Sandbox / Teste</em> acima.</li>
            <li>O status dos pagamentos é verificado a cada 3 segundos via polling automático.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
