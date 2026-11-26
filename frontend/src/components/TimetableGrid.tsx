import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { USST_PERIODS, WEEKDAY_MONO } from '../constants/usst';
import {
  formatMonthDay,
  getCurrentTimelinePeriodOffset,
  getDatesForWeek,
  isCourseActiveInWeek,
  isSameLocalDate,
} from '../store/localStore';
import type { Course } from '../types';
import { CourseCard } from './CourseCard';

const CN_SHORT_DAYS = ['一', '二', '三', '四', '五', '六', '日'];
const PAPER_EASE = [0.2, 0, 0, 1] as const;

function useIsMobile(breakpoint = 720): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);
  return isMobile;
}

interface TimetableGridProps {
  courses: Course[];
  termStartDate: string;
  currentWeek: number;
  now: Date;
  staggerSeed: number;
  onSelectCourse: (course: Course) => void;
  onCreateAtSlot: (dayOfWeek: number, startPeriod: number) => void;
  onSwipeWeek: (delta: number) => void;
}

export function TimetableGrid({
  courses,
  termStartDate,
  currentWeek,
  now,
  staggerSeed,
  onSelectCourse,
  onCreateAtSlot,
  onSwipeWeek,
}: TimetableGridProps) {
  const isMobile = useIsMobile();
  const weekDates = getDatesForWeek(termStartDate, currentWeek);
  const livePeriodOffset = getCurrentTimelinePeriodOffset(now);
  const isViewingCurrentWeek = weekDates.some((d) => isSameLocalDate(d, now));
  const activeCourses = courses.filter((c) => isCourseActiveInWeek(c, currentWeek));

  // On mobile portrait, show 5 crisp Mon-Fri columns unless the week actually has weekend classes
  const hasWeekendClasses = activeCourses.some((c) => c.dayOfWeek >= 6);
  const visibleDaysCount = isMobile && !hasWeekendClasses ? 5 : 7;
  const visibleDays = Array.from({ length: visibleDaysCount }, (_, i) => i);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -64 || info.velocity.x < -380) {
      onSwipeWeek(1);
    } else if (info.offset.x > 64 || info.velocity.x > 380) {
      onSwipeWeek(-1);
    }
  };

  return (
    <motion.div
      className="timetable-inner"
      data-cols={visibleDaysCount}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.08}
      onDragEnd={handleDragEnd}
      transition={{ duration: 0.18, ease: PAPER_EASE }}
    >
      <div className="timetable-head">
        <div />
        {visibleDays.map((idx) => {
          const mono = WEEKDAY_MONO[idx];
          const date = weekDates[idx];
          const isToday = isSameLocalDate(date, now);
          return (
            <div
              key={mono}
              className={`day-col-header${isToday ? ' day-col-header--today' : ''}`}
            >
              <div className="day-col-meta">
                <span className="day-mono font-mono">{mono}</span>
                <span className="day-date font-mono">
                  {isMobile ? String(date.getDate()).padStart(2, '0') : formatMonthDay(date)}
                </span>
              </div>
              <span className="day-cn">{CN_SHORT_DAYS[idx]}</span>
            </div>
          );
        })}
      </div>

      <div className="timetable-body">
        <div className="time-axis">
          {USST_PERIODS.map((slot, idx) => (
            <div key={slot.period} className="period-cell font-mono">
              {idx % 2 === 0 && (
                <span className="period-time">
                  {isMobile ? `${slot.period}` : slot.start}
                </span>
              )}
              {isMobile && idx % 2 === 0 && (
                <span className="period-subtime">{slot.start}</span>
              )}
            </div>
          ))}
        </div>

        {visibleDays.map((idx) => {
          const dayNum = idx + 1;
          const isToday = isSameLocalDate(weekDates[idx], now);
          const dayCourses = activeCourses.filter((c) => c.dayOfWeek === dayNum);
          return (
            <div key={dayNum} className="day-column">
              {USST_PERIODS.map((slot) => (
                <button
                  key={slot.period}
                  type="button"
                  className="grid-slot-line grid-slot-btn"
                  onClick={() => onCreateAtSlot(dayNum, slot.period)}
                  aria-label={`在周${CN_SHORT_DAYS[idx]}第${slot.period}节新建课程`}
                />
              ))}
              <AnimatePresence mode="popLayout">
                {dayCourses.map((course, cIdx) => {
                  const isLive =
                    isToday &&
                    livePeriodOffset !== null &&
                    livePeriodOffset >= course.startPeriod - 1 &&
                    livePeriodOffset <= course.endPeriod;
                  return (
                    <CourseCard
                      key={`${course.id}-w${currentWeek}-s${staggerSeed}`}
                      course={course}
                      index={idx * 2 + cIdx}
                      isLive={isLive}
                      onSelect={onSelectCourse}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          );
        })}

        {isViewingCurrentWeek && livePeriodOffset !== null && (
          <div
            className="live-line"
            style={{ top: `calc(var(--row-h) * ${livePeriodOffset} + 8px)` }}
            aria-hidden="true"
          >
            <span className="live-line-dot" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
