import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Plus, 
  Trash2, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { OrderRecord, OrderStatus } from '../types';
import { api } from '../services/api';

interface AdminCalendarProps {
  orders: OrderRecord[];
  onOrdersUpdated: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface ConflictInfo {
  time: string;
  orderIds: string[];
  orders: OrderRecord[];
  type: 'exact' | 'proximity';
  description: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_FULL = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export const AdminCalendar: React.FC<AdminCalendarProps> = ({
  orders,
  onOrdersUpdated,
  showToast,
}) => {
  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    // Default to today in YYYY-MM-DD
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  
  // Status Filter: all, aprovado, pendente, conflicts_only
  const [filterStatus, setFilterStatus] = useState<'all' | 'aprovado' | 'pendente' | 'conflicts'>('all');
  const [isSimulatingConflict, setIsSimulatingConflict] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [orderToDeleteId, setOrderToDeleteId] = useState<string | null>(null);

  // Convert "HH:mm" to minutes for proximity calculation
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  // Group active orders by isoDate
  const ordersByDate = useMemo(() => {
    const map = new Map<string, OrderRecord[]>();
    
    orders.forEach(order => {
      const iso = order.schedule?.isoDate;
      if (!iso) return;

      // Filter by payment status if selected
      if (filterStatus === 'aprovado' && order.paymentStatus !== 'aprovado') return;
      if (filterStatus === 'pendente' && order.paymentStatus !== 'pendente') return;

      const list = map.get(iso) || [];
      list.push(order);
      map.set(iso, list);
    });

    return map;
  }, [orders, filterStatus]);

  // Conflict calculation function for any day's orders
  const detectDayConflicts = (dayOrders: OrderRecord[]): ConflictInfo[] => {
    // Only check active orders (ignore canceled or refused)
    const active = dayOrders.filter(o => o.paymentStatus !== 'cancelado' && o.paymentStatus !== 'recusado');
    if (active.length < 2) return [];

    const conflicts: ConflictInfo[] = [];
    const processedExactPairs = new Set<string>();

    // 1. Check exact time duplicates
    const timeGroups = new Map<string, OrderRecord[]>();
    active.forEach(o => {
      const t = o.schedule?.time || '14:00';
      const arr = timeGroups.get(t) || [];
      arr.push(o);
      timeGroups.set(t, arr);
    });

    timeGroups.forEach((group, time) => {
      if (group.length > 1) {
        conflicts.push({
          time,
          orderIds: group.map(o => o.id),
          orders: group,
          type: 'exact',
          description: `Conflito Direto: ${group.length} clientes agendados exatamente às ${time}.`,
        });
        group.forEach(o => processedExactPairs.add(o.id));
      }
    });

    // 2. Check proximity conflicts (orders scheduled less than 60 minutes apart)
    // Concierge home visits across Teresina take travel time
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const oA = active[i];
        const oB = active[j];
        if (processedExactPairs.has(oA.id) && processedExactPairs.has(oB.id)) continue;

        const minA = timeToMinutes(oA.schedule?.time || '00:00');
        const minB = timeToMinutes(oB.schedule?.time || '00:00');
        const diff = Math.abs(minA - minB);

        if (diff > 0 && diff < 60) {
          conflicts.push({
            time: `${oA.schedule?.time} / ${oB.schedule?.time}`,
            orderIds: [oA.id, oB.id],
            orders: [oA, oB],
            type: 'proximity',
            description: `Intervalo insuficiente (${diff} min) entre ${oA.patient.name} (${oA.schedule?.time}) e ${oB.patient.name} (${oB.schedule?.time}) para deslocamento em Teresina.`,
          });
        }
      }
    }

    return conflicts;
  };

  // Map of date string -> conflicts list
  const conflictsByDate = useMemo(() => {
    const map = new Map<string, ConflictInfo[]>();
    ordersByDate.forEach((dayOrders, iso) => {
      const confs = detectDayConflicts(dayOrders);
      if (confs.length > 0) {
        map.set(iso, confs);
      }
    });
    return map;
  }, [ordersByDate]);

