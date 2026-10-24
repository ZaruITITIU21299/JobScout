import type { ReactNode } from "react";
import { Suspense } from "react";
import { MainNav } from "@/components/shell/MainNav";
import { UserMenu } from "@/components/shell/UserMenu";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>
      <aside className="flex flex-col gap-6 border-b border-border bg-surface px-4 py-4 md:w-56 md:border-b-0 md:border-r">
        <div>
          <p className="hud-label">{"// v0.1 ALPHA"}</p>
          <p className="font-display text-2xl font-bold uppercase tracking-widest text-accent">JobScout</p>
        </div>
        <Suspense fallback={null}>
          <MainNav />
        </Suspense>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex min-h-14 items-center justify-end border-b border-border bg-surface px-4">
          <Suspense fallback={<span className="text-sm text-muted">Loading account…</span>}>
            <UserMenu />
          </Suspense>
        </header>
        <main id="main" className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
