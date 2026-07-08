"use client";

import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavShell } from "@/components/nav-shell";
import { childMonthReadiness, childReviewSummary, childSummary, monthlyCounts } from "@/features/planning/selectors/planning-selectors";
import { useAppStore } from "@/store/use-app-store";

const buildLinks = (childId: string) => [
  { href: `/kids/${encodeURIComponent(childId)}`, label: "Overview" },
  { href: `/kids/${encodeURIComponent(childId)}/month`, label: "Month" },
  { href: `/kids/${encodeURIComponent(childId)}/tests`, label: "Tests" },
  { href: `/kids/${encodeURIComponent(childId)}/homework`, label: "Homework" },
  { href: `/kids/${encodeURIComponent(childId)}/activities`, label: "Activities" },
  { href: `/kids/${encodeURIComponent(childId)}/documents`, label: "Documents" },
];

export function ChildDetailLayout({ childId, title, children }: { childId: string; title: string; children: ReactNode }) {
  const pathname = usePathname();
  const child = useAppStore((state) => state.children.find((entry) => entry.id === childId));
  const items = useAppStore((state) => state.items);
  const documents = useAppStore((state) => state.documents);
  const scanQueue = useAppStore((state) => state.scanQueue);

  if (!child) {
    notFound();
  }

  const childItems = items.filter((item) => item.childId === child.id);
  const summary = childSummary(child, items);
  const month = monthlyCounts(childItems);
  const readiness = childMonthReadiness(child, documents);
  const review = childReviewSummary(child, scanQueue);
  const links = buildLinks(child.id);

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
            <h2 className="text-xl font-semibold text-slate-900">{child.name}</h2>
          </div>
          <p className="text-sm text-slate-600">{title} • Grade {child.grade} • Section {child.section}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-4">
            <p>{summary.pendingTasks} pending tasks</p>
            <p>{summary.upcomingTests} upcoming tests</p>
            <p>{month.homework} homework this month</p>
            <p>{month.activities} activities this month</p>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{readiness.currentMonthLabel} readiness</p>
              <p>{readiness.documentCount} current-month documents imported</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Scan review</p>
              <p>{review.fileCount} matched scanned files</p>
              <p>{review.reviewCount} still need review</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm ${active ? "bg-blue-50 font-medium text-blue-700" : "bg-slate-50 text-slate-700"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {children}
      </section>
    </NavShell>
  );
}