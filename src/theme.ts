export const colors = {
  // 背景与卡片
  bg: '#f8fafc',
  card: '#ffffff',

  // 文字
  text: '#1f2937',
  textStrong: '#111827',
  sub: '#6b7280',

  // 边框与分隔
  border: '#e5e7eb',
  divider: '#f3f4f6',

  // 主色调：靛蓝
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primaryLight: '#eef2ff',

  // 成功/正向：翠绿
  green: '#10b981',
  greenDark: '#059669',
  greenBg: '#ecfdf5',

  // 危险/负向：玫瑰红
  red: '#f43f5e',
  redDark: '#e11d48',
  redBg: '#fff1f2',

  // 警告/提醒：琥珀
  amber: '#f59e0b',
  amberDark: '#d97706',
  amberBg: '#fffbeb',

  // 紫色
  purple: '#8b5cf6',
  purpleDark: '#7c3aed',
  purpleBg: '#f5f3ff',

  // 深蓝
  navy: '#1e3a8a',
  navyBg: '#eff6ff',

  // 青绿
  cyan: '#06b6d4',
  cyanBg: '#ecfeff',

  // 通用
  danger: '#ef4444',
  gray: '#9ca3af',
  white: '#ffffff',
  black: '#000000',
};

// 千分位格式化，保留两位小数
const formatNum = (n: number): string => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${withSep}.${dec}`;
};

/** 人民币金额，例：¥1,234.56 */
export const currency = (n: number): string => {
  const sign = n < 0 ? '-' : '';
  return `${sign}¥${formatNum(n)}`;
};

/** 不带小数的整数金额，例：¥1,235 */
export const currencyInt = (n: number): string => {
  const sign = n < 0 ? '-' : '';
  const int = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}¥${int}`;
};
