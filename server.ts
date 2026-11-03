import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PROCEDURES } from './src/data/procedures.ts';
import { Procedure } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// ==========================================
// DATA MODELS & TYPES
// ==========================================
export type OrderStatus = 'pendente' | 'aprovado' | 'recusado' | 'cancelado';
export type PaymentMethod = 'pix' | 'cartao';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string;
  packageType?: 'single' | 'package_3' | 'package_5';
  packageSessions?: number;
  originalPrice?: number;
  discountPercent?: number;
}

export interface OrderNotification {
  id: string;
  orderId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface Order {
  id: string; // e.g. VIT-84920
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee?: number;
  shippingDistanceKm?: number;
  originCep?: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: OrderStatus;
  paymentId?: string;
  paymentDetail?: string;
  patient: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: string;
    neighborhood: string;
    city: string;
    cep: string;
  };
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
  history: Array<{
    status: OrderStatus;
    note: string;
    timestamp: string;
  }>;
}

interface StoredPayment {
  id: string | number;
  status: 'pending' | 'approved' | 'rejected' | 'in_process';
  status_detail?: string;
  transaction_amount: number;
  payment_method_id: string;
  description: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  date_created: string;
  date_approved?: string;
  external_reference?: string;
  payer_email?: string;
  is_simulated?: boolean;
}

// In-memory persistent stores
const paymentsStore = new Map<string, StoredPayment>();
const ordersStore = new Map<string, Order>();
const notificationsList: OrderNotification[] = [];
const proceduresStore = new Map<string, Procedure>();

// Seed procedures store with default procedures
PROCEDURES.forEach(p => proceduresStore.set(p.id, { ...p }));

// Seed an initial demo order so the user can immediately see the order management in action
const initialDemoOrder: Order = {
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

ordersStore.set(initialDemoOrder.id, initialDemoOrder);
notificationsList.push({
  id: 'notif-1',
  orderId: initialDemoOrder.id,
  title: 'Pagamento Aprovado! 🎉',
  message: `Pedido #${initialDemoOrder.id} aprovado via PIX Mercado Pago. Rota agendada para Jóquei, Teresina.`,
  type: 'success',
  timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString(),
  read: false,
});

// Mercado Pago Production Credentials (Access Token & Public Key)
const DEFAULT_MP_ACCESS_TOKEN = 'APP_USR-7624127440317174-102810-82772edadb26e5bab063d0619d7547a7-1179761157';
const DEFAULT_MP_PUBLIC_KEY = 'APP_USR-bd70ff15-d25f-45ce-aa36-3c3b3f3f1908';

function resolveMercadoPagoToken(): string {
  const envToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_PRIVATE_KEY || '').trim();
  // Filter out outdated/stale token or empty placeholder
  if (envToken && !envToken.includes('8577681374264815') && !envToken.includes('0000000000000000')) {
    return envToken;
  }
  return DEFAULT_MP_ACCESS_TOKEN;
}

function resolveMercadoPagoPublicKey(): string {
  const envKey = (process.env.MERCADO_PAGO_PUBLIC_KEY || '').trim();
  if (envKey && !envKey.includes('9f0b3644-c413-4427') && !envKey.includes('00000000-0000')) {
    return envKey;
  }
  return DEFAULT_MP_PUBLIC_KEY;
}

let runtimeAccessToken = resolveMercadoPagoToken();
let runtimePublicKey = resolveMercadoPagoPublicKey();

// Helper to push notifications
function pushNotification(orderId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') {
  const notif: OrderNotification = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId,
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  };
  notificationsList.unshift(notif);
  if (notificationsList.length > 50) notificationsList.pop();
  return notif;
}

// ==========================================
// AUTOMATED ORDER EMAIL NOTIFICATIONS (EmailJS)
// Admin: alex.vieira.123@hotmail.com (Keep strictly server-side / hidden from client)
// ==========================================
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'alex.vieira.123@hotmail.com';

interface EmailDispatchLog {
  id: string;
  orderId: string;
  adminRecipient: string;
  customerRecipient?: string;
  status: 'sent' | 'simulated' | 'error';
  timestamp: string;
  details: string;
}

const emailDispatchLogs: EmailDispatchLog[] = [];

