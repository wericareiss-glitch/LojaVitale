import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

export interface UsePaymentPollingProps {
  paymentId?: string | null;
  orderRef?: string | null;
  amount?: number;
  isQrVisible: boolean;
  intervalMs?: number;
  isTest?: boolean;
  onPaymentApproved?: (data: { id: string; message?: string; amount?: number }) => void;
}

export interface UsePaymentPollingReturn {
  status: 'idle' | 'checking' | 'pending' | 'approved' | 'error';
  isPolling: boolean;
  isApproved: boolean;
  isManualChecking: boolean;
  lastCheckedAt: Date | null;
  statusMessage: string;
  checkPaymentNow: (silent?: boolean) => Promise<{ isApproved: boolean; data?: any }>;
  resetPolling: () => void;
}

/**
 * usePaymentPolling
 * 
 * Periodically verifies transaction status via Mercado Pago API while the QR Code is visible.
 * Disables progression until the payment is strictly confirmed ('approved') on Mercado Pago.
 */
export function usePaymentPolling({
  paymentId,
  orderRef,
  amount,
  isQrVisible,
  intervalMs = 3000,
  isTest = false,
  onPaymentApproved,
}: UsePaymentPollingProps): UsePaymentPollingReturn {
  const [status, setStatus] = useState<'idle' | 'checking' | 'pending' | 'approved' | 'error'>('idle');
  const [isApproved, setIsApproved] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Aguardando leitura do QR Code PIX...');

  // Stable callback ref to avoid resetting timer when parent re-renders
  const onApprovedRef = useRef(onPaymentApproved);
  useEffect(() => {
    onApprovedRef.current = onPaymentApproved;
  }, [onPaymentApproved]);

  const hasApprovedRef = useRef(false);

  const checkPaymentNow = useCallback(
    async (silent: boolean = false): Promise<{ isApproved: boolean; data?: any }> => {
      const idToQuery = paymentId || orderRef;
      if (!idToQuery) {
        return { isApproved: false };
      }

      if (!silent) {
        setIsManualChecking(true);
      }
      setStatus('checking');

      try {
        const res = await api.checkPaymentStatus(idToQuery, {
          orderRef: orderRef || undefined,
          amount: isTest ? 0.01 : amount,
          allowTest: isTest || (amount !== undefined && amount <= 1),
        });

        setLastCheckedAt(new Date());

        const approved = Boolean(res?.is_approved || res?.status === 'approved' || res?.status === 'accredited');

        if (approved) {
          setIsApproved(true);
          setStatus('approved');
          hasApprovedRef.current = true;
          const msg = res.message || 'Pagamento PIX confirmado com sucesso no Mercado Pago! 🎉';
          setStatusMessage(msg);

          if (onApprovedRef.current) {
            onApprovedRef.current({
              id: res.id || paymentId || idToQuery,
              message: msg,
              amount: res.transaction_amount || (isTest ? 0.01 : amount),
            });
          }
          return { isApproved: true, data: res };
        } else {
          setStatus('pending');
          setStatusMessage('Monitorando compensação do PIX no banco a cada 3s...');
          return { isApproved: false, data: res };
        }
      } catch (err) {
        console.error('[usePaymentPolling] Error querying payment status:', err);
        setStatus('error');
        setStatusMessage('Instabilidade momentânea ao consultar Mercado Pago. Nova tentativa em 3s...');
        return { isApproved: false };
      } finally {
        if (!silent) {
          setIsManualChecking(false);
        }
      }
    },
    [paymentId, orderRef, amount, isTest]
  );

  // Setup periodic polling interval while QR Code is active and not yet approved
  useEffect(() => {
    if (!isQrVisible || isApproved || hasApprovedRef.current) {
      setIsPolling(false);
      return;
    }

    const targetId = paymentId || orderRef;
    if (!targetId) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    setStatusMessage('Monitorando compensação do PIX no banco a cada 3s...');

    // Run first check after 2 seconds
    const initialTimeout = setTimeout(() => {
      checkPaymentNow(true);
    }, 2000);

    const intervalTimer = setInterval(() => {
      if (!hasApprovedRef.current) {
        checkPaymentNow(true);
      }
    }, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalTimer);
      setIsPolling(false);
    };
  }, [isQrVisible, isApproved, paymentId, orderRef, intervalMs, checkPaymentNow]);

  const resetPolling = useCallback(() => {
    setIsApproved(false);
    hasApprovedRef.current = false;
    setStatus('idle');
    setStatusMessage('Aguardando leitura do QR Code PIX...');
    setLastCheckedAt(null);
  }, []);

  return {
    status,
    isPolling,
    isApproved,
    isManualChecking,
    lastCheckedAt,
    statusMessage,
    checkPaymentNow,
    resetPolling,
  };
}
