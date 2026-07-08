import Link from "@/components/routing";
import { NavShell } from "@/components/nav-shell";

const links = [
  { href: "/tasks", title: "Tasks", description: "Power-user view for overdue, today, and upcoming work" },
  { href: "/documents", title: "School Files", description: "Setup-only PDF import and extraction summary" },
  { href: "/children", title: "Profiles", description: "Manage child profiles and grade matching" },
  { href: "/tests", title: "Tests", description: "Upcoming and past tests" },
  { href: "/homework", title: "Homework", description: "Homework, study work, and projects" },
  { href: "/activities", title: "Activities", description: "School activities and reminders" },
];

export function MoreView() {
  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">More</h2>
          <p className="text-sm text-slate-600">Setup, document import, and power-user planning views.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/40">
              <h3 className="font-semibold text-slate-900">{link.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </NavShell>
  );
}