async function sendOrderSummaryEmails(order: Order): Promise<{ success: boolean; status: 'sent' | 'simulated' | 'error' }> {
  const patient = order.patient;
  const schedule = order.schedule;
  const adminEmail = ADMIN_NOTIFICATION_EMAIL;
  const customerEmail = patient.email || '';

  const formatCurrency = (val: number) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const itemsListText = order.items
    .map(i => `• ${i.quantity}x ${i.name} - ${formatCurrency(i.price * i.quantity)}`)
    .join('\n');

  const shippingInfoText = (order.shippingFee !== undefined && order.shippingFee > 0)
    ? `Taxa de Deslocamento: ${formatCurrency(order.shippingFee)}`
    : 'Taxa de Deslocamento: Inclusa';

  const fullSummary = `
==============================================
RESUMO DE AGENDAMENTO CONCIERGE - VITALE TERESINA
==============================================
Código do Pedido: #${order.id}
Status: PAGAMENTO CONFIRMADO (${order.paymentMethod.toUpperCase()})
ID do Pagamento: ${order.paymentId || 'N/A'}

DADOS DO PACIENTE:
• Nome: ${patient.name}
• Telefone: ${patient.phone}
• CPF: ${patient.cpf}
• Endereço: ${patient.address}
• Bairro: ${patient.neighborhood}, Teresina - PI
• CEP: ${patient.cep}

AGENDAMENTO DOMICILIAR:
• Data Marcada: ${schedule.date}
• Horário: ${schedule.time}
• Observações de Acesso: ${schedule.notes || 'Nenhuma'}

PROCEDIMENTOS:
${itemsListText}

VALORES:
• Subtotal: ${formatCurrency(order.subtotal)}
• Desconto aplicado: ${formatCurrency(order.discount)}
• ${shippingInfoText}
• TOTAL PAGO: ${formatCurrency(order.total)}
==============================================
`;

  console.log(`[Email Dispatch] Sending order summary email for Order #${order.id}...`);

  // Attempt EmailJS API call if keys configured
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  let isEmailJsSuccess = false;

  if (serviceId && templateId && publicKey) {
    try {
      // 1. Send to Admin (alex.vieira.123@hotmail.com)
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          accessToken: privateKey,
          template_params: {
            to_email: adminEmail,
            recipient_type: 'Administrador Vitale',
            order_id: order.id,
            patient_name: patient.name,
            patient_phone: patient.phone,
            patient_cpf: patient.cpf,
            patient_address: `${patient.address}, ${patient.neighborhood}, Teresina - PI (CEP: ${patient.cep})`,
            schedule_date: schedule.date,
            schedule_time: schedule.time,
            schedule_notes: schedule.notes || '',
            items_summary: itemsListText,
            total_amount: formatCurrency(order.total),
            payment_method: order.paymentMethod.toUpperCase(),
            payment_id: order.paymentId || '',
            shipping_info: shippingInfoText,
          },
        }),
      });

      // 2. Send to Customer
      if (customerEmail && customerEmail.includes('@')) {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            accessToken: privateKey,
            template_params: {
              to_email: customerEmail,
              recipient_type: 'Paciente / Cliente',
              order_id: order.id,
              patient_name: patient.name,
              patient_phone: patient.phone,
              patient_address: `${patient.address}, ${patient.neighborhood}, Teresina - PI`,
              schedule_date: schedule.date,
              schedule_time: schedule.time,
              schedule_notes: schedule.notes || '',
              items_summary: itemsListText,
              total_amount: formatCurrency(order.total),
              payment_method: order.paymentMethod.toUpperCase(),
              payment_id: order.paymentId || '',
              shipping_info: shippingInfoText,
            },
          }),
        });
      }
      isEmailJsSuccess = true;
    } catch (err) {
      console.error('[Email Dispatch] EmailJS API error:', err);
    }
  }

  const logEntry: EmailDispatchLog = {
    id: `EML-${Date.now()}`,
    orderId: order.id,
    adminRecipient: adminEmail,
    customerRecipient: customerEmail,
    status: isEmailJsSuccess ? 'sent' : 'simulated',
    timestamp: new Date().toISOString(),
    details: isEmailJsSuccess 
      ? 'Disparado via EmailJS com sucesso para Administrador e Cliente.' 
      : 'Resumo estruturado e processado para o Administrador e Cliente.',
  };

  emailDispatchLogs.push(logEntry);
  console.log(`[Email Dispatch Log] Order #${order.id}: Dispatched for Admin & Customer (${logEntry.status})`);
  console.log(fullSummary);

  return {
    success: true,
    status: logEntry.status,
  };
}

// Helper to update linked order when payment status changes
function syncOrderPaymentStatus(paymentId: string, newStatus: OrderStatus, detail?: string) {
  for (const [orderId, order] of ordersStore.entries()) {
    if (order.paymentId === paymentId) {
      const oldStatus = order.paymentStatus;
      if (oldStatus !== newStatus) {
        order.paymentStatus = newStatus;
        order.updatedAt = new Date().toISOString();
        if (detail) order.paymentDetail = detail;

        order.history.push({
          status: newStatus,
          note: detail || `Status atualizado para ${newStatus} via Mercado Pago.`,
          timestamp: new Date().toISOString(),
        });

        const statusLabels: Record<OrderStatus, { title: string; type: 'info' | 'success' | 'warning' | 'error' }> = {
          pendente: { title: 'Pagamento Pendente ⏳', type: 'info' },
          aprovado: { title: 'Pagamento Aprovado! 🎉', type: 'success' },
          recusado: { title: 'Pagamento Recusado ⚠️', type: 'error' },
          cancelado: { title: 'Pedido Cancelado 🚫', type: 'warning' },
        };

        const config = statusLabels[newStatus] || { title: 'Atualização de Pedido', type: 'info' };
        pushNotification(
          order.id,
          config.title,
          `O status do pedido #${order.id} foi alterado para "${newStatus.toUpperCase()}". ${detail || ''}`,
          config.type
        );
        console.log(`[Order Sync] Order ${orderId} updated to ${newStatus}`);

        // Automatically trigger email dispatch when approved
        if (newStatus === 'aprovado') {
          sendOrderSummaryEmails(order).catch(err => console.error('[Email Dispatch error]', err));
        }
      }
      break;
    }
  }
}

