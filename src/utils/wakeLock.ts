/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Screen Wake Lock API Helper
// Mantém a tela do celular ligada durante o treino ativo para não bloquear no bolso ou no banco

class ScreenWakeLockManager {
  private sentinel: any = null;
  private isRequested = false;
  private listeners: Set<(active: boolean) => void> = new Set();

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'wakeLock' in navigator;
  }

  public isActive(): boolean {
    return !!this.sentinel;
  }

  public subscribe(cb: (active: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isActive());
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const active = this.isActive();
    this.listeners.forEach((cb) => {
      try {
        cb(active);
      } catch {}
    });
  }

  async request(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      this.isRequested = true;
      if (this.sentinel) {
        return true;
      }
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.notify();

      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        this.notify();
        // Se foi liberado pelo sistema (ex: tela bloqueada ou troca de app), readquire automaticamente ao voltar
        if (this.isRequested && document.visibilityState === 'visible') {
          this.request().catch(() => {});
        }
      });

      return true;
    } catch {
      return false;
    }
  }

  async release(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {}
      this.sentinel = null;
      this.notify();
    }
  }

  // Readquire automaticamente quando o atleta volta ao navegador
  bindVisibilityListener(): () => void {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.isRequested && !this.sentinel) {
        this.request().catch(() => {});
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible' && this.isRequested && !this.sentinel) {
        this.request().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
    };
  }
}

export const wakeLockManager = new ScreenWakeLockManager();
