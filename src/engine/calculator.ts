import type { AppData, CalcResult, Analysis, YearProjection } from '../types';
import { calcChinaTax, calcSocialYear, getMarginalRate, BASIC_DEDUCTION_YEAR } from './tax';

export const DAYS_PER_YEAR = 365;
export const DEFAULT_GOAL_YEARS = 3; // 未添加任何年份时的默认平摊年数
export const DAYS_IN_MONTH = 30.4167;

/**
 * 核心计算引擎：把全部录入数据算成派生指标。
 * 口径：人民币、按月录入、中国个税（综合所得年度汇算）。
 * 纯函数，可在 Node 下单测。
 */
export function compute(data: AppData): CalcResult {
  const { totalGoal, jobs, assets, expenses, bigItems, years } = data;
  const socialMonthly = data.socialMonthly ?? 0;
  const housingFundMonthly = data.housingFundMonthly ?? 0;
  const savedAmount = data.savedAmount ?? 0;
  const specialDeductions = data.specialDeductions ?? [];

  // 1. 收入汇总（月薪×月数 或 日薪×天数，均为税前总额）
  let grossYear = 0;
  for (const job of jobs) {
    grossYear += job.amount * job.duration;
  }

  // 2. 五险一金 + 专项附加扣除（仅用于「参考税额」，不进现金流）
  const socialYear = calcSocialYear(grossYear, socialMonthly);
  const specialYear = specialDeductions.reduce((sum, d) => sum + (d.monthly || 0) * 12, 0);
  const deductionYear = socialYear + specialYear;

  // 3. 中国个税（仅作参考提醒，不参与攒钱计算）
  const taxableYear = Math.max(0, grossYear - BASIC_DEDUCTION_YEAR - deductionYear);
  const taxRefYear = calcChinaTax(taxableYear);
  const netRefYear = Math.max(0, grossYear - deductionYear - taxRefYear);
  const netRefMonth = netRefYear / 12;
  const marginalRate = getMarginalRate(taxableYear);
  const housingFundYear = Math.min(housingFundMonthly, socialMonthly > 0 ? socialMonthly : (grossYear / 12) * 0.105) * 12;

  // 收入按税前全额计入现金流：实际交了多少税，由用户自己记到「生活」开销里
  const grossMonth = grossYear / 12;
  const grossDay = grossYear / DAYS_PER_YEAR;

  // 4. 工作工具/设备（按月或按天分摊成每日成本）
  let totalDeductAmt = 0;
  let totalWorkDayCost = 0;
  for (const a of assets) {
    totalDeductAmt += a.cost * (a.prop / 100);
    const days = a.days > 0 ? a.days : 1;
    totalWorkDayCost += a.cost / days;
  }

  // 5. 生活开销（按月录入 → 换成每日）
  let totalExpMonth = 0;
  for (const e of expenses) totalExpMonth += e.amount;
  const totalExpDay = (totalExpMonth * 12) / DAYS_PER_YEAR;

  // 6. 大额分期
  let totalBigDayCost = 0;
  for (const b of bigItems) {
    const days = b.days > 0 ? b.days : 1;
    totalBigDayCost += b.price / days;
  }

  // 7. 长期攒钱死目标（平摊基准随「年份投影」条数动态变化）
  const goalYears = years.length > 0 ? years.length : DEFAULT_GOAL_YEARS;
  const goalDays = goalYears * DAYS_PER_YEAR;
  const goalDay = goalDays > 0 ? totalGoal / goalDays : 0;

  // 8. 真实收支核算（收入用税前全额，税收由用户自行记为开销）
  const auditNetDay = grossDay;
  const auditNetMonth = grossMonth;
  const auditExpDay = totalExpDay + totalBigDayCost + totalWorkDayCost;
  const auditExpMonth = auditExpDay * DAYS_IN_MONTH;

  const surplusDay = auditNetDay - auditExpDay;
  const surplusMonth = surplusDay * DAYS_IN_MONTH;

  // 攒钱进度（已存多少 / 还差多少 / 按当前速度要多久 / 够撑几个月）
  const savingsProgress = totalGoal > 0 ? Math.min(1, Math.max(0, savedAmount / totalGoal)) : 0;
  const remainingToGoal = Math.max(0, totalGoal - savedAmount);
  const daysToGoal = remainingToGoal <= 0 ? 0 : surplusDay > 0 ? remainingToGoal / surplusDay : -1;
  const emergencyMonths = totalExpMonth > 0 ? savedAmount / totalExpMonth : 0;

  // 9. 钱袋子短周期蓄水池
  const tlDay = surplusDay;
  const tlWeek = surplusDay * 7;
  const tlMonth = surplusDay * DAYS_IN_MONTH;

  // 10. 顶部看板：今日任意支配额度
  const finalDailyDisposable = surplusDay - goalDay;

  // 11. 无限年份投影
  const yearProjections: YearProjection[] = years.map((yr, i) => {
    const sequentialMultiplier = i + 1;
    return {
      id: yr.id,
      label: yr.label,
      index: sequentialMultiplier,
      cumulative: surplusDay * DAYS_PER_YEAR * sequentialMultiplier,
    };
  });

  let analysis: Analysis | null = null;
  if (years.length > 0) {
    const lastIndex = years.length;
    const lastLabel = years[years.length - 1].label;
    const finalAccumulation = surplusDay * DAYS_PER_YEAR * lastIndex;
    const meetsGoal = finalAccumulation >= totalGoal;
    analysis = {
      lastLabel,
      lastIndex,
      finalAccumulation,
      meetsGoal,
      overflow: meetsGoal ? finalAccumulation - totalGoal : 0,
      gap: meetsGoal ? 0 : totalGoal - finalAccumulation,
    };
  }

  return {
    totalGoal,
    goalDay,
    goalDays,
    goalYears,
    grossYear,
    grossMonth,
    grossDay,
    socialYear,
    specialYear,
    deductionYear,
    taxableYear,
    taxRefYear,
    netRefYear,
    netRefMonth,
    marginalRate,
    housingFundYear,
    savedAmount,
    savingsProgress,
    remainingToGoal,
    daysToGoal,
    emergencyMonths,
    totalWorkDayCost,
    totalExpMonth,
    totalExpDay,
    totalBigDayCost,
    auditNetDay,
    auditNetMonth,
    auditExpDay,
    auditExpMonth,
    surplusDay,
    surplusMonth,
    tlDay,
    tlWeek,
    tlMonth,
    finalDailyDisposable,
    yearProjections,
    analysis,
  };
}
