import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Sparkles, X } from 'lucide-react';
import type { Course, ParseResponse } from '../types';

const THINKING_STEPS = [
  '正在识别上理教务网格与节次坐标…',
  '正在提取课程名称、教师与单双周规则…',
  '正在规范化教学楼简称（第一教学楼 → 一教）…',
];

interface ImportModalProps {
  onClose: () => void;
  onImported: (courses: Course[], term?: string) => void;
}

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isParsing) return;
    setStepIdx(0);
    const timer = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isParsing]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setErrorMsg('请选择 PNG、JPEG 或 WebP 格式的教务系统课表截图。');
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
      const formData = new FormData();
      files.forEach((f) => formData.append('images', f));

      const res = await fetch('/api/parse-schedule', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `解析请求失败（HTTP ${res.status}）`);
      }

      const parsed = data as ParseResponse;
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
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={isParsing ? undefined : onClose}
    >
      <motion.div
        className="modal-card"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>
              GEMINI VISION · USST PARSER
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>截图导入上理课表</h2>
          </div>
          {!isParsing && (
            <button
              type="button"
              className="icon-btn icon-btn-round"
              onClick={onClose}
              aria-label="关闭导入弹窗"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="modal-body">
          {isParsing ? (
            <div className="thinking-box">
              <div className="thinking-orb claude-halo" />
              <motion.div
                key={stepIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="font-mono"
                style={{ fontSize: 13, color: 'var(--text-primary)' }}
              >
                {THINKING_STEPS[stepIdx]}
              </motion.div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                正在通过 Gemini 多模态视觉模型提取结构化 JSON，请稍候…
              </div>
            </div>
          ) : (
            <>
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
                <ImagePlus size={26} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  点击选择或拖拽正方 / 新教务系统课表截图
                </div>
                <div className="font-mono" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  支持单张长图或多张拼接 · PNG / JPG / WebP
                </div>
              </div>

              {files.length > 0 && (
                <div
                  className="font-mono"
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    padding: '8px 12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  已选择 {files.length} 张截图：{files.map((f) => f.name).join('、')}
                </div>
              )}

              {errorMsg && <div className="error-banner">{errorMsg}</div>}

              <div className="modal-footer">
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  解析结果将自动保存在本地
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="icon-btn" onClick={onClose}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={files.length === 0}
                    style={{ opacity: files.length === 0 ? 0.5 : 1 }}
                    onClick={handleSubmit}
                  >
                    <Sparkles size={14} />
                    开始 AI 解析
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
