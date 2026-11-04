/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  User, 
  Scale, 
  Ruler, 
  Lock, 
  LogOut, 
  Sliders, 
  Save, 
  KeyRound, 
  Check, 
  AlertCircle,
  Award,
  Target,
  Sparkles,
  Calendar
} from 'lucide-react';
import { UserProfile, GenderOption, LevelOption, FocusOption } from '../types/workout';
import { authStorage, calculateDefaultBudget, getPresetWeights, scaleWeightsToBudget } from '../utils/auth';
import { ThemeToggle } from './ThemeToggle';
import { PrivacyShieldControl } from './PrivacyShieldControl';
import { usePrivacyMode, maskUsername, maskDisplayName, maskSensitiveValue } from '../utils/privacy';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  onOpenVolumeBudget: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onOpenVolumeBudget,
}) => {
  const [name, setName] = useState(user.name);
  const [weightKg, setWeightKg] = useState(user.weightKg);
  const [heightM, setHeightM] = useState(user.heightM);
  const [gender, setGender] = useState<GenderOption>(user.gender || 'male');
  const [level, setLevel] = useState<LevelOption>(user.level || 'beginner');
  const [focus, setFocus] = useState<FocusOption>(user.focus || 'v_taper');
  const [frequency, setFrequency] = useState<number>(user.frequency || 4);

  // Change password state
  const [showPassChange, setShowPassChange] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; error: boolean } | null>(null);

  const { isPrivacyHidden } = usePrivacyMode();
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // IMC (BMI) calculation
  const imc = heightM > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : '0';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = authStorage.updateProfile(user.id, {
      name: name.trim(),
      weightKg,
      heightM,
      gender,
      level,
      focus,
      frequency,
    });
    if (updated) {
      onUpdateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleApplyRecommendedBudget = () => {
    const recommendedBudget = calculateDefaultBudget(level, gender);
    const weights = getPresetWeights(focus);
    const newBudgets = scaleWeightsToBudget(weights, recommendedBudget);

    const updated = authStorage.updateProfile(user.id, {
      gender,
      level,
      focus,
      frequency,
      weeklyBudget: recommendedBudget,
      muscleBudgets: newBudgets,
    });
    if (updated) {
      onUpdateUser(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    const res = authStorage.changePassword(user.id, oldPass, newPass);
    if (!res.success) {
      setPassMsg({ text: res.error || 'Erro ao alterar senha.', error: true });
    } else {
      setPassMsg({ text: 'Senha alterada com sucesso!', error: false });
      setOldPass('');
      setNewPass('');
      setTimeout(() => {
        setPassMsg(null);
        setShowPassChange(false);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Perfil do Atleta
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {maskUsername(user.username, isPrivacyHidden)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PrivacyShieldControl user={user} variant="compact" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Info Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {isPrivacyHidden ? (
            <div className="p-3.5 rounded-2xl bg-[#0b1220] border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Dados Pessoais Ocultos</span>
                </span>
                <PrivacyShieldControl user={user} variant="inline" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-[#101828] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Nome</span>
                  <span className="text-white font-bold">{maskDisplayName(name, true)}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#101828] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Peso</span>
                  <span className="text-emerald-400 font-bold">{maskSensitiveValue(weightKg, 'kg', true)}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#101828] border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Estatura</span>
                  <span className="text-sky-400 font-bold">{maskSensitiveValue(heightM, 'm', true)}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome / Apelido
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Peso Corporal</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2.5 text-xs text-slate-500 font-mono">kg</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-sky-400" />
                    <span>Estatura</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.01"
                      value={heightM}
                      onChange={(e) => setHeightM(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2.5 text-xs text-slate-500 font-mono">m</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 1. SELEÇÃO DE SEXO */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              <span>Sexo Biológico</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'male'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">👨</span>
                <span>Masculino</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'female'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">👩</span>
                <span>Feminino</span>
              </button>
            </div>
          </div>

          {/* 2. SELEÇÃO DE NÍVEL DE TREINO */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Nível de Experiência</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLevel('beginner')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  level === 'beginner'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md font-black'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                }`}
              >
                <span className="block text-xs">Iniciante</span>
              </button>

              <button
                type="button"
                onClick={() => setLevel('intermediate')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  level === 'intermediate'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md font-black'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                }`}
              >
                <span className="block text-xs">Intermediário</span>
              </button>

              <button
                type="button"
                onClick={() => setLevel('advanced')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  level === 'advanced'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md font-black'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                }`}
              >
                <span className="block text-xs">Avançado</span>
              </button>
            </div>
          </div>

          {/* 3. SELEÇÃO DE FOCO DO TREINO */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>Foco Principal</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFocus('glutes')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  focus === 'glutes'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <span>🍑</span>
                  <span>Glúteos & Pernas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFocus('strength')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  focus === 'strength'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <span>🏋️</span>
                  <span>Força & Cargas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFocus('v_taper')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  focus === 'v_taper'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <span>🔱</span>
                  <span>Shape em V</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFocus('balanced')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  focus === 'balanced'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                    : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold">
                  <span>⚖️</span>
                  <span>Equilíbrio Total</span>
                </div>
              </button>
            </div>
          </div>

          {/* 4. SELEÇÃO DE FREQUÊNCIA SEMANAL */}
          <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Frequência Semanal</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-sky-400">
                {frequency}x por semana
              </span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[2, 3, 4, 5, 6].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                    frequency === freq
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md font-black'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-bold">{freq}x</span>
                  <span className="text-[9px] block text-slate-500 font-normal">dias</span>
                </button>
              ))}
            </div>
          </div>

          {/* IMC Pill */}
          <div className="bg-[#0b1220] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Índice de Massa Corporal (IMC):</span>
            <span className="font-mono font-black text-emerald-400">
              {isPrivacyHidden ? '••••' : imc} <span className="text-[10px] text-slate-500 font-normal">kg/m²</span>
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleApplyRecommendedBudget}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Aplicar Séries Recomendadas ({calculateDefaultBudget(level, gender)}s)</span>
            </button>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Perfil Atualizado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Dados do Perfil</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Action: Open Volume Budget & Theme Toggle */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <div className="p-3 rounded-2xl bg-[#0b1220] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-bold text-white block">Modo de Visualização (Dark / Light)</span>
              <span className="text-[10px] text-slate-400 block">
                Força o tema no localStorage e desativa a detecção automática
              </span>
            </div>
            <ThemeToggle variant="segmented" />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenVolumeBudget();
            }}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-[#131d31] hover:bg-[#192742] text-amber-300 border border-amber-500/30 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Séries Semanais</span>
            </div>
            <span className="font-mono font-black bg-amber-500/20 px-2 py-0.5 rounded text-[11px]">
              {user.weeklyBudget}s / sem
            </span>
          </button>
        </div>

        {/* Change Password Collapsible */}
        <div className="mt-3">
          {!showPassChange ? (
            <button
              type="button"
              onClick={() => setShowPassChange(true)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors py-1"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              <span>Alterar senha de acesso</span>
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-2.5 p-3 rounded-xl bg-[#0b1220] border border-slate-800 mt-2">
              <div className="text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>Alterar Senha</span>
                <button
                  type="button"
                  onClick={() => setShowPassChange(false)}
                  className="text-slate-500 hover:text-white text-[11px]"
                >
                  Cancelar
                </button>
              </div>

              {passMsg && (
                <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                  passMsg.error ? 'bg-rose-950/40 text-rose-300' : 'bg-emerald-950/40 text-emerald-300'
                }`}>
                  {passMsg.error ? <AlertCircle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  <span>{passMsg.text}</span>
                </div>
              )}

              <input
                type="password"
                required
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="Senha atual"
                className="w-full bg-[#101828] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Nova senha"
                className="w-full bg-[#101828] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Atualizar Senha
              </button>
            </form>
          )}
        </div>

        {/* Logout / Switch Profile */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Desconectar / Trocar de Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
