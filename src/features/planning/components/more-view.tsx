import Link from "@/components/routing";
import { NavShell } from "@/components/nav-shell";

export const morePageLinks = [
  {
    href: "/more/profiles",
    title: "Manage Kids",
    description: "Add or update child profiles",
  },
  {
    href: "/documents",
    title: "School Files",
    description: "Upload, scan, review, and manage school documents",
  },
  {
    href: "/backup",
    title: "Data & Backup",
    description: "Export, import, and manage planner data",
  },
];

export function MoreView() {
  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">More</h2>
          <p className="text-sm text-slate-600">
            Manage profiles, school files, and planner data.
          </p>
        </div>

        <div className="grid gap-3">
          {morePageLinks.map((link) => (
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

      </section>
    </NavShell>
  );
}
