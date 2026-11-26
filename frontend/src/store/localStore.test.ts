import { describe, expect, it } from 'vitest';
import { shortenUSSTLocation } from '../constants/usst';
import {
  formatWeekSummary,
  getCurrentTimelinePeriodOffset,
  isCourseActiveInWeek,
} from './localStore';
import type { Course } from '../types';

describe('USST location shorthand', () => {
  it('shortens standard USST building names', () => {
    expect(shortenUSSTLocation('第一教学楼204')).toBe('一教 204');
    expect(shortenUSSTLocation('光电信息大楼502')).toBe('光电 502');
    expect(shortenUSSTLocation('综合楼A201')).toBe('综合 A201');
  });
});

describe('schedule utilities', () => {
  const oddCourse: Course = {
    id: 'c1',
    name: '物理实验',
    teacher: '林致远',
    location: '公实 108',
    dayOfWeek: 2,
    startPeriod: 7,
    endPeriod: 8,
    weeks: [1, 3, 5, 7, 9, 11, 13, 15],
    weekType: 'odd',
    colorIndex: 3,
  };

  it('filters courses by active week', () => {
    expect(isCourseActiveInWeek(oddCourse, 11)).toBe(true);
    expect(isCourseActiveInWeek(oddCourse, 12)).toBe(false);
  });

  it('formats week summary concisely', () => {
    expect(formatWeekSummary(oddCourse.weeks, 'odd')).toBe('1-15 周 (单周)');
  });

  it('computes timeline period offset during class hours', () => {
    const morning = new Date(2026, 10, 26, 8, 22, 0); // mid period 1
    const offset = getCurrentTimelinePeriodOffset(morning);
    expect(offset).not.toBeNull();
    expect(offset!).toBeGreaterThan(0.4);
    expect(offset!).toBeLessThan(0.6);

    const lateNight = new Date(2026, 10, 26, 23, 30, 0);
    expect(getCurrentTimelinePeriodOffset(lateNight)).toBeNull();
  });
});