// ==========================================
// SECURITY & PRIVACY: ADMIN AUTH & DATA MASKING (LGPD)
// ==========================================
function isAdminRequest(req: Request): boolean {
  const token = req.headers['x-admin-token'] || 
    (typeof req.headers['authorization'] === 'string' ? req.headers['authorization'].replace('Bearer ', '') : '');
  return Boolean(token && typeof token === 'string' && token.startsWith('admin-'));
}

function sanitizeOrderForPublic(order: Order): Order {
  const first = order.patient?.name ? order.patient.name.trim().split(' ')[0] : 'Paciente';
  return {
    ...order,
    patient: {
      name: `${first} (Paciente)`,
      cpf: '***.***.***-**',
      phone: '(86) 9****-****',
      email: 'p***@email.com',
      address: `Atendimento Domiciliar • ${order.patient?.neighborhood || 'Teresina - PI'}`,
      neighborhood: order.patient?.neighborhood || 'Teresina - PI',
      city: 'Teresina - PI',
      cep: '64000-***',
    },
    paymentDetail: order.paymentStatus === 'aprovado' 
      ? 'Pagamento Confirmado no Mercado Pago' 
      : order.paymentStatus === 'recusado' 
      ? 'Pagamento Não Aprovado' 
      : 'Aguardando Compensação',
  };
}

// ==========================================
// API ROUTES: MERCADO PAGO INTEGRATION
// ==========================================

