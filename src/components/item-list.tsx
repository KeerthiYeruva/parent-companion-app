import dayjs from "dayjs";
import { BookOpen, Lock } from "lucide-react";
import { CheckIcon } from "@/components/ui/check-icon";
import { SubjectIcon } from "@/components/ui/subject-icon";
import {
  completionButtonLabel,
  getItemTiming,
  isItemCompleted,
  isItemFutureLocked,
  itemTimingClasses,
  itemTimingLabel,
} from "@/features/planning/services/item-completion";
import { buildPlannerItemDisplay } from "@/features/planning/services/planner-item-display";
import { orderPlannerItems } from "@/features/planning/selectors/planning-selectors";
import type { SchoolItem } from "@/types/domain";
import { useAppStore } from "@/store/use-app-store";

type ItemListProps = {
  items: SchoolItem[];
  emptyText: string;
  showChild?: boolean;
  showCategory?: boolean;
};

export function ItemList({ items, emptyText }: ItemListProps) {
  const toggleItemComplete = useAppStore((state) => state.toggleItemComplete);

  if (items.length === 0) {
    return (
      <p className="item-list__empty rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        <BookOpen aria-hidden="true" className="mb-2 h-5 w-5 text-slate-400" />
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="item-list space-y-2">
      {orderPlannerItems(items).map((item) => {
        const isCompleted = isItemCompleted(item);
        const isFutureLocked = isItemFutureLocked(item);
        const timing = getItemTiming(item);
        const display = buildPlannerItemDisplay(item);
        const metadata = [dayjs(item.dueDate).format("ddd, DD MMM")].filter(
          Boolean,
        );

        return (
          <li
            key={item.id}
            className={`item-list__item planner-item ${
              isCompleted ? "planner-item--completed" : "planner-item--open"
            } ${isFutureLocked ? "planner-item--future-locked" : ""}`}
            data-item-id={item.id}
            data-child-id={item.childId}
            data-category={item.category}
            data-subject={item.subject ?? ""}
            data-due-date={item.dueDate}
            data-status={item.status}
          >
            <div
              className={`item-list__button planner-item__button flex w-full items-start gap-3 rounded-xl border p-3 text-left ${
                isFutureLocked
                  ? "cursor-not-allowed border-slate-200 bg-slate-50"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
              }`}
            >
              <button
                type="button"
                aria-pressed={isFutureLocked ? undefined : isCompleted}
                aria-label={completionButtonLabel(item)}
                disabled={isFutureLocked}
                onClick={() => toggleItemComplete(item.id)}
                className="planner-item__checkbox-target -m-2 flex min-h-11 min-w-11 shrink-0 items-start justify-center rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
              >
                <span
                  className={`item-list__checkbox planner-item__checkbox mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : isFutureLocked ? (
                    <Lock aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                  ) : null}
                </span>
              </button>

              <span className="item-list__content planner-item__content min-w-0 flex-1">
                <span className="planner-item__header flex flex-wrap items-center gap-2">
                  {display.subject ? (
                    <SubjectIcon
                      subject={display.subject}
                      className="h-4 w-4 text-slate-400"
                    />
                  ) : null}
                  <span className="planner-item__category text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {display.category}
                  </span>
                  {display.subject ? (
                    <span className="planner-item__subject text-sm font-medium text-slate-700">
                      {display.subject}
                    </span>
                  ) : null}
                  <span
                    className={`planner-item__status-badge rounded-full border px-2 py-0.5 text-xs font-medium ${itemTimingClasses(timing)}`}
                  >
                    {itemTimingLabel(item)}
                  </span>
                </span>
                <span
                  className={`item-list__title planner-item__title mt-1 block font-medium ${
                    isCompleted
                      ? "text-emerald-950 line-through decoration-emerald-500"
                      : "text-slate-900"
                  }`}
                >
                  {display.heading}
                </span>

                {display.chapter ? (
                  <span className="item-list__chapter planner-item__chapter mt-1 block whitespace-pre-line text-sm leading-5 text-slate-700">
                    {display.chapter}
                  </span>
                ) : null}

                {display.description ? (
                  <span className="item-list__description planner-item__description mt-1 block whitespace-pre-line text-sm leading-5 text-slate-700">
                    {display.description}
                  </span>
                ) : null}

                <span className="item-list__metadata planner-item__metadata mt-2 block text-sm text-slate-500">
                  {metadata.join(" - ")}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
