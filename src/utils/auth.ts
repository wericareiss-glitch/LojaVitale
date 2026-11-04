/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, MuscleGroup, GenderOption, LevelOption, FocusOption } from '../types/workout';
import { safeStorage } from './storage';
import { setPrivacyShieldState } from './privacy';

const USERS_KEY = 'alex_all_users';
const ACTIVE_USER_KEY = 'alex_active_user_id';
const HASH_PREFIX = 'mtp_hash_v1$';

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'quadriceps',
  'hamstrings',
  'shoulders',
  'rear_delts',
  'biceps',
  'triceps',
  'glutes',
  'calves',
  'abs',
];

function computeSaltedDigest(password: string, salt: string): string {
  const input = `${salt}::MTP_PEPPER_2026::${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i) + round;
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}${part3}`;
}

export function hashPassword(plainPassword: string, existingSalt?: string): string {
  if (!plainPassword) return '';
  if (plainPassword.startsWith(HASH_PREFIX)) return plainPassword;
  const salt = existingSalt || Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const digest = computeSaltedDigest(plainPassword, salt);
  return `${HASH_PREFIX}${salt}$${digest}`;
}

export function verifyPasswordHash(inputPassword: string, storedPassword: string): boolean {
  if (!storedPassword) return inputPassword === '';
  if (storedPassword.startsWith(HASH_PREFIX)) {
    const parts = storedPassword.split('$');
    const salt = parts[1] || '';
    const expected = parts[2] || '';
    const actual = computeSaltedDigest(inputPassword, salt);
    return actual === expected;
  }
  // Legacy fallback for pre-existing plaintext passwords
  return storedPassword === inputPassword;
}

function sanitizeUserProfile(user: UserProfile): UserProfile {
  return {
    ...user,
    password: '', // Never expose password or hash in runtime memory or exports
  };
}

/**
 * Calcula as séries semanais totais recomendadas com base no nível e sexo
 */
export function calculateDefaultBudget(level: LevelOption = 'beginner', gender: GenderOption = 'male'): number {
  const baseByLevel: Record<LevelOption, number> = {
    beginner: 60,
    intermediate: 85,
    advanced: 110,
  };
  let base = baseByLevel[level] || 75;
  if (gender === 'female') {
    base = Math.round(base * 1.05);
  }
  return base;
}

/**
 * Pesos proporcionais de distribuição conforme o foco escolhido pelo atleta
 */
export function getPresetWeights(focus: FocusOption = 'v_taper'): Record<MuscleGroup, number> {
  if (focus === 'glutes') {
    return {
      glutes: 20,
      hamstrings: 14,
      quadriceps: 15,
      back: 9,
      shoulders: 8,
      chest: 5,
      rear_delts: 6,
      biceps: 5,
      triceps: 5,
      calves: 7,
      abs: 6,
    };
  }
  if (focus === 'strength') {
    return {
      chest: 13,
      back: 14,
      quadriceps: 14,
      hamstrings: 11,
      shoulders: 10,
      triceps: 9,
      biceps: 8,
      glutes: 8,
      rear_delts: 5,
      calves: 4,
      abs: 4,
    };
  }
  if (focus === 'v_taper') {
    return {
      back: 15,
      shoulders: 14,
      chest: 13,
      quadriceps: 10,
      rear_delts: 9,
      biceps: 9,
      triceps: 9,
      hamstrings: 7,
      glutes: 5,
      calves: 5,
      abs: 4,
    };
  }
  return {
    chest: 10,
    back: 11,
    quadriceps: 11,
    hamstrings: 9,
    shoulders: 10,
    rear_delts: 7,
    biceps: 8,
    triceps: 8,
    glutes: 10,
    calves: 8,
    abs: 8,
  };
}

/**
 * Converte pesos proporcionais em número inteiro exato de séries somando totalBudget
 */
export function scaleWeightsToBudget(
  weights: Record<MuscleGroup, number>,
  totalBudget: number
): Record<MuscleGroup, number> {
  const sumWeights = Object.values(weights).reduce((acc, w) => acc + w, 0);
  const result = {} as Record<MuscleGroup, number>;
  let currentSum = 0;

  ALL_MUSCLE_GROUPS.forEach((m) => {
    const val = Math.max(2, Math.round(((weights[m] || 8) / sumWeights) * totalBudget));
    result[m] = val;
    currentSum += val;
  });

  const diff = totalBudget - currentSum;
  if (diff !== 0) {
    const topMuscle = ALL_MUSCLE_GROUPS.reduce((a, b) => (weights[a] >= weights[b] ? a : b));
    result[topMuscle] = Math.max(2, result[topMuscle] + diff);
  }

  return result;
}

