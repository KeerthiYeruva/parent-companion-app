import { useMemo } from "react";
import { ItemList } from "@/components/item-list";
import { ChildDetailLayout } from "@/features/children/components/child-detail-layout";
import { completionProgress, thisMonthItems, thisWeekItems } from "@/features/planning/selectors/planning-selectors";
import { useAppStore } from "@/store/use-app-store";

export function ChildOverviewView({ childId }: { childId: string }) {
  const allItems = useAppStore((state) => state.items);
  const items = useMemo(() => allItems.filter((item) => item.childId === childId), [allItems, childId]);
  const weekItems = thisWeekItems(items);
  const monthItems = thisMonthItems(items);
  const openWeekItems = weekItems.filter((item) => item.status !== "Completed");
  const upcomingTests = weekItems.filter((item) => ["ClassTest", "UnitTest", "Exam"].includes(item.category) && item.status !== "Completed");
  const weekProgress = completionProgress(weekItems);
  const monthProgress = completionProgress(monthItems);

  return (
    <ChildDetailLayout childId={childId} title="Overview">
      <div className="grid gap-3 md:grid-cols-2">
        <ChildProgressCard label="This Week" value={weekProgress.label} percent={weekProgress.percent} />
        <ChildProgressCard label="This Month" value={monthProgress.label} percent={monthProgress.percent} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">This Week To Do</h3>
          <ItemList items={openWeekItems} emptyText="No open tasks this week." />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">Upcoming Tests</h3>
          <ItemList items={upcomingTests} emptyText="No upcoming tests for this child." />
        </div>
      </div>
    </ChildDetailLayout>
  );
}

function ChildProgressCard({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
      </div>
    </article>
  );
}