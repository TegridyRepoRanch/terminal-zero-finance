// Loading Skeleton Component - For async operations
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-zinc-800 dark:bg-zinc-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], animationClasses[animation], className)}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
}

// Pre-built skeleton patterns for common use cases
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading table...">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-zinc-800">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-3" role="status" aria-label="Loading card...">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// Predefined bar heights for chart skeleton (to avoid dynamic random heights)
const CHART_BAR_HEIGHTS = ['60%', '80%', '45%', '90%', '70%', '55%', '85%', '50%'];

export function ChartSkeleton() {
  return (
    <div className="h-64 bg-zinc-900/50 rounded-lg border border-zinc-800 p-4" role="status" aria-label="Loading chart...">
      <Skeleton className="h-4 w-48 mb-4" />
      <div className="flex items-end justify-between h-48 gap-2">
        {CHART_BAR_HEIGHTS.map((height, i) => (
          <div key={i} className="flex-1" style={{ height }}>
            <Skeleton className="w-full h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-6 p-4" role="status" aria-label="Loading sidebar...">
      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 3 }).map((_, itemIndex) => (
            <div key={itemIndex} className="flex justify-between items-center">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
