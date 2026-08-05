import type { ReactNode } from 'react';
import Link, { usePathname } from '@/components/routing';
import { NavShell } from '@/components/nav-shell';
import { LinkButton } from '@/components/ui/button';
import { ArticleCard, PanelCard } from '@/components/ui/card';
import {
  childSummary,
  completionProgress,
  thisMonthItems,
  thisWeekItems,
} from '@/features/planning/selectors/planning-selectors';
import { useAppStore } from '@/store/use-app-store';

const buildLinks = (childId: string) => [
  { href: `/kids/${encodeURIComponent(childId)}`, label: 'Overview' },
  { href: `/kids/${encodeURIComponent(childId)}/month`, label: 'Month' },
  { href: `/kids/${encodeURIComponent(childId)}/tests`, label: 'Tests' },
  { href: `/kids/${encodeURIComponent(childId)}/homework`, label: 'Homework' },
];

export function ChildDetailLayout({
  childId,
  title,
  children,
}: {
  childId: string;
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const child = useAppStore((state) => state.children.find((entry) => entry.id === childId));
  const items = useAppStore((state) => state.items);

  if (!child) {
    return (
      <NavShell>
        <PanelCard>
          <h2 className="text-xl font-semibold text-slate-900">Loading child profile</h2>
          <p className="text-sm text-slate-600">
            If this profile is not available, open Kids and choose a child.
          </p>
          <LinkButton href="/kids" className="mt-3 bg-blue-600 hover:bg-blue-700">
            Open Kids
          </LinkButton>
        </PanelCard>
      </NavShell>
    );
  }

  const childItems = items.filter((item) => item.childId === child.id);
  const summary = childSummary(child, items);
  const weekProgress = completionProgress(thisWeekItems(childItems));
  const monthProgress = completionProgress(thisMonthItems(childItems));
  const links = buildLinks(child.id);

  return (
    <NavShell>
      <section className="space-y-3">
        <ArticleCard className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${child.colorTag}`} />
            <h2 className="text-xl font-semibold text-slate-900">{child.name}</h2>
          </div>
          <p className="text-sm text-slate-600">
            {title} • Grade {child.grade} • Section {child.section}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-4">
            <p>{summary.pendingTasks} to do</p>
            <p>{summary.upcomingTests} upcoming tests</p>
            <p>{weekProgress.label} this week</p>
            <p>{monthProgress.label} this month</p>
          </div>
        </ArticleCard>

        <PanelCard className="p-3">
          <div className="flex flex-wrap gap-2">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-blue-50 font-medium text-blue-700' : 'bg-slate-50 text-slate-700'}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </PanelCard>

        {children}
      </section>
    </NavShell>
  );
}
