import React, { useState } from 'react';
import { 
  LogIn, 
  UserPlus, 
  Dumbbell, 
  Lock, 
  User, 
  Scale, 
  Ruler, 
  Zap, 
  AlertCircle, 
  Target, 
  Award, 
  Sparkles, 
  Check, 
  Calendar,
  Layers,
  Hash,
  Upload
} from 'lucide-react';
import { UserProfile, GenderOption, LevelOption, FocusOption, SplitOption } from '../types/workout';
import { authStorage, calculateDefaultBudget } from '../utils/auth';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>(() => {
    return authStorage.hasRegisteredUsers() ? 'login' : 'register';
  });
  const [error, setError] = useState<string | null>(null);

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regWeight, setRegWeight] = useState(72);
  const [regHeight, setRegHeight] = useState(1.72);

  const [regGender, setRegGender] = useState<GenderOption>('male');
  const [regLevel, setRegLevel] = useState<LevelOption>('beginner');
  const [regFocus, setRegFocus] = useState<FocusOption>('glutes');
  const [regFrequency, setRegFrequency] = useState<number>(4);
  const [regSplit, setRegSplit] = useState<SplitOption>('fullbody');

  if (!isOpen) return null;

  const handleQuickGuest = () => {
    const guest = authStorage.createGuestUser();
    onSuccess(guest);
  };

  const handleImportBackupAuth = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const res = authStorage.importBackupFile(parsed);
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          onSuccess(res.user);
        }
      } catch {
        setError('Arquivo de backup inválido ou corrompido.');
      }
    };
    reader.readAsText(file);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = authStorage.login(loginUsername, loginPassword);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.user) {
      onSuccess(res.user);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regPasswordConfirm) {
      setError('A confirmação de senha não confere.');
      return;
    }

    const calculatedBudget = calculateDefaultBudget(regLevel, regGender);

    const res = authStorage.register({
      name: regName,
      username: regUsername,
      password: regPassword,
      weightKg: regWeight,
      heightM: regHeight,
      gender: regGender,
      level: regLevel,
      focus: regFocus,
      frequency: regFrequency,
      preferredSplit: regSplit,
      exercisesPerMuscle: 1,
      weeklyBudget: calculatedBudget,
    });

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.user) {
      onSuccess(res.user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101828] border border-[#1e2c45] rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl relative">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Banner */}
        <div className="text-center mb-5">
          <div className="w-11 h-11 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 mb-2.5">
            <Dumbbell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            MeuTreino Pro · Hipertrofia Individualizada
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Crie seu perfil e receba metas sob medida para o seu objetivo
          </p>
        </div>

        {/* Quick Guest Exploration Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleQuickGuest}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-sky-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>Entrar rapidamente como visitante</span>
          </button>
        </div>

        {/* Segmented Tab Control */}
        <div className="grid grid-cols-2 p-1 bg-[#0b1220] rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Perfil</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Tab */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome de Usuário
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-500 absolute left-3" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="ex: alex"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Senha
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="submit"
                className="w-full py-3 px-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Acessar Meu Perfil</span>
              </button>
              <label className="w-full py-3 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Restaurar Cópia Salva</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupAuth}
                  className="hidden"
                />
              </label>
            </div>

          </form>
        ) : (
          /* Register Tab */
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nome / Apelido
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: Carlos ou Camila"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nome de Usuário (login)
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Ex: carlos_fit"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  required
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 1. SELEÇÃO DE SEXO */}
            <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                1. Sexo Biológico
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegGender('male')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    regGender === 'male'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-base">👨</span>
                  <span>Masculino</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegGender('female')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    regGender === 'female'
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
                <span>2. Nível de Experiência</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRegLevel('beginner')}
                  className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    regLevel === 'beginner'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md font-black'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                  }`}
                >
                  <span className="block text-xs">Iniciante</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegLevel('intermediate')}
                  className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    regLevel === 'intermediate'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md font-black'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white font-bold'
                  }`}
                >
                  <span className="block text-xs">Intermediário</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegLevel('advanced')}
                  className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    regLevel === 'advanced'
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
                <span>3. Foco Principal do Treino</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegFocus('glutes')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regFocus === 'glutes'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>🍑</span>
                    <span>Glúteos & Pernas</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Máxima ênfase em glúteo, posterior e quadríceps
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegFocus('strength')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regFocus === 'strength'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>🏋️</span>
                    <span>Força & Cargas</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Grandes compostos para força e densidade
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegFocus('v_taper')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regFocus === 'v_taper'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>🔱</span>
                    <span>Shape em V</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Costas largas, ombros e peitoral destacado
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegFocus('balanced')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    regFocus === 'balanced'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                      : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>⚖️</span>
                    <span>Equilíbrio Total</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Harmonia e simetria para o corpo inteiro
                  </span>
                </button>
              </div>
            </div>

            {/* 4. SELEÇÃO DE FREQUÊNCIA SEMANAL */}
            <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>4. Frequência Semanal</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-sky-400">
                  {regFrequency}x por semana
                </span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[2, 3, 4, 5, 6].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => {
                      setRegFrequency(freq);
                      if (freq === 2) setRegSplit('upper_lower');
                      else if (freq === 3) setRegSplit('ppl');
                      else if (freq === 4) setRegSplit('upper_lower');
                      else if (freq === 5) setRegSplit('abcde');
                      else setRegSplit('ppl');
                    }}
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      regFrequency === freq
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

            {/* 5. SELEÇÃO DE DIVISÃO MUSCULAR (SPLIT) */}
            <div className="bg-[#0b1220] p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5. Divisão de Treino</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {regSplit === 'fullbody'
                    ? 'Full Body'
                    : regSplit === 'abcde'
                    ? 'ABCDE (5 Dias)'
                    : regSplit === 'upper_lower'
                    ? 'Upper / Lower'
                    : regSplit === 'ppl'
                    ? 'Push Pull Legs'
                    : regSplit === 'lower'
                    ? 'Foco Inferiores'
                    : regSplit === 'upper'
                    ? 'Foco Superiores'
                    : 'PPL Clássico'}
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'fullbody', label: 'Full Body', desc: 'Corpo Todo' },
                  { id: 'abcde', label: 'ABCDE', desc: '5 Dias' },
                  { id: 'upper_lower', label: 'Upper / Lower', desc: 'Sup. & Inf.' },
                  { id: 'ppl', label: 'PPL', desc: 'Push Pull Legs' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRegSplit(s.id as SplitOption)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      regSplit === s.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md font-black'
                        : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-bold">{s.label}</span>
                    <span className="text-[9px] block text-slate-500 font-normal">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dados Corporais */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Peso Corporal (kg)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={regWeight}
                  onChange={(e) => setRegWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-sky-400" />
                  <span>Altura (m)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={regHeight}
                  onChange={(e) => setRegHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0b1220] border border-slate-700/80 rounded-xl px-3 py-2 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Descrição informando que o treino será gerado com base nas respostas */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-sky-950/30 border border-emerald-500/20 text-slate-300 text-xs">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Seu treino será gerado baseado no seu <strong className="text-white">sexo</strong>, <strong className="text-white">nível de experiência</strong>, <strong className="text-white">foco</strong>, <strong className="text-white">frequência semanal</strong> e <strong className="text-white">volume alvo</strong>.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-1 py-3.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Perfil & Gerar Treinos</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