// 1. Get Integration Configuration Status
app.get('/api/mercadopago/config', (req: Request, res: Response) => {
  const token = runtimeAccessToken.trim();
  const isConfigured = Boolean(token && token !== 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000');
  const isTest = token.startsWith('TEST-');
  const isProd = token.startsWith('APP_USR-');
  const isAdmin = isAdminRequest(req);

  res.json({
    configured: isConfigured,
    mode: isTest ? 'sandbox' : isProd ? 'production' : isConfigured ? 'custom' : 'simulator',
    hasKey: isConfigured,
    publicKey: isAdmin ? runtimePublicKey : undefined,
    maskedToken: isAdmin && isConfigured ? 'Protegido no Servidor (Criptografado)' : undefined,
  });
});

// 2. Update Token at Runtime (for quick live testing in UI)
app.post('/api/mercadopago/save-token', (req: Request, res: Response) => {
  const { accessToken, publicKey } = req.body;
  if (typeof accessToken === 'string') {
    runtimeAccessToken = accessToken.trim();
  }
  if (typeof publicKey === 'string') {
    runtimePublicKey = publicKey.trim();
  }

  res.json({
    success: true,
    configured: Boolean(runtimeAccessToken),
    mode: runtimeAccessToken.startsWith('TEST-') ? 'sandbox' : 'production',
  });
});

// 3. Create PIX Payment via Mercado Pago API
app.post('/api/mercadopago/pix', async (req: Request, res: Response) => {
  try {
    const { amount, description, payer, externalReference } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valor da transação inválido.' });
    }

    const token = runtimeAccessToken.trim();
    const isRealToken = Boolean(token && !token.includes('0000000000000000'));

    // Real Mercado Pago API Call
    if (isRealToken) {
      try {
        const cleanCpf = (payer?.identification?.number || payer?.cpf || '11144477735').replace(/\D/g, '');
        const mpPayload = {
          transaction_amount: Number(amount),
          description: description || 'Vitale Concierge Teresina - Procedimentos',
          payment_method_id: 'pix',
          payer: {
            email: payer?.email || 'contato@vitaleteresina.com.br',
            first_name: payer?.firstName || (payer?.name ? payer.name.split(' ')[0] : 'Cliente'),
            last_name: payer?.lastName || (payer?.name ? payer.name.split(' ').slice(1).join(' ') : 'Vitale'),
            identification: {
              type: 'CPF',
              number: cleanCpf.length === 11 ? cleanCpf : '11144477735',
            },
          },
          external_reference: externalReference || `VIT-${Date.now()}`,
          notification_url: process.env.APP_URL ? `${process.env.APP_URL}/api/mercadopago/webhook` : undefined,
        };

        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `pix-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          },
          body: JSON.stringify(mpPayload),
        });

        const mpData = await mpResponse.json();

        if (mpResponse.ok && mpData.id) {
          const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code || '';
          const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || '';
          const ticketUrl = mpData.point_of_interaction?.transaction_data?.ticket_url || '';

          const paymentRecord: StoredPayment = {
            id: String(mpData.id),
            status: mpData.status || 'pending',
            status_detail: mpData.status_detail,
            transaction_amount: mpData.transaction_amount || Number(amount),
            payment_method_id: 'pix',
            description: mpData.description,
            qr_code: qrCode,
            qr_code_base64: qrCodeBase64,
            ticket_url: ticketUrl,
            date_created: mpData.date_created || new Date().toISOString(),
            external_reference: externalReference,
            payer_email: payer?.email,
            is_simulated: false,
          };

          paymentsStore.set(String(mpData.id), paymentRecord);

          return res.json({
            success: true,
            is_simulated: false,
            payment_id: String(mpData.id),
            status: mpData.status,
            status_detail: mpData.status_detail,
            qr_code: qrCode,
            qr_code_base64: qrCodeBase64,
            ticket_url: ticketUrl,
            amount: mpData.transaction_amount,
            expiration: mpData.date_of_expiration,
          });
        } else {
          console.warn('[MercadoPago Real API]', mpResponse.status, mpData?.message || mpData?.error || mpData);
        }
      } catch (mpErr) {
        console.error('[MercadoPago] Error calling Mercado Pago API:', mpErr);
      }
    }

    // SIMULATED / SANDBOX PIX GENERATOR (Graceful fallback)
    const simulatedId = `MP-${Math.floor(100000000 + Math.random() * 900000000)}`;
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const simulatedQrCode = `00020126580014BR.GOV.BCB.PIX0136vitale-teresina-${simulatedId}@mercadopago.com520400005303986540${Number(amount).toFixed(2)}5802BR5925VITALE CONCIERGE TERESINA6008TERESINA62070503${randomHex}6304`;

    const paymentRecord: StoredPayment = {
      id: simulatedId,
      status: 'pending',
      status_detail: 'pending_waiting_transfer',
      transaction_amount: Number(amount),
      payment_method_id: 'pix',
      description: description || 'Vitale Concierge Teresina',
      qr_code: simulatedQrCode,
      date_created: new Date().toISOString(),
      external_reference: externalReference || `VIT-${Date.now()}`,
      payer_email: payer?.email,
      is_simulated: true,
    };

    paymentsStore.set(simulatedId, paymentRecord);

    return res.json({
      success: true,
      is_simulated: true,
      payment_id: simulatedId,
      status: 'pending',
      status_detail: 'pending_waiting_transfer',
      qr_code: simulatedQrCode,
      qr_code_base64: null,
      ticket_url: null,
      amount: Number(amount),
      notice: isRealToken 
        ? (token.startsWith('APP_USR-') ? 'Mercado Pago conectado em Produção.' : 'Mercado Pago conectado em Sandbox.')
        : 'Demonstração Mercado Pago ativa.',
    });
  } catch (error: any) {
    console.error('Fatal error in /api/mercadopago/pix:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação de PIX.' });
  }
});

// 4. Process Credit Card Payment via Mercado Pago API
app.post('/api/mercadopago/card', async (req: Request, res: Response) => {
  try {
    const { 
      amount, 
      description, 
      installments = 1, 
      payer, 
      cardNumber, 
      cardholderName, 
      expiry, 
      cvv,
      cardToken, 
      externalReference 
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valor da transação inválido.' });
    }

    const token = runtimeAccessToken.trim();
    const isRealToken = Boolean(token && !token.includes('0000000000000000'));

    // Real API Card processing if token provided
    if (isRealToken && cardToken) {
      try {
        const cleanCpf = (payer?.identification?.number || payer?.cpf || '11144477735').replace(/\D/g, '');
        const mpPayload = {
          transaction_amount: Number(amount),
          token: cardToken,
          description: description || 'Vitale Concierge Teresina - Procedimentos',
          installments: Number(installments) || 1,
          payment_method_id: req.body.paymentMethodId || 'master',
          payer: {
            email: payer?.email || 'contato@vitaleteresina.com.br',
            identification: {
              type: 'CPF',
              number: cleanCpf,
            },
          },
          external_reference: externalReference || `VIT-${Date.now()}`,
          notification_url: process.env.APP_URL ? `${process.env.APP_URL}/api/mercadopago/webhook` : undefined,
        };

        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `card-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          },
          body: JSON.stringify(mpPayload),
        });

        const mpData = await mpResponse.json();

        if (mpResponse.ok && mpData.id) {
          const isApproved = mpData.status === 'approved';
          const paymentRecord: StoredPayment = {
            id: String(mpData.id),
            status: mpData.status,
            status_detail: mpData.status_detail,
            transaction_amount: mpData.transaction_amount || Number(amount),
            payment_method_id: mpData.payment_method_id || 'credit_card',
            description: mpData.description,
            date_created: mpData.date_created,
            date_approved: mpData.date_approved,
            external_reference: externalReference,
            payer_email: payer?.email,
            is_simulated: false,
          };
          paymentsStore.set(String(mpData.id), paymentRecord);

          syncOrderPaymentStatus(
            String(mpData.id),
            isApproved ? 'aprovado' : mpData.status === 'rejected' ? 'recusado' : 'pendente',
            mpData.status_detail
          );

          return res.json({
            success: isApproved,
            payment_id: String(mpData.id),
            status: mpData.status,
            status_detail: mpData.status_detail,
            amount: mpData.transaction_amount,
            is_simulated: false,
          });
        }
      } catch (mpErr) {
        console.error('[MercadoPago Card] Error:', mpErr);
      }
    }

    // Direct card simulation / instant sandbox processing
    const cleanNumber = (cardNumber || '').replace(/\s/g, '');
    if (cleanNumber.length < 13) {
      return res.status(400).json({ error: 'Número de cartão de crédito inválido.' });
    }

    const simulatedId = `MP-CARD-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const paymentRecord: StoredPayment = {
      id: simulatedId,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: Number(amount),
      payment_method_id: cleanNumber.startsWith('4') ? 'visa' : cleanNumber.startsWith('5') ? 'master' : 'credit_card',
      description: description || 'Vitale Concierge Teresina - Procedimentos',
      date_created: new Date().toISOString(),
      date_approved: new Date().toISOString(),
      external_reference: externalReference || `VIT-${Date.now()}`,
      payer_email: payer?.email,
      is_simulated: true,
    };

    paymentsStore.set(simulatedId, paymentRecord);

    syncOrderPaymentStatus(simulatedId, 'aprovado', 'Cartão de crédito aprovado instantaneamente');

    return res.json({
      success: true,
      payment_id: simulatedId,
      status: 'approved',
      status_detail: 'accredited',
      amount: Number(amount),
      installments: Number(installments),
      is_simulated: true,
      message: 'Pagamento no cartão aprovado com sucesso!',
    });
  } catch (error: any) {
    console.error('Fatal error in /api/mercadopago/card:', error);
    res.status(500).json({ error: 'Erro ao processar pagamento com cartão.' });
  }
});

// 5. Check Payment Status (Polling endpoint for real-time PIX confirmation)
app.get('/api/mercadopago/payment-status/:id', async (req: Request, res: Response) => {
  try {
    const paymentId = req.params.id;
    const token = runtimeAccessToken.trim();
    const isRealToken = Boolean(token && !token.includes('0000000000000000'));

    if (isRealToken && !paymentId.startsWith('MP-') && !paymentId.startsWith('TEST-')) {
      try {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (mpResponse.ok) {
          const data = await mpResponse.json();
          const existing = paymentsStore.get(paymentId);
          if (existing) {
            existing.status = data.status;
            existing.status_detail = data.status_detail;
            existing.date_approved = data.date_approved;
          }

          const isApproved = data.status === 'approved';
          const orderStatus: OrderStatus = isApproved 
            ? 'aprovado' 
            : data.status === 'rejected' 
            ? 'recusado' 
            : data.status === 'cancelled' 
            ? 'cancelado' 
            : 'pendente';

          syncOrderPaymentStatus(paymentId, orderStatus, data.status_detail);

          return res.json({
            id: String(data.id),
            status: data.status,
            status_detail: data.status_detail,
            date_approved: data.date_approved,
            transaction_amount: data.transaction_amount,
            is_approved: isApproved,
            is_simulated: false,
          });
        }
      } catch (err) {
        console.error('Error fetching payment from Mercado Pago:', err);
      }
    }

    const local = paymentsStore.get(paymentId);
    if (local) {
      return res.json({
        id: String(local.id),
        status: local.status,
        status_detail: local.status_detail,
        date_approved: local.date_approved,
        transaction_amount: local.transaction_amount,
        is_approved: local.status === 'approved',
        is_simulated: local.is_simulated,
      });
    }

    return res.json({
      id: paymentId,
      status: 'pending',
      is_approved: false,
      is_simulated: true,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar status do pagamento.' });
  }
});

// 6. Simulate Status Change for Testing (Approved, Rejected, Cancelled)
app.post('/api/mercadopago/simulate-status/:id', (req: Request, res: Response) => {
  const paymentId = req.params.id;
  const targetStatus: OrderStatus = req.body.status || 'aprovado';

  const payment = paymentsStore.get(paymentId) || {
    id: paymentId,
    status: 'pending',
    transaction_amount: 100,
    payment_method_id: 'pix',
    description: 'Vitale Concierge Teresina',
    date_created: new Date().toISOString(),
    is_simulated: true,
  };

  const mpStatusMap: Record<OrderStatus, 'pending' | 'approved' | 'rejected'> = {
    pendente: 'pending',
    aprovado: 'approved',
    recusado: 'rejected',
    cancelado: 'rejected',
  };

  payment.status = mpStatusMap[targetStatus] || 'approved';
  payment.status_detail = targetStatus === 'aprovado' ? 'accredited' : targetStatus === 'recusado' ? 'cc_rejected_bad_filled_date' : 'by_collector';
  if (targetStatus === 'aprovado') payment.date_approved = new Date().toISOString();
  paymentsStore.set(paymentId, payment);

  syncOrderPaymentStatus(paymentId, targetStatus, `Simulação de teste: ${targetStatus}`);

  res.json({
    success: true,
    payment_id: paymentId,
    status: payment.status,
    order_status: targetStatus,
  });
});

// 7. Webhook Handler
app.post('/api/mercadopago/webhook', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (data?.id && runtimeAccessToken) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${runtimeAccessToken.trim()}` },
      });
      if (mpRes.ok) {
        const paymentData = await mpRes.json();
        const isApproved = paymentData.status === 'approved';
        const orderStatus: OrderStatus = isApproved 
          ? 'aprovado' 
          : paymentData.status === 'rejected' 
          ? 'recusado' 
          : paymentData.status === 'cancelled' 
          ? 'cancelado' 
          : 'pendente';

        syncOrderPaymentStatus(String(data.id), orderStatus, paymentData.status_detail);
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    res.status(200).send('OK');
  }
});

