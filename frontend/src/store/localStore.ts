import { DEFAULT_SAMPLE_COURSES, USST_PERIODS } from '../constants/usst';
import type { Course, ScheduleState, ThemeMode, WeekType } from '../types';

const STORAGE_KEY = 'elischedule.v1.state';
export const DEFAULT_TERM_START_DATE = '2026-09-07';

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(2026, 8, 7);
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Snaps any YYYY-MM-DD date string to the Monday of that ISO week.
 */
export function normalizeToMonday(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const jsDay = d.getDay(); // 0 = Sun .. 6 = Sat
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  d.setDate(d.getDate() + diff);
  return formatISODate(d);
}

export function computeCurrentWeek(
  termStartDate: string,
  now: Date,
  totalWeeks = 18
): number {
  const start = parseLocalDate(normalizeToMonday(termStartDate));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  const week = Math.floor(diffDays / 7) + 1;
  return clampWeek(week, totalWeeks);
}

export function getDatesForWeek(termStartDate: string, week: number): Date[] {
  const monday = parseLocalDate(normalizeToMonday(termStartDate));
  const offsetDays = (week - 1) * 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offsetDays + i);
    return d;
  });
}

export function formatMonthDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}`;
}

export function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getInitialState(now: Date = new Date()): ScheduleState {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const fallback: ScheduleState = {
    term: '2026-2027 学年 · 秋季',
    termStartDate: DEFAULT_TERM_START_DATE,
    currentWeek: computeCurrentWeek(DEFAULT_TERM_START_DATE, now, 18),
    totalWeeks: 18,
    theme: prefersDark ? 'dark' : 'light',
    courses: DEFAULT_SAMPLE_COURSES,
  };

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ScheduleState>;
    if (!Array.isArray(parsed.courses)) return fallback;
    const totalWeeks = parsed.totalWeeks ?? 18;
    const termStartDate = parsed.termStartDate
      ? normalizeToMonday(parsed.termStartDate)
      : fallback.termStartDate;
    return {
      term: parsed.term || fallback.term,
      termStartDate,
      currentWeek: clampWeek(
        parsed.currentWeek ?? computeCurrentWeek(termStartDate, now, totalWeeks),
        totalWeeks
      ),
      totalWeeks,
      theme: (parsed.theme === 'dark' || parsed.theme === 'light'
        ? parsed.theme
        : fallback.theme) as ThemeMode,
      courses: parsed.courses,
      lastImportedAt: parsed.lastImportedAt,
    };
  } catch {
    return fallback;
  }
}

export function saveState(state: ScheduleState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function clampWeek(week: number, totalWeeks = 18): number {
  return Math.max(1, Math.min(totalWeeks, Math.round(week)));
}

export function isCourseActiveInWeek(course: Course, week: number): boolean {
  if (Array.isArray(course.weeks) && course.weeks.length > 0) {
    return course.weeks.includes(week);
  }
  if (course.weekType === 'odd') return week % 2 === 1;
  if (course.weekType === 'even') return week % 2 === 0;
  return true;
}

export function formatWeekSummary(weeks: number[], weekType: WeekType): string {
  if (!weeks || weeks.length === 0) return '1-16 周';
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const suffix = weekType === 'odd' ? ' (单周)' : weekType === 'even' ? ' (双周)' : '';
  if (sorted.length === 1) return `第 ${first} 周`;
  return `${first}-${last} 周${suffix}`;
}

export function getCurrentTimelinePeriodOffset(now: Date): number | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const firstStart = USST_PERIODS[0].startMin;
  const lastEnd = USST_PERIODS[USST_PERIODS.length - 1].endMin;
  if (mins < firstStart - 30 || mins > lastEnd + 15) {
    return null;
  }
  if (mins <= firstStart) return 0;
  if (mins >= lastEnd) return USST_PERIODS.length;

  for (let i = 0; i < USST_PERIODS.length; i++) {
    const slot = USST_PERIODS[i];
    if (mins >= slot.startMin && mins <= slot.endMin) {
      const frac = (mins - slot.startMin) / (slot.endMin - slot.startMin);
      return i + frac;
    }
    const next = USST_PERIODS[i + 1];
    if (next && mins > slot.endMin && mins < next.startMin) {
      return i + 1;
    }
  }
  return null;
}

export function getTodayDayOfWeek(now: Date): number {
  const jsDay = now.getDay(); // 0 = Sun .. 6 = Sat
  return jsDay === 0 ? 7 : jsDay;
}
