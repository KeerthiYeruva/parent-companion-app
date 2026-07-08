"use client";

import { useEffect, type ReactNode } from "react";
import Link, { usePathname } from "@/components/routing";
import { useAppStore } from "@/store/use-app-store";

const navGroups = [
  {
    label: "Family",
    links: [
      { href: "/", label: "Dashboard" },
      { href: "/day", label: "Today" },
      { href: "/week", label: "This Week" },
      { href: "/month", label: "This Month" },
      { href: "/kids", label: "My Kids" },
    ],
  },
  {
    label: "Setup",
    links: [
      { href: "/documents", label: "Upload Documents" },
      { href: "/children", label: "Profiles" },
    ],
  },
];

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrateLocalData = useAppStore((state) => state.hydrateLocalData);
  const warnings = useAppStore((state) => state.persistenceWarnings);
  const clearWarnings = useAppStore((state) => state.clearPersistenceWarnings);
  const showWarnings = warnings.length > 0 && (pathname === "/documents" || pathname.startsWith("/scan"));

  useEffect(() => {
    hydrateLocalData();
  }, [hydrateLocalData]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Parent Companion</h1>
            <p className="text-sm text-slate-600">Upload school PDFs, then track each child&apos;s weekly progress</p>
          </div>
        </div>
      </header>

      {showWarnings ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-3">
            <p className="text-sm text-amber-900">
              {warnings[0]}
              {warnings.length > 1 ? ` (${warnings.length - 1} more warning${warnings.length - 1 > 1 ? "s" : ""})` : ""}
            </p>
            <button
              type="button"
              onClick={clearWarnings}
              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        <nav className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="space-y-4">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                <ul className="space-y-1">
                  {group.links.map((link) => {
                    const active = pathname === link.href || (link.href === "/documents" && pathname.startsWith("/scan"));
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
              </div>
            ))}
          </div>
        </nav>

        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
