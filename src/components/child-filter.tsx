import { useEffect } from 'react';
import { useAppStore } from '@/store/use-app-store';

export function ChildFilter() {
  const children = useAppStore((state) => state.children);
  const selected = useAppStore((state) => state.selectedChildIds);
  const setSelected = useAppStore((state) => state.setSelectedChildIds);
  const activeChildId =
    selected.length === 1 && children.some((child) => child.id === selected[0])
      ? selected[0]
      : children[0]?.id;

  useEffect(() => {
    if (
      children.length > 0 &&
      activeChildId &&
      (selected.length !== 1 || selected[0] !== activeChildId)
    ) {
      setSelected([activeChildId]);
    }
  }, [activeChildId, children.length, selected, setSelected]);

  if (children.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Profile navigation"
      className="flex min-w-0 flex-1 flex-wrap gap-2 border-b border-slate-200"
    >
      <div role="tablist" aria-label="Choose profile" className="flex flex-wrap gap-1">
        {children.map((child) => {
          const isSelected = activeChildId === child.id;
          return (
            <button
              key={child.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelected([child.id])}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                isSelected
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {child.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
