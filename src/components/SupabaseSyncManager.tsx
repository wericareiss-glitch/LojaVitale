/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  UserPlus,
  LogOut,
  Check,
  AlertCircle,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types/workout';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  buildLocalSyncBundle,
  pushSyncBundleToSupabase,
  pullSyncBundleFromSupabase,
  applyRemoteSyncBundle,
  getOfflineMutationQueue,
  getBatchSyncMetrics,
  flushOfflineMutationQueue,
} from '../services/supabaseSync';

interface SupabaseSyncManagerProps {
  user: UserProfile;
}

export const SupabaseSyncManager: React.FC<SupabaseSyncManagerProps> = ({ user }) => {
  const [configured] = useState<boolean>(() => isSupabaseConfigured());
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [sessionUser, setSessionUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() =>
    localStorage.getItem('meutreino_last_cloud_sync')
  );
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(() =>
    getOfflineMutationQueue(user.id).length
  );
  const [batchMetrics, setBatchMetrics] = useState(() => getBatchSyncMetrics(user.id));
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    const refreshStatus = () => {
      setPendingQueueCount(getOfflineMutationQueue(user.id).length);
      setBatchMetrics(getBatchSyncMetrics(user.id));
    };
    window.addEventListener('meutreino:offline-queue-updated', refreshStatus);
    window.addEventListener('online', refreshStatus);
    return () => {
      window.removeEventListener('meutreino:offline-queue-updated', refreshStatus);
      window.removeEventListener('online', refreshStatus);
    };
  }, [user.id]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSessionUser(null);
      return;
    }

    supabase.auth.getSession().then((res) => {
      if (res.data?.session?.user) {
        setSessionUser({
          id: res.data.session.user.id,
          email: res.data.session.user.email,
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        setSessionUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [configured]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg((curr) => (curr?.text === text ? null : curr));
    }, 5000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      showMessage('error', 'Serviço de nuvem indisponível no momento.');
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      if (authMode === 'signup') {
        const res = await supabaseSignUp(authEmail.trim(), authPassword);
        if (res.error) throw new Error(res.error);
        if (res.user) {
          showMessage(
            'success',
            'Conta na nuvem criada! Enviando seus treinos atuais...'
          );
          const bundle = buildLocalSyncBundle(user.id, user);
          await pushSyncBundleToSupabase(bundle, { immediate: true });
          const now = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          localStorage.setItem('meutreino_last_cloud_sync', now);
          setLastSyncTime(now);
        }
      } else {
        const res = await supabaseSignIn(authEmail.trim(), authPassword);
        if (res.error) throw new Error(res.error);
        if (res.user) {
          showMessage('success', 'Conectado à nuvem! Sincronizando seus dados...');
          const pulled = await pullSyncBundleFromSupabase(user.id);
          if (pulled.bundle) {
            applyRemoteSyncBundle(pulled.bundle);
          } else {
            const bundle = buildLocalSyncBundle(user.id, user);
            await pushSyncBundleToSupabase(bundle, { immediate: true });
          }
          const now = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          localStorage.setItem('meutreino_last_cloud_sync', now);
          setLastSyncTime(now);
        }
      }
    } catch (err: any) {
      showMessage('error', err?.message || 'Não foi possível entrar na nuvem.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutCloud = async () => {
    await supabaseSignOut();
    setSessionUser(null);
    showMessage('info', 'Conta na nuvem desconectada. Seus treinos continuam salvos neste aparelho.');
  };

  const handleManualPush = async () => {
    setSyncing(true);
    const bundle = buildLocalSyncBundle(user.id, user);
    const res = await pushSyncBundleToSupabase(bundle, { immediate: true });
    setSyncing(false);
    if (res.success) {
      const now = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      localStorage.setItem('meutreino_last_cloud_sync', now);
      setLastSyncTime(now);
      showMessage('success', 'Todos os treinos, histórico e medidas foram salvos na nuvem!');
    } else {
      showMessage('error', res.error || 'Não foi possível enviar os dados para a nuvem.');
    }
  };

  const handleManualPull = async () => {
    setSyncing(true);
    const res = await pullSyncBundleFromSupabase(user.id);
    setSyncing(false);
    if (res.bundle) {
      applyRemoteSyncBundle(res.bundle);
      const now = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      localStorage.setItem('meutreino_last_cloud_sync', now);
      setLastSyncTime(now);
      showMessage('success', 'Dados recuperados da nuvem e atualizados com sucesso!');
    } else {
      showMessage('error', res.error || 'Nenhum dado encontrado na nuvem para esta conta.');
    }
  };

  return (
    <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl border shadow-inner ${
              sessionUser
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
            }`}
          >
            {sessionUser ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Sincronização na Nuvem
              </h2>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  sessionUser
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {sessionUser ? 'Conectado' : 'Apenas neste Aparelho'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mantenha suas fichas, histórico e medidas sincronizados caso troque de celular ou acesse de outro aparelho.
            </p>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : statusMsg.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Content */}
      {!configured ? (
        <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white mb-0.5">
              Salvamento Automático no Aparelho Ativo
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Todos os seus treinos, séries e evoluções já estão sendo salvos automaticamente no seu aparelho e funcionam mesmo sem internet. Para transferir seus dados para outro celular, você pode usar a opção <strong className="text-slate-200">Salvar Cópia</strong> logo abaixo.
            </p>
          </div>
        </div>
      ) : sessionUser ? (
        <div className="bg-gradient-to-r from-emerald-950/30 via-[#0a101d] to-[#0a101d] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Nuvem Conectada & Sincronização Automática
                </span>
                <strong className="text-sm font-black text-white">
                  {sessionUser.email}
                </strong>
                {lastSyncTime && (
                  <span className="text-[11px] text-slate-400 block">
                    Última atualização às {lastSyncTime}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogoutCloud}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/50 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Desconectar Nuvem</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              disabled={syncing}
              onClick={handleManualPush}
              className="py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/15"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>Salvar Agora na Nuvem</span>
            </button>

            <button
              type="button"
              disabled={syncing}
              onClick={handleManualPull}
              className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-300 border border-sky-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <DownloadCloud className="w-4 h-4" />
              )}
              <span>Baixar Dados da Nuvem</span>
            </button>
          </div>

          {/* Indicador amigável de economia de bateria e dados */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] bg-[#080d18] p-3 rounded-xl border border-slate-800/90">
            <div className="flex items-center gap-2">
              <Sparkles
                className={`w-4 h-4 shrink-0 ${
                  batchMetrics.isBatchTimerActive
                    ? 'text-sky-400 animate-pulse'
                    : pendingQueueCount > 0
                    ? 'text-amber-400 animate-pulse'
                    : 'text-emerald-400'
                }`}
              />
              <div>
                <span className="font-bold text-slate-200 block">
                  Economia Inteligente de Bateria e Internet
                </span>
                <span className="text-slate-400">
                  Suas anotações são salvas na hora e sincronizadas automaticamente em segundo plano.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {batchMetrics.isBatchTimerActive ? (
                <button
                  type="button"
                  onClick={() => flushOfflineMutationQueue(user.id, user)}
                  className="px-2.5 py-1 rounded-full font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 cursor-pointer transition-colors"
                  title="Sincronizar imediatamente"
                >
                  Sincronizando... (Enviar agora)
                </button>
              ) : pendingQueueCount > 0 ? (
                <span className="px-2.5 py-1 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Aguardando internet ({pendingQueueCount})
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Tudo atualizado
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleAuthSubmit}
          className="bg-[#0a101d] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-white">
              {authMode === 'login'
                ? 'Entrar na sua Conta em Nuvem'
                : 'Criar Conta Gratuita na Nuvem'}
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Seu E-mail
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="atleta@email.com"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Senha (mín. 6 caracteres)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : authMode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {authMode === 'login'
                ? 'Conectar & Sincronizar Agora'
                : 'Criar Conta & Salvar na Nuvem'}
            </span>
          </button>
        </form>
      )}
    </div>
  );
};
