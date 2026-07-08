"use client";

import dayjs from "dayjs";
import { taskCategoryLabel } from "@/features/planning/selectors/planning-selectors";
import type { SchoolItem } from "@/types/domain";
import { useAppStore } from "@/store/use-app-store";

export function ItemList({ items, emptyText }: { items: SchoolItem[]; emptyText: string }) {
  const children = useAppStore((state) => state.children);
  const setItemPrepStatus = useAppStore((state) => state.setItemPrepStatus);

  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const child = children.find((entry) => entry.id === item.childId);
        const isCompleted = item.status === "Completed";
        const taskStatus = isCompleted ? "Ready" : (item.prepStatus ?? "NotStarted");
        const statusLabel = taskStatus === "Ready" ? "Completed" : taskStatus === "InProgress" ? "In Progress" : "Not Started";

        return (
          <li key={item.id} className={`rounded-xl border p-3 ${isCompleted ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className={`font-medium ${isCompleted ? "text-emerald-950 line-through decoration-emerald-500" : "text-slate-900"}`}>{item.title}</p>
                <p className="text-sm text-slate-600">
                  {item.subject ? `${item.subject} • ` : ""}
                  {taskCategoryLabel(item.category)} • {child?.name ?? "Unknown child"} • {dayjs(item.dueDate).format("ddd, DD MMM")}
                </p>
                <p className={`mt-1 text-xs font-medium ${isCompleted ? "text-emerald-700" : taskStatus === "InProgress" ? "text-amber-700" : "text-slate-500"}`}>{statusLabel}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                <StatusButton active={taskStatus === "NotStarted"} label="Not Started" onClick={() => setItemPrepStatus(item.id, "NotStarted")} />
                <StatusButton active={taskStatus === "InProgress"} label="In Progress" onClick={() => setItemPrepStatus(item.id, "InProgress")} />
                <StatusButton active={taskStatus === "Ready"} label="Completed" onClick={() => setItemPrepStatus(item.id, "Ready")} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatusButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
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
