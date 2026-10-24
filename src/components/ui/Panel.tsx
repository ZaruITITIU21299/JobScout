import type { ReactNode } from "react";

type PanelProps = {
  label?: string;
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Main content container: dark surface, 1px border, thin gold accent line. */
export function Panel({ label, title, actions, children, className = "" }: PanelProps) {
  return (
    <section className={`border border-border border-t-accent-dim bg-surface ${className}`}>
      {label || title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-col gap-0.5">
            {label ? <p className="hud-label">{`// ${label}`}</p> : null}
            {title ? <h2 className="font-display text-xl font-semibold uppercase tracking-wide">{title}</h2> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
