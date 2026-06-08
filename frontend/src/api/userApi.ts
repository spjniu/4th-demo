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

export interface UserGoal {
  stockThemes: string[];      // 관심 투자 테마 라벨 (선호 순서대로 최대 3개)
  lifeGoal: string | null;    // 자산 형성 목표 라벨, 미선택 시 null
}

/**
 * 관심 테마·목표 조회
 * GET /users/me/goal
 */
export async function getGoal(): Promise<UserGoal> {
  const response = await api.get<CommonResponse>('/users/me/goal');
  if (!response.success) {
    throw new Error(response.message || '관심사 조회 중 오류가 발생했습니다.');
  }
  return response.data as UserGoal;
}

/**
 * 관심 테마·목표 수정
 * PATCH /users/me/goal
 */
export async function updateGoal(goal: UserGoal): Promise<void> {
  const response = await api.patch<CommonResponse>('/users/me/goal', goal);
  if (!response.success) {
    throw new Error(response.message || '관심사 수정 중 오류가 발생했습니다.');
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
