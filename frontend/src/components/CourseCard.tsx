import { motion } from 'framer-motion';
import type { Course } from '../types';

const PERIOD_HEIGHT = 64;
const PAPER_EASE = [0.2, 0, 0, 1] as const;

interface CourseCardProps {
  course: Course;
  index: number;
  isLive: boolean;
  onSelect: (course: Course) => void;
}

export function CourseCard({ course, index, isLive, onSelect }: CourseCardProps) {
  const top = (course.startPeriod - 1) * PERIOD_HEIGHT + 6;
  const span = Math.max(1, course.endPeriod - course.startPeriod + 1);
  const height = span * PERIOD_HEIGHT - 12;

  return (
    <motion.button
      type="button"
      className={`course-tile${isLive ? ' course-tile--live' : ''}`}
      style={{ top, height }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.19,
        ease: PAPER_EASE,
        delay: Math.min(index * 0.014, 0.12),
      }}
      onClick={() => onSelect(course)}
    >
      <div className="course-tile-name">{course.name}</div>
      <div className="course-tile-foot font-mono">
        <span>{course.location}</span>
        {course.weekType !== 'all' && (
          <span className="course-tile-parity">
            {course.weekType === 'odd' ? '单' : '双'}
          </span>
        )}
      </div>
    </motion.button>
  );
}
