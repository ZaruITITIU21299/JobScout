type SkeletonProps = {
  label: string;
  className?: string;
};

/** Loading placeholder; the label is announced to screen readers. */
export function Skeleton({ label, className = "h-32" }: SkeletonProps) {
  return (
    <div role="status" aria-live="polite" className={`animate-pulse border border-border bg-surface ${className}`}>
      <span className="sr-only">{label}</span>
    </div>
  );
}
