import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { USST_PERIODS, WEEKDAY_LABELS, WEEKDAY_MONO } from '../constants/usst';
import {
  getCurrentTimelinePeriodOffset,
  getTodayDayOfWeek,
  isCourseActiveInWeek,
} from '../store/localStore';
import type { Course } from '../types';
import { CourseCard } from './CourseCard';

const PERIOD_HEIGHT = 60;

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
    <div className="timetable-frame">
      <div className="timetable-scroll">
        <motion.div
          className="timetable-inner"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.14}
          onDragEnd={handleDragEnd}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        >
          <div className="timetable-head">
            <div className="head-corner font-mono">W{String(currentWeek).padStart(2, '0')}</div>
            {WEEKDAY_LABELS.map((label, idx) => {
              const dayNum = idx + 1;
              const isToday = dayNum === todayDay;
              return (
                <div
                  key={label}
                  className={`day-col-header${isToday ? ' day-col-header--today' : ''}`}
                >
                  <span className="day-mono font-mono">{WEEKDAY_MONO[idx]}</span>
                  <span className="day-cn font-quattro">{label}</span>
                </div>
              );
            })}
          </div>

          <div className="timetable-body">
            <div className="time-axis">
              {USST_PERIODS.map((slot) => (
                <div key={slot.period} className="period-cell font-mono">
                  <span className="period-num">{String(slot.period).padStart(2, '0')}</span>
                  <span className="period-time">{slot.start}</span>
                </div>
              ))}
            </div>

            {WEEKDAY_LABELS.map((_, idx) => {
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
                style={{ top: livePeriodOffset * PERIOD_HEIGHT }}
                aria-hidden="true"
              >
                <span className="live-line-dot terracotta-dot" />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
