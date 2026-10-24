import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="hud-label mb-2">{"// JOBSCOUT.ACCESS"}</p>
        <div className="chamfer border border-border border-t-accent bg-surface p-6">{children}</div>
      </div>
    </main>
  );
}
