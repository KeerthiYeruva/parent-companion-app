"use client";

import dayjs from "dayjs";
import type { SchoolItem } from "@/types/domain";
import { useAppStore } from "@/store/use-app-store";

export function ItemList({ items, emptyText }: { items: SchoolItem[]; emptyText: string }) {
  const children = useAppStore((state) => state.children);
  const toggleItemComplete = useAppStore((state) => state.toggleItemComplete);

  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const child = children.find((entry) => entry.id === item.childId);
        return (
          <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-600">
                  {item.category} • {child?.name ?? "Unknown child"} • {dayjs(item.dueDate).format("DD MMM")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleItemComplete(item.id)}
                className={`rounded-lg px-3 py-1 text-sm ${
                  item.status === "Completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : item.status === "Overdue"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700"
                }`}
              >
                {item.status === "Completed" ? "Completed" : "Mark complete"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
