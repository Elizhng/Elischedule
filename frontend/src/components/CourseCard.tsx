import { motion } from 'framer-motion';
import type { Course } from '../types';

const PERIOD_HEIGHT = 60;

interface CourseCardProps {
  course: Course;
  index: number;
  isLive: boolean;
  onSelect: (course: Course) => void;
}

export function CourseCard({ course, index, isLive, onSelect }: CourseCardProps) {
  const top = (course.startPeriod - 1) * PERIOD_HEIGHT + 3;
  const span = Math.max(1, course.endPeriod - course.startPeriod + 1);
  const height = span * PERIOD_HEIGHT - 6;

  return (
    <motion.button
      type="button"
      layoutId={`course-card-${course.id}`}
      className={`course-card course-card--${course.colorIndex % 5}${isLive ? ' course-card--live' : ''}`}
      style={{ top, height }}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 340,
        damping: 28,
        mass: 0.85,
        delay: Math.min(index * 0.032, 0.32),
      }}
      whileHover={{ y: -1.5, transition: { duration: 0.14 } }}
      whileTap={{ scale: 0.975 }}
      onClick={() => onSelect(course)}
    >
      {course.weekType !== 'all' && (
        <span className="course-card-badge font-mono">
          {course.weekType === 'odd' ? '单' : '双'}
        </span>
      )}

      <div className="course-card-name font-quattro">{course.name}</div>

      <div className="course-card-meta">
        {course.location && (
          <span className="course-card-loc font-mono">
            {isLive && (
              <span
                className="terracotta-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '999px',
                  backgroundColor: 'var(--accent)',
                  display: 'inline-block',
                }}
              />
            )}
            {course.location}
          </span>
        )}
        {course.teacher && <span className="font-quattro">{course.teacher}</span>}
      </div>
    </motion.button>
  );
}
