import { api } from './client';

interface CommonResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

export interface PortfolioItem {
  assetType: string;
  assetAmount: number;
  assetId?: string;
}

export interface PortfolioList {
  portfolios: PortfolioItem[];
  totalAmount: number;
  monthlyInvestAmount: number;
}

/**
 * GET /portfolios
 * 내 포트폴리오 전체 조회
 */
export async function getPortfolios(): Promise<PortfolioList> {
  const response = await api.get<CommonResponse<PortfolioList>>('/portfolios');
  if (!response.success) throw new Error(response.message || '포트폴리오 조회 중 오류가 발생했습니다.');
  return response.data;
}

export interface PortfolioItemDetail {
  id: string;
  productType: string;   // STOCK / BOND / DEPOSIT
  productRatio: number | null;
  isLinked: boolean | null;
  institution: string | null;
  assetNumber: string | null;
  balance: number | null;
}

export interface PortfolioItemList {
  items: PortfolioItemDetail[];
  totalRatio: number;
  eventId: string | null;
}

/**
 * GET /portfolios-items
 * 기본 포트폴리오 항목 조회 (자산 처방전 기반)
 */
export async function getPortfolioItems(): Promise<PortfolioItemList> {
  const response = await api.get<CommonResponse<PortfolioItemList>>('/portfolios-items');
  if (!response.success) throw new Error(response.message || '포트폴리오 항목 조회 중 오류가 발생했습니다.');
  return response.data;
}

/**
 * POST /portfolios
 * 포트폴리오 최초 생성 (자산 처방전 저장)
 */
export async function createPortfolios(
  portfolios: PortfolioItem[],
  monthlyInvestAmount: number,
  salary?: number,
): Promise<PortfolioList> {
  const body: { portfolios: PortfolioItem[]; monthlyInvestAmount: number; salary?: number } = {
    portfolios,
    monthlyInvestAmount,
  };
  if (salary !== undefined) body.salary = salary;
  const response = await api.post<CommonResponse<PortfolioList>>('/portfolios', body);
  if (!response.success) throw new Error(response.message || '포트폴리오 생성 중 오류가 발생했습니다.');
  return response.data;
}

/**
 * PATCH /portfolios
 * 포트폴리오 수정 (리밸런싱 확정 저장)
 */
export async function updatePortfolios(
  portfolios: PortfolioItem[],
  monthlyInvestAmount?: number,
): Promise<PortfolioList> {
  const body: { portfolios?: PortfolioItem[]; monthlyInvestAmount?: number } = {};
  if (portfolios.length > 0) body.portfolios = portfolios;
  if (monthlyInvestAmount !== undefined) body.monthlyInvestAmount = monthlyInvestAmount;
  const response = await api.patch<CommonResponse<PortfolioList>>('/portfolios', body);
  if (!response.success) throw new Error(response.message || '포트폴리오 수정 중 오류가 발생했습니다.');
  return response.data;
}
