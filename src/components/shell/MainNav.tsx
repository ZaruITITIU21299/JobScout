"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/board", label: "Board" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cvs", label: "CVs" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex gap-2 md:flex-col">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center border-l-2 px-3 font-display text-lg font-semibold uppercase tracking-wider transition-colors ${
                  active ? "border-accent bg-surface-raised text-accent" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
