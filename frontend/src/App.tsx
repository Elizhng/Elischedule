import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Moon,
  RotateCcw,
  Sun,
} from 'lucide-react';
import { CourseDetailModal } from './components/CourseDetailModal';
import { ImportModal } from './components/ImportModal';
import { TimetableGrid } from './components/TimetableGrid';
import { DEFAULT_SAMPLE_COURSES, formatPeriodTimeRange, WEEKDAY_LABELS } from './constants/usst';
import {
  clampWeek,
  getInitialState,
  getTodayDayOfWeek,
  isCourseActiveInWeek,
  saveState,
} from './store/localStore';
import type { Course, ScheduleState } from './types';

export function App() {
  const [state, setState] = useState<ScheduleState>(() => getInitialState());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [staggerSeed, setStaggerSeed] = useState(0);
  const [now, setNow] = useState(() => new Date());

  // Sync theme to document root & persist state locally with zero network blocking
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState(state);
  }, [state]);

  // Refresh live clock every 60 seconds for the terracotta timeline indicator
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const weekCountSummary = useMemo(() => {
    const active = state.courses.filter((c) => isCourseActiveInWeek(c, state.currentWeek));
    const today = getTodayDayOfWeek(now);
    const todayCourses = active
      .filter((c) => c.dayOfWeek === today)
      .sort((a, b) => a.startPeriod - b.startPeriod);
    return {
      totalThisWeek: active.length,
      todayCourses,
    };
  }, [state.courses, state.currentWeek, now]);

  const handleChangeWeek = (delta: number) => {
    setState((prev) => ({
      ...prev,
      currentWeek: clampWeek(prev.currentWeek + delta, prev.totalWeeks),
    }));
  };

  const handleToggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  const handleSaveCourse = (updated: Course) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteCourse = (courseId: string) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== courseId),
    }));
  };

  const handleImported = (courses: Course[], term?: string) => {
    setState((prev) => ({
      ...prev,
      term: term || prev.term,
      courses,
      lastImportedAt: new Date().toISOString(),
    }));
    setStaggerSeed((s) => s + 1);
  };

  const handleResetSample = () => {
    setState((prev) => ({
      ...prev,
      courses: DEFAULT_SAMPLE_COURSES,
      currentWeek: 12,
    }));
    setStaggerSeed((s) => s + 1);
  };

  const nextTodayCourse = weekCountSummary.todayCourses[0];

  return (
    <LayoutGroup>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-inner">
            <div className="brand-group">
              <h1 className="brand-title">
                <span className="brand-dot" />
                Elischedule
              </h1>
              <span className="brand-meta font-mono">{state.term}</span>
            </div>

            <div className="week-nav" role="group" aria-label="周次切换">
              <button
                type="button"
                className="icon-btn icon-btn-round"
                onClick={() => handleChangeWeek(-1)}
                disabled={state.currentWeek <= 1}
                aria-label="上一周"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className="week-label font-mono"
                onClick={() => setState((prev) => ({ ...prev, currentWeek: 12 }))}
                title="点击回到第 12 周"
              >
                第 {String(state.currentWeek).padStart(2, '0')} 周
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-round"
                onClick={() => handleChangeWeek(1)}
                disabled={state.currentWeek >= state.totalWeeks}
                aria-label="下一周"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="header-actions">
              <button
                type="button"
                className="icon-btn icon-btn-round"
                onClick={handleToggleTheme}
                title={state.theme === 'light' ? '切换暖炭黑夜间模式' : '切换羊皮纸日间模式'}
                aria-label="切换主题"
              >
                {state.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-round"
                onClick={handleResetSample}
                title="恢复上理示例课表"
                aria-label="恢复示例课表"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowImport(true)}
              >
                <ImagePlus size={15} />
                导入课表
              </button>
            </div>
          </div>
        </header>

        <main className="main-container">
          <div className="status-strip">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="status-pill font-mono">
                本周 {weekCountSummary.totalThisWeek} 节 · 本地秒开
              </span>
              {nextTodayCourse ? (
                <span className="status-pill status-pill--accent font-mono">
                  今日 {WEEKDAY_LABELS[nextTodayCourse.dayOfWeek - 1]} · {nextTodayCourse.name} ·{' '}
                  {nextTodayCourse.location} (
                  {formatPeriodTimeRange(nextTodayCourse.startPeriod, nextTodayCourse.endPeriod)})
                </span>
              ) : (
                <span className="status-pill font-mono">今日无排课 · 享受专注时光</span>
              )}
            </div>
            <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
              左右拖拽网格可切换周次 · 点击卡片展开详情
            </span>
          </div>

          <TimetableGrid
            courses={state.courses}
            currentWeek={state.currentWeek}
            now={now}
            staggerSeed={staggerSeed}
            onSelectCourse={setSelectedCourse}
            onSwipeWeek={handleChangeWeek}
          />
        </main>

        <AnimatePresence>
          {selectedCourse && (
            <CourseDetailModal
              key={selectedCourse.id}
              course={selectedCourse}
              onClose={() => setSelectedCourse(null)}
              onSave={handleSaveCourse}
              onDelete={handleDeleteCourse}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showImport && (
            <ImportModal
              onClose={() => setShowImport(false)}
              onImported={handleImported}
            />
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

export default App;
