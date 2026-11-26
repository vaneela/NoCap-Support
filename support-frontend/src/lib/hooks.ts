import { useCallback, useEffect, useRef, useState } from 'react';
import type { Api } from '../api/client';
import type { TicketDetail } from '../api/types';
import { errorMessage } from './util';

export function usePolling(callback: () => unknown, intervalMs: number, enabled = true): void {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (!document.hidden) void saved.current();
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, enabled]);
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useTicket(api: Api, ticketId: number) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentId = useRef(ticketId);
  currentId.current = ticketId;

  const reload = useCallback(async () => {
    try {
      const t = await api.getTicket(ticketId);
      if (currentId.current !== ticketId) return;
      setTicket(t);
      setError(null);
    } catch (e) {
      if (currentId.current !== ticketId) return;
      setError(errorMessage(e));
    }
  }, [api, ticketId]);

  useEffect(() => {
    setTicket(null);
    setError(null);
    void reload();
  }, [reload]);

  usePolling(reload, 4000);

  return { ticket, setTicket, error, reload };
}
