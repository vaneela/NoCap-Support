import { useState, type FormEvent } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { ApiRequestError } from '../../api/client';
import type { Agent, AgentRole } from '../../api/types';
import { Avatar, Badge, Button, ErrorBanner, Field, Input, Modal, Select } from '../../components/ui';
import { errorMessage } from '../../lib/util';
import { useSession } from '../../session/SessionContext';

interface AgentsDialogProps {
  open: boolean;
  onClose: () => void;
  agents: Agent[];
  onCreated: () => void;
}

export function AgentsDialog({ open, onClose, agents, onCreated }: AgentsDialogProps) {
  const { api } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AgentRole>('AGENT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await api.createAgent({ name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
      setRole('AGENT');
      onCreated();
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) setFieldErrors(err.fieldErrors);
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Team">
      <ul className="mb-6 divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        {agents.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={a.name} tone="neon" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{a.name}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{a.email}</div>
            </div>
            {a.role === 'ADMIN' ? (
              <Badge className="bg-neon-50 dark:bg-neon-500/10 text-neon-700 dark:text-neon-300 ring-neon-400/40">
                <ShieldCheck className="h-3 w-3" />
                Admin
              </Badge>
            ) : (
              <Badge className="bg-lime-50 dark:bg-lime-400/10 text-lime-700 dark:text-lime-300 ring-lime-500/40">Agent</Badge>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add a team member</h3>
        {error && <ErrorBanner message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={fieldErrors.name}>
            <Input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" error={fieldErrors.email}>
            <Input required type="email" maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Initial password" error={fieldErrors.password} hint="At least 8 characters.">
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Role">
            <Select className="h-10" value={role} onChange={(e) => setRole(e.target.value as AgentRole)}>
              <option value="AGENT">Agent (own + unassigned tickets)</option>
              <option value="ADMIN">Admin (all tickets, can assign anyone)</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={submitting}>
            {!submitting && <UserPlus />}
            Add member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
