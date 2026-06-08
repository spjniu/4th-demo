import { api } from './client';
import type { CommonResponse } from './userApi';

export interface AssetSnapshot {
  snapshotDate: string;
  totalAmount: number;
}

export interface WeeklyExpenseSnapshot {
  week: number;
  currCumulative: number;
  prevCumulative: number;
}

export interface CategoryExpenseItem {
  category: string;
  amount: number;
  prevAmount: number;
  ratio: number;
  hoverComment: string;
}

export interface ReportDetail {
  id: string;
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  surplus: number;
  trendComment: string;
  eventComment: string;
  marketCondition: string;
  guideline: string;
  performanceStatus: string;
  performanceComment: string;
  assetSnapshots: AssetSnapshot[];
  weeklyExpenses: WeeklyExpenseSnapshot[];
  categoryExpenses: CategoryExpenseItem[];
  createdAt: string;
}

/**
 * 특정 월의 AI 월간 리포트 상세 조회
 * GET /reports/{year}/{month}
 */
export async function getReportDetail(year: number, month: number): Promise<ReportDetail> {
  const response = await api.get<CommonResponse>('/reports/' + year + '/' + month);
  if (!response.success) {
    throw new Error(response.message || '리포트 조회 중 오류가 발생했습니다.');
  }
  return response.data as ReportDetail;
}

export interface AccountBenefit {
  assetId: string;
  accountType: 'ISA' | 'IRP' | 'PENSION_SAVINGS';
  institution: string;
  accountName: string;
  benefitType: string;
  currentContribution: number;
  benefitMaxContribution: number | null;
  annualMaxContribution: number;
  principal: number | null;
  profit: number | null;
  returnRate: number | null;
  taxDeduction: number | null;
}

export interface PensionSummary {
  totalContribution: number;
  combinedBenefitMaxContribution: number;
  deductibleAmount: number;
  deductionRate: number;
  totalTaxDeduction: number;
}

export interface TaxBenefitResponse {
  accounts: AccountBenefit[];
  pensionSummary: PensionSummary;
}

/**
 * 세제 혜택 조회 API
 * GET /tax-benefits
 */
export async function getTaxBenefits(): Promise<TaxBenefitResponse> {
  const response = await api.get<CommonResponse>('/tax-benefits');
  if (!response.success) {
    throw new Error(response.message || '세제 혜택 조회 중 오류가 발생했습니다.');
  }
  return response.data as TaxBenefitResponse;
}

