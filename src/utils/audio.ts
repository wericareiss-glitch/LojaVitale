/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private silentAudioEl: HTMLAudioElement | null = null;
  private isKeepAliveActive: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioClass) {
        this.ctx = new AudioClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Ativa reprodução de áudio silencioso em loop contínuo.
   * No iOS Safari e Android Chrome, uma tag <audio loop> ativa impede que o sistema operacional
   * suspenda os timers e o processo da aba quando a tela é desligada com o botão de energia.
   */
  public startBackgroundKeepAlive() {
    if (typeof window === 'undefined') return;
    if (this.isKeepAliveActive && this.silentAudioEl) return;

    try {
      if (!this.silentAudioEl) {
        // WAV silencioso de 1 segundo em base64
        const silentWavBase64 = 'data:audio/wav;base64,UklGRigAAABXQVZFRm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const audio = new Audio(silentWavBase64);
        audio.loop = true;
        audio.volume = 0.01; // Quase inaudível, mas ativo para o SO
        this.silentAudioEl = audio;
      }
      
      const playPromise = this.silentAudioEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isKeepAliveActive = true;
          })
          .catch(() => {
            // Autoplay policy pode barrar até a 1ª interação do usuário
          });
      }
    } catch {
      // Ignora falhas se mídia desabilitada
    }
  }

  public stopBackgroundKeepAlive() {
    if (this.silentAudioEl) {
      try {
        this.silentAudioEl.pause();
        this.silentAudioEl.currentTime = 0;
      } catch {}
      this.isKeepAliveActive = false;
    }
  }

  public playTone(freq: number, duration: number = 0.12, type: OscillatorType = 'sine') {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio playback fails silently in case of unsupported policy
    }
  }

  public playTimerFinish() {
    // Tom de alerta potente e nítido mesmo de dentro do bolso
    this.playTone(880, 0.25);
    setTimeout(() => {
      this.playTone(1174.66, 0.45); // D6
    }, 180);
    setTimeout(() => {
      this.playTone(1318.51, 0.5); // E6
    }, 400);
  }

  public playCelebration() {
    // Fanfarra vitoriosa (C5, E5, G5, C6)
    this.playTone(523.25, 0.12, 'triangle');
    setTimeout(() => this.playTone(659.25, 0.12, 'triangle'), 110);
    setTimeout(() => this.playTone(783.99, 0.15, 'triangle'), 220);
    setTimeout(() => this.playTone(1046.50, 0.45, 'triangle'), 340);
  }

  public playPRCelebration() {
    // Fanfarra triunfal especial para Novo Recorde Pessoal (PR)
    this.playTone(587.33, 0.12, 'square'); // D5
    setTimeout(() => this.playTone(739.99, 0.14, 'square'), 120); // F#5
    setTimeout(() => this.playTone(880.00, 0.16, 'square'), 240); // A5
    setTimeout(() => this.playTone(1174.66, 0.5, 'square'), 380); // D6
    this.vibrate([100, 50, 150, 50, 300]);
  }

  public playWarningBeep() {
    this.playTone(480, 0.08);
  }

  public playCountdownBeep(secondsRemaining: number) {
    if (this.isMuted) return;
    if (secondsRemaining === 3) {
      this.playTone(440, 0.1, 'sine');
      this.vibrate(50);
    } else if (secondsRemaining === 2) {
      this.playTone(554.37, 0.1, 'sine');
      this.vibrate(60);
    } else if (secondsRemaining === 1) {
      this.playTone(659.25, 0.12, 'sine');
      this.vibrate(80);
    }
  }

  public vibrateSetComplete() {
    this.vibrate([70, 50, 120]);
  }

  public vibrate(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe fallback if vibration permissions rejected
      }
    }
  }
}

export const soundManager = new SoundManager();
