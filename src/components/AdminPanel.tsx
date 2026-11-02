import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Lock, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Check, 
  Eye, 
  EyeOff, 
  DollarSign, 
  Clock, 
  Tag, 
  LogOut, 
  Search,
  Sparkles,
  AlertTriangle,
  ImageIcon,
  Key
} from 'lucide-react';
import { Procedure } from '../types';
import { api } from '../services/api';
import { isAvaliacaoProcedure } from '../utils/packages';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: Procedure[];
  onProceduresUpdated: () => void;
  onOpenMpSettings?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  procedures,
  onProceduresUpdated,
  onOpenMpSettings,
  showToast,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => api.isAdminAuthenticated());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Edit / Create State
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<Procedure>>({});
  const [newBenefitText, setNewBenefitText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setLoginError('Digite o usuário de acesso.');
      return;
    }
    if (!password.trim()) {
      setLoginError('Digite a senha de administrador.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await api.adminLogin(password.trim(), username.trim());
      if (res.success) {
        setIsAuthenticated(true);
        setPassword('');
        setUsername('');
        showToast('Login de administrador realizado com sucesso!', 'success');
      } else {
        setLoginError(res.error || 'Usuário ou senha incorretos. Tente novamente.');
      }
    } catch {
      setLoginError('Erro ao autenticar. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    api.adminLogout();
    setIsAuthenticated(false);
    setEditingProcedure(null);
    setIsCreatingNew(false);
    showToast('Você saiu do painel administrativo.', 'info');
  };

  // Open Edit Form
  const handleStartEdit = (proc: Procedure) => {
    setEditingProcedure(proc);
    setIsCreatingNew(false);
    setFormData({
      ...proc,
      benefits: [...(proc.benefits || [])],
    });
  };

  // Open Create Form
  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setEditingProcedure(null);
    setFormData({
      id: `proc-${Date.now()}`,
      name: '',
      category: 'facial',
      price: 250,
      duration: '45 min',
      sessions: '1 sessão',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80',
      description: '',
      benefits: ['Atendimento com hora marcada na sua residência', 'Kits cirúrgicos descartáveis de uso único'],
    });
  };

  // Save changes
  const handleSaveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('O título do procedimento é obrigatório.', 'error');
      return;
    }
    if (formData.price === undefined || Number(formData.price) < 0) {
      showToast('Insira um valor válido para o procedimento.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (isCreatingNew) {
        await api.createProcedure(formData);
        showToast(`Procedimento "${formData.name}" cadastrado com sucesso!`, 'success');
      } else if (editingProcedure) {
        await api.updateProcedure(editingProcedure.id, formData);
        showToast(`Procedimento "${formData.name}" atualizado com sucesso!`, 'success');
      }
      onProceduresUpdated();
      setEditingProcedure(null);
      setIsCreatingNew(false);
    } catch {
      showToast('Erro ao salvar procedimento.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDeleteProcedure = async (id: string, name: string) => {
    try {
      await api.deleteProcedure(id);
      showToast(`Procedimento "${name}" excluído.`, 'info');
      setDeleteConfirmId(null);
      onProceduresUpdated();
    } catch {
      showToast('Erro ao excluir procedimento.', 'error');
    }
  };

  // Reset to default procedures
  const handleConfirmResetDefaults = async () => {
    setIsConfirmingReset(false);
    try {
      await api.resetProcedures();
      showToast('Procedimentos restaurados para o padrão original!', 'success');
      onProceduresUpdated();
    } catch {
      showToast('Erro ao restaurar procedimentos.', 'error');
    }
  };

  // Add / Remove benefit tag
  const handleAddBenefit = () => {
    if (!newBenefitText.trim()) return;
    const current = formData.benefits || [];
    setFormData({
      ...formData,
      benefits: [...current, newBenefitText.trim()],
    });
    setNewBenefitText('');
  };

  const handleRemoveBenefit = (index: number) => {
    const current = formData.benefits || [];
    setFormData({
      ...formData,
      benefits: current.filter((_, i) => i !== index),
    });
  };

  // Filtered list
  const filteredProcedures = procedures.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-onyx-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-onyx-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-bold text-white tracking-wide">
                  Painel de Gestão Vitale
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  Concierge Teresina
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Altere títulos, fotos, descrições, benefícios e valores dos procedimentos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sair do painel administrativo"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (when authenticated) */}
        {isAuthenticated && (
          <div className="px-6 py-2.5 bg-onyx-950 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 bg-gold-500 text-onyx-950 shadow-md font-bold">
                <Tag className="w-3.5 h-3.5" />
                <span>Catálogo de Procedimentos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-onyx-950/20 text-onyx-950 font-bold">
                  {procedures.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onOpenMpSettings && (
                <button
                  type="button"
                  onClick={onOpenMpSettings}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#009EE3]/15 hover:bg-[#009EE3]/25 text-[#009EE3] border border-[#009EE3]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Configurar chaves e credenciais da API Mercado Pago"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Chaves Mercado Pago</span>
                </button>
              )}
              <div className="text-xs text-neutral-400 hidden sm:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Modo Gestão Ativo</span>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!isAuthenticated ? (
            /* Login Form */
            <div className="max-w-md mx-auto py-12">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 mx-auto mb-3 shadow-lg shadow-gold-500/5">
                  <Lock className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-serif font-bold text-white mb-1">
                  Acesso Restrito à Gestão
                </h4>
                <p className="text-sm text-neutral-400">
                  Informe sua senha de administrador para gerenciar procedimentos e valores.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 bg-onyx-950 p-6 rounded-xl border border-white/10">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Usuário / Login
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="Digite seu login..."
                    className="w-full bg-onyx-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500/50"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLoginError('');
                      }}
                      placeholder="Digite sua senha..."
                      className="w-full bg-onyx-900 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {loginError}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-[11px] text-neutral-400">
                  <span className="text-gold-400 font-semibold">Painel Restrito:</span> Acesso exclusivo para edição de valores, pacotes e visualização de agenda de atendimentos.
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-onyx-950 font-bold py-2.5 rounded-lg text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <span>Verificando...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Entrar no Painel
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : editingProcedure || isCreatingNew ? (
            /* Procedure Editor (Create / Edit) */
            <form onSubmit={handleSaveProcedure} className="space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    {isCreatingNew ? (
                      <>
                        <Plus className="w-5 h-5 text-gold-400" /> Cadastrar Novo Procedimento
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-5 h-5 text-gold-400" /> Editando: {editingProcedure?.name}
                      </>
                    )}
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Use títulos convidativos, valores justos e descrições fáceis de entender.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProcedure(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
                >
                  Voltar à Lista
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Título Comercial do Procedimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Seca Barriga & Queima de Gordura Localizada"
                    className="w-full bg-onyx-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Dica: use termos claros que vendam o benefício principal (ex: "Seca Barriga", "Shot de Energia", "Limpeza de Pele Sem Dor").
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.category || 'facial'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-onyx-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="facial">Facial</option>
                    <option value="injetaveis">Injetáveis</option>
                    <option value="corporal">Corporal</option>
                    <option value="massagens">Massagens & Relaxamento</option>
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-gold-400" /> Valor do Procedimento (R$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={formData.price ?? ''}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="Ex: 580"
                    className="w-full bg-onyx-950 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-gold-300 placeholder-neutral-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" /> Duração Estimada
                  </label>
                  <input
                    type="text"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="Ex: 50 min"
                    className="w-full bg-onyx-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                {/* Sessions */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Formato da Sessão
                  </label>
                  <input
                    type="text"
                    value={formData.sessions || ''}
                    onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                    placeholder="Ex: 1 sessão completa"
                    className="w-full bg-onyx-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-neutral-400" /> URL da Foto de Destaque
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="url"
                      value={formData.image || ''}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 bg-onyx-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500"
                    />
                    {formData.image && (
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-white/10"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80';
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Descrição Comercial (focada em vendas e fácil entendimento) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Explique o que é o procedimento, como ele resolve a dor do paciente e por que vale a pena..."
                    className="w-full bg-onyx-950 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                {/* Benefits List */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gold-400" /> Benefícios e Vantagens (Bullets de destaque)
                  </label>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newBenefitText}
                      onChange={(e) => setNewBenefitText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBenefit();
                        }
                      }}
                      placeholder="Adicione uma vantagem (ex: 'Sem repouso ou pós-operatório')"
                      className="flex-1 bg-onyx-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddBenefit}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(formData.benefits || []).map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-3 py-2 bg-onyx-950 rounded-lg border border-white/5 text-xs text-neutral-300"
                      >
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                          {benefit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(index)}
                          className="text-neutral-500 hover:text-red-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProcedure(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-onyx-950 font-bold rounded-lg text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : <><Check className="w-4 h-4" /> Salvar Alterações</>}
                </button>
              </div>
            </form>
          ) : (
            /* Procedures Dashboard / List */
            <div className="space-y-6">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-onyx-950 p-4 rounded-xl border border-white/10">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar procedimento por nome ou detalhe..."
                    className="w-full bg-onyx-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleStartCreate}
                    className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-onyx-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Novo Procedimento
                  </button>

                  {isConfirmingReset ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs">
                      <span className="text-amber-300 text-[11px] font-bold">Restaurar originais?</span>
                      <button
                        onClick={handleConfirmResetDefaults}
                        className="px-2 py-0.5 rounded bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-500"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setIsConfirmingReset(false)}
                        className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 text-[11px] hover:bg-white/20"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingReset(true)}
                      className="px-3 py-2 border border-white/10 hover:border-gold-500/30 text-neutral-400 hover:text-gold-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                      title="Restaurar textos e procedimentos originais de alta conversão"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrões
                    </button>
                  )}
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'facial', label: 'Facial' },
                  { id: 'injetaveis', label: 'Injetáveis' },
                  { id: 'corporal', label: 'Corporal' },
                  { id: 'massagens', label: 'Massagens' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-gold-500 text-onyx-950'
                        : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
                <span className="text-xs text-neutral-500 ml-auto pl-2">
                  {filteredProcedures.length} de {procedures.length} procedimentos
                </span>
              </div>

              {/* Procedures Cards List */}
              <div className="grid grid-cols-1 gap-3">
                {filteredProcedures.map((proc) => {
                  const isDeleting = deleteConfirmId === proc.id;

                  return (
                    <div
                      key={proc.id}
                      className="p-4 bg-onyx-950/80 rounded-xl border border-white/5 hover:border-gold-500/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <img
                          src={proc.image}
                          alt={proc.name}
                          className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                          onError={(e) => {
                            (e.target as any).src = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80';
                          }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-white text-sm">
                              {proc.name}
                            </h5>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-white/5 text-neutral-400 border border-white/10">
                              {proc.category}
                            </span>
                            {proc.id === 'consulta-avaliacao' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Abate R$ 100 no carrinho
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                            {proc.description}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-neutral-500 pt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neutral-400" /> {proc.duration}
                            </span>
                            <span>•</span>
                            <span>{isAvaliacaoProcedure(proc) ? 'Avaliação Individual' : proc.sessions}</span>
                            <span>•</span>
                            <span>{proc.benefits?.length || 0} benefícios listados</span>
                          </div>
                        </div>
                      </div>

                      {/* Price and Actions */}
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <div className="text-left sm:text-right">
                          <div className="text-xs text-neutral-500">Valor Atual</div>
                          <div className="font-serif font-bold text-gold-400 text-lg">
                            R$ {proc.price.toFixed(2).replace('.', ',')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isDeleting ? (
                            <div className="flex items-center gap-1 bg-red-500/10 p-1 rounded-lg border border-red-500/20">
                              <span className="text-[10px] text-red-300 font-semibold px-1">Excluir?</span>
                              <button
                                onClick={() => handleDeleteProcedure(proc.id, proc.name)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(proc)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-gold-300 transition-colors"
                                title="Editar título, detalhes e valor"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(proc.id)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                                title="Excluir procedimento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredProcedures.length === 0 && (
                  <div className="text-center py-12 text-neutral-500 bg-onyx-950 rounded-xl border border-white/5">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-gold-400" />
                    <p className="text-sm">Nenhum procedimento encontrado.</p>
                    <button
                      onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                      className="mt-2 text-xs text-gold-400 underline"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-white/10 bg-onyx-950 text-neutral-500 text-[11px] flex items-center justify-between">
          <span>Vitale Concierge • Gestão de Procedimentos & Agenda Domiciliar</span>
          <span>Sincronizado com API e Armazenamento Local</span>
        </div>

      </div>
    </div>
  );
};
