import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CourseDetailModal } from './components/CourseDetailModal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EmblemIcon,
  FolderUploadIcon,
  LocateWeekIcon,
  MoonIcon,
  SunIcon,
  TimetableIcon,
} from './components/Icons';
import { ImportModal } from './components/ImportModal';
import { TimetableGrid } from './components/TimetableGrid';
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState(state);
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const nextTodayCourse = useMemo(() => {
    const today = getTodayDayOfWeek(now);
    return state.courses
      .filter((c) => isCourseActiveInWeek(c, state.currentWeek) && c.dayOfWeek === today)
      .sort((a, b) => a.startPeriod - b.startPeriod)[0];
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

  const clockText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="app-shell">
      <aside className="app-rail" aria-label="主导航">
        <div className="rail-group">
          <button
            type="button"
            className="nav-btn"
            onClick={() => setState((prev) => ({ ...prev, currentWeek: 12 }))}
            title="Elischedule"
            aria-label="Elischedule"
          >
            <EmblemIcon />
          </button>

          <div className="rail-divider" />

          <button
            type="button"
            className="nav-btn"
            data-active="true"
            title="周课表"
            aria-label="周课表"
          >
            <TimetableIcon />
          </button>

          <button
            type="button"
            className="nav-btn"
            onClick={() => setShowImport(true)}
            title="导入教务截图"
            aria-label="导入教务截图"
          >
            <FolderUploadIcon />
          </button>

          <button
            type="button"
            className="nav-btn"
            onClick={() => setState((prev) => ({ ...prev, currentWeek: 12 }))}
            title="回到当前周"
            aria-label="回到当前周"
          >
            <LocateWeekIcon />
          </button>
        </div>

        <button
          type="button"
          className="nav-btn"
          onClick={handleToggleTheme}
          title={state.theme === 'light' ? '切换 Slate 暗色纸感' : '切换 Ivory 日间纸感'}
          aria-label="切换主题"
        >
          {state.theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <div className="header-left">
            <h1 className="week-heading font-serif">
              Week {String(state.currentWeek).padStart(2, '0')}
            </h1>
            <div className="week-arrows" role="group" aria-label="周次切换">
              <button
                type="button"
                className="nav-btn nav-btn--sm"
                onClick={() => handleChangeWeek(-1)}
                disabled={state.currentWeek <= 1}
                aria-label="上一周"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                className="nav-btn nav-btn--sm"
                onClick={() => handleChangeWeek(1)}
                disabled={state.currentWeek >= state.totalWeeks}
                aria-label="下一周"
              >
                <ChevronRightIcon />
              </button>
            </div>
            <span className="parity-tag font-mono">
              {state.currentWeek % 2 === 1 ? 'ODD' : 'EVEN'}
            </span>
          </div>

          <div className="live-coordinate font-mono">
            <span className="live-dot" />
            <span>{clockText}</span>
            {nextTodayCourse && (
              <>
                <span style={{ color: 'var(--ink-3)' }}>/</span>
                <span>{nextTodayCourse.location}</span>
              </>
            )}
          </div>
        </header>

        <main className="main-container">
          <TimetableGrid
            courses={state.courses}
            currentWeek={state.currentWeek}
            now={now}
            staggerSeed={staggerSeed}
            onSelectCourse={setSelectedCourse}
            onSwipeWeek={handleChangeWeek}
          />
        </main>
      </div>

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
  );
}

export default App;
