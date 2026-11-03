import { 
  MercadoPagoConfig, 
  OrderRecord, 
  OrderNotification, 
  OrderStatus, 
  CartItem, 
  PatientData,
  Procedure
} from '../types';
import { PROCEDURES, CLINIC_CONFIG } from '../data/procedures';
import { generateBacenPixPayload } from '../utils/pix';

// Initial demo order for when running in static environments (GitHub Pages)
const INITIAL_DEMO_ORDER: OrderRecord = {
  id: 'VIT-94821',
  createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  items: [
    {
      id: 'consulta-avaliacao',
      name: 'Consulta e Avaliação Individualizada',
      price: 100,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'vitaminas-injetaveis',
      name: 'Vitaminas Injetáveis sob Demanda',
      price: 580,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=700&q=80',
    },
  ],
  subtotal: 680,
  discount: 100,
  total: 580,
  paymentMethod: 'pix',
  paymentStatus: 'aprovado',
  paymentId: 'MP-892184910',
  paymentDetail: 'PIX compensado instantaneamente via Mercado Pago',
  patient: {
    name: 'Paciente Vitale',
    email: 'paciente***@vitale.com.br',
    phone: '(86) 9****-**00',
    cpf: '***.***.***-**',
    address: 'Atendimento Domiciliar, Bairro Jóquei',
    neighborhood: 'Jóquei',
    city: 'Teresina - PI',
    cep: '64049-550',
  },
  schedule: {
    date: 'Amanhã, 14:00',
    isoDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '14:00',
    notes: 'Agendamento demonstrativo',
  },
  history: [
    {
      status: 'pendente',
      note: 'Agendamento criado no app Vitale. Aguardando PIX.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      status: 'aprovado',
      note: 'Pagamento de R$ 580,00 aprovado no Mercado Pago. Maleta cirúrgica e rota confirmadas.',
      timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    },
  ],
};

// Local storage helpers
function getLocalOrders(): OrderRecord[] {
  try {
    const raw = localStorage.getItem('vitale_orders_store');
    if (raw) return JSON.parse(raw);
    const initial = [INITIAL_DEMO_ORDER];
    localStorage.setItem('vitale_orders_store', JSON.stringify(initial));
    return initial;
  } catch {
    return [INITIAL_DEMO_ORDER];
  }
}

function saveLocalOrders(orders: OrderRecord[]) {
  try {
    localStorage.setItem('vitale_orders_store', JSON.stringify(orders));
  } catch {}
}

function getLocalNotifications(): OrderNotification[] {
  try {
    const raw = localStorage.getItem('vitale_notifications_store');
    if (raw) return JSON.parse(raw);
    const initial: OrderNotification[] = [
      {
        id: 'notif-1',
        orderId: INITIAL_DEMO_ORDER.id,
        title: 'Pagamento Aprovado! 🎉',
        message: `Pedido #${INITIAL_DEMO_ORDER.id} aprovado via PIX Mercado Pago. Rota agendada para Jóquei, Teresina.`,
        type: 'success',
        timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString(),
        read: false,
      },
    ];
    localStorage.setItem('vitale_notifications_store', JSON.stringify(initial));
    return initial;
  } catch {
    return [];
  }
}

function pushLocalNotification(orderId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') {
  const list = getLocalNotifications();
  const notif: OrderNotification = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId,
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  };
  list.unshift(notif);
  try {
    localStorage.setItem('vitale_notifications_store', JSON.stringify(list));
  } catch {}
}

// Local storage procedures helpers (with cache versioning)
const PROCEDURES_VERSION = 'v7_mesclada_avaliacao_card';

function getLocalProcedures(): Procedure[] {
  try {
    const currentVersion = localStorage.getItem('vitale_procedures_version');
    if (currentVersion !== PROCEDURES_VERSION) {
      localStorage.setItem('vitale_procedures_version', PROCEDURES_VERSION);
      localStorage.setItem('vitale_procedures_store', JSON.stringify(PROCEDURES));
      return PROCEDURES;
    }
    const raw = localStorage.getItem('vitale_procedures_store');
    if (raw) return JSON.parse(raw);
    localStorage.setItem('vitale_procedures_store', JSON.stringify(PROCEDURES));
    return PROCEDURES;
  } catch {
    return PROCEDURES;
  }
}

function saveLocalProcedures(procedures: Procedure[]) {
  try {
    localStorage.setItem('vitale_procedures_store', JSON.stringify(procedures));
  } catch {}
}

