import { api } from './client';
import type { CommonResponse } from './userApi';

export interface DashboardUser {
  id: string;
  name: string;
}

export interface DashboardAssetsSummary {
  totalBalance: number;
  investmentBalance: number;
  cashBalance: number;
}

export interface DashboardAllocation {
  purpose: string | null;
  plannedAmount: number;
}

export interface DashboardSalaryPlan {
  monthlyIncome: number;
  investmentAmount: number | null;
  surplus: number | null;
  allocations: DashboardAllocation[];
}

export interface DashboardEvent {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  progressRate: number;
  deadline: string;
  dday: number;
  status: string;
}

export interface DashboardCategoryExpense {
  categoryName: string;
  expenseAmount: number;
  percentage: number;
  sub: string | null;
}

export interface DashboardConsumption {
  referenceMonth: number;
  totalExpense: number;        // 이번 달 소비총합
  lastMonthExpense: number;    // 저번 달 소비총합 (예산 기준선)
  isBudgetExceeded: boolean;   // 이번 달 > 저번 달
  budgetExceedRate: number;    // 저번 달 대비 초과율 (%)
  weeklyExpenses: number[];    // 이번 주 요일별 지출 [월,화,수,목,금]
  categories: DashboardCategoryExpense[];
}

export interface DashboardPortfolioSubItem {
  name: string;
  ratio: number;
  rate: string;
}

export interface DashboardPortfolioItem {
  categoryLabel: string;
  ratio: number;
  assetAmount: number;
  rate: string;
  items: DashboardPortfolioSubItem[];
}

export interface DashboardTaxSavingBar {
  label: string;          // "IRP" / "연금저축"
  contribution: number;   // 현재 납입액
  deductible: number;     // 실제 공제 대상액 (합산 900만·연금 600만 한도 반영)
  limit: number;          // 세액공제 한도 (연금 600만 / IRP 합산 900만)
}

export interface DashboardTaxSaving {
  deductionRate: number;     // 적용 공제율(%) 16.5 / 13.2
  totalTaxDeduction: number; // 연금저축 + IRP 합산 예상 세액공제액
  remaining: number;         // 합산 한도까지 남은 납입 여력
  bars: DashboardTaxSavingBar[];
}

export interface DashboardData {
  user: DashboardUser;
  assetsSummary: DashboardAssetsSummary;
  salaryPlan: DashboardSalaryPlan;
  events: DashboardEvent[];
  consumption: DashboardConsumption;
  portfolio: DashboardPortfolioItem[];
  taxSaving: DashboardTaxSaving;
}

/**
 * GET /dashboard — 메인 대시보드 종합 조회
 */
export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get<CommonResponse>('/dashboard');
  if (!res.success) {
    throw new Error(res.message || '대시보드 조회 중 오류가 발생했습니다.');
  }
  return res.data as DashboardData;
}
