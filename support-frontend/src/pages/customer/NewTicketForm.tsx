import { useState, type FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ApiRequestError } from '../../api/client';
import type { TicketDetail } from '../../api/types';
import { Button, ErrorBanner, Field, Input, Textarea } from '../../components/ui';
import { errorMessage } from '../../lib/util';
import { useCustomer, useSession } from '../../session/SessionContext';

interface NewTicketFormProps {
  onCreated: (ticket: TicketDetail) => void;
  onCancel?: () => void;
}

export function NewTicketForm({ onCreated, onCancel }: NewTicketFormProps) {
  const { api } = useSession();
  const customer = useCustomer();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const ticket = await api.createTicket({ subject, description });
      onCreated(ticket);
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) setFieldErrors(err.fieldErrors);
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 md:hidden"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <h1 className="text-xl font-semibold tracking-tight">How can we help?</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Describe your issue and our team will reply in this chat.</p>

        <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          {error && <ErrorBanner message={error} />}
          <Field label="Subject" error={fieldErrors.subject}>
            <Input
              required
              autoFocus
              maxLength={300}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Can't reset my password"
            />
          </Field>
          <Field label="Describe the problem" error={fieldErrors.description}>
            <Textarea
              required
              rows={7}
              maxLength={10000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect? Any steps to reproduce?"
            />
          </Field>
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-5 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submitting as <span className="font-medium text-slate-700 dark:text-slate-200">{customer.name}</span> ({customer.email})
            </p>
            <Button type="submit" loading={submitting}>
              Submit ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
