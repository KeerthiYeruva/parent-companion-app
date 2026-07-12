import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";
import { ChildSwitcher } from "@/features/children/components/child-switcher";
import { TestSection } from "@/features/planning/components/test-section";

export function TestsView() {
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);
  const selectedChildIds = useAppStore((state) => state.selectedChildIds);

  const selectedChildId = selectedChildIds[0] ?? children[0]?.id;

  const classTests = items
    .filter(
      (item) =>
        item.childId === selectedChildId && item.category === "ClassTest",
    )
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate));

  const unitTests = items
    .filter(
      (item) =>
        item.childId === selectedChildId && item.category === "UnitTest",
    )
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate));

  const exams = items
    .filter(
      (item) => item.childId === selectedChildId && item.category === "Exam",
    )
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate));

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

        <div className="grid gap-3">
          {classTests.length > 0 ? (
            <TestSection title="Class Tests" items={classTests} defaultOpen />
          ) : null}

          {unitTests.length > 0 ? (
            <TestSection title="Unit Tests" items={unitTests} />
          ) : null}

          {exams.length > 0 ? (
            <TestSection title="Exams" items={exams} />
          ) : null}
        </div>
      </section>
    </NavShell>
  );
}
