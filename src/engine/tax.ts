// 中国个人所得税：居民个人综合所得（工资薪金）年度税率表
// 依据：《个人所得税法》综合所得七级超额累进税率 + 每年 6 万元基本减除费用

export const BASIC_DEDUCTION_YEAR = 60000; // 基本减除费用：5000 元/月 × 12
export const DEFAULT_SOCIAL_RATE = 0.105;  // 五险一金个人合计参考比例（养老8%+医疗2%+失业0.5%）
export const MONTHS_PER_YEAR = 12;

interface Bracket {
  cap: number;      // 该级上限（元/年）
  rate: number;     // 税率
  quick: number;    // 速算扣除数
}

// 综合所得年度税率表
const BRACKETS: Bracket[] = [
  { cap: 36000, rate: 0.03, quick: 0 },
  { cap: 144000, rate: 0.10, quick: 2520 },
  { cap: 300000, rate: 0.20, quick: 16920 },
  { cap: 420000, rate: 0.25, quick: 31920 },
  { cap: 660000, rate: 0.30, quick: 52920 },
  { cap: 960000, rate: 0.35, quick: 85920 },
  { cap: Infinity, rate: 0.45, quick: 181920 },
];

/** 按年度应纳税所得额计算个税（元） */
export function calcChinaTax(taxableYear: number): number {
  if (!isFinite(taxableYear) || taxableYear <= 0) return 0;
  const b = BRACKETS.find((x) => taxableYear <= x.cap) ?? BRACKETS[BRACKETS.length - 1];
  return Math.max(0, taxableYear * b.rate - b.quick);
}

/** 边际税率 */
export function getMarginalRate(taxableYear: number): number {
  if (taxableYear <= 0) return 0;
  const b = BRACKETS.find((x) => taxableYear <= x.cap) ?? BRACKETS[BRACKETS.length - 1];
  return b.rate;
}

/**
 * 全年五险一金个人缴纳额。
 * socialMonthly > 0 时按用户手填金额；否则按税前月收入 × 10.5% 估算。
 * （真实缴纳有缴费基数上下限，这里做简化处理，够算攒钱账即可。）
 */
export function calcSocialYear(grossYear: number, socialMonthly: number): number {
  if (socialMonthly > 0) return socialMonthly * MONTHS_PER_YEAR;
  const monthlyIncome = grossYear / MONTHS_PER_YEAR;
  return Math.max(0, monthlyIncome * DEFAULT_SOCIAL_RATE) * MONTHS_PER_YEAR;
}
