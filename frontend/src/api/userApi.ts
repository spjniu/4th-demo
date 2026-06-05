import { api } from './client';

export type PortiType = 'SWIMMING' | 'ARCHERY' | 'JUDO' | 'RHYTHMIC' | 'FENCING' | 'CYCLING';

export interface CommonResponse {
  status: number;
  success: boolean;
  message: string;
  data: unknown;
}

/**
 * porTI 유형 저장 (클라이언트에서 계산 완료 후 저장만)
 * PATCH /users/porti-survey
 */
export async function savePortiType(portiType: PortiType): Promise<void> {
  const response = await api.patch<CommonResponse>('/users/porti-survey', { portiType });
  if (!response.success) {
    throw new Error(response.message || 'porTI 유형 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 회원 탈퇴 (soft delete)
 * DELETE /users/me
 */
export async function withdrawAccount(): Promise<void> {
  const response = await api.delete<CommonResponse>('/users/me');
  if (!response.success) {
    throw new Error(response.message || '회원 탈퇴 중 오류가 발생했습니다.');
  }
}
