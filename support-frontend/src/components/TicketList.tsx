import type { TicketSummary } from '../api/types';
import { cn, formatRelative } from '../lib/util';
import { StatusBadge } from './StatusBadge';

interface TicketListProps {
  tickets: TicketSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  perspective: 'customer' | 'staff';
  currentAgentId?: number;
}

export function TicketList({ tickets, selectedId, onSelect, perspective, currentAgentId }: TicketListProps) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {tickets.map((t) => {
        const active = t.id === selectedId;
        const assignee = t.assignee
          ? t.assignee.id === currentAgentId
            ? 'You'
            : t.assignee.name
          : perspective === 'customer'
            ? 'Awaiting agent'
            : 'Unassigned';
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                'w-full border-l-2 px-4 py-3 text-left transition-colors',
                active ? 'border-neon-500 bg-neon-50/70 dark:bg-neon-500/15' : 'border-transparent hover:bg-neon-50/40 dark:hover:bg-neon-500/10',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-1 text-sm font-medium text-slate-900 dark:text-slate-100">{t.subject}</p>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-400">{formatRelative(t.updatedAt)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-400">#{t.id}</span>
                  {perspective === 'staff' && <> · {t.requesterName}</>}
                  {' · '}
                  <span className={cn(!t.assignee && 'italic')}>{assignee}</span>
                </p>
                <StatusBadge status={t.status} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
