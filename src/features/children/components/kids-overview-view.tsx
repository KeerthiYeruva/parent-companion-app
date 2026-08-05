import { useState } from 'react';
import { AddChildForm } from '@/components/forms/add-child-form';
import { NavShell } from '@/components/nav-shell';
import { LinkButton, OutlineButton } from '@/components/ui/button';
import { ArticleCard, HeaderCard } from '@/components/ui/card';
import {
  childSummary,
  completionProgress,
  thisMonthItems,
  thisWeekItems,
} from '@/features/planning/selectors/planning-selectors';
import { useAppStore } from '@/store/use-app-store';

export function KidsOverviewView() {
  const [showAddChild, setShowAddChild] = useState(false);
  const children = useAppStore((state) => state.children);
  const items = useAppStore((state) => state.items);

  return (
    <NavShell>
      <section className="space-y-3">
        <HeaderCard
          title="Kids"
          subtitle="See each child's weekly and monthly growth from uploaded school documents."
          actions={
            <OutlineButton
              aria-expanded={showAddChild}
              onClick={() => setShowAddChild((value) => !value)}
            >
              {showAddChild ? 'Hide Add Child' : 'Add Child'}
            </OutlineButton>
          }
        />

        {showAddChild ? <AddChildForm /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {children.map((child) => {
            const childItems = items.filter((item) => item.childId === child.id);
            const summary = childSummary(child, items);
            const weekProgress = completionProgress(thisWeekItems(childItems));
            const monthProgress = completionProgress(thisMonthItems(childItems));

            return (
              <ArticleCard key={child.id} className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
                      <h3 className="font-semibold text-slate-900">{child.name}</h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      Grade {child.grade} • Section {child.section}
                    </p>
                  </div>
                  <LinkButton href={`/kids/${encodeURIComponent(child.id)}`}>Open</LinkButton>
                </div>

                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <p>{summary.pendingTasks} to do</p>
                  <p>{summary.upcomingTests} upcoming tests</p>
                  <p>{weekProgress.label} this week</p>
                  <p>{monthProgress.label} this month</p>
                </div>
              </ArticleCard>
            );
          })}
        </div>
      </section>
    </NavShell>
  );
}
