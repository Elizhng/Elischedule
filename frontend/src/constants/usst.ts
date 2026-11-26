import type { Course, PeriodSlot } from '../types';

export const USST_PERIODS: PeriodSlot[] = [
  { period: 1, start: '08:00', end: '08:45', startMin: 480, endMin: 525, blockLabel: '08:00' },
  { period: 2, start: '08:50', end: '09:35', startMin: 530, endMin: 575, blockLabel: '09:35' },
  { period: 3, start: '09:55', end: '10:40', startMin: 595, endMin: 640, blockLabel: '09:55' },
  { period: 4, start: '10:45', end: '11:30', startMin: 645, endMin: 690, blockLabel: '11:30' },
  { period: 5, start: '13:30', end: '14:15', startMin: 810, endMin: 855, blockLabel: '13:30' },
  { period: 6, start: '14:20', end: '15:05', startMin: 860, endMin: 905, blockLabel: '15:05' },
  { period: 7, start: '15:20', end: '16:05', startMin: 920, endMin: 965, blockLabel: '15:20' },
  { period: 8, start: '16:10', end: '16:55', startMin: 970, endMin: 1015, blockLabel: '16:55' },
  { period: 9, start: '18:30', end: '19:15', startMin: 1110, endMin: 1155, blockLabel: '18:30' },
  { period: 10, start: '19:20', end: '20:05', startMin: 1160, endMin: 1205, blockLabel: '20:05' },
  { period: 11, start: '20:15', end: '21:00', startMin: 1215, endMin: 1260, blockLabel: '20:15' },
  { period: 12, start: '21:05', end: '21:50', startMin: 1265, endMin: 1310, blockLabel: '21:50' },
];

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const WEEKDAY_MONO = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const BUILDING_SHORTCUTS: Array<[string, string]> = [
  ['第一教学楼', '一教'],
  ['第二教学楼', '二教'],
  ['第三教学楼', '三教'],
  ['第四教学楼', '四教'],
  ['第五教学楼', '五教'],
  ['光电信息大楼', '光电'],
  ['光电大楼', '光电'],
  ['综合教学楼', '综合'],
  ['综合楼', '综合'],
  ['图文信息中心', '图文'],
  ['公共实验中心', '公实'],
  ['卓越楼', '卓越'],
  ['军工路校区', ''],
];

export function shortenUSSTLocation(raw: string): string {
  let out = raw.trim();
  if (!out) return '';
  for (const [full, short] of BUILDING_SHORTCUTS) {
    out = out.split(full).join(short);
  }
  out = out.replace(/\s+/g, ' ').trim();
  if (!out.includes(' ')) {
    out = out.replace(/^([\u4e00-\u9fa5]+)([A-Za-z]?\d+[A-Za-z0-9-]*)$/, '$1 $2');
  }
  return out;
}

export function formatPeriodTimeRange(startPeriod: number, endPeriod: number): string {
  const s = USST_PERIODS[Math.max(0, startPeriod - 1)];
  const e = USST_PERIODS[Math.min(USST_PERIODS.length - 1, endPeriod - 1)];
  if (!s || !e) return '';
  return `${s.start} - ${e.end}`;
}

const range = (a: number, b: number, step = 1) => {
  const arr: number[] = [];
  for (let i = a; i <= b; i += step) arr.push(i);
  return arr;
};

