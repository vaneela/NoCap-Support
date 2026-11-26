export type TicketStatus = 'OPEN' | 'PENDING' | 'SOLVED' | 'CLOSED';
export type AuthorType = 'REQUESTER' | 'AGENT' | 'SYSTEM';
export type AgentRole = 'ADMIN' | 'AGENT';
export type UserType = 'CUSTOMER' | 'STAFF';
export type UserRole = 'CUSTOMER' | AgentRole;

export interface AuthUser {
  type: UserType;
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  role: AgentRole;
  createdAt: string;
}

export interface Message {
  id: number;
  ticketId: number;
  authorType: AuthorType;
  authorName: string;
  agentId: number | null;
  body: string;
  createdAt: string;
}

export interface TicketSummary {
  id: number;
  subject: string;
  requesterName: string;
  requesterEmail: string;
  status: TicketStatus;
  assignee: Agent | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  allowedTransitions: TicketStatus[];
  messages: Message[];
}
