// 全局数据类型定义（中国版：金额单位统一为人民币元，生活开销按月录入）

export type SalaryType = 'month' | 'day'; // 月薪 / 日薪

export interface Job {
  id: string;
  name: string;
  type: SalaryType;
  amount: number;   // 月薪 或 日薪（税前，元）
  duration: number; // 工作月数 或 天数
}

export interface Asset {
  id: string;
  name: string;
  cost: number;     // 工具/设备总价（元）
  prop: number;     // 工作用途比例 %
  days: number;     // 分摊天数
}

export interface Expense {
  id: string;
  name: string;
  amount: number;   // 每月固定开销（元）
}

export interface BigItem {
  id: string;
  name: string;
  price: number;    // 物品总价（元）
  days: number;     // 分摊天数
}

export interface YearItem {
  id: string;
  label: string;    // 年份标签，如 2026
}

// 个税专项附加扣除（每月固定金额）
export interface SpecialDeduction {
  id: string;
  name: string;     // 如：住房租金 / 子女教育 / 赡养老人
  monthly: number;  // 每月可扣除金额（元）
}

// 持久化到本机的全部业务数据
export interface AppData {
  totalGoal: number;
  jobs: Job[];
  assets: Asset[];
  expenses: Expense[];
  bigItems: BigItem[];
  years: YearItem[];
  socialMonthly: number;                 // 五险一金个人月缴合计（元）；填 0 表示按工资自动估算
  housingFundMonthly: number;            // 其中「公积金」个人月缴部分（仍是自己的钱，不算支出）
  specialDeductions: SpecialDeduction[]; // 专项附加扣除明细
  savedAmount: number;                   // 目前实际已经攒下来的钱（元，手动更新）
}

// 计算引擎输出的全部派生指标
export interface YearProjection {
  id: string;
  label: string;
  index: number;        // 第几年（从 1 开始）
  cumulative: number;   // 年底累计积攒
}

export interface Analysis {
  lastLabel: string;
  lastIndex: number;
  finalAccumulation: number;
  meetsGoal: boolean;
  overflow: number;     // 达标时溢出的资金
  gap: number;          // 未达标时的缺口
}

export interface CalcResult {
  totalGoal: number;
  goalDay: number;          // 每日必须攒下的死目标（= totalGoal / goalDays）
  goalDays: number;         // 平摊基准天数（跟随年份条数动态变化）
  goalYears: number;        // 平摊基准年数

  grossYear: number;        // 全年税前总收入（实际参与计算）
  grossMonth: number;       // 平均每月税前收入
  grossDay: number;         // 平均每天税前收入

  // 以下全部为「参考值」：只用来提醒大概要交多少税，不参与攒钱计算
  socialYear: number;       // 全年五险一金个人缴纳（参考）
  specialYear: number;      // 全年专项附加扣除合计（参考）
  deductionYear: number;    // 全年税前扣除合计（参考）
  taxableYear: number;      // 应纳税所得额（参考）
  taxRefYear: number;       // 参考个税（不参与计算）
  netRefYear: number;       // 参考税后年收入（不参与计算）
  netRefMonth: number;      // 参考税后月收入（不参与计算）
  marginalRate: number;     // 参考边际税率
  housingFundYear: number;  // 公积金个人缴纳（全年）—— 仍是自己的钱

  // 攒钱进度
  savedAmount: number;      // 已攒金额
  savingsProgress: number;  // 完成度 0~1
  remainingToGoal: number;  // 还差多少
  daysToGoal: number;       // 按当前速度还要多少天（<=0 表示无法达成，返回 -1）
  emergencyMonths: number;  // 已攒金额够支撑几个月的生活开销

  totalWorkDayCost: number; // 工作工具每日摊销现金流出
  totalExpMonth: number;    // 每月固定生活总流出
  totalExpDay: number;      // 每日生活成本
  totalBigDayCost: number;  // 大件每日分期

  auditNetDay: number;
  auditNetMonth: number;
  auditExpDay: number;
  auditExpMonth: number;

  surplusDay: number;       // 每日实际盈余
  surplusMonth: number;     // 每月实际盈余

  tlDay: number;            // 每天实际进包
  tlWeek: number;           // 每周存下
  tlMonth: number;          // 每月积攒

  finalDailyDisposable: number; // 今日任意支配额度（零花钱）

  yearProjections: YearProjection[];
  analysis: Analysis | null;
}
