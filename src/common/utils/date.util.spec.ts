import {
  buildLocalDateTime,
  requiresMinimumLeadTime,
} from './date.util';

describe('date.util', () => {
  describe('buildLocalDateTime', () => {
    it('builds a local date preserving the provided calendar date and time', () => {
      const result = buildLocalDateTime('2026-03-30', '14:30');

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(2);
      expect(result.getDate()).toBe(30);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('requiresMinimumLeadTime', () => {
    const now = new Date(2026, 2, 30, 10, 0, 0, 0);

    it('returns true for same-day appointments with less than 2 hours of lead time', () => {
      const appointmentDateTime = new Date(2026, 2, 30, 11, 59, 0, 0);

      expect(requiresMinimumLeadTime(appointmentDateTime, 2, now)).toBe(true);
    });

    it('allows same-day appointments with exactly 2 hours of lead time', () => {
      const appointmentDateTime = new Date(2026, 2, 30, 12, 0, 0, 0);

      expect(requiresMinimumLeadTime(appointmentDateTime, 2, now)).toBe(false);
    });

    it('allows appointments on later dates', () => {
      const appointmentDateTime = new Date(2026, 2, 31, 9, 0, 0, 0);

      expect(requiresMinimumLeadTime(appointmentDateTime, 2, now)).toBe(false);
    });
  });
});
