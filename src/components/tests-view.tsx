import { NavShell } from "@/components/nav-shell";
import { ItemList } from "@/components/item-list";
import { useAppStore } from "@/store/use-app-store";
import { ChildSwitcher } from "@/features/children/components/child-switcher";

const testCategories = ["ClassTest", "UnitTest", "Exam"];

export function TestsView() {
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);
  const selectedChildIds = useAppStore((state) => state.selectedChildIds);

  const selectedChildId = selectedChildIds[0] ?? children[0]?.id;

  const selectedChild = children.find((child) => child.id === selectedChildId);

  const selectedChildTests = items.filter(
    (item) =>
      item.childId === selectedChildId &&
      testCategories.includes(item.category),
  );

  return (
    <NavShell>
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">Tests</h2>

          <p className="text-sm text-slate-600">
            Upcoming class tests, unit tests, and exams for all children.
          </p>
        </div>

        <ChildSwitcher />

        {selectedChild ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="font-semibold text-slate-900">
                {selectedChild.name}
              </h3>

              <p className="text-sm text-slate-600">
                Grade {selectedChild.grade} • Section {selectedChild.section}
              </p>
            </div>

            <ItemList
              items={selectedChildTests}
              emptyText="No tests found for this child."
              showCategory
            />
          </section>
        ) : null}
      </section>
    </NavShell>
  );
}
