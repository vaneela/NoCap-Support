import { ThemeToggle } from './ThemeToggle';
import type { ReactNode } from 'react';
import { BrandMark } from './Brand';

export function AuthShell({ title, subtitle, children }: { title: ReactNode; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-white dark:bg-slate-900">
      <div className="absolute right-4 top-4 z-10"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-neon-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-cyber-400/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="relative mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 w-fit">
            <BrandMark size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">{title}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{subtitle}</p>
        </div>
        <section className="rounded-2xl border border-white/60 dark:border-slate-700 bg-white/80 dark:bg-slate-900/90 p-6 shadow-neon-lg backdrop-blur-xl">
          {children}
        </section>
      </div>
    </div>
  );
}
