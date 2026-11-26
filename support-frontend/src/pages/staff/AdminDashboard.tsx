import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Inbox, Search, UserX, Users } from 'lucide-react';
import type { Agent, TicketStatus, TicketSummary } from '../../api/types';
import { Layout } from '../../components/Layout';
import { STATUS_LABELS, StatusBadge } from '../../components/StatusBadge';
import { Avatar, Button, CenteredSpinner, EmptyState, ErrorBanner, Input, Select } from '../../components/ui';
import { useDebouncedValue, usePolling } from '../../lib/hooks';
import { cn, errorMessage, formatRelative, parseId } from '../../lib/util';
import { useSession } from '../../session/SessionContext';
import { AgentsDialog } from './AgentsDialog';
import { StaffTicketView } from './StaffTicketView';

const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'SOLVED', 'CLOSED'];
const ACTIVE: TicketStatus[] = ['OPEN', 'PENDING'];

const CARD_TONES: Record<TicketStatus | 'ALL' | 'UNASSIGNED', string> = {
  ALL: 'neon-text',
  UNASSIGNED: 'text-neon-600',
  OPEN: 'text-cyber-600 dark:text-cyber-300',
  PENDING: 'text-amber-500',
  SOLVED: 'text-lime-600',
  CLOSED: 'text-slate-400 dark:text-slate-400',
};

type StatusFilter = TicketStatus | '';
type AssigneeFilter = 'all' | 'unassigned' | `agent:${number}`;

