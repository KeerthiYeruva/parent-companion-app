import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  BellRing,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FolderKanban,
  Lock,
  Palette,
  Sun,
} from "lucide-react";
import { ItemList } from "@/components/item-list";
import { CheckIcon } from "@/components/ui/check-icon";
import { SubjectIcon } from "@/components/ui/subject-icon";
import { NavShell } from "@/components/nav-shell";
import {
  bySelectedChildren,
  completionProgress,
  itemsByChild,
  monthlyCounts,
  monthItemsByWeek,
  orderPlannerItems,
  schoolWeekRange,
  splitOpenAndCompletedItems,
  taskCategoryLabel,
  todayPlannerSections,
  testsDueTomorrow,
  thisWeekItems,
  itemsForMonth,
} from "@/features/planning/selectors/planning-selectors";
import { buildPlannerItemDisplay } from "@/features/planning/services/planner-item-display";
import {
  completionButtonLabel,
  getItemTiming,
  isItemCompleted,
  isItemFutureLocked,
  itemTimingClasses,
  itemTimingLabel,
} from "@/features/planning/services/item-completion";
import type { ChildProfile, SchoolItem } from "@/types/domain";
import { useAppStore } from "@/store/use-app-store";
import Link, { usePathname } from "@/components/routing";
import { ChildSwitcher } from "@/features/children/components/child-switcher";