  // Calendar matrix calculations for current month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNum: number;
      monthType: 'prev' | 'current' | 'next';
      isoDate: string;
      isToday: boolean;
      orders: OrderRecord[];
      conflicts: ConflictInfo[];
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Padding previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = totalDaysPrevMonth - i;
      const prevDate = new Date(year, month - 1, dNum);
      const iso = prevDate.toISOString().split('T')[0];
      const dayOrders = ordersByDate.get(iso) || [];
      const dayConflicts = conflictsByDate.get(iso) || [];

      days.push({
        dayNum: dNum,
        monthType: 'prev',
        isoDate: iso,
        isToday: iso === todayStr,
        orders: dayOrders,
        conflicts: dayConflicts,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const curDate = new Date(year, month, d);
      // Format as YYYY-MM-DD
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const iso = `${year}-${mStr}-${dStr}`;
      const dayOrders = ordersByDate.get(iso) || [];
      const dayConflicts = conflictsByDate.get(iso) || [];

      days.push({
        dayNum: d,
        monthType: 'current',
        isoDate: iso,
        isToday: iso === todayStr,
        orders: dayOrders,
        conflicts: dayConflicts,
      });
    }

    // Padding next month to fill grid to 35 or 42
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const iso = nextDate.toISOString().split('T')[0];
      const dayOrders = ordersByDate.get(iso) || [];
      const dayConflicts = conflictsByDate.get(iso) || [];

      days.push({
        dayNum: i,
        monthType: 'next',
        isoDate: iso,
        isToday: iso === todayStr,
        orders: dayOrders,
        conflicts: dayConflicts,
      });
    }