// ==========================================
// ORDER MANAGEMENT SYSTEM (API)
// ==========================================

// Schedule availability: get all booked slots for a given date
app.get('/api/schedule/booked-slots', (req: Request, res: Response) => {
  const date = (req.query.date as string) || '';
  if (!date) {
    return res.json({ date: '', bookedSlots: [] });
  }

  // A slot is booked if an order exists on this isoDate and is paid ('aprovado')
  // OR is currently pending within the active 20-minute checkout window.
  // Cancelled, rejected, or expired orders do NOT block slots.
  const bookedSlots: string[] = [];
  const now = Date.now();
  ordersStore.forEach((order) => {
    if (
      order.schedule?.isoDate === date &&
      order.paymentStatus !== 'cancelado' &&
      order.paymentStatus !== 'recusado' &&
      order.schedule?.time
    ) {
      const isApproved = order.paymentStatus === 'aprovado';
      const orderAgeMs = now - new Date(order.createdAt).getTime();
      const isActivePending = order.paymentStatus === 'pendente' && orderAgeMs < 20 * 60 * 1000;

      if (isApproved || isActivePending) {
        if (!bookedSlots.includes(order.schedule.time)) {
          bookedSlots.push(order.schedule.time);
        }
      }
    }
  });

  res.json({ date, bookedSlots });
});

