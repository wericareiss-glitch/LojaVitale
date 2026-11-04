/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { safeStorage } from '../utils/storage';

const SUPABASE_URL_KEY = 'meutreino_supabase_url';
const SUPABASE_KEY_KEY = 'meutreino_supabase_anon_key';
const SUPABASE_LAST_SYNC_KEY = 'meutreino_last_cloud_sync_at';
const SUPABASE_SAVED_SESSION_KEY = 'meutreino_supabase_saved_email';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface MeuTreinoSyncBundle {
  version: number;
  userId: string;
  updatedAt: string;
  sourceDevice?: string;
  userProfile?: any;
  routines?: any[];
  sessions?: any[];
  historyLogs?: Record<string, any>;
  currentLogs?: Record<string, any>;
  measurements?: any[];
  workoutNotes?: string;
  settings?: Record<string, any>;
  activeRoutineId?: string | null;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'unconfigured';

// URL e chave padrão caso o usuário não tenha configurado credenciais próprias
const DEFAULT_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const DEFAULT_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;
let realtimeChannel: any = null;
let syncBroadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncBroadcastChannel = new BroadcastChannel('meutreino_realtime_sync');
  } catch {
    syncBroadcastChannel = null;
  }
}

/**
 * Sincroniza um snapshot dos dados de treino com o cache Stale-While-Revalidate do Service Worker
 */
function notifyServiceWorkerWorkoutSnapshot(bundle: MeuTreinoSyncBundle): void {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_WORKOUT_DATA_SNAPSHOT',
        payload: bundle,
      });
    } catch {
      // Ignora caso o Service Worker ainda esteja ativando
    }
  }
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const customUrl = safeStorage.get<string>(SUPABASE_URL_KEY, '');
  const customKey = safeStorage.get<string>(SUPABASE_KEY_KEY, '');

  return {
    url: customUrl || DEFAULT_URL,
    anonKey: customKey || DEFAULT_KEY,
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  safeStorage.set(SUPABASE_URL_KEY, (config.url || '').trim());
  safeStorage.set(SUPABASE_KEY_KEY, (config.anonKey || '').trim());
  // Reset instance to reinitialize with new credentials
  supabaseInstance = null;
}

export function isSupabaseConfigured(): boolean {
  const cfg = getStoredSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith('https://'));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const cfg = getStoredSupabaseConfig();
  if (!cfg.url || !cfg.anonKey || !cfg.url.startsWith('https://')) {
    return null;
  }

  try {
    supabaseInstance = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.warn('[Supabase] Erro ao instanciar cliente:', err);
    return null;
  }
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!url.startsWith('https://')) {
      return { success: false, error: 'A URL do Supabase deve começar com https://' };
    }
    const testClient = createClient(url, anonKey);
    const { error } = await testClient.auth.getSession();
    if (error && !error.message.includes('fetch')) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha na conexão com o servidor Supabase.' };
  }
}

export async function supabaseSignUp(
  email: string,
  password: string
): Promise<{ user?: SupabaseAuthUser; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado. Adicione a URL e Chave Anon do projeto primeiro.' };
  }

  try {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data?.user) {
      safeStorage.set(SUPABASE_SAVED_SESSION_KEY, email);
      return { user: data.user };
    }
    return { error: 'Não foi possível cadastrar a conta.' };
  } catch (err: any) {
    return { error: err?.message || 'Erro inesperado no cadastro Supabase.' };
  }
}

export async function supabaseSignIn(
  email: string,
  password: string
): Promise<{ user?: SupabaseAuthUser; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado. Adicione a URL e Chave Anon do projeto primeiro.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data?.user) {
      safeStorage.set(SUPABASE_SAVED_SESSION_KEY, email);
      return { user: data.user };
    }
    return { error: 'Credenciais inválidas.' };
  } catch (err: any) {
    return { error: err?.message || 'Erro ao realizar login via Supabase.' };
  }
}

