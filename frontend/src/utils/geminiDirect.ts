import { shortenUSSTLocation } from '../constants/usst';
import type { Course, ParseResponse, WeekType } from '../types';

const KEY_STORAGE = 'elischedule.v1.gemini_api_key';
const DEFAULT_MODEL = 'gemini-3.8-flash';

const USST_PROMPT = `你是一位专门解析上海理工大学（USST）正方教务系统 / 新教务系统课程表截图的精确结构化提取引擎。

上海理工大学标准作息时间表：
- 第1-2节: 08:00 - 09:35
- 第3-4节: 09:55 - 11:30
- 第5-6节: 13:30 - 15:05
- 第7-8节: 15:20 - 16:55
- 第9-10节: 18:30 - 20:05
- 第11-12节: 20:15 - 21:50

提取规则：
1. 仔细识别课表中的星期列（周一=1 ... 周日=7）与纵轴节次（1..12）。
2. 如果同一个时间格内包含多门课程（例如单周 A 课、双周 B 课，或 1-8 周与 9-16 周不同课程），必须拆分为多条独立的课程记录。
3. 解析周次范围（如 "[1-16周]"、"1-15周(单)"、"2-16周(双)"、"1,3,5-9周"），输出完整的整数数组 weeks，以及 weekType（"all" / "odd" / "even"）与原始 weeksText。
4. 教学楼教室保留简洁名称（如 "一教 204"、"光电 305"）。
5. 严格只输出合法的 JSON 对象，不要包含额外文字，格式如下：
{
  "term": "2026-2027 学年 · 秋季",
  "courses": [
    {
      "name": "高等数学 A(上)",
      "teacher": "张明远",
      "location": "一教 204",
      "dayOfWeek": 1,
      "startPeriod": 1,
      "endPeriod": 2,
      "weeks": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
      "weeksText": "1-16周",
      "weekType": "all",
      "notes": ""
    }
  ]
}`;

export function getSavedGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function saveGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = key.trim();
    if (!trimmed) {
      window.localStorage.removeItem(KEY_STORAGE);
    } else {
      window.localStorage.setItem(KEY_STORAGE, trimmed);
    }
  } catch {
    // Ignore storage errors
  }
}

async function fileToCompressedBase64(file: File): Promise<{ mimeType: string; data: string }> {
  // Compress large Retina screenshots via canvas to avoid Safari fetch payload/timeout drops
  if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
        const commaIdx = dataUrl.indexOf(',');
        return {
          mimeType: 'image/jpeg',
          data: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
        };
      }
      bitmap.close();
    } catch {
      // Fallback to raw FileReader below
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve({
        mimeType: file.type || 'image/png',
        data: commaIdx >= 0 ? result.slice(commaIdx + 1) : result,
      });
    };
    reader.onerror = () => reject(new Error('读取图片文件失败'));
    reader.readAsDataURL(file);
  });
}

function hashColorIndex(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 5;
}

