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
  Video
} from 'lucide-react';
import { CartItem, PatientData, OrderRecord, PixPaymentData } from '../types';
import { CLINIC_CONFIG } from '../data/procedures';
import { api } from '../services/api';
import { calculateShippingFee, ORIGIN_CONFIG, ShippingCalculation } from '../services/shipping';
import { isAvaliacaoProcedure, isTestProcedure, isSinglePricingProcedure, isVideoCallProcedure } from '../utils/packages';

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
  const [isPollingStatus, setIsPollingStatus] = useState(false);

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

  // Polling for PIX status
  useEffect(() => {
    let interval: any;
    if (currentStep === 3 && paymentMethod === 'pix' && pixData?.paymentId) {
      setIsPollingStatus(true);
      interval = setInterval(async () => {
        try {
          const res = await api.checkPaymentStatus(pixData.paymentId);
          if (res.is_approved || res.status === 'approved') {
            clearInterval(interval);
            handlePaymentApproved('pix', pixData.paymentId, 'PIX aprovado via Mercado Pago');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    } else {
      setIsPollingStatus(false);
    }
    return () => clearInterval(interval);
  }, [currentStep, paymentMethod, pixData]);

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

  const generatePixPayment = async (orderRefId?: string) => {
    setIsPixGenerating(true);
    try {
      const orderRef = orderRefId || currentOrderRef || `VIT-${Math.floor(10000 + Math.random() * 90000)}`;
      if (!currentOrderRef) setCurrentOrderRef(orderRef);

      const res = await api.createPix({
        amount: total,
        description: `Vitale Concierge: ${cart.map(i => i.name).join(', ')}`,
        payer: {
          email: patient.email,
          name: patient.name,
          cpf: patient.cpf,
        },
        externalReference: orderRef,
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
        total,
        paymentMethod: 'pix',
        paymentStatus: 'pendente',
        paymentId: res.payment_id,
        paymentDetail: 'Aguardando pagamento via PIX Mercado Pago',
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

      showToast('Código PIX gerado via Mercado Pago com a visita agendada!', 'success');
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

  const handleSimulatePixPaid = async () => {
    if (!pixData?.paymentId) return;
    try {
      showToast('Simulando confirmação bancária do PIX...', 'info');
      await api.simulateStatus(pixData.paymentId, 'aprovado');
      await handlePaymentApproved('pix', pixData.paymentId, 'PIX confirmado pelo teste do usuário');
    } catch {
      showToast('Erro ao simular aprovação.', 'error');
    }
  };

  const copyPixCode = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    showToast('Código PIX Copia e Cola copiado com sucesso!', 'success');
  };

  if (!isOpen) return null;

  const qrImageSrc = pixData?.qrCodeBase64 
    ? `data:image/png;base64,${pixData.qrCodeBase64}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        pixData?.qrCode || '00020126580014BR.GOV.BCB.PIX'
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-onyx-950 border-l border-gold-500/25 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Top Bar */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-onyx-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Carrinho de Procedimentos • Teresina - PI
              </h3>
              <span className="text-[11px] text-neutral-400">
                Etapa {Math.min(currentStep, 3)} de 3 {currentStep === 4 ? '• Concluído' : ''}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-onyx-850 hover:bg-onyx-800 text-neutral-400 hover:text-white flex items-center justify-center border border-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps Tabs */}
        <div className="grid grid-cols-3 border-b border-white/5 text-[11px] font-medium text-center">
          <div
            className={`py-2.5 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              currentStep === 1
                ? 'border-gold-500 text-gold-400 font-bold'
                : 'border-transparent text-neutral-500'
            }`}
          >
            <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
              currentStep === 1 ? 'bg-gold-500 text-onyx-950' : 'bg-onyx-800 text-neutral-400'
            }`}>
              1
            </span>
            Carrinho
          </div>

          <div
            className={`py-2.5 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              currentStep === 2
                ? 'border-gold-500 text-gold-400 font-bold'
                : 'border-transparent text-neutral-500'
            }`}
          >
            <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
              currentStep === 2 ? 'bg-gold-500 text-onyx-950' : 'bg-onyx-800 text-neutral-400'
            }`}>
              2
            </span>
            Data & Horário
          </div>

          <div
            className={`py-2.5 border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              currentStep >= 3
                ? 'border-gold-500 text-gold-400 font-bold'
                : 'border-transparent text-neutral-500'
            }`}
          >
            <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
              currentStep >= 3 ? 'bg-gold-500 text-onyx-950' : 'bg-onyx-800 text-neutral-400'
            }`}>
              3
            </span>
            Mercado Pago
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" /> Rota em Teresina confirmada após a compensação
                  </div>

                  {isPixGenerating ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
                      <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
                      <span>Gerando QR Code PIX via Mercado Pago...</span>
                    </div>
                  ) : (
                    <>
                      {/* QR Code Box */}
                      <div className="relative w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-2xl flex items-center justify-center">
                        <img
                          src={qrImageSrc}
                          alt="QR Code PIX Vitale Teresina"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 border-2 border-gold-500/30 rounded-2xl pointer-events-none" />
                      </div>

                      {/* Countdown & Polling status */}
                      <div className="text-xs text-neutral-400 flex items-center justify-center gap-2">
                        <span>O código expira em:</span>
                        <span className="font-bold text-gold-400 font-mono text-sm">{timerDisplay}</span>
                        {isPollingStatus && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
                            • <RefreshCw className="w-3 h-3 text-gold-400 animate-spin" /> Verificando banco
                          </span>
                        )}
                      </div>

                      {/* Pix Copia e Cola */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                          Chave PIX Copia e Cola:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={pixData?.qrCode || ''}
                            className="w-full bg-onyx-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-300 font-mono select-all focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={copyPixCode}
                            className="shrink-0 px-3.5 py-2 rounded-xl bg-onyx-800 hover:bg-gold-500 hover:text-onyx-950 text-gold-400 border border-gold-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copiar
                          </button>
                        </div>
                      </div>

                      {/* Simulation / Instant Confirmation Helper */}
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <button
                          type="button"
                          onClick={handleSimulatePixPaid}
                          className="w-full py-3.5 rounded-xl gold-gradient-bg text-onyx-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" /> Já Fiz o PIX (Confirmar Agora)
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
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                    <Check className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                    Atendimento Confirmado em Teresina - PI
                  </span>
                  <h3 className="font-serif text-2xl text-white font-normal">
                    Sua Visita foi Agendada com Sucesso!
                  </h3>
                  <p className="text-xs text-neutral-400">
                    A maca portátil climatizada e o kit descartável estéril estão confirmados na rota.
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                    <div className="px-4 py-1.5 rounded-xl bg-onyx-900 border border-gold-500/30 text-gold-300 font-mono text-sm font-bold tracking-wider">
                      Código: #{completedOrder.id}
                    </div>
                    <button
                      type="button"
                      onClick={triggerCelebration}
                      className="px-3 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Soltar confetes de comemoração"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                      <span>Comemorar 🎉</span>
                    </button>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Resumo detalhado enviado por e-mail automaticamente</span>
                  </div>
                </div>

                {/* UNLOCKED WHATSAPP VIP CALLOUT (ONLY UNLOCKED AFTER PAYMENT) */}
                <div className="p-5 rounded-2xl bg-gradient-to-b from-onyx-900 via-onyx-850 to-onyx-900 border-2 border-gold-500 shadow-2xl relative overflow-hidden animate-pulse-subtle">
                  <div className="absolute -right-6 -top-6 w-28 h-28 bg-gold-500/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">Suporte Teresina Liberado</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">Desbloqueado</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">Canal Direto com a Equipe Concierge THE</h4>
                      <p className="text-xs text-neutral-300 mt-1">
                        Use o botão abaixo para enviar os detalhes de acesso (portaria de condomínio, interfone) e receber as orientações pré-procedimento.
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp CTA with scheduled date and time included */}
                  <a
                    href={`https://wa.me/${CLINIC_CONFIG.phone}?text=${encodeURIComponent(
                      `Olá, equipe Concierge da Vitale Teresina!\n\nAcabei de realizar o pagamento do agendamento *#${completedOrder.id}* via Mercado Pago para ATENDIMENTO A DOMICÍLIO EM TERESINA - PI.\n\n*Dados da Visita:*\n• Paciente: ${completedOrder.patient.name}\n• Data Agendada: ${completedOrder.schedule.date}\n• Horário Marcado: ${completedOrder.schedule.time}\n• Endereço: ${completedOrder.patient.address} (${completedOrder.patient.neighborhood}, Teresina - PI)\n• Total Pago: ${formatCurrency(completedOrder.total)}${completedOrder.schedule.notes ? `\n• Obs: ${completedOrder.schedule.notes}` : ''}\n\nGostaria de confirmar os dados de acesso/portaria e receber as orientações.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full mt-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2.5 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chamar no WhatsApp da Vitale Teresina
                  </a>
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
                    <span className="text-white">Total Pago (Mercado Pago):</span>
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
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
