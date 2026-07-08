"use client";

import dayjs from "dayjs";
import { ItemList } from "@/components/item-list";
import { ChildDetailLayout } from "@/features/children/components/child-detail-layout";
import { useAppStore } from "@/store/use-app-store";
import type { ItemCategory } from "@/types/domain";

export function ChildCategoryView({ childId, title, categories }: { childId: string; title: string; categories: ItemCategory[] }) {
  const items = useAppStore((state) =>
    state.items
      .filter((item) => item.childId === childId && categories.includes(item.category))
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
  );

  return (
    <ChildDetailLayout childId={childId} title={title}>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <ItemList items={items} emptyText={`No ${title.toLowerCase()} for this child.`} />
      </div>
    </ChildDetailLayout>
  );
}

export function ChildMonthView({ childId }: { childId: string }) {
  const items = useAppStore((state) =>
    state.items
      .filter((item) => item.childId === childId && dayjs(item.dueDate).isSame(dayjs(), "month"))
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
  );

  return (
    <ChildDetailLayout childId={childId} title="Month">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-lg font-semibold">This Month</h3>
        <ItemList items={items} emptyText="No items for this month." />
      </div>
    </ChildDetailLayout>
  );
}