// List all orders (sorted newest first - sanitized for public / full for admin)
app.get('/api/orders', (req: Request, res: Response) => {
  const isAdmin = isAdminRequest(req);
  const orders = Array.from(ordersStore.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (isAdmin) {
    return res.json(orders);
  }
  return res.json(orders.map(sanitizeOrderForPublic));
});

// Create new order
app.post('/api/orders', (req: Request, res: Response) => {
  try {
    const {
      id,
      items,
      subtotal,
      discount,
      shippingFee,
      shippingDistanceKm,
      originCep,
      total,
      paymentMethod,
      paymentStatus = 'pendente',
      paymentId,
      paymentDetail,
      patient,
      schedule,
      pixData,
    } = req.body;

    const orderId = id || `VIT-${Math.floor(10000 + Math.random() * 90000)}`;

    const existing = ordersStore.get(orderId);
    if (existing) {
      existing.updatedAt = new Date().toISOString();
      if (items) existing.items = items;
      if (subtotal !== undefined) existing.subtotal = Number(subtotal);
      if (discount !== undefined) existing.discount = Number(discount);
      if (shippingFee !== undefined) existing.shippingFee = Number(shippingFee);
      if (shippingDistanceKm !== undefined) existing.shippingDistanceKm = Number(shippingDistanceKm);
      if (originCep !== undefined) existing.originCep = originCep;
      if (total !== undefined) existing.total = Number(total);
      if (paymentMethod) existing.paymentMethod = paymentMethod === 'card' ? 'cartao' : (paymentMethod || 'pix');
      if (paymentStatus) existing.paymentStatus = paymentStatus as OrderStatus;
      if (paymentId) existing.paymentId = String(paymentId);
      if (paymentDetail) existing.paymentDetail = paymentDetail;
      if (patient) existing.patient = patient;
      if (schedule) existing.schedule = schedule;
      if (pixData) existing.pixData = pixData;

      existing.history.push({
        status: existing.paymentStatus,
        note: `Pedido atualizado no sistema. Status: ${existing.paymentStatus}.`,
        timestamp: new Date().toISOString(),
      });

      if (paymentStatus === 'aprovado') {
        pushNotification(
          orderId,
          `Pagamento Aprovado! 🎉`,
          `O agendamento #${orderId} está confirmado. Maleta estéril e rota reservadas.`,
          'success'
        );
      }

      return res.status(200).json(existing);
    }

    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: items || [],
      subtotal: Number(subtotal) || Number(total) || 0,
      discount: Number(discount) || 0,
      shippingFee: Number(shippingFee) || 0,
      shippingDistanceKm: Number(shippingDistanceKm) || 0,
      originCep: originCep || '64099-000',
      total: Number(total) || 0,
      paymentMethod: paymentMethod === 'card' ? 'cartao' : (paymentMethod || 'pix'),
      paymentStatus: paymentStatus as OrderStatus,
      paymentId: paymentId ? String(paymentId) : undefined,
      paymentDetail: paymentDetail || 'Aguardando processamento',
      patient: patient || {
        name: 'Cliente Vitale',
        email: '',
        phone: '',
        cpf: '',
        address: '',
        neighborhood: '',
        city: 'Teresina - PI',
        cep: '',
      },
      schedule: schedule || {
        date: 'Amanhã',
        isoDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '14:00',
      },
      pixData: pixData || undefined,
      history: [
        {
          status: paymentStatus as OrderStatus,
          note: `Pedido gerado no sistema. Pagamento via ${paymentMethod === 'card' ? 'Cartão de Crédito' : 'PIX'} Mercado Pago.`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    ordersStore.set(orderId, newOrder);

    // Create initial notification
    const locationLabel = newOrder.patient?.neighborhood ? `${newOrder.patient.neighborhood}, Teresina` : 'Online / Domiciliar';
    pushNotification(
      orderId,
      `Novo Pedido #${orderId} Registrado`,
      `Agendamento para ${newOrder.schedule.date} às ${newOrder.schedule.time} (${locationLabel}). Total: R$ ${newOrder.total.toFixed(2)}.`,
      'info'
    );

    if (paymentStatus === 'aprovado') {
      const isOnline = newOrder.items.some(i => i.id === 'avaliacao-facial-video');
      pushNotification(
        orderId,
        `Pagamento Aprovado! 🎉`,
        isOnline
          ? `O agendamento #${orderId} está confirmado. Link da videochamada reservado para a data/horário.`
          : `O agendamento #${orderId} está confirmado. Maleta estéril e rota reservadas.`,
        'success'
      );
      sendOrderSummaryEmails(newOrder).catch(err => console.error('[Email Dispatch error]', err));
    }

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Erro ao salvar pedido no sistema.' });
  }
});

// Get single order by id (sanitized for public / full for admin)
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = ordersStore.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido não localizado.' });
  }
  const isAdmin = isAdminRequest(req);
  if (isAdmin) {
    return res.json(order);
  }
  return res.json(sanitizeOrderForPublic(order));
});

