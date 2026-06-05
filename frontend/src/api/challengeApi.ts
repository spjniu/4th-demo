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
  estimatedSaving: 24000,
  tickerName: '삼성전자',
  estimatedShares: '0.01주',
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
