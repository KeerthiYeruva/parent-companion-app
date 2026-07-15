import dayjs from 'dayjs';
import { getItemTiming, isItemCompleted } from '@/features/planning/services/item-completion';
import type {
  ChildProfile,
  ScanSessionFileRecord,
  SchoolItem,
  UploadedDocument,
} from '@/types/domain';

export const taskBuckets = ['Homework', 'Tests', 'Activities', 'Projects', 'Study tasks'] as const;

export type TaskBucket = (typeof taskBuckets)[number];

export const taskCategoryLabel = (category: SchoolItem['category']): TaskBucket | 'Circular' => {
  if (['ClassTest', 'UnitTest', 'Exam'].includes(category)) {
    return 'Tests';
  }

  if (category === 'HomeStudy') {
    return 'Study tasks';
  }

  if (category === 'Activity') {
    return 'Activities';
  }

  if (category === 'Project') {
    return 'Projects';
  }

  if (category === 'Circular') {
    return 'Circular';
  }

  return 'Homework';
};

export const itemsByTaskBucket = (items: SchoolItem[]) => {
  return taskBuckets.map((bucket) => ({
    bucket,
    items: items.filter((item) => taskCategoryLabel(item.category) === bucket),
  }));
};

export const completionProgress = (items: SchoolItem[]) => {
  const total = items.length;
  const completed = items.filter(isItemCompleted).length;

  return {
    completed,
    total,
    label: `${completed} of ${total} done`,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

export const splitOpenAndCompletedItems = (items: SchoolItem[]) => {
  return {
    open: items.filter((item) => !isItemCompleted(item)),
    completed: items.filter(isItemCompleted),
  };
};

const timingRank = (item: SchoolItem) => {
  const timing = getItemTiming(item);
  if (timing === 'overdue') return 0;
  if (timing === 'today') return 1;
  if (timing === 'upcoming') return 2;
  return 3;
};

export const orderPlannerItems = (items: SchoolItem[]) =>
  [...items].sort(
    (first, second) =>
      timingRank(first) - timingRank(second) ||
      first.dueDate.localeCompare(second.dueDate) ||
      first.title.localeCompare(second.title) ||
      first.id.localeCompare(second.id)
  );

export const schoolWeekRange = (date = dayjs()) => {
  const current = date.startOf('day');
  const daysSinceMonday = (current.day() + 6) % 7;
  const start = current.subtract(daysSinceMonday, 'day');
  const end = start.add(6, 'day');

  return { start, end };
};

const isWithinDateRange = (date: string, start: dayjs.Dayjs, end: dayjs.Dayjs) => {
  const due = dayjs(date).startOf('day');
  return !due.isBefore(start, 'day') && !due.isAfter(end, 'day');
};

export const todayPlannerSections = (items: SchoolItem[], today = dayjs()) => {
  const current = today.startOf('day');
  const upcomingEnd = current.add(2, 'day');
  const actionable = items.filter((item) => {
    const due = dayjs(item.dueDate).startOf('day');
    return !due.isAfter(current, 'day');
  });

  return {
    progressItems: orderPlannerItems(actionable),
    overdue: orderPlannerItems(
      items.filter(
        (item) =>
          !isItemCompleted(item) && dayjs(item.dueDate).startOf('day').isBefore(current, 'day')
      )
    ),
    dueToday: orderPlannerItems(
      items.filter(
        (item) =>
          !isItemCompleted(item) && dayjs(item.dueDate).startOf('day').isSame(current, 'day')
      )
    ),
    upcoming: orderPlannerItems(
      items.filter((item) => {
        const due = dayjs(item.dueDate).startOf('day');
        return due.isAfter(current, 'day') && !due.isAfter(upcomingEnd, 'day');
      })
    ),
    completed: orderPlannerItems(actionable.filter(isItemCompleted)),
  };
};

export const testsDueTomorrow = (items: SchoolItem[], today = dayjs()) => {
  const tomorrow = today.startOf('day').add(1, 'day');

  return orderPlannerItems(
    items.filter((item) => {
      if (!['ClassTest', 'UnitTest', 'Exam'].includes(item.category)) {
        return false;
      }

      if (isItemCompleted(item)) {
        return false;
      }

      return dayjs(item.dueDate).startOf('day').isSame(tomorrow, 'day');
    })
  );
};

export const bySelectedChildren = (items: SchoolItem[], selectedChildIds: string[]) => {
  if (selectedChildIds.length === 0) {
    return items;
  }

  return items.filter((item) => selectedChildIds.includes(item.childId));
};

export const todayItems = (items: SchoolItem[]) => {
  const today = dayjs().format('YYYY-MM-DD');
  return orderPlannerItems(
    items.filter((item) => item.dueDate === today && !isItemCompleted(item))
  );
};

export const thisWeekItems = (items: SchoolItem[]) => {
  const { start, end } = schoolWeekRange();

  return orderPlannerItems(
    items.filter((item) => {
      return isWithinDateRange(item.dueDate, start, end);
    })
  );
};

export const itemsForMonth = (items: SchoolItem[], month = dayjs()) => {
  const start = month.startOf('month');
  const end = month.endOf('month');

  return orderPlannerItems(
    items.filter((item) => {
      return isWithinDateRange(item.dueDate, start, end);
    })
  );
};

export const thisMonthItems = (items: SchoolItem[]) => itemsForMonth(items);

export const itemsByChild = (children: ChildProfile[], items: SchoolItem[]) => {
  return children.map((child) => {
    const childItems = orderPlannerItems(items.filter((item) => item.childId === child.id));

    return {
      child,
      items: childItems,
      progress: completionProgress(childItems),
    };
  });
};

export const monthItemsByWeek = (items: SchoolItem[], month = dayjs()) => {
  const groups = new Map<string, SchoolItem[]>();
  const monthStart = month.startOf('month');
  const monthEnd = month.endOf('month');

  items.forEach((item) => {
    const due = dayjs(item.dueDate);
    const { start, end } = schoolWeekRange(due);
    const weekStart = start.isBefore(monthStart, 'day') ? monthStart : start;
    const weekEnd = end.isAfter(monthEnd, 'day') ? monthEnd : end;
    const key = `${weekStart.format('YYYY-MM-DD')}__${weekEnd.format('YYYY-MM-DD')}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  });

  return Array.from(groups.entries()).map(([key, weekItems]) => {
    const [start, end] = key.split('__');
    const sortedItems = orderPlannerItems(weekItems);

    return {
      key,
      label: `${dayjs(start).format('DD MMM')} - ${dayjs(end).format('DD MMM')}`,
      items: sortedItems,
      progress: completionProgress(sortedItems),
    };
  });
};

export const monthlyCounts = (items: SchoolItem[]) => {
  const inMonth = items;

  return {
    homework: inMonth.filter((item) => ['Homework', 'HomeStudy'].includes(item.category)).length,
    tests: inMonth.filter((item) => ['ClassTest', 'UnitTest', 'Exam'].includes(item.category))
      .length,
    activities: inMonth.filter((item) => item.category === 'Activity').length,
    projects: inMonth.filter((item) => item.category === 'Project').length,
  };
};

export const childSummary = (child: ChildProfile, items: SchoolItem[]) => {
  const childItems = items.filter((item) => item.childId === child.id);
  const pendingTasks = childItems.filter(
    (item) => !isItemCompleted(item) && item.category !== 'Activity'
  ).length;
  const upcomingTests = childItems.filter(
    (item) => ['ClassTest', 'UnitTest', 'Exam'].includes(item.category) && !isItemCompleted(item)
  ).length;
  const activityTomorrow = childItems.some(
    (item) =>
      item.category === 'Activity' && dayjs(item.dueDate).isSame(dayjs().add(1, 'day'), 'day')
  );

  return {
    pendingTasks,
    upcomingTests,
    activityTomorrow,
  };
};

export const childMonthReadiness = (child: ChildProfile, documents: UploadedDocument[]) => {
  const currentMonthLabel = dayjs().format('MMMM');
  const childDocuments = documents.filter(
    (document) => document.childIds.includes(child.id) || document.childIds.length === 0
  );
  const monthDocuments = childDocuments.filter(
    (document) => document.extractedMonth === currentMonthLabel
  );

  return {
    currentMonthLabel,
    documentCount: monthDocuments.length,
    isReady: monthDocuments.length > 0,
  };
};

export const childReviewSummary = (child: ChildProfile, scanQueue: ScanSessionFileRecord[]) => {
  const childKey = child.name.toLowerCase();
  const matchingFiles = scanQueue.filter((file) => {
    const pathMatch = file.relativePath.toLowerCase().includes(childKey);
    const hintMatch = file.childHints.some(
      (hint) =>
        hint.toLowerCase().includes(child.grade.toLowerCase()) ||
        hint.toLowerCase().includes(childKey)
    );
    return pathMatch || hintMatch;
  });

  return {
    fileCount: matchingFiles.length,
    reviewCount: matchingFiles.filter(
      (file) => file.status === 'needsReview' || file.status === 'partiallyReady'
    ).length,
  };
};
