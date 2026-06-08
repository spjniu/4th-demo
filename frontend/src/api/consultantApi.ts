import { api } from './client';
import { updatePortfolios } from './portfolioApi';
import type { DashboardData } from './dashboardApi';

interface CommonResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AnalyzeResponse {
  action: 'salary' | 'portfolio';
  reasoning: string;
}

export interface ResetAllocation {
  purpose: string;
  plannedAmount: number;
  ratio: number;
}

export interface ResetPortfolioItem {
  assetType: string;
  ratio: number;
}

export interface ProposeResponse {
  summary: string;
  explanation: string;
  salaryAllocations: ResetAllocation[];
  portfolio: ResetPortfolioItem[];
}

const INVEST_KEYWORDS = ['ETF', '주식', '투자', '채권', '적금', '예금', '저축', '현금성', '파킹', 'CMA', 'IRP', '연금', '비상금'];

function isInvestItem(label: string): boolean {
  return INVEST_KEYWORDS.some(kw => label.includes(kw));
}

export async function analyzeGoal(goal: string): Promise<AnalyzeResponse> {
  const res = await api.post<CommonResponse<AnalyzeResponse>>('/consultant/analyze', { userGoal: goal });
  if (!res.success) throw new Error(res.message || '목표 분석 실패');
  return res.data;
}

export async function proposeReset(
  goal: string,
  action: 'salary' | 'portfolio',
): Promise<ProposeResponse> {
  const res = await api.post<CommonResponse<ProposeResponse>>('/consultant/propose', { userGoal: goal, action });
  if (!res.success) throw new Error(res.message || '재설정 제안 실패');
  return res.data;
}

export async function applyReset(
  proposal: ProposeResponse,
  action: 'salary' | 'portfolio',
  dashboard: DashboardData,
): Promise<void> {
  const currentInvestAmount = dashboard.salaryPlan.investmentAmount ?? 0;
  const monthlyIncome = dashboard.salaryPlan.monthlyIncome ?? 0;

  let monthlyInvestAmount: number;

  if (action === 'portfolio') {
    monthlyInvestAmount = currentInvestAmount > 0
      ? currentInvestAmount
      : Math.round(monthlyIncome * 0.2);
  } else {
    const investItems = proposal.salaryAllocations.filter(a => isInvestItem(a.purpose));
    monthlyInvestAmount = investItems.reduce((s, a) => s + a.plannedAmount, 0);
    if (monthlyInvestAmount <= 0) {
      monthlyInvestAmount = Math.round(monthlyIncome * 0.2);
    }
  }

  await updatePortfolios([], monthlyInvestAmount);
}
