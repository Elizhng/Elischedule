export type WeekType = 'all' | 'odd' | 'even';
export type ThemeMode = 'light' | 'dark';

export interface Course {
  id: string;
  name: string;
  teacher: string;
  location: string;
  rawLocation?: string;
  dayOfWeek: number; // 1 = Mon .. 7 = Sun
  startPeriod: number; // 1 .. 12
  endPeriod: number; // 1 .. 12
  weeks: number[];
  weeksText?: string;
  weekType: WeekType;
  colorIndex: number; // 0 .. 4
  notes?: string;
}

export interface ParseResponse {
  term?: string;
  courses: Course[];
  warnings?: string[];
}

export interface ScheduleState {
  term: string;
  currentWeek: number;
  totalWeeks: number;
  theme: ThemeMode;
  courses: Course[];
  lastImportedAt?: string;
}

export interface PeriodSlot {
  period: number;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
  blockLabel?: string;
}
