import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { TicketDetail } from '../api/types';
import { StatusBadge } from './StatusBadge';

interface TicketHeaderProps {
  ticket: TicketDetail;
  onBack: () => void;
  meta: ReactNode;
  actions?: ReactNode;
}

export function TicketHeader({ ticket, onBack, meta, actions }: TicketHeaderProps) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 rounded-md p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          aria-label="Back to tickets"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{ticket.subject}</h1>
            <StatusBadge status={ticket.status} />
          </div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="text-slate-400 dark:text-slate-400">#{ticket.id}</span> · {meta}
          </div>
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap items-center gap-2 md:pl-0">{actions}</div>}
    </div>
  );
}
