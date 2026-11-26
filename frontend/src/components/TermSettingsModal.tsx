import { useState } from 'react';
import { motion } from 'framer-motion';
import { computeCurrentWeek, normalizeToMonday } from '../store/localStore';
import type { Course } from '../types';
import { downloadScheduleICS } from '../utils/ics';
import { CalendarExportIcon, CloseIcon } from './Icons';

const PAPER_EASE = [0.2, 0, 0, 1] as const;

interface TermSettingsModalProps {
  term: string;
  termStartDate: string;
  totalWeeks: number;
  courses: Course[];
  now: Date;
  onClose: () => void;
  onSave: (next: { term: string; termStartDate: string; totalWeeks: number }) => void;
  onResetSample: () => void;
}

export function TermSettingsModal({
  term,
  termStartDate,
  totalWeeks,
  courses,
  now,
  onClose,
  onSave,
  onResetSample,
}: TermSettingsModalProps) {
  const [draftTerm, setDraftTerm] = useState(term);
  const [draftStart, setDraftStart] = useState(termStartDate);
  const [draftTotal, setDraftTotal] = useState(totalWeeks);
  const [exported, setExported] = useState(false);

  const normalizedMonday = normalizeToMonday(draftStart);
  const computedWeek = computeCurrentWeek(normalizedMonday, now, draftTotal);

  const handleSave = () => {
    onSave({
      term: draftTerm.trim() || term,
      termStartDate: normalizedMonday,
      totalWeeks: draftTotal,
    });
    onClose();
  };

  const handleExport = () => {
    downloadScheduleICS(courses, normalizedMonday, draftTerm.trim() || term);
    setExported(true);
    window.setTimeout(() => setExported(false), 2400);
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
            <div className="sheet-eyebrow font-mono">TERM &amp; CALENDAR</div>
            <h2 className="sheet-title font-serif">学期设置与日历导出</h2>
            <p className="sheet-subtitle font-mono">
              第 1 周周一：{normalizedMonday} · 当前推算为第 {String(computedWeek).padStart(2, '0')} 周
            </p>
          </div>
          <button
            type="button"
            className="nav-btn nav-btn--sm"
            onClick={onClose}
            aria-label="关闭设置"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="sheet-body">
          <div className="ledger-row">
            <label>
              <span className="ledger-label font-mono">Term Name</span>
              <input
                className="ledger-input"
                value={draftTerm}
                onChange={(e) => setDraftTerm(e.target.value)}
                placeholder="2026-2027 学年 · 秋季"
              />
            </label>

            <label>
              <span className="ledger-label font-mono">Week 1 Monday</span>
              <input
                type="date"
                className="ledger-input font-mono"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
              />
            </label>
          </div>

          <div className="ledger-inline">
            <span className="ledger-label font-mono" style={{ marginBottom: 0 }}>
              Total Weeks
            </span>
            <div className="segmented">
              {[16, 18, 20].map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`segmented-btn font-mono${draftTotal === w ? ' segmented-btn--active' : ''}`}
                  onClick={() => setDraftTotal(w)}
                >
                  {w}W
                </button>
              ))}
            </div>
          </div>

          <div className="ledger-inline">
            <div>
              <span className="ledger-label font-mono">Apple / System Calendar</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                导出全部 {courses.length} 节课程（含课前 15 分钟系统提醒）
              </span>
            </div>
            <button
              type="button"
              className="btn-ink"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              onClick={handleExport}
            >
              <CalendarExportIcon />
              {exported ? '已导出 .ics' : '导出 .ics'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <button
              type="button"
              className="btn-quiet"
              style={{ paddingLeft: 0 }}
              onClick={() => {
                onResetSample();
                onClose();
              }}
            >
              恢复上理示例课表
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="btn-quiet" onClick={onClose}>
                取消
              </button>
              <button type="button" className="btn-ink" onClick={handleSave}>
                应用设置
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
