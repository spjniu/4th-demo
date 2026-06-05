import type { DashboardData } from './dashboardApi';

const AI_BASE = 'http://localhost:8000';
const API_BASE = 'http://localhost:8080/api/v1';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

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
  assetAmount: number;
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

export async function fetchProposal(userMessage: string, dashboardSnapshot: DashboardData): Promise<Proposal> {
  const res = await fetch(`${AI_BASE}/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_message: userMessage, dashboard_snapshot: dashboardSnapshot }),
  });
  if (!res.ok) throw new Error(`AI 서버 오류 (${res.status})`);
  return res.json();
}

export async function applyProposal(proposal: Proposal): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/apply`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(proposal.changes),
  });
  if (!res.ok) throw new Error(`적용 실패 (${res.status})`);
}
