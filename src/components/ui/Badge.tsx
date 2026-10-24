import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center border border-accent-dim px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-accent">
      {children}
    </span>
  );
}
