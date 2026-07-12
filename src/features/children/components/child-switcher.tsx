import { useEffect } from "react";
import { useAppStore } from "@/store/use-app-store";

export function ChildSwitcher() {
  const children = useAppStore((state) => state.children);

  const selectedChildIds = useAppStore(
    (state) => state.selectedChildIds,
  );

  const setSelectedChildIds = useAppStore(
    (state) => state.setSelectedChildIds,
  );

  const selectedChildId =
    selectedChildIds[0] ?? children[0]?.id;

  useEffect(() => {
    if (
      children.length > 0 &&
      selectedChildIds.length === 0
    ) {
      setSelectedChildIds([children[0].id]);
    }
  }, [
    children,
    selectedChildIds.length,
    setSelectedChildIds,
  ]);

  if (children.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {children.map((child) => {
        const active = child.id === selectedChildId;

        return (
          <button
            key={child.id}
            type="button"
            onClick={() =>
              setSelectedChildIds([child.id])
            }
            aria-pressed={active}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              active
                ? "bg-blue-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {child.name}
          </button>
        );
      })}
    </div>
  );
}