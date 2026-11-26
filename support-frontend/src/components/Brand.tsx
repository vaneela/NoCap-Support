import { Zap } from 'lucide-react';
import { cn } from '../lib/util';

export function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'grid place-items-center bg-neon-gradient text-white shadow-neon',
        size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-8 w-8 rounded-lg',
      )}
    >
      <Zap className={cn('fill-white', size === 'lg' ? 'h-7 w-7' : 'h-4 w-4')} />
    </div>
  );
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-tight', className)}>
      NoCap <span className="neon-text">Support</span>
    </span>
  );
}
