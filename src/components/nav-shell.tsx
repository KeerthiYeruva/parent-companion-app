"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/week", label: "Week" },
  { href: "/month", label: "Month" },
  { href: "/tests", label: "Tests" },
  { href: "/homework", label: "Homework" },
  { href: "/activities", label: "Activities" },
  { href: "/children", label: "Children" },
  { href: "/documents", label: "Documents" },
];

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Parent Companion App</h1>
            <p className="text-sm text-slate-600">School plans simplified into daily family actions</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        <nav className="rounded-xl border border-slate-200 bg-white p-3">
          <ul className="space-y-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded-lg px-3 py-2 text-sm ${
                      active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
