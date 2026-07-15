import { describe, expect, it } from 'vitest';
import { initialsFor, plannerChildShortName } from './child-switcher';

describe('child switcher labels', () => {
  it('shows the first name for planner tabs without changing stored names', () => {
    expect(plannerChildShortName('Luhas Reddy')).toBe('Luhas');
    expect(plannerChildShortName('Ruthvish Reddy Annapareddy')).toBe('Ruthvish');
  });

  it('keeps compact initials from the stored full name', () => {
    expect(initialsFor('Luhas Reddy')).toBe('LR');
    expect(initialsFor('Ruthvish Reddy Annapareddy')).toBe('RR');
  });
});
