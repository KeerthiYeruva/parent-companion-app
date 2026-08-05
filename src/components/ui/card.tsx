import type { HTMLAttributes, ReactNode } from 'react';

type ClassValue = string | undefined;

const joinClasses = (...classValues: ClassValue[]) => classValues.filter(Boolean).join(' ');

type HeaderCardProps = {
  title: string;
  subtitle: ReactNode;
  className?: string;
  actions?: ReactNode;
};

export function HeaderCard({ title, subtitle, className, actions }: HeaderCardProps) {
  return (
    <div className={joinClasses('pc-header-card', className)}>
      <div className={actions ? 'flex flex-wrap items-start justify-between gap-3' : undefined}>
        <div>
          <h2 className="pc-header-title">{title}</h2>
          <p className="pc-header-subtitle">{subtitle}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClasses('pc-card', className)} {...props} />;
}

export function ArticleCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={joinClasses('pc-card', className)} {...props} />;
}

export function PanelCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClasses('pc-panel', className)} {...props} />;
}
