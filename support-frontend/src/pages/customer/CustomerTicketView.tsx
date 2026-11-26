import { TicketChat } from '../../components/TicketChat';
import { TicketHeader } from '../../components/TicketHeader';
import { CenteredSpinner, ErrorBanner } from '../../components/ui';
import { useTicket } from '../../lib/hooks';
import { formatDateTime } from '../../lib/util';
import { useSession } from '../../session/SessionContext';

interface CustomerTicketViewProps {
  ticketId: number;
  onBack: () => void;
  onChanged: () => void;
}

export function CustomerTicketView({ ticketId, onBack, onChanged }: CustomerTicketViewProps) {
  const { api } = useSession();
  const { ticket, error, reload } = useTicket(api, ticketId);

  if (!ticket) {
    return error ? (
      <div className="p-6">
        <ErrorBanner message={error} />
      </div>
    ) : (
      <CenteredSpinner />
    );
  }

  const closed = ticket.status === 'CLOSED';

  return (
    <div className="flex h-full flex-col">
      <TicketHeader
        ticket={ticket}
        onBack={onBack}
        meta={
          <>
            Opened {formatDateTime(ticket.createdAt)} ·{' '}
            {ticket.assignee ? (
              <>
                Handled by <span className="font-medium text-slate-700 dark:text-slate-200">{ticket.assignee.name}</span>
              </>
            ) : (
              <span className="italic">Waiting for an agent</span>
            )}
          </>
        }
      />
      {error && (
        <div className="px-4 pt-3 sm:px-6">
          <ErrorBanner message={error} />
        </div>
      )}
      {ticket.status === 'SOLVED' && (
        <div className="border-b border-lime-200 bg-lime-50 dark:bg-lime-400/10 px-6 py-2 text-sm text-lime-800">
          This ticket was marked as solved. Reply below if you still need help and it will be reopened.
        </div>
      )}
      <TicketChat
        messages={ticket.messages}
        perspective="customer"
        composer={{
          enabled: !closed,
          disabledReason: 'This ticket is closed. Create a new ticket if you need more help.',
          placeholder: ticket.status === 'SOLVED' ? 'Reply to reopen this ticket…' : 'Write a message…',
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
