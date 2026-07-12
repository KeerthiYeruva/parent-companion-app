import { useEffect, type ReactNode } from "react";
import Link, { usePathname } from "@/components/routing";
import { useAppStore } from "@/store/use-app-store";

const desktopLinks = [
  { href: "/", label: "Overview" },
  { href: "/tests", label: "Tests" },
  { href: "/homework", label: "Homework" },
  { href: "/tasks", label: "Tasks" },
  { href: "/kids", label: "Kids" },
  { href: "/more", label: "More" },
];

const mobileLinks = [
  { href: "/", label: "Overview" },
  { href: "/tests", label: "Tests" },
  { href: "/homework", label: "Homework" },
  { href: "/kids", label: "Kids" },
  { href: "/more", label: "More" },
];

const morePaths = ["/more", "/documents", "/scan"];

const isActiveLink = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/" || pathname === "/day";
  }

  if (href === "/more") {
    return morePaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrateLocalData = useAppStore((state) => state.hydrateLocalData);
  const warnings = useAppStore((state) => state.persistenceWarnings);
  const clearWarnings = useAppStore((state) => state.clearPersistenceWarnings);
  const showWarnings =
    warnings.length > 0 &&
    (pathname === "/documents" || pathname.startsWith("/scan"));

  useEffect(() => {
    hydrateLocalData();
  }, [hydrateLocalData]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Parent Companion
            </h1>

            <p className="hidden text-sm text-slate-600 lg:block">
              Today&apos;s school work, already organized from PDFs
            </p>
          </div>

          <nav className="hidden md:block">
            <ul className="flex items-center gap-1">
              {desktopLinks.map((link) => {
                const active = isActiveLink(pathname, link.href);

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      {showWarnings ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-3">
            <p className="text-sm text-amber-900">
              {warnings[0]}
              {warnings.length > 1
                ? ` (${warnings.length - 1} more warning${warnings.length - 1 > 1 ? "s" : ""})`
                : ""}
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

      <div className="mx-auto max-w-7xl px-4 py-4 pb-24 md:pb-4">
        <main className="space-y-4">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileLinks.map((link) => {
            const active = isActiveLink(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-lg px-1 py-2 text-center text-xs font-medium ${active ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
