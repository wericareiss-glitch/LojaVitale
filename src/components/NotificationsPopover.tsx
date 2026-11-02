import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { OrderNotification } from '../types';
import { api } from '../services/api';

interface NotificationsPopoverProps {
  onSelectOrder?: (orderId: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ onSelectOrder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const list = await api.getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-gold-400 shrink-0" />;
    }
  };

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-onyx-850 hover:bg-onyx-800 border border-white/5 hover:border-gold-500/30 text-neutral-300 hover:text-white transition-colors"
        title="Notificações de Pedidos"
        aria-label="Notificações"
      >
        <Bell className="w-4 h-4 text-gold-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-onyx-950 text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-onyx-900 border border-gold-500/30 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-onyx-950">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gold-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Atualizações de Pedidos
              </h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-gold-500/20 text-gold-300 font-semibold">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-neutral-400 hover:text-gold-400 flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" />
                Marcar lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-neutral-500 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
                Nenhuma notificação no momento.
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (onSelectOrder) onSelectOrder(notif.orderId);
                    setIsOpen(false);
                  }}
                  className={`p-3.5 hover:bg-onyx-850/80 transition-colors cursor-pointer flex gap-3 items-start ${
                    !notif.read ? 'bg-gold-500/5' : ''
                  }`}
                >
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h5 className="text-xs font-bold text-white truncate">
                        {notif.title}
                      </h5>
                      <span className="text-[10px] text-neutral-500 shrink-0">
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] text-gold-400 font-mono">
                        #{notif.orderId}
                      </span>
                      {!notif.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[10px] text-neutral-400 hover:text-white"
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
