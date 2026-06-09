import { api } from './client';

interface CommonResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data: T;
}

export interface DailyLog {
  day: number;
  achieved: boolean;
  transaction?: {
    date: string;
    time: string;
    name: string;
    amount: number;
  };
}

export interface ChallengeAlarmDetail {
  challengeId: string;
  title: string;
  category: string;
  challengeType: 'FREQUENCY' | 'AMOUNT';
  target: number;
  currentCount: number;
  weeklyBaseline?: number;   // 평소 주간 횟수 (ex: 10잔) → 절약 횟수 = weeklyBaseline - target
  estimatedSaving: number;
  tickerName: string;
  estimatedShares: string;
  dailyLogs: DailyLog[];
  progressPercent: number;
  aiComment: string;
  weeklyStatus: 'ACTIVE' | 'SUCCESS' | 'FAILED';
}

// TODO: 백엔드 연결 후 mock 제거
const MOCK_CHALLENGE_DETAIL: ChallengeAlarmDetail = {
  challengeId: 'mock-challenge-id',
  title: '커피 3잔만 마시기',
  category: '카페',
  challengeType: 'FREQUENCY',
  target: 3,
  currentCount: 2,
  weeklyBaseline: 7,         // 평소 7잔 → 3잔 미션 → 4잔 절약
  estimatedSaving: 24000,
  tickerName: '삼성전자',
  estimatedShares: '0.17주',
  dailyLogs: [
    { day: 1, achieved: true,  transaction: { date: '06-02', time: '11:10', name: '메머드 커피', amount: 6500 } },
    { day: 2, achieved: true,  transaction: { date: '06-03', time: '8:10',  name: '메머드 커피', amount: 6500 } },
    { day: 3, achieved: false },
    { day: 4, achieved: false },
    { day: 5, achieved: false },
    { day: 6, achieved: false },
    { day: 7, achieved: false },
  ],
  progressPercent: 66,
  aiComment: '서태형님 이번주 남은 기간 1잔으로만 버티면 미션 성공이에요! 지난주보다 4잔을 줄여서 \'삼성전자\' 주식 0.01주 매수가 가능해요!',
  weeklyStatus: 'ACTIVE',
};

export async function getChallengeAlarmDetail(notificationId: string): Promise<ChallengeAlarmDetail> {
  try {
    const res = await api.get<CommonResponse<ChallengeAlarmDetail>>(
      `/notifications/${notificationId}/challenge`
    );
    return res.data;
  } catch {
    // TODO: 백엔드 연결 후 mock 제거
    return MOCK_CHALLENGE_DETAIL;
  }
}

export async function suggestNewChallenge(): Promise<void> {
  await api.post('/challenges/suggest');
}

// ─── 주식 시세 ────────────────────────────────────────────────

export interface StockInfo {
  ticker: string;
  name: string;
  currentPrice: number;
  changeAmount: number;
  changeRate: number;
  chart: Array<{ date: string; close: number }>;
}

// 삼성전자 fallback (API 장애 시)
const FALLBACK_STOCK: StockInfo = {
  ticker: '005930.KS', name: 'SamsungElec',
  currentPrice: 329000, changeAmount: -22500, changeRate: -6.4,
  chart: [
    { date: '2026-05-06', close: 266000 }, { date: '2026-05-07', close: 271500 },
    { date: '2026-05-08', close: 268500 }, { date: '2026-05-11', close: 285500 },
    { date: '2026-05-12', close: 279000 }, { date: '2026-05-13', close: 284000 },
    { date: '2026-05-14', close: 296000 }, { date: '2026-05-15', close: 270500 },
    { date: '2026-05-18', close: 281000 }, { date: '2026-05-19', close: 275500 },
    { date: '2026-05-20', close: 276000 }, { date: '2026-05-21', close: 299500 },
    { date: '2026-05-22', close: 292500 }, { date: '2026-05-26', close: 299000 },
    { date: '2026-05-27', close: 307000 }, { date: '2026-05-28', close: 299500 },
    { date: '2026-05-29', close: 317000 }, { date: '2026-06-01', close: 349000 },
    { date: '2026-06-02', close: 360500 }, { date: '2026-06-04', close: 351500 },
    { date: '2026-06-05', close: 329000 },
  ],
};

/** GET /stocks/{ticker} — 최근 1달 주식 시세 + 차트 */
export async function getStockInfo(ticker: string): Promise<StockInfo> {
  try {
    const res = await api.get<CommonResponse<StockInfo>>(`/stocks/${encodeURIComponent(ticker)}`);
    return res.data;
  } catch {
    return FALLBACK_STOCK;
  }
}

