import type { ChildProfile, SchoolItem } from '@/types/domain';

const sortChronologically = (items: SchoolItem[]) =>
  [...items].sort(
    (first, second) =>
      first.dueDate.localeCompare(second.dueDate) || first.title.localeCompare(second.title)
  );

export const groupTestsByChild = (children: ChildProfile[], items: SchoolItem[]) =>
  children.map((child) => {
    const childItems = items.filter((item) => item.childId === child.id);

    return {
      child,
      classTests: sortChronologically(childItems.filter((item) => item.category === 'ClassTest')),
      unitTests: sortChronologically(childItems.filter((item) => item.category === 'UnitTest')),
      exams: sortChronologically(childItems.filter((item) => item.category === 'Exam')),
    };
  });
