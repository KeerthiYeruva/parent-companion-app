import { useState } from "react";
import { ItemList } from "@/components/item-list";
import { ChevronIcon } from "@/components/ui/chevron-icon";
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
    <section className="test-section overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="test-section__toggle flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <h3 className="test-section__title font-semibold text-slate-900">
            {title}
          </h3>

          <p className="test-section__count text-sm text-slate-500">
            {items.length} {items.length === 1 ? "test" : "tests"}
          </p>
        </div>

        <span className="test-section__chevron text-slate-500">
          <ChevronIcon direction={isOpen ? "up" : "down"} />
        </span>
      </button>

      {isOpen ? (
        <div className="test-section__content border-t border-slate-100 p-4">
          <ItemList items={items} emptyText="No tests" />
        </div>
      ) : null}
    </section>
  );
}
