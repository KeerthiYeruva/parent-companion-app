"use client";

import dayjs from "dayjs";
import { useEffect, useMemo } from "react";
import { AddItemForm } from "@/components/forms/add-item-form";
import { ChildFilter } from "@/components/child-filter";
import { ItemList } from "@/components/item-list";
import { NavShell } from "@/components/nav-shell";
import {
  bySelectedChildren,
  childSummary,
  monthlyCounts,
  thisWeekItems,
  todayItems,
} from "@/features/planning/selectors/planning-selectors";
import { useAppStore } from "@/store/use-app-store";

export type PlanningMode = "dashboard" | "week" | "month" | "tests" | "homework" | "activities";

const categoryGroup = ["Homework", "HomeStudy", "Activity", "ClassTest", "UnitTest", "Exam", "Project", "Circular"] as const;

export function PlanningView({ mode }: { mode: PlanningMode }) {
  const seedDemoData = useAppStore((state) => state.seedDemoData);
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);
  const scanQueue = useAppStore((state) => state.scanQueue);
  const lastScanAt = useAppStore((state) => state.lastScanAt);
  const selectedChildIds = useAppStore((state) => state.selectedChildIds);

  useEffect(() => {
    seedDemoData();
  }, [seedDemoData]);

  const selectedItems = useMemo(() => bySelectedChildren(items, selectedChildIds), [items, selectedChildIds]);
  const monthly = useMemo(() => monthlyCounts(selectedItems), [selectedItems]);

  const title =
    mode === "dashboard"
      ? "Family Dashboard"
      : mode === "week"
        ? "Week View"
        : mode === "month"
          ? "Month View"
          : mode === "tests"
            ? "Tests Center"
            : mode === "homework"
              ? "Homework Center"
              : "Activities Center";

  let content = null;

  if (mode === "dashboard") {
    const reviewCount = scanQueue.filter((file) => file.status === "review").length;
    content = (
      <>
        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Last Scan</p>
            <p className="text-lg font-semibold text-slate-900">{lastScanAt ? dayjs(lastScanAt).format("DD MMM, hh:mm A") : "Not scanned yet"}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Files in Queue</p>
            <p className="text-3xl font-bold text-slate-900">{scanQueue.length}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Needs Review</p>
            <p className="text-3xl font-bold text-slate-900">{reviewCount}</p>
          </article>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {children.map((child) => {
            const summary = childSummary(child, selectedItems);
            return (
              <article key={child.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
                  <h3 className="font-semibold text-slate-900">{child.name}</h3>
                </div>
                <p className="text-sm text-slate-600">{summary.pendingTasks} pending tasks</p>
                <p className="text-sm text-slate-600">{summary.upcomingTests} upcoming tests</p>
                <p className="text-sm text-slate-600">{summary.activityTomorrow ? "Activity tomorrow" : "No activity tomorrow"}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-lg font-semibold">Today</h3>
            <ItemList items={todayItems(selectedItems)} emptyText="No tasks due today." />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-lg font-semibold">This Week</h3>
            <ItemList items={thisWeekItems(selectedItems)} emptyText="No tasks in this week." />
          </div>
        </section>
      </>
    );
  }

  if (mode === "week") {
    const groups = categoryGroup.map((category) => ({
      category,
      items: thisWeekItems(selectedItems).filter((item) => item.category === category),
    }));

    content = (
      <section className="space-y-3">
        {groups.map((group) => (
          <div key={group.category} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 font-semibold">{group.category}</h3>
            <ItemList items={group.items} emptyText={`No ${group.category.toLowerCase()} this week.`} />
          </div>
        ))}
      </section>
    );
  }

  if (mode === "month") {
    const monthItems = selectedItems
      .filter((item) => dayjs(item.dueDate).isSame(dayjs(), "month"))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    content = (
      <section className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Homework" value={monthly.homework} />
          <MetricCard label="Tests" value={monthly.tests} />
          <MetricCard label="Activities" value={monthly.activities} />
          <MetricCard label="Projects" value={monthly.projects} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">Monthly Timeline</h3>
          <ItemList items={monthItems} emptyText="No records this month." />
        </div>
      </section>
    );
  }

  if (mode === "tests") {
    const tests = selectedItems.filter((item) => ["ClassTest", "UnitTest", "Exam"].includes(item.category));
    const upcoming = tests.filter((item) => dayjs(item.dueDate).isAfter(dayjs().subtract(1, "day"), "day"));
    const past = tests.filter((item) => dayjs(item.dueDate).isBefore(dayjs(), "day"));

    content = (
      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">Upcoming Tests</h3>
          <ItemList items={upcoming} emptyText="No upcoming tests." />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">Past Tests</h3>
          <ItemList items={past} emptyText="No past tests yet." />
        </div>
      </section>
    );
  }

  if (mode === "homework") {
    const homework = selectedItems.filter((item) => item.category === "Homework");
    content = (
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-semibold">Pending</h3>
          <ItemList items={homework.filter((item) => item.status === "Pending" || item.status === "Upcoming")} emptyText="No pending homework." />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-semibold">Completed</h3>
          <ItemList items={homework.filter((item) => item.status === "Completed")} emptyText="No completed homework." />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-semibold">Overdue</h3>
          <ItemList items={homework.filter((item) => item.status === "Overdue")} emptyText="No overdue homework." />
        </div>
      </section>
    );
  }

  if (mode === "activities") {
    const activities = selectedItems.filter((item) => item.category === "Activity");
    content = (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-lg font-semibold">Activities (Week and Month)</h3>
        <ItemList items={activities} emptyText="No activities scheduled." />
      </section>
    );
  }

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{dayjs().format("dddd, DD MMMM YYYY")}</p>
        </div>

        <ChildFilter />
        <AddItemForm />
        {content}
      </section>
    </NavShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
