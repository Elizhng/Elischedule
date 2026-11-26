import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  formatPeriodTimeRange,
  shortenUSSTLocation,
  WEEKDAY_MONO,
} from '../constants/usst';
import { formatWeekSummary } from '../store/localStore';
import type { Course, WeekType } from '../types';
import { CloseIcon } from './Icons';

const PAPER_EASE = [0.2, 0, 0, 1] as const;

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
      className="modal-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.17, ease: PAPER_EASE }}
      onClick={onClose}
    >
      <motion.div
        className="sheet-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.195, ease: PAPER_EASE }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <div className="sheet-eyebrow font-mono">
              {WEEKDAY_MONO[course.dayOfWeek - 1]} · {formatPeriodTimeRange(course.startPeriod, course.endPeriod)} · PERIOD {course.startPeriod}–{course.endPeriod}
            </div>
            <h2 className="sheet-title font-serif">{name || course.name}</h2>
            <p className="sheet-subtitle">
              {teacher || '未指定教师'} · {location || '未指定教室'} · {formatWeekSummary(course.weeks, weekType)}
            </p>
          </div>
          <button
            type="button"
            className="nav-btn nav-btn--sm"
            onClick={onClose}
            aria-label="关闭详情"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="sheet-body">
          <div className="ledger-row">
            <label>
              <span className="ledger-label font-mono">Instructor</span>
              <input
                className="ledger-input"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="任课教师"
              />
            </label>

            <label>
              <span
                className="ledger-label font-mono"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Location</span>
                <button
                  type="button"
                  onClick={() => setLocation(shortenUSSTLocation(location))}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--book-cloth)',
                    fontSize: 10,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  简称化
                </button>
              </span>
              <input
                className="ledger-input font-mono"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="一教 204"
              />
            </label>
          </div>

          <div className="ledger-inline">
            <span className="ledger-label font-mono" style={{ marginBottom: 0 }}>
              Cadence
            </span>
            <div className="segmented">
              {(['all', 'odd', 'even'] as WeekType[]).map((wt) => (
                <button
                  key={wt}
                  type="button"
                  className={`segmented-btn font-mono${weekType === wt ? ' segmented-btn--active' : ''}`}
                  onClick={() => setWeekType(wt)}
                >
                  {wt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <label>
            <span className="ledger-label font-mono">Reading &amp; Notes</span>
            <textarea
              className="ledger-notes font-serif"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录教材版本、阅读章节或考勤备注…"
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="btn-quiet btn-danger"
                style={{ paddingLeft: 0 }}
                onClick={() => {
                  onDelete(course.id);
                  onClose();
                }}
              >
                删除
              </button>
              <input
                className="ledger-input"
                style={{ fontSize: 12, color: 'var(--ink-3)', width: 140 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="编辑课程全称"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="btn-quiet" onClick={onClose}>
                取消
              </button>
              <button type="button" className="btn-ink" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
