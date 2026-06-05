import type { DashboardData } from './dashboardApi';
import { getPortfolios, updatePortfolios, type PortfolioItem } from './portfolioApi';

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

// AI 자산 유형 → 백엔드 enum 매핑
const ASSET_TYPE_MAP: Record<string, string> = {
  'ETF':    'STOCK',  '주식':   'STOCK',  '투자':   'STOCK',
  '해외주식': 'STOCK', '국내주식': 'STOCK',
  '채권':   'BOND',
  '적금':   'FIXED',  '예금':   'FIXED',  '저축':   'FIXED',
  '현금성': 'CASH',   '파킹':   'CASH',   'CMA':    'CASH',
  'IRP':    'IRP',    '연금저축': 'IRP',   '연금':   'IRP',
  '비상금': 'EMERGENCY',
};

function toBackendAssetType(label: string): string | null {
  for (const [key, type] of Object.entries(ASSET_TYPE_MAP)) {
    if (label.includes(key)) return type;
  }
  return null; // 생활비·식비 등 비투자 항목
}

export async function applyReset(
  proposal: ProposeResponse,
  action: 'salary' | 'portfolio',
  dashboard: DashboardData,
): Promise<void> {
  const investAmount = dashboard.salaryPlan.investmentAmount ?? 0;

  // 기존 portfolios 가져오기 (assetId 재사용)
  const { portfolios: existing } = await getPortfolios();
  if (!existing || existing.length === 0) throw new Error('기존 포트폴리오 정보가 없어요');

  let monthlyInvestAmount: number;

  if (action === 'portfolio') {
    // AI 비율 → 각 portfolio 항목에 비례 배분
    monthlyInvestAmount = investAmount > 0 ? investAmount : Math.round(
      (dashboard.salaryPlan.monthlyIncome ?? 0) * 0.2
    );
    const total = proposal.portfolio.reduce((s, p) => s + p.ratio, 0) || 100;
    const portfolios: PortfolioItem[] = existing
      .filter(e => e.assetId)
      .map((e, i) => {
        const matched = proposal.portfolio[i];
        const ratio = matched ? matched.ratio / total : 1 / existing.length;
        return { assetType: e.assetType, assetAmount: Math.round(monthlyInvestAmount * ratio), assetId: e.assetId };
      });
    await updatePortfolios(portfolios, monthlyInvestAmount);
  } else {
    // salary: 투자성 항목 합계를 monthlyInvestAmount로, 기존 비율로 배분
    const investItems = proposal.salary_allocations
      .map(a => ({ type: toBackendAssetType(a.purpose), amount: a.plannedAmount }))
      .filter((x): x is { type: string; amount: number } => x.type !== null && x.amount > 0);

    monthlyInvestAmount = investItems.reduce((s, x) => s + x.amount, 0);
    if (monthlyInvestAmount <= 0) throw new Error('적용할 투자 항목이 없어요');

    // 기존 비율 유지하며 새 금액으로 재배분
    const totalExisting = existing.reduce((s, e) => s + (e.assetAmount ?? 0), 0);
    const portfolios: PortfolioItem[] = existing
      .filter(e => e.assetId)
      .map(e => ({
        assetType: e.assetType,
        assetAmount: totalExisting > 0
          ? Math.round(monthlyInvestAmount * (e.assetAmount ?? 0) / totalExisting)
          : Math.round(monthlyInvestAmount / existing.length),
        assetId: e.assetId,
      }));
    await updatePortfolios(portfolios, monthlyInvestAmount);
  }
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
