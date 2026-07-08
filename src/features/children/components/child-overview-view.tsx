"use client";

import { ItemList } from "@/components/item-list";
import { ChildDetailLayout } from "@/features/children/components/child-detail-layout";
import { useAppStore } from "@/store/use-app-store";

export function ChildOverviewView({ childId }: { childId: string }) {
  const items = useAppStore((state) => state.items.filter((item) => item.childId === childId));
  const today = items.filter((item) => item.status !== "Completed").slice(0, 5);
  const upcomingTests = items.filter((item) => ["ClassTest", "UnitTest", "Exam"].includes(item.category)).slice(0, 5);

  return (
    <ChildDetailLayout childId={childId} title="Overview">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">Current Tasks</h3>
          <ItemList items={today} emptyText="No tasks for this child yet." />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-semibold">Upcoming Tests</h3>
          <ItemList items={upcomingTests} emptyText="No upcoming tests for this child." />
        </div>
      </div>
    </ChildDetailLayout>
  );
}