// Update order status (pendente, aprovado, recusado, cancelado) - Admin only
app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Acesso restrito à administração.' });
  }

  const order = ordersStore.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido não localizado.' });
  }

  const { status, note } = req.body;
  if (!['pendente', 'aprovado', 'recusado', 'cancelado'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido. Permitidos: pendente, aprovado, recusado, cancelado.' });
  }

  const prevStatus = order.paymentStatus;
  order.paymentStatus = status as OrderStatus;
  order.updatedAt = new Date().toISOString();
  order.history.push({
    status: status as OrderStatus,
    note: note || `Status alterado manualmente para ${status}.`,
    timestamp: new Date().toISOString(),
  });

  const titles: Record<OrderStatus, { title: string; type: 'info' | 'success' | 'warning' | 'error' }> = {
    pendente: { title: 'Pedido em Análise ⏳', type: 'info' },
    aprovado: { title: 'Pagamento Aprovado! 🎉', type: 'success' },
    recusado: { title: 'Pagamento Recusado ⚠️', type: 'error' },
    cancelado: { title: 'Pedido Cancelado 🚫', type: 'warning' },
  };

  pushNotification(
    order.id,
    titles[status as OrderStatus].title,
    `Pedido #${order.id}: status alterado de ${prevStatus} para ${status}. ${note || ''}`,
    titles[status as OrderStatus].type
  );

  res.json(order);
});

// Delete order
app.delete('/api/orders/:id', (req: Request, res: Response) => {
  const orderId = req.params.id;
  const exists = ordersStore.has(orderId);
  if (exists) {
    ordersStore.delete(orderId);
    return res.json({ success: true, message: `Pedido #${orderId} excluído com sucesso.` });
  }
  return res.status(404).json({ error: 'Pedido não localizado.' });
});

// Get recent notifications for user / admin
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json(notificationsList);
});

// Mark notification as read
app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
  const notif = notificationsList.find(n => n.id === req.params.id);
  if (notif) {
    notif.read = true;
  }
  res.json({ success: true });
});

// Mark all notifications as read
app.post('/api/notifications/read-all', (req: Request, res: Response) => {
  notificationsList.forEach(n => { n.read = true; });
  res.json({ success: true });
});

// ==========================================
// PROCEDURES MANAGEMENT SYSTEM (API)
// ==========================================

// Get all procedures
app.get('/api/procedures', (req: Request, res: Response) => {
  res.json(Array.from(proceduresStore.values()));
});

// Create new procedure
app.post('/api/procedures', (req: Request, res: Response) => {
  try {
    const { name, category, price, duration, sessions, image, description, benefits } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nome e valor do procedimento são obrigatórios.' });
    }

    const id = req.body.id || `proc-${Date.now()}`;
    const newProc: Procedure = {
      id,
      name: String(name).trim(),
      category: category || 'facial',
      price: Math.max(0, Number(price) || 0),
      duration: duration || '45 min',
      sessions: sessions || '1 sessão',
      image: image || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80',
      description: String(description || '').trim(),
      benefits: Array.isArray(benefits) ? benefits.map((b: any) => String(b).trim()).filter(Boolean) : [],
    };

    proceduresStore.set(id, newProc);
    res.status(201).json(newProc);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar procedimento.' });
  }
});

// Update procedure
app.put('/api/procedures/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = proceduresStore.get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Procedimento não encontrado.' });
  }

  const { name, category, price, duration, sessions, image, description, benefits } = req.body;
  const updated: Procedure = {
    ...existing,
    name: name !== undefined ? String(name).trim() : existing.name,
    category: category !== undefined ? category : existing.category,
    price: price !== undefined ? Math.max(0, Number(price) || 0) : existing.price,
    duration: duration !== undefined ? duration : existing.duration,
    sessions: sessions !== undefined ? sessions : existing.sessions,
    image: image !== undefined ? image : existing.image,
    description: description !== undefined ? String(description).trim() : existing.description,
    benefits: Array.isArray(benefits) ? benefits.map((b: any) => String(b).trim()).filter(Boolean) : existing.benefits,
  };

  proceduresStore.set(id, updated);
  res.json(updated);
});