export async function supabaseSignOut(): Promise<void> {
  const client = getSupabaseClient();
  safeStorage.remove(SUPABASE_SAVED_SESSION_KEY);
  if (client) {
    try {
      await client.auth.signOut();
    } catch {}
  }
}

export async function getCurrentSupabaseUser(): Promise<SupabaseAuthUser | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

export function getSavedSupabaseEmail(): string | null {
  return safeStorage.get<string | null>(SUPABASE_SAVED_SESSION_KEY, null);
}

export function getLastSyncTime(): string | null {
  return safeStorage.get<string | null>(SUPABASE_LAST_SYNC_KEY, null);
}

/**
 * Cria a bundle completa dos dados locais do atleta para sincronização
 */
export function buildLocalSyncBundle(userId: string, userProfile?: any): MeuTreinoSyncBundle {
  const routines = safeStorage.get(`alex_u_${userId}_routines`, []);
  const sessions = safeStorage.get(`alex_u_${userId}_sessions`, []);
  const historyLogs = safeStorage.get(`alex_u_${userId}_history_logs`, {});
  const currentLogs = safeStorage.get(`alex_u_${userId}_current_logs`, {});
  const measurements = safeStorage.get(`alex_u_${userId}_measurements`, []);
  const workoutNotes = safeStorage.get(`alex_u_${userId}_workout_notes`, '');
  const activeRoutineId = safeStorage.get(`alex_u_${userId}_active_routine_id`, null);

  const settings = {
    split: safeStorage.get(`alex_u_${userId}_split`, null),
    strategy: safeStorage.get(`alex_u_${userId}_strategy`, null),
    level: safeStorage.get(`alex_u_${userId}_level`, null),
    equip: safeStorage.get(`alex_u_${userId}_equip`, null),
    weeklyBudget: safeStorage.get(`alex_u_${userId}_weekly_budget`, null),
    periodizationStrategy: safeStorage.get(`alex_u_${userId}_periodization_strategy`, null),
  };

  const device =
    typeof navigator !== 'undefined'
      ? `${navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'} (${
          navigator.platform || 'Web'
        })`
      : 'Web Client';

  return {
    version: 2,
    userId,
    updatedAt: new Date().toISOString(),
    sourceDevice: device,
    userProfile,
    routines,
    sessions,
    historyLogs,
    currentLogs,
    measurements,
    workoutNotes,
    settings,
    activeRoutineId,
  };
}

/**
 * Aplica uma bundle remota nos armazenamentos locais (safeStorage e IndexedDB)
 */
export function applyRemoteSyncBundle(bundle: MeuTreinoSyncBundle): void {
  if (!bundle || !bundle.userId) return;
  const uid = bundle.userId;

  if (bundle.routines) safeStorage.set(`alex_u_${uid}_routines`, bundle.routines);
  if (bundle.sessions) safeStorage.set(`alex_u_${uid}_sessions`, bundle.sessions);
  if (bundle.historyLogs) safeStorage.set(`alex_u_${uid}_history_logs`, bundle.historyLogs);
  if (bundle.measurements) safeStorage.set(`alex_u_${uid}_measurements`, bundle.measurements);
  if (bundle.workoutNotes !== undefined) safeStorage.set(`alex_u_${uid}_workout_notes`, bundle.workoutNotes);
  if (bundle.activeRoutineId !== undefined) safeStorage.set(`alex_u_${uid}_active_routine_id`, bundle.activeRoutineId);

  if (bundle.settings) {
    if (bundle.settings.split) safeStorage.set(`alex_u_${uid}_split`, bundle.settings.split);
    if (bundle.settings.strategy) safeStorage.set(`alex_u_${uid}_strategy`, bundle.settings.strategy);
    if (bundle.settings.level) safeStorage.set(`alex_u_${uid}_level`, bundle.settings.level);
    if (bundle.settings.equip) safeStorage.set(`alex_u_${uid}_equip`, bundle.settings.equip);
    if (bundle.settings.weeklyBudget) safeStorage.set(`alex_u_${uid}_weekly_budget`, bundle.settings.weeklyBudget);
    if (bundle.settings.periodizationStrategy) {
      safeStorage.set(`alex_u_${uid}_periodization_strategy`, bundle.settings.periodizationStrategy);
    }
  }

  safeStorage.set(SUPABASE_LAST_SYNC_KEY, bundle.updatedAt || new Date().toISOString());
  notifyServiceWorkerWorkoutSnapshot(bundle);

  // Notifica o app para re-renderizar estados
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meutreino:remote-sync-applied', { detail: bundle }));
  }
}

