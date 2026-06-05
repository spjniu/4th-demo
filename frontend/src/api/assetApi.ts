import { api } from './client';

interface CommonResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

export interface Asset {
  id: string;
  institution: string;
  assetType: string;
  assetNumber: string;
  accountPurpose: string;
  accountName: string;
  isSalary: boolean;
  balance: number;
  bankType: string;
  syncedAt: string;
}

export interface AssetSummary {
  totalBalance: number;
  savingsBalance: number;
  investBalance: number;
  linkedAccountCount: number;
  linkedCardCount: number;
}

export interface PreviewAccount {
  institution: string;
  assetType: string;
  assetNumber: string;
  accountName: string;
  accountPurpose: string;
  balance: number;
  bankType: string;
  isSalary: boolean;
}

export interface SalarySetResult {
  assetId: string;
  institution: string;
  isWooriBank: boolean;
}

export interface AutoTransferStatus {
  isConnected: boolean;
  restrictedFeatures: string[];
  fromAssetId: string;
  fromInstitution: string;
}

/**
 * GET /assets — 연동된 전체 자산 목록
 */
export async function getAssets(): Promise<Asset[]> {
  const res = await api.get<CommonResponse<{ assets: Asset[]; totalCount: number }>>('/assets');
  if (!res.success) throw new Error(res.message || '자산 목록 조회 중 오류가 발생했습니다.');
  return res.data.assets;
}

/**
 * GET /assets/summary — 자산 카테고리별 요약
 */
export async function getAssetSummary(): Promise<AssetSummary> {
  const res = await api.get<CommonResponse<AssetSummary>>('/assets/summary');
  if (!res.success) throw new Error(res.message || '자산 요약 조회 중 오류가 발생했습니다.');
  return res.data;
}

/**
 * GET /assets/mydata/preview — MyData 계좌 목록 미리보기
 */
export async function getMyDataPreview(institutions: string[]): Promise<PreviewAccount[]> {
  const params = institutions.map(i => `institutions=${encodeURIComponent(i)}`).join('&');
  const res = await api.get<CommonResponse<{ accounts: PreviewAccount[]; totalCount: number }>>(`/assets/mydata/preview?${params}`);
  if (!res.success) throw new Error(res.message || 'MyData 조회 중 오류가 발생했습니다.');
  return res.data.accounts;
}

/**
 * POST /assets/sync — 선택한 계좌 연동
 */
export async function syncAssets(selectedAssetNumbers: string[]): Promise<Asset[]> {
  const res = await api.post<CommonResponse<{ assets: Asset[]; totalCount: number }>>('/assets/sync', { selectedAssetNumbers });
  if (!res.success) throw new Error(res.message || '자산 동기화 중 오류가 발생했습니다.');
  return res.data.assets;
}

/**
 * PATCH /assets/{assetId}/salary — 급여 계좌 설정
 */
export async function setSalaryAccount(assetId: string): Promise<SalarySetResult> {
  const res = await api.patch<CommonResponse<SalarySetResult>>(`/assets/${assetId}/salary`, {});
  if (!res.success) throw new Error(res.message || '급여 계좌 설정 중 오류가 발생했습니다.');
  return res.data;
}

/**
 * POST /assets/auto-transfer/connect — 자동이체 연결
 */
export async function connectAutoTransfer(toAssetId: string, salaryDate: number): Promise<void> {
  const res = await api.post<CommonResponse>('/assets/auto-transfer/connect', { toAssetId, salaryDate });
  if (!res.success) throw new Error(res.message || '자동이체 연결 중 오류가 발생했습니다.');
}

/**
 * GET /assets/auto-transfer/status — 자동이체 연결 상태
 */
export async function getAutoTransferStatus(): Promise<AutoTransferStatus> {
  const res = await api.get<CommonResponse<AutoTransferStatus>>('/assets/auto-transfer/status');
  if (!res.success) throw new Error(res.message || '자동이체 상태 조회 중 오류가 발생했습니다.');
  return res.data;
}
