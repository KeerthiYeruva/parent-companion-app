import Link from "@/components/routing";
import { NavShell } from "@/components/nav-shell";
import { DataBackupPanel } from "@/features/planning/components/data-backup-panel";

const links = [
  {
    href: "/more/profiles",
    title: "Manage Kids",
    description: "Add children and update grade, section, and academic year",
  },
  {
    href: "/documents",
    title: "School Files",
    description: "PDF import, extraction, and scanning",
  },
];

export function MoreView() {
  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">More</h2>
          <p className="text-sm text-slate-600">
            Settings and document management.
          </p>
        </div>

        <div className="grid gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/40"
            >
              <h3 className="font-semibold text-slate-900">{link.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{link.description}</p>
            </Link>
          ))}
        </div>

        <DataBackupPanel />
      </section>
    </NavShell>
  );
}
