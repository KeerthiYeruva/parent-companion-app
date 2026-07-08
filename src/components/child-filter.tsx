"use client";

import { useAppStore } from "@/store/use-app-store";

export function ChildFilter() {
  const children = useAppStore((state) => state.children);
  const selected = useAppStore((state) => state.selectedChildIds);
  const setSelected = useAppStore((state) => state.setSelectedChildIds);

  if (children.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-sm font-medium text-slate-700">Filter by child</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelected(children.map((child) => child.id))}
          className={`rounded-full border px-3 py-1 text-sm ${
            selected.length === children.length ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300"
          }`}
        >
          All
        </button>
        {children.map((child) => {
          const isSelected = selected.includes(child.id);
          return (
            <button
              key={child.id}
              type="button"
              onClick={() =>
                setSelected(
                  isSelected ? selected.filter((id) => id !== child.id) : [...selected, child.id],
                )
              }
              className={`rounded-full border px-3 py-1 text-sm ${
                isSelected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300"
              }`}
            >
              {child.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
