"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { AddItemForm } from "@/components/forms/add-item-form";
import { ChildFilter } from "@/components/child-filter";
import { ItemList } from "@/components/item-list";
import { NavShell } from "@/components/nav-shell";
import {
  bySelectedChildren,
  completionProgress,
  itemsByChild,
  monthlyCounts,
  monthItemsByWeek,
  splitOpenAndCompletedItems,
  taskCategoryLabel,
  todayItems,
  thisMonthItems,
  thisWeekItems,
} from "@/features/planning/selectors/planning-selectors";
import type { ChildProfile, SchoolItem } from "@/types/domain";
import { useAppStore } from "@/store/use-app-store";

export type PlanningMode = "dashboard" | "day" | "week" | "month" | "tasks" | "tests" | "homework" | "activities";

export function PlanningView({ mode }: { mode: PlanningMode }) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);
  const selectedChildIds = useAppStore((state) => state.selectedChildIds);

  const selectedItems = useMemo(() => bySelectedChildren(items, selectedChildIds), [items, selectedChildIds]);
  const dayItems = useMemo(() => todayItems(selectedItems), [selectedItems]);
  const weekItems = useMemo(() => thisWeekItems(selectedItems), [selectedItems]);
  const monthItems = useMemo(() => thisMonthItems(selectedItems), [selectedItems]);
  const dailyProgress = useMemo(() => completionProgress(dayItems), [dayItems]);
  const weeklyProgress = useMemo(() => completionProgress(weekItems), [weekItems]);
  const monthlyProgress = useMemo(() => completionProgress(monthItems), [monthItems]);
  const monthly = useMemo(() => monthlyCounts(selectedItems), [selectedItems]);

  const title =
    mode === "dashboard"
      ? "Kids Growth Dashboard"
      : mode === "day"
        ? "Today"
      : mode === "week"
        ? "This Week"
        : mode === "month"
          ? "This Month"
          : mode === "tasks"
            ? "Tasks"
          : mode === "tests"
            ? "Tests Center"
            : mode === "homework"
              ? "Homework Center"
              : "Activities Center";

  let content = null;

  if (mode === "dashboard") {
    const familyOpen = splitOpenAndCompletedItems(weekItems).open.length;
    content = (
      <>
        <section className="grid gap-3 md:grid-cols-3">
          <ProgressCard label="This Week" progress={weeklyProgress} />
          <ProgressCard label="This Month" progress={monthlyProgress} />
          <MetricCard label="Open This Week" value={familyOpen} />
        </section>

        <section className="grid gap-3 xl:grid-cols-2">
          {children.map((child) => {
            const childWeekItems = weekItems.filter((item) => item.childId === child.id);
            const childMonthItems = monthItems.filter((item) => item.childId === child.id);
            const childMonthProgress = completionProgress(childMonthItems);
            return <ChildTodayCard key={child.id} child={child} weekItems={childWeekItems} monthProgress={childMonthProgress} />;
          })}
        </section>
      </>
    );
  }

  if (mode === "day") {
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const groups = children
      .filter((child) => selectedChildIds.length === 0 || selectedChildIds.includes(child.id))
      .map((child) => {
        const childDayItems = dayItems.filter((item) => item.childId === child.id);
        const tomorrowTests = selectedItems.filter(
          (item) => item.childId === child.id && item.dueDate === tomorrow && ["ClassTest", "UnitTest", "Exam"].includes(item.category) && item.status !== "Completed",
        );
        const priorityItems = [...tomorrowTests, ...childDayItems].filter((item, index, allItems) => allItems.findIndex((entry) => entry.id === item.id) === index);

        return {
          child,
          items: priorityItems,
          progress: completionProgress(priorityItems),
        };
      });
    const upcomingItems = selectedItems
      .filter((item) => {
        const due = dayjs(item.dueDate);
        return due.isAfter(dayjs(), "day") && due.isBefore(dayjs().add(4, "day"), "day") && item.status !== "Completed";
      })
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
      .slice(0, 6);
    const weekSummary = summarizeItems(weekItems);
    const monthSummary = summarizeItems(monthItems);

    content = (
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Today</p>
          <h3 className="mt-1 text-3xl font-bold text-slate-950">{dailyProgress.label}</h3>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${dailyProgress.percent}%` }} />
          </div>
        </div>
        {groups.map((group) => (
          <article key={group.child.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${group.child.colorTag}`} />
                <h3 className="font-semibold text-slate-900">{group.child.name}</h3>
              </div>
              <span className="text-sm font-medium text-slate-600">{group.progress.label}</span>
            </div>
            {group.items.length > 0 ? <CompactWeekItemList items={group.items} /> : <ItemList items={[]} emptyText="Nothing due today." />}
          </article>
        ))}
        <SummarySection title="Upcoming" subtitle="Next 3 days" items={upcomingItems} emptyText="No upcoming priorities in the next 3 days." />
        <section className="grid gap-3 sm:grid-cols-2">
          <PlanSummaryCard title="This Week" summary={weekSummary} />
          <PlanSummaryCard title="This Month" summary={monthSummary} />
        </section>
      </section>
    );
  }

  if (mode === "tasks") {
    const openItems = splitOpenAndCompletedItems(selectedItems).open.sort((first, second) => first.dueDate.localeCompare(second.dueDate));
    const overdue = openItems.filter((item) => dayjs(item.dueDate).isBefore(dayjs(), "day"));
    const today = openItems.filter((item) => dayjs(item.dueDate).isSame(dayjs(), "day"));
    const upcoming = openItems.filter((item) => dayjs(item.dueDate).isAfter(dayjs(), "day"));

    content = (
      <section className="space-y-3">
        <SummarySection title="Overdue" items={overdue} emptyText="No overdue tasks." />
        <SummarySection title="Today" items={today} emptyText="Nothing due today." />
        <SummarySection title="Upcoming" items={upcoming.slice(0, 20)} emptyText="No upcoming tasks." />
      </section>
    );
  }

  if (mode === "week") {
    const groups = itemsByChild(children, weekItems).filter((group) => selectedChildIds.length === 0 || selectedChildIds.includes(group.child.id));

    content = (
      <section className="space-y-3">
        <ProgressCard label="Weekly Progress" progress={weeklyProgress} />
        {groups.map((group) => (
          <div key={group.child.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${group.child.colorTag}`} />
                <h3 className="font-semibold text-slate-900">{group.child.name}</h3>
              </div>
              <span className="text-sm font-medium text-slate-600">{group.progress.label}</span>
            </div>
            <WeekTaskBuckets items={group.items} />
          </div>
        ))}
      </section>
    );
  }

  if (mode === "month") {
    const childGroups = itemsByChild(children, monthItems).filter((group) => selectedChildIds.length === 0 || selectedChildIds.includes(group.child.id));

    content = (
      <section className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <ProgressCard label="Monthly Progress" progress={monthlyProgress} />
          <MetricCard label="Homework" value={monthly.homework} />
          <MetricCard label="Tests" value={monthly.tests} />
          <MetricCard label="Activities" value={monthly.activities} />
          <MetricCard label="Projects" value={monthly.projects} />
        </div>
        {childGroups.map((group) => (
          <div key={group.child.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${group.child.colorTag}`} />
                <h3 className="font-semibold text-slate-900">{group.child.name}</h3>
              </div>
              <span className="text-sm font-medium text-slate-600">{group.progress.label}</span>
            </div>
            <div className="space-y-3">
              {monthItemsByWeek(group.items).map((week) => (
                <MonthWeekGroup key={`${group.child.id}-${week.key}`} week={week} />
              ))}
              {group.items.length === 0 ? <ItemList items={[]} emptyText="No records this month." /> : null}
            </div>
          </div>
        ))}
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
    const homework = selectedItems.filter((item) => ["Homework", "HomeStudy", "Project"].includes(item.category));
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ChildFilter />
          <button
            type="button"
            onClick={() => setShowQuickAdd((value) => !value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showQuickAdd ? "Hide Quick Add" : "Quick Add"}
          </button>
        </div>
        {showQuickAdd ? <AddItemForm /> : null}
        {content}
      </section>
    </NavShell>
  );
}

function WeekTaskBuckets({ items }: { items: SchoolItem[] }) {
  const split = splitOpenAndCompletedItems(items);
  const openDayGroups = weekItemsByDay(split.open);

  if (items.length === 0) {
    return <ItemList items={[]} emptyText="No tasks this week." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Do</h4>
          <span className="text-xs font-medium text-slate-500">{split.open.length} open</span>
        </div>
        <div className="space-y-3">
          {openDayGroups.map((dayGroup) => (
            <div key={dayGroup.date} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h5 className="text-sm font-semibold text-slate-800">{dayjs(dayGroup.date).format("dddd, DD MMM")}</h5>
                <span className="text-xs font-medium text-slate-500">
                  {dayGroup.items.length} item{dayGroup.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <CompactWeekItemList items={dayGroup.items} />
            </div>
          ))}
          {split.open.length === 0 ? <ItemList items={[]} emptyText="No open tasks this week." /> : null}
        </div>
      </div>
      {split.completed.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</h4>
            <span className="text-xs font-medium text-emerald-700">{split.completed.length} done</span>
          </div>
          <CompactWeekItemList items={split.completed} />
        </div>
      ) : null}
    </div>
  );
}

function weekItemsByDay(items: SchoolItem[]) {
  const groups = new Map<string, SchoolItem[]>();

  [...items]
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate) || taskCategoryLabel(first.category).localeCompare(taskCategoryLabel(second.category)))
    .forEach((item) => {
      const dayItems = groups.get(item.dueDate) ?? [];
      dayItems.push(item);
      groups.set(item.dueDate, dayItems);
    });

  return Array.from(groups.entries()).map(([date, dayItems]) => ({ date, items: dayItems }));
}

