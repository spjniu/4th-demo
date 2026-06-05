import type { DashboardData } from './dashboardApi';
import { updatePortfolios } from './portfolioApi';

const AI_BASE = 'http://localhost:8000';

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
  salary_allocations: ResetAllocation[];
  portfolio: ResetPortfolioItem[];
}

// 투자성 항목 키워드 (비투자 항목은 제외)
const INVEST_KEYWORDS = ['ETF', '주식', '투자', '채권', '적금', '예금', '저축', '현금성', '파킹', 'CMA', 'IRP', '연금', '비상금'];

function isInvestItem(label: string): boolean {
  return INVEST_KEYWORDS.some(kw => label.includes(kw));
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
    // 포트폴리오 변경: 현재 투자 금액 유지 (비율만 AI 제안으로 변경)
    monthlyInvestAmount = currentInvestAmount > 0
      ? currentInvestAmount
      : Math.round(monthlyIncome * 0.2);
  } else {
    // 월급 배분 변경: AI 제안의 투자성 항목 합계를 새 투자 금액으로
    const investItems = proposal.salary_allocations.filter(a => isInvestItem(a.purpose));
    monthlyInvestAmount = investItems.reduce((s, a) => s + a.plannedAmount, 0);

    // 투자성 항목이 없으면 전체의 20%를 투자 금액으로 설정
    if (monthlyInvestAmount <= 0) {
      monthlyInvestAmount = Math.round(monthlyIncome * 0.2);
    }
  }

  // 기존 포트폴리오 비율 유지하며 새 투자 금액만 업데이트
  // (백엔드에서 portfolios 미전달 시 자동으로 기존 비율로 재계산)
  await updatePortfolios([], monthlyInvestAmount);
}

export async function analyzeGoal(goal: string, dashboard: DashboardData): Promise<AnalyzeResponse> {
  const res = await fetch(`${AI_BASE}/consultant/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_goal: goal, dashboard_snapshot: dashboard }),
  });
  if (!res.ok) throw new Error(`AI 서버 오류 (${res.status})`);
  return res.json();
}

export async function proposeReset(
  goal: string,
  action: 'salary' | 'portfolio',
  dashboard: DashboardData,
): Promise<ProposeResponse> {
  const res = await fetch(`${AI_BASE}/consultant/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_goal: goal, action, dashboard_snapshot: dashboard }),
  });
  if (!res.ok) throw new Error(`AI 서버 오류 (${res.status})`);
  return res.json();
}
