import type { ReactNode } from "react";

type PageHeaderProps = {
  label: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ label, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div className="flex flex-col gap-1">
        <p className="hud-label">{`// ${label}`}</p>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">{title}</h1>
        {description ? <p className="max-w-prose text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
