import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import {
  defaultServiceDate,
  isOperatingDay,
  isWithinBookingWindow,
  TRONDHEIM_FLEX_LINE,
} from './trondheimFlexLine';

describe('isOperatingDay', () => {
  it('accepts a weekday inside the validity window', () => {
    // 2026-08-03 is a Monday.
    expect(isOperatingDay(dayjs('2026-08-03'))).toBe(true);
  });

  it('rejects a weekend day', () => {
    // 2026-08-08 is a Saturday.
    expect(isOperatingDay(dayjs('2026-08-08'))).toBe(false);
    expect(isOperatingDay(dayjs('2026-08-09'))).toBe(false);
  });

  it('rejects dates outside the line’s validity window', () => {
    expect(isOperatingDay(dayjs(TRONDHEIM_FLEX_LINE.validFrom).subtract(1, 'day'))).toBe(false);
    expect(isOperatingDay(dayjs(TRONDHEIM_FLEX_LINE.validTo).add(1, 'day'))).toBe(false);
  });

  it('rejects an invalid date', () => {
    expect(isOperatingDay(dayjs('not-a-date'))).toBe(false);
  });
});

describe('defaultServiceDate', () => {
  it('never defaults to today or the past — a past tour expires before it is served', () => {
    const now = dayjs('2026-09-07T12:00:00'); // a Monday well inside the window
    expect(defaultServiceDate(now).isAfter(now.startOf('day'))).toBe(true);
  });

  it('lands on an operating day', () => {
    // Step through a full week of "now" values; every default must be a valid service date.
    for (let i = 0; i < 7; i++) {
      const now = dayjs('2026-09-07T12:00:00').add(i, 'day');
      expect(isOperatingDay(defaultServiceDate(now))).toBe(true);
    }
  });

  it('skips the weekend', () => {
    // Friday -> the following Monday, since Saturday and Sunday are not operating days.
    const friday = dayjs('2026-09-11T12:00:00');
    expect(defaultServiceDate(friday).format('YYYY-MM-DD')).toBe('2026-09-14');
  });

  it('clamps to the start of the validity window when it has not begun yet', () => {
    const beforeWindow = dayjs('2026-07-01T12:00:00');

    const result = defaultServiceDate(beforeWindow);

    expect(result.isBefore(dayjs(TRONDHEIM_FLEX_LINE.validFrom))).toBe(false);
    expect(isOperatingDay(result)).toBe(true);
  });
});

describe('isWithinBookingWindow', () => {
  it('accepts times inside the line’s TimetabledPassingTime window', () => {
    expect(isWithinBookingWindow(dayjs('2026-08-03T08:00:00'))).toBe(true);
    expect(isWithinBookingWindow(dayjs('2026-08-03T12:30:00'))).toBe(true);
    expect(isWithinBookingWindow(dayjs('2026-08-03T17:00:00'))).toBe(true);
  });

  it('rejects times outside it', () => {
    expect(isWithinBookingWindow(dayjs('2026-08-03T07:59:00'))).toBe(false);
    expect(isWithinBookingWindow(dayjs('2026-08-03T17:01:00'))).toBe(false);
  });
});
