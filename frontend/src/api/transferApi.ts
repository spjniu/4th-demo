import { api } from './client';

interface CommonResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

export interface TransferPlan {
  id: string;
  assetId: string | null;
  institution: string | null;
  assetType: string;       // SPENDING / EMERGENCY / TARGET / SAVING
  plannedAmount: number;
  ratio: number | null;
  isConfirmed: boolean;
  scheduledDate: number;
  year: number;
  month: number;
}

export interface TransferPlanList {
  plans: TransferPlan[];
  totalAmount: number;
  salaryAmount: number | null;
}

/**
 * GET /transfer-plans?year=&month=
 * 특정 연/월 이체 계획 목록 조회
 */
export async function getTransferPlans(year: number, month: number): Promise<TransferPlanList> {
  const response = await api.get<CommonResponse<TransferPlanList>>(`/transfer-plans?year=${year}&month=${month}`);
  if (!response.success) throw new Error(response.message || '이체 계획 조회 실패');
  return response.data;
}

/**
 * POST /transfer-plans/generate
 * 급여 기반 이체 계획 자동 생성
 */
export async function generateTransferPlans(): Promise<TransferPlanList> {
  const response = await api.post<CommonResponse<TransferPlanList>>('/transfer-plans/generate', {});
  if (!response.success) throw new Error(response.message || '이체 계획 생성 실패');
  return response.data;
}

/**
 * PATCH /transfer-plans/{id}
 * 이체 계획 금액 수정
 */
export async function updateTransferPlan(id: string, plannedAmount: number): Promise<void> {
  const response = await api.patch<CommonResponse<null>>(`/transfer-plans/${id}`, { plannedAmount });
  if (!response.success) throw new Error(response.message || '이체 계획 수정 실패');
}

/**
 * POST /transfer-plans/confirm-all?year=&month=
 * 이체 계획 전체 확정 및 실행
 */
export async function confirmAllPlans(year: number, month: number): Promise<void> {
  const response = await api.post<CommonResponse<null>>(`/transfer-plans/confirm-all?year=${year}&month=${month}`, {});
  if (!response.success) throw new Error(response.message || '이체 계획 확정 실패');
}