export const BUDGET_PRESETS: Record<
  string,
  { name: string; icon: string; desc: string; weights: Record<MuscleGroup, number> }
> = {
  v_taper: {
    name: 'Shape em V (Estética Clássica)',
    icon: '🔱',
    desc: 'Ênfase em dorsais largos, deltóides laterais e peitoral superior.',
    weights: getPresetWeights('v_taper'),
  },
  glutes: {
    name: 'Foco em Glúteos & Inferiores',
    icon: '🍑',
    desc: 'Prioridade máxima para glúteos, posteriores e quadríceps.',
    weights: getPresetWeights('glutes'),
  },
  strength: {
    name: 'Força & Densidade (Powerbuilding)',
    icon: '🏋️',
    desc: 'Distribuição focada nos grandes levantamentos compostos.',
    weights: getPresetWeights('strength'),
  },
  balanced: {
    name: 'Equilíbrio Total (Simetria)',
    icon: '⚖️',
    desc: 'Volume harmônico entre membros superiores e inferiores.',
    weights: getPresetWeights('balanced'),
  },
};

export function createDefaultBudgets(
  totalBudget = 88,
  focus: FocusOption = 'v_taper'
): Record<MuscleGroup, number> {
  const weights = getPresetWeights(focus);
  return scaleWeightsToBudget(weights, totalBudget);
}

