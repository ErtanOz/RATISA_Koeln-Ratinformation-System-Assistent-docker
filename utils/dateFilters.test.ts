import { describe, expect, it } from 'vitest';
import { validateDateRange } from './dateFilters';

describe('validateDateRange', () => {
  it('accepts empty ranges', () => {
    expect(validateDateRange('', '')).toBeNull();
    expect(validateDateRange('2026-01-01', '')).toBeNull();
    expect(validateDateRange('', '2026-01-01')).toBeNull();
  });

  it('returns an error when minDate is greater than maxDate', () => {
    expect(validateDateRange('2026-02-10', '2026-02-01')).toBe(
      'Das Startdatum darf nicht nach dem Enddatum liegen.',
    );
  });

  it('accepts valid ascending ranges', () => {
    expect(validateDateRange('2026-02-01', '2026-02-10')).toBeNull();
  });
});
