import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = 'Terjadi kesalahan',
  details,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {details && (
          <p className="mt-1 text-xs text-muted-foreground">{details}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
