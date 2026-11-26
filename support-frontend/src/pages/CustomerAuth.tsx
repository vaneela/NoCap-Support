import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { BrandName } from '../components/Brand';
import { Button, ErrorBanner, Field, Input } from '../components/ui';
import { cn, errorMessage } from '../lib/util';
import { useSession } from '../session/SessionContext';

type Mode = 'signin' | 'register';

export function CustomerAuth() {
  const { session, api, signIn } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (session) return <Navigate to={session.kind === 'customer' ? '/customer' : '/staff'} replace />;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setFieldErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const auth =
        mode === 'register' ? await api.register({ name, email, password }) : await api.login({ email, password });
      const kind = signIn(auth);
      navigate(kind === 'customer' ? '/customer' : '/staff', { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) setFieldErrors(err.fieldErrors);
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={<BrandName />} subtitle="Real humans. Real fixes. No cap.">
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 p-1 text-sm font-medium">
        {(['signin', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              'rounded-lg py-1.5 transition-all',
              mode === m ? 'bg-white dark:bg-slate-900 text-neon-700 dark:text-neon-300 shadow-neon' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700',
            )}
          >
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        {mode === 'register' && (
          <Field label="Your name" error={fieldErrors.name}>
            <Input
              required
              autoComplete="name"
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </Field>
        )}
        <Field label="Email" error={fieldErrors.email}>
          <Input
            required
            type="email"
            autoComplete="email"
            maxLength={320}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </Field>
        <Field
          label="Password"
          error={fieldErrors.password}
          hint={mode === 'register' ? 'At least 8 characters.' : undefined}
        >
          <Input
            required
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={mode === 'register' ? 8 : undefined}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full" loading={submitting}>
          {mode === 'register' ? 'Create account' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
