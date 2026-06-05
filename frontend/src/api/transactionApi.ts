import { api } from './client';

interface CommonResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

export interface SalaryTransaction {
  id: string;
  assetId: string;
  institution: string;
  amount: number;
  category: string;
  senderName: string;
  transactionAt: string;
}

/**
 * GET /transactions/salary — 급여 내역 조회
 */
export async function getSalaryTransactions(): Promise<SalaryTransaction[]> {
  const res = await api.get<CommonResponse<{ salaryTransactions: SalaryTransaction[]; totalCount: number }>>('/transactions/salary');
  if (!res.success) throw new Error(res.message || '급여 내역 조회 실패');
  return res.data.salaryTransactions;
}
