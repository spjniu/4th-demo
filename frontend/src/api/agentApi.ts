import { api } from './client';

interface CommonResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

export interface CategoryExpenseItem {
  name: string;
  amount: number;
  ratio: number;
}

export interface FixedExpenseItem {
  name: string;
  amount: number;
}

export interface InvestTendency {
  safeRatio: number;
  moderateRatio: number;
  riskRatio: number;
}

export interface InvestorPortfolioItem {
  id: string;
  stockName: string;
  changeRate: number;
  sharesHeld: number;
  prevQuarterRatio: number;
  currentRatio: number;
  holdingMonths: number;
}

export interface InvestorMaster {
  id: string;
  name: string;
  description: string;
  hashtag1: string;
  hashtag2: string;
  investmentStyle: string;
  items: InvestorPortfolioItem[];
}

export interface AgentProfile {
  portiType: string;
  portiTypeName: string;
  portiDescription: string;
  monthlyAvgExpense: number;
  categoryExpense: CategoryExpenseItem[];
  fixedExpense: FixedExpenseItem[];
  totalFixedExpense: number;
  investTendency: InvestTendency;
  expenseComment: string;
  investComment: string;
  investor: InvestorMaster;
}

/**
 * POST /agent/profile
 * porTI 설문 답변 전송 → 유형 계산·저장 + AI 진단 리포트 생성
 * @param answers 10개 문항 답변 배열 (e.g. ["A","B","A",...])
 * @param stockThemes 관심 투자 테마 (선호 순서대로 최대 3개, e.g. ["국내 ETF","반도체"])
 * @param lifeGoal 자산 형성 목표 (e.g. "결혼 자금"), 미선택 시 null
 */
export async function generateAgentProfile(
  answers: string[],
  stockThemes: string[] = [],
  lifeGoal: string | null = null,
): Promise<AgentProfile> {
  const response = await api.post<CommonResponse<AgentProfile>>('/agent/profile', {
    answers,
    stockThemes,
    lifeGoal,
  });
  if (!response.success) throw new Error(response.message || 'AI 진단 리포트 생성 중 오류가 발생했습니다.');
  return response.data;
}

export interface RebalancingPlan {
  assetId: string;
  institution: string;
  assetType: string;
  assetNumber: string;
  amount: number;
  nickname: string;
  comment: string | null;
}

export interface AgentRecommend {
  salary: number;
  investAmount: number;
  totalFixedExpense: number;
  fixedExpenseComment: string;
  rebalancingPlans: RebalancingPlan[];
  remainingAmount: number;
}

/**
 * POST /agent/rebalance
 * 월급 리밸런싱 추천 (요청 바디 없음)
 */
export async function getAgentRecommend(): Promise<AgentRecommend> {
  const response = await api.post<CommonResponse<AgentRecommend>>('/agent/rebalance', {});
  if (!response.success) throw new Error(response.message || '리밸런싱 추천 중 오류가 발생했습니다.');
  return response.data;
}

/**
 * POST /agent/prescriptions
 * PrescriptionComplete 화면 진입 시 호출 — FastAPI /asset-portfolio 로
 * AI 포트폴리오를 생성받아 백엔드 DB(portfolio_flows + items)에 저장
 */
export async function generatePrescriptions(): Promise<void> {
  const response = await api.post<CommonResponse>('/agent/prescriptions', {});
  if (!response.success) {
    throw new Error(response.message || 'AI 포트폴리오 생성 중 오류가 발생했습니다.');
  }
}
