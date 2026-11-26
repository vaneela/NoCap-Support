import { useState } from 'react';
import { CheckCircle2, Clock, Lock, RotateCcw, UserCheck, UserMinus } from 'lucide-react';
import type { Agent, TicketDetail, TicketStatus } from '../../api/types';
import { TicketChat } from '../../components/TicketChat';
import { TicketHeader } from '../../components/TicketHeader';
import { Button, CenteredSpinner, ErrorBanner, Select } from '../../components/ui';
import { useTicket } from '../../lib/hooks';
import { errorMessage, formatDateTime } from '../../lib/util';
import { useSession, useStaff } from '../../session/SessionContext';

const TRANSITION_ORDER: TicketStatus[] = ['OPEN', 'PENDING', 'SOLVED', 'CLOSED'];

const TRANSITIONS: Record<TicketStatus, { label: string; icon: JSX.Element; variant: 'primary' | 'secondary' }> = {
  OPEN: { label: 'Reopen', icon: <RotateCcw />, variant: 'secondary' },
  PENDING: { label: 'Mark pending', icon: <Clock />, variant: 'secondary' },
  SOLVED: { label: 'Mark solved', icon: <CheckCircle2 />, variant: 'primary' },
  CLOSED: { label: 'Close', icon: <Lock />, variant: 'secondary' },
};

interface StaffTicketViewProps {
  ticketId: number;
  agents: Agent[];
  onBack: () => void;
  onChanged: () => void;
}

export function StaffTicketView({ ticketId, agents, onBack, onChanged }: StaffTicketViewProps) {
  const { api } = useSession();
  const me = useStaff();
  const { ticket, setTicket, error, reload } = useTicket(api, ticketId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!ticket) {
    return error ? (
      <div className="p-6">
        <ErrorBanner message={error} />
      </div>
    ) : (
      <CenteredSpinner />
    );
  }

  const isAdmin = me.role === 'ADMIN';
  const mine = ticket.assignee?.id === me.id;
  const canWork = isAdmin || mine;
  const closed = ticket.status === 'CLOSED';
  const assignable = agents.filter((a) => a.role === 'AGENT' || a.id === ticket.assignee?.id);

  const run = async (action: () => Promise<TicketDetail>) => {
    setBusy(true);
    setActionError(null);
    try {
      setTicket(await action());
      onChanged();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const transitions = TRANSITION_ORDER.filter((s) => ticket.allowedTransitions.includes(s));

  const assignControl = isAdmin ? (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400">Assignee</span>
      <Select
        className="w-48"
        value={ticket.assignee?.id ?? ''}
        disabled={busy || closed}
        onChange={(e) => {
          const value = e.target.value;
          void run(() => api.assignTicket(ticket.id, value ? Number(value) : null));
        }}
      >
        <option value="">Unassigned</option>
        {assignable.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
    </label>
  ) : !ticket.assignee ? (
    <Button size="sm" disabled={busy || closed} onClick={() => void run(() => api.assignTicket(ticket.id, me.id))}>
      <UserCheck />
      Assign to me
    </Button>
  ) : mine ? (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy || closed}
      onClick={() => void run(() => api.assignTicket(ticket.id, null))}
    >
      <UserMinus />
      Release
    </Button>
  ) : null;

  return (
    <div className="flex h-full flex-col">
      <TicketHeader
        ticket={ticket}
        onBack={onBack}
        meta={
          <>
            <span className="font-medium text-slate-700 dark:text-slate-200">{ticket.requesterName}</span> &lt;{ticket.requesterEmail}&gt; ·
            Opened {formatDateTime(ticket.createdAt)}
          </>
        }
        actions={
          <>
            {assignControl}
            {!isAdmin && ticket.assignee && mine && (
              <span className="text-sm text-slate-500 dark:text-slate-400">Assigned to you</span>
            )}
            {transitions.length > 0 && <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />}
            {transitions.map((s) => {
              const t = TRANSITIONS[s];
              return (
                <Button
                  key={s}
                  size="sm"
                  variant={t.variant}
                  disabled={busy || !canWork}
                  title={canWork ? undefined : 'Assign this ticket to yourself first'}
                  onClick={() => void run(() => api.changeStatus(ticket.id, s))}
                >
                  {t.icon}
                  {t.label}
                </Button>
              );
            })}
          </>
        }
      />
      {(actionError || error) && (
        <div className="space-y-2 px-4 pt-3 sm:px-6">
          {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
          {error && <ErrorBanner message={error} />}
        </div>
      )}
      <TicketChat
        messages={ticket.messages}
        perspective="staff"
        currentAgentId={me.id}
        composer={{
          enabled: mine && !closed,
          disabledReason: closed
            ? 'This ticket is closed.'
            : isAdmin
              ? ticket.assignee
                ? `Only ${ticket.assignee.name} (assignee) can reply. You can reassign the ticket above.`
                : 'Assign this ticket to an agent so they can reply to the customer.'
              : 'Assign this ticket to yourself to reply to the customer.',
          placeholder: `Reply to ${ticket.requesterName}…`,
          onSend: async (body) => {
            await api.sendMessage(ticket.id, body);
            await reload();
            onChanged();
          },
        }}
      />
    </div>
  );
}