export type PlanningMode = "dashboard" | "day" | "week" | "month";

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
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().startOf("month"));

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
    () => itemsForMonth(selectedItems, selectedMonth),
    [selectedItems, selectedMonth],
  );
  const weeklyProgress = useMemo(
    () => completionProgress(weekItems),
    [weekItems],
  );
  const monthlyProgress = useMemo(
    () => completionProgress(monthItems),
    [monthItems],
  );
  const monthly = useMemo(() => monthlyCounts(monthItems), [monthItems]);
  const weekRange = schoolWeekRange();
  const currentWeekRange = schoolWeekRange();

  const title =
    mode === "day"
      ? "Today's Overview"
      : mode === "week"
        ? "Weekly Overview"
        : mode === "month"
          ? "Monthly Overview"
          : "Overview";
  const periodLabel =
    mode === "week"
      ? `${weekRange.start.format("DD MMM")} - ${weekRange.end.format("DD MMM YYYY")}`
      : mode === "month"
        ? selectedMonth.format("MMMM YYYY")
        : dayjs().format("dddd, DD MMMM YYYY");

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
    const todayDate = dayjs();
    const sections = todayPlannerSections(selectedItems, todayDate);
    const tomorrowTests = testsDueTomorrow(selectedItems, todayDate);
    const todayProgress = completionProgress(sections.progressItems);
    const hasAnyTodayContent =
      sections.overdue.length > 0 ||
      sections.dueToday.length > 0 ||
      sections.upcoming.length > 0 ||
      sections.completed.length > 0;

    content = (
      <section className="planner-today space-y-3">
        <ProgressCard label="Today Progress" progress={todayProgress} />
        {tomorrowTests.length > 0 ? (
          <TomorrowTestAlert items={tomorrowTests} />
        ) : null}
        {sections.overdue.length > 0 ? (
          <PlannerSection
            title="Overdue"
            tone="overdue"
            items={sections.overdue}
          />
        ) : null}
        {sections.dueToday.length > 0 ? (
          <PlannerSection
            title="Due Today"
            tone="today"
            items={sections.dueToday}
          />
        ) : null}
        {sections.upcoming.length > 0 ? (
          <PlannerSection
            title="Upcoming Work"
            subtitle="Next 2 days"
            tone="upcoming"
            items={sections.upcoming}
            futureNote
            showDates
          />
        ) : null}
        {sections.completed.length > 0 ? (
          <PlannerSection
            title="Completed"
            tone="completed"
            items={sections.completed}
          />
        ) : null}
        {!hasAnyTodayContent ? (
          <ItemList items={[]} emptyText="All clear for today." />
        ) : null}
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
    const previousMonth = () =>
      setSelectedMonth((month) => month.subtract(1, "month").startOf("month"));
    const nextMonth = () =>
      setSelectedMonth((month) => month.add(1, "month").startOf("month"));
    const thisMonth = () => setSelectedMonth(dayjs().startOf("month"));

    content = (
      <section className="planner-month space-y-3">
        <div className="planner-month__nav flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <p className="planner-month__nav-label text-xs font-semibold uppercase tracking-wide text-slate-500">
              Month
            </p>
            <p className="planner-month__nav-title text-base font-semibold text-slate-900">
              {selectedMonth.format("MMMM YYYY")}
            </p>
          </div>
          <div className="planner-month__nav-actions flex items-center gap-2">
            <button
              type="button"
              onClick={previousMonth}
              aria-label="Previous month"
              className="planner-month__nav-button inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={thisMonth}
              className="planner-month__today-button min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              This month
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="planner-month__nav-button inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="planner-month__metrics grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ProgressCard label="Monthly Progress" progress={monthlyProgress} />
          <MonthMetricCard icon={BookOpen} label="Homework" value={monthly.homework} />
          <MonthMetricCard icon={ClipboardCheck} label="Tests" value={monthly.tests} />
          <MonthMetricCard icon={Palette} label="Activities" value={monthly.activities} />
          <MonthMetricCard icon={FolderKanban} label="Projects" value={monthly.projects} />
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
              {monthItemsByWeek(group.items, selectedMonth).map((week) => (
                <MonthWeekGroup
                  key={`${group.child.id}-${week.key}`}
                  week={week}
                  defaultOpen={week.key.startsWith(
                    currentWeekRange.start.format("YYYY-MM-DD"),
                  )}
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
            {periodLabel}
          </p>
        </div>

        <div className="planner-view__controls flex flex-wrap items-center justify-between gap-3">
          <ChildSwitcher />
        </div>
        {showKidsTabs ? (
          <nav className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap gap-2">
              {[
                { href: "/", label: "Today", icon: Sun },
                { href: "/week", label: "Week", icon: CalendarDays },
                { href: "/month", label: "Month", icon: CalendarRange },
              ].map((tab) => {
                const active = pathname === tab.href;

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium sm:flex-none ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <tab.icon aria-hidden="true" className="h-4 w-4" />
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

function PlannerSection({
  title,
  subtitle,
  tone,
  items,
  futureNote = false,
  showDates = false,
}: {
  title: string;
  subtitle?: string;
  tone: "overdue" | "today" | "upcoming" | "completed";
  items: SchoolItem[];
  futureNote?: boolean;
  showDates?: boolean;
}) {
  const toneClass =
    tone === "overdue"
      ? "text-rose-700"
      : tone === "completed"
        ? "text-emerald-700"
        : tone === "today"
          ? "text-amber-700"
          : "text-blue-700";

  return (
    <section className={`planner-task-section planner-task-section--${tone}`}>
      <div className="planner-task-section__header mb-2 flex items-start justify-between gap-3">
        <div>
          <h3
            className={`planner-task-section__title text-xs font-semibold uppercase tracking-wide ${toneClass}`}
          >
            {title}
          </h3>
          {subtitle ? (
            <p className="planner-task-section__subtitle text-xs text-slate-500">
              {subtitle}
            </p>
          ) : null}
          {futureNote ? (
            <p className="planner-task-section__note mt-1 text-xs text-slate-500">
              Future work can be checked on its due date.
            </p>
          ) : null}
        </div>
        <span className={`planner-task-section__count text-xs font-medium ${toneClass}`}>
          {items.length} {tone === "completed" ? "done" : "open"}
        </span>
      </div>
      <CompactWeekItemList items={items} showDates={showDates} />
    </section>
  );
}

export function TomorrowTestAlert({ items }: { items: SchoolItem[] }) {
  const visibleItems = items.slice(0, 3);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <section
      className="planner-tomorrow-test-alert rounded-xl border border-amber-200 bg-amber-50 p-4"
      aria-labelledby="planner-tomorrow-test-alert-title"
    >
      <div className="flex items-start gap-3">
        <span className="planner-tomorrow-test-alert__icon mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <BellRing aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="planner-tomorrow-test-alert-title"
            className="planner-tomorrow-test-alert__title text-xs font-semibold uppercase tracking-wide text-amber-900"
          >
            {items.length === 1 ? "Test Tomorrow" : `${items.length} Tests Tomorrow`}
          </h3>
          <ul className="planner-tomorrow-test-alert__items mt-2 space-y-1">
            {visibleItems.map((item) => {
              const display = buildPlannerItemDisplay(item);
              const summary = [
                display.subject,
                display.heading,
                display.chapter,
              ]
                .filter(Boolean)
                .join(" - ");

              return (
                <li
                  key={item.id}
                  className="planner-tomorrow-test-alert__item text-sm font-medium text-amber-950"
                  data-item-id={item.id}
                  data-category={item.category}
                  data-subject={item.subject ?? ""}
                >
                  {summary || item.title}
                </li>
              );
            })}
          </ul>
          {hiddenCount > 0 ? (
            <p className="planner-tomorrow-test-alert__more mt-1 text-sm font-medium text-amber-900">
              +{hiddenCount} more
            </p>
          ) : null}
          <p className="planner-tomorrow-test-alert__date mt-2 text-xs font-medium text-amber-800">
            Tomorrow
          </p>
        </div>
      </div>
    </section>
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
      {orderPlannerItems(items).map((item) => {
        const isCompleted = isItemCompleted(item);
        const isFutureLocked = isItemFutureLocked(item);
        const timing = getItemTiming(item);
        const display = buildPlannerItemDisplay(item);

        return (
          <li
            key={item.id}
            className={`planner-item ${
              isCompleted ? "planner-item--completed" : "planner-item--open"
            } ${isFutureLocked ? "planner-item--future-locked" : ""}`}
            {...itemInspectAttributes(item)}
          >
            <div
              className={`planner-item__button flex w-full items-start gap-3 px-3 py-2 text-left ${
                isFutureLocked
                  ? "cursor-not-allowed bg-slate-50"
                  : "hover:bg-blue-50/50"
              }`}
            >
              <button
                type="button"
                aria-pressed={isFutureLocked ? undefined : isCompleted}
                aria-label={completionButtonLabel(item)}
                disabled={isFutureLocked}
                onClick={() => toggleItemComplete(item.id)}
                className="planner-item__checkbox-target -m-2 flex min-h-11 min-w-11 shrink-0 items-start justify-center rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
              >
                <span
                  className={`planner-item__checkbox mt-1 flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : isFutureLocked ? (
                    <Lock aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                  ) : null}
                </span>
              </button>
              <div className="planner-item__content min-w-0">
                <div className="planner-item__header flex flex-wrap items-center gap-2">
                  {display.subject ? (
                    <SubjectIcon subject={display.subject} className="h-4 w-4 text-slate-400" />
                  ) : null}
                  <span className="planner-item__category text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {display.category}
                  </span>
                  {display.subject ? (
                    <span className="planner-item__subject text-xs font-medium text-slate-500">
                      {display.subject}
                    </span>
                  ) : null}
                  <span className={`planner-item__status-badge rounded-full border px-2 py-0.5 text-xs font-medium ${itemTimingClasses(timing)}`}>
                    {itemTimingLabel(item)}
                  </span>
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
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
function MonthWeekGroup({
  week,
  defaultOpen = false,
}: {
  week: ReturnType<typeof monthItemsByWeek>[number];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showCompleted, setShowCompleted] = useState(false);
  const split = splitOpenAndCompletedItems(week.items);

  return (
    <div className="planner-month-group rounded-lg border border-slate-100 bg-slate-50 p-3">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="planner-month-group__header flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <span>
          <h4 className="planner-month-group__title text-sm font-semibold text-slate-800">
            Week of {week.label}
          </h4>
          <p className="planner-month-group__summary text-xs text-slate-500">
            {split.open.length} open - {split.completed.length} completed
          </p>
        </span>
        <span className="planner-month-group__actions flex items-center gap-2">
          <span className="planner-month-group__progress rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">
            {week.progress.label}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 text-slate-500 transition ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>
      {isOpen ? (
        <div className="planner-month-group__sections mt-3 space-y-3">
          <div className="planner-task-section planner-task-section--open">
            <h5 className="planner-task-section__title mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              To Do
            </h5>
            <ItemList items={split.open} emptyText="No open tasks this week." />
          </div>
          {split.completed.length > 0 ? (
            <div className="planner-task-section planner-task-section--completed">
              <button
                type="button"
                onClick={() => setShowCompleted((visible) => !visible)}
                aria-expanded={showCompleted}
                className="planner-task-section__toggle mb-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-xs font-semibold uppercase tracking-wide text-emerald-700"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition ${
                    showCompleted ? "rotate-180" : ""
                  }`}
                />
                Completed ({split.completed.length})
              </button>
              {showCompleted ? (
                <ItemList
                  items={split.completed}
                  emptyText="No completed tasks this week."
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
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
                  {item.subject ? `${item.subject} - ` : ""}
                  {taskCategoryLabel(item.category)} -{" "}
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

function MonthMetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <article className="planner-month-metric rounded-xl border border-slate-200 bg-white p-4">
      <div className="planner-month-metric__header flex items-center gap-2 text-sm text-slate-600">
        <Icon aria-hidden="true" className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="planner-month-metric__value mt-2 text-3xl font-bold text-slate-900">
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


