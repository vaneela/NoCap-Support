import { ThemeToggle } from './ThemeToggle';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useSession } from '../session/SessionContext';
import { BrandMark, BrandName } from './Brand';
import { Badge, Button } from './ui';

export function Layout({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { session, signOut } = useSession();
  const navigate = useNavigate();

  const user = session?.user;
  const identity = !user
    ? null
    : user.role === 'CUSTOMER'
      ? { name: user.name, email: user.email, role: 'Customer', tone: 'bg-cyber-50 dark:bg-cyber-400/10 text-cyber-600 dark:text-cyber-300 ring-cyber-400/40' }
      : user.role === 'ADMIN'
        ? { name: user.name, email: user.email, role: 'Admin', tone: 'bg-neon-50 dark:bg-neon-500/10 text-neon-700 dark:text-neon-300 ring-neon-400/40' }
        : { name: user.name, email: user.email, role: 'Agent', tone: 'bg-lime-50 dark:bg-lime-400/10 text-lime-700 dark:text-lime-300 ring-lime-500/40' };

  return (
    <div className="flex h-full flex-col">
      <header className="relative flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 px-4 backdrop-blur sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-neon-gradient opacity-60" />
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <BrandName className="text-sm sm:text-lg" />
          {identity && <Badge className={identity.tone}>{identity.role}</Badge>}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {actions}
          {identity && (
            <>
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-sm font-medium">{identity.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{identity.email}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const target = session?.kind === 'staff' ? '/staff/login' : '/';
                  signOut();
                  navigate(target, { replace: true });
                }}
              >
                <LogOut />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          )}
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
