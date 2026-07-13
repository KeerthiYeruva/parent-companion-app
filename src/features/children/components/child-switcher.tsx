import { useEffect } from "react";
import { useAppStore } from "@/store/use-app-store";

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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
    <div className="child-switcher flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
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
            className={`child-switcher__option flex min-h-14 min-w-[9rem] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
              active
                ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
            }`}
          >
            <span
              className={`child-switcher__avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active ? "bg-blue-600 text-white" : `${child.colorTag} text-white`
              }`}
              aria-hidden="true"
            >
              {initialsFor(child.name)}
            </span>
            <span className="child-switcher__text min-w-0">
              <span className="child-switcher__name block truncate font-semibold">
                {child.name}
              </span>
              <span className="child-switcher__grade block text-xs text-slate-500">
                Grade {child.grade}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
