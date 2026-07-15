import dayjs from 'dayjs';
import type { ItemStatus } from '@/types/domain';

export const deriveStatus = (dueDate: string, completedAt?: string): ItemStatus => {
  if (completedAt) {
    return 'Completed';
  }

  const now = dayjs().startOf('day');
  const due = dayjs(dueDate).startOf('day');

  if (due.isBefore(now)) {
    return 'Overdue';
  }

  if (due.isSame(now)) {
    return 'Pending';
  }

  if (due.diff(now, 'day') <= 7) {
    return 'Upcoming';
  }

  return 'Pending';
};
