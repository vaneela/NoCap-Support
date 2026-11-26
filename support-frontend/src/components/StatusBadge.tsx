import type { TicketStatus } from '../api/types';
import { Badge } from './ui';

const STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-cyber-50 dark:bg-cyber-400/10 text-cyber-600 dark:text-cyber-300 ring-cyber-400/50',
  PENDING: 'bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 ring-amber-400/50',
  SOLVED: 'bg-lime-50 dark:bg-lime-400/10 text-lime-700 dark:text-lime-300 ring-lime-500/50',
  CLOSED: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-500/20',
};

const DOTS: Record<TicketStatus, string> = {
  OPEN: 'bg-cyber-400 shadow-cyber',
  PENDING: 'bg-amber-400',
  SOLVED: 'bg-lime-400',
  CLOSED: 'bg-slate-400',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  PENDING: 'Pending',
  SOLVED: 'Solved',
  CLOSED: 'Closed',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge className={STYLES[status]}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[status]}`} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
