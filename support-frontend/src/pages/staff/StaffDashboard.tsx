import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Inbox, MousePointerClick, Search } from 'lucide-react';
import type { TicketQuery } from '../../api/client';
import type { TicketStatus, TicketSummary } from '../../api/types';
import { Layout } from '../../components/Layout';
import { STATUS_LABELS } from '../../components/StatusBadge';
import { TicketList } from '../../components/TicketList';
import { CenteredSpinner, EmptyState, ErrorBanner, Input, Select } from '../../components/ui';
import { useDebouncedValue, usePolling } from '../../lib/hooks';
import { cn, errorMessage, parseId } from '../../lib/util';
import { useSession, useStaff } from '../../session/SessionContext';
import { AdminDashboard } from './AdminDashboard';
import { StaffTicketView } from './StaffTicketView';

const STATUS_TABS: (TicketStatus | '')[] = ['', 'OPEN', 'PENDING', 'SOLVED', 'CLOSED'];

export function StaffDashboard() {
  const me = useStaff();
  return me.role === 'ADMIN' ? <AdminDashboard /> : <AgentQueue />;
}

function AgentQueue() {
  const { api } = useSession();
  const me = useStaff();
  const [params, setParams] = useSearchParams();
  const selectedId = parseId(params.get('ticket'));

  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [scope, setScope] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);

  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo<TicketQuery>(() => {
    const base: TicketQuery = { status: status || undefined, q: q || undefined };
    if (scope === 'mine') return { ...base, assigneeId: me.id };
    if (scope === 'unassigned') return { ...base, unassigned: true };
    return base;
  }, [status, q, scope, me.id]);

  const loadTickets = useCallback(async () => {
    try {
      setTickets(await api.listTickets(query));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [api, query]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);
  usePolling(loadTickets, 8000);

  const select = (id: number) => setParams({ ticket: String(id) });
  const clear = () => setParams({});

  return (
    <Layout>
      <div className="flex h-full">
        <aside
          className={cn(
            'w-full flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 md:flex md:w-96 md:shrink-0',
            selectedId !== null ? 'hidden' : 'flex',
          )}
        >
          <div className="space-y-3 border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Ticket queue</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tickets ? `${tickets.length} shown` : 'Loading…'} · yours + unassigned
                </p>
              </div>
              <Select className="w-auto" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">Mine + unassigned</option>
                <option value="mine">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </Select>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject or customer email"
                className="h-9 pl-9"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {STATUS_TABS.map((s) => (
                <button
                  key={s || 'all'}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    status === s ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  {s ? STATUS_LABELS[s] : 'All'}
                </button>
              ))}
            </div>
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
              <EmptyState icon={<Inbox />} title="No tickets" description="Nothing matches the current filters." />
            ) : (
              <TicketList
                tickets={tickets}
                selectedId={selectedId}
                onSelect={select}
                perspective="staff"
                currentAgentId={me.id}
              />
            )}
          </div>
        </aside>

        <section className={cn('min-w-0 flex-1 bg-white dark:bg-slate-900', selectedId === null && 'hidden md:block')}>
          {selectedId !== null ? (
            <StaffTicketView ticketId={selectedId} agents={[]} onBack={clear} onChanged={loadTickets} />
          ) : (
            <EmptyState
              icon={<MousePointerClick />}
              title="Select a ticket"
              description="Open a ticket from your queue. Assign unassigned tickets to yourself to start working on them."
            />
          )}
        </section>
      </div>
    </Layout>
  );
}
