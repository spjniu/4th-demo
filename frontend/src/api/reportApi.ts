import { api } from './client';
import type { CommonResponse } from './userApi';

export interface AssetSnapshot {
  snapshotDate: string;
  totalAmount: number;
}

export interface WeeklyExpense {
  week: number;
  currCumulative: number;
  prevCumulative: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  prevAmount: number;
  ratio: number;
  hoverComment: string;
}

export interface PortfolioBreakdownItem {
  productName: string;
  productType: string;
  ticker: string;
  monthlyChangeRate: number;
}

export interface TaxBenefitSummary {
  irpContribution: number;
  irpCumulativeDeduction: number;
  pensionContribution: number;
  pensionCumulativeDeduction: number;
  totalTaxSavings: number;
}

export interface MiniChallenge {
  title: string;
  challengeSubType: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  rewardStockTicker: string | null;
}

export interface MonthlyReportData {
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
  assetChangeRate: number;
  assetSnapshots: AssetSnapshot[];
  weeklyExpenses: WeeklyExpense[];
  categoryExpenses: CategoryExpense[];
  portfolioBreakdown: PortfolioBreakdownItem[];
  taxBenefitSummary: TaxBenefitSummary;
  miniChallenges: MiniChallenge[];
  createdAt: string;
}

export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReportData> {
  const res = await api.get<CommonResponse>(`/reports/${year}/${month}`);
  if (!res.success) {
    throw new Error(res.message || '리포트 조회 중 오류가 발생했습니다.');
  }
  return res.data as MonthlyReportData;
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

export async function getTaxBenefits(): Promise<TaxBenefitResponse> {
  const response = await api.get<CommonResponse>('/tax-benefits');
  if (!response.success) {
    throw new Error(response.message || '세제 혜택 조회 중 오류가 발생했습니다.');
  }
  return response.data as TaxBenefitResponse;
}
