/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  Scale, 
  Ruler, 
  Calendar, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Sparkles, 
  Check, 
  Image as ImageIcon,
  ArrowRightLeft,
  Lock
} from 'lucide-react';
import { BodyMeasurement, UserProfile } from '../types/workout';
import { PrivacyShieldControl } from './PrivacyShieldControl';
import { usePrivacyMode, maskSensitiveValue } from '../utils/privacy';

interface BodyMeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  measurements: BodyMeasurement[];
  onSaveMeasurement: (m: BodyMeasurement) => void;
  onDeleteMeasurement: (id: string) => void;
}

export const BodyMeasurementsModal: React.FC<BodyMeasurementsModalProps> = ({
  isOpen,
  onClose,
  user = null,
  measurements,
  onSaveMeasurement,
  onDeleteMeasurement,
}) => {
  const { isPrivacyHidden } = usePrivacyMode();
  const [activeSubTab, setActiveSubTab] = useState<'new' | 'history' | 'compare'>('new');

  // New entry form state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState<number>(75);
  const [waistCm, setWaistCm] = useState<string>('');
  const [chestCm, setChestCm] = useState<string>('');
  const [armsCm, setArmsCm] = useState<string>('');
  const [thighsCm, setThighsCm] = useState<string>('');
  const [calvesCm, setCalvesCm] = useState<string>('');
  const [hipsCm, setHipsCm] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Photos (base64)
  const [photoFront, setPhotoFront] = useState<string | undefined>(undefined);
  const [photoBack, setPhotoBack] = useState<string | undefined>(undefined);
  const [photoSide, setPhotoSide] = useState<string | undefined>(undefined);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Comparison selector
  const [compareIdA, setCompareIdA] = useState<string>(() => measurements[measurements.length - 1]?.id || '');
  const [compareIdB, setCompareIdB] = useState<string>(() => measurements[0]?.id || '');

  React.useEffect(() => {
    if (measurements.length === 0) return;
    const oldestId = measurements[measurements.length - 1]?.id || '';
    const newestId = measurements[0]?.id || '';
    const validA = measurements.some((m) => m.id === compareIdA);
    const validB = measurements.some((m) => m.id === compareIdB);
    if (!validA) setCompareIdA(oldestId);
    if (!validB) setCompareIdB(newestId);
    if (measurements.length >= 2 && compareIdA === compareIdB) {
      setCompareIdA(oldestId);
      setCompareIdB(newestId);
    }
  }, [measurements, compareIdA, compareIdB]);

  const formatDelta = (valB?: number, valA?: number, unit = 'cm') => {
    if (valA === undefined || valB === undefined) return '—';
    const diff = valB - valA;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)} ${unit}`;
  };

  // Helper to compress image to max 800px to keep storage light and fast
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 'front' | 'back' | 'side') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 700;
        const scaleSize = MAX_WIDTH / Math.max(img.width, img.height);
        const width = img.width > MAX_WIDTH ? img.width * scaleSize : img.width;
        const height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          if (slot === 'front') setPhotoFront(compressed);
          if (slot === 'back') setPhotoBack(compressed);
          if (slot === 'side') setPhotoSide(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: BodyMeasurement = {
      id: `measure_${Date.now()}`,
      date,
      weightKg: Number(weightKg) || 0,
      waistCm: waistCm ? parseFloat(waistCm) : undefined,
      chestCm: chestCm ? parseFloat(chestCm) : undefined,
      armsCm: armsCm ? parseFloat(armsCm) : undefined,
      thighsCm: thighsCm ? parseFloat(thighsCm) : undefined,
      calvesCm: calvesCm ? parseFloat(calvesCm) : undefined,
      hipsCm: hipsCm ? parseFloat(hipsCm) : undefined,
      photoFront,
      photoBack,
      photoSide,
      notes: notes.trim() || undefined,
    };

    onSaveMeasurement(newEntry);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveSubTab('history');
    }, 1200);
  };

  const itemA = measurements.find((m) => m.id === compareIdA) || measurements[measurements.length - 1];
  const itemB = measurements.find((m) => m.id === compareIdB) || measurements[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-[#223354] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Diário de Medições & Fotos de Evolução
              </h2>
              <p className="text-xs text-slate-400">
                Check-in corporal, perímetros musculares e fotos antes/depois
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PrivacyShieldControl user={user} variant="compact" />
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-[#0d1424]/60 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('new')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'new'
                ? 'bg-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            + Novo Check-in
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Histórico ({measurements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('compare')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'compare'
                ? 'bg-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Comparador Lado a Lado
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 relative z-10">
          {/* TAB 1: NEW ENTRY */}
          {activeSubTab === 'new' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Data do Registro
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Peso Corporal (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Perímetros Musculares */}
              <div className="bg-[#0b1322] p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-teal-400" />
                  <span>Circunferências Corporais (cm - Opcional)</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Braço</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 38.5"
                      value={armsCm}
                      onChange={(e) => setArmsCm(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Cintura</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 82"
                      value={waistCm}
                      onChange={(e) => setWaistCm(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Tórax</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 104"
                      value={chestCm}
                      onChange={(e) => setChestCm(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Coxa</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 61"
                      value={thighsCm}
                      onChange={(e) => setThighsCm(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Quadril</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 98"
                      value={hipsCm}
                      onChange={(e) => setHipsCm(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Panturrilha</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 39"
                      value={calvesCm}
                      onChange={(e) => setCalvesCm(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Upload de Fotos de Evolução */}
              <div className="bg-[#0b1322] p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-teal-400" />
                  <span>Fotos de Check-in (Frente, Costas e Perfil)</span>
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* Frente */}
                  <label className="border border-dashed border-slate-700 hover:border-teal-400/60 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center cursor-pointer transition-all bg-[#080d1a] relative overflow-hidden h-32">
                    {photoFront ? (
                      <img src={photoFront} alt="Frente" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="space-y-1">
                        <ImageIcon className="w-5 h-5 mx-auto text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-300 block">Frente</span>
                        <span className="text-[8px] text-slate-500 block">Enviar foto</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'front')} className="hidden" />
                  </label>

                  {/* Costas */}
                  <label className="border border-dashed border-slate-700 hover:border-teal-400/60 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center cursor-pointer transition-all bg-[#080d1a] relative overflow-hidden h-32">
                    {photoBack ? (
                      <img src={photoBack} alt="Costas" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="space-y-1">
                        <ImageIcon className="w-5 h-5 mx-auto text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-300 block">Costas</span>
                        <span className="text-[8px] text-slate-500 block">Enviar foto</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'back')} className="hidden" />
                  </label>

                  {/* Perfil */}
                  <label className="border border-dashed border-slate-700 hover:border-teal-400/60 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center cursor-pointer transition-all bg-[#080d1a] relative overflow-hidden h-32">
                    {photoSide ? (
                      <img src={photoSide} alt="Perfil" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="space-y-1">
                        <ImageIcon className="w-5 h-5 mx-auto text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-300 block">Perfil</span>
                        <span className="text-[8px] text-slate-500 block">Enviar foto</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'side')} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Notas do Check-in
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Menor retenção, vascularização mais evidente no antebraço e deltóide."
                  rows={2}
                  className="w-full bg-[#0a101d] border border-slate-700 rounded-xl p-2.5 text-xs text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Check-in Salvo!</span>
                  </span>
                )}
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Salvar Check-in Corporal
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: HISTORY */}
          {activeSubTab === 'history' && (
            <div className="space-y-3">
              {measurements.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p>Nenhum check-in registrado ainda.</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Faça seu primeiro registro de peso e medidas corporais na aba &quot;Novo Check-in&quot;.
                  </p>
                </div>
              ) : (
                measurements.map((m, idx) => {
                  const prev = measurements[idx + 1];
                  const weightDiff = prev ? +(m.weightKg - prev.weightKg).toFixed(1) : 0;

                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-[#0b1322] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white font-mono">
                            {new Date(m.date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs font-black text-teal-400 font-mono bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                            {maskSensitiveValue(m.weightKg, 'kg', isPrivacyHidden)}
                          </span>
                          {!isPrivacyHidden && weightDiff !== 0 && (
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${weightDiff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {weightDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg
                            </span>
                          )}
                        </div>

                        {/* Badges de medidas */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-300 pt-1">
                          {m.waistCm && <span>Cintura: <strong className="text-white">{isPrivacyHidden ? '••••' : `${m.waistCm}cm`}</strong></span>}
                          {m.armsCm && <span>Braço: <strong className="text-white">{isPrivacyHidden ? '••••' : `${m.armsCm}cm`}</strong></span>}
                          {m.chestCm && <span>Tórax: <strong className="text-white">{isPrivacyHidden ? '••••' : `${m.chestCm}cm`}</strong></span>}
                          {m.thighsCm && <span>Coxa: <strong className="text-white">{isPrivacyHidden ? '••••' : `${m.thighsCm}cm`}</strong></span>}
                        </div>

                        {m.notes && (
                          <p className="text-[11px] text-slate-400 italic pt-0.5">
                            {isPrivacyHidden ? '🔒 Notas pessoais ocultas' : `“${m.notes}”`}
                          </p>
                        )}
                      </div>

                      {/* Miniaturas de fotos (Protegidas com Blur no Modo Privacidade) */}
                      <div className="flex items-center gap-2 shrink-0">
                        {m.photoFront && (
                          <img src={m.photoFront} alt="Frente" className={`w-10 h-12 object-cover rounded-lg border border-slate-700 ${isPrivacyHidden ? 'blur-md select-none pointer-events-none' : ''}`} />
                        )}
                        {m.photoBack && (
                          <img src={m.photoBack} alt="Costas" className={`w-10 h-12 object-cover rounded-lg border border-slate-700 ${isPrivacyHidden ? 'blur-md select-none pointer-events-none' : ''}`} />
                        )}
                        {m.photoSide && (
                          <img src={m.photoSide} alt="Perfil" className={`w-10 h-12 object-cover rounded-lg border border-slate-700 ${isPrivacyHidden ? 'blur-md select-none pointer-events-none' : ''}`} />
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteMeasurement(m.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir este check-in"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: COMPARISON */}
          {activeSubTab === 'compare' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#080d19] p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Check-in Anterior (Antes):
                  </label>
                  <select
                    value={compareIdA}
                    onChange={(e) => setCompareIdA(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    {measurements.map((m) => (
                      <option key={m.id} value={m.id}>
                        {new Date(m.date).toLocaleDateString('pt-BR')} ({isPrivacyHidden ? '•••• kg' : `${m.weightKg} kg`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Check-in Recente (Depois):
                  </label>
                  <select
                    value={compareIdB}
                    onChange={(e) => setCompareIdB(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    {measurements.map((m) => (
                      <option key={m.id} value={m.id}>
                        {new Date(m.date).toLocaleDateString('pt-BR')} ({isPrivacyHidden ? '•••• kg' : `${m.weightKg} kg`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {itemA && itemB ? (
                <div className="space-y-4">
                  {/* Delta de Medidas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Peso</span>
                      <strong className={`text-base font-black font-mono block mt-0.5 ${itemB.weightKg <= itemA.weightKg ? 'text-teal-400' : 'text-amber-400'}`}>
                        {isPrivacyHidden ? '••••' : formatDelta(itemB.weightKg, itemA.weightKg, 'kg')}
                      </strong>
                    </div>

                    <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cintura</span>
                      <strong className="text-base font-black font-mono text-teal-400 block mt-0.5">
                        {isPrivacyHidden ? '••••' : formatDelta(itemB.waistCm, itemA.waistCm, 'cm')}
                      </strong>
                    </div>

                    <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Braço</span>
                      <strong className="text-base font-black font-mono text-sky-400 block mt-0.5">
                        {isPrivacyHidden ? '••••' : formatDelta(itemB.armsCm, itemA.armsCm, 'cm')}
                      </strong>
                    </div>

                    <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Coxa</span>
                      <strong className="text-base font-black font-mono text-emerald-400 block mt-0.5">
                        {isPrivacyHidden ? '••••' : formatDelta(itemB.thighsCm, itemA.thighsCm, 'cm')}
                      </strong>
                    </div>
                  </div>

                  {/* Fotos Comparativas Lado a Lado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#090e1c] border border-slate-800 rounded-2xl p-3 text-center space-y-2 relative overflow-hidden">
                      <span className="text-xs font-bold text-slate-400 block font-mono">
                        Antes ({new Date(itemA.date).toLocaleDateString('pt-BR')})
                      </span>
                      {itemA.photoFront ? (
                        <div className="relative">
                          <img src={itemA.photoFront} alt="Antes" className={`w-full max-h-72 object-cover rounded-xl mx-auto border border-slate-700 ${isPrivacyHidden ? 'blur-xl select-none pointer-events-none' : ''}`} />
                          {isPrivacyHidden && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-emerald-300 bg-slate-950/60 rounded-xl">
                              <Lock className="w-5 h-5" />
                              <span className="text-[10px] font-bold">Foto Protegida</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-44 bg-slate-900 rounded-xl flex items-center justify-center text-xs text-slate-600">
                          Sem foto
                        </div>
                      )}
                    </div>

                    <div className="bg-[#090e1c] border border-slate-800 rounded-2xl p-3 text-center space-y-2 relative overflow-hidden">
                      <span className="text-xs font-bold text-teal-400 block font-mono">
                        Depois ({new Date(itemB.date).toLocaleDateString('pt-BR')})
                      </span>
                      {itemB.photoFront ? (
                        <div className="relative">
                          <img src={itemB.photoFront} alt="Depois" className={`w-full max-h-72 object-cover rounded-xl mx-auto border border-slate-700 ${isPrivacyHidden ? 'blur-xl select-none pointer-events-none' : ''}`} />
                          {isPrivacyHidden && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-emerald-300 bg-slate-950/60 rounded-xl">
                              <Lock className="w-5 h-5" />
                              <span className="text-[10px] font-bold">Foto Protegida</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-44 bg-slate-900 rounded-xl flex items-center justify-center text-xs text-slate-600">
                          Sem foto
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">
                  São necessários pelo menos 2 registros com medidas para realizar a comparação.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