export function AdminDashboard() {
  const { api } = useSession();
  const [params, setParams] = useSearchParams();
  const selectedId = parseId(params.get('ticket'));

  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);

  const [status, setStatus] = useState<StatusFilter>('');
  const [assignee, setAssignee] = useState<AssigneeFilter>('all');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim().toLowerCase(), 200);

  const loadTickets = useCallback(async () => {
    try {
      setTickets(await api.listTickets());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [api]);

  const loadAgents = useCallback(async () => {
    try {
      setAgents(await api.listAgents());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [api]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);
  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);
  usePolling(loadTickets, 8000, selectedId === null);

  const assignable = useMemo(() => agents.filter((a) => a.role === 'AGENT'), [agents]);

  const stats = useMemo(() => {
    const all = tickets ?? [];
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, all.filter((t) => t.status === s).length])) as Record<
      TicketStatus,
      number
    >;
    const unassigned = all.filter((t) => !t.assignee && t.status !== 'CLOSED').length;
    return { total: all.length, unassigned, byStatus };
  }, [tickets]);

  const workload = useMemo(
    () =>
      assignable
        .map((a) => {
          const mine = (tickets ?? []).filter((t) => t.assignee?.id === a.id);
          return {
            agent: a,
            open: mine.filter((t) => t.status === 'OPEN').length,
            pending: mine.filter((t) => t.status === 'PENDING').length,
            resolved: mine.filter((t) => !ACTIVE.includes(t.status)).length,
          };
        })
        .sort((x, y) => y.open + y.pending - (x.open + x.pending)),
    [assignable, tickets],
  );
  const maxActive = Math.max(1, ...workload.map((w) => w.open + w.pending));

  const visible = useMemo(() => {
    let list = tickets ?? [];
    if (status) list = list.filter((t) => t.status === status);
    if (assignee === 'unassigned') list = list.filter((t) => !t.assignee);
    else if (assignee.startsWith('agent:')) {
      const id = Number(assignee.slice(6));
      list = list.filter((t) => t.assignee?.id === id);
    }
    if (q) {
      list = list.filter((t) =>
        [t.subject, t.requesterName, t.requesterEmail, `#${t.id}`].some((v) => v.toLowerCase().includes(q)),
      );
    }
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [tickets, status, assignee, q]);

  const assign = async (ticketId: number, agentId: number | null) => {
    setAssigning(ticketId);
    try {
      await api.assignTicket(ticketId, agentId);
      await loadTickets();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAssigning(null);
    }
  };

  const applyCard = (s: StatusFilter, a: AssigneeFilter) => {
    setStatus(s);
    setAssignee(a);
  };

  const teamButton = (
    <Button variant="secondary" size="sm" onClick={() => setTeamOpen(true)}>
      <Users />
      <span className="hidden sm:inline">Team</span>
    </Button>
  );

  return (
    <Layout actions={teamButton}>
      {selectedId !== null ? (
        <div className="mx-auto flex h-full max-w-5xl flex-col border-x border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-2 sm:px-6">
            <Button variant="ghost" size="sm" onClick={() => setParams({})}>
              <ArrowLeft />
              Back to dashboard
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <StaffTicketView
              ticketId={selectedId}
              agents={agents}
              onBack={() => setParams({})}
              onChanged={loadTickets}
            />
          </div>
        </div>
      ) : (
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <div>
              <h1 className="text-2xl font-bold">
                Ticket <span className="neon-text">overview</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monitor every customer ticket and route work to your agents.</p>
            </div>

            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard
                label="Total"
                value={stats.total}
                tone={CARD_TONES.ALL}
                active={!status && assignee === 'all'}
                onClick={() => applyCard('', 'all')}
              />
              <StatCard
                label="Needs assignment"
                value={stats.unassigned}
                tone={CARD_TONES.UNASSIGNED}
                highlight={stats.unassigned > 0}
                active={!status && assignee === 'unassigned'}
                onClick={() => applyCard('', 'unassigned')}
              />
              {STATUSES.map((s) => (
                <StatCard
                  key={s}
                  label={STATUS_LABELS[s]}
                  value={stats.byStatus[s]}
                  tone={CARD_TONES[s]}
                  active={status === s && assignee === 'all'}
                  onClick={() => applyCard(s, 'all')}
                />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
              <section className="min-w-0 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-neon-100/60">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-700 p-3">
                  <div className="relative min-w-[12rem] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search subject, customer or #id"
                      className="h-9 pl-9"
                    />
                  </div>
                  <Select
                    className="w-auto"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  >
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                  <Select
                    className="w-auto"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value as AssigneeFilter)}
                  >
                    <option value="all">All assignees</option>
                    <option value="unassigned">Unassigned</option>
                    {assignable.map((a) => (
                      <option key={a.id} value={`agent:${a.id}`}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {tickets === null ? (
                  !error && <CenteredSpinner />
                ) : visible.length === 0 ? (
                  <div className="h-64">
                    <EmptyState icon={<Inbox />} title="No tickets" description="Nothing matches the current filters." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gradient-to-r from-neon-50/70 dark:from-neon-900/20 to-cyber-50/70 dark:to-cyber-400/10 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Ticket</th>
                          <th className="px-4 py-2.5 font-medium">Customer</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                          <th className="px-4 py-2.5 font-medium">Assignee</th>
                          <th className="px-4 py-2.5 text-right font-medium">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {visible.map((t) => {
                          const current = t.assignee;
                          const options =
                            current && !assignable.some((a) => a.id === current.id)
                              ? [current, ...assignable]
                              : assignable;
                          return (
                            <tr
                              key={t.id}
                              onClick={() => setParams({ ticket: String(t.id) })}
                              className="cursor-pointer transition-colors hover:bg-neon-50/40 dark:hover:bg-neon-500/10"
                            >
                              <td className="max-w-xs px-4 py-3">
                                <div className="truncate font-medium text-slate-900 dark:text-slate-100">{t.subject}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-400">#{t.id}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-slate-700 dark:text-slate-200">{t.requesterName}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-400">{t.requesterEmail}</div>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={t.status} />
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <Select
                                  className={cn('w-44', !current && 'border-neon-300 text-neon-700 dark:text-neon-300')}
                                  value={current?.id ?? ''}
                                  disabled={t.status === 'CLOSED' || assigning === t.id}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    void assign(t.id, v ? Number(v) : null);
                                  }}
                                >
                                  <option value="">Unassigned</option>
                                  {options.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
                                {formatRelative(t.updatedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <aside className="h-fit rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-cyber-100">
                <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                  <h2 className="font-semibold">Agent workload</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active tickets (open + pending)</p>
                </div>
                {workload.length === 0 ? (
                  <div className="h-48">
                    <EmptyState
                      icon={<UserX />}
                      title="No agents yet"
                      description="Add agents from Team to start assigning."
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {workload.map(({ agent, open, pending, resolved }) => {
                      const active = open + pending;
                      return (
                        <li key={agent.id}>
                          <button
                            type="button"
                            onClick={() => applyCard('', `agent:${agent.id}`)}
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neon-50/40 dark:hover:bg-neon-500/10',
                              assignee === `agent:${agent.id}` && 'bg-neon-50/70 dark:bg-neon-500/15',
                            )}
                          >
                            <Avatar name={agent.name} tone="neon" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-sm font-medium">{agent.name}</span>
                                <span className="text-sm font-semibold tabular-nums">{active}</span>
                              </div>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                  className="h-full rounded-full bg-neon-gradient"
                                  style={{ width: `${(active / maxActive) * 100}%` }}
                                />
                              </div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {open} open · {pending} pending · {resolved} done
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      <AgentsDialog open={teamOpen} onClose={() => setTeamOpen(false)} agents={agents} onCreated={loadAgents} />
    </Layout>
  );
}

function StatCard({
  label,
  value,
  tone,
  active,
  highlight,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border bg-white dark:bg-slate-900 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-neon-300 hover:shadow-neon',
        active ? 'border-neon-400 shadow-neon ring-2 ring-neon-100' : highlight ? 'border-neon-200' : 'border-slate-100 dark:border-slate-800',
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', tone)}>{value}</div>
    </button>
  );
}
