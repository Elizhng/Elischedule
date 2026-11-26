import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  formatPeriodTimeRange,
  shortenUSSTLocation,
  WEEKDAY_LABELS,
  WEEKDAY_MONO,
} from '../constants/usst';
import { formatWeekSummary } from '../store/localStore';
import type { Course, WeekType } from '../types';
import { CloseIcon } from './Icons';

const PAPER_EASE = [0.2, 0, 0, 1] as const;

interface CourseDetailModalProps {
  course: Course;
  mode?: 'edit' | 'create';
  totalWeeks: number;
  onClose: () => void;
  onSave: (updated: Course) => void;
  onDelete?: (courseId: string) => void;
}

export function CourseDetailModal({
  course,
  mode = 'edit',
  totalWeeks,
  onClose,
  onSave,
  onDelete,
}: CourseDetailModalProps) {
  const initialMinWeek = course.weeks.length > 0 ? Math.min(...course.weeks) : 1;
  const initialMaxWeek = course.weeks.length > 0 ? Math.max(...course.weeks) : 16;

  const [name, setName] = useState(course.name);
  const [teacher, setTeacher] = useState(course.teacher);
  const [location, setLocation] = useState(course.location);
  const [dayOfWeek, setDayOfWeek] = useState(course.dayOfWeek);
  const [startPeriod, setStartPeriod] = useState(course.startPeriod);
  const [endPeriod, setEndPeriod] = useState(course.endPeriod);
  const [startWeek, setStartWeek] = useState(initialMinWeek);
  const [endWeek, setEndWeek] = useState(initialMaxWeek);
  const [weekType, setWeekType] = useState<WeekType>(course.weekType);
  const [notes, setNotes] = useState(course.notes || '');

  const buildWeeks = (from: number, to: number, wt: WeekType): number[] => {
    const lo = Math.max(1, Math.min(from, to));
    const hi = Math.min(totalWeeks, Math.max(from, to));
    const arr: number[] = [];
    for (let w = lo; w <= hi; w++) {
      if (wt === 'odd' && w % 2 === 0) continue;
      if (wt === 'even' && w % 2 !== 0) continue;
      arr.push(w);
    }
    return arr.length > 0 ? arr : [lo];
  };

  const previewWeeks = buildWeeks(startWeek, endWeek, weekType);

  const handleSave = () => {
    const finalName = name.trim();
    if (!finalName) return;
    const clampedEnd = Math.max(startPeriod, endPeriod);
    onSave({
      ...course,
      name: finalName,
      teacher: teacher.trim(),
      location: location.trim(),
      dayOfWeek,
      startPeriod,
      endPeriod: clampedEnd,
      weekType,
      weeks: previewWeeks,
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sheet-eyebrow font-mono">
              {mode === 'create' ? 'NEW COURSE · ' : ''}
              {WEEKDAY_MONO[dayOfWeek - 1]} · {formatPeriodTimeRange(startPeriod, Math.max(startPeriod, endPeriod))} · PERIOD {startPeriod}–{Math.max(startPeriod, endPeriod)}
            </div>
            <input
              className="sheet-title-input font-serif"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入课程名称…"
              autoFocus={mode === 'create'}
            />
            <p className="sheet-subtitle">
              {teacher || '未指定教师'} · {location || '未指定教室'} · {formatWeekSummary(previewWeeks, weekType)}
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

          <div className="ledger-row">
            <label>
              <span className="ledger-label font-mono">Day &amp; Period</span>
              <div className="inline-select-group font-mono">
                <select
                  className="ledger-select"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                >
                  {WEEKDAY_LABELS.map((label, idx) => (
                    <option key={label} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                <span style={{ color: 'var(--ink-3)' }}>·</span>
                <select
                  className="ledger-select"
                  value={startPeriod}
                  onChange={(e) => {
                    const nextStart = Number(e.target.value);
                    setStartPeriod(nextStart);
                    if (endPeriod < nextStart) setEndPeriod(nextStart);
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      {p}节
                    </option>
                  ))}
                </select>
                <span style={{ color: 'var(--ink-3)' }}>–</span>
                <select
                  className="ledger-select"
                  value={Math.max(startPeriod, endPeriod)}
                  onChange={(e) => setEndPeriod(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1)
                    .filter((p) => p >= startPeriod)
                    .map((p) => (
                      <option key={p} value={p}>
                        {p}节
                      </option>
                    ))}
                </select>
              </div>
            </label>

            <label>
              <span className="ledger-label font-mono">Week Range</span>
              <div className="inline-select-group font-mono">
                <select
                  className="ledger-select"
                  value={startWeek}
                  onChange={(e) => {
                    const nextStart = Number(e.target.value);
                    setStartWeek(nextStart);
                    if (endWeek < nextStart) setEndWeek(nextStart);
                  }}
                >
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      W{String(w).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <span style={{ color: 'var(--ink-3)' }}>–</span>
                <select
                  className="ledger-select"
                  value={Math.max(startWeek, endWeek)}
                  onChange={(e) => setEndWeek(Number(e.target.value))}
                >
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1)
                    .filter((w) => w >= startWeek)
                    .map((w) => (
                      <option key={w} value={w}>
                        W{String(w).padStart(2, '0')}
                      </option>
                    ))}
                </select>
              </div>
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
            {mode === 'edit' && onDelete ? (
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
            ) : (
              <span />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="btn-quiet" onClick={onClose}>
                取消
              </button>
              <button
                type="button"
                className="btn-ink"
                disabled={!name.trim()}
                onClick={handleSave}
              >
                {mode === 'create' ? '添加课程' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
