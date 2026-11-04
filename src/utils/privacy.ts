/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { safeStorage } from './storage';

const PRIVACY_STORAGE_KEY = 'mtp_privacy_shield_active';
const PRIVACY_EVENT_NAME = 'meutreino:privacy-changed';

// Obfuscated creator contact/PIX key so it is never stored or rendered in plaintext
const OBFUSCATED_CREATOR_KEY = [
  97, 108, 101, 120, 46, 118, 105, 101, 105, 114, 97, 46, 49, 50, 51, 64,
  104, 111, 116, 109, 97, 105, 108, 46, 99, 111, 109,
];

export function getProtectedCreatorKey(): string {
  return String.fromCharCode(...OBFUSCATED_CREATOR_KEY);
}

export function getMaskedCreatorKey(): string {
  return 'al••••••••••@hotmail.com';
}

export function getMaskedCreatorName(): string {
  return 'Equipe MeuTreino Pro';
}

export function getPrivacyShieldState(): boolean {
  // Default to true (sensitive data hidden by default)
  return safeStorage.get<boolean>(PRIVACY_STORAGE_KEY, true);
}

export function setPrivacyShieldState(hidden: boolean): void {
  safeStorage.set(PRIVACY_STORAGE_KEY, hidden);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PRIVACY_EVENT_NAME, { detail: { hidden } })
    );
  }
}

export function maskSensitiveValue(
  value: string | number | undefined | null,
  unit = '',
  isHidden = true
): string {
  if (isHidden) {
    return unit ? `•••• ${unit}` : '••••';
  }
  if (value === undefined || value === null || value === '') {
    return '—';
  }
  return unit ? `${value} ${unit}` : String(value);
}

export function maskUsername(username: string | undefined, isHidden = true): string {
  if (!username) return '@••••••';
  if (isHidden) {
    return '@••••••';
  }
  if (username.length <= 3) return `@${username[0]}••`;
  return `@${username.slice(0, 2)}${'•'.repeat(Math.min(5, username.length - 2))}`;
}

export function maskDisplayName(name: string | undefined, isHidden = true): string {
  if (!name) return 'Atleta';
  if (!isHidden) return name;
  const trimmed = name.trim();
  if (trimmed.length <= 2) return `${trimmed[0]}••`;
  const parts = trimmed.split(/\s+/);
  const first = parts[0];
  return `${first.slice(0, 2)}${'•'.repeat(Math.min(4, Math.max(2, first.length - 2)))}`;
}

export function usePrivacyMode() {
  const [isPrivacyHidden, setIsPrivacyHidden] = useState<boolean>(() =>
    getPrivacyShieldState()
  );

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<{ hidden: boolean }>;
      if (custom.detail && typeof custom.detail.hidden === 'boolean') {
        setIsPrivacyHidden(custom.detail.hidden);
      } else {
        setIsPrivacyHidden(getPrivacyShieldState());
      }
    };
    window.addEventListener(PRIVACY_EVENT_NAME, handleSync);
    return () => window.removeEventListener(PRIVACY_EVENT_NAME, handleSync);
  }, []);

  const lockPrivacy = useCallback(() => {
    setPrivacyShieldState(true);
    setIsPrivacyHidden(true);
  }, []);

  const unlockPrivacy = useCallback(() => {
    setPrivacyShieldState(false);
    setIsPrivacyHidden(false);
  }, []);

  const togglePrivacy = useCallback(() => {
    const next = !getPrivacyShieldState();
    setPrivacyShieldState(next);
    setIsPrivacyHidden(next);
  }, []);

  return {
    isPrivacyHidden,
    lockPrivacy,
    unlockPrivacy,
    togglePrivacy,
  };
}
