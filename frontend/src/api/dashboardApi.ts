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
  totalExpense: number;
  isBudgetExceeded: boolean;
  budgetExceedRate: number;
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

export interface DashboardData {
  user: DashboardUser;
  assetsSummary: DashboardAssetsSummary;
  salaryPlan: DashboardSalaryPlan;
  events: DashboardEvent[];
  consumption: DashboardConsumption;
  portfolio: DashboardPortfolioItem[];
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
