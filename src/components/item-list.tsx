import dayjs from "dayjs";
import { taskCategoryLabel } from "@/features/planning/selectors/planning-selectors";
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
        const isCompleted = item.status === "Completed";
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={isCompleted}
              aria-label={`${isCompleted ? "Mark incomplete" : "Mark complete"}: ${item.title}`}
              onClick={() => toggleItemComplete(item.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${isCompleted ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                  isCompleted ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"
                }`}
              >
                {isCompleted ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className={`block font-medium ${isCompleted ? "text-emerald-950 line-through decoration-emerald-500" : "text-slate-900"}`}>{item.title}</span>
                <span className="block text-sm text-slate-600">
                  {item.subject ? `${item.subject} • ` : ""}
                  {taskCategoryLabel(item.category)} • {child?.name ?? "Unknown child"} • {dayjs(item.dueDate).format("ddd, DD MMM")}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