    return days;
  }, [currentDate, ordersByDate, conflictsByDate]);

  // Current month summary stats
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    let totalMonthOrders = 0;
    let totalRevenue = 0;
    const conflictDates: string[] = [];

    ordersByDate.forEach((dayOrders, iso) => {
      if (iso.startsWith(prefix)) {
        totalMonthOrders += dayOrders.length;
        totalRevenue += dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      }
    });

    conflictsByDate.forEach((confs, iso) => {
      if (iso.startsWith(prefix) && confs.length > 0) {
        conflictDates.push(iso);
      }
    });

    return {
      totalMonthOrders,
      totalRevenue,
      conflictCount: conflictDates.length,
      conflictDates,
    };
  }, [currentDate, ordersByDate, conflictsByDate]);

  // Selected Day data
  const selectedDayOrders = useMemo(() => {
    const list = ordersByDate.get(selectedDateStr) || [];
    // Sort chronologically by schedule.time
    return [...list].sort((a, b) => {
      const tA = a.schedule?.time || '00:00';
      const tB = b.schedule?.time || '00:00';
      return tA.localeCompare(tB);
    });
  }, [ordersByDate, selectedDateStr]);

  const selectedDayConflicts = useMemo(() => {
    return conflictsByDate.get(selectedDateStr) || [];
  }, [conflictsByDate, selectedDateStr]);

  // Set of conflicting order IDs for highlight styling
  const selectedDayConflictingOrderIds = useMemo(() => {
    const ids = new Set<string>();
    selectedDayConflicts.forEach(c => {
      c.orderIds.forEach(id => ids.add(id));
    });
    return ids;
  }, [selectedDayConflicts]);

  // Format Brazilian date string for display
  const formatDisplayDate = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = WEEKDAY_FULL[dateObj.getDay()];
    const monthName = MONTH_NAMES[m - 1];
    return `${weekday}, ${d} de ${monthName} de ${y}`;
  };

  // Handlers for month navigation
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  // Jump to first conflict
  const handleJumpToConflict = (dateIso: string) => {
    const [y, m] = dateIso.split('-').map(Number);
    setCurrentDate(new Date(y, m - 1, 1));
    setSelectedDateStr(dateIso);
    showToast(`Visualizando agendamentos com conflito em ${dateIso}.`, 'info');
  };

  // Change order status
  const handleChangeOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdatingStatus(orderId);
    try {
      await api.updateOrderStatus(orderId, newStatus, `Status atualizado via Agenda do Administrador.`);
      showToast(`Status do pedido #${orderId} atualizado para ${newStatus.toUpperCase()}.`, 'success');
      onOrdersUpdated();
    } catch {
      showToast('Erro ao atualizar status do pedido.', 'error');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Delete order
  const handleConfirmDelete = async (orderId: string) => {
    try {
      await api.deleteOrder(orderId);
      showToast(`Agendamento #${orderId} removido da agenda. Horário liberado.`, 'info');
      setOrderToDeleteId(null);
      onOrdersUpdated();
    } catch {
      showToast('Erro ao remover agendamento.', 'error');
    }
  };

  // Quick Conflict Simulation for Testing
  const handleSimulateConflict = async () => {
    setIsSimulatingConflict(true);
    try {
      // Pick first order's time or default to 14:00
      const targetTime = selectedDayOrders[0]?.schedule?.time || '14:00';
      const testNames = [
        'Mariana Vasconcelos', 
        'Beatriz Lustosa', 
        'Dra. Fernanda Sampaio', 
        'Patrícia Medeiros'
      ];
      const randomName = testNames[Math.floor(Math.random() * testNames.length)];
      const randomId = `VIT-SIM-${Math.floor(1000 + Math.random() * 9000)}`;

      await api.createOrder({
        id: randomId,
        items: [
          {
            id: 'botox-3-regioes',
            name: 'Toxina Botulínica (3 Regiões)',
            price: 1150,
            quantity: 1,
            category: 'injetaveis',
            duration: '45 min',
            sessions: '1 aplicação',
            description: 'Suavização expressiva de rugas da testa, glabela e pés de galinha com aspecto natural.',
            benefits: ['Agulhas ultrafinas com anestésico tópico potente', 'Retorno de 15 dias cortesia incluso'],
            image: 'https://images.unsplash.com/photo-1512290900672-1f02e646271a?auto=format&fit=crop&w=700&q=80',
          }
        ],
        subtotal: 1150,
        discount: 0,
        total: 1150,
        paymentMethod: 'pix',
        paymentStatus: 'aprovado',
        paymentId: `MP-SIM-${Date.now()}`,
        patient: {
          name: randomName,
          email: `${randomName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
          phone: '(86) 99411-8822',
          cpf: '051.884.213-90',
          cep: '64049-550',
          street: 'Rua das Orquídeas',
          number: '420',
          complement: 'Apt 502',
          neighborhood: 'Bairro de Fátima',
          city: 'Teresina',
          state: 'PI',
        },
        schedule: {
          date: formatDisplayDate(selectedDateStr),
          isoDate: selectedDateStr,
          time: targetTime,
          notes: 'Cliente solicitou confirmação de kit estéril pelo WhatsApp.',
        },
      });

      showToast(`Agendamento de teste criado às ${targetTime} para simular conflito!`, 'success');
      onOrdersUpdated();
    } catch {
      showToast('Erro ao simular agendamento.', 'error');
    } finally {
      setIsSimulatingConflict(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Month Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Stat 1: Total Appointments */}
        <div className="bg-onyx-950 p-4 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block mb-0.5">Atendimentos no Mês</span>
            <span className="text-2xl font-bold font-serif text-white">
              {monthStats.totalMonthOrders}
            </span>
            <span className="text-[11px] text-neutral-500 block mt-0.5">
              {MONTH_NAMES[currentDate.getMonth()]} de {currentDate.getFullYear()}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 2: Conflicts Alert */}
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          monthStats.conflictCount > 0 
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' 
            : 'bg-onyx-950 border-white/10 text-neutral-300'
        }`}>
          <div>
            <span className="text-xs text-neutral-400 block mb-0.5">Conflitos de Horário</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold font-serif ${
                monthStats.conflictCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {monthStats.conflictCount}
              </span>
              <span className="text-xs">
                {monthStats.conflictCount === 0 
                  ? 'Agenda sem conflitos' 
                  : monthStats.conflictCount === 1 
                  ? 'dia com conflito' 
                  : 'dias com conflitos'}
              </span>
            </div>
            {monthStats.conflictCount > 0 && (
              <button
                onClick={() => handleJumpToConflict(monthStats.conflictDates[0])}
                className="text-[11px] text-amber-300 underline font-semibold mt-1 flex items-center gap-1 hover:text-amber-200 cursor-pointer"
              >
                Ver conflito em {monthStats.conflictDates[0]} <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            monthStats.conflictCount > 0 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {monthStats.conflictCount > 0 ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Stat 3: Month Revenue */}
        <div className="bg-onyx-950 p-4 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block mb-0.5">Faturamento Previsto</span>
            <span className="text-2xl font-bold font-serif text-gold-400">
              R$ {monthStats.totalRevenue.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[11px] text-neutral-500 block mt-0.5">
              Somatório dos atendimentos agendados
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300">
            <Sparkles className="w-5 h-5 text-gold-400" />
          </div>
        </div>

      </div>

      {/* Main Grid: Calendar on Left (7 cols), Selected Day Agenda on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Calendar Grid (7 cols) */}
        <div className="lg:col-span-7 bg-onyx-950 p-5 rounded-2xl border border-white/10 space-y-4">
          
          {/* Calendar Header Navigation */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-serif font-bold text-white capitalize">
                {MONTH_NAMES[currentDate.getMonth()]} de {currentDate.getFullYear()}
              </h4>
              <button
                onClick={handleGoToday}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors"
                title="Voltar para a data de hoje"
              >
                Hoje
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-onyx-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-gold-500/50"
              >
                <option value="all">Todos os Status</option>
                <option value="aprovado">Apenas Aprovados</option>
                <option value="pendente">Apenas Pendentes</option>
              </select>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-500 py-1">
            {WEEKDAY_NAMES.map((wd, i) => (
              <div key={wd} className={i === 0 ? 'text-neutral-600' : ''}>
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, index) => {
              const isSelected = cell.isoDate === selectedDateStr;
              const hasOrders = cell.orders.length > 0;
              const hasConflict = cell.conflicts.length > 0;
              const isCurrentMonth = cell.monthType === 'current';

              return (
                <button
                  key={`${cell.isoDate}-${index}`}
                  onClick={() => setSelectedDateStr(cell.isoDate)}
                  className={`min-h-[72px] sm:min-h-[82px] p-1.5 rounded-xl text-left flex flex-col justify-between transition-all relative group cursor-pointer ${
                    !isCurrentMonth ? 'opacity-35 hover:opacity-75' : ''
                  } ${
                    isSelected
                      ? 'bg-gold-500/15 border-2 border-gold-400 shadow-lg shadow-gold-500/10'
                      : hasConflict
                      ? 'bg-amber-950/25 border border-amber-500/50 hover:border-amber-400'
                      : hasOrders
                      ? 'bg-onyx-900 border border-white/15 hover:border-gold-500/40'
                      : 'bg-onyx-900/60 border border-white/5 hover:border-white/20'
                  }`}
                >
                  {/* Top row: Day number and indicators */}
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                      cell.isToday
                        ? 'bg-gold-500 text-onyx-950 font-bold'
                        : isSelected
                        ? 'text-gold-300 font-bold'
                        : 'text-neutral-300'
                    }`}>
                      {cell.dayNum}
                    </span>

                    {/* Conflict icon alert */}
                    {hasConflict && (
                      <span 
                        title={`Conflito de agenda: ${cell.conflicts.length} conflito(s) neste dia`}
                        className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center animate-pulse"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Bottom indicators */}
                  <div className="w-full mt-1 space-y-1">
                    {hasOrders && (
                      <div>
                        {hasConflict ? (
                          <div className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/40 truncate flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block shrink-0" />
                            <span>{cell.orders.length} agend. (Conflito!)</span>
                          </div>
                        ) : (
                          <div className="px-1 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 truncate">
                            {cell.orders.length} {cell.orders.length === 1 ? 'atendimento' : 'atendimentos'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Time pills preview for day */}
                    {hasOrders && (
                      <div className="hidden sm:flex flex-wrap gap-0.5 max-h-5 overflow-hidden">
                        {cell.orders.slice(0, 2).map(o => (
                          <span 
                            key={o.id}
                            className={`text-[8px] px-1 rounded ${
                              cell.conflicts.some(c => c.orderIds.includes(o.id))
                                ? 'bg-amber-500/30 text-amber-200'
                                : 'bg-white/10 text-neutral-300'
                            }`}
                          >
                            {o.schedule?.time}
                          </span>
                        ))}
                        {cell.orders.length > 2 && (
                          <span className="text-[8px] text-neutral-500">+{cell.orders.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gold-500" /> Hoje
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Agendamento Confirmado
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Conflito de Horário
              </span>
            </div>
            <span>Clique em qualquer dia para ver a agenda detalhada</span>
          </div>

        </div>

        {/* Right Column: Selected Day Agenda & Conflicts (5 cols) */}
        <div className="lg:col-span-5 bg-onyx-950 p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
          
          <div className="space-y-4">
            
            {/* Header of selected day */}
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gold-400 block">
                  Agenda Domiciliar
                </span>
                <h4 className="text-base font-bold text-white">
                  {formatDisplayDate(selectedDateStr)}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {selectedDayOrders.length === 0 
                    ? 'Nenhum atendimento marcado para esta data.' 
                    : `${selectedDayOrders.length} ${selectedDayOrders.length === 1 ? 'visita agendada' : 'visitas agendadas'}.`}
                </p>
              </div>

              {/* Quick Simulator Button */}
              <button
                onClick={handleSimulateConflict}
                disabled={isSimulatingConflict}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Cria um agendamento no mesmo horário para demonstrar o detector de conflitos"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simular Conflito</span>
              </button>
            </div>

            {/* CONFLICT ALERT BANNER */}
            {selectedDayConflicts.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border-2 border-amber-500/60 text-amber-200 space-y-2.5 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                      ⚠️ Conflito de Agenda Detectado!
                    </h5>
                    <p className="text-xs text-amber-200/90 leading-relaxed mt-0.5">
                      Há {selectedDayConflicts.length} conflito(s) de horário neste dia que impedem a logística domiciliar em Teresina.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-amber-500/30 text-xs">
                  {selectedDayConflicts.map((conf, idx) => (
                    <div key={idx} className="bg-black/30 p-2 rounded-lg border border-amber-500/30 space-y-1">
                      <div className="font-bold text-amber-300 flex items-center justify-between">
                        <span>Horário Crítico: {conf.time}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 font-semibold uppercase">
                          {conf.type === 'exact' ? 'Mesmo Horário' : 'Sobreposição'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300">
                        {conf.description}
                      </p>
                      <div className="text-[11px] text-amber-200/80">
                        Clientes: <span className="font-semibold text-white">{conf.orders.map(o => o.patient.name).join(' e ')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-amber-300/80 italic">
                  💡 Sugestão: Use o botão de WhatsApp abaixo para entrar em contato com uma das clientes e propor um novo horário.
                </p>
              </div>
            )}

            {/* Timeline List of Appointments */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {selectedDayOrders.map((order) => {
                const isConflict = selectedDayConflictingOrderIds.has(order.id);
                const cleanPhone = (order.patient?.phone || '').replace(/\D/g, '');
                const waMessage = encodeURIComponent(
                  `Olá ${order.patient?.name}, tudo bem? Aqui é da Vitale Estética Concierge Teresina. Estamos confirmando os detalhes do seu atendimento domiciliar agendado para o dia ${order.schedule?.date || selectedDateStr} às ${order.schedule?.time}.`
                );
                const waUrl = `https://wa.me/55${cleanPhone}?text=${waMessage}`;

                return (
                  <div
                    key={order.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isConflict
                        ? 'bg-amber-950/20 border-amber-500/60 shadow-md shadow-amber-500/5'
                        : 'bg-onyx-900 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Top Row: Time, Status, Conflict badge */}
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${
                          isConflict
                            ? 'bg-amber-500 text-onyx-950 font-extrabold'
                            : 'bg-gold-500/20 text-gold-300 border border-gold-500/30'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {order.schedule?.time}
                        </span>

                        <span className="text-xs font-mono text-neutral-400">
                          #{order.id}
                        </span>

                        {isConflict && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                            Conflito
                          </span>
                        )}
                      </div>

                      {/* Status badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        order.paymentStatus === 'aprovado'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : order.paymentStatus === 'pendente'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}>
                        {order.paymentStatus === 'aprovado' ? 'Confirmado / Pago' : order.paymentStatus}
                      </span>
                    </div>

                    {/* Patient & Location info */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                        <User className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                        <span>{order.patient?.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="truncate">
                          {order.patient?.address}, {order.patient?.neighborhood} • {order.patient?.city || 'Teresina - PI'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span>{order.patient?.phone}</span>
                      </div>

                      {order.schedule?.notes && (
                        <div className="p-2 mt-1.5 bg-black/40 rounded-lg text-[11px] text-neutral-300 border border-white/5 italic">
                          "{order.schedule.notes}"
                        </div>
                      )}
                    </div>

                    {/* Items and Total */}
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <div className="text-neutral-400 truncate max-w-[200px]" title={order.items.map(i => i.name).join(', ')}>
                        {order.items.map(i => i.name).join(', ')}
                      </div>
                      <div className="font-bold text-gold-400 font-serif">
                        R$ {order.total.toFixed(2).replace('.', ',')}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                      {/* WhatsApp Button */}
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                        title="Falar com o paciente no WhatsApp para confirmar ou reagendar"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Quick Status / Delete Actions */}
                      <div className="flex items-center gap-1">
                        {order.paymentStatus !== 'aprovado' && (
                          <button
                            onClick={() => handleChangeOrderStatus(order.id, 'aprovado')}
                            disabled={isUpdatingStatus === order.id}
                            className="px-2 py-1 rounded bg-white/5 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 text-[10px] font-semibold transition-colors"
                            title="Marcar como aprovado"
                          >
                            Aprovar
                          </button>
                        )}
                        {order.paymentStatus !== 'cancelado' && (
                          <button
                            onClick={() => handleChangeOrderStatus(order.id, 'cancelado')}
                            disabled={isUpdatingStatus === order.id}
                            className="px-2 py-1 rounded bg-white/5 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-300 text-[10px] font-semibold transition-colors"
                            title="Cancelar este pedido"
                          >
                            Cancelar
                          </button>
                        )}
                        {orderToDeleteId === order.id ? (
                          <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded">
                            <span className="text-[9px] text-red-300 font-bold">Excluir?</span>
                            <button
                              onClick={() => handleConfirmDelete(order.id)}
                              className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold hover:bg-red-500"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setOrderToDeleteId(null)}
                              className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 text-[9px] hover:bg-white/20"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setOrderToDeleteId(order.id)}
                            className="p-1 rounded bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                            title="Remover pedido da agenda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}

              {selectedDayOrders.length === 0 && (
                <div className="text-center py-10 text-neutral-500 bg-onyx-900/50 rounded-xl border border-white/5 space-y-2">
                  <CalendarIcon className="w-8 h-8 mx-auto opacity-30 text-gold-400" />
                  <p className="text-sm font-medium text-neutral-400">
                    Nenhum atendimento para este dia.
                  </p>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Todos os horários (08:30 às 18:30) estão totalmente livres para novos agendamentos domiciliares.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Bottom helper tip */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-neutral-400">
            <span className="text-gold-400 font-semibold">Concierge Teresina:</span> Os agendamentos são calculados para bairros como Jóquei, Fátima, Riverside e Ilhotas. Conflitos detectados ajudam a evitar atrasos no deslocamento domiciliar.
          </div>

        </div>

      </div>

    </div>
  );
};