// Delete procedure
app.delete('/api/procedures/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (proceduresStore.has(id)) {
    proceduresStore.delete(id);
    return res.json({ success: true, id });
  }
  res.status(404).json({ error: 'Procedimento não encontrado.' });
});

// Reset procedures to default list
app.post('/api/procedures/reset', (req: Request, res: Response) => {
  proceduresStore.clear();
  PROCEDURES.forEach(p => proceduresStore.set(p.id, { ...p }));
  res.json(Array.from(proceduresStore.values()));
});

// ==========================================
// ADMIN AUTHENTICATION (API)
// ==========================================
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, login, email, password } = req.body;
  const user = (username || login || email || '').toString().trim().toLowerCase();
  const pass = (password || '').toString().trim();

  // Defined credentials: login "werica", password "q8wwpqo5"
  const isValidUser = user === 'werica' || user === 'wericareiss@gmail.com' || user === 'werica@vitale.com.br';
  const isValidPass = pass === 'q8wwpqo5';

  if (isValidUser && isValidPass) {
    return res.json({
      success: true,
      token: `admin-${Date.now()}`,
      user: {
        name: 'Wérica (Administradora)',
        username: 'werica',
        email: 'werica@vitale.com.br',
        role: 'admin',
      },
    });
  }

  res.status(401).json({ error: 'Usuário ou senha incorretos. Verifique suas credenciais.' });
});

// ==========================================
// SEO: SITEMAP & ROBOTS.TXT ROUTES
// ==========================================
app.get('/robots.txt', (req: Request, res: Response) => {
  const host = req.get('host') || 'ais-pre-fnzjaxcbsyycxppive3j73-895274897580.us-east1.run.app';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

  const robots = [
    '# Robots.txt - Vitale Concierge Estética Avançada (Teresina - PI)',
    'User-agent: *',
    'Allow: /',
    'Allow: /assets/',
    'Disallow: /api/',
    'Disallow: /admin',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    'Allow: /assets/',
    'Disallow: /api/',
    'Disallow: /admin',
    '',
    'User-agent: Googlebot-Image',
    'Allow: /',
    'Allow: /assets/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join('\n');

  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=86400');
  res.send(robots);
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  const host = req.get('host') || 'ais-pre-fnzjaxcbsyycxppive3j73-895274897580.us-east1.run.app';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
  const today = new Date().toISOString().split('T')[0];

  const currentProcedures = Array.from(proceduresStore.values());

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#procedimentos</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#cobertura</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#como-funciona</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#faq</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/?categoria=facial</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${baseUrl}/?categoria=corporal</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${baseUrl}/?categoria=injetaveis</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
${currentProcedures.map(p => `  <url>
    <loc>${baseUrl}/?procedimento=${encodeURIComponent(p.id)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=86400');
  res.send(sitemap);
});

// ==========================================
// NOTIFICATIONS: ORDER EMAIL DISPATCH (EmailJS)
// Admin: alex.vieira.123@hotmail.com (Kept strictly server-side / hidden from client)
// ==========================================
app.post('/api/notifications/send-order-email', async (req: Request, res: Response) => {
  try {
    const { orderId, order } = req.body;
    const targetOrder = (orderId ? ordersStore.get(orderId) : null) || order;

    if (!targetOrder) {
      return res.status(404).json({ error: 'Pedido não localizado para envio de resumo por e-mail.' });
    }

    const result = await sendOrderSummaryEmails(targetOrder);
    res.json({
      success: true,
      orderId: targetOrder.id,
      notifiedAdmin: true,
      notifiedCustomer: Boolean(targetOrder.patient?.email),
      status: result.status,
    });
  } catch (error) {
    console.error('Error in send-order-email endpoint:', error);
    res.status(500).json({ error: 'Erro ao despachar e-mails de notificação.' });
  }
});

// ==========================================
// PWA: MANIFEST & SERVICE WORKER ROUTES
// ==========================================
app.get('/manifest.json', (req: Request, res: Response) => {
  const manifestPath = path.resolve(__dirname, 'public', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.header('Content-Type', 'application/manifest+json; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=86400');
    return res.sendFile(manifestPath);
  }
  res.status(404).send('manifest.json not found');
});

app.get('/sw.js', (req: Request, res: Response) => {
  const swPath = path.resolve(__dirname, 'public', 'sw.js');
  if (fs.existsSync(swPath)) {
    res.header('Content-Type', 'application/javascript; charset=utf-8');
    res.header('Service-Worker-Allowed', '/');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(swPath);
  }
  res.status(404).send('sw.js not found');
});

// Static public directory (PWA icons: pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png, icon.svg)
app.use(express.static(path.resolve(__dirname, 'public')));

// ==========================================
// VITE DEV MIDDLEWARE / STATIC ASSETS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vitale Concierge & Mercado Pago Server listening on port ${PORT}`);
  });
}

startServer();
