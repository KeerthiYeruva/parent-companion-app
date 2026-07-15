import { BookOpen, Calculator, FlaskConical, Languages, Monitor, Palette } from 'lucide-react';

const subjectIconFor = (subject?: string) => {
  const value = subject?.toLowerCase() ?? '';

  if (/math|mathematics/.test(value)) return Calculator;
  if (/science|physics|chemistry|biology/.test(value)) return FlaskConical;
  if (/computer|coding|ict/.test(value)) return Monitor;
  if (/art|craft|drawing/.test(value)) return Palette;
  if (/hindi|kannada|english|language/.test(value)) return Languages;

  return BookOpen;
};

export function SubjectIcon({
  subject,
  className = 'h-4 w-4',
}: {
  subject?: string;
  className?: string;
}) {
  const Icon = subjectIconFor(subject);
  return <Icon aria-hidden="true" className={className} strokeWidth={1.9} />;
}
