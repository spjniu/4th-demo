import { api, ApiError } from './client';

type LoginResponse = {
  status: number;
  success: boolean;
  message: string;
  data: { accessToken: string };
};

export async function login(email: string, password: string): Promise<string> {
  try {
    const body = await api.post<LoginResponse>('/auth/login', { email, password }, { auth: false });
    const token = body?.data?.accessToken;
    if (!token) throw new Error('서버 응답에서 토큰을 찾을 수 없습니다.');
    return token;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    throw err;
  }
}

export type SignupPayload = {
  email: string;
  password: string;
  name: string;
  phone?: string;
};

export async function signup(payload: SignupPayload): Promise<void> {
  try {
    await api.post('/auth/signup', payload, { auth: false });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      throw new Error('이미 가입된 이메일입니다.');
    }
    throw err;
  }
}
