import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { USST_PERIODS, WEEKDAY_MONO } from '../constants/usst';
import {
  getCurrentTimelinePeriodOffset,
  getDatesForWeek,
  isCourseActiveInWeek,
  isSameLocalDate,
} from '../store/localStore';
import type { Course } from '../types';

const CN_SHORT_DAYS = ['一', '二', '三', '四', '五', '六', '日'];
const PAPER_EASE = [0.2, 0, 0, 1] as const;

interface DayAgendaViewProps {
  courses: Course[];
  termStartDate: string;
  currentWeek: number;
  selectedDay: number; // 1..7
  now: Date;
  onSelectDay: (day: number) => void;
  onSwipeDay: (delta: number) => void;
  onSelectCourse: (course: Course) => void;
  onCreateForDay: (day: number) => void;
}

export function DayAgendaView({
  courses,
  termStartDate,
  currentWeek,
  selectedDay,
  now,
  onSelectDay,
  onSwipeDay,
  onSelectCourse,
  onCreateForDay,
}: DayAgendaViewProps) {
  const weekDates = getDatesForWeek(termStartDate, currentWeek);
  const selectedDate = weekDates[selectedDay - 1];
  const isSelectedToday = selectedDate ? isSameLocalDate(selectedDate, now) : false;
  const livePeriodOffset = getCurrentTimelinePeriodOffset(now);

  const dayCourses = courses
    .filter((c) => isCourseActiveInWeek(c, currentWeek) && c.dayOfWeek === selectedDay)
    .sort((a, b) => a.startPeriod - b.startPeriod);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -56 || info.velocity.x < -340) {
      onSwipeDay(1);
    } else if (info.offset.x > 56 || info.velocity.x > 340) {
      onSwipeDay(-1);
    }
  };

  return (
    <div className="agenda-container">
      {/* 7-Day Horizontal Strip */}
      <div className="day-strip" role="tablist" aria-label="选择星期">
        {WEEKDAY_MONO.map((mono, idx) => {
          const dayNum = idx + 1;
          const date = weekDates[idx];
          const isSelected = dayNum === selectedDay;
          const isToday = isSameLocalDate(date, now);
          const hasClasses = courses.some(
            (c) => isCourseActiveInWeek(c, currentWeek) && c.dayOfWeek === dayNum
          );
          return (
            <button
              key={mono}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`day-pill${isSelected ? ' day-pill--active' : ''}${isToday ? ' day-pill--today' : ''}`}
              onClick={() => onSelectDay(dayNum)}
            >
              <span className="day-pill-cn">{CN_SHORT_DAYS[idx]}</span>
              <span className="day-pill-num font-mono">{String(date.getDate()).padStart(2, '0')}</span>
              <span
                className="day-pill-dot"
                style={{
                  opacity: isToday || hasClasses ? 1 : 0,
                  backgroundColor: isToday ? 'var(--book-cloth)' : 'var(--ink-3)',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Swipable Editorial Day List */}
      <motion.div
        className="agenda-list"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        transition={{ duration: 0.18, ease: PAPER_EASE }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentWeek}-${selectedDay}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.17, ease: PAPER_EASE }}
            className="agenda-items"
          >
            {dayCourses.length === 0 ? (
              <div className="agenda-empty">
                <p className="font-serif agenda-empty-title">今日无排课</p>
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => onCreateForDay(selectedDay)}
                >
                  + 添加一节课程
                </button>
              </div>
            ) : (
              dayCourses.map((course) => {
                const startSlot = USST_PERIODS[Math.max(0, course.startPeriod - 1)];
                const endSlot = USST_PERIODS[Math.min(USST_PERIODS.length - 1, course.endPeriod - 1)];
                const isLive =
                  isSelectedToday &&
                  livePeriodOffset !== null &&
                  livePeriodOffset >= course.startPeriod - 1 &&
                  livePeriodOffset <= course.endPeriod;

                return (
                  <button
                    key={course.id}
                    type="button"
                    className={`agenda-card${isLive ? ' agenda-card--live' : ''}`}
                    onClick={() => onSelectCourse(course)}
                  >
                    <div className="agenda-time font-mono">
                      <span className="agenda-time-start">{startSlot?.start}</span>
                      <span className="agenda-time-end">{endSlot?.end}</span>
                      <span className="agenda-period">
                        P{course.startPeriod}–{course.endPeriod}
                      </span>
                    </div>

                    <div className="agenda-info">
                      <div className="agenda-title-row">
                        <span className="agenda-name">{course.name}</span>
                        {course.weekType !== 'all' && (
                          <span className="course-tile-parity font-mono">
                            {course.weekType === 'odd' ? '单' : '双'}
                          </span>
                        )}
                      </div>
                      <div className="agenda-meta font-mono">
                        {isLive && <span className="live-dot" />}
                        <span>{course.location || '待定教室'}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
