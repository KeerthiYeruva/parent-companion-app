"use client";

import { useState } from "react";
import Link from "@/components/routing";
import { AddChildForm } from "@/components/forms/add-child-form";
import { NavShell } from "@/components/nav-shell";
import { childSummary, completionProgress, thisMonthItems, thisWeekItems } from "@/features/planning/selectors/planning-selectors";
import { useAppStore } from "@/store/use-app-store";

export function KidsOverviewView() {
  const [showAddChild, setShowAddChild] = useState(false);
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">My Kids</h2>
            <p className="text-sm text-slate-600">See each child&apos;s weekly and monthly growth from uploaded school documents.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddChild((value) => !value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showAddChild ? "Hide Add Child" : "Add Child"}
          </button>
        </div>

        {showAddChild ? <AddChildForm /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {children.map((child) => {
            const childItems = items.filter((item) => item.childId === child.id);
            const summary = childSummary(child, items);
            const weekProgress = completionProgress(thisWeekItems(childItems));
            const monthProgress = completionProgress(thisMonthItems(childItems));

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
                  <p>{summary.pendingTasks} to do</p>
                  <p>{summary.upcomingTests} upcoming tests</p>
                  <p>{weekProgress.label} this week</p>
                  <p>{monthProgress.label} this month</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </NavShell>
  );
}