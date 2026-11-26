import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trash2, X } from 'lucide-react';
import {
  formatPeriodTimeRange,
  shortenUSSTLocation,
  WEEKDAY_LABELS,
} from '../constants/usst';
import { formatWeekSummary } from '../store/localStore';
import type { Course, WeekType } from '../types';

interface CourseDetailModalProps {
  course: Course;
  onClose: () => void;
  onSave: (updated: Course) => void;
  onDelete: (courseId: string) => void;
}

export function CourseDetailModal({
  course,
  onClose,
  onSave,
  onDelete,
}: CourseDetailModalProps) {
  const [name, setName] = useState(course.name);
  const [teacher, setTeacher] = useState(course.teacher);
  const [location, setLocation] = useState(course.location);
  const [weekType, setWeekType] = useState<WeekType>(course.weekType);
  const [notes, setNotes] = useState(course.notes || '');

  const handleSave = () => {
    const baseWeeks =
      course.weeks && course.weeks.length > 0
        ? course.weeks
        : Array.from({ length: 16 }, (_, i) => i + 1);
    const minW = Math.min(...baseWeeks);
    const maxW = Math.max(...baseWeeks);
    const nextWeeks: number[] = [];
    for (let w = minW; w <= maxW; w++) {
      if (weekType === 'odd' && w % 2 === 0) continue;
      if (weekType === 'even' && w % 2 !== 0) continue;
      nextWeeks.push(w);
    }

    onSave({
      ...course,
      name: name.trim() || course.name,
      teacher: teacher.trim(),
      location: location.trim(),
      weekType,
      weeks: nextWeeks.length > 0 ? nextWeeks : baseWeeks,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        layoutId={`course-card-${course.id}`}
        className="modal-card"
        transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>
              {WEEKDAY_LABELS[course.dayOfWeek - 1]} · 第 {course.startPeriod}-{course.endPeriod} 节 ·{' '}
              {formatPeriodTimeRange(course.startPeriod, course.endPeriod)}
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{course.name}</h2>
            <div className="font-mono" style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {formatWeekSummary(course.weeks, weekType)}
            </div>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn-round"
            onClick={onClose}
            aria-label="关闭详情"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <label className="field-label">
            课程名称
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="field-row">
            <label className="field-label">
              任课教师
              <input
                className="field-input"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="如：张明远"
              />
            </label>

            <label className="field-label">
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>教室地点</span>
                <button
                  type="button"
                  onClick={() => setLocation(shortenUSSTLocation(location))}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--accent)',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: 0,
                  }}
                >
                  <Sparkles size={11} />
                  上理简称
                </button>
              </span>
              <input
                className="field-input font-mono"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="如：一教 204"
              />
            </label>
          </div>

          <div className="field-label">
            单双周规则
            <div className="segmented">
              {(['all', 'odd', 'even'] as WeekType[]).map((wt) => (
                <button
                  key={wt}
                  type="button"
                  className={`segmented-btn${weekType === wt ? ' segmented-btn--active' : ''}`}
                  onClick={() => setWeekType(wt)}
                >
                  {wt === 'all' ? '全周' : wt === 'odd' ? '仅单周' : '仅双周'}
                </button>
              ))}
            </div>
          </div>

          <label className="field-label">
            课程备注
            <textarea
              className="field-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录教材版本、教学楼路线或随堂考试提醒…"
            />
          </label>

          <div className="modal-footer">
            <button
              type="button"
              className="icon-btn"
              style={{ color: 'var(--mineral-3-ink)' }}
              onClick={() => {
                onDelete(course.id);
                onClose();
              }}
            >
              <Trash2 size={14} />
              删除课程
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="icon-btn" onClick={onClose}>
                取消
              </button>
              <button type="button" className="primary-btn" onClick={handleSave}>
                保存修改
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
