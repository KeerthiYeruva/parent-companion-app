import dayjs from "dayjs";
import { useMemo } from "react";
import { ItemList } from "@/components/item-list";
import { CheckIcon } from "@/components/ui/check-icon";
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
import { buildPlannerItemDisplay } from "@/features/planning/services/planner-item-display";
import {
  completionButtonLabel,
  isItemCompleted,
  isItemFutureLocked,
} from "@/features/planning/services/item-completion";
import type { ChildProfile, SchoolItem } from "@/types/domain";
import { useAppStore } from "@/store/use-app-store";
import Link, { usePathname } from "@/components/routing";
import { ChildSwitcher } from "@/features/children/components/child-switcher";

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

export function PlanningView({
  mode,
  showKidsTabs = false,
}: {
  mode: PlanningMode;
  showKidsTabs?: boolean;
}) {
  const pathname = usePathname();
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
    mode === "day"
      ? "Overview"
      : mode === "week"
        ? "Weekly Overview"
        : mode === "month"
          ? "Monthly Overview"
          : "Overview";

  let content = null;

  if (mode === "dashboard") {
    const familyOpen = splitOpenAndCompletedItems(weekItems).open.length;
    content = (
      <>
        <section className="planner-dashboard__metrics grid gap-3 md:grid-cols-3">
          <ProgressCard label="This Week" progress={weeklyProgress} />
          <ProgressCard label="This Month" progress={monthlyProgress} />
          <MetricCard label="Open This Week" value={familyOpen} />
        </section>

        <section className="planner-dashboard__children grid gap-3 xl:grid-cols-2">
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
    const todayDate = dayjs();
    const isWeekend = todayDate.day() === 0 || todayDate.day() === 6;

    const previousMonday = todayDate.subtract(
      todayDate.day() === 6 ? 5 : 6,
      "day",
    );

    const previousFriday = previousMonday.add(4, "day");

    const previousWeekCatchUpItems = isWeekend
      ? selectedItems
          .filter((item) => {
            const dueDate = dayjs(item.dueDate);

            const isPreviousSchoolWeek =
              !dueDate.isBefore(previousMonday, "day") &&
              !dueDate.isAfter(previousFriday, "day");

            const isIncomplete = item.status !== "Completed";

            const isSchoolWork =
              !testCategories.includes(item.category) &&
              item.category !== "Circular";

            return isPreviousSchoolWeek && isIncomplete && isSchoolWork;
          })
          .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
      : [];
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
    const todayItems = uniqueItems(
      groups.flatMap((group) => [
        ...group.urgentItems,
        ...group.dueTodayItems,
        ...group.activityItems,
      ]),
    );

    const todayPriorityProgress = completionProgress(todayItems);
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
      <section className="planner-today space-y-3">
        {isWeekend ? (
          <SummarySection
            title="Previous Week Catch-up"
            subtitle={`${previousMonday.format("DD MMM")} – ${previousFriday.format(
              "DD MMM",
            )}`}
            items={previousWeekCatchUpItems}
            emptyText="Great! No unfinished work from the previous week."
            showDates
          />
        ) : null}
        {todayItems.length > 0 ? (
          <div className="planner-today__priority-summary planner-progress-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="planner-progress-card__header flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="planner-progress-card__label text-sm font-medium text-slate-500">
                  Today
                </p>
              </div>

              <span className="planner-progress-card__status rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                {todayPriorityProgress.label}
              </span>
            </div>

            <div className="planner-progress-card__track mt-4 h-2 rounded-full bg-slate-100">
              <div
                className="planner-progress-card__bar h-2 rounded-full bg-emerald-500"
                style={{ width: `${todayPriorityProgress.percent}%` }}
              />
            </div>
          </div>
        ) : null}
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

        <section className="planner-today__summary-grid grid gap-3 sm:grid-cols-2">
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
      <section className="planner-week space-y-3">
        <ProgressCard label="Weekly Progress" progress={weeklyProgress} />
        {groups.map((group) => (
          <div
            key={group.child.id}
            className="planner-week__child-group rounded-xl border border-slate-200 bg-white p-4"
            data-child-id={group.child.id}
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
      <section className="planner-month space-y-3">
        <div className="planner-month__metrics grid gap-3 md:grid-cols-4">
          <ProgressCard label="Monthly Progress" progress={monthlyProgress} />
          <MetricCard label="Homework" value={monthly.homework} />
          <MetricCard label="Tests" value={monthly.tests} />
          <MetricCard label="Activities" value={monthly.activities} />
          <MetricCard label="Projects" value={monthly.projects} />
        </div>
        {childGroups.map((group) => (
          <div
            key={group.child.id}
            className="planner-month__child-group rounded-xl border border-slate-200 bg-white p-4"
            data-child-id={group.child.id}
          >
            <div className="mb-3 flex justify-end">
              <span className="text-sm font-medium text-slate-600">
                {group.progress.label}
              </span>
            </div>
            <div className="planner-month__week-list space-y-3">
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
      <section className={`planner-view planner-view--${mode} space-y-3`}>
        <div className="planner-view__header rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="planner-view__title text-xl font-semibold text-slate-900">
            {title}
          </h2>
          <p className="planner-view__date text-sm text-slate-600">
            {dayjs().format("dddd, DD MMMM YYYY")}
          </p>
        </div>

        <div className="planner-view__controls flex flex-wrap items-center justify-between gap-3">
          <ChildSwitcher />
        </div>
        {showKidsTabs ? (
          <nav className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap gap-2">
              {[
                { href: "/", label: "Today" },
                { href: "/week", label: "Week" },
                { href: "/month", label: "Month" },
              ].map((tab) => {
                const active = pathname === tab.href;

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
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
    <div className="planner-week__task-buckets space-y-4">
      <div className="planner-task-section planner-task-section--open">
        <div className="planner-task-section__header mb-2 flex items-center justify-between gap-3">
          <h4 className="planner-task-section__title text-xs font-semibold uppercase tracking-wide text-slate-500">
            To Do
          </h4>
          <span className="planner-task-section__count text-xs font-medium text-slate-500">
            {split.open.length} open
          </span>
        </div>
        <div className="planner-week__day-list space-y-3">
          {openDayGroups.map((dayGroup) => (
            <div
              key={dayGroup.date}
              className="planner-week-group rounded-lg border border-slate-100 bg-slate-50 p-3"
              data-due-date={dayGroup.date}
            >
              <div className="planner-week-group__header mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h5 className="planner-week-group__date text-sm font-semibold text-slate-800">
                  {dayjs(dayGroup.date).format("dddd, DD MMM")}
                </h5>
                <span className="planner-week-group__count text-xs font-medium text-slate-500">
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
        <div className="planner-task-section planner-task-section--completed">
          <div className="planner-task-section__header mb-2 flex items-center justify-between gap-3">
            <h4 className="planner-task-section__title text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Completed
            </h4>
            <span className="planner-task-section__count text-xs font-medium text-emerald-700">
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

function itemInspectAttributes(item: SchoolItem) {
  return {
    "data-item-id": item.id,
    "data-child-id": item.childId,
    "data-category": item.category,
    "data-subject": item.subject ?? "",
    "data-due-date": item.dueDate,
    "data-status": item.status,
  };
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
    <article className="planner-today__child-card rounded-xl border border-slate-200 bg-white p-4">
      <div className="planner-today__child-progress mb-4 flex justify-end">
        <span className="planner-item__status text-sm font-medium text-slate-600">
          {progress.label}
        </span>
      </div>

      {tomorrowTests.length > 0 ? (
        <div className="planner-today__tomorrow-tests mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="planner-today__alert-title text-sm font-semibold text-amber-900">
            {tomorrowTests.length} test{tomorrowTests.length === 1 ? "" : "s"}{" "}
            tomorrow
          </p>
          <TodayTaskList items={tomorrowTests} />
        </div>
      ) : null}

      {hasItems ? (
        <div className="planner-today__priority-sections space-y-3">
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
        <p className="planner-empty-state rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
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
    <section
      className={`planner-today__priority-section planner-today__priority-section--${tone}`}
    >
      <div className="planner-today__priority-header mb-2 flex items-center justify-between gap-2">
        <h4
          className={`planner-today__priority-title text-xs font-semibold uppercase tracking-wide ${toneClass}`}
        >
          {title}
        </h4>
        <span className="planner-today__priority-count text-xs font-medium text-slate-500">
          {items.length}
        </span>
      </div>
      {items.length > 0 ? (
        <>
          <TodayTaskList items={visibleItems} />
          {hiddenCount > 0 ? (
            <p className="planner-today__hidden-count mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {hiddenCount} more in Tasks
            </p>
          ) : null}
        </>
      ) : (
        <p className="planner-empty-state rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function TodayTaskList({ items }: { items: SchoolItem[] }) {
  const toggleItemComplete = useAppStore((state) => state.toggleItemComplete);

  return (
    <ul className="planner-item-list planner-item-list--today space-y-2">
      {items.map((item) => {
        const isCompleted = isItemCompleted(item);
        const isFutureLocked = isItemFutureLocked(item);
        const display = buildPlannerItemDisplay(item);

        return (
          <li
            key={item.id}
            className={`planner-item ${
              isCompleted ? "planner-item--completed" : "planner-item--open"
            } ${isFutureLocked ? "planner-item--future-locked" : ""}`}
            {...itemInspectAttributes(item)}
          >
            <button
              type="button"
              aria-pressed={isFutureLocked ? undefined : isCompleted}
              aria-label={completionButtonLabel(item)}
              disabled={isFutureLocked}
              onClick={() => {
                if (!isFutureLocked) {
                  toggleItemComplete(item.id);
                }
              }}
              className={`planner-item__button flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left ${
                isFutureLocked
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-75"
                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
              }`}
            >
              <span
                className={`planner-item__checkbox mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
              >
                {isCompleted ? <CheckIcon /> : null}
              </span>
              <span className="planner-item__content min-w-0">
                <span className="planner-item__header flex flex-wrap items-center gap-2">
                  <span className="planner-item__category rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {display.category}
                  </span>
                  {display.subject ? (
                    <span className="planner-item__subject text-xs font-medium text-slate-500">
                      {display.subject}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`planner-item__title mt-1 block text-sm font-medium ${isCompleted ? "text-emerald-900 line-through decoration-emerald-500" : "text-slate-900"}`}
                >
                  {display.heading}
                </span>
                {display.chapter ? (
                  <span className="planner-item__chapter mt-1 block whitespace-pre-line text-sm leading-5 text-slate-700">
                    {display.chapter}
                  </span>
                ) : null}
                {display.description ? (
                  <span className="planner-item__description mt-1 block whitespace-pre-line text-sm leading-5 text-slate-700">
                    {display.description}
                  </span>
                ) : null}
                <span className="planner-item__date block text-xs text-slate-500">
                  {display.date}
                </span>
                {isFutureLocked ? (
                  <span className="planner-item__helper mt-1 block text-xs text-slate-500">
                    Available on the due date
                  </span>
                ) : null}
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
    <ul className="planner-item-list planner-item-list--compact divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {items.map((item) => {
        const isCompleted = isItemCompleted(item);
        const isFutureLocked = isItemFutureLocked(item);
        const display = buildPlannerItemDisplay(item);

        return (
          <li
            key={item.id}
            className={`planner-item ${
              isCompleted ? "planner-item--completed" : "planner-item--open"
            } ${isFutureLocked ? "planner-item--future-locked" : ""}`}
            {...itemInspectAttributes(item)}
          >
            <button
              type="button"
              aria-pressed={isFutureLocked ? undefined : isCompleted}
              aria-label={completionButtonLabel(item)}
              disabled={isFutureLocked}
              onClick={() => {
                if (!isFutureLocked) {
                  toggleItemComplete(item.id);
                }
              }}
              className={`planner-item__button flex w-full items-start gap-3 px-3 py-2 text-left ${
                isFutureLocked
                  ? "cursor-not-allowed bg-slate-50 opacity-75"
                  : "hover:bg-blue-50/50"
              }`}
            >
              <span
                className={`planner-item__checkbox mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
              >
                {isCompleted ? <CheckIcon /> : null}
              </span>
              <div className="planner-item__content min-w-0">
                <div className="planner-item__header flex flex-wrap items-center gap-2">
                  <span className="planner-item__category rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {display.category}
                  </span>
                  {display.subject ? (
                    <span className="planner-item__subject text-xs font-medium text-slate-500">
                      {display.subject}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`planner-item__title mt-1 text-sm font-medium ${isCompleted ? "text-emerald-900 line-through decoration-emerald-500" : "text-slate-900"}`}
                >
                  {display.heading}
                </div>
                {display.chapter ? (
                  <p className="planner-item__chapter mt-1 whitespace-pre-line text-sm leading-5 text-slate-700">
                    {display.chapter}
                  </p>
                ) : null}
                {display.description ? (
                  <p className="planner-item__description mt-1 whitespace-pre-line text-sm leading-5 text-slate-700">
                    {display.description}
                  </p>
                ) : null}
                {showDates ? (
                  <p className="planner-item__date text-xs text-slate-500">
                    {display.date}
                  </p>
                ) : null}
                {isFutureLocked ? (
                  <p className="planner-item__helper mt-1 text-xs text-slate-500">
                    Available on the due date
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
    <article className="planner-summary-card rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="planner-summary-card__title font-semibold text-slate-900">
        {title}
      </h3>
      <div className="planner-summary-card__metrics mt-3 grid grid-cols-3 gap-2 text-center text-sm text-slate-600">
        <p className="planner-summary-card__metric rounded-lg bg-slate-50 px-2 py-2">
          <span className="planner-summary-card__value block text-lg font-bold text-slate-950">
            {summary.tasks}
          </span>
          Tasks
        </p>
        <p className="planner-summary-card__metric rounded-lg bg-slate-50 px-2 py-2">
          <span className="planner-summary-card__value block text-lg font-bold text-slate-950">
            {summary.tests}
          </span>
          Tests
        </p>
        <p className="planner-summary-card__metric rounded-lg bg-slate-50 px-2 py-2">
          <span className="planner-summary-card__value block text-lg font-bold text-slate-950">
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
    <section className="planner-summary-section rounded-xl border border-slate-200 bg-white p-4">
      <div className="planner-summary-section__header mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="planner-summary-section__title font-semibold text-slate-900">
            {title}
          </h3>
          {subtitle ? (
            <p className="planner-summary-section__subtitle text-sm text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className="planner-summary-section__count text-xs font-medium text-slate-500">
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
    <div className="planner-month-group rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="planner-month-group__header mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="planner-month-group__title text-sm font-semibold text-slate-800">
            Week of {week.label}
          </h4>
          <p className="planner-month-group__summary text-xs text-slate-500">
            {split.open.length} open • {split.completed.length} completed
          </p>
        </div>
        <span className="planner-month-group__progress rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">
          {week.progress.label}
        </span>
      </div>
      <div className="planner-month-group__sections space-y-3">
        <div className="planner-task-section planner-task-section--open">
          <h5 className="planner-task-section__title mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            To Do
          </h5>
          <ItemList items={split.open} emptyText="No open tasks this week." />
        </div>
        {split.completed.length > 0 ? (
          <div className="planner-task-section planner-task-section--completed">
            <h5 className="planner-task-section__title mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
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
    <article
      className="planner-dashboard__child-card rounded-xl border border-slate-200 bg-white p-4"
      data-child-id={child.id}
    >
      <div className="planner-dashboard__child-header mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="planner-dashboard__child-identity flex items-center gap-2">
          <span
            className={`planner-dashboard__child-color h-3 w-3 rounded-full ${child.colorTag}`}
          />
          <div>
            <h3 className="planner-dashboard__child-name text-lg font-semibold text-slate-900">
              {child.name}
            </h3>
            <p className="planner-dashboard__child-week-progress text-sm text-slate-500">
              {weekProgress.label} this week
            </p>
          </div>
        </div>
        <span className="planner-dashboard__child-month-progress rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
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
        <p className="planner-dashboard__test-count mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
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
    <div className="planner-dashboard__task-section mt-3">
      <div className="planner-dashboard__task-section-header mb-2 flex items-center justify-between gap-2">
        <h4 className="planner-dashboard__task-section-title text-sm font-semibold text-slate-800">
          {title}
        </h4>
        <span className="planner-dashboard__task-section-count text-xs text-slate-500">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="planner-empty-state rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ul className="planner-item-list planner-item-list--dashboard space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`planner-item ${
                item.status === "Completed"
                  ? "planner-item--completed"
                  : "planner-item--open"
              } flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2`}
              {...itemInspectAttributes(item)}
            >
              <div className="planner-item__content">
                <p className="planner-item__title text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                <p className="planner-item__metadata text-xs text-slate-500">
                  {item.subject ? `${item.subject} • ` : ""}
                  {taskCategoryLabel(item.category)} •{" "}
                  {dayjs(item.dueDate).format("ddd, DD MMM")}
                </p>
              </div>
              <span className="planner-item__status shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
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
    <article className="planner-metric-card rounded-xl border border-slate-200 bg-white p-4">
      <p className="planner-metric-card__label text-sm text-slate-600">
        {label}
      </p>
      <p className="planner-metric-card__value text-3xl font-bold text-slate-900">
        {value}
      </p>
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
    <article className="planner-progress-card rounded-xl border border-slate-200 bg-white p-4">
      <p className="planner-progress-card__label text-sm text-slate-600">
        {label}
      </p>
      <p className="planner-progress-card__value text-3xl font-bold text-slate-900">
        {progress.label}
      </p>
      <div className="planner-progress-card__track mt-3 h-2 rounded-full bg-slate-100">
        <div
          className="planner-progress-card__bar h-2 rounded-full bg-emerald-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </article>
  );
}