// ─── 챌린지 추천 / 조정 / 생성 ─────────────────────────────────

export interface ChallengeProposal {
  title: string;
  description: string;
  category: string;
  challengeSubType: string;
  challengeType: 'FREQUENCY' | 'AMOUNT';
  target: number;
  estimatedSaving: number;
  ticker: string;
}

// 카테고리/서브타입 → 아이콘 이모지
export function getChallengeIcon(proposal: ChallengeProposal): string {
  const sub = (proposal.challengeSubType ?? '').toUpperCase();
  const cat = proposal.category ?? '';
  if (sub === 'COFFEE' || /카페|커피/.test(cat)) return '☕';
  if (sub === 'DELIVERY' || /배달/.test(cat)) return '🛵';
  if (sub === 'NIGHTSNACK' || /야식/.test(cat)) return '🌙';
  if (sub === 'ALCOHOL' || /술/.test(cat)) return '🍺';
  if (sub === 'SHOPPING' || /쇼핑/.test(cat)) return '🛍️';
  if (sub === 'TAXI' || /택시/.test(cat)) return '🚕';
  if (sub === 'LUNCH' || /점심/.test(cat)) return '🍱';
  return '💡';
}

// Fallback 제안 (Flask 장애 시 사용)
const FALLBACK_PROPOSAL: ChallengeProposal = {
  title: '커피 3잔만 마시기',
  description: '이번주 카페 지출을 줄여 절약 습관을 만들어봐요!',
  category: '카페',
  challengeSubType: 'COFFEE',
  challengeType: 'FREQUENCY',
  target: 3,
  estimatedSaving: 24000,
  ticker: '삼성전자',
};

// 진행 중(IN_PROGRESS) 챌린지 — GET /challenges/active 응답
export interface ActiveChallenge {
  challengeId: string;
  title: string;
  description: string;
  category: string;
  challengeSubType: string;
  challengeType: 'AMOUNT' | 'COUNT';
  target: number;
  currentValue: number;
  progressPercent: number;   // 0~100
  estimatedSaving: number;
  ticker: string;
}

/** GET /challenges/active — 진행 중인 챌린지 (없으면 null) */
export async function getActiveChallenge(): Promise<ActiveChallenge | null> {
  try {
    const res = await api.get<CommonResponse<ActiveChallenge | null>>('/challenges/active');
    return res.data;
  } catch {
    return null;
  }
}

// 백엔드 ChallengeProposalResponseDto 는 snake_case 로 응답 → 프론트 camelCase 로 정규화
// (서버가 camelCase 로 줘도 동작하도록 둘 다 받음)
function toProposal(raw: Record<string, unknown>): ChallengeProposal {
  return {
    title: raw.title as string,
    description: raw.description as string,
    category: raw.category as string,
    challengeSubType: (raw.challengeSubType ?? raw.challenge_sub_type) as string,
    challengeType: (raw.challengeType ?? raw.challenge_type) as 'FREQUENCY' | 'AMOUNT',
    target: (raw.target ?? 0) as number,
    estimatedSaving: (raw.estimatedSaving ?? raw.estimated_saving ?? 0) as number,
    ticker: raw.ticker as string,
  };
}

/** POST /challenges/recommend — AI가 거래 내역 분석 후 챌린지 제안 */
export async function recommendChallenge(): Promise<ChallengeProposal> {
  try {
    const res = await api.post<CommonResponse<Record<string, unknown>>>('/challenges/recommend', {});
    return toProposal(res.data);
  } catch {
    return FALLBACK_PROPOSAL;
  }
}

/** POST /challenges/adjust?feedback=... — 가장 최근 피드백으로 재생성 */
export async function adjustChallenge(
  prevProposals: Array<ChallengeProposal & { feedback: string }>,
): Promise<ChallengeProposal> {
  try {
    const feedback = prevProposals[prevProposals.length - 1]?.feedback ?? '';
    const res = await api.post<CommonResponse<Record<string, unknown>>>(
      `/challenges/adjust?feedback=${encodeURIComponent(feedback)}`, {},
    );
    return toProposal(res.data);
  } catch {
    return FALLBACK_PROPOSAL;
  }
}

/** POST /challenges — 확정된 챌린지 저장 → 진행 ID 반환 */
export async function createChallenge(proposal: ChallengeProposal): Promise<string> {
  const res = await api.post<CommonResponse<string>>('/challenges', {
    title: proposal.title,
    description: proposal.description,
    category: proposal.category,
    challengeSubType: proposal.challengeSubType,
    challengeType: proposal.challengeType,
    target: proposal.target,
    estimatedSaving: proposal.estimatedSaving,
    ticker: proposal.ticker,
  });
  return res.data;
}
