import type {
  Agent,
  AgentRole,
  AuthResponse,
  AuthUser,
  Message,
  TicketDetail,
  TicketStatus,
  TicketSummary,
} from './types';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';
const UNREACHABLE = 'Cannot reach the support server. Is the backend running?';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string> | null;

  constructor(status: number, message: string, fieldErrors: Record<string, string> | null = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export interface TicketQuery {
  status?: TicketStatus;
  assigneeId?: number;
  unassigned?: boolean;
  q?: string;
  requesterEmail?: string;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
}

export interface CreateAgentInput {
  name: string;
  email: string;
  password: string;
  role: AgentRole;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

function toQuery(params: TicketQuery): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === false) continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function createApi(token: string | null, onUnauthorized?: () => void) {
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiRequestError(0, UNREACHABLE);
    }

    if (!res.ok) {
      if (res.status === 401 && token) onUnauthorized?.();
      let payload: { message?: string; fieldErrors?: Record<string, string> | null } = {};
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }
      const message = payload.message ?? (res.status >= 500 ? UNREACHABLE : `Request failed (${res.status})`);
      throw new ApiRequestError(res.status, message, payload.fieldErrors ?? null);
    }
    return (await res.json()) as T;
  }

  return {
    register: (input: RegisterInput) => request<AuthResponse>('/auth/register', 'POST', input),
    login: (input: LoginInput) => request<AuthResponse>('/auth/login', 'POST', input),
    staffLogin: (input: LoginInput) => request<AuthResponse>('/auth/staff/login', 'POST', input),
    me: () => request<AuthUser>('/auth/me'),
    listAgents: () => request<Agent[]>('/agents'),
    createAgent: (input: CreateAgentInput) => request<Agent>('/agents', 'POST', input),
    listTickets: (query: TicketQuery = {}) => request<TicketSummary[]>(`/tickets${toQuery(query)}`),
    getTicket: (id: number) => request<TicketDetail>(`/tickets/${id}`),
    createTicket: (input: CreateTicketInput) => request<TicketDetail>('/tickets', 'POST', input),
    assignTicket: (id: number, agentId: number | null) =>
      request<TicketDetail>(`/tickets/${id}/assignee`, 'PUT', { agentId }),
    changeStatus: (id: number, status: TicketStatus) =>
      request<TicketDetail>(`/tickets/${id}/status`, 'PATCH', { status }),
    sendMessage: (id: number, body: string) => request<Message>(`/tickets/${id}/messages`, 'POST', { body }),
  };
}

export type Api = ReturnType<typeof createApi>;
