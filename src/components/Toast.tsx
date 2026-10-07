'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type ToastType = 'success' | 'error' | 'info';
type ToastOptions = { type?: ToastType; action?: string; onAction?: () => void; duration?: number };
type ToastItem = ToastOptions & { id: number; message: string; leaving: boolean };

const ToastContext = createContext<(message: string, opts?: ToastOptions) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const close = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems(list => list.map(t => (t.id === id ? { ...t, leaving: true } : t)));
  }, []);

  const schedule = useCallback((id: number, ms: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => close(id), ms));
  }, [close]);

  const toast = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = nextId.current++;
    setItems(list => [...list.slice(-3), { id, message, leaving: false, type: 'success', ...opts }]);
    schedule(id, opts.duration ?? 4000);
  }, [schedule]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map(t => (
          <div
            key={t.id}
            className={`toast ${t.type}${t.leaving ? ' leaving' : ''}`}
            onMouseEnter={() => clearTimeout(timers.current.get(t.id))}
            onMouseLeave={() => !t.leaving && schedule(t.id, 1500)}
            onAnimationEnd={() => t.leaving && setItems(list => list.filter(x => x.id !== t.id))}
          >
            <span className="t-icon"><Icon name={t.type === 'error' ? 'alert' : t.type === 'info' ? 'info' : 'check'} /></span>
            <span className="t-msg">{t.message}</span>
            {t.action && (
              <button className="t-action" type="button" onClick={() => { t.onAction?.(); close(t.id); }}>
                {t.action}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