export const DEFAULT_SAMPLE_COURSES: Course[] = [
  {
    id: 'usst-1',
    name: '高等数学 A(上)',
    teacher: '张明远',
    location: '一教 204',
    rawLocation: '第一教学楼204',
    dayOfWeek: 1,
    startPeriod: 1,
    endPeriod: 2,
    weeks: range(1, 16),
    weeksText: '1-16周',
    weekType: 'all',
    colorIndex: 0,
    notes: '需带同济第八版教材与习题册',
  },
  {
    id: 'usst-2',
    name: '数据结构与算法',
    teacher: '陈思齐',
    location: '光电 502',
    rawLocation: '光电信息大楼502',
    dayOfWeek: 1,
    startPeriod: 5,
    endPeriod: 6,
    weeks: range(1, 16),
    weeksText: '1-16周',
    weekType: 'all',
    colorIndex: 1,
    notes: '上机实验请提前配置好 C++/Go 环境',
  },
  {
    id: 'usst-3',
    name: '大学物理 B',
    teacher: '周文渊',
    location: '二教 310',
    rawLocation: '第二教学楼310',
    dayOfWeek: 2,
    startPeriod: 3,
    endPeriod: 4,
    weeks: range(1, 16),
    weeksText: '1-16周',
    weekType: 'all',
    colorIndex: 2,
    notes: '期中随堂测验在第 9 周',
  },
  {
    id: 'usst-4',
    name: '物理实验（单周）',
    teacher: '林致远',
    location: '公实 108',
    rawLocation: '公共实验中心108',
    dayOfWeek: 2,
    startPeriod: 7,
    endPeriod: 8,
    weeks: range(1, 15, 2),
    weeksText: '1-15周(单)',
    weekType: 'odd',
    colorIndex: 3,
    notes: '需提前撰写预习报告并带坐标纸',
  },
  {
    id: 'usst-5',
    name: '工程伦理研讨（双周）',
    teacher: '许知微',
    location: '综合 A201',
    rawLocation: '综合楼A201',
    dayOfWeek: 2,
    startPeriod: 7,
    endPeriod: 8,
    weeks: range(2, 16, 2),
    weeksText: '2-16周(双)',
    weekType: 'even',
    colorIndex: 4,
    notes: '小组案例汇报',
  },
  {
    id: 'usst-6',
    name: '高等数学 A(上)',
    teacher: '张明远',
    location: '一教 204',
    rawLocation: '第一教学楼204',
    dayOfWeek: 3,
    startPeriod: 1,
    endPeriod: 2,
    weeks: range(1, 16),
    weeksText: '1-16周',
    weekType: 'all',
    colorIndex: 0,
  },
  {
    id: 'usst-7',
    name: '大学英语读写译',
    teacher: 'Rachel Lin',
    location: '三教 412',
    rawLocation: '第三教学楼412',
    dayOfWeek: 3,
    startPeriod: 5,
    endPeriod: 6,
    weeks: range(1, 16),
    weeksText: '1-16周',
    weekType: 'all',
    colorIndex: 4,
  },
  {
    id: 'usst-8',
    name: '光电信息导论',
    teacher: '顾长风',
    location: '光电 305',
    rawLocation: '光电信息大楼305',
    dayOfWeek: 4,
    startPeriod: 3,
    endPeriod: 4,
    weeks: range(1, 14),
    weeksText: '1-14周',
    weekType: 'all',
    colorIndex: 1,
  },
  {
    id: 'usst-9',
    name: '设计思维与人机交互',
    teacher: '苏婉清',
    location: '图文 201',
    rawLocation: '图文信息中心201',
    dayOfWeek: 4,
    startPeriod: 9,
    endPeriod: 10,
    weeks: range(1, 12),
    weeksText: '1-12周',
    weekType: 'all',
    colorIndex: 3,
    notes: '晚间选修，需带笔记本电脑',
  },
  {
    id: 'usst-10',
    name: '数据结构与算法',
    teacher: '陈思齐',
    location: '光电 502',
    rawLocation: '光电信息大楼502',
    dayOfWeek: 5,
    startPeriod: 1,
    endPeriod: 2,
    weeks: range(1, 16),
    weeksText: '1-16周',
    weekType: 'all',
    colorIndex: 1,
  },
  {
    id: 'usst-11',
    name: '大学物理 B',
    teacher: '周文渊',
    location: '二教 310',
    rawLocation: '第二教学楼310',
    dayOfWeek: 5,
    startPeriod: 5,
    endPeriod: 6,
    weeks: range(1, 16),
    weeksText: '1-16周',
    weekType: 'all',
    colorIndex: 2,
  },
];
