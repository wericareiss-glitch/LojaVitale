import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  ShoppingBag, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  CreditCard, 
  QrCode, 
  Check, 
  Copy, 
  AlertTriangle, 
  ArrowRight, 
  Minus, 
  Plus, 
  Trash2, 
  Gift, 
  Loader2, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  MessageCircle, 
  Printer, 
  RefreshCw,
  Sun,
  Sunset,
  CalendarCheck,
  FileText,
  Navigation,
  Truck,
  Video,
  ExternalLink,
  AlertCircle,
  RotateCw,
  ChevronRight
} from 'lucide-react';
import { CartItem, PatientData, OrderRecord, PixPaymentData } from '../types';
import { CLINIC_CONFIG } from '../data/procedures';
import { api } from '../services/api';
import { calculateShippingFee, ORIGIN_CONFIG, ShippingCalculation } from '../services/shipping';
import { isAvaliacaoProcedure, isTestProcedure, isSinglePricingProcedure, isVideoCallProcedure } from '../utils/packages';
import { usePaymentPolling } from '../hooks/usePaymentPolling';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOrderCompleted: (order: OrderRecord) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCompleted,
  showToast,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 2 State: Schedule (Date, Time, Notes) & Patient
  const [selectedDate, setSelectedDate] = useState<{ iso: string; label: string; fullLabel: string } | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [scheduleNotes, setScheduleNotes] = useState<string>('');
  const [customDateInput, setCustomDateInput] = useState<string>('');

  // Booked Slots (Slots already booked and paid by other users cannot be booked again)
  const [bookedSlotsForDate, setBookedSlotsForDate] = useState<string[]>([]);
  const [isLoadingBookedSlots, setIsLoadingBookedSlots] = useState<boolean>(false);

  // Shipping calculation (Base: CEP 64099-000, R$ 1,00/km)
  const [shipping, setShipping] = useState<ShippingCalculation>(() => 
    calculateShippingFee('64099-000', 'Lourival Parente')
  );

  const [patient, setPatient] = useState<PatientData>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Teresina',
    state: 'PI',
  });
  const [cepStatus, setCepStatus] = useState<string>('Validação exclusiva em Teresina');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isOutOfCoverage, setIsOutOfCoverage] = useState(false);

  // Step 3 State: Payment (Mercado Pago)
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [isPixGenerating, setIsPixGenerating] = useState(false);
  const [pixTimeRemaining, setPixTimeRemaining] = useState(15 * 60);
  const [isTestPixMode, setIsTestPixMode] = useState<boolean>(false);
  const [isVerifyingDirectTransfer, setIsVerifyingDirectTransfer] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isCardProcessing, setIsCardProcessing] = useState(false);

  // Step 4 State: Completed Order
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [currentOrderRef, setCurrentOrderRef] = useState<string | null>(null);

  // Confetti celebration animation using canvas-confetti
  const triggerCelebration = useCallback(() => {
    try {
      // Golden luxury burst from center
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#D4AF37', '#F59E0B', '#10B981', '#FFFFFF', '#E6C667'],
        zIndex: 99999,
      });

      // Side cannons for dynamic celebratory burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0.05, y: 0.65 },
          colors: ['#D4AF37', '#FCD34D', '#34D399', '#FFFFFF'],
          zIndex: 99999,
        });
      }, 250);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 0.95, y: 0.65 },
          colors: ['#D4AF37', '#FCD34D', '#34D399', '#FFFFFF'],
          zIndex: 99999,
        });
      }, 450);

      // Star sparkle finale
      setTimeout(() => {
        confetti({
          particleCount: 35,
          spread: 100,
          origin: { y: 0.45 },
          shapes: ['star', 'circle'],
          colors: ['#D4AF37', '#FFFFFF', '#6EE7B7'],
          scalar: 1.2,
          zIndex: 99999,
        });
      }, 700);
    } catch {
      // Graceful fallback if window/canvas is restricted
    }
  }, []);

  // Automatically trigger celebration when entering step 4 (order completed)
  useEffect(() => {
    if (currentStep === 4 && completedOrder) {
      triggerCelebration();
    }
  }, [currentStep, completedOrder, triggerCelebration]);

  // Minimum allowed date: strictly tomorrow (D+1 rule for clinical biosafety)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  // Generate list of available dates (next 10 days excluding Sundays)
  const [availableDates, setAvailableDates] = useState<Array<{ 
    iso: string; 
    label: string; 
    fullLabel: string;
    dayName: string; 
    dayNum: number; 
    monthName: string;
    badge?: string;
  }>>([]);

  const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const daysOfWeekShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  useEffect(() => {
    const slots = [];
    let added = 0;
    let offset = 1;

    while (added < 9) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      offset++;
      if (d.getDay() === 0) continue; // Skip Sunday

      const iso = d.toISOString().split('T')[0];
      const dayName = daysOfWeekShort[d.getDay()];
      const dayNum = d.getDate();
      const monthName = monthsShort[d.getMonth()];
      const label = `${dayName}, ${dayNum} de ${monthName}`;
      const fullLabel = `${daysOfWeek[d.getDay()]}, ${dayNum} de ${months[d.getMonth()]}`;

      slots.push({
        iso,
        label,
        fullLabel,
        dayName,
        dayNum,
        monthName,
        badge: added === 0 ? 'Mais Próximo' : undefined,
      });
      added++;
    }

    setAvailableDates(slots);
    if (slots.length > 0 && !selectedDate) {
      setSelectedDate(slots[0]);
      setCustomDateInput(slots[0].iso);
    }
  }, []);

  // Time Slots categorized by period
  const morningSlots = ["08:30", "09:30", "10:30", "11:30"];
  const afternoonSlots = ["14:00", "15:00", "16:30", "17:30", "18:30"];

  // Fetch booked slots whenever selected date changes (to block double-booking)
  useEffect(() => {
    if (selectedDate?.iso && isOpen) {
      setIsLoadingBookedSlots(true);
      api.getBookedSlots(selectedDate.iso)
        .then(slots => {
          setBookedSlotsForDate(slots);
          if (selectedTime && slots.includes(selectedTime)) {
            const all = [...morningSlots, ...afternoonSlots];
            const free = all.find(s => !slots.includes(s));
            if (free) {
              setSelectedTime(free);
              showToast(`O horário ${selectedTime} já está agendado e pago por outro paciente. Selecionamos o próximo horário livre (${free}).`, 'info');
            } else {
              setSelectedTime(null);
              showToast(`Todos os horários desta data já foram preenchidos. Escolha outro dia.`, 'error');
            }
          }
        })
        .catch(err => console.error('Error fetching booked slots:', err))
        .finally(() => setIsLoadingBookedSlots(false));
    }
  }, [selectedDate?.iso, isOpen]);

  // Recalculate shipping when address or CEP changes
  useEffect(() => {
    const clean = patient.cep.replace(/\D/g, '');
    if (clean.length >= 5) {
      const calc = calculateShippingFee(clean, patient.neighborhood);
      setShipping(calc);
    }
  }, [patient.cep, patient.neighborhood]);

  // Cart totals calculation including Shipping Fee (R$ 1,00 por KM da base 64099-000)
  const calculateTotals = () => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const consultaItem = cart.find(item => item.id.includes('consulta') || item.id.includes('avaliacao'));
    const hasOther = cart.some(item => !item.id.includes('consulta') && !item.id.includes('avaliacao'));
    let discount = 0;
    if (consultaItem && hasOther) {
      discount = Math.min(consultaItem.price, 100);
    }
    const isOnlyVideoCall = cart.length > 0 && cart.every(i => i.id.includes('video') || i.name.toLowerCase().includes('videochamada'));
    const shippingFee = isOnlyVideoCall ? 0 : (shipping?.shippingFee || 0);
    const shippingDistanceKm = isOnlyVideoCall ? 0 : (shipping?.distanceKm || 0);
    const total = Math.max(0, subtotal - discount + shippingFee);
    return { subtotal, discount, shippingFee, shippingDistanceKm, total };
  };

  const { subtotal, discount, shippingFee, shippingDistanceKm, total } = calculateTotals();
  const isOnlyVideoCall = cart.length > 0 && cart.every(i => isVideoCallProcedure(i));

  // Set default time if unset and free
  useEffect(() => {
    if (isOpen) {
      if (completedOrder || cart.length === 0) {
        setCurrentStep(1);
        setCompletedOrder(null);
        setCurrentOrderRef(null);
      }
      if (!selectedTime) {
        const all = [...morningSlots, ...afternoonSlots];
        const firstFree = all.find(s => !bookedSlotsForDate.includes(s)) || "10:30";
        setSelectedTime(firstFree);
      }
    }
  }, [isOpen]);

  // PIX Countdown Timer
  useEffect(() => {
    let timer: any;
    if (currentStep === 3 && paymentMethod === 'pix') {
      timer = setInterval(() => {
        setPixTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, paymentMethod]);


  const formatCurrency = (val: number) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Handle custom date picker
  const handleCustomDateChange = (val: string) => {
    setCustomDateInput(val);
    if (!val) return;

    const parts = val.split('-');
    if (parts.length !== 3) return;

    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    // Biosafety check: cannot be past or today
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj.getTime() <= now.getTime()) {
      showToast('Por biossegurança, a visita deve ser agendada a partir de amanhã (D+1).', 'error');
      setCustomDateInput(selectedDate?.iso || minDateStr);
      return;
    }

    // Check Sunday
    if (dateObj.getDay() === 0) {
      showToast('Não realizamos atendimento aos domingos. Selecione de segunda a sábado.', 'error');
      setCustomDateInput(selectedDate?.iso || minDateStr);
      return;
    }

    const dayName = daysOfWeekShort[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const monthName = monthsShort[dateObj.getMonth()];
    const label = `${dayName}, ${dayNum} de ${monthName}`;
    const fullLabel = `${daysOfWeek[dateObj.getDay()]}, ${dayNum} de ${months[dateObj.getMonth()]}`;

    setSelectedDate({
      iso: val,
      label,
      fullLabel,
    });
  };

  const handlePhoneChange = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
      v = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
    } else if (v.length > 6) {
      v = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
    } else if (v.length > 2) {
      v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    }
    setPatient(prev => ({ ...prev, phone: v }));
  };

  const handleCpfChange = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 9) {
      v = `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6, 9)}-${v.substring(9)}`;
    } else if (v.length > 6) {
      v = `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6)}`;
    } else if (v.length > 3) {
      v = `${v.substring(0, 3)}.${v.substring(3)}`;
    }
    setPatient(prev => ({ ...prev, cpf: v }));
  };

  const handleCepChange = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length > 5) {
      v = `${v.substring(0, 5)}-${v.substring(5)}`;
    }
    setPatient(prev => ({ ...prev, cep: v }));

    const clean = v.replace(/\D/g, "");
    if (clean.length === 8) {
      searchCep(clean);
    }
  };

  const searchCep = async (cleanCep: string) => {
    setIsCepLoading(true);
    setCepStatus('Consultando CEP em Teresina...');
    setIsOutOfCoverage(false);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepStatus('CEP não localizado. Preencha os campos manualmente.');
      } else {
        const cityNorm = (data.localidade || '').trim().toLowerCase();
        const ufNorm = (data.uf || '').trim().toUpperCase();

        if (cityNorm === 'teresina' && ufNorm === 'PI') {
          const street = data.logradouro || patient.street;
          const neighborhood = data.bairro || patient.neighborhood;
          setPatient(prev => ({
            ...prev,
            street,
            neighborhood,
            city: 'Teresina',
            state: 'PI',
          }));

          const calc = calculateShippingFee(cleanCep, neighborhood);
          setShipping(calc);
          setCepStatus('✓ Atendimento domiciliar confirmado em Teresina');
          setIsOutOfCoverage(false);
        } else {
          setCepStatus(`Localidade: ${data.localidade}/${data.uf} (Fora da área)`);
          setIsOutOfCoverage(true);
          showToast('A Vitale atende exclusivamente no município de Teresina - PI.', 'error');
        }
      }
    } catch {
      setCepStatus('Falha ao consultar CEP.');
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleCardNumberChange = (val: string) => {
    const v = val.replace(/\D/g, "").substring(0, 16);
    const formatted = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    let v = val.replace(/\D/g, "").substring(0, 4);
    if (v.length > 2) {
      v = `${v.substring(0, 2)}/${v.substring(2)}`;
    }
    setCardExpiry(v);
  };

  const isValidCPF = (cpf: string): boolean => {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return false;
    // Allow common sandbox test CPFs
    if (clean === "11144477735" || clean === "04288319311" || clean === "05188421390") return true;
    // Reject repeated digits like 11111111111
    if (/^(\d)\1{10}$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(clean.charAt(i), 10) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(9), 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(clean.charAt(i), 10) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(10), 10)) return false;

    return true;
  };

  const validateStep2 = () => {
    if (!selectedDate) {
      showToast('Selecione o dia da visita domiciliar.', 'error');
      return false;
    }
    if (!selectedTime) {
      showToast('Selecione o horário desejado para a visita.', 'error');
      return false;
    }
    if (bookedSlotsForDate.includes(selectedTime)) {
      showToast(`O horário ${selectedTime} já está agendado e pago por outro cliente. Por favor, escolha outro horário livre.`, 'error');
      return false;
    }
    if (!patient.name.trim() || patient.name.trim().length < 3) {
      showToast('Informe o nome completo do paciente.', 'error');
      return false;
    }
    if (!patient.email.trim() || !patient.email.includes('@')) {
      showToast('Informe um e-mail válido para confirmação.', 'error');
      return false;
    }
    if (!patient.phone || patient.phone.length < 14) {
      showToast('Informe o telefone WhatsApp com DDD (86).', 'error');
      return false;
    }
    if (!patient.cpf || !isValidCPF(patient.cpf)) {
      showToast('Informe um CPF válido (11 dígitos) para o prontuário.', 'error');
      return false;
    }
    if (!isOnlyVideoCall) {
      const cleanCep = patient.cep.replace(/\D/g, "");
      if (cleanCep.length !== 8) {
        showToast('Informe um CEP válido de Teresina.', 'error');
        return false;
      }
      const cepNum = parseInt(cleanCep, 10);
      if (cepNum < 64000000 || cepNum > 64099999 || isOutOfCoverage) {
        setIsOutOfCoverage(true);
        showToast('O endereço informado fica fora de Teresina - PI.', 'error');
        return false;
      }
      if (!patient.street.trim() || !patient.number.trim() || !patient.neighborhood.trim()) {
        showToast('Informe a rua, número e bairro do domicílio.', 'error');
        return false;
      }
    }
    return true;
  };

  const goToPaymentStep = async () => {
    if (!validateStep2()) return;

    // Check slot in real-time right before payment generation
    if (selectedDate?.iso && selectedTime) {
      try {
        const freshBookedSlots = await api.getBookedSlots(selectedDate.iso);
        setBookedSlotsForDate(freshBookedSlots);
        if (freshBookedSlots.includes(selectedTime)) {
          showToast(`O horário ${selectedTime} foi agendado e confirmado por outro cliente há instantes. Selecione outro horário livre.`, 'error');
          return;
        }
      } catch {}
    }

    const ref = currentOrderRef || `VIT-${Math.floor(10000 + Math.random() * 90000)}`;
    setCurrentOrderRef(ref);
    setCurrentStep(3);
    setPixTimeRemaining(15 * 60);
    generatePixPayment(ref);
  };

  const generatePixPayment = async (orderRefId?: string, forceTestMode?: boolean) => {
    setIsPixGenerating(true);
    try {
      const orderRef = orderRefId || currentOrderRef || `VIT-${Math.floor(10000 + Math.random() * 90000)}`;
      if (!currentOrderRef) setCurrentOrderRef(orderRef);

      const isTest = forceTestMode !== undefined ? forceTestMode : isTestPixMode;
      const chargeAmount = isTest ? 0.01 : total;

      const res = await api.createPix({
        amount: chargeAmount,
        description: isTest 
          ? 'Vitale Concierge (Ambiente de Testes PIX R$ 0,01)' 
          : `Vitale Concierge: ${cart.map(i => i.name).join(', ')}`,
        payer: {
          email: patient.email,
          name: patient.name,
          cpf: patient.cpf,
        },
        externalReference: orderRef,
        isTest,
      });

      setPixData({
        paymentId: res.payment_id,
        status: res.status,
        qrCode: res.qr_code,
        qrCodeBase64: res.qr_code_base64,
        ticketUrl: res.ticket_url,
        amount: res.amount,
        isSimulated: res.is_simulated,
        notice: res.notice,
      });

      // Save order with the exact scheduled date, time, notes, and shipping fee
      await api.createOrder({
        id: orderRef,
        items: [...cart],
        subtotal,
        discount,
        shippingFee,
        shippingDistanceKm,
        originCep: '64099-000',
        total: chargeAmount,
        paymentMethod: 'pix',
        paymentStatus: 'pendente',
        paymentId: res.payment_id,
        paymentDetail: isTest 
          ? 'Aguardando PIX de Teste (R$ 0,01) no Mercado Pago' 
          : 'Aguardando pagamento via PIX Mercado Pago',
        patient: { ...patient },
        schedule: {
          date: selectedDate?.label || 'Amanhã',
          isoDate: selectedDate?.iso || '',
          time: selectedTime || '10:30',
          notes: scheduleNotes.trim() || undefined,
        },
        pixData: {
          qrCode: res.qr_code,
          qrCodeBase64: res.qr_code_base64,
          ticketUrl: res.ticket_url,
        },
      });

      showToast(isTest ? 'Cobrança de teste de R$ 0,01 gerada via Mercado Pago!' : 'Código PIX gerado via Mercado Pago com a visita agendada!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao gerar PIX.', 'error');
    } finally {
      setIsPixGenerating(false);
    }
  };

  const handlePayCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = cardNumber.replace(/\s/g, '');
    if (cleanNum.length < 15) {
      showToast('Número de cartão incompleto.', 'error');
      return;
    }
    if (!cardName.trim()) {
      showToast('Nome impresso no cartão obrigatório.', 'error');
      return;
    }
    if (cardExpiry.length < 5) {
      showToast('Validade inválida (MM/AA).', 'error');
      return;
    }
    const [expMonthStr, expYearStr] = cardExpiry.split('/');
    const expMonth = parseInt(expMonthStr, 10);
    const expYear = parseInt(`20${expYearStr}`, 10);
    if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
      showToast('Mês de validade inválido (01 a 12).', 'error');
      return;
    }
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    if (expYear < curYear || (expYear === curYear && expMonth < curMonth)) {
      showToast('Cartão com data de validade expirada.', 'error');
      return;
    }
    if (cardCvv.length < 3) {
      showToast('CVV inválido.', 'error');
      return;
    }

    setIsCardProcessing(true);
    const orderRef = currentOrderRef || `VIT-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!currentOrderRef) setCurrentOrderRef(orderRef);

    try {
      const res = await api.processCard({
        amount: total,
        description: `Vitale Concierge: ${cart.map(i => i.name).join(', ')}`,
        installments,
        cardNumber: cleanNum,
        cardholderName: cardName.trim().toUpperCase(),
        expiry: cardExpiry,
        cvv: cardCvv,
        payer: {
          email: patient.email,
          cpf: patient.cpf,
        },
        externalReference: orderRef,
      });

      if (res.success || res.status === 'approved') {
        const createdOrder = await api.createOrder({
          id: orderRef,
          items: [...cart],
          subtotal,
          discount,
          shippingFee,
          shippingDistanceKm,
          originCep: '64099-000',
          total,
          paymentMethod: 'cartao',
          paymentStatus: 'aprovado',
          paymentId: res.payment_id,
          paymentDetail: `Cartão de crédito em ${installments}x aprovado via Mercado Pago`,
          patient: { ...patient },
          schedule: {
            date: selectedDate?.label || 'Amanhã',
            isoDate: selectedDate?.iso || '',
            time: selectedTime || '10:30',
            notes: scheduleNotes.trim() || undefined,
          },
        });

        handlePaymentApproved('cartao', res.payment_id, `Cartão aprovado em ${installments}x`, createdOrder);
      } else {
        showToast(res.message || 'Pagamento recusado pelo Mercado Pago.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha na comunicação com o Mercado Pago.', 'error');
    } finally {
      setIsCardProcessing(false);
    }
  };

  const handlePaymentApproved = async (
    method: 'pix' | 'cartao',
    paymentId?: string,
    detail?: string,
    existingOrder?: OrderRecord
  ) => {
    let orderToSet = existingOrder;

    if (!orderToSet) {
      const orderRef = currentOrderRef || `VIT-${Math.floor(10000 + Math.random() * 90000)}`;
      orderToSet = await api.createOrder({
        id: orderRef,
        items: [...cart],
        subtotal,
        discount,
        shippingFee,
        shippingDistanceKm,
        originCep: '64099-000',
        total,
        paymentMethod: method,
        paymentStatus: 'aprovado',
        paymentId,
        paymentDetail: detail || 'Pagamento aprovado via Mercado Pago',
        patient: { ...patient },
        schedule: {
          date: selectedDate?.label || 'Amanhã',
          isoDate: selectedDate?.iso || '',
          time: selectedTime || '10:30',
          notes: scheduleNotes.trim() || undefined,
        },
      });
    }

    setCompletedOrder(orderToSet);
    onOrderCompleted(orderToSet);
    onClearCart();
    setCurrentOrderRef(null);
    setCurrentStep(4);
    triggerCelebration();
    // Dispatch automated email notification (Admin + Customer)
    api.sendOrderEmail(orderToSet).catch(() => {});
    showToast('Pagamento Confirmado no Mercado Pago! Resumo enviado por e-mail.', 'success');
  };

  // Polling hook monitoring transaction status via Mercado Pago API
  const isQrVisible = currentStep === 3 && paymentMethod === 'pix' && Boolean(pixData?.qrCode);

  const {
    status: paymentPollingStatus,
    isApproved: isPixConfirmed,
    isPolling: isPollingStatus,
    isManualChecking: isVerifyingPix,
    lastCheckedAt,
    statusMessage: pollingStatusMessage,
    checkPaymentNow,
  } = usePaymentPolling({
    paymentId: pixData?.paymentId || null,
    orderRef: currentOrderRef || null,
    amount: total,
    isQrVisible,
    intervalMs: 3000,
    isTest: isTestPixMode,
    onPaymentApproved: ({ id, message }) => {
      handlePaymentApproved('pix', id, message || 'PIX aprovado via Mercado Pago');
    },
  });

  const handleVerifyPixPayment = async (silent: boolean = false) => {
    try {
      const res = await checkPaymentNow(silent);
      if (res.isApproved) {
        showToast('Pagamento PIX confirmado com sucesso no Mercado Pago!', 'success');
      } else if (!silent) {
        showToast(
          'Pagamento ainda não identificado no Mercado Pago. O PIX pode levar alguns segundos para compensar. Realize o pagamento pelo app do seu banco e clique em verificar novamente.',
          'info'
        );
      }
    } catch {
      if (!silent) {
        showToast('Não foi possível consultar o Mercado Pago agora. Tente novamente em instantes.', 'error');
      }
    }
  };

  // Explicitly verify direct bank transfers to Werica's key (PSP_TRANSFER)
  const handleVerifyDirectTransfer = async () => {
    setIsVerifyingDirectTransfer(true);
    try {
      const res = await api.verifyIncomingTransfer({
        orderRef: currentOrderRef || '',
        amount: isTestPixMode ? 0.01 : total,
        allowTest: isTestPixMode || total <= 1,
      });

      if (res.verified) {
        showToast(res.message || 'Transferência localizada e confirmada no Mercado Pago!', 'success');
        await handlePaymentApproved('pix', res.payment_id, 'Transferência bancária aprovada no Mercado Pago');
      } else {
        showToast(res.message || 'Transferência ainda não identificada na conta Mercado Pago.', 'info');
      }
    } catch {
      showToast('Erro ao consultar Mercado Pago. Tente novamente em instantes.', 'error');
    } finally {
      setIsVerifyingDirectTransfer(false);
    }
  };

  // Open WhatsApp for direct transfer proof without bypassing the checkout requirement
  const handleOpenReceiptWhatsApp = () => {
    const orderRef = currentOrderRef || `VIT-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!currentOrderRef) setCurrentOrderRef(orderRef);
    sendReceiptWhatsAppToAdmin(orderRef);
    showToast('Abrindo WhatsApp para você anexar seu comprovante à Dra. Werica Reis.', 'info');
  };

  // Open WhatsApp with pre-filled message asking admin to verify attached receipt
  const sendReceiptWhatsAppToAdmin = (orderRef: string) => {
    const adminPhone = CLINIC_CONFIG.phone || '558694484292';
    const text = [
      `🌟 *COMPROVANTE DE PAGAMENTO PIX — VITALE CONCIERGE* 🌟`,
      `*Pedido:* #${orderRef}`,
      `*Status:* AGUARDANDO CONFERÊNCIA DE COMPROVANTE ⏳`,
      ``,
      `Olá Dra. Werica Reis! Realizei a transferência PIX para sua chave aleatória referente ao meu agendamento.`,
      ``,
      `👤 *Paciente:* ${patient.name || completedOrder?.patient?.name || 'Cliente'}`,
      `📅 *Data e Horário:* ${selectedDate?.label || completedOrder?.schedule?.date || 'A combinar'} às ${selectedTime || completedOrder?.schedule?.time || '10:30'}`,
      `💰 *Valor Transferido:* ${formatCurrency(isTestPixMode ? 0.01 : (total || completedOrder?.total || 0))}`,
      ``,
      `📎 _Estou anexando o comprovante bancário (PDF ou foto) a seguir nesta conversa para conferência e confirmação definitiva da maleta e rota._`
    ].join('\n');

    const url = `https://api.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const copyPixCode = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    showToast('Código PIX Copia e Cola copiado com sucesso!', 'success');
  };

  // Helper to open WhatsApp with complete order summary automatically sent to the clinic administrator (SEO telephone)
  const sendOrderSummaryToAdminWhatsApp = (orderRefId?: string, isCompleted: boolean = false) => {
    const adminPhone = CLINIC_CONFIG.phone || '558694484292';
    const ref = orderRefId || completedOrder?.id || currentOrderRef || 'VIT-PEDIDO';
    const isVideo = isOnlyVideoCall;
    const itemsList = cart.length > 0 ? cart : (completedOrder?.items || []);
    const patientName = patient.name || completedOrder?.patient?.name || 'Cliente';
    const patientPhone = patient.phone || completedOrder?.patient?.phone || 'Não informado';
    const patientCpf = patient.cpf || completedOrder?.patient?.cpf || 'Não informado';
    const patientEmail = patient.email || completedOrder?.patient?.email || 'Não informado';
    const dateStr = selectedDate?.fullLabel || selectedDate?.label || completedOrder?.schedule?.date || 'A combinar';
    const timeStr = selectedTime || completedOrder?.schedule?.time || '10:30';
    const notesStr = scheduleNotes || completedOrder?.schedule?.notes || '';
    const subtotalVal = subtotal || completedOrder?.subtotal || 0;
    const discountVal = discount || completedOrder?.discount || 0;
    const shippingVal = shippingFee || completedOrder?.shippingFee || 0;
    const totalVal = (isTestPixMode && paymentMethod === 'pix') ? 0.01 : (total || completedOrder?.total || 0);
    const payMethodStr = paymentMethod === 'pix' ? 'PIX Mercado Pago' : 'Cartão de Crédito';
    const statusStr = isCompleted 
      ? (completedOrder?.paymentStatus === 'pendente' 
          ? 'AGENDAMENTO PRÉ-RESERVADO (AGUARDANDO COMPROVANTE) ⏳' 
          : 'CONFIRMADO / PAGO 🎉') 
      : 'AGUARDANDO PAGAMENTO ⏳';

    const lines = [
      `🌟 *RESUMO DO PEDIDO — VITALE CONCIERGE* 🌟`,
      `*Pedido:* #${ref}`,
      `*Status:* ${statusStr}`,
      ``,
      `👤 *DADOS DO PACIENTE:*`,
      `• *Nome:* ${patientName}`,
      `• *WhatsApp:* ${patientPhone}`,
      `• *CPF:* ${patientCpf}`,
      `• *E-mail:* ${patientEmail}`,
      ``,
      `📅 *AGENDAMENTO:*`,
      `• *Data:* ${dateStr}`,
      `• *Horário:* ${timeStr}`,
      `• *Modalidade:* ${isVideo ? '📹 Online por Videochamada' : '🏠 Atendimento Domiciliar em Teresina'}`,
      !isVideo && patient.street ? `• *Endereço:* ${patient.street}, nº ${patient.number || ''} - Bairro ${patient.neighborhood || ''}, Teresina - PI (CEP: ${patient.cep || ''})` : null,
      notesStr ? `• *Observações:* ${notesStr}` : null,
      ``,
      `📋 *PROCEDIMENTOS SOLICITADOS:*`,
      ...itemsList.map(i => `• ${i.name} (x${i.quantity}) — ${formatCurrency(i.price * i.quantity)}`),
      ``,
      `💰 *RESUMO FINANCEIRO:*`,
      `• *Subtotal:* ${formatCurrency(subtotalVal)}`,
      discountVal > 0 ? `• *Desconto Cortesia:* - ${formatCurrency(discountVal)}` : null,
      shippingVal > 0 ? `• *Taxa de Deslocamento:* + ${formatCurrency(shippingVal)}` : null,
      `• *TOTAL: ${formatCurrency(totalVal)}*`,
      `• *Forma de Pagamento:* ${payMethodStr}`,
      ``,
      (!isCompleted && paymentMethod === 'pix' && pixData?.qrCode) ? `🔑 *Código PIX Copia e Cola:*\n\`\`\`${pixData.qrCode}\`\`\`` : null,
      (!isCompleted && paymentMethod === 'pix' && pixData?.ticketUrl) ? `🔗 *Link da Fatura Mercado Pago:*\n${pixData.ticketUrl}` : null,
      (!isCompleted && paymentMethod === 'pix') ? `🔑 *Chave PIX Aleatória:*\n8b9ce82f-9368-47d5-a527-f209f79d2087 (Titular: Werica Reis Sousa)` : null,
      ``,
      `📍 _Mensagem enviada automaticamente para o Administrador (${CLINIC_CONFIG.displayPhone})_`
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(lines)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!isOpen) return null;

  const qrImageSrc = pixData?.qrCodeBase64 
    ? (pixData.qrCodeBase64.startsWith('data:') ? pixData.qrCodeBase64 : `data:image/png;base64,${pixData.qrCodeBase64}`)
    : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=1&data=${encodeURIComponent(
        pixData?.qrCode || '00020101021226350014BR.GOV.BCB.PIX0113+5586944842925204000053039865802BR5916VITALE CONCIERGE6008TERESINA62120508VITALE016304'
      )}`;

  const minutes = Math.floor(pixTimeRemaining / 60);
  const seconds = pixTimeRemaining % 60;
  const timerDisplay = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Google Calendar link generator
  const getGoogleCalendarUrl = (order: OrderRecord) => {
    const rawIso = order.schedule.isoDate || new Date().toISOString().split('T')[0];
    const cleanDate = rawIso.replace(/-/g, '');
    const cleanTime = (order.schedule.time || '10:30').replace(':', '');
    const startStr = `${cleanDate}T${cleanTime}00`;
    const endHour = parseInt((order.schedule.time || '10:30').split(':')[0], 10) + 1;
    const endStr = `${cleanDate}T${endHour < 10 ? '0' + endHour : endHour}${cleanTime.slice(2)}00`;

    const title = encodeURIComponent(`Vitale Concierge — Atendimento Domiciliar (${order.items.map(i => i.name).join(', ')})`);
    const details = encodeURIComponent(
      `Agendamento #${order.id} confirmado para ${order.patient.name}.\nLocal: ${order.patient.address}.\nObs: ${order.schedule.notes || 'Nenhuma'}`
    );
    const location = encodeURIComponent(order.patient.address);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  };

  // Visual Progress Calculation (Carrinho > Pagamento > Confirmação)
  const progressPercent = currentStep === 1 ? 33 : currentStep === 2 ? 55 : currentStep === 3 ? 80 : 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-onyx-950 border-l border-gold-500/25 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Continuous Glowing Progress Track at Topmost Edge */}
        <div className="w-full h-1.5 bg-onyx-950 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-gold-400 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(234,179,8,0.7)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Drawer Top Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-onyx-900/80">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              currentStep === 4 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gold-500/10 border border-gold-500/30 text-gold-400'
            }`}>
              {currentStep === 4 ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : currentStep === 3 ? (
                <CreditCard className="w-4 h-4" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {currentStep === 4
                  ? 'Agendamento Confirmado • Teresina - PI'
                  : currentStep === 3
                  ? 'Pagamento Seguro • Mercado Pago'
                  : currentStep === 2
                  ? 'Data & Horário • Visita Domiciliar'
                  : 'Carrinho de Procedimentos • Teresina - PI'}
              </h3>
              <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                {currentStep === 1 && 'Etapa 1 de 3 • Procedimentos selecionados'}
                {currentStep === 2 && 'Etapa 1 de 3 • Data, horário e endereço'}
                {currentStep === 3 && 'Etapa 2 de 3 • PIX Instantâneo ou Cartão'}
                {currentStep === 4 && <strong className="text-emerald-400">Etapa 3 de 3 • Agendamento Concluído com Sucesso 🎉</strong>}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-onyx-850 hover:bg-onyx-800 text-neutral-400 hover:text-white flex items-center justify-center border border-white/5 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Progress Stepper Bar (Carrinho > Pagamento > Confirmação) */}
        <div className="bg-onyx-900/95 border-b border-white/5 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between relative max-w-lg mx-auto">
            
            {/* ETAPA 1: Carrinho */}
            <button
              type="button"
              onClick={() => {
                if (currentStep === 2) setCurrentStep(1);
                if (currentStep === 3) setCurrentStep(2);
              }}
              disabled={currentStep === 1 || currentStep === 4}
              className={`flex items-center gap-2.5 text-left group transition-all ${
                currentStep <= 2
                  ? 'text-gold-400'
                  : 'text-neutral-400 hover:text-white cursor-pointer'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep > 2
                    ? 'bg-emerald-500 text-white shadow-md'
                    : currentStep === 1 || currentStep === 2
                    ? 'bg-gold-500 text-onyx-950 ring-4 ring-gold-500/20 shadow-md font-extrabold'
                    : 'bg-onyx-800 text-neutral-400 border border-white/10'
                }`}
              >
                {currentStep > 2 ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <ShoppingBag className="w-3.5 h-3.5" />
                )}
              </div>
              <div>
                <span className={`text-xs font-bold block leading-none ${currentStep <= 2 ? 'text-white' : 'text-neutral-300'}`}>
                  1. Carrinho
                </span>
                <span className="text-[10px] text-neutral-400 hidden xs:block mt-0.5">
                  {currentStep === 1 ? 'Procedimentos' : currentStep === 2 ? 'Data & Local' : 'Concluído ✓'}
                </span>
              </div>
            </button>

            {/* Connecting Line 1 -> 2 */}
            <div className="flex-1 mx-2 sm:mx-4 h-1 bg-onyx-800/80 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  currentStep >= 3
                    ? 'bg-emerald-500 w-full'
                    : currentStep === 2
                    ? 'bg-gradient-to-r from-gold-500 to-gold-400 w-full'
                    : 'bg-gold-500 w-1/3'
                }`}
              />
            </div>

            {/* ETAPA 2: Pagamento */}
            <div
              className={`flex items-center gap-2.5 text-left transition-all ${
                currentStep === 3
                  ? 'text-gold-400'
                  : currentStep === 4
                  ? 'text-emerald-400'
                  : 'text-neutral-500'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 4
                    ? 'bg-emerald-500 text-white shadow-md'
                    : currentStep === 3
                    ? 'bg-gold-500 text-onyx-950 ring-4 ring-gold-500/25 shadow-lg font-extrabold shadow-gold-500/20'
                    : 'bg-onyx-850 text-neutral-500 border border-white/10'
                }`}
              >
                {currentStep === 4 ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5" />
                )}
              </div>
              <div>
                <span className={`text-xs font-bold block leading-none ${currentStep === 3 ? 'text-white' : currentStep === 4 ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  2. Pagamento
                </span>
                <span className="text-[10px] text-neutral-400 hidden xs:block mt-0.5">
                  {currentStep === 3 ? 'Mercado Pago' : currentStep === 4 ? 'Aprovado ✓' : 'PIX / Cartão'}
                </span>
              </div>
            </div>

            {/* Connecting Line 2 -> 3 */}
            <div className="flex-1 mx-2 sm:mx-4 h-1 bg-onyx-800/80 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  currentStep === 4
                    ? 'bg-emerald-500 w-full'
                    : currentStep === 3
                    ? 'bg-gradient-to-r from-gold-500/50 to-transparent w-1/2 animate-pulse'
                    : 'bg-transparent w-0'
                }`}
              />
            </div>

            {/* ETAPA 3: Confirmação */}
            <div
              className={`flex items-center gap-2.5 text-left transition-all ${
                currentStep === 4 ? 'text-emerald-400' : 'text-neutral-500'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 4
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/25 shadow-lg font-extrabold'
                    : 'bg-onyx-850 text-neutral-500 border border-white/10'
                }`}
              >
                {currentStep === 4 ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </div>
              <div>
                <span className={`text-xs font-bold block leading-none ${currentStep === 4 ? 'text-white' : 'text-neutral-500'}`}>
                  3. Confirmação
                </span>
                <span className="text-[10px] text-neutral-400 hidden xs:block mt-0.5">
                  {currentStep === 4 ? 'Visita Marcada 🎉' : 'Final'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================= STEP 1: CART ITEMS ================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" /> Procedimentos Selecionados
                </h4>
                <span className="text-xs text-neutral-400">
                  {cart.reduce((a, b) => a + b.quantity, 0)} ite{cart.length > 1 ? 'ns' : 'm'}
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center bg-onyx-900/50 rounded-2xl border border-dashed border-white/10 space-y-2">
                  <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-neutral-300">Seu carrinho está vazio</p>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Selecione os procedimentos estéticos desejados no catálogo para atendimento a domicílio em Teresina.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-onyx-900 border border-white/5 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {item.discountPercent ? (
                              <>
                                <span className="text-[10px] text-neutral-500 line-through">
                                  {formatCurrency((item.originalPrice || item.price) * item.quantity)}
                                </span>
                                <span className="text-xs text-gold-400 font-bold">
                                  {formatCurrency(item.price * item.quantity)}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {item.discountPercent}% OFF
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gold-400 font-semibold">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-gold-400" /> {item.duration}
                            {!isSinglePricingProcedure(item) && item.packageSessions && item.packageSessions > 1 && (
                              <span className="text-neutral-400">• {item.packageSessions} sessões programadas</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isSinglePricingProcedure(item) ? (
                          <span className="px-2.5 py-1 rounded-lg bg-onyx-950 border border-white/5 text-[11px] text-gold-400 font-medium">
                            {isTestProcedure(item) ? 'Teste (R$ 0,01)' : 'Avaliação Única'}
                          </span>
                        ) : (
                          <div className="flex items-center border border-white/10 rounded-xl bg-onyx-950 overflow-hidden">
                            <button
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="px-2.5 py-1.5 text-neutral-400 hover:text-white hover:bg-onyx-800 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="px-2.5 py-1.5 text-neutral-400 hover:text-white hover:bg-onyx-800 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                          title="Remover procedimento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Courtesy Discount Banner */}
                  {discount > 0 && (
                    <div className="p-3.5 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-xs text-gold-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-gold-400 shrink-0" />
                        <span>Cortesia Consulta Combinada aplicada!</span>
                      </div>
                      <span className="font-bold text-gold-400">- R$ 100,00</span>
                    </div>
                  )}

                  {/* Info notice */}
                  <div className="p-4 rounded-2xl bg-onyx-900 border border-white/5 text-xs text-neutral-400 space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <MapPin className="w-4 h-4 text-gold-400" />
                      <span>Atendimento Domiciliar em toda Teresina - PI</span>
                    </div>
                    <p className="leading-relaxed">
                      Nossa equipe leva a maca cirúrgica climatizada portátil, maleta estéril de uso único e dermocosméticos de grau médico até a sua residência.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: ENHANCED DATE, TIME & ADDRESS SCHEDULER ================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* DATE SELECTION BLOCK */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-gold-400" /> 1. Agende a Data da Visita Domiciliar *
                  </h4>
                  <span className="text-[10px] text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                    A partir de amanhã (D+1)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    <strong>Padrão de Biossegurança D+1:</strong> Não realizamos atendimento no mesmo dia. Os agendamentos iniciam a partir de amanhã para a esterilização individual e preparo sob demanda do kit cirúrgico.
                  </span>
                </div>

                {/* Quick Date Cards Carousel/Grid */}
                <div>
                  <label className="block text-[11px] text-neutral-400 font-semibold mb-2">
                    Datas Próximas Disponíveis:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {availableDates.map(d => {
                      const isSelected = selectedDate?.iso === d.iso;
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d);
                            setCustomDateInput(d.iso);
                          }}
                          className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                            isSelected
                              ? 'border-gold-500 bg-gold-500/15 text-gold-400 gold-glow font-bold'
                              : 'border-white/5 bg-onyx-900 text-neutral-400 hover:border-gold-500/40 hover:text-white'
                          }`}
                        >
                          {d.badge && (
                            <span className="absolute -top-1.5 right-1 px-1.5 py-0.2 rounded-full text-[8px] font-extrabold bg-gold-500 text-onyx-950 uppercase tracking-tighter">
                              {d.badge}
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-semibold">{d.dayName}</span>
                          <span className="text-lg font-extrabold my-0.5 text-white">{d.dayNum}</span>
                          <span className="text-[9px] uppercase tracking-wider">{d.monthName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Native Date Picker */}
                <div className="p-3.5 rounded-xl bg-onyx-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gold-400 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Ou selecione outra data no calendário:
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Disponível de segunda a sábado (exceto domingos)
                      </span>
                    </div>
                  </div>

                  <input
                    type="date"
                    min={minDateStr}
                    value={customDateInput}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    className="bg-onyx-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* TIME SELECTION BLOCK (MORNING & AFTERNOON SLOTS) */}
              <div className="space-y-3.5 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gold-400" /> 2. Escolha o Horário da Visita *
                  </h4>
                  <span className="text-xs text-gold-400 font-extrabold">
                    {selectedTime ? `${selectedTime} h` : 'Selecione um horário'}
                  </span>
                </div>

                {/* Morning Slots */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Turno da Manhã (08h às 12h):</span>
                    </div>
                    {isLoadingBookedSlots && (
                      <span className="text-[10px] text-gold-400 animate-pulse">
                        Verificando agenda...
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {morningSlots.map(slot => {
                      const isSelected = selectedTime === slot;
                      const isBooked = bookedSlotsForDate.includes(slot);

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => !isBooked && setSelectedTime(slot)}
                          title={isBooked ? 'Este horário já foi agendado e pago por outro paciente' : undefined}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                            isBooked
                              ? 'bg-onyx-950/80 border-red-500/25 text-neutral-500 cursor-not-allowed opacity-50'
                              : isSelected
                              ? 'bg-gold-500 text-onyx-950 border-gold-500 shadow-md font-extrabold'
                              : 'bg-onyx-900 border-white/10 text-neutral-300 hover:text-white hover:border-gold-500/40'
                          }`}
                        >
                          {isBooked ? (
                            <span className="flex items-center gap-1 text-[10px] text-red-400">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span className="line-through">{slot}</span>
                            </span>
                          ) : (
                            <>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              {slot}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Afternoon Slots */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400">
                    <Sunset className="w-3.5 h-3.5 text-amber-500" />
                    <span>Turno da Tarde (14h às 19h):</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {afternoonSlots.map(slot => {
                      const isSelected = selectedTime === slot;
                      const isBooked = bookedSlotsForDate.includes(slot);

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => !isBooked && setSelectedTime(slot)}
                          title={isBooked ? 'Este horário já foi agendado e pago por outro paciente' : undefined}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                            isBooked
                              ? 'bg-onyx-950/80 border-red-500/25 text-neutral-500 cursor-not-allowed opacity-50'
                              : isSelected
                              ? 'bg-gold-500 text-onyx-950 border-gold-500 shadow-md font-extrabold'
                              : 'bg-onyx-900 border-white/10 text-neutral-300 hover:text-white hover:border-gold-500/40'
                          }`}
                        >
                          {isBooked ? (
                            <span className="flex items-center gap-1 text-[10px] text-red-400">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span className="line-through">{slot}</span>
                            </span>
                          ) : (
                            <>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              {slot}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend for Slots */}
                {bookedSlotsForDate.length > 0 && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>
                      Horários com cadeado vermelho já foram reservados e pagos por outros clientes nesta data.
                    </span>
                  </div>
                )}

                {/* Optional Schedule Notes */}
                <div className="pt-2">
                  <label className="text-[11px] text-neutral-400 font-semibold mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-gold-400" />
                    Observações de Acesso ou Preferência de Horário (Opcional):
                  </label>
                  <input
                    type="text"
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="Ex: Interfone 302, avisar na portaria que é estética domiciliar..."
                    className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                  />
                </div>

                {/* Live Scheduled Summary Card */}
                {selectedDate && selectedTime && (
                  <div className="p-3.5 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-between text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center shrink-0">
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gold-400 block">
                          Visita Marcada na sua Residência
                        </span>
                        <span className="font-bold text-white">
                          {selectedDate.fullLabel || selectedDate.label} às {selectedTime}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                      Vaga reservada
                    </span>
                  </div>
                )}
              </div>

              {/* PATIENT & ADDRESS BLOCK (STRICTLY IN TERESINA) */}
              <div className="pt-5 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gold-400" /> 3. Endereço da Visita em Teresina
                  </h4>
                  <span className="text-[10px] text-gold-400 font-bold bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/30">
                    Exclusivo Teresina - PI
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Nome Completo do Paciente *</label>
                    <input
                      type="text"
                      value={patient.name}
                      onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                      placeholder="Ex: Dra. Mariana Vasconcelos"
                      className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">E-mail para Confirmação *</label>
                      <input
                        type="email"
                        value={patient.email}
                        onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                        placeholder="seuemail@exemplo.com"
                        className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">WhatsApp / Celular (DDD 86) *</label>
                      <input
                        type="tel"
                        value={patient.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(86) 99876-5432"
                        className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">CPF (Prontuário e Mercado Pago) *</label>
                    <input
                      type="text"
                      value={patient.cpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>

                  {/* Address or Video Call Consultation Details */}
                  {isOnlyVideoCall ? (
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wider">
                        <Video className="w-4 h-4 text-blue-400" />
                        Consulta Online por Videochamada
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Atendimento 100% digital. O link exclusivo do Google Meet / WhatsApp Vídeo será enviado diretamente para seu WhatsApp <strong className="text-white">{patient.phone || 'cadastrado'}</strong> e para o e-mail cadastrado. Não há necessidade de deslocamento físico ou preenchimento de endereço residencial.
                      </p>
                      <div className="text-[11px] text-blue-300/80 flex items-center gap-2 pt-2 border-t border-blue-500/20">
                        <span>✓ Sem taxa de frete</span>
                        <span>•</span>
                        <span>✓ Atendimento no conforto de onde você estiver</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* CEP with Teresina Validation */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">CEP em Teresina (64000 a 64099) *</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={patient.cep}
                              onChange={(e) => handleCepChange(e.target.value)}
                              placeholder="64049-550"
                              className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                            />
                            {isCepLoading && (
                              <div className="absolute right-3 top-2.5">
                                <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-end pb-2">
                          <span className={`text-[11px] ${
                            cepStatus.includes('✓') 
                              ? 'text-emerald-400 font-semibold' 
                              : isOutOfCoverage 
                              ? 'text-red-400 font-semibold' 
                              : 'text-neutral-400'
                          }`}>
                            {cepStatus}
                          </span>
                        </div>
                      </div>

                      {isOutOfCoverage && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                          <div>
                            <strong>Fora da área de cobertura:</strong> O atendimento domiciliar opera exclusivamente em Teresina - PI.
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs text-neutral-400 mb-1">Logradouro / Rua *</label>
                          <input
                            type="text"
                            value={patient.street}
                            onChange={(e) => setPatient({ ...patient, street: e.target.value })}
                            placeholder="Ex: Av. Dom Severino, Rua Jóquei..."
                            className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Número *</label>
                          <input
                            type="text"
                            value={patient.number}
                            onChange={(e) => setPatient({ ...patient, number: e.target.value })}
                            placeholder="1050"
                            className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Apto / Condomínio</label>
                          <input
                            type="text"
                            value={patient.complement || ''}
                            onChange={(e) => setPatient({ ...patient, complement: e.target.value })}
                            placeholder="Apto 602, Bloco B"
                            className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Bairro em Teresina *</label>
                          <input
                            type="text"
                            value={patient.neighborhood}
                            onChange={(e) => setPatient({ ...patient, neighborhood: e.target.value })}
                            placeholder="Jóquei, Fátima, Dirceu..."
                            className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Cidade / UF *</label>
                          <input
                            type="text"
                            value="Teresina - PI"
                            readOnly
                            className="w-full bg-onyx-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gold-400 font-bold focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Taxa de Deslocamento Concierge (ocultada se isenta até 5km) */}
                  {shippingFee > 0 && (
                    <div className="p-3.5 rounded-xl bg-onyx-900 border border-gold-500/25 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gold-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Taxa de Deslocamento
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-gold-400 font-sans">
                        {formatCurrency(shippingFee)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ================= STEP 3: MERCADO PAGO PAYMENT (PIX & CARD) ================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Order Summary Recap With Selected Date & Time & Itemized Total */}
              <div className="p-4 rounded-2xl bg-onyx-900 border border-gold-500/25 space-y-2.5">
                <div className="space-y-1.5 pb-2 border-b border-white/5 text-xs">
                  <div className="flex justify-between items-center text-neutral-300">
                    <span>Subtotal Procedimentos:</span>
                    <span className="font-medium text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-emerald-400">
                      <span>Desconto Cortesia:</span>
                      <span className="font-semibold">- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  {shippingFee > 0 && (
                    <div className="flex justify-between items-center text-gold-300">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-gold-400" />
                        Taxa de Deslocamento:
                      </span>
                      <span className="font-semibold text-gold-400">+ {formatCurrency(shippingFee)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <div>
                    <span className="text-xs text-neutral-300 font-semibold block">Total a Pagar Mercado Pago:</span>
                    <span className="text-[10px] text-neutral-400">Kit estéril + deslocamento concierge inclusos</span>
                  </div>
                  <span className="text-xl font-extrabold text-gold-400 font-sans">{formatCurrency(total)}</span>
                </div>
                
                {/* Highlighted Scheduled Date & Time */}
                <div className="text-xs text-gold-300 font-semibold flex items-center gap-2 pt-2 border-t border-white/5">
                  <CalendarCheck className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>
                    Visita Domiciliar: <strong>{selectedDate?.fullLabel || selectedDate?.label} às {selectedTime}</strong>
                  </span>
                </div>

                <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                  <span className="truncate">{patient.street}, {patient.number} - {patient.neighborhood}, Teresina - PI</span>
                </div>

                {scheduleNotes && (
                  <div className="text-[11px] text-neutral-400 italic">
                    Obs: {scheduleNotes}
                  </div>
                )}
              </div>

              {/* Payment Method Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 transition-all text-xs font-semibold ${
                    paymentMethod === 'pix'
                      ? 'border-gold-500 bg-gold-500/10 text-white font-bold'
                      : 'border-white/10 bg-onyx-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-gold-400" />
                  <span>PIX Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 transition-all text-xs font-semibold ${
                    paymentMethod === 'card'
                      ? 'border-gold-500 bg-gold-500/10 text-white font-bold'
                      : 'border-white/10 bg-onyx-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-gold-400" />
                  <span>Cartão de Crédito</span>
                </button>
              </div>

              {/* Mercado Pago Badge Header */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-onyx-900 border border-white/5 text-[11px] text-neutral-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#009EE3]" />
                  <span>Pagamento processado com segurança via <strong>Mercado Pago</strong></span>
                </div>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 256-bit SSL
                </span>
              </div>

              {/* PIX CONTAINER */}
              {paymentMethod === 'pix' && (
                <div className="p-5 rounded-2xl bg-onyx-900 border border-white/10 text-center space-y-4">
                  
                  {/* Top Bar: Guarantee Badge + Test Mode Toggle */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-onyx-950 border border-gold-500/20 text-xs">
                    <div className="flex items-center gap-1.5 text-left min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                      <span className="text-neutral-300 font-semibold truncate text-[11px]">
                        {isTestPixMode 
                          ? 'Modo de Teste Ativo (R$ 0,01)' 
                          : `Total da Visita: ${formatCurrency(total)}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !isTestPixMode;
                        setIsTestPixMode(next);
                        generatePixPayment(currentOrderRef || undefined, next);
                      }}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all text-gold-400 hover:text-onyx-950 bg-gold-500/10 hover:bg-gold-500 border-gold-500/40 cursor-pointer"
                    >
                      {isTestPixMode ? 'Voltar ao Valor Total' : '🧪 Testar com R$ 0,01'}
                    </button>
                  </div>

                  {isPixGenerating ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
                      <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
                      <span>Gerando QR Code PIX via Mercado Pago...</span>
                    </div>
                  ) : (
                    <>
                      {/* High-Resolution Clean QR Code Box */}
                      <div className="relative w-56 h-56 mx-auto bg-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-center border-2 border-gold-500/40">
                        <img
                          src={qrImageSrc}
                          alt="QR Code PIX Vitale Teresina"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Expiration Timer & Regenerate Actions */}
                      <div className="flex items-center justify-between px-2 text-xs text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <span>Expira em:</span>
                          <span className="font-bold text-gold-400 font-mono text-sm">{timerDisplay}</span>
                          {isPollingStatus && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 ml-1">
                              • <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" /> Monitorando compensação
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => generatePixPayment(currentOrderRef || undefined, isTestPixMode)}
                          disabled={isPixGenerating}
                          className="inline-flex items-center gap-1 text-[11px] text-gold-400 hover:text-gold-300 font-semibold px-2.5 py-1 rounded-lg bg-onyx-800 hover:bg-onyx-750 border border-gold-500/20 transition-all cursor-pointer"
                        >
                          <RotateCw className={`w-3 h-3 ${isPixGenerating ? 'animate-spin' : ''}`} />
                          <span>Gerar Novo QR</span>
                        </button>
                      </div>

                      {/* Official Mercado Pago Ticket URL Link */}
                      {pixData?.ticketUrl && (
                        <a
                          href={pixData.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl bg-[#009EE3]/20 hover:bg-[#009EE3]/30 border border-[#009EE3]/50 text-[#009EE3] hover:text-cyan-200 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md group"
                        >
                          <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span>Abrir Fatura Oficial Web no Mercado Pago</span>
                        </a>
                      )}

                      {/* Pix Copia e Cola */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                          Código PIX Copia e Cola:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={pixData?.qrCode || ''}
                            className="w-full bg-onyx-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 font-mono select-all focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={copyPixCode}
                            className="shrink-0 px-3.5 py-2 rounded-xl bg-onyx-800 hover:bg-gold-500 hover:text-onyx-950 text-gold-400 border border-gold-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copiar
                          </button>
                        </div>
                      </div>

                      {/* Direct Random Key Option with Real Verification & WhatsApp Proof */}
                      <div className="p-3.5 rounded-xl bg-onyx-950 border border-white/10 text-left space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Chave PIX Aleatória (Mercado Pago):
                            </span>
                            <span className="font-mono text-gold-400 text-xs truncate block font-bold">
                              8b9ce82f-9368-47d5-a527-f209f79d2087
                            </span>
                            <span className="text-[10px] text-neutral-400 block mt-0.5">
                              Beneficiária: <strong>Werica Reis Sousa</strong> • Mercado Pago • Teresina - PI
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('8b9ce82f-9368-47d5-a527-f209f79d2087');
                              showToast('Chave Aleatória do Mercado Pago copiada!', 'success');
                            }}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-onyx-850 hover:bg-gold-500 hover:text-onyx-950 text-gold-400 border border-gold-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copiar
                          </button>
                        </div>

                        {/* Direct key helper actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={handleVerifyDirectTransfer}
                            disabled={isVerifyingDirectTransfer}
                            className="py-2 px-2.5 rounded-lg bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingDirectTransfer ? 'animate-spin' : ''}`} />
                            <span>Verificar Transferência na Conta</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenReceiptWhatsApp}
                            className="py-2 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Enviar Comprovante (WhatsApp)</span>
                          </button>
                        </div>
                      </div>

                      {/* Real-time Payment Status & Instructions */}
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left text-[11px] text-amber-200/90 space-y-1.5 leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Confirmação Segura e Bloqueio de Fraudes:</span>
                        </div>
                        <p>
                          • <strong>Compensação Automática via Polling:</strong> O sistema monitora a compensação bancária no Mercado Pago a cada 3 segundos. O botão de finalizar permanece bloqueado até a confirmação real do crédito.
                        </p>
                        <p>
                          • <strong>Liberação Instantânea:</strong> Assim que o pagamento for registrado no Mercado Pago ou recebido via Webhook, o botão é desbloqueado e o agendamento é concluído automaticamente.
                        </p>
                      </div>

                      {/* Real Payment Verification & WhatsApp Buttons */}
                      <div className="pt-2 border-t border-white/5 space-y-2.5">
                        {/* Botão de Finalizar Agendamento com Trava Anti-Fraude */}
                        <button
                          type="button"
                          disabled={!isPixConfirmed}
                          onClick={() => {
                            if (isPixConfirmed) {
                              handlePaymentApproved('pix', pixData?.paymentId, 'PIX confirmado com sucesso no Mercado Pago');
                            }
                          }}
                          className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl ${
                            isPixConfirmed
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:brightness-110 active:scale-95 cursor-pointer shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                              : 'bg-neutral-800/90 text-neutral-400 border border-neutral-700/80 cursor-not-allowed opacity-75'
                          }`}
                        >
                          {isPixConfirmed ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              <span>Finalizar Agendamento (Pagamento Confirmado!)</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-amber-400" />
                              <span>Finalizar Agendamento (Bloqueado — Aguardando PIX)</span>
                            </>
                          )}
                        </button>

                        {/* Monitoramento em Tempo Real */}
                        <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-300 py-1.5 bg-black/30 rounded-xl px-3 border border-white/5">
                          <span className="relative flex h-2.5 w-2.5">
                            {isPixConfirmed ? (
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            ) : (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                              </>
                            )}
                          </span>
                          <span className="font-medium text-center">{pollingStatusMessage}</span>
                        </div>

                        {/* Botão Manual de Checagem */}
                        <button
                          type="button"
                          onClick={() => handleVerifyPixPayment(false)}
                          disabled={isVerifyingPix || isPixConfirmed}
                          className="w-full py-3 rounded-xl bg-onyx-800 hover:bg-onyx-750 border border-gold-500/30 text-gold-300 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isVerifyingPix ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                              <span>Consultando Mercado Pago...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 text-gold-400" />
                              <span>Checar Compensação no Banco Agora</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => sendOrderSummaryToAdminWhatsApp(currentOrderRef || undefined, false)}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span>Dúvidas com o PIX? Falar com Dra. Werica no WhatsApp ({CLINIC_CONFIG.displayPhone})</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* CREDIT CARD CONTAINER */}
              {paymentMethod === 'card' && (
                <form onSubmit={handlePayCard} className="space-y-4">
                  
                  {/* Interactive 3D Card Preview */}
                  <div className="w-full h-44 rounded-2xl p-5 bg-gradient-to-tr from-neutral-900 via-onyx-850 to-neutral-800 border border-gold-500/40 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-6 rounded bg-amber-400/80 flex items-center justify-center text-[9px] font-bold text-onyx-950 tracking-tighter">
                          CHIP
                        </div>
                        <ShieldCheck className="w-4 h-4 text-gold-400" />
                      </div>
                      <span className="font-serif italic text-xs tracking-wider text-gold-300">
                        VITALE CONCIERGE • THE
                      </span>
                    </div>

                    <div>
                      <div className="font-mono text-base tracking-widest text-neutral-200">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>
                    </div>

                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-neutral-400">Titular</span>
                        <span className="font-medium tracking-wide text-neutral-200 uppercase truncate max-w-[170px] block">
                          {cardName || 'NOME NO CARTÃO'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-neutral-400">Validade</span>
                        <span className="font-mono text-neutral-200">{cardExpiry || 'MM/AA'}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full border border-gold-400/40 flex items-center justify-center text-[10px] text-gold-300 font-bold">
                        VIP
                      </div>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Número do Cartão de Crédito *</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Nome Impresso no Cartão *</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        placeholder="NOME COMO NO CARTÃO"
                        className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-gold-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Validade (MM/AA) *</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          placeholder="12/28"
                          className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">CVV (Código de Segurança) *</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Parcelamento Mercado Pago</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full bg-onyx-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition-colors"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
                          const instVal = total / n;
                          return (
                            <option key={n} value={n}>
                              {n}x de {formatCurrency(instVal)} {n <= 3 ? 'sem juros' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isCardProcessing}
                      className="w-full py-3.5 rounded-xl gold-gradient-bg text-onyx-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                    >
                      {isCardProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Processando no Mercado Pago...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" /> Pagar {formatCurrency(total)} no Cartão
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => sendOrderSummaryToAdminWhatsApp(currentOrderRef || undefined, false)}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md mt-2"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>Enviar Resumo ao Administrador via WhatsApp ({CLINIC_CONFIG.displayPhone})</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* ================= STEP 4: SUCCESS & WHATSAPP UNLOCKED ================= */}
          {currentStep === 4 && completedOrder && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div id="printReceiptArea" className="space-y-6">
                {/* Status Header */}
                <div className="text-center space-y-2">
                  {completedOrder.paymentStatus === 'pendente' ? (
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                      <Clock className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                      <Check className="w-8 h-8" />
                    </div>
                  )}

                  <span className={`text-xs font-bold tracking-widest uppercase ${
                    completedOrder.paymentStatus === 'pendente' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {completedOrder.paymentStatus === 'pendente'
                      ? 'Agendamento Pré-Reservado — Pendente de Conferência'
                      : 'Atendimento Confirmado e Pago no Mercado Pago'}
                  </span>
                  
                  <h3 className="font-serif text-2xl text-white font-normal">
                    {completedOrder.paymentStatus === 'pendente'
                      ? 'Sua Vaga foi Pré-Reservada com Sucesso!'
                      : 'Sua Visita foi Agendada com Sucesso!'}
                  </h3>
                  
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    {completedOrder.paymentStatus === 'pendente'
                      ? 'Sua data e horário foram pré-bloqueados. Para liberação definitiva da maleta cirúrgica e confirmação da rota pela Dra. Werica Reis, envie o comprovante PIX no WhatsApp.'
                      : 'A maca portátil climatizada e o kit descartável estéril estão confirmados na rota.'}
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                    <div className="px-4 py-1.5 rounded-xl bg-onyx-900 border border-gold-500/30 text-gold-300 font-mono text-sm font-bold tracking-wider">
                      Código: #{completedOrder.id}
                    </div>
                    {completedOrder.paymentStatus === 'aprovado' && (
                      <button
                        type="button"
                        onClick={triggerCelebration}
                        className="px-3 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Soltar confetes de comemoração"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                        <span>Comemorar 🎉</span>
                      </button>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Resumo detalhado enviado por e-mail automaticamente</span>
                  </div>
                </div>

                {/* WHATSAPP ACTION CALLOUT */}
                <div className={`p-5 rounded-2xl bg-gradient-to-b from-onyx-900 via-onyx-850 to-onyx-900 border-2 ${
                  completedOrder.paymentStatus === 'pendente' ? 'border-amber-500/60' : 'border-gold-500'
                } shadow-2xl relative overflow-hidden`}>
                  <div className="absolute -right-6 -top-6 w-28 h-28 bg-gold-500/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full ${
                      completedOrder.paymentStatus === 'pendente' 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    } flex items-center justify-center shrink-0`}>
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                          {completedOrder.paymentStatus === 'pendente' ? 'Ação Requerida' : 'Suporte Teresina Liberado'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          completedOrder.paymentStatus === 'pendente' 
                            ? 'bg-amber-500/20 text-amber-300' 
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {completedOrder.paymentStatus === 'pendente' ? 'Aguardando Comprovante' : 'Confirmado'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        {completedOrder.paymentStatus === 'pendente'
                          ? 'Envie o Comprovante para a Dra. Werica Reis'
                          : 'Canal Direto com a Equipe Concierge THE'}
                      </h4>
                      <p className="text-xs text-neutral-300 mt-1">
                        {completedOrder.paymentStatus === 'pendente'
                          ? 'Anexe a foto ou PDF do comprovante no WhatsApp aberto para que a maleta seja separada e a rota confirmada.'
                          : 'Use o botão abaixo para enviar os detalhes de acesso (portaria de condomínio, interfone) e receber as orientações pré-procedimento.'}
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp CTA */}
                  <button
                    type="button"
                    onClick={() => {
                      if (completedOrder.paymentStatus === 'pendente') {
                        sendReceiptWhatsAppToAdmin(completedOrder.id);
                      } else {
                        sendOrderSummaryToAdminWhatsApp(completedOrder.id, true);
                      }
                    }}
                    className={`w-full mt-3 py-3.5 px-4 rounded-xl ${
                      completedOrder.paymentStatus === 'pendente'
                        ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-onyx-950'
                        : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white'
                    } font-bold text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {completedOrder.paymentStatus === 'pendente'
                      ? `Enviar Comprovante no WhatsApp (${CLINIC_CONFIG.displayPhone})`
                      : `Enviar Resumo do Pedido ao Administrador no WhatsApp (${CLINIC_CONFIG.displayPhone})`}
                  </button>
                </div>

                {/* Appointment Recap */}
                <div className="p-5 rounded-2xl bg-onyx-900 border border-white/10 space-y-3 text-xs">
                  <div className="flex justify-between pb-2 border-b border-white/5">
                    <span className="text-neutral-400">Paciente:</span>
                    <span className="font-semibold text-white">{completedOrder.patient.name}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-white/5">
                    <span className="text-neutral-400">Data & Horário Agendado:</span>
                    <span className="font-semibold text-gold-400">
                      {completedOrder.schedule.date} às {completedOrder.schedule.time}
                    </span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-white/5">
                    <span className="text-neutral-400">Endereço em Teresina:</span>
                    <span className="font-medium text-neutral-200 text-right max-w-[260px]">
                      {completedOrder.patient.address}
                    </span>
                  </div>
                  {completedOrder.schedule.notes && (
                    <div className="flex justify-between pb-2 border-b border-white/5">
                      <span className="text-neutral-400">Observações de Acesso:</span>
                      <span className="font-medium text-neutral-300 text-right max-w-[260px]">
                        {completedOrder.schedule.notes}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pb-2 border-b border-white/5">
                    <span className="text-neutral-400">Procedimento(s):</span>
                    <span className="font-semibold text-white text-right max-w-[240px]">
                      {completedOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </span>
                  </div>
                  {(completedOrder.shippingFee !== undefined && completedOrder.shippingFee > 0) && (
                    <div className="flex justify-between pb-2 border-b border-white/5">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-gold-400" /> Taxa de Deslocamento:
                      </span>
                      <span className="font-semibold text-gold-300">
                        {formatCurrency(completedOrder.shippingFee)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 font-bold text-sm">
                    <span className="text-white">
                      {completedOrder.paymentStatus === 'pendente' ? 'Total do Agendamento (Pendente):' : 'Total Pago (Mercado Pago):'}
                    </span>
                    <span className="text-gold-400">{formatCurrency(completedOrder.total)}</span>
                  </div>
                </div>

                {/* Action buttons including Google Calendar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <a
                    href={getGoogleCalendarUrl(completedOrder)}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-onyx-900 border border-white/10 hover:border-gold-500/40 text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CalendarCheck className="w-4 h-4 text-gold-400" /> Google Agenda
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="py-2.5 px-4 rounded-xl bg-onyx-900 border border-white/10 hover:border-gold-500/40 text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-gold-400" /> Imprimir Comprovante
                  </button>
                </div>

              </div>

              <button
                onClick={() => {
                  setCurrentStep(1);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-onyx-900 border border-white/10 text-neutral-400 hover:text-white text-xs font-medium transition-colors"
              >
                Concluir e Voltar ao Início
              </button>

            </div>
          )}

        </div>

        {/* Drawer Fixed Footer Navigation */}
        {currentStep < 4 && (
          <div className="p-5 border-t border-white/10 bg-onyx-900/90 flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-neutral-400">Total a Pagar</span>
              <span className="text-lg font-bold text-gold-400 font-sans">{formatCurrency(total)}</span>
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => (prev - 1) as any)}
                  className="px-4 py-2.5 rounded-xl bg-onyx-800 text-neutral-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  Voltar
                </button>
              )}

              {currentStep === 1 && (
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl gold-gradient-bg text-onyx-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg disabled:opacity-40"
                >
                  <span>Avançar para Data e Horário</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={goToPaymentStep}
                  className="px-6 py-2.5 rounded-xl gold-gradient-bg text-onyx-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                >
                  <span>Ir para Pagamento Mercado Pago</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 3 && paymentMethod === 'pix' && (
                <button
                  type="button"
                  disabled={!isPixConfirmed}
                  onClick={() => {
                    if (isPixConfirmed) {
                      handlePaymentApproved('pix', pixData?.paymentId, 'PIX confirmado com sucesso no Mercado Pago');
                    }
                  }}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
                    isPixConfirmed
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:brightness-110 active:scale-95 cursor-pointer shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700/80 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isPixConfirmed ? (
                    <>
                      <span>Finalizar Agendamento</span>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Finalizar (Aguardando PIX)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
