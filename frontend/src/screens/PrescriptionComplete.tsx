import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generatePrescriptions } from '../api/agentApi';
import doctorImg from '../assets/doctor.png';

const MIN_DISPLAY_MS = 4000;
const FADE_MS = 500;

export default function PrescriptionComplete() {
  const { userName: USER_NAME } = useAuth();
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  // StrictMode 이중 마운트 또는 빠른 재방문 시 generatePrescriptions 중복 호출 방지
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const minDisplay = new Promise<void>(resolve => setTimeout(resolve, MIN_DISPLAY_MS));
    const apiCall = generatePrescriptions().catch((e: unknown) => {
      console.error('[PrescriptionComplete] generatePrescriptions 실패:', e);
    });

    Promise.all([apiCall, minDisplay]).then(() => {
      setExiting(true);
      setTimeout(() => {
        navigate('/asset-portfolio', { replace: true });
      }, FADE_MS);
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex justify-center font-sans overflow-hidden">
      <div
        className={`w-full max-w-[390px] min-h-screen flex flex-col items-center justify-center px-10 gap-8 transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* 제목 */}
        <h1
          className="text-2xl font-bold text-blue-500 text-center animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          통장 나누기 완료
        </h1>

        {/* 마스코트 — 진입 후 위아래 float 애니메이션 */}
        <div className="flex justify-center items-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <img
            src={doctorImg}
            alt="Pori 의사"
            className="w-32 h-32 object-contain animate-floating"
          />
        </div>

        {/* 메인 텍스트 */}
        <div className="flex flex-col items-center justify-center space-y-4 text-center animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <p className="text-xl font-semibold text-slate-800 leading-snug">
            {USER_NAME} 님의 자산을<br />
            <span className="text-blue-500">어떻게 불릴지 고민중이에요</span>
          </p>

          <p className="text-base text-slate-500 leading-relaxed">
            Pori가 종합적으로 분석하여<br />
            전략을 제시해드릴게요.
          </p>

          <p className="text-base font-bold text-slate-800">
            복잡한 건 <span className="text-blue-500">Pori</span>한테 맡기세요.
          </p>
        </div>
      </div>
    </div>
  );
}
