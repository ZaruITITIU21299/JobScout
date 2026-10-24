import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-2 border border-dashed border-border px-4 py-6">
      <p className="hud-label">{"// EMPTY"}</p>
      <p className="font-display text-lg font-semibold uppercase tracking-wide">{title}</p>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