function normalizeParsedCourses(raw: Partial<Course>[]): Course[] {
  return raw
    .filter((c) => typeof c.name === 'string' && c.name.trim() !== '')
    .map((c, idx) => {
      const name = String(c.name).trim();
      const dayOfWeek = Math.max(1, Math.min(7, Number(c.dayOfWeek) || 1));
      const startPeriod = Math.max(1, Math.min(12, Number(c.startPeriod) || 1));
      const endPeriod = Math.max(startPeriod, Math.min(12, Number(c.endPeriod) || startPeriod));
      const weeks =
        Array.isArray(c.weeks) && c.weeks.length > 0
          ? [...new Set(c.weeks.map(Number).filter((w) => w >= 1 && w <= 25))].sort((a, b) => a - b)
          : Array.from({ length: 16 }, (_, i) => i + 1);
      const wt: WeekType =
        c.weekType === 'odd' || c.weekType === 'even' ? c.weekType : 'all';

      return {
        id: `gemini-${dayOfWeek}-${startPeriod}-${endPeriod}-${idx + 1}`,
        name,
        teacher: String(c.teacher || '').trim(),
        location: shortenUSSTLocation(String(c.location || c.rawLocation || '')),
        rawLocation: String(c.rawLocation || c.location || '').trim(),
        dayOfWeek,
        startPeriod,
        endPeriod,
        weeks,
        weeksText: c.weeksText,
        weekType: wt,
        colorIndex: hashColorIndex(name),
        notes: String(c.notes || '').trim(),
      };
    });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function scoreModel(name: string): number {
  const lower = name.toLowerCase();
  if (
    !lower.includes('gemini') ||
    lower.includes('embedding') ||
    lower.includes('tts') ||
    lower.includes('imagen') ||
    lower.includes('veo') ||
    lower.includes('aqa') ||
    lower.includes('robotics') ||
    lower.includes('audio')
  ) {
    return -1;
  }
  let score = 10;
  if (lower.includes('flash')) score += 40;
  if (lower.includes('flash-lite') || lower.includes('lite')) score += 15;
  if (lower.includes('pro')) score += 20;
  if (lower.includes('3.8')) score += 30;
  else if (lower.includes('3.')) score += 25;
  else if (lower.includes('2.5')) score += 15;
  else if (lower.includes('2.0')) score += 10;
  if (lower.includes('preview') || lower.includes('exp')) score -= 3;
  return score;
}

async function discoverAvailableModels(apiKey: string, preferredModel: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=50`
    );
    if (!res.ok) return [preferredModel];
    const data = (await res.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const candidates = (data.models || [])
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((id) => id && scoreModel(id) > 0)
      .sort((a, b) => scoreModel(b) - scoreModel(a));

    if (candidates.length === 0) return [preferredModel];
    const ordered = candidates.includes(preferredModel)
      ? [preferredModel, ...candidates.filter((m) => m !== preferredModel)]
      : candidates;
    return ordered.slice(0, 6);
  } catch {
    return [preferredModel];
  }
}

export async function parseScheduleDirectWithGemini(
  files: File[],
  apiKey: string,
  preferredModel = DEFAULT_MODEL
): Promise<ParseResponse> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('请先输入你的 Gemini API Key');
  }

  const [imageParts, modelsToTry] = await Promise.all([
    Promise.all(
      files.map(async (f) => {
        const compressed = await fileToCompressedBase64(f);
        return {
          inline_data: {
            mime_type: compressed.mimeType,
            data: compressed.data,
          },
        };
      })
    ),
    discoverAvailableModels(trimmedKey, preferredModel),
  ]);

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: USST_PROMPT }] },
    contents: [
      {
        parts: [
          { text: '请提取以下上海理工大学教务系统课程表截图中的所有课程，严格按照 JSON 结构输出。' },
          ...imageParts,
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  let lastError = 'Gemini API 请求失败，请稍后重试。';

  for (const model of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
      } catch {
        throw new Error(
          '连接 Gemini API 失败（Safari Load failed）。请确认当前网络/代理可访问 generativelanguage.googleapis.com 后重试。'
        );
      }

      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        const text: string = body?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(cleaned) as { term?: string; courses?: Partial<Course>[] };
        return {
          term: parsed.term,
          courses: normalizeParsedCourses(Array.isArray(parsed.courses) ? parsed.courses : []),
        };
      }

      lastError = body?.error?.message || `Gemini API 请求失败（HTTP ${res.status}）`;

      // Temporary overload (503/429): brief backoff then retry or fallback to next real model
      if (res.status === 503 || res.status === 429) {
        if (attempt === 0) {
          await sleep(1200);
          continue;
        }
        break;
      }

      // Model unavailable for this key (404/400): try next real model from ListModels
      if (res.status === 404 || res.status === 400) {
        break;
      }

      // Auth/key error (401/403): surface immediately
      throw new Error(lastError);
    }
  }

  throw new Error(`当前可用模型（${modelsToTry.join(', ')}）均暂时繁忙或不可用：${lastError}`);
}
