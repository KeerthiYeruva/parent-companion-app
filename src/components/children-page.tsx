"use client";

import { AddChildForm } from "@/components/forms/add-child-form";
import { NavShell } from "@/components/nav-shell";
import { useAppStore } from "@/store/use-app-store";

export function ChildrenPage() {
  const children = useAppStore((state) => state.children);

  return (
    <NavShell>
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold">Child Profiles</h2>
          <p className="text-sm text-slate-600">Store name, grade, section, and academic year.</p>
        </div>

        <AddChildForm />

        <div className="grid gap-3 md:grid-cols-2">
          {children.map((child) => (
            <article key={child.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
                <h3 className="font-semibold">{child.name}</h3>
              </div>
              <p className="text-sm text-slate-600">Grade {child.grade} • Section {child.section}</p>
              <p className="text-sm text-slate-600">Academic Year: {child.academicYear}</p>
            </article>
          ))}
        </div>
      </section>
    </NavShell>
  );
}
