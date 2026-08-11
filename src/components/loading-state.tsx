import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Memproses...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted" />
        <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="mt-1 text-xs text-muted-foreground">Mohon tunggu sebentar</p>
      </div>
    </div>
  );
}
