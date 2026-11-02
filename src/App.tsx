import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProceduresCatalog } from './components/ProceduresCatalog';
import { CoverageSection } from './components/CoverageSection';
import { HowItWorks } from './components/HowItWorks';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { ProcedureModal } from './components/ProcedureModal';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { OrdersDrawer } from './components/OrdersDrawer';
import { MercadoPagoModal } from './components/MercadoPagoModal';
import { AdminPanel } from './components/AdminPanel';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Procedure, CartItem, OrderRecord, MercadoPagoConfig, PackageType } from './types';
import { api } from './services/api';
import { buildCartItem } from './utils/packages';

export default function App() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('vitale_the_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [mpConfig, setMpConfig] = useState<MercadoPagoConfig>({
    configured: false,
    mode: 'simulator',
    hasKey: false,
  });

  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isMpModalOpen, setIsMpModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast dispatcher
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4200);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem('vitale_the_cart', JSON.stringify(cart));
  }, [cart]);

  // Load Mercado Pago config, procedures and orders on startup
  const fetchConfig = async () => {
    const cfg = await api.getConfig();
    setMpConfig(cfg);
  };

  const fetchOrders = async () => {
    const list = await api.getOrders();
    setOrders(list);
  };

  const fetchProcedures = async () => {
    const list = await api.getProcedures();
    setProcedures(list);

    // Deep link SEO check: ?procedimento=...
    try {
      const params = new URLSearchParams(window.location.search);
      const procParam = params.get('procedimento');
      if (procParam) {
        const found = list.find(p => p.id === procParam);
        if (found) {
          setSelectedProcedure(found);
        }
      }
    } catch {
      // Safe fallback
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchOrders();
    fetchProcedures();

    const interval = setInterval(() => {
      fetchOrders();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic SEO meta tags update based on user navigation
  useEffect(() => {
    const defaultTitle = 'Vitale Concierge — Estética com Mercado Pago';
    const defaultDesc = 'Agendamento concierge de estética avançada a domicílio em Teresina com integração oficial ao Mercado Pago para pagamentos via PIX e Cartão.';

    const setMetaTag = (selector: string, attribute: string, value: string) => {
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        if (selector.startsWith('meta[name=')) {
          const name = selector.match(/meta\[name="([^"]+)"\]/)?.[1];
          if (name) tag.setAttribute('name', name);
        } else if (selector.startsWith('meta[property=')) {
          const prop = selector.match(/meta\[property="([^"]+)"\]/)?.[1];
          if (prop) tag.setAttribute('property', prop);
        }
        document.head.appendChild(tag);
      }
      tag.setAttribute(attribute, value);
    };

    const setCanonical = (url: string) => {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', url);
    };

    if (selectedProcedure) {
      const procTitle = `${selectedProcedure.name} — Vitale Concierge Estética`;
      const procDesc = `${selectedProcedure.description.slice(0, 155)}... Atendimento domiciliar em Teresina - PI.`;
      
      document.title = procTitle;
      setMetaTag('meta[name="description"]', 'content', procDesc);
      setMetaTag('meta[property="og:title"]', 'content', procTitle);
      setMetaTag('meta[property="og:description"]', 'content', procDesc);
      setMetaTag('meta[name="twitter:title"]', 'content', procTitle);
      setMetaTag('meta[name="twitter:description"]', 'content', procDesc);

      const canonicalUrl = `${window.location.origin}${window.location.pathname}?procedimento=${encodeURIComponent(selectedProcedure.id)}`;
      setCanonical(canonicalUrl);

      // Update URL query string without reloading page
      const url = new URL(window.location.href);
      url.searchParams.set('procedimento', selectedProcedure.id);
      window.history.replaceState({}, '', url.toString());
    } else {
      document.title = defaultTitle;
      setMetaTag('meta[name="description"]', 'content', defaultDesc);
      setMetaTag('meta[property="og:title"]', 'content', defaultTitle);
      setMetaTag('meta[property="og:description"]', 'content', defaultDesc);
      setMetaTag('meta[name="twitter:title"]', 'content', defaultTitle);
      setMetaTag('meta[name="twitter:description"]', 'content', defaultDesc);

      const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
      setCanonical(canonicalUrl);

      // Clean query string when modal closes
      const url = new URL(window.location.href);
      if (url.searchParams.has('procedimento')) {
        url.searchParams.delete('procedimento');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [selectedProcedure]);


  // Cart operations
  const handleAddToCart = (proc: Procedure, packageType: PackageType = 'single') => {
    const item = buildCartItem(proc, packageType);
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, item];
    });
    showToast(`${item.name} adicionado ao agendamento!`, 'success');
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx].quantity += delta;
      if (copy[idx].quantity <= 0) {
        copy.splice(idx, 1);
        showToast('Procedimento removido.', 'info');
      }
      return copy;
    });
  };

  const handleRemoveItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
    showToast('Procedimento removido do carrinho.', 'info');
  };

  const handleClearCart = () => {
    setCart([]);
    localStorage.removeItem('vitale_the_cart');
  };

  const handleOrderCompleted = (newOrder: OrderRecord) => {
    setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
    fetchOrders();
  };

  const handleSelectOrderFromNotif = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsOrdersOpen(true);
  };

  // Cart calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const hasConsulta = cart.some(item => item.id === 'consulta-avaliacao');
  const hasOther = cart.some(item => item.id !== 'consulta-avaliacao');
  const cartDiscount = (hasConsulta && hasOther) ? 100 : 0;
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-onyx-950 text-neutral-200 font-sans antialiased flex flex-col justify-between selection:bg-gold-500/30 selection:text-gold-300">
      
      {/* Header */}
      <Header
        cartCount={cartCount}
        cartTotal={cartTotal}
        ordersCount={orders.length}
        onOpenCart={() => setIsCheckoutOpen(true)}
        onOpenOrders={() => {
          setSelectedOrderId(null);
          setIsOrdersOpen(true);
        }}
        onSelectOrder={handleSelectOrderFromNotif}
      />

      {/* Main Content */}
      <main className="flex-1">
        <Hero onExploreClick={() => {
          document.getElementById('procedimentos')?.scrollIntoView({ behavior: 'smooth' });
        }} />

        <ProceduresCatalog
          procedures={procedures}
          onSelectProcedure={(p) => setSelectedProcedure(p)}
          onAddToCart={handleAddToCart}
          cartItemIds={cart.map(c => c.id)}
        />

        <CoverageSection />
        <HowItWorks />
        <FaqSection />
      </main>

      {/* Footer */}
      <Footer 
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Modals & Drawers */}
      <ProcedureModal
        procedure={selectedProcedure}
        onClose={() => setSelectedProcedure(null)}
        onAddToCart={handleAddToCart}
      />

      <CheckoutDrawer
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onOrderCompleted={handleOrderCompleted}
        onOpenOrders={() => {
          setIsOrdersOpen(true);
          setSelectedOrderId(null);
        }}
        showToast={showToast}
      />

      <OrdersDrawer
        isOpen={isOrdersOpen}
        onClose={() => {
          setIsOrdersOpen(false);
          setSelectedOrderId(null);
        }}
        orders={orders}
        onOrderUpdated={fetchOrders}
        selectedOrderId={selectedOrderId}
        showToast={showToast}
      />

      <MercadoPagoModal
        isOpen={isMpModalOpen}
        onClose={() => setIsMpModalOpen(false)}
        config={mpConfig}
        onConfigUpdated={() => {
          fetchConfig();
          fetchOrders();
        }}
        showToast={showToast}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        procedures={procedures}
        onProceduresUpdated={fetchProcedures}
        orders={orders}
        onOrdersUpdated={fetchOrders}
        onOpenMpSettings={() => setIsMpModalOpen(true)}
        showToast={showToast}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}
