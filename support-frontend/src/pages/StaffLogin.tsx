import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button, ErrorBanner, Field, Input } from '../components/ui';
import { errorMessage } from '../lib/util';
import { useSession } from '../session/SessionContext';

export function StaffLogin() {
  const { session, api, signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={session.kind === 'staff' ? '/staff' : '/customer'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      signIn(await api.staffLogin({ email, password }));
      navigate('/staff', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Staff sign in" subtitle="NoCap Support crew only: agents and admins.">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Work email">
          <Input
            required
            type="email"
            autoComplete="username"
            maxLength={320}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            required
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
