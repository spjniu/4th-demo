import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signup as signupApi } from '../api/authApi';
import { Loader2 } from 'lucide-react';

const hasNum     = (pw: string) => /\d/.test(pw);
const hasLower   = (pw: string) => /[a-z]/.test(pw);
const hasUpper   = (pw: string) => /[A-Z]/.test(pw);
const hasSpecial = (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw);
const hasLength  = (pw: string) => pw.length >= 8;

export default function Signup() {
  const navigate = useNavigate();
  const { setUserName } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const pwValid =
    hasNum(password) && hasLower(password) && hasUpper(password) &&
    hasSpecial(password) && hasLength(password);

  const canSubmit = name.trim() && email.trim() && pwValid && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError('');
    setIsLoading(true);
    try {
      await signupApi({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      setUserName(name.trim());
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.');
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
          <h1 className="text-2xl font-bold text-blue-500 text-center mb-10">회원가입</h1>
        </div>

        {/* 필드 영역 */}
        <div className="flex-1 px-6 flex flex-col">
          {/* 이름 */}
          <div className="flex items-center py-5 border-b border-gray-100 gap-4">
            <label className="text-xl font-bold text-blue-500 w-20 shrink-0">이름</label>
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* 이메일 */}
          <div className="flex items-center py-5 border-b border-gray-100 gap-4">
            <label className="text-xl font-bold text-blue-500 w-20 shrink-0">이메일</label>
            <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 py-2.5 gap-2">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="email"
                placeholder="example@woori.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="py-5">
            <div className="flex items-center gap-4 mb-3">
              <label className="text-xl font-bold text-blue-500 w-20 shrink-0">비밀번호</label>
              <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 py-2.5 gap-2">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="숫자, 영대소문자, 특수문자 조합"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

            {/* 유효성 힌트 */}
            <div className="flex gap-2 pl-24 flex-wrap">
              {[
                { label: '숫자',    ok: hasNum(password) },
                { label: '소문자',  ok: hasLower(password) },
                { label: '대문자',  ok: hasUpper(password) },
                { label: '특수문자', ok: hasSpecial(password) },
                { label: '8자 이상', ok: hasLength(password) },
              ].map(({ label, ok }) => (
                <span
                  key={label}
                  className={`text-xs px-2 py-0.5 rounded-full transition ${
                    ok ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-red-500 text-xs text-center mb-4">{error}</p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 pb-10 pt-4 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-4 rounded-2xl font-bold transition active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> 가입 중...</> : '회원가입'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full mt-3 text-sm text-blue-400 hover:text-blue-600 transition py-2"
          >
            이미 계정이 있으신가요? 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
