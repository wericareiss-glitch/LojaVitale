import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  CreditCard, 
  QrCode, 
  ChevronRight, 
  MessageCircle, 
  RefreshCw, 
  Filter,
  Check,
  Truck,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { OrderRecord, OrderStatus } from '../types';
import { api } from '../services/api';
import { CLINIC_CONFIG } from '../data/procedures';
import { maskCPF, maskPhone, maskEmail, maskAddress } from '../utils/maskSensitive';

interface OrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  onOrderUpdated: () => void;
  selectedOrderId?: string | null;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const OrdersDrawer: React.FC<OrdersDrawerProps> = ({
  isOpen,
  onClose,
  orders,
  onOrderUpdated,
  selectedOrderId,
  showToast,
}) => {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const isAdmin = api.isAdminAuthenticated();

  // Auto-select order if requested
  React.useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const found = orders.find(o => o.id === selectedOrderId);
      if (found) setActiveOrder(found);
    }
  }, [selectedOrderId, orders]);

  if (!isOpen) return null;

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.paymentStatus === filter);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'aprovado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" /> Aprovado
          </span>
        );
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Pendente
          </span>
        );
      case 'recusado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" /> Recusado
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-500/15 text-neutral-400 border border-neutral-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Cancelado
          </span>
        );
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus, `Alterado via painel de gerenciamento`);
      showToast(`Pedido #${orderId} alterado para "${newStatus.toUpperCase()}"!`, 'success');
      onOrderUpdated();
      if (activeOrder && activeOrder.id === orderId) {
        setActiveOrder(updated);
      }
    } catch {
      showToast('Erro ao atualizar status do pedido.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (val: number) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-onyx-950 border-l border-gold-500/25 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-onyx-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Gerenciador de Pedidos & Agendamentos
              </h3>
              <p className="text-[11px] text-neutral-400">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} registrado{orders.length !== 1 ? 's' : ''} • Mercado Pago
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-onyx-850 hover:bg-onyx-800 text-neutral-400 hover:text-white flex items-center justify-center border border-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-white/5 bg-onyx-950 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {(['all', 'pendente', 'aprovado', 'recusado', 'cancelado'] as const).map(st => (
            <button
              key={st}
              onClick={() => { setFilter(st); setActiveOrder(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === st
                  ? 'bg-gold-500 text-onyx-950 shadow-md font-bold'
                  : 'bg-onyx-850 text-neutral-400 hover:text-white border border-white/5'
              }`}
            >
              {st === 'all' ? 'Todos' : st.charAt(0).toUpperCase() + st.slice(1)}
              <span className="ml-1.5 opacity-80 text-[10px]">
                ({st === 'all' ? orders.length : orders.filter(o => o.paymentStatus === st).length})
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeOrder ? (
            /* DETAILED VIEW OF SELECTED ORDER */
            <div className="space-y-5 animate-in fade-in duration-200">
              <button
                onClick={() => setActiveOrder(null)}
                className="text-xs text-gold-400 hover:underline flex items-center gap-1 font-semibold"
              >
                ← Voltar para lista de pedidos
              </button>

              <div className="p-5 rounded-2xl bg-onyx-900 border border-gold-500/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">Código do Pedido</span>
                    <h4 className="font-mono text-lg font-bold text-white">#{activeOrder.id}</h4>
                  </div>
                  <div>{getStatusBadge(activeOrder.paymentStatus)}</div>
                </div>

                {/* Status Modifier Toolbar (Exclusivo para Administração Autenticada) */}
                {isAdmin && (
                  <div className="p-3.5 rounded-xl bg-onyx-950 border border-gold-500/30 space-y-2">
                    <span className="text-[11px] font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gold-400" /> Atualizar Status do Pedido (Administração):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['pendente', 'aprovado', 'recusado', 'cancelado'] as OrderStatus[]).map(st => (
                        <button
                          key={st}
                          disabled={isUpdating || activeOrder.paymentStatus === st}
                          onClick={() => handleStatusChange(activeOrder.id, st)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                            activeOrder.paymentStatus === st
                              ? 'bg-gold-500 text-onyx-950 font-bold'
                              : 'bg-onyx-900 hover:bg-onyx-800 text-neutral-300 border border-white/10'
                          }`}
                        >
                          {activeOrder.paymentStatus === st && <Check className="w-3 h-3" />}
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patient & Appointment details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-onyx-850 border border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gold-400" /> Agendamento Domiciliar
                    </span>
                    <p className="font-semibold text-white">{activeOrder.schedule.date} às {activeOrder.schedule.time}</p>
                    <p className="text-neutral-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gold-400" /> {activeOrder.patient.neighborhood}, Teresina - PI
                    </p>
                    {activeOrder.schedule.notes && (
                      <p className="text-[11px] text-gold-300/90 italic pt-0.5">
                        Obs: {activeOrder.schedule.notes}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-onyx-850 border border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      {activeOrder.paymentMethod === 'pix' ? (
                        <QrCode className="w-3.5 h-3.5 text-gold-400" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5 text-gold-400" />
                      )}
                      Método de Pagamento
                    </span>
                    <p className="font-semibold text-white">
                      {activeOrder.paymentMethod === 'pix' ? 'PIX Instantâneo' : 'Cartão de Crédito'} (Mercado Pago)
                    </p>
                    <p className="text-gold-400 font-bold">{formatCurrency(activeOrder.total)}</p>
                  </div>
                </div>

                {/* Patient Contact - Masked for public / Unmasked for admin */}
                <div className="p-3.5 rounded-xl bg-onyx-850 border border-white/5 text-xs space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Dados do Paciente & Endereço:
                    </span>
                    {!isAdmin && (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> Dados Protegidos (LGPD)
                      </span>
                    )}
                  </div>
                  <p className="text-white font-semibold">
                    {isAdmin 
                      ? `${activeOrder.patient.name} • CPF: ${activeOrder.patient.cpf}` 
                      : `${activeOrder.patient.name ? activeOrder.patient.name.split(' ')[0] + ' (Paciente)' : 'Paciente'} • CPF: ${maskCPF(activeOrder.patient.cpf)}`}
                  </p>
                  <p className="text-neutral-300">
                    {isAdmin 
                      ? `${activeOrder.patient.address} - CEP: ${activeOrder.patient.cep}` 
                      : maskAddress(activeOrder.patient.address, activeOrder.patient.neighborhood)}
                  </p>
                  <p className="text-neutral-400">
                    WhatsApp: {isAdmin ? activeOrder.patient.phone : maskPhone(activeOrder.patient.phone)} | E-mail: {isAdmin ? activeOrder.patient.email : maskEmail(activeOrder.patient.email)}
                  </p>
                </div>

                {/* Items Purchased */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                    Procedimentos Contratados ({activeOrder.items.length})
                  </span>
                  <div className="space-y-2">
                    {activeOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-onyx-950 border border-white/5 text-xs">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div>
                            <h5 className="font-semibold text-white">{item.name}</h5>
                            <span className="text-neutral-400 text-[11px]">Qtd: {item.quantity}</span>
                          </div>
                        </div>
                        <span className="font-bold text-gold-400">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {(activeOrder.shippingFee !== undefined && activeOrder.shippingFee > 0) && (
                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs text-neutral-300">
                      <span className="flex items-center gap-1.5 text-gold-300">
                        <Truck className="w-3.5 h-3.5 text-gold-400" />
                        Taxa de Deslocamento ({activeOrder.shippingDistanceKm || 0} km de CEP 64099-000):
                      </span>
                      <span className="font-semibold text-gold-400">{formatCurrency(activeOrder.shippingFee)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-sm font-bold">
                    <span className="text-white">Valor Total Pago:</span>
                    <span className="text-gold-400 text-base">{formatCurrency(activeOrder.total)}</span>
                  </div>
                </div>

                {/* WhatsApp concierge VIP button (active when approved) */}
                {activeOrder.paymentStatus === 'aprovado' ? (
                  <a
                    href={`https://wa.me/${CLINIC_CONFIG.phone}?text=${encodeURIComponent(
                      `Olá! Gostaria de falar sobre o agendamento #${activeOrder.id} (${activeOrder.patient.name}) para ${activeOrder.schedule.date} às ${activeOrder.schedule.time}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Abrir WhatsApp VIP Concierge Teresina
                  </a>
                ) : (
                  <div className="p-3 rounded-xl bg-onyx-950 border border-white/5 text-xs text-neutral-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>WhatsApp VIP é desbloqueado automaticamente após a aprovação do pagamento.</span>
                  </div>
                )}

                {/* Status Timeline / History */}
                {activeOrder.history && activeOrder.history.length > 0 && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                      Histórico de Eventos & Status
                    </span>
                    <div className="space-y-2 text-xs">
                      {activeOrder.history.map((hist, i) => (
                        <div key={i} className="flex items-start gap-2 text-neutral-300">
                          <span className="w-2 h-2 rounded-full bg-gold-400 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white uppercase text-[11px]">
                                {hist.status}
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                {formatDate(hist.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400">{hist.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* LIST OF ORDERS */
            filteredOrders.length === 0 ? (
              <div className="py-16 text-center bg-onyx-900/40 rounded-2xl border border-dashed border-white/10 p-6 space-y-2">
                <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-neutral-300">Nenhum pedido encontrado</h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  {filter !== 'all' 
                    ? `Nenhum pedido com status "${filter}".` 
                    : 'Realize um agendamento no catálogo para vê-lo registrado aqui.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setActiveOrder(order)}
                    className="p-4 rounded-2xl bg-onyx-900 border border-white/5 hover:border-gold-500/40 transition-all cursor-pointer group hover:bg-onyx-850/90 shadow-md flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white group-hover:text-gold-400 transition-colors">
                            #{order.id}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-medium">
                            • {formatDate(order.createdAt)}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-neutral-200 mt-1">
                          {isAdmin ? order.patient.name : (order.patient.name ? `${order.patient.name.split(' ')[0]} (Paciente)` : 'Paciente')}
                        </h4>
                        <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gold-400" />
                          {order.patient.neighborhood}, Teresina • {order.schedule.date} às {order.schedule.time}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {getStatusBadge(order.paymentStatus)}
                        <span className="block text-sm font-bold text-gold-400 mt-1.5 font-sans">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Items snapshot */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-onyx-950 text-[10px] font-semibold text-neutral-300 border border-white/5 uppercase">
                          {order.paymentMethod === 'pix' ? 'PIX Mercado Pago' : 'Cartão Mercado Pago'}
                        </span>
                        <span className="truncate max-w-[220px]">
                          {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                      </div>
                      <span className="text-gold-400 flex items-center gap-0.5 text-[11px] font-semibold group-hover:translate-x-1 transition-transform">
                        Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-onyx-900/90 flex items-center justify-between text-xs text-neutral-400">
          <span>Pedidos sincronizados com a API Mercado Pago</span>
          <button
            onClick={() => { onOrderUpdated(); showToast('Lista de pedidos atualizada!', 'info'); }}
            className="flex items-center gap-1.5 text-gold-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>

      </div>
    </div>
  );
};
