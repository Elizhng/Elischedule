import { USST_PERIODS } from '../constants/usst';
import { normalizeToMonday, parseLocalDate } from '../store/localStore';
import type { Course } from '../types';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatICSDateTime(date: Date, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(h || 0)}${pad2(m || 0)}00`;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Generates an RFC 5545 .ics calendar string for all courses across their active weeks,
 * with Asia/Shanghai timezone and a 15-minute pre-class reminder (VALARM).
 */
export function generateScheduleICS(
  courses: Course[],
  termStartDate: string,
  calendarName = 'Elischedule 上理课表',
  reminderMinutes = 15
): string {
  const monday = parseLocalDate(normalizeToMonday(termStartDate));
  const nowStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Elischedule//USST Timetable//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Shanghai',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Shanghai',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:CST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const course of courses) {
    const startSlot = USST_PERIODS[Math.max(0, course.startPeriod - 1)];
    const endSlot = USST_PERIODS[Math.min(USST_PERIODS.length - 1, course.endPeriod - 1)];
    if (!startSlot || !endSlot) continue;

    const weeks =
      Array.isArray(course.weeks) && course.weeks.length > 0
        ? [...new Set(course.weeks)].sort((a, b) => a - b)
        : Array.from({ length: 16 }, (_, i) => i + 1);

    const descParts: string[] = [];
    if (course.teacher) descParts.push(`教师：${course.teacher}`);
    descParts.push(`节次：第 ${course.startPeriod}-${course.endPeriod} 节`);
    if (course.notes) descParts.push(`备注：${course.notes}`);
    const description = descParts.join('\n');

    for (const week of weeks) {
      const eventDate = new Date(monday);
      eventDate.setDate(monday.getDate() + (week - 1) * 7 + (course.dayOfWeek - 1));

      const dtStart = formatICSDateTime(eventDate, startSlot.start);
      const dtEnd = formatICSDateTime(eventDate, endSlot.end);
      const uid = `${course.id}-w${week}@elischedule.usst`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;TZID=Asia/Shanghai:${dtStart}`,
        `DTEND;TZID=Asia/Shanghai:${dtEnd}`,
        `SUMMARY:${escapeICSText(course.name)}`,
      );
      if (course.location) {
        lines.push(`LOCATION:${escapeICSText(course.location)}`);
      }
      if (description) {
        lines.push(`DESCRIPTION:${escapeICSText(description)}`);
      }
      if (reminderMinutes > 0) {
        lines.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `TRIGGER:-PT${reminderMinutes}M`,
          `DESCRIPTION:${escapeICSText(`${course.name}${course.location ? ` · ${course.location}` : ''}`)}`,
          'END:VALARM',
        );
      }
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function downloadScheduleICS(
  courses: Course[],
  termStartDate: string,
  termName: string
): void {
  const content = generateScheduleICS(courses, termStartDate, `Elischedule · ${termName}`, 15);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `elischedule-${termStartDate}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
