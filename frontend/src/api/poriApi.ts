import type { DashboardData } from './dashboardApi';
import { analyzeGoal, proposeReset } from './consultantApi';
import { api } from './client';

export interface ProposalEvent {
  title: string;
  targetAmount: string;
  deadline: string;
  userInput: string;
}

export interface ProposalAllocation {
  purpose: string;
  plannedAmount: number;
}

export interface ProposalPortfolioItem {
  assetType: string;
  assetAmount: number;  // 화면 표시용 (investAmount * ratio / 100)
  ratio: number;        // 백엔드 apply 전달용
}

export interface ProposalChanges {
  events: ProposalEvent[];
  salaryAllocations: ProposalAllocation[];
  portfolio: ProposalPortfolioItem[];
}

export interface Proposal {
  summary: string;
  explanation: string;
  changes: ProposalChanges;
}

interface CommonResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

export interface AnalysisResult {
  action: 'salary' | 'portfolio';
  reasoning: string;
}

export async function fetchAnalysis(userMessage: string): Promise<AnalysisResult> {
  const { action, reasoning } = await analyzeGoal(userMessage);
  return { action, reasoning };
}

export async function fetchProposalWithAction(
  userMessage: string,
  action: 'salary' | 'portfolio',
  dashboard: DashboardData,
): Promise<Proposal> {
  const investAmount = dashboard.salaryPlan.investmentAmount ?? Math.round((dashboard.salaryPlan.monthlyIncome ?? 0) * 0.2);
  const result = await proposeReset(userMessage, action);

  const salaryAllocations: ProposalAllocation[] = result.salaryAllocations.map(a => ({
    purpose: a.purpose,
    plannedAmount: a.plannedAmount,
  }));

  const portfolio: ProposalPortfolioItem[] = result.portfolio.map(p => ({
    assetType: p.assetType,
    assetAmount: Math.round(investAmount * p.ratio / 100),
    ratio: p.ratio,
  }));

  return {
    summary: result.summary,
    explanation: result.explanation,
    changes: { events: [], salaryAllocations, portfolio },
  };
}

export async function fetchProposal(userMessage: string, dashboard: DashboardData): Promise<Proposal> {
  const investAmount = dashboard.salaryPlan.investmentAmount ?? Math.round((dashboard.salaryPlan.monthlyIncome ?? 0) * 0.2);

  const { action } = await analyzeGoal(userMessage);
  const result = await proposeReset(userMessage, action);

  const salaryAllocations: ProposalAllocation[] = result.salaryAllocations.map(a => ({
    purpose: a.purpose,
    plannedAmount: a.plannedAmount,
  }));

  const portfolio: ProposalPortfolioItem[] = result.portfolio.map(p => ({
    assetType: p.assetType,
    assetAmount: Math.round(investAmount * p.ratio / 100),
    ratio: p.ratio,
  }));

  return {
    summary: result.summary,
    explanation: result.explanation,
    changes: { events: [], salaryAllocations, portfolio },
  };
}

export async function applyProposal(proposal: Proposal): Promise<void> {
  const action = proposal.changes.portfolio.length > 0 ? 'portfolio' : 'salary';

  const res = await api.post<CommonResponse>('/consultant/apply', {
    action,
    salaryAllocations: proposal.changes.salaryAllocations,
    portfolio: proposal.changes.portfolio.map(p => ({
      assetType: p.assetType,
      ratio: p.ratio,
    })),
  });

  if (!res.success) throw new Error(res.message || '재설정 적용 실패');
}
