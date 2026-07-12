import { NavShell } from "@/components/nav-shell";
import { ItemList } from "@/components/item-list";
import { useAppStore } from "@/store/use-app-store";

const testCategories = ["ClassTest", "UnitTest", "Exam"];

export function TestsView() {
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);

  return (
    <NavShell>
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Tests
          </h2>

          <p className="text-sm text-slate-600">
            Upcoming class tests, unit tests, and exams for all children.
          </p>
        </div>

        {children.map((child) => {
          const childTests = items.filter(
            (item) =>
              item.childId === child.id &&
              testCategories.includes(item.category),
          );

          return (
            <section
              key={child.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${child.colorTag}`}
                />

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {child.name}
                  </h3>

                  <p className="text-sm text-slate-600">
                    Grade {child.grade} • Section {child.section}
                  </p>
                </div>
              </div>

              <ItemList
                items={childTests}
                emptyText="No tests found for this child."
                showCategory
              />
            </section>
          );
        })}
      </section>
    </NavShell>
  );
}