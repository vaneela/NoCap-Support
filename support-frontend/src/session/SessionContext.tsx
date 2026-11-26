import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createApi, type Api } from '../api/client';
import type { AuthResponse, AuthUser } from '../api/types';

export type SessionKind = 'customer' | 'staff';

export interface Session {
  kind: SessionKind;
  token: string;
  expiresAt: string;
  user: AuthUser;
}

interface SessionContextValue {
  session: Session | null;
  api: Api;
  signIn: (auth: AuthResponse) => SessionKind;
  signOut: () => void;
}

const STORAGE_KEY = 'helpdesk.auth';
const SessionContext = createContext<SessionContextValue | null>(null);

function kindOf(user: AuthUser): SessionKind {
  return user.type === 'CUSTOMER' ? 'customer' : 'staff';
}

function isExpired(expiresAt: string): boolean {
  const t = Date.parse(expiresAt);
  return Number.isNaN(t) || t <= Date.now();
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.token || !parsed.user?.id || isExpired(parsed.expiresAt)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { ...parsed, kind: kindOf(parsed.user) };
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  const persist = useCallback((next: Session | null) => {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
    setSession(next);
  }, []);

  const signIn = useCallback(
    (auth: AuthResponse) => {
      const kind = kindOf(auth.user);
      persist({ kind, token: auth.token, expiresAt: auth.expiresAt, user: auth.user });
      return kind;
    },
    [persist],
  );
  const signOut = useCallback(() => persist(null), [persist]);

  const token = session?.token ?? null;
  const api = useMemo(() => createApi(token, signOut), [token, signOut]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .me()
      .then((user) => {
        if (cancelled) return;
        setSession((prev) => {
          if (!prev || prev.token !== token) return prev;
          const next = { ...prev, user, kind: kindOf(user) };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api, token]);

  useEffect(() => {
    if (!session) return;
    const ms = Date.parse(session.expiresAt) - Date.now();
    const timer = window.setTimeout(signOut, Math.max(0, Math.min(ms, 2_147_000_000)));
    return () => window.clearTimeout(timer);
  }, [session, signOut]);

  const value = useMemo(() => ({ session, api, signIn, signOut }), [session, api, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

export function useCustomer(): AuthUser {
  const { session } = useSession();
  if (session?.kind !== 'customer') throw new Error('Customer session required');
  return session.user;
}

export function useStaff(): AuthUser {
  const { session } = useSession();
  if (session?.kind !== 'staff') throw new Error('Staff session required');
  return session.user;
}