export const authStorage = {
  /**
   * Internal reader that automatically upgrades any legacy plaintext passwords to salted hashes
   */
  _getRawUsers(): UserProfile[] {
    const users = safeStorage.get<UserProfile[]>(USERS_KEY, []);
    let upgraded = false;
    const normalized = users.map((u) => {
      if (u.password && !u.password.startsWith(HASH_PREFIX)) {
        upgraded = true;
        return { ...u, password: hashPassword(u.password) };
      }
      return u;
    });
    if (upgraded) {
      safeStorage.set(USERS_KEY, normalized);
    }
    return normalized;
  },

  /**
   * Returns sanitized user profiles (passwords stripped)
   */
  getUsers(): UserProfile[] {
    return this._getRawUsers().map(sanitizeUserProfile);
  },

  hasRegisteredUsers(): boolean {
    return this._getRawUsers().length > 0;
  },

  saveUsers(users: UserProfile[]): void {
    const secured = users.map((u) => ({
      ...u,
      password: u.password && !u.password.startsWith(HASH_PREFIX) ? hashPassword(u.password) : u.password,
    }));
    safeStorage.set(USERS_KEY, secured);
  },

  getActiveUserId(): string | null {
    return safeStorage.get<string | null>(ACTIVE_USER_KEY, null);
  },

  setActiveUserId(id: string | null): void {
    if (id) {
      safeStorage.set(ACTIVE_USER_KEY, id);
    } else {
      safeStorage.remove(ACTIVE_USER_KEY);
    }
  },

  getActiveUser(): UserProfile | null {
    const id = this.getActiveUserId();
    if (!id) return null;
    const users = this._getRawUsers();
    const found = users.find((u) => u.id === id);
    return found ? sanitizeUserProfile(found) : null;
  },

  verifyUserPassword(userId: string, passwordAttempt: string): boolean {
    const users = this._getRawUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return false;
    if (user.isVisitor && !user.password) return true;
    return verifyPasswordHash(passwordAttempt, user.password);
  },

  createGuestUser(): UserProfile {
    const users = this._getRawUsers();
    const existingGuest = users.find((u) => u.username === 'visitante');
    if (existingGuest) {
      this.setActiveUserId(existingGuest.id);
      setPrivacyShieldState(true);
      return sanitizeUserProfile(existingGuest);
    }

    const budget = calculateDefaultBudget('intermediate', 'male');
    const newGuest: UserProfile = {
      id: 'user_guest_' + Date.now(),
      name: 'Atleta Visitante',
      username: 'visitante',
      password: '',
      isVisitor: true,
      weightKg: 75,
      heightM: 1.75,
      gender: 'male',
      level: 'intermediate',
      focus: 'balanced',
      frequency: 4,
      preferredSplit: 'upper_lower',
      exercisesPerMuscle: 1,
      weeklyBudget: budget,
      muscleBudgets: createDefaultBudgets(budget, 'balanced'),
      createdAt: new Date().toISOString(),
    };

    users.push(newGuest);
    this.saveUsers(users);
    this.setActiveUserId(newGuest.id);
    setPrivacyShieldState(true);
    return sanitizeUserProfile(newGuest);
  },

  convertVisitorToPermanent(
    userId: string,
    data: { name: string; username: string; password: string }
  ): { user?: UserProfile; error?: string } {
    const users = this._getRawUsers();
    const cleanUsername = data.username.trim().toLowerCase();

    if (!cleanUsername || !data.password || !data.name.trim()) {
      return { error: 'Preencha nome, usuário e senha para criar sua conta.' };
    }

    if (data.password.length < 4) {
      return { error: 'A senha deve ter pelo menos 4 caracteres para sua segurança.' };
    }

    if (users.some((u) => u.id !== userId && u.username.toLowerCase() === cleanUsername)) {
      return { error: 'Este nome de usuário já está em uso. Escolha outro.' };
    }

    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { error: 'Usuário não encontrado.' };

    users[idx] = {
      ...users[idx],
      name: data.name.trim(),
      username: cleanUsername,
      password: hashPassword(data.password),
      isVisitor: false,
    };

    this.saveUsers(users);
    setPrivacyShieldState(true);
    return { user: sanitizeUserProfile(users[idx]) };
  },

  register(data: Omit<UserProfile, 'id' | 'createdAt' | 'muscleBudgets'>): { user?: UserProfile; error?: string } {
    const users = this._getRawUsers();
    const cleanUsername = data.username.trim().toLowerCase();

    if (!cleanUsername || !data.password || !data.name.trim()) {
      return { error: 'Preencha todos os campos obrigatórios.' };
    }

    if (data.password.length < 4) {
      return { error: 'A senha deve ter pelo menos 4 caracteres para proteger seus dados.' };
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { error: 'Este nome de usuário já está cadastrado.' };
    }

    const budget = data.weeklyBudget || calculateDefaultBudget(data.level, data.gender);
    const focus = data.focus || 'v_taper';
    const newUser: UserProfile = {
      ...data,
      name: data.name.trim(),
      username: cleanUsername,
      password: hashPassword(data.password),
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      weeklyBudget: budget,
      muscleBudgets: createDefaultBudgets(budget, focus),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setActiveUserId(newUser.id);
    setPrivacyShieldState(true);
    return { user: sanitizeUserProfile(newUser) };
  },

  login(username: string, password: string): { user?: UserProfile; error?: string } {
    const users = this._getRawUsers();
    const cleanUsername = username.trim().toLowerCase();
    const found = users.find(
      (u) => u.username.toLowerCase() === cleanUsername && verifyPasswordHash(password, u.password)
    );
    if (!found) {
      return { error: 'Usuário ou senha incorretos.' };
    }
    this.setActiveUserId(found.id);
    setPrivacyShieldState(true);
    return { user: sanitizeUserProfile(found) };
  },

  logout(): void {
    this.setActiveUserId(null);
    setPrivacyShieldState(true);
  },

  deleteUser(userId: string): void {
    const users = this._getRawUsers().filter((u) => u.id !== userId);
    this.saveUsers(users);

    const keysToRemove = [
      `alex_u_${userId}_split`,
      `alex_u_${userId}_strategy`,
      `alex_u_${userId}_ex_per_muscle`,
      `alex_u_${userId}_weekly_budget`,
      `alex_u_${userId}_level`,
      `alex_u_${userId}_equip`,
      `alex_u_${userId}_routines`,
      `alex_u_${userId}_active_routine_id`,
      `alex_u_${userId}_active_routine_started_at`,
      `alex_u_${userId}_workout`,
      `alex_u_${userId}_workout_items`,
      `alex_u_${userId}_current_logs`,
      `alex_u_${userId}_history_logs`,
      `alex_u_${userId}_sessions`,
      `alex_u_${userId}_weekly_volume`,
      `alex_u_${userId}_workout_notes`,
      `alex_u_${userId}_measurements`,
      `alex_u_${userId}_has_init_routines`,
      `mtp_reminder_${userId}`,
      `mtp_feedback_history_${userId}`,
      `mtp_cardio_active_${userId}`,
      `mtp_cardio_logs_${userId}`,
      `mtp_water_tracker_${userId}`,
      `mtp_deload_${userId}`,
    ];
    keysToRemove.forEach((k) => safeStorage.remove(k));

    // Security fix: NEVER auto-login into another user's profile after deletion
    if (this.getActiveUserId() === userId) {
      this.setActiveUserId(null);
    }
    setPrivacyShieldState(true);
  },

  updateProfile(
    userId: string,
    updates: Partial<
      Pick<
        UserProfile,
        | 'name'
        | 'weightKg'
        | 'heightM'
        | 'age'
        | 'bodyFatPercent'
        | 'gender'
        | 'level'
        | 'focus'
        | 'frequency'
        | 'preferredSplit'
        | 'exercisesPerMuscle'
        | 'weeklyBudget'
        | 'muscleBudgets'
        | 'muscleTargetRir'
        | 'nutritionPlan'
      >
    >
  ): UserProfile | null {
    const users = this._getRawUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    users[idx] = { ...users[idx], ...updates };
    this.saveUsers(users);
    return sanitizeUserProfile(users[idx]);
  },

  changePassword(userId: string, oldPass: string, newPass: string): { success: boolean; error?: string } {
    const users = this._getRawUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };

    if (!verifyPasswordHash(oldPass, users[idx].password)) {
      return { success: false, error: 'A senha atual está incorreta.' };
    }
    if (!newPass || newPass.length < 4) {
      return { success: false, error: 'A nova senha deve ter pelo menos 4 caracteres.' };
    }

    users[idx].password = hashPassword(newPass);
    this.saveUsers(users);
    return { success: true };
  },

  importBackupFile(backupData: any): { user?: UserProfile; error?: string } {
    try {
      if (!backupData || !backupData.user || !backupData.user.username) {
        return { error: 'Arquivo JSON inválido ou não contém um perfil do MeuTreino Pro.' };
      }

      const importedUser: UserProfile = {
        ...backupData.user,
        password: backupData.user.password ? hashPassword(backupData.user.password) : '',
      };
      const users = this._getRawUsers();
      const existingIdx = users.findIndex(
        (u) => u.id === importedUser.id || u.username.toLowerCase() === importedUser.username.toLowerCase()
      );

      if (existingIdx >= 0) {
        // Preserve existing hashed password if backup stripped password
        const preservedPassword = importedUser.password || users[existingIdx].password;
        users[existingIdx] = { ...importedUser, id: users[existingIdx].id, password: preservedPassword };
        importedUser.id = users[existingIdx].id;
      } else {
        users.push(importedUser);
      }

      this.saveUsers(users);
      const uid = importedUser.id;
      this.setActiveUserId(uid);
      setPrivacyShieldState(true);

      if (backupData.settings) {
        if (backupData.settings.split) safeStorage.set(`alex_u_${uid}_split`, backupData.settings.split);
        if (backupData.settings.strategy) safeStorage.set(`alex_u_${uid}_strategy`, backupData.settings.strategy);
        if (backupData.settings.level) safeStorage.set(`alex_u_${uid}_level`, backupData.settings.level);
        if (backupData.settings.equip) safeStorage.set(`alex_u_${uid}_equip`, backupData.settings.equip);
        if (backupData.settings.weeklyBudget) safeStorage.set(`alex_u_${uid}_weekly_budget`, backupData.settings.weeklyBudget);
      }

      if (backupData.routines) safeStorage.set(`alex_u_${uid}_routines`, backupData.routines);
      if (backupData.measurements) safeStorage.set(`alex_u_${uid}_measurements`, backupData.measurements);
      if (backupData.workoutItems) safeStorage.set(`alex_u_${uid}_workout`, backupData.workoutItems);
      if (backupData.currentLogs) safeStorage.set(`alex_u_${uid}_current_logs`, backupData.currentLogs);
      if (backupData.historyLogs) safeStorage.set(`alex_u_${uid}_history_logs`, backupData.historyLogs);
      if (backupData.sessions) safeStorage.set(`alex_u_${uid}_sessions`, backupData.sessions);
      if (backupData.weeklyVolume) safeStorage.set(`alex_u_${uid}_weekly_volume`, backupData.weeklyVolume);
      if (backupData.workoutNotes !== undefined) safeStorage.set(`alex_u_${uid}_workout_notes`, backupData.workoutNotes);

      return { user: sanitizeUserProfile(importedUser) };
    } catch {
      return { error: 'Falha ao processar o arquivo de backup.' };
    }
  },
};
