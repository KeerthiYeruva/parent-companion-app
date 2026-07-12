import { useState } from "react";
import { ItemList } from "@/components/item-list";
import type { SchoolItem } from "@/types/domain";

type TestSectionProps = {
  title: string;
  items: SchoolItem[];
  defaultOpen?: boolean;
};

export function TestSection({
  title,
  items,
  defaultOpen = false,
}: TestSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>

          <p className="text-sm text-slate-500">
            {items.length} {items.length === 1 ? "test" : "tests"}
          </p>
        </div>

        <span className="text-lg text-slate-500">
          {isOpen ? "⌃" : "⌄"}
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-100 p-4">
          <ItemList items={items} emptyText="No tests" />
        </div>
      ) : null}
    </section>
  );
}