/**
 * Envia imediatamente a bundle consolidada para a tabela meutreino_sync em uma única requisição HTTP Upsert.
 */
async function executeDirectSupabaseUpsert(
  bundle: MeuTreinoSyncBundle
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  // Atualiza o snapshot no cache Stale-While-Revalidate do Service Worker
  notifyServiceWorkerWorkoutSnapshot(bundle);

  // Transmite via BroadcastChannel local para abas abertas no mesmo dispositivo
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'LOCAL_SYNC_BROADCAST', bundle });
    } catch {}
  }

  if (!client) {
    safeStorage.set(SUPABASE_LAST_SYNC_KEY, new Date().toISOString());
    return { success: true };
  }

  try {
    const payload = {
      user_id: bundle.userId,
      data: bundle,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('meutreino_sync')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      if (
        error.message.includes('relation "meutreino_sync" does not exist') ||
        error.code === '42P01'
      ) {
        return {
          success: false,
          error:
            'Tabela "meutreino_sync" ainda não criada no Supabase. Crie a tabela no SQL Editor com o script fornecido.',
        };
      }
      return { success: false, error: error.message };
    }

    safeStorage.set(SUPABASE_LAST_SYNC_KEY, new Date().toISOString());
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha na conexão ao sincronizar.' };
  }
}

/**
 * Faz upload dos dados locais para o Supabase.
 * Por padrão (immediate = false), agrupa a alteração na janela de 5 segundos para economizar bateria e rede.
 * Quando immediate = true (ex: clique manual em "Sincronizar Agora"), executa o flush imediato do lote.
 */
export async function pushSyncBundleToSupabase(
  bundle: MeuTreinoSyncBundle,
  options?: { immediate?: boolean }
): Promise<{ success: boolean; error?: string; batched?: boolean }> {
  if (!bundle || !bundle.userId) {
    return { success: false, error: 'Bundle inválida sem userId.' };
  }

  // Se não for forçado como imediato, adiciona todas as entidades da bundle ao buffer de 5 segundos (5000ms)
  if (!options?.immediate) {
    bufferBundleMutations(bundle);
    return { success: true, batched: true };
  }

  // Se for imediato, cancela qualquer timer de 5s pendente e limpa o buffer local após envio
  if (batchCommitTimer) {
    clearTimeout(batchCommitTimer);
    batchCommitTimer = null;
    nextBatchFlushTimestamp = null;
  }

  const res = await executeDirectSupabaseUpsert(bundle);
  if (res.success) {
    clearUserMutationBuffer(bundle.userId);
    notifyQueueListeners(bundle.userId);
  }
  return res;
}

/**
 * Busca os dados remotos mais recentes do usuário no Supabase
 */
export async function pullSyncBundleFromSupabase(
  userId: string
): Promise<{ bundle?: MeuTreinoSyncBundle; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não conectado.' };
  }

  try {
    const { data, error } = await client
      .from('meutreino_sync')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    if (data?.data) {
      const bundle = data.data as MeuTreinoSyncBundle;
      notifyServiceWorkerWorkoutSnapshot(bundle);
      return { bundle };
    }

    return { error: 'Nenhum dado remoto encontrado para este atleta no Supabase.' };
  } catch (err: any) {
    return { error: err?.message || 'Erro ao carregar dados do Supabase.' };
  }
}

