export type OrderStatus = 'pendente' | 'aprovado' | 'recusado' | 'cancelado';
export type PaymentMethod = 'pix' | 'cartao';

export type PackageType = 'single' | 'package_3' | 'package_5';

export interface Procedure {
  id: string;
  name: string;
  category: 'injetaveis' | 'facial' | 'corporal';
  price: number;
  duration: string;
  sessions: string;
  image: string;
  description: string;
  benefits: string[];
  badge?: 'Mais Procurado' | 'Promoção' | 'Destaque' | 'Exclusivo' | string;
}

export interface CartItem extends Procedure {
  quantity: number;
  packageType?: PackageType;
  packageSessions?: number;
  originalPrice?: number;
  discountPercent?: number;
}

export interface PatientData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ScheduleSlot {
  isoDate: string;
  displayDate: string;
  time: string;
}

export interface PixPaymentData {
  paymentId: string;
  status: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  amount: number;
  isSimulated: boolean;
  notice?: string;
}

export interface CardFormData {
  cardNumber: string;
  cardholderName: string;
  expiry: string;
  cvv: string;
  installments: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string;
  packageType?: PackageType;
  packageSessions?: number;
  originalPrice?: number;
  discountPercent?: number;
}

export interface OrderHistoryItem {
  status: OrderStatus;
  note: string;
  timestamp: string;
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

export interface OrderRecord {
  id: string;
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
  history: OrderHistoryItem[];
}

export interface MercadoPagoConfig {
  configured: boolean;
  mode: 'sandbox' | 'production' | 'simulator' | 'custom';
  publicKey?: string;
  appUrl?: string;
  hasKey: boolean;
  maskedToken?: string | null;
}
