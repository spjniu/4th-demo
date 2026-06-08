// 메인 대시보드 위젯 공용 모듈
// ─────────────────────────────────────────────────────────────
// 백엔드 API(DashboardData) → 위젯 props 로 바꾸는 "매핑/계산 함수"를 모아둔 곳.
// API 응답 구조가 바뀌면 원칙적으로 이 파일과 각 위젯의 props 만 수정하면 됩니다.

import type {
  DashboardSalaryPlan,
  DashboardCategoryExpense,
  DashboardPortfolioItem,
  DashboardConsumption,
} from '../../api/dashboardApi';

// ─── 공용 타입 ───────────────────────────────────────────────
export interface SpendingItem { label: string; pct: number; color: string; }
export interface PortfolioSlice { label: string; pct: number; color: string; rate?: string; }

// ─── 색상 상수 ───────────────────────────────────────────────
// 소비 카테고리 색상 (API 카테고리명 → 표시 색상, (하드))
export const SPENDING_COLOR: Record<string, string> = {
  '식비': '#D85A30',
  '문화/여가': '#D85A30',
  '온라인쇼핑': '#A32D2D',
  '교통': '#D85A30',
  '기타': '#D85A30',
};

// 포트폴리오 카테고리별 색상 (categoryLabel → 색상)
export const PORTFOLIO_COLOR: Record<string, string> = {
  'ETF': '#1D9E75',
  '현금성': '#5DCAA5',
  '적금': '#9FE1CB',
  'IRP': '#085041',
};

// 월급 분배 도넛 팔레트
export const SALARY_PALETTE = ['#EF9F27', '#7F77DD', '#378ADD', '#1D9E75', '#94a3b8'];

// ─── 표시용 헬퍼 ─────────────────────────────────────────────
export const fmtManwon = (n: number) => `${Math.round(n / 10000).toLocaleString()}만 원`;

// ─── 매핑 함수 (API → 슬라이스/아이템) ───────────────────────
// 월급 분배 도넛 데이터
export function buildSalarySlices(salaryPlan: DashboardSalaryPlan): PortfolioSlice[] {
  const income = salaryPlan.monthlyIncome;
  if (income <= 0) return [];

  const slices: PortfolioSlice[] = salaryPlan.allocations.map((a, i) => ({
    label: a.purpose ?? '기타',
    pct: Math.round(a.plannedAmount / income * 100),
    color: SALARY_PALETTE[i % (SALARY_PALETTE.length - 2)],
  }));

  const investAmt = salaryPlan.investmentAmount ?? 0;
  if (investAmt > 0) {
    slices.push({ label: '투자', pct: Math.round(investAmt / income * 100), color: '#1D9E75' });
  }

  const surplus = salaryPlan.surplus ?? 0;
  if (surplus > 0) {
    slices.push({ label: '잔여', pct: Math.round(surplus / income * 100), color: '#94a3b8' });
  }

  return slices;
}

// 소비 카테고리 비율 아이템
export function buildSpendingItems(categories: DashboardCategoryExpense[]): SpendingItem[] {
  return categories.map(c => ({
    label: c.categoryName,
    pct: c.percentage,
    color: SPENDING_COLOR[c.categoryName] ?? '#D85A30',
  }));
}

// 포트폴리오 비중 슬라이스
export function buildPortfolioSlices(portfolio: DashboardPortfolioItem[]): PortfolioSlice[] {
  return portfolio.map(p => ({
    label: p.categoryLabel,
    pct: p.ratio,
    color: PORTFOLIO_COLOR[p.categoryLabel] ?? '#94a3b8',
    rate: p.rate,
  }));
}

// ─── 계산 함수 (위젯 표시값 도출) ────────────────────────────
// [소비] 잔여 비율 / 연료게이지 색상
export interface ConsumptionView {
  totalExpense: number;
  remainingPercent: number;
  fillColor: string;
  isBudgetExceeded: boolean;
}
export function computeConsumption(consumption: DashboardConsumption): ConsumptionView {
  const totalExpense = consumption.totalExpense;
  const baseline = consumption.lastMonthExpense;   // 예산 기준 = 저번 달 소비총합

  // 저번 달 데이터가 없으면 비교 불가 → 가득 찬 상태로 표시
  const remainingPercent = baseline > 0
    ? Math.max(0, Math.min(100, Math.round((baseline - totalExpense) / baseline * 100)))
    : 100;

  let fillColor = '#0095DB';
  if (remainingPercent < 20 || consumption.isBudgetExceeded) {
    fillColor = '#EF4444';
  } else if (remainingPercent < 50) {
    fillColor = '#FFD700';
  }

  return { totalExpense, remainingPercent, fillColor, isBudgetExceeded: consumption.isBudgetExceeded };
}

// [미션] 소비 1위 카테고리 기반 추천 챌린지 + 성공 보상
export interface MissionView {
  icon: string;
  title: string;
  step: number;
  savings: string;
}
export function computeMission(categories: DashboardCategoryExpense[]): MissionView {
  const top = [...(categories ?? [])].sort((a, b) => b.percentage - a.percentage)[0];
  const name = top?.categoryName ?? '';

  let ch: { icon: string; title: string; step: number };
  if (/카페|커피/.test(name)) ch = { icon: '☕', title: '이번달 카페 5번 줄이기', step: 20 };
  else if (/배달/.test(name)) ch = { icon: '🍕', title: '이번달 배달음식 5번만 시키기', step: 20 };
  else if (/외식|식비/.test(name)) ch = { icon: '🍽', title: '이번달 외식 3번 줄이기', step: 33 };
  else if (/쇼핑|온라인/.test(name)) ch = { icon: '🛍', title: '이번달 충동구매 0번 도전', step: 25 };
  else if (/편의점/.test(name)) ch = { icon: '🏪', title: '편의점 지출 20% 줄이기', step: 20 };
  else if (/구독/.test(name)) ch = { icon: '📱', title: '불필요한 구독 1개 해지하기', step: 100 };
  else if (/교통/.test(name)) ch = { icon: '🚌', title: '이번달 택시 10번 줄이기', step: 10 };
  else ch = { icon: '💡', title: `이번달 ${name || '지출'} 10% 줄이기`, step: 10 };

  let savings = 'TIGER 미국S&P500 0.03주';
  if (ch.title.includes('카페') || ch.title.includes('커피')) savings = 'TIGER 미국S&P500 0.02주';
  else if (ch.title.includes('배달') || ch.title.includes('외식')) savings = 'TIGER 미국S&P500 0.05주';
  else if (ch.title.includes('쇼핑')) savings = 'TIGER 미국S&P500 0.06주';

  return { ...ch, savings };
}

// [절세] 세액공제 현황은 백엔드 /dashboard 응답(taxSaving)에서 그대로 내려옴.
//   납입 한도/공제율/공제대상은 백엔드 TaxBenefitPolicy 정책 상수가 기준 — 프론트에서 재계산하지 않는다.
export const fmtWon = (n: number) => n >= 10_000 ? `${Math.round(n / 10_000)}만원` : `${n.toLocaleString()}원`;
