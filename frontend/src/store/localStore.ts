import { DEFAULT_SAMPLE_COURSES, USST_PERIODS } from '../constants/usst';
import type { Course, ScheduleState, ThemeMode, WeekType } from '../types';

const STORAGE_KEY = 'elischedule.v1.state';

export function getInitialState(): ScheduleState {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const fallback: ScheduleState = {
    term: '2026-2027 学年 · 秋季',
    currentWeek: 12,
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
    return {
      term: parsed.term || fallback.term,
      currentWeek: clampWeek(parsed.currentWeek ?? fallback.currentWeek, parsed.totalWeeks ?? 18),
      totalWeeks: parsed.totalWeeks ?? 18,
      theme: (parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : fallback.theme) as ThemeMode,
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

/**
 * Returns the vertical fractional position (0..12) of the current clock time
 * within the 12-period USST schedule, or null if outside 07:30-22:00.
 */
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
