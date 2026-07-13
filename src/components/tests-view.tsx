import { NavShell } from "@/components/nav-shell";
import { TestSection } from "@/features/planning/components/test-section";
import { groupTestsByChild } from "@/features/tests/services/test-groups";
import { useAppStore } from "@/store/use-app-store";

export function TestsView() {
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);
  const groups = groupTestsByChild(children, items);

  return (
    <NavShell>
      <section className="tests-page space-y-4">
        <div className="tests-page__header rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="tests-page__title text-xl font-semibold text-slate-900">
            Tests
          </h2>

          <p className="tests-page__subtitle text-sm text-slate-600">
            Class tests, unit tests, and exams by child.
          </p>
        </div>

        <div className="tests-page__children space-y-3">
          {groups.map((group) => {
            const total =
              group.classTests.length +
              group.unitTests.length +
              group.exams.length;

            if (total === 0) {
              return null;
            }

            return (
              <article
                key={group.child.id}
                className="tests-page__child rounded-xl border border-slate-200 bg-white p-4"
                data-child-id={group.child.id}
              >
                <div className="tests-page__child-header mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="tests-page__child-identity flex items-center gap-2">
                    <span
                      className={`tests-page__child-color h-3 w-3 rounded-full ${group.child.colorTag}`}
                    />
                    <div>
                      <h3 className="tests-page__child-name font-semibold text-slate-900">
                        {group.child.name}
                      </h3>
                      <p className="tests-page__child-meta text-sm text-slate-500">
                        Grade {group.child.grade}
                        {group.child.section ? ` - ${group.child.section}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="tests-page__child-count rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {total} item{total === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="tests-page__sections space-y-3">
                  {group.classTests.length > 0 ? (
                    <TestSection
                      title="Class Tests"
                      items={group.classTests}
                      defaultOpen
                    />
                  ) : null}

                  {group.unitTests.length > 0 ? (
                    <TestSection title="Unit Tests" items={group.unitTests} />
                  ) : null}

                  {group.exams.length > 0 ? (
                    <TestSection title="Exams" items={group.exams} />
                  ) : null}
                </div>
              </article>
            );
          })}
          {groups.every(
            (group) =>
              group.classTests.length === 0 &&
              group.unitTests.length === 0 &&
              group.exams.length === 0,
          ) ? (
            <p className="tests-page__empty rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              No class tests, unit tests, or exams yet.
            </p>
          ) : null}
        </div>
      </section>
    </NavShell>
  );
}
