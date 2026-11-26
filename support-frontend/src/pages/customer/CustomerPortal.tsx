import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Inbox, MessageSquarePlus, Plus } from 'lucide-react';
import type { TicketSummary } from '../../api/types';
import { Layout } from '../../components/Layout';
import { TicketList } from '../../components/TicketList';
import { Button, CenteredSpinner, EmptyState, ErrorBanner } from '../../components/ui';
import { usePolling } from '../../lib/hooks';
import { cn, errorMessage, parseId } from '../../lib/util';
import { useSession } from '../../session/SessionContext';
import { CustomerTicketView } from './CustomerTicketView';
import { NewTicketForm } from './NewTicketForm';

export function CustomerPortal() {
  const { api } = useSession();
  const [params, setParams] = useSearchParams();
  const selectedId = parseId(params.get('ticket'));
  const creating = params.get('new') === '1';

  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      setTickets(await api.listTickets());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [api]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);
  usePolling(loadTickets, 8000);

  const select = (id: number) => setParams({ ticket: String(id) });
  const startNew = () => setParams({ new: '1' });
  const clear = () => setParams({});

  const showForm = creating || (selectedId === null && tickets !== null && tickets.length === 0);
  const mainVisible = selectedId !== null || showForm;

  return (
    <Layout>
      <div className="flex h-full">
        <aside
          className={cn(
            'w-full flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 md:flex md:w-80 md:shrink-0 lg:w-96',
            mainVisible ? 'hidden' : 'flex',
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
            <div>
              <h2 className="font-semibold">My tickets</h2>
              {tickets && <p className="text-xs text-slate-500 dark:text-slate-400">{tickets.length} total</p>}
            </div>
            <Button size="sm" onClick={startNew}>
              <Plus />
              New ticket
            </Button>
          </div>
          {error && (
            <div className="p-3">
              <ErrorBanner message={error} />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tickets === null ? (
              !error && <CenteredSpinner />
            ) : tickets.length === 0 ? (
              <EmptyState icon={<Inbox />} title="No tickets yet" description="Your support requests will appear here." />
            ) : (
              <TicketList tickets={tickets} selectedId={selectedId} onSelect={select} perspective="customer" />
            )}
          </div>
        </aside>

        <section className={cn('min-w-0 flex-1 bg-white dark:bg-slate-900', !mainVisible && 'hidden md:block')}>
          {selectedId !== null ? (
            <CustomerTicketView ticketId={selectedId} onBack={clear} onChanged={loadTickets} />
          ) : showForm ? (
            <NewTicketForm
              onCancel={tickets && tickets.length > 0 ? clear : undefined}
              onCreated={(t) => {
                void loadTickets();
                select(t.id);
              }}
            />
          ) : (
            <EmptyState
              icon={<MessageSquarePlus />}
              title="Select a ticket"
              description="Pick a ticket on the left to continue the conversation, or open a new one."
              action={
                <Button size="sm" onClick={startNew}>
                  <Plus />
                  New ticket
                </Button>
              }
            />
          )}
        </section>
      </div>
    </Layout>
  );
}
