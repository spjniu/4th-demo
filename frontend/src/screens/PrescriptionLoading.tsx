import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAgentRecommend, type AgentRecommend } from '../api/agentApi';


interface StepRowProps {
  shown: boolean;
  checked: boolean;
  label: string;
}

function StepRow({ shown, checked, label }: StepRowProps) {
  return (
    <div
      className="flex items-center justify-center gap-3 w-full transition-all duration-500"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      <span className="text-[15px] font-medium text-blue-700 text-center">{label}</span>
      <div
        className="w-6 h-6 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center flex-shrink-0 transition-all duration-300"
        style={{
          opacity: checked ? 1 : 0,
          transform: checked ? 'scale(1)' : 'scale(0.6)',
        }}
      >
        <Check className="w-4 h-4" strokeWidth={3} />
      </div>
    </div>
  );
}

export default function PrescriptionLoading() {
  const { userName: USER_NAME } = useAuth();
  const navigate = useNavigate();
  const [mainText, setMainText] = useState(`${USER_NAME}님이 입력하신 목표를\n이해하는 중이에요`);
  const [mainVisible, setMainVisible] = useState(true);
  const [steps, setSteps] = useState({ s1: false, s2: false, s3: false });
  const [checks, setChecks] = useState({ c1: false, c2: false, c3: false });
  const [spinnerVisible, setSpinnerVisible] = useState(true);
  const [complete, setComplete] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    let recommend: AgentRecommend | null = null;

    // POST /agent/recommend 호출 (UI 애니메이션과 병렬 진행)
    const apiCall = getAgentRecommend()
      .then(data => { recommend = data; })
      .catch((err: unknown) => console.error('[PrescriptionLoading] recommend 실패:', err));

    t.push(setTimeout(() => setSteps(s => ({ ...s, s1: true })), 1800));
    t.push(setTimeout(() => { setChecks(c => ({ ...c, c1: true })); setMainVisible(false); }, 2500));
    t.push(setTimeout(() => {
      setMainText('자산과 목표를\n비교·분석 중이에요');
      setMainVisible(true);
      setSteps(s => ({ ...s, s2: true }));
    }, 3200));
    t.push(setTimeout(() => { setChecks(c => ({ ...c, c2: true })); setMainVisible(false); }, 3900));
    t.push(setTimeout(() => {
      setMainText('가장 안전하고 빠른\n경로를 찾고 있어요');
      setMainVisible(true);
      setSteps(s => ({ ...s, s3: true }));
    }, 4600));
    t.push(setTimeout(() => { setChecks(c => ({ ...c, c3: true })); setSpinnerVisible(false); }, 5300));
    t.push(setTimeout(() => setComplete(true), 6500));
    t.push(setTimeout(() => setExiting(true), 8500));
    t.push(setTimeout(async () => {
      await apiCall;
      navigate('/asset-prescription', { replace: true, state: { recommend } });
    }, 9000));

    return () => t.forEach(clearTimeout);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className={`w-full max-w-[390px] min-h-screen bg-white flex flex-col shadow-2xl relative overflow-hidden ${exiting ? 'page-exit' : ''}`}>
        <div className="flex-1 flex flex-col items-center justify-between py-10 px-6">
          {/* 상단: 메인 상태 + 스피너 */}
          <div className="text-center w-full flex flex-col items-center mt-10">
            <h2
              className="text-lg font-semibold text-blue-700 mb-6 px-4 leading-relaxed whitespace-pre-line transition-opacity duration-500 min-h-[64px]"
              style={{ opacity: mainVisible ? 1 : 0 }}
            >
              {mainText}
            </h2>
            <div
              className="flex gap-2 h-6 items-center transition-opacity duration-300"
              style={{ opacity: spinnerVisible ? 1 : 0 }}
            >
              <span className="w-2 h-2 bg-blue-600 rounded-full inline-block animate-pulse-dot" style={{ animationDelay: '-0.32s' }} />
              <span className="w-2 h-2 bg-blue-600 rounded-full inline-block animate-pulse-dot" style={{ animationDelay: '-0.16s' }} />
              <span className="w-2 h-2 bg-blue-600 rounded-full inline-block animate-pulse-dot" />
            </div>
          </div>

          {/* 하단: 체크리스트 */}
          <div className="w-full flex flex-col gap-5 mt-auto mb-10 px-4">
            <StepRow shown={steps.s1} checked={checks.c1} label="자산 현황과 목표 금액을 대조하고 있어요" />
            <StepRow shown={steps.s2} checked={checks.c2} label="최적의 투자 경로를 탐색하는 중이에요" />
            <StepRow shown={steps.s3} checked={checks.c3} label={`${USER_NAME}님만을 위한 처방전을 조제하고 있어요`} />
          </div>
        </div>

        {/* 완료 메시지 */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-white transition-opacity duration-500"
          style={{ opacity: complete ? 1 : 0, pointerEvents: complete ? 'auto' : 'none' }}
        >
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">처방 완료!</h1>
          <p className="text-slate-500 font-medium">최적의 포트폴리오로 이동합니다</p>
        </div>
      </div>
    </div>
  );
}