/**
 * Assina atualizações em Tempo Real (Supabase Realtime + BroadcastChannel)
 */
export function subscribeToRealtimeSync(
  userId: string,
  onRemoteChange: (bundle: MeuTreinoSyncBundle) => void
): () => void {
  // 1. Escuta canal local BroadcastChannel
  const handleBroadcast = (ev: MessageEvent) => {
    if (ev.data && ev.data.type === 'LOCAL_SYNC_BROADCAST') {
      const b = ev.data.bundle as MeuTreinoSyncBundle;
      if (b && b.userId === userId) {
        onRemoteChange(b);
      }
    }
  };

  if (syncBroadcastChannel) {
    syncBroadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 2. Escuta Supabase Realtime se cliente disponível
  const client = getSupabaseClient();
  if (client) {
    try {
      if (realtimeChannel) {
        client.removeChannel(realtimeChannel);
      }

      realtimeChannel = client
        .channel(`meutreino-sync-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meutreino_sync',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            if (payload?.new?.data) {
              const remoteBundle = payload.new.data as MeuTreinoSyncBundle;
              onRemoteChange(remoteBundle);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[Supabase Realtime] Falha ao registrar realtime channel:', err);
    }
  }

  return () => {
    if (syncBroadcastChannel) {
      syncBroadcastChannel.removeEventListener('message', handleBroadcast);
    }
    if (client && realtimeChannel) {
      try {
        client.removeChannel(realtimeChannel);
        realtimeChannel = null;
      } catch {}
    }
  };
}

// ============================================================================
// BUFFER DE MUTAÇÕES LOCAIS EM INTERVALOS DE 5 SEGUNDOS (5000ms)
// Agrupa e funde (coalesce) todas as mutações locais em um buffer em memória +
// persistência offline, enviando 1 único commit (Upsert) a cada janela de 5s
// para otimizar o consumo de bateria (rádio móvel) e requisições de rede.
// ============================================================================
const OFFLINE_QUEUE_KEY_PREFIX = 'meutreino_offline_delta_queue_';
const OFFLINE_BYTES_SAVED_KEY = 'meutreino_delta_bytes_saved';
const BATCHED_CALLS_SAVED_KEY = 'meutreino_batched_calls_saved';
export const COMMIT_BATCH_WINDOW_MS = 5000; // Janela fixa de 5 segundos para o buffer de mutações locais

export type SyncDeltaEntity =
  | 'currentLogs'
  | 'historyLogs'
  | 'routines'
  | 'sessions'
  | 'measurements'
  | 'workoutNotes'
  | 'settings'
  | 'activeRoutineId';

export interface OfflineDeltaMutation {
  id: string;
  userId: string;
  entity: SyncDeltaEntity;
  deltaPayload: any;
  updatedAt: string;
  approxBytes: number;
  mergedCount: number;
}

export interface BatchSyncMetrics {
  pendingEntitiesCount: number;
  totalMergedMutations: number;
  batchedCallsSaved: number;
  bytesSaved: number;
  isBatchTimerActive: boolean;
  batchWindowMs: number;
  nextFlushAt: number | null;
}

// Buffer em memória indexado por userId -> Map<SyncDeltaEntity, OfflineDeltaMutation>
const localMutationBufferMap = new Map<string, Map<SyncDeltaEntity, OfflineDeltaMutation>>();

let isFlushingQueue = false;
let batchCommitTimer: ReturnType<typeof setTimeout> | null = null;
let bufferPersistTimer: ReturnType<typeof setTimeout> | null = null;
let nextBatchFlushTimestamp: number | null = null;
let activeBatchUserId: string | null = null;
let activeBatchUserProfile: any = null;

function getOrHydrateUserBuffer(userId: string): Map<SyncDeltaEntity, OfflineDeltaMutation> {
  let userBuffer = localMutationBufferMap.get(userId);
  if (!userBuffer) {
    userBuffer = new Map<SyncDeltaEntity, OfflineDeltaMutation>();
    const persisted = safeStorage.get<OfflineDeltaMutation[]>(
      `${OFFLINE_QUEUE_KEY_PREFIX}${userId}`,
      []
    );
    for (const item of persisted) {
      if (item && item.entity) {
        userBuffer.set(item.entity, item);
      }
    }
    localMutationBufferMap.set(userId, userBuffer);
  }
  return userBuffer;
}

function persistUserBufferToStorage(userId: string): OfflineDeltaMutation[] {
  const userBuffer = getOrHydrateUserBuffer(userId);
  const serializedArray = Array.from(userBuffer.values());
  safeStorage.set(`${OFFLINE_QUEUE_KEY_PREFIX}${userId}`, serializedArray);
  return serializedArray;
}

function scheduleDebouncedBufferPersistence(userId: string): void {
  if (bufferPersistTimer) {
    clearTimeout(bufferPersistTimer);
  }
  bufferPersistTimer = setTimeout(() => {
    bufferPersistTimer = null;
    persistUserBufferToStorage(userId);
    notifyQueueListeners(userId);
  }, 250);
}

function clearUserMutationBuffer(userId: string): void {
  if (bufferPersistTimer) {
    clearTimeout(bufferPersistTimer);
    bufferPersistTimer = null;
  }
  const userBuffer = localMutationBufferMap.get(userId);
  if (userBuffer) {
    userBuffer.clear();
  }
  safeStorage.set(`${OFFLINE_QUEUE_KEY_PREFIX}${userId}`, []);
}

function requestServiceWorkerBackgroundSync(): void {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg: any) => {
        if (reg && 'sync' in reg && typeof reg.sync.register === 'function') {
          reg.sync.register('meutreino-workout-sync-buffer').catch(() => {});
        }
      })
      .catch(() => {});
  }
}

function notifyQueueListeners(userId: string) {
  if (typeof window !== 'undefined') {
    const queue = getOfflineMutationQueue(userId);
    const metrics = getBatchSyncMetrics(userId);
    window.dispatchEvent(
      new CustomEvent('meutreino:offline-queue-updated', {
        detail: {
          userId,
          count: queue.length,
          queue,
          metrics,
        },
      })
    );
  }
}

export function getOfflineMutationQueue(userId: string): OfflineDeltaMutation[] {
  if (!userId) return [];
  const userBuffer = getOrHydrateUserBuffer(userId);
  return Array.from(userBuffer.values());
}

export function getEstimatedMobileDataSavedBytes(): number {
  return safeStorage.get<number>(OFFLINE_BYTES_SAVED_KEY, 0);
}

export function getBatchedNetworkCallsSaved(): number {
  return safeStorage.get<number>(BATCHED_CALLS_SAVED_KEY, 0);
}

export function getBatchSyncMetrics(userId: string): BatchSyncMetrics {
  const queue = getOfflineMutationQueue(userId);
  const totalMergedMutations = queue.reduce((acc, item) => acc + (item.mergedCount || 1), 0);
  return {
    pendingEntitiesCount: queue.length,
    totalMergedMutations,
    batchedCallsSaved: getBatchedNetworkCallsSaved(),
    bytesSaved: getEstimatedMobileDataSavedBytes(),
    isBatchTimerActive: batchCommitTimer !== null,
    batchWindowMs: COMMIT_BATCH_WINDOW_MS,
    nextFlushAt: nextBatchFlushTimestamp,
  };
}

/**
 * Agenda o flush do buffer em intervalos fixos de 5 segundos (COMMIT_BATCH_WINDOW_MS = 5000ms).
 * Se uma janela de 5 segundos já estiver aberta e ativa, novas mutações entram no mesmo buffer
 * sem adiar indefinidamente o envio, garantindo commits previsíveis a cada 5s.
 */
function scheduleBatchedCommit(userId: string, userProfile?: any): void {
  activeBatchUserId = userId;
  if (userProfile) {
    activeBatchUserProfile = userProfile;
  }

  // Se o timer de 5 segundos já está rodando, apenas anexa ao buffer atual sem reiniciar o ciclo
  if (batchCommitTimer !== null) {
    return;
  }

  nextBatchFlushTimestamp = Date.now() + COMMIT_BATCH_WINDOW_MS;

  batchCommitTimer = setTimeout(() => {
    batchCommitTimer = null;
    nextBatchFlushTimestamp = null;
    const targetUid = activeBatchUserId || userId;
    const targetProfile = activeBatchUserProfile || userProfile;
    flushOfflineMutationQueue(targetUid, targetProfile).catch(() => {});
  }, COMMIT_BATCH_WINDOW_MS);
}

// Garante envio imediato do buffer pendente caso o usuário minimize o app ou quando o Service Worker disparar Background Sync
if (typeof window !== 'undefined') {
  const flushOnBackground = () => {
    if (bufferPersistTimer && activeBatchUserId) {
      clearTimeout(bufferPersistTimer);
      bufferPersistTimer = null;
      persistUserBufferToStorage(activeBatchUserId);
    }
    if (batchCommitTimer && activeBatchUserId) {
      clearTimeout(batchCommitTimer);
      batchCommitTimer = null;
      nextBatchFlushTimestamp = null;
      flushOfflineMutationQueue(activeBatchUserId, activeBatchUserProfile).catch(() => {});
    }
  };

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushOnBackground();
    }
  });
  window.addEventListener('pagehide', flushOnBackground);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_FLUSH_MUTATION_BUFFER' && activeBatchUserId) {
        flushOfflineMutationQueue(activeBatchUserId, activeBatchUserProfile).catch(() => {});
      }
    });
  }
}

/**
 * Insere ou mescla uma mutação no buffer em memória + persistência local.
 */
function upsertMutationIntoBuffer(
  userId: string,
  entity: SyncDeltaEntity,
  deltaPayload: any
): void {
  const userBuffer = getOrHydrateUserBuffer(userId);
  const nowIso = new Date().toISOString();

  let serializedLen = 96;
  if (typeof deltaPayload === 'string') {
    serializedLen = deltaPayload.length;
  } else if (Array.isArray(deltaPayload)) {
    serializedLen = Math.max(128, deltaPayload.length * 180);
  }

  const prev = userBuffer.get(entity);
  if (prev) {
    let mergedPayload = deltaPayload;
    if (
      (entity === 'currentLogs' || entity === 'historyLogs' || entity === 'settings') &&
      prev.deltaPayload &&
      typeof prev.deltaPayload === 'object' &&
      !Array.isArray(prev.deltaPayload) &&
      deltaPayload &&
      typeof deltaPayload === 'object' &&
      !Array.isArray(deltaPayload)
    ) {
      mergedPayload = { ...prev.deltaPayload, ...deltaPayload };
    }
    userBuffer.set(entity, {
      ...prev,
      deltaPayload: mergedPayload,
      updatedAt: nowIso,
      approxBytes: serializedLen,
      mergedCount: (prev.mergedCount || 1) + 1,
    });
  } else {
    userBuffer.set(entity, {
      id: `${entity}_${Date.now()}`,
      userId,
      entity,
      deltaPayload,
      updatedAt: nowIso,
      approxBytes: serializedLen,
      mergedCount: 1,
    });
  }
}

/**
 * Agrupa uma bundle inteira dentro do buffer de 5 segundos em uma única escrita de armazenamento.
 */
function bufferBundleMutations(bundle: MeuTreinoSyncBundle): void {
  if (!bundle || !bundle.userId) return;
  const uid = bundle.userId;

  if (bundle.routines !== undefined) upsertMutationIntoBuffer(uid, 'routines', bundle.routines);
  if (bundle.sessions !== undefined) upsertMutationIntoBuffer(uid, 'sessions', bundle.sessions);
  if (bundle.historyLogs !== undefined) upsertMutationIntoBuffer(uid, 'historyLogs', bundle.historyLogs);
  if (bundle.currentLogs !== undefined) upsertMutationIntoBuffer(uid, 'currentLogs', bundle.currentLogs);
  if (bundle.measurements !== undefined) upsertMutationIntoBuffer(uid, 'measurements', bundle.measurements);
  if (bundle.workoutNotes !== undefined) upsertMutationIntoBuffer(uid, 'workoutNotes', bundle.workoutNotes);
  if (bundle.settings !== undefined) upsertMutationIntoBuffer(uid, 'settings', bundle.settings);
  if (bundle.activeRoutineId !== undefined) {
    upsertMutationIntoBuffer(uid, 'activeRoutineId', bundle.activeRoutineId);
  }

  scheduleDebouncedBufferPersistence(uid);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline && isSupabaseConfigured()) {
    scheduleBatchedCommit(uid, bundle.userProfile);
  } else {
    requestServiceWorkerBackgroundSync();
  }
}

/**
 * Registra qualquer mutação local no buffer de agrupamento de 5 segundos (5000ms).
 * Funde (coalesce) alterações repetidas na mesma entidade para minimizar o payload e chamadas de rede.
 */
export function enqueueOfflineMutation(
  userId: string,
  entity: SyncDeltaEntity,
  deltaPayload: any,
  userProfile?: any
): void {
  if (!userId) return;

  upsertMutationIntoBuffer(userId, entity, deltaPayload);
  scheduleDebouncedBufferPersistence(userId);

  // Se estiver online, agenda o envio agrupado no intervalo de 5 segundos (5000ms)
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline && isSupabaseConfigured()) {
    scheduleBatchedCommit(userId, userProfile);
  } else {
    requestServiceWorkerBackgroundSync();
  }
}

/**
 * Executa o commit em lote (Batch Flush) de todas as mutações locais acumuladas no buffer de 5s
 * em uma única requisição de rede (Upsert direto) ao Supabase.
 */
export async function flushOfflineMutationQueue(
  userId: string,
  userProfile?: any
): Promise<{ flushedCount: number; mergedOperations: number; bytesSaved: number; error?: string }> {
  if (batchCommitTimer) {
    clearTimeout(batchCommitTimer);
    batchCommitTimer = null;
    nextBatchFlushTimestamp = null;
  }

  if (!userId || isFlushingQueue) {
    return { flushedCount: 0, mergedOperations: 0, bytesSaved: 0 };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    requestServiceWorkerBackgroundSync();
    notifyQueueListeners(userId);
    return {
      flushedCount: 0,
      mergedOperations: 0,
      bytesSaved: 0,
      error: 'Dispositivo offline. Mutações mantidas no buffer para sincronização automática.',
    };
  }

  const queue = getOfflineMutationQueue(userId);
  if (queue.length === 0) {
    notifyQueueListeners(userId);
    return { flushedCount: 0, mergedOperations: 0, bytesSaved: 0 };
  }

  isFlushingQueue = true;
  try {
    const client = getSupabaseClient();
    const consolidatedBundle = buildLocalSyncBundle(userId, userProfile);

    // Aplica todos os deltas acumulados no buffer de 5s sobre a bundle consolidada local
    for (const item of queue) {
      if (item.entity === 'currentLogs' && item.deltaPayload) {
        consolidatedBundle.currentLogs = {
          ...(consolidatedBundle.currentLogs || {}),
          ...item.deltaPayload,
        };
      } else if (item.entity === 'historyLogs' && item.deltaPayload) {
        consolidatedBundle.historyLogs = {
          ...(consolidatedBundle.historyLogs || {}),
          ...item.deltaPayload,
        };
      } else if (item.entity === 'settings' && item.deltaPayload) {
        consolidatedBundle.settings = {
          ...(consolidatedBundle.settings || {}),
          ...item.deltaPayload,
        };
      } else if (item.entity === 'routines') {
        consolidatedBundle.routines = item.deltaPayload;
      } else if (item.entity === 'sessions') {
        consolidatedBundle.sessions = item.deltaPayload;
      } else if (item.entity === 'measurements') {
        consolidatedBundle.measurements = item.deltaPayload;
      } else if (item.entity === 'workoutNotes') {
        consolidatedBundle.workoutNotes = item.deltaPayload;
      } else if (item.entity === 'activeRoutineId') {
        consolidatedBundle.activeRoutineId = item.deltaPayload;
      }
    }

    consolidatedBundle.updatedAt = new Date().toISOString();
    consolidatedBundle.version = (consolidatedBundle.version || 2) + 1;

    const fullBundleSize = JSON.stringify(consolidatedBundle).length;
    const totalMergedOps = queue.reduce((acc, item) => acc + (item.mergedCount || 1), 0);
    const deltaSize = queue.reduce((acc, item) => acc + (item.approxBytes || 64), 0);
    const savedNow = Math.max(256, fullBundleSize * totalMergedOps - deltaSize);
    const callsSavedNow = Math.max(0, totalMergedOps - 1);

    // Atualiza o cache Stale-While-Revalidate do Service Worker com o lote consolidado
    notifyServiceWorkerWorkoutSnapshot(consolidatedBundle);

    // Transmite o lote consolidado para outras abas locais via BroadcastChannel
    if (syncBroadcastChannel) {
      try {
        syncBroadcastChannel.postMessage({
          type: 'LOCAL_DELTA_SYNC_BROADCAST',
          userId,
          deltas: queue,
          bundle: consolidatedBundle,
        });
      } catch {}
    }

    // Faz 1 ÚNICA requisição de rede (Upsert direto) ao Supabase com todas as mutações agrupadas nos 5s
    if (client) {
      const { error } = await client.from('meutreino_sync').upsert(
        {
          user_id: userId,
          data: consolidatedBundle,
          updated_at: consolidatedBundle.updatedAt,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        isFlushingQueue = false;
        notifyQueueListeners(userId);
        return { flushedCount: 0, mergedOperations: 0, bytesSaved: 0, error: error.message };
      }
    }

    // Limpa o buffer confirmado e contabiliza economia de chamadas de rede (bateria) e dados móveis
    const flushedCount = queue.length;
    clearUserMutationBuffer(userId);
    const prevSavedBytes = getEstimatedMobileDataSavedBytes();
    safeStorage.set(OFFLINE_BYTES_SAVED_KEY, prevSavedBytes + savedNow);
    if (callsSavedNow > 0) {
      const prevCallsSaved = getBatchedNetworkCallsSaved();
      safeStorage.set(BATCHED_CALLS_SAVED_KEY, prevCallsSaved + callsSavedNow);
    }
    safeStorage.set(SUPABASE_LAST_SYNC_KEY, consolidatedBundle.updatedAt);
    isFlushingQueue = false;
    notifyQueueListeners(userId);

    return { flushedCount, mergedOperations: totalMergedOps, bytesSaved: savedNow };
  } catch (err: any) {
    isFlushingQueue = false;
    notifyQueueListeners(userId);
    return {
      flushedCount: 0,
      mergedOperations: 0,
      bytesSaved: 0,
      error: err?.message || 'Erro ao processar buffer de sincronização.',
    };
  }
}

export const SUPABASE_SETUP_SQL = `-- Copie e cole no SQL Editor do seu projeto Supabase para ativar a sincronização em tempo real:
create table if not exists public.meutreino_sync (
  user_id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Ativar RLS permissivo para sincronização dos atletas
alter table public.meutreino_sync enable row level security;

create policy "Permitir leitura para todos" 
  on public.meutreino_sync for select 
  using (true);

create policy "Permitir insercao e atualizacao para todos" 
  on public.meutreino_sync for insert 
  with check (true);

create policy "Permitir atualizacao para todos" 
  on public.meutreino_sync for update 
  using (true);

-- Habilitar Realtime
alter publication supabase_realtime add table public.meutreino_sync;
`;
