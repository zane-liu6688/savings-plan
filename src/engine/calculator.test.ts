import { compute } from './calculator';
import { calcChinaTax, BASIC_DEDUCTION_YEAR } from './tax';
import type { AppData } from '../types';

// 用一套典型国内数据做断言，每一步都能手算核对
const defaultData: AppData = {
  totalGoal: 100000,
  jobs: [{ id: 'j1', name: '主职工资', type: 'month', amount: 8000, duration: 12 }],
  assets: [{ id: 'a1', name: '工作用电动车', cost: 3000, prop: 100, days: 365 }],
  expenses: [
    { id: 'e1', name: '房租', amount: 2000 },
    { id: 'e2', name: '吃饭买菜', amount: 1500 },
  ],
  bigItems: [{ id: 'b1', name: '换新手机', price: 3000, days: 120 }],
  years: [{ id: 'y1', label: '2026' }, { id: 'y2', label: '2027' }, { id: 'y3', label: '2028' }],
  socialMonthly: 0, // 自动按 10.5% 估算
  housingFundMonthly: 0,
  savedAmount: 0,
  specialDeductions: [{ id: 'd1', name: '住房租金', monthly: 1500 }],
};

let passed = 0;
let failed = 0;

function approx(name: string, actual: number, expected: number, tol = 0.01) {
  if (Math.abs(actual - expected) <= tol) {
    passed++;
    console.log(`  ✓ ${name}: ${actual.toFixed(2)}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}: got ${actual.toFixed(2)}, expected ${expected.toFixed(2)}`);
  }
}

const r = compute(defaultData);

console.log('攒钱计划（中国版）引擎测试');
approx('全年税前总收入 grossYear', r.grossYear, 96000);
approx('五险一金(自动10.5%) socialYear', r.socialYear, 8000 * 0.105 * 12);
approx('专项附加扣除(住房租金1500/月) specialYear', r.specialYear, 18000);
approx('全年扣除合计 deductionYear', r.deductionYear, 10080 + 18000);
approx('应纳税所得额 taxableYear', r.taxableYear, 96000 - BASIC_DEDUCTION_YEAR - 28080);
approx('全年个税(参考值) taxRefYear(3%)', r.taxRefYear, (96000 - 60000 - 28080) * 0.03);
approx('参考税后年收入 netRefYear', r.netRefYear, 96000 - 28080 - 237.6);
approx('参考税后月收入 netRefMonth', r.netRefMonth, (96000 - 28080 - 237.6) / 12);
approx('平均每月税前收入 grossMonth', r.grossMonth, 8000);
approx('平均每天税前收入 grossDay', r.grossDay, 96000 / 365);
approx('边际税率', r.marginalRate, 0.03);

approx('生活开销每日 totalExpDay', r.totalExpDay, (3500 * 12) / 365);
approx('工具每日摊销 totalWorkDayCost', r.totalWorkDayCost, 3000 / 365);
approx('大件每日分期 totalBigDayCost', r.totalBigDayCost, 3000 / 120);

const expDay = (3500 * 12) / 365 + 3000 / 120 + 3000 / 365;
approx('每日花销总计 auditExpDay', r.auditExpDay, expDay);
// 关键：收入按税前全额计，税不进现金流
approx('每日实际盈余 surplusDay(不扣税)', r.surplusDay, 96000 / 365 - expDay);

approx('平摊基准 goalDays(3年)', r.goalDays, 1095);
approx('每日攒钱目标 goalDay', r.goalDay, 100000 / 1095);
approx('今日可支配 finalDailyDisposable(不扣税)', r.finalDailyDisposable,
  96000 / 365 - expDay - 100000 / 1095);

approx('2028 年底累计', r.yearProjections[2].cumulative, r.surplusDay * 365 * 3);

// 加第 4 个年份后，平摊基准必须变成 1460 天
const fourYears = compute({
  ...defaultData,
  years: [...defaultData.years, { id: 'y4', label: '2029' }],
});
approx('4 年平摊基准 goalDays', fourYears.goalDays, 1460);
approx('4 年每日目标 goalDay', fourYears.goalDay, 100000 / 1460);

// 中国个税税率表抽查
approx('个税 3% 级 36000', calcChinaTax(36000), 1080);
approx('个税 10% 级 40000', calcChinaTax(40000), 40000 * 0.1 - 2520);
approx('个税 20% 级 150000', calcChinaTax(150000), 150000 * 0.2 - 16920);
approx('个税 45% 级 1000000', calcChinaTax(1000000), 1000000 * 0.45 - 181920);
approx('个税 收入为负不交税', calcChinaTax(-100), 0);

// 手填五险一金优先于自动估算
const manualSocial = compute({ ...defaultData, socialMonthly: 1000 });
approx('手填五险一金 socialYear', manualSocial.socialYear, 12000);
approx('公积金全年 housingFundYear', compute({ ...defaultData, socialMonthly: 1000, housingFundMonthly: 500 }).housingFundYear, 6000);

// 攒钱进度
const progress = compute({ ...defaultData, savedAmount: 25000 });
approx('完成度 savingsProgress', progress.savingsProgress, 0.25);
approx('还差 remainingToGoal', progress.remainingToGoal, 75000);
approx('还要多少天 daysToGoal', progress.daysToGoal, 75000 / progress.surplusDay);
approx('够撑几个月 emergencyMonths', progress.emergencyMonths, 25000 / 3500);

console.log(`\n结果：${passed} 通过, ${failed} 失败`);
if (failed > 0) process.exit(1);
