import { describe, expect, it } from 'vitest';
import { morePageLinks } from '@/features/planning/components/more-view';

describe('More page accordion sections', () => {
  it('contains Manage Kids, School Files, and Data & Backup sections', () => {
    expect(
      morePageLinks.map(({ id, title, description }) => ({
        id,
        title,
        description,
      }))
    ).toEqual([
      {
        id: 'profiles',
        title: 'Manage Kids',
        description: 'Add or update child profiles',
      },
      {
        id: 'school-files',
        title: 'School Files',
        description: 'Upload, scan, review, and manage school documents',
      },
      {
        id: 'backup',
        title: 'Data & Backup',
        description: 'Export, import, and manage planner data',
      },
    ]);
    expect(morePageLinks.every((link) => link.icon)).toBe(true);
  });
});
