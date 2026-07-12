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
  thisMonthItems,
  thisWeekItems,
} from "@/features/planning/selectors/planning-selectors";
import type { ChildProfile, SchoolItem } from "@/types/domain";
import { useAppStore } from "@/store/use-app-store";

export type PlanningMode = "dashboard" | "day" | "week" | "month";

const testCategories: SchoolItem["category"][] = [
  "ClassTest",
  "UnitTest",
  "Exam",
];
const studyCategories: SchoolItem["category"][] = [
  "Homework",
  "HomeStudy",
  "Project",
];

export function PlanningView({ mode }: { mode: PlanningMode }) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);
  const selectedChildIds = useAppStore((state) => state.selectedChildIds);

  const activeChildIds = useMemo(() => {
    if (
      selectedChildIds.length === 1 &&
      children.some((child) => child.id === selectedChildIds[0])
    ) {
      return selectedChildIds;
    }

    return children[0] ? [children[0].id] : [];
  }, [children, selectedChildIds]);
  const selectedItems = useMemo(
    () =>
      uniqueItems(parentReadyItems(bySelectedChildren(items, activeChildIds))),
    [activeChildIds, items],
  );
  const weekItems = useMemo(
    () => thisWeekItems(selectedItems),
    [selectedItems],
  );
  const monthItems = useMemo(
    () => thisMonthItems(selectedItems),
    [selectedItems],
  );
  const weeklyProgress = useMemo(
    () => completionProgress(weekItems),
    [weekItems],
  );
  const monthlyProgress = useMemo(
    () => completionProgress(monthItems),
    [monthItems],
  );
  const monthly = useMemo(() => monthlyCounts(selectedItems), [selectedItems]);

  const title =
    mode === "dashboard"
      ? "Kids Growth Dashboard"
      : mode === "day"
        ? "Today"
        : mode === "week"
          ? "This Week"
          : "This Month";

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
            const childWeekItems = weekItems.filter(
              (item) => item.childId === child.id,
            );
            const childMonthItems = monthItems.filter(
              (item) => item.childId === child.id,
            );
            const childMonthProgress = completionProgress(childMonthItems);
            return (
              <ChildTodayCard
                key={child.id}
                child={child}
                weekItems={childWeekItems}
                monthProgress={childMonthProgress}
              />
            );
          })}
        </section>
      </>
    );
  }

  if (mode === "day") {
    const today = dayjs().format("YYYY-MM-DD");
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const groups = children
      .filter((child) => activeChildIds.includes(child.id))
      .map((child) => {
        const childItems = selectedItems.filter(
          (item) => item.childId === child.id,
        );
        const priorityItems = childItems.filter((item) => {
          const isTomorrowTest =
            item.dueDate === tomorrow && testCategories.includes(item.category);
          const isDueToday = item.dueDate === today;
          return isTomorrowTest || isDueToday;
        });
        const urgentItems = childItems.filter((item) => {
          return (
            item.dueDate === today && testCategories.includes(item.category)
          );
        });
        const dueTodayItems = childItems.filter(
          (item) =>
            item.dueDate === today &&
            item.category !== "Activity" &&
            !testCategories.includes(item.category),
        );
        const activityItems = childItems.filter(
          (item) => item.dueDate === today && item.category === "Activity",
        );
        const tomorrowTests = selectedItems.filter(
          (item) =>
            item.childId === child.id &&
            item.dueDate === tomorrow &&
            testCategories.includes(item.category),
        );

        return {
          child,
          urgentItems,
          dueTodayItems,
          activityItems,
          tomorrowTests,
          progress: completionProgress(priorityItems),
        };
      });
    const todayPriorityProgress = completionProgress(
      uniqueItems(
        groups.flatMap((group) => [
          ...group.urgentItems,
          ...group.dueTodayItems,
          ...group.activityItems,
          ...group.tomorrowTests,
        ]),
      ),
    );
    const todayDate = dayjs();
    const upcomingEndDate = todayDate.add(3, "day");

    const upcomingItems = selectedItems
      .filter((item) => {
        const due = dayjs(item.dueDate);

        return (
          due.isAfter(todayDate, "day") && due.isBefore(upcomingEndDate, "day")
        );
      })
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
      .slice(0, 6);
    const weekSummary = summarizeItems(weekItems);
    const monthSummary = summarizeItems(monthItems);

    content = (
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Today</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-950">
                What needs attention now
              </h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              {todayPriorityProgress.label}
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${todayPriorityProgress.percent}%` }}
            />
          </div>
        </div>
        {groups.map((group) => (
          <TodayChildCard key={group.child.id} {...group} />
        ))}

        <SummarySection
          title="Upcoming Work"
          subtitle="Next 2 days"
          items={upcomingItems}
          emptyText="No upcoming priorities in the next 2 days."
          showDates
        />

        <section className="grid gap-3 sm:grid-cols-2">
          <PlanSummaryCard title="This Week" summary={weekSummary} />
          <PlanSummaryCard title="This Month" summary={monthSummary} />
        </section>
      </section>
    );
  }

  if (mode === "week") {
    const groups = itemsByChild(children, weekItems).filter((group) =>
      activeChildIds.includes(group.child.id),
    );

    content = (
      <section className="space-y-3">
        <ProgressCard label="Weekly Progress" progress={weeklyProgress} />
        {groups.map((group) => (
          <div
            key={group.child.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-3 flex justify-end">
              <span className="text-sm font-medium text-slate-600">
                {group.progress.label}
              </span>
            </div>
            <WeekTaskBuckets items={group.items} />
          </div>
        ))}
      </section>
    );
  }

  if (mode === "month") {
    const childGroups = itemsByChild(children, monthItems).filter((group) =>
      activeChildIds.includes(group.child.id),
    );

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
          <div
            key={group.child.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-3 flex justify-end">
              <span className="text-sm font-medium text-slate-600">
                {group.progress.label}
              </span>
            </div>
            <div className="space-y-3">
              {monthItemsByWeek(group.items).map((week) => (
                <MonthWeekGroup
                  key={`${group.child.id}-${week.key}`}
                  week={week}
                />
              ))}
              {group.items.length === 0 ? (
                <ItemList items={[]} emptyText="No records this month." />
              ) : null}
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">
            {dayjs().format("dddd, DD MMMM YYYY")}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ChildFilter />
          <button
            type="button"
            aria-expanded={showQuickAdd}
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
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            To Do
          </h4>
          <span className="text-xs font-medium text-slate-500">
            {split.open.length} open
          </span>
        </div>
        <div className="space-y-3">
          {openDayGroups.map((dayGroup) => (
            <div
              key={dayGroup.date}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h5 className="text-sm font-semibold text-slate-800">
                  {dayjs(dayGroup.date).format("dddd, DD MMM")}
                </h5>
                <span className="text-xs font-medium text-slate-500">
                  {dayGroup.items.length} item
                  {dayGroup.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <CompactWeekItemList items={dayGroup.items} />
            </div>
          ))}
          {split.open.length === 0 ? (
            <ItemList items={[]} emptyText="No open tasks this week." />
          ) : null}
        </div>
      </div>
      {split.completed.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Completed
            </h4>
            <span className="text-xs font-medium text-emerald-700">
              {split.completed.length} done
            </span>
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
    .sort(
      (first, second) =>
        first.dueDate.localeCompare(second.dueDate) ||
        taskCategoryLabel(first.category).localeCompare(
          taskCategoryLabel(second.category),
        ),
    )
    .forEach((item) => {
      const dayItems = groups.get(item.dueDate) ?? [];
      dayItems.push(item);
      groups.set(item.dueDate, dayItems);
    });

  return Array.from(groups.entries()).map(([date, dayItems]) => ({
    date,
    items: dayItems,
  }));
}

function parentReadyItems(items: SchoolItem[]) {
  return items.filter((item) => {
    const title = item.title.trim();
    const normalizedTitle = title.toLowerCase();
    const embeddedFullDates =
      title.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g) ?? [];

    if (title.length < 3) {
      return false;
    }

    if (
      ["activity", "project", "home study", "class test", "unit test"].includes(
        normalizedTitle,
      )
    ) {
      return (
        Boolean(item.subject) &&
        ["class test", "unit test"].includes(normalizedTitle)
      );
    }

    if (/^[({[]/.test(title)) {
      return false;
    }

    if (title.length > 180 || embeddedFullDates.length > 1) {
      return false;
    }

    if (/^[.\s-]*\d{1,2}[./-]\d{1,2}/.test(title)) {
      return false;
    }

    if (/\bweek\s*\(|\bweek\s*\d+\b|\bs\s+th\s+th\b/i.test(title)) {
      return false;
    }

    return ![
      "all books and notebooks",
      "activities of the month",
      "school timing",
      "class timing",
      "summer vacation",
      "date day subject",
      "subject activities",
      "graded lab activity",
      "s.no",
    ].some((fragment) => normalizedTitle.includes(fragment));
  });
}

function uniqueItems(items: SchoolItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.childId,
      item.category,
      item.subject ?? "",
      item.title.trim().toLowerCase(),
      item.dueDate,
    ].join("|");
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function TodayChildCard({
  urgentItems,
  dueTodayItems,
  activityItems,
  tomorrowTests,
  progress,
}: {
  child: ChildProfile;
  urgentItems: SchoolItem[];
  dueTodayItems: SchoolItem[];
  activityItems: SchoolItem[];
  tomorrowTests: SchoolItem[];
  progress: ReturnType<typeof completionProgress>;
}) {
  const hasItems =
    urgentItems.length > 0 ||
    dueTodayItems.length > 0 ||
    activityItems.length > 0;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex justify-end">
        <span className="text-sm font-medium text-slate-600">
          {progress.label}
        </span>
      </div>

      {tomorrowTests.length > 0 ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-sm font-semibold text-amber-900">
            {tomorrowTests.length} test{tomorrowTests.length === 1 ? "" : "s"}{" "}
            tomorrow
          </p>
          <TodayTaskList items={tomorrowTests} />
        </div>
      ) : null}

      {hasItems ? (
        <div className="space-y-3">
          <TodayPrioritySection
            tone="urgent"
            title="Urgent"
            items={urgentItems}
            emptyText="No urgent work."
          />
          <TodayPrioritySection
            tone="today"
            title="Study work"
            items={dueTodayItems}
            emptyText="No study work today."
          />
          <TodayPrioritySection
            tone="activity"
            title="Activities"
            items={activityItems}
            emptyText="No activities today."
          />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
          Nothing due today.
        </p>
      )}
    </article>
  );
}

function TodayPrioritySection({
  tone,
  title,
  items,
  emptyText,
}: {
  tone: "urgent" | "today" | "activity";
  title: string;
  items: SchoolItem[];
  emptyText: string;
}) {
  const toneClass =
    tone === "urgent"
      ? "text-rose-700"
      : tone === "today"
        ? "text-amber-700"
        : "text-emerald-700";
  const visibleItems = items.slice(0, 5);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4
          className={`text-xs font-semibold uppercase tracking-wide ${toneClass}`}
        >
          {title}
        </h4>
        <span className="text-xs font-medium text-slate-500">
          {items.length}
        </span>
      </div>
      {items.length > 0 ? (
        <>
          <TodayTaskList items={visibleItems} />
          {hiddenCount > 0 ? (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {hiddenCount} more in Tasks
            </p>
          ) : null}
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function TodayTaskList({ items }: { items: SchoolItem[] }) {
  const toggleItemComplete = useAppStore((state) => state.toggleItemComplete);

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const isCompleted = item.status === "Completed";

        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={isCompleted}
              aria-label={`${isCompleted ? "Mark incomplete" : "Mark complete"}: ${item.title}`}
              onClick={() => toggleItemComplete(item.id)}
              className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-blue-200 hover:bg-blue-50/40"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
              >
                {isCompleted ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-medium ${isCompleted ? "text-emerald-900 line-through decoration-emerald-500" : "text-slate-900"}`}
                >
                {item.description ? (
                  <span className="mt-1 block whitespace-pre-line text-sm leading-5 text-slate-700">
                    {item.description}
                  </span>
                ) : null}
                </span>
                <span className="block text-xs text-slate-500">
                  {item.subject ? `${item.subject} • ` : ""}
                  {taskCategoryLabel(item.category)} •{" "}
                  {dayjs(item.dueDate).format("ddd, DD MMM")}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CompactWeekItemList({
  items,
  showDates = false,
}: {
  items: SchoolItem[];
  showDates?: boolean;
}) {
  const toggleItemComplete = useAppStore((state) => state.toggleItemComplete);

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {items.map((item) => {
        const isCompleted = item.status === "Completed";

        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={isCompleted}
              aria-label={`${isCompleted ? "Mark incomplete" : "Mark complete"}: ${item.title}`}
              onClick={() => toggleItemComplete(item.id)}
              className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-blue-50/50"
            >
              <span
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
              >
                {isCompleted ? "✓" : ""}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {taskCategoryLabel(item.category)}
                  </span>
                  {item.subject ? (
                    <span className="text-xs font-medium text-slate-500">
                      {item.subject}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`mt-1 text-sm font-medium ${isCompleted ? "text-emerald-900 line-through decoration-emerald-500" : "text-slate-900"}`}
                >
                  {item.title}
                </div>
                {item.description ? (
                  <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-700">
                    {item.description}
                  </p>
                ) : null}
                {showDates ? (
                  <p className="text-xs text-slate-500">
                    {dayjs(item.dueDate).format("ddd, DD MMM")}
                  </p>
                ) : null}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function summarizeItems(items: SchoolItem[]) {
  return {
    tasks: items.filter((item) => studyCategories.includes(item.category))
      .length,
    tests: items.filter((item) => testCategories.includes(item.category))
      .length,
    activities: items.filter((item) => item.category === "Activity").length,
  };
}

function PlanSummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: ReturnType<typeof summarizeItems>;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm text-slate-600">
        <p className="rounded-lg bg-slate-50 px-2 py-2">
          <span className="block text-lg font-bold text-slate-950">
            {summary.tasks}
          </span>
          Tasks
        </p>
        <p className="rounded-lg bg-slate-50 px-2 py-2">
          <span className="block text-lg font-bold text-slate-950">
            {summary.tests}
          </span>
          Tests
        </p>
        <p className="rounded-lg bg-slate-50 px-2 py-2">
          <span className="block text-lg font-bold text-slate-950">
            {summary.activities}
          </span>
          Activities
        </p>
      </div>
    </article>
  );
}

function SummarySection({
  title,
  subtitle,
  items,
  emptyText,
  showDates = false,
}: {
  title: string;
  subtitle?: string;
  items: SchoolItem[];
  emptyText: string;
  showDates?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle ? (
            <p className="text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <span className="text-xs font-medium text-slate-500">
          {items.length}
        </span>
      </div>
      {items.length > 0 ? (
        <CompactWeekItemList items={items} showDates={showDates} />
      ) : (
        <ItemList items={[]} emptyText={emptyText} />
      )}
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
          <h4 className="text-sm font-semibold text-slate-800">
            Week of {week.label}
          </h4>
          <p className="text-xs text-slate-500">
            {split.open.length} open • {split.completed.length} completed
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">
          {week.progress.label}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            To Do
          </h5>
          <ItemList items={split.open} emptyText="No open tasks this week." />
        </div>
        {split.completed.length > 0 ? (
          <div>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Completed
            </h5>
            <ItemList
              items={split.completed}
              emptyText="No completed tasks this week."
            />
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
  monthProgress: {
    completed: number;
    total: number;
    label: string;
    percent: number;
  };
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  const openWeekItems = splitOpenAndCompletedItems(weekItems).open;
  const todayTasks = openWeekItems.filter((item) => item.dueDate === today);
  const tomorrowTasks = openWeekItems.filter(
    (item) => item.dueDate === tomorrow,
  );
  const laterThisWeek = openWeekItems
    .filter((item) => item.dueDate !== today && item.dueDate !== tomorrow)
    .slice(0, 4);
  const tests = openWeekItems.filter((item) =>
    ["ClassTest", "UnitTest", "Exam"].includes(item.category),
  );
  const weekProgress = completionProgress(weekItems);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {child.name}
            </h3>
            <p className="text-sm text-slate-500">
              {weekProgress.label} this week
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          {monthProgress.label} this month
        </span>
      </div>

      <DashboardTaskSection
        title="Today"
        items={todayTasks}
        emptyText="Nothing due today."
      />
      <DashboardTaskSection
        title="Tomorrow"
        items={tomorrowTasks}
        emptyText="Nothing due tomorrow."
      />
      <DashboardTaskSection
        title="Later This Week"
        items={laterThisWeek}
        emptyText="No more tasks this week."
      />

      {tests.length > 0 ? (
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
          {tests.length} upcoming test{tests.length > 1 ? "s" : ""} this week
        </p>
      ) : null}
    </article>
  );
}

function DashboardTaskSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: SchoolItem[];
  emptyText: string;
}) {
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500">
                  {item.subject ? `${item.subject} • ` : ""}
                  {taskCategoryLabel(item.category)} •{" "}
                  {dayjs(item.dueDate).format("ddd, DD MMM")}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                {item.prepStatus === "InProgress"
                  ? "In Progress"
                  : item.status === "Completed"
                    ? "Done"
                    : "To Do"}
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

function ProgressCard({
  label,
  progress,
}: {
  label: string;
  progress: {
    completed: number;
    total: number;
    label: string;
    percent: number;
  };
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{progress.label}</p>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </article>
  );
}