function CompactWeekItemList({ items }: { items: SchoolItem[] }) {
  const children = useAppStore((state) => state.children);
  const setItemPrepStatus = useAppStore((state) => state.setItemPrepStatus);

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {items.map((item) => {
        const child = children.find((entry) => entry.id === item.childId);
        const isCompleted = item.status === "Completed";
        const taskStatus = isCompleted ? "Ready" : (item.prepStatus ?? "NotStarted");

        return (
          <li key={item.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{taskCategoryLabel(item.category)}</span>
                {item.subject ? <span className="text-xs font-medium text-slate-500">{item.subject}</span> : null}
              </div>
              <p className={`mt-1 text-sm font-medium ${isCompleted ? "text-emerald-900 line-through decoration-emerald-500" : "text-slate-900"}`}>{item.title}</p>
              <p className="text-xs text-slate-500">{child?.name ?? "Unknown child"}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              <WeekStatusButton active={taskStatus === "NotStarted"} label="Not Started" onClick={() => setItemPrepStatus(item.id, "NotStarted")} />
              <WeekStatusButton active={taskStatus === "InProgress"} label="In Progress" onClick={() => setItemPrepStatus(item.id, "InProgress")} />
              <WeekStatusButton active={taskStatus === "Ready"} label="Completed" onClick={() => setItemPrepStatus(item.id, "Ready")} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function WeekStatusButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:bg-white/70"}`}
    >
      {label}
    </button>
  );
}

function summarizeItems(items: SchoolItem[]) {
  return {
    tasks: items.filter((item) => ["Homework", "HomeStudy", "Project"].includes(item.category)).length,
    tests: items.filter((item) => ["ClassTest", "UnitTest", "Exam"].includes(item.category)).length,
    activities: items.filter((item) => item.category === "Activity").length,
  };
}

function PlanSummaryCard({ title, summary }: { title: string; summary: ReturnType<typeof summarizeItems> }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm text-slate-600">
        <p className="rounded-lg bg-slate-50 px-2 py-2"><span className="block text-lg font-bold text-slate-950">{summary.tasks}</span>Tasks</p>
        <p className="rounded-lg bg-slate-50 px-2 py-2"><span className="block text-lg font-bold text-slate-950">{summary.tests}</span>Tests</p>
        <p className="rounded-lg bg-slate-50 px-2 py-2"><span className="block text-lg font-bold text-slate-950">{summary.activities}</span>Activities</p>
      </div>
    </article>
  );
}

function SummarySection({ title, subtitle, items, emptyText }: { title: string; subtitle?: string; items: SchoolItem[]; emptyText: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="text-xs font-medium text-slate-500">{items.length}</span>
      </div>
      {items.length > 0 ? <CompactWeekItemList items={items} /> : <ItemList items={[]} emptyText={emptyText} />}
    </section>
  );
}

function MonthWeekGroup({
  week,
}: {
  week: ReturnType<typeof monthItemsByWeek>[number];
}) {
  const split = splitOpenAndCompletedItems(week.items);

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Week of {week.label}</h4>
          <p className="text-xs text-slate-500">
            {split.open.length} open • {split.completed.length} completed
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{week.progress.label}</span>
      </div>
      <div className="space-y-3">
        <div>
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">To Do</h5>
          <ItemList items={split.open} emptyText="No open tasks this week." />
        </div>
        {split.completed.length > 0 ? (
          <div>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</h5>
            <ItemList items={split.completed} emptyText="No completed tasks this week." />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChildTodayCard({
  child,
  weekItems,
  monthProgress,
}: {
  child: ChildProfile;
  weekItems: SchoolItem[];
  monthProgress: { completed: number; total: number; label: string; percent: number };
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  const openWeekItems = splitOpenAndCompletedItems(weekItems).open;
  const todayTasks = openWeekItems.filter((item) => item.dueDate === today);
  const tomorrowTasks = openWeekItems.filter((item) => item.dueDate === tomorrow);
  const laterThisWeek = openWeekItems.filter((item) => item.dueDate !== today && item.dueDate !== tomorrow).slice(0, 4);
  const tests = openWeekItems.filter((item) => ["ClassTest", "UnitTest", "Exam"].includes(item.category));
  const weekProgress = completionProgress(weekItems);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{child.name}</h3>
            <p className="text-sm text-slate-500">{weekProgress.label} this week</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">{monthProgress.label} this month</span>
      </div>

      <DashboardTaskSection title="Today" items={todayTasks} emptyText="Nothing due today." />
      <DashboardTaskSection title="Tomorrow" items={tomorrowTasks} emptyText="Nothing due tomorrow." />
      <DashboardTaskSection title="Later This Week" items={laterThisWeek} emptyText="No more tasks this week." />

      {tests.length > 0 ? (
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
          {tests.length} upcoming test{tests.length > 1 ? "s" : ""} this week
        </p>
      ) : null}
    </article>
  );
}

function DashboardTaskSection({ title, items, emptyText }: { title: string; items: SchoolItem[]; emptyText: string }) {
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {item.subject ? `${item.subject} • ` : ""}{taskCategoryLabel(item.category)} • {dayjs(item.dueDate).format("ddd, DD MMM")}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                {item.prepStatus === "InProgress" ? "In Progress" : item.status === "Completed" ? "Done" : "To Do"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
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

function ProgressCard({ label, progress }: { label: string; progress: { completed: number; total: number; label: string; percent: number } }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{progress.label}</p>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
      </div>
    </article>
  );
}
