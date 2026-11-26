import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { USST_PERIODS, WEEKDAY_MONO } from '../constants/usst';
import {
  getCurrentTimelinePeriodOffset,
  getTodayDayOfWeek,
  isCourseActiveInWeek,
} from '../store/localStore';
import type { Course } from '../types';
import { CourseCard } from './CourseCard';

const PERIOD_HEIGHT = 64;
const CN_SHORT_DAYS = ['一', '二', '三', '四', '五', '六', '日'];
const PAPER_EASE = [0.2, 0, 0, 1] as const;

interface TimetableGridProps {
  courses: Course[];
  currentWeek: number;
  now: Date;
  staggerSeed: number;
  onSelectCourse: (course: Course) => void;
  onSwipeWeek: (delta: number) => void;
}

export function TimetableGrid({
  courses,
  currentWeek,
  now,
  staggerSeed,
  onSelectCourse,
  onSwipeWeek,
}: TimetableGridProps) {
  const todayDay = getTodayDayOfWeek(now);
  const livePeriodOffset = getCurrentTimelinePeriodOffset(now);
  const activeCourses = courses.filter((c) => isCourseActiveInWeek(c, currentWeek));

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
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.08}
      onDragEnd={handleDragEnd}
      transition={{ duration: 0.18, ease: PAPER_EASE }}
    >
      <div className="timetable-head">
        <div />
        {WEEKDAY_MONO.map((mono, idx) => {
          const dayNum = idx + 1;
          const isToday = dayNum === todayDay;
          return (
            <div
              key={mono}
              className={`day-col-header${isToday ? ' day-col-header--today' : ''}`}
            >
              <span className="day-mono font-mono">{mono}</span>
              <span className="day-cn">{CN_SHORT_DAYS[idx]}</span>
            </div>
          );
        })}
      </div>

      <div className="timetable-body">
        <div className="time-axis">
          {USST_PERIODS.map((slot, idx) => (
            <div key={slot.period} className="period-cell font-mono">
              {idx % 2 === 0 && <span className="period-time">{slot.start}</span>}
            </div>
          ))}
        </div>

        {WEEKDAY_MONO.map((_, idx) => {
          const dayNum = idx + 1;
          const dayCourses = activeCourses.filter((c) => c.dayOfWeek === dayNum);
          return (
            <div key={dayNum} className="day-column">
              {USST_PERIODS.map((slot) => (
                <div key={slot.period} className="grid-slot-line" />
              ))}
              <AnimatePresence mode="popLayout">
                {dayCourses.map((course, cIdx) => {
                  const isLive =
                    dayNum === todayDay &&
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

        {livePeriodOffset !== null && (
          <div
            className="live-line"
            style={{ top: livePeriodOffset * PERIOD_HEIGHT + 8 }}
            aria-hidden="true"
          >
            <span className="live-line-dot" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
