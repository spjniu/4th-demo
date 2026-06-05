import { api } from './client';
import type { CommonResponse } from './userApi';

export interface PortfolioFlowGatheringAsset {
  id: string | null;            // 보유 계좌면 asset_id, 추천이면 null
  institution: string | null;
  accountName: string | null;
  assetNumber: string | null;   // 추천이면 null
  assetType: string | null;     // CHECKING / PARKING / IRP / ISA / STOCK ...
  balance: number | null;       // 추천이면 null
  interestRate: number | null;  // 추천 통장 금리(예/적금일 때)
}

export interface PortfolioFlowProductItem {
  id: string;
  productRatio: number | null;  // %
  productType: string | null;   // STOCK / BOND / DEPOSIT / SAVING / IRP
  productId: string | null;
  productName: string | null;
  productInstitution: string | null;
  interestRate: number | null;
  comment: string | null;       // 상품 추천 이유 (AI)
}

export interface PortfolioFlow {
  id: string;
  eventId: string | null;       // null = 기본 흐름
  title: string;
  summary: string | null;
  term: string | null;          // '단기' / '중기' / '장기' (AI 원본)
  amount: number | null;        // 모을 통장 월 납입 금액 (원)
  isActive: boolean;
  isRecommendation: boolean;    // true = 계좌 추천(gatheringAsset.id=null) / false = 보유 계좌
  accountComment: string | null;   // 모을 통장(추천) 이유
  expectedRrPct: number | null;    // 1년 예상 수익률(%)
  investmentMonths: number | null; // 예상 기간(개월)
  expectedAmount: number | null;   // 복리 고려 N개월 후 예상 수익 (원)
  rrComment: string | null;        // 수익률 코멘트
  gatheringAsset: PortfolioFlowGatheringAsset | null;
  products: PortfolioFlowProductItem[];
}

export interface PortfolioFlowListResponse {
  monthlyInvestAmount: number | null;   // users.monthly_invest_amount — 월 총 투자액 (원)
  flows: PortfolioFlow[];
}

/**
 * GET /portfolio-flows — 사용자의 전체 포트폴리오 흐름 (기본 + 이벤트)
 */
export async function getPortfolioFlows(): Promise<PortfolioFlowListResponse> {
  const res = await api.get<CommonResponse>('/portfolio-flows');
  if (!res.success) {
    throw new Error(res.message || '포트폴리오 흐름 조회 중 오류가 발생했습니다.');
  }
  return res.data as PortfolioFlowListResponse;
}

export interface AvailableAsset {
  id: string;
  institution: string | null;
  accountName: string | null;
  assetNumber: string | null;
  assetType: string | null;
  balance: number | null;
}

export interface AvailableAssetListResponse {
  assets: AvailableAsset[];
}

/**
 * GET /portfolio-flows/available-assets — 끌어오기/모으기 통장 후보
 *   카드/soft-delete 만 제외 — 중복 제거는 클라이언트에서
 */
export async function getAvailableAssets(): Promise<AvailableAssetListResponse> {
  const res = await api.get<CommonResponse>('/portfolio-flows/available-assets');
  if (!res.success) {
    throw new Error(res.message || '사용 가능한 통장 조회 중 오류가 발생했습니다.');
  }
  return res.data as AvailableAssetListResponse;
}

export interface PortfolioFlowUpdateRequest {
  amount?: number | null;        // 흐름 월 납입 금액 (원). null 이면 백엔드가 기존 값 유지
  gatheringAssetId?: string | null;
  products: Array<{
    productId?: string | null;
    productType: string;
    productRatio: number;
    assetId?: string | null;
  }>;
}

/**
 * PATCH /portfolio-flows/{flowId} — 흐름 일괄 수정
 *   gathering + items(PULL/PUT) 전체 교체. 응답은 갱신된 FlowDto
 */
export async function updatePortfolioFlow(
  flowId: string,
  request: PortfolioFlowUpdateRequest,
): Promise<PortfolioFlow> {
  const res = await api.patch<CommonResponse>(`/portfolio-flows/${flowId}`, request);
  if (!res.success) {
    throw new Error(res.message || '흐름 수정 중 오류가 발생했습니다.');
  }
  return res.data as PortfolioFlow;
}