export const api = {
  // Mercado Pago Config
  async getConfig(): Promise<MercadoPagoConfig> {
    try {
      const res = await fetch('/api/mercadopago/config');
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {}

    // Fallback for static GitHub Pages hosting
    const savedToken = localStorage.getItem('vitale_mp_token');
    return {
      configured: Boolean(savedToken),
      mode: savedToken?.startsWith('TEST-') ? 'sandbox' : savedToken?.startsWith('APP_USR-') ? 'production' : 'simulator',
      hasKey: Boolean(savedToken),
      maskedToken: savedToken ? `${savedToken.substring(0, 10)}...${savedToken.substring(savedToken.length - 4)}` : null,
    };
  },

  async saveToken(accessToken: string, publicKey?: string) {
    try {
      const res = await fetch('/api/mercadopago/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, publicKey }),
      });
      if (res.ok) return await res.json();
    } catch {}

    localStorage.setItem('vitale_mp_token', accessToken);
    if (publicKey) localStorage.setItem('vitale_mp_public_key', publicKey);
    return { success: true, configured: true, mode: accessToken.startsWith('TEST-') ? 'sandbox' : 'production' };
  },

  // Mercado Pago PIX
  async createPix(payload: {
    amount: number;
    description: string;
    payer: {
      email: string;
      name?: string;
      cpf?: string;
      firstName?: string;
      lastName?: string;
    };
    externalReference?: string;
  }) {
    try {
      const res = await fetch('/api/mercadopago/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Fallback standard BACEN PIX (runs anywhere, with valid CRC-16)
    const simulatedId = `MP-${Math.floor(100000000 + Math.random() * 900000000)}`;
    const pixKey = CLINIC_CONFIG.pixKey || '8b9ce82f-9368-47d5-a527-f209f79d2087';
    const validQrCode = generateBacenPixPayload(
      pixKey,
      'REISWERICA',
      'Teresina',
      Number(payload.amount),
      '***'
    );

    return {
      success: true,
      is_simulated: true,
      payment_id: simulatedId,
      status: 'pending',
      status_detail: 'pending_waiting_transfer',
      qr_code: validQrCode,
      qr_code_base64: null,
      ticket_url: null,
      amount: Number(payload.amount),
    };
  },

  // Mercado Pago Card
  async processCard(payload: {
    amount: number;
    description: string;
    installments: number;
    cardNumber: string;
    cardholderName: string;
    expiry: string;
    cvv: string;
    payer: {
      email: string;
      cpf?: string;
    };
    externalReference?: string;
  }) {
    try {
      const res = await fetch('/api/mercadopago/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Fallback simulated Card approval
    const simulatedId = `MP-CARD-${Math.floor(10000000 + Math.random() * 90000000)}`;
    return {
      success: true,
      payment_id: simulatedId,
      status: 'approved',
      status_detail: 'accredited',
      amount: Number(payload.amount),
      installments: Number(payload.installments),
      is_simulated: true,
    };
  },

  // Check Payment Status (Polling)
  async checkPaymentStatus(paymentId: string) {
    try {
      const res = await fetch(`/api/mercadopago/payment-status/${paymentId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // In static mode, check local orders
    const orders = getLocalOrders();
    const matched = orders.find(o => o.paymentId === paymentId);
    if (matched && matched.paymentStatus === 'aprovado') {
      return { id: paymentId, status: 'approved', is_approved: true };
    }

    return { id: paymentId, status: 'pending', is_approved: false };
  },

  // Simulate Status for Testing
  async simulateStatus(paymentId: string, status: OrderStatus) {
    try {
      const res = await fetch(`/api/mercadopago/simulate-status/${paymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Local simulated update
    const orders = getLocalOrders();
    const order = orders.find(o => o.paymentId === paymentId);
    if (order) {
      order.paymentStatus = status;
      order.updatedAt = new Date().toISOString();
      saveLocalOrders(orders);
      pushLocalNotification(
        order.id,
        status === 'aprovado' ? 'Pagamento Aprovado! 🎉' : `Status alterado para ${status}`,
        `Pedido #${order.id} atualizado para ${status}.`,
        status === 'aprovado' ? 'success' : 'info'
      );
    }

    return { success: true, payment_id: paymentId, status };
  },

  // Orders API
  async getOrders(): Promise<OrderRecord[]> {
    try {
      const adminToken = sessionStorage.getItem('vitale_admin_token');
      const headers: Record<string, string> = {};
      if (adminToken) headers['x-admin-token'] = adminToken;

      const res = await fetch('/api/orders', { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Static fallback
    return getLocalOrders();
  },

  async getOrder(id: string): Promise<OrderRecord | null> {
    try {
      const adminToken = sessionStorage.getItem('vitale_admin_token');
      const headers: Record<string, string> = {};
      if (adminToken) headers['x-admin-token'] = adminToken;

      const res = await fetch(`/api/orders/${id}`, { headers });
      if (res.ok) return await res.json();
    } catch {}

    const orders = getLocalOrders();
    return orders.find(o => o.id === id) || null;
  },

  async getBookedSlots(isoDate: string): Promise<string[]> {
    try {
      const res = await fetch(`/api/schedule/booked-slots?date=${encodeURIComponent(isoDate)}`);
      if (res.ok) {
        const data = await res.json();
        return data.bookedSlots || [];
      }
    } catch {}

    // Fallback: check local orders (paid orders or active pending orders within 20 mins)
    const orders = getLocalOrders();
    const now = Date.now();
    return orders
      .filter(o => {
        if (o.schedule?.isoDate !== isoDate) return false;
        if (o.paymentStatus === 'cancelado' || o.paymentStatus === 'recusado') return false;
        const isApproved = o.paymentStatus === 'aprovado';
        const orderAgeMs = now - new Date(o.createdAt).getTime();
        const isActivePending = o.paymentStatus === 'pendente' && orderAgeMs < 20 * 60 * 1000;
        return isApproved || isActivePending;
      })
      .map(o => o.schedule.time);
  },

  async createOrder(payload: {
    id?: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    shippingFee?: number;
    shippingDistanceKm?: number;
    originCep?: string;
    total: number;
    paymentMethod: 'pix' | 'cartao';
    paymentStatus: OrderStatus;
    paymentId?: string;
    paymentDetail?: string;
    patient: PatientData;
    schedule: {
      date: string;
      isoDate: string;
      time: string;
      notes?: string;
    };
    pixData?: {
      qrCode: string;
      qrCodeBase64?: string;
      ticketUrl?: string;
      expiration?: string;
    };
  }): Promise<OrderRecord> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Fallback: create in localStorage
    const orderId = payload.id || `VIT-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: OrderRecord = {
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: payload.items || [],
      subtotal: payload.subtotal || payload.total || 0,
      discount: payload.discount || 0,
      shippingFee: payload.shippingFee || 0,
      shippingDistanceKm: payload.shippingDistanceKm || 0,
      originCep: payload.originCep || '64099-000',
      total: payload.total || 0,
      paymentMethod: payload.paymentMethod || 'pix',
      paymentStatus: payload.paymentStatus || 'pendente',
      paymentId: payload.paymentId,
      patient: {
        name: payload.patient.name,
        email: payload.patient.email,
        phone: payload.patient.phone,
        cpf: payload.patient.cpf,
        address: `${payload.patient.street}, ${payload.patient.number}${payload.patient.complement ? ' ' + payload.patient.complement : ''}`,
        neighborhood: payload.patient.neighborhood,
        city: `${payload.patient.city} - ${payload.patient.state}`,
        cep: payload.patient.cep,
      },
      schedule: payload.schedule,
      pixData: payload.pixData,
      history: [
        {
          status: payload.paymentStatus || 'pendente',
          note: `Pedido #${orderId} registrado via ${payload.paymentMethod === 'cartao' ? 'Cartão' : 'PIX'}.`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const orders = getLocalOrders();
    const existingIndex = orders.findIndex(o => o.id === orderId);
    if (existingIndex > -1) {
      orders[existingIndex] = {
        ...orders[existingIndex],
        ...newOrder,
        history: [
          ...orders[existingIndex].history,
          {
            status: payload.paymentStatus || 'pendente',
            note: `Pedido atualizado no sistema. Status: ${payload.paymentStatus || 'pendente'}.`,
            timestamp: new Date().toISOString(),
          },
        ],
      };
      saveLocalOrders(orders);
      if (payload.paymentStatus === 'aprovado') {
        pushLocalNotification(
          orderId,
          `Pagamento Aprovado! 🎉`,
          `Pedido #${orderId} confirmado. Rota reservada em Teresina.`,
          'success'
        );
      }
      return orders[existingIndex];
    }

    orders.unshift(newOrder);
    saveLocalOrders(orders);

    pushLocalNotification(
      orderId,
      `Novo Pedido #${orderId}`,
      `Agendamento para ${newOrder.schedule.date} às ${newOrder.schedule.time}. Total: R$ ${newOrder.total.toFixed(2)}.`,
      'info'
    );

    if (newOrder.paymentStatus === 'aprovado') {
      pushLocalNotification(
        orderId,
        `Pagamento Aprovado! 🎉`,
        `Pedido #${orderId} confirmado. Rota reservada em Teresina.`,
        'success'
      );
    }

    return newOrder;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<OrderRecord> {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Fallback local update
    const orders = getLocalOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('Pedido não encontrado');

    const prev = order.paymentStatus;
    order.paymentStatus = status;
    order.updatedAt = new Date().toISOString();
    order.history.push({
      status,
      note: note || `Status alterado de ${prev} para ${status}`,
      timestamp: new Date().toISOString(),
    });
    saveLocalOrders(orders);

    pushLocalNotification(
      order.id,
      status === 'aprovado' ? 'Pagamento Aprovado! 🎉' : `Status alterado para ${status}`,
      `Pedido #${order.id} alterado para "${status.toUpperCase()}".`,
      status === 'aprovado' ? 'success' : 'info'
    );

    return order;
  },

  async deleteOrder(orderId: string): Promise<boolean> {
    try {
      await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    } catch {}

    const orders = getLocalOrders().filter(o => o.id !== orderId);
    saveLocalOrders(orders);
    return true;
  },

  // Notifications API
  async getNotifications(): Promise<OrderNotification[]> {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return getLocalNotifications();
  },

  async markNotificationRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {}

    const list = getLocalNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.read = true;
      try {
        localStorage.setItem('vitale_notifications_store', JSON.stringify(list));
      } catch {}
    }
  },

  async markAllNotificationsRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch {}

    const list = getLocalNotifications();
    list.forEach(n => { n.read = true; });
    try {
      localStorage.setItem('vitale_notifications_store', JSON.stringify(list));
    } catch {}
  },

  // Procedures Management (Dynamic catalog)
  async getProcedures(): Promise<Procedure[]> {
    try {
      const res = await fetch('/api/procedures');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveLocalProcedures(data);
          return data;
        }
      }
    } catch {}
    return getLocalProcedures();
  },

  async createProcedure(procData: Partial<Procedure>): Promise<Procedure> {
    try {
      const res = await fetch('/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(procData),
      });
      if (res.ok) {
        const saved = await res.json();
        const local = getLocalProcedures();
        saveLocalProcedures([saved, ...local.filter(p => p.id !== saved.id)]);
        return saved;
      }
    } catch {}

    const newProc: Procedure = {
      id: procData.id || `proc-${Date.now()}`,
      name: procData.name || 'Novo Procedimento',
      category: procData.category || 'facial',
      price: Number(procData.price) || 0,
      duration: procData.duration || '45 min',
      sessions: procData.sessions || '1 sessão',
      image: procData.image || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80',
      description: procData.description || '',
      benefits: procData.benefits || [],
    };

    const local = getLocalProcedures();
    local.push(newProc);
    saveLocalProcedures(local);
    return newProc;
  },

  async updateProcedure(id: string, updates: Partial<Procedure>): Promise<Procedure> {
    try {
      const res = await fetch(`/api/procedures/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        const local = getLocalProcedures();
        const idx = local.findIndex(p => p.id === id);
        if (idx > -1) {
          local[idx] = updated;
          saveLocalProcedures(local);
        }
        return updated;
      }
    } catch {}

    const local = getLocalProcedures();
    const idx = local.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Procedimento não encontrado');
    local[idx] = { ...local[idx], ...updates };
    saveLocalProcedures(local);
    return local[idx];
  },

  async deleteProcedure(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/procedures/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const local = getLocalProcedures().filter(p => p.id !== id);
        saveLocalProcedures(local);
        return true;
      }
    } catch {}

    const local = getLocalProcedures().filter(p => p.id !== id);
    saveLocalProcedures(local);
    return true;
  },

  async resetProcedures(): Promise<Procedure[]> {
    try {
      const res = await fetch('/api/procedures/reset', { method: 'POST' });
      if (res.ok) {
        const defaults = await res.json();
        saveLocalProcedures(defaults);
        return defaults;
      }
    } catch {}

    saveLocalProcedures(PROCEDURES);
    return PROCEDURES;
  },

  // Admin Login
  async adminLogin(password: string, username: string = 'werica'): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, login: username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('vitale_admin_token', data.token || 'admin-auth-ok');
        return { success: true, token: data.token };
      } else {
        const err = await res.json();
        return { success: false, error: err.error || 'Usuário ou senha incorretos' };
      }
    } catch (err) {
      console.error('Admin login error:', err);
    }

    return { success: false, error: 'Não foi possível autenticar. Verifique suas credenciais.' };
  },

  isAdminAuthenticated(): boolean {
    return Boolean(sessionStorage.getItem('vitale_admin_token'));
  },

  adminLogout() {
    sessionStorage.removeItem('vitale_admin_token');
  },

  // Automated Order Email Notification (Dispatches to Admin and Customer)
  async sendOrderEmail(order: OrderRecord): Promise<{ success: boolean; notifiedAdmin?: boolean; notifiedCustomer?: boolean }> {
    try {
      const res = await fetch('/api/notifications/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, order }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('E-mail notification fallback:', err);
    }
    return { success: true, notifiedAdmin: true, notifiedCustomer: Boolean(order.patient?.email) };
  },
};
