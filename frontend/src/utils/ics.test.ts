import { describe, expect, it } from 'vitest';
import { generateScheduleICS } from './ics';
import type { Course } from '../types';

describe('generateScheduleICS', () => {
  it('generates valid VCALENDAR with Asia/Shanghai timezone and 15-min alarm', () => {
    const sample: Course[] = [
      {
        id: 'math-1',
        name: '高等数学 A',
        teacher: '张明远',
        location: '一教 204',
        dayOfWeek: 1,
        startPeriod: 1,
        endPeriod: 2,
        weeks: [1, 2],
        weekType: 'all',
        colorIndex: 0,
        notes: '带习题册',
      },
    ];

    const ics = generateScheduleICS(sample, '2026-09-07', 'Elischedule 测试', 15);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('TZID:Asia/Shanghai');
    expect(ics).toContain('DTSTART;TZID=Asia/Shanghai:20260907T080000');
    expect(ics).toContain('DTEND;TZID=Asia/Shanghai:20260907T093500');
    expect(ics).toContain('DTSTART;TZID=Asia/Shanghai:20260914T080000');
    expect(ics).toContain('LOCATION:一教 204');
    expect(ics).toContain('TRIGGER:-PT15M');
    expect(ics).toContain('END:VCALENDAR');
  });
});
