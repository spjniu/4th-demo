import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { login as loginApi } from '../api/authApi';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function Login() {
  const navigate = useNavigate();
  const { login: setAuthToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = isValidEmail(email) && password.length > 0 && !isLoading;

  const handleLogin = async () => {
    setError('');
    if (!isValidEmail(email)) { setError('올바른 이메일 형식을 입력해주세요.'); return; }
    if (!password)            { setError('비밀번호를 입력해주세요.');         return; }

    setIsLoading(true);
    try {
      const token = await loginApi(email, password);
      setAuthToken(token);
      navigate('/linking');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col shadow-2xl">
        {/* 상단 */}
        <div className="px-6 pt-8 pb-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-600 transition mb-6 -ml-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-blue-500 text-center mb-2">로그인</h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            등록하신 이메일과 비밀번호를 입력해주세요
          </p>
        </div>

        {/* 필드 영역 */}
        <div className="flex-1 px-6 flex flex-col">
          {/* 이메일 */}
          <div className="flex items-center py-5 border-b border-gray-100 gap-4">
            <label className="text-xl font-bold text-blue-500 w-20 shrink-0">이메일</label>
            <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 py-2.5 gap-2">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="email"
                placeholder="example@woori.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="flex items-center py-5 gap-4">
            <label className="text-xl font-bold text-blue-500 w-20 shrink-0">비밀번호</label>
            <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 py-2.5 gap-2">
              <Lock className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none min-w-0"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="shrink-0 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-red-500 text-xs text-center -mt-2">{error}</p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 pb-10 pt-4 shrink-0">
          <button
            onClick={handleLogin}
            disabled={!canSubmit}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-4 rounded-2xl font-bold transition active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> 로그인 중...</> : '로그인'}
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="w-full mt-3 text-sm text-blue-400 hover:text-blue-600 transition py-2"
          >
            아직 계정이 없으신가요? 회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
