import { useNavigate } from 'react-router-dom';
import heroImg from '../assets/hero.png';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
        <div className="flex flex-col items-center justify-center flex-1 w-full px-10 gap-2">
          <img src={heroImg} alt="WooriPort 마스코트" className="w-52 h-52 object-contain mb-4" />

          <h1 className="text-4xl font-bold text-blue-500 tracking-tight font-wooridaum">WooriPort</h1>
          <p className="text-md text-gray-600 mb-12 font-wooridaum">나의 첫번째 자산 관리</p>

          <div className="w-full flex flex-col items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full border border-gray-300 rounded-2xl py-4 text-gray-500 font-medium hover:bg-gray-50 active:scale-95 transition"
            >
              로그인
            </button>

            <button
              onClick={() => navigate('/signup')}
              className="text-sm text-gray-500 underline underline-offset-4 hover:text-blue-600 transition"
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
