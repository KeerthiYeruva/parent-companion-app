import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from '@/components/routing';

type ClassValue = string | undefined;

const joinClasses = (...classValues: ClassValue[]) => classValues.filter(Boolean).join(' ');

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children' | 'className'>;

export function LinkButton({ href, children, className, ...props }: LinkButtonProps) {
  return (
    <Link href={href} className={joinClasses('pc-link-button', className)} {...props}>
      {children}
    </Link>
  );
}

export function SubtleButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={joinClasses('pc-subtle-button', className)} {...props} />;
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={joinClasses('pc-primary-button', className)} {...props} />
  );
}

export function OutlineButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={joinClasses('pc-outline-button', className)} {...props} />
  );
}

export function MutedButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={joinClasses('pc-muted-button', className)} {...props} />;
}

export function DangerButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={joinClasses('pc-danger-button', className)} {...props} />;
}
