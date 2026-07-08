"use client";

import Link from "next/link";
import { AddChildForm } from "@/components/forms/add-child-form";
import { NavShell } from "@/components/nav-shell";
import { childSummary, monthlyCounts } from "@/features/planning/selectors/planning-selectors";
import { useAppStore } from "@/store/use-app-store";

export function KidsOverviewView() {
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">Kids</h2>
          <p className="text-sm text-slate-600">Open a child-specific dashboard, tests, homework, activities, and documents view.</p>
        </div>

        <AddChildForm />

        <div className="grid gap-3 md:grid-cols-2">
          {children.map((child) => {
            const childItems = items.filter((item) => item.childId === child.id);
            const summary = childSummary(child, items);
            const month = monthlyCounts(childItems);

            return (
              <article key={child.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
                      <h3 className="font-semibold text-slate-900">{child.name}</h3>
                    </div>
                    <p className="text-sm text-slate-600">Grade {child.grade} • Section {child.section}</p>
                  </div>
                  <Link href={`/kids/${encodeURIComponent(child.id)}`} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
                    Open
                  </Link>
                </div>

                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <p>{summary.pendingTasks} pending tasks</p>
                  <p>{summary.upcomingTests} upcoming tests</p>
                  <p>{month.homework} homework this month</p>
                  <p>{month.activities} activities this month</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Need to edit child profile details? Use <Link href="/children" className="text-blue-700">Manage Profiles</Link>.
        </div>
      </section>
    </NavShell>
  );
}