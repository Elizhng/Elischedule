import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Course, ParseResponse } from '../types';
import {
  getSavedGeminiKey,
  parseScheduleDirectWithGemini,
  saveGeminiKey,
} from '../utils/geminiDirect';
import { CloseIcon, FolderUploadIcon } from './Icons';

const PAPER_EASE = [0.2, 0, 0, 1] as const;

const THINKING_STEPS = [
  '识别教务网格与节次坐标…',
  '提取课程、教师与单双周规则…',
  '规范化教学楼简称…',
];

interface ImportModalProps {
  onClose: () => void;
  onImported: (courses: Course[], term?: string) => void;
}

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [apiKey, setApiKey] = useState(() => getSavedGeminiKey());
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isParsing) return;
    setStepIdx(0);
    const timer = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [isParsing]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setErrorMsg('请选择 PNG、JPEG 或 WebP 格式的教务课表截图。');
      return;
    }
    setErrorMsg(null);
    setFiles(imageFiles);
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setIsParsing(true);
    setErrorMsg(null);

    try {
      let parsed: ParseResponse;
      const trimmedKey = apiKey.trim();

      if (trimmedKey) {
        saveGeminiKey(trimmedKey);
        parsed = await parseScheduleDirectWithGemini(files, trimmedKey);
      } else {
        const formData = new FormData();
        files.forEach((f) => formData.append('images', f));

        const res = await fetch('/api/parse-schedule', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 404 || res.status === 405 || res.status === 503) {
            throw new Error(
              '当前为静态托管模式（GitHub Pages），请在下方填入你的免费 Gemini API Key（仅保存在本机浏览器）即可直接解析。'
            );
          }
          throw new Error(data.message || `解析请求失败（HTTP ${res.status}）`);
        }
        parsed = data as ParseResponse;
      }

      if (!Array.isArray(parsed.courses) || parsed.courses.length === 0) {
        throw new Error('未在截图中识别到有效课程，请尝试更清晰的正方/新教务系统课表长图。');
      }

      onImported(parsed.courses, parsed.term);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '解析失败，请稍后重试。');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <motion.div
      className="modal-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.17, ease: PAPER_EASE }}
      onClick={isParsing ? undefined : onClose}
    >
      <motion.div
        className="sheet-card sheet-card--narrow"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.195, ease: PAPER_EASE }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
            GEMINI VISION
          </span>
          {!isParsing && (
            <button
              type="button"
              className="nav-btn nav-btn--sm"
              onClick={onClose}
              aria-label="关闭导入弹窗"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {isParsing ? (
          <div style={{ padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: 'var(--book-cloth)' }} />
            <div className="font-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              {THINKING_STEPS[stepIdx]}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              className={`dropzone${isDragging ? ' dropzone--active' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--ink-1)' }}>
                <FolderUploadIcon />
              </div>
              <div className="font-serif" style={{ fontSize: 16, marginBottom: 4 }}>
                选择上理教务课表截图
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                PNG / JPG / WebP
              </div>
            </div>

            {files.length > 0 && (
              <div className="font-mono" style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
                已选择 {files.length} 张：{files.map((f) => f.name).join('、')}
              </div>
            )}

            <label style={{ display: 'block', paddingTop: 4, borderTop: '1px solid var(--line)' }}>
              <span
                className="ledger-label font-mono"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}
              >
                <span>Gemini API Key (本机保存)</span>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--book-cloth)', textDecoration: 'none' }}
                >
                  免费获取 ↗
                </a>
              </span>
              <input
                type="password"
                className="ledger-input font-mono"
                style={{ fontSize: 12.5 }}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza...（有自建后端时可留空）"
              />
            </label>

            {errorMsg && <div className="error-banner">{errorMsg}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
              <button type="button" className="btn-quiet" onClick={onClose}>
                取消
              </button>
              <button
                type="button"
                className="btn-ink"
                disabled={files.length === 0}
                onClick={handleSubmit}
              >
                开始解析
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
