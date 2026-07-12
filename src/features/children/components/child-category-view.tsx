import dayjs from "dayjs";
import { useMemo } from "react";
import { ItemList } from "@/components/item-list";
import { ChildDetailLayout } from "@/features/children/components/child-detail-layout";
import { completionProgress, monthItemsByWeek, splitOpenAndCompletedItems } from "@/features/planning/selectors/planning-selectors";
import { useAppStore } from "@/store/use-app-store";
import type { ItemCategory, SchoolItem } from "@/types/domain";

export function ChildCategoryView({ childId, title, categories }: { childId: string; title: string; categories: ItemCategory[] }) {
  const allItems = useAppStore((state) => state.items);
  const items = useMemo(
    () =>
      allItems
        .filter((item) => item.childId === childId && categories.includes(item.category))
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
    [allItems, categories, childId],
  );

  return (
    <ChildDetailLayout childId={childId} title={title}>
      <div className="child-category-view rounded-xl border border-slate-200 bg-white p-4" data-child-id={childId}>
        <div className="child-category-view__header mb-3 flex items-center justify-between gap-3">
          <h3 className="child-category-view__title text-lg font-semibold">{title}</h3>
          <span className="child-category-view__progress text-sm font-medium text-slate-600">{completionProgress(items).label}</span>
        </div>
        <TaskSplitList items={items} emptyText={`No ${title.toLowerCase()} for this child.`} />
      </div>
    </ChildDetailLayout>
  );
}

export function ChildMonthView({ childId }: { childId: string }) {
  const allItems = useAppStore((state) => state.items);
  const items = useMemo(
    () =>
      allItems
        .filter((item) => item.childId === childId && dayjs(item.dueDate).isSame(dayjs(), "month"))
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
    [allItems, childId],
  );

  return (
    <ChildDetailLayout childId={childId} title="Month">
      <section className="child-month-view space-y-3" data-child-id={childId}>
        <div className="child-month-view__panel rounded-xl border border-slate-200 bg-white p-4">
          <div className="child-month-view__header mb-3 flex items-center justify-between gap-3">
            <h3 className="child-month-view__title text-lg font-semibold">This Month</h3>
            <span className="child-month-view__progress text-sm font-medium text-slate-600">{completionProgress(items).label}</span>
          </div>
          <div className="child-month-view__weeks space-y-3">
            {monthItemsByWeek(items).map((week) => (
              <div key={week.key} className="child-month-view__week rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="child-month-view__week-header mb-3 flex items-center justify-between gap-3">
                  <h4 className="child-month-view__week-title text-sm font-semibold text-slate-800">Week of {week.label}</h4>
                  <span className="child-month-view__week-progress rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{week.progress.label}</span>
                </div>
                <TaskSplitList items={week.items} emptyText="No tasks this week." />
              </div>
            ))}
            {items.length === 0 ? <ItemList items={[]} emptyText="No items for this month." showChild={false} showCategory={false} /> : null}
          </div>
        </div>
      </section>
    </ChildDetailLayout>
  );
}

function TaskSplitList({ items, emptyText }: { items: SchoolItem[]; emptyText: string }) {
  const split = splitOpenAndCompletedItems(items);

  if (items.length === 0) {
    return <ItemList items={[]} emptyText={emptyText} showChild={false} showCategory={false} />;
  }

  return (
    <div className="child-task-list space-y-3">
      <div className="child-task-section child-task-list__open">
        <h4 className="child-task-section__title mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">To Do</h4>
        <ItemList items={split.open} emptyText="No open tasks." showChild={false} showCategory={false} />
      </div>
      {split.completed.length > 0 ? (
        <div className="child-task-section child-task-list__completed">
          <h4 className="child-task-section__title mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</h4>
          <ItemList items={split.completed} emptyText="No completed tasks." showChild={false} showCategory={false} />
        </div>
      ) : null}
    </div>
  );
}

