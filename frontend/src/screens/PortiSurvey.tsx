import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, Download } from 'lucide-react';
import heroImg from '../assets/hero.png';
import portiImg from '../assets/porti.png';
import swimporiImg from '../assets/Swimpori.png';
import golfporiImg from '../assets/Golfpori.png';
import cycleporiImg from '../assets/CyclePori.png';
import judoporiImg from '../assets/JudoPori.png';
import fencingporiImg from '../assets/FencingPori.png';
import archeryporiImg from '../assets/Archerypori.png';
import { useAuth } from '../contexts/AuthContext';
import { generateAgentProfile, type AgentProfile } from '../api/agentApi';
import warrenBuffettImg from '../assets/Warren Buffett.png';
import kenFisherImg from '../assets/Ken Fisher.png';
import johnBogleImg from '../assets/John Bogle.png';
import rayDalioImg from '../assets/Ray Dalio.png';
import stanleyDruckenmillerImg from '../assets/Stanley Druckenmiller.png';
import sethKlarmanImg from '../assets/Seth Klarman.png';


const TOTAL_QUESTIONS = 10;

// 카테고리별 지출 도넛 차트 데이터
const SPENDING_CATEGORIES = [
  { color: '#ef4444', label: '식비 (배달 등)', pct: 42 },
  { color: '#3b82f6', label: '문화/여가', pct: 15 },
  { color: '#8b5cf6', label: '온라인 쇼핑', pct: 17 },
  { color: '#10b981', label: '교통', pct: 8 },
  { color: '#e5e7eb', label: '기타', pct: 18 },
];

// 도넛 segment SVG path 생성기
function donutArcPath(startPct: number, endPct: number, outerR: number, innerR: number, cx: number, cy: number): string {
  const toXY = (pct: number, r: number) => {
    const a = (pct / 100) * 2 * Math.PI - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };
  const [x1, y1] = toXY(startPct, outerR);
  const [x2, y2] = toXY(endPct, outerR);
  const [x3, y3] = toXY(endPct, innerR);
  const [x4, y4] = toXY(startPct, innerR);
  const large = endPct - startPct > 50 ? 1 : 0;
  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`;
}

interface Question {
  id: number;
  emoji: string;
  context: string;
  bubble?: string;
  optionA: string;
  optionB: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    emoji: '💸',
    context: '기다리던 보너스가 통장에 찍혔어!' + '\n' + '제일 먼저 드는 생각은?',
    optionA: '"드디어 이거 살 수 있겠다!" 쓸 곳이 바로 떠올라',
    optionB: '"일단 넣어두자." 보기만 해도 든든해',
  },
  {
    id: 2,
    emoji: '🐷',
    context: '매달 저축할 때 내 스타일에 가까운 건?',
    optionA: '월 얼마씩 모을지 세운 계획이 있어',
    optionB: '생활비 쓰고 남은 돈 전부 저축해',
  },
  {
    id: 3,
    emoji: '🤨',
    context: '친구의 "너 왜 돈 모아?" 라는 질문에' + '\n' + '내 대답은?',
    optionA: '사고 싶은 거, 하고 싶은 거 - 원하는 걸 위해서',
    optionB: '갑자기 아프거나 급전 필요할 때를 대비하려고',
  },
  {
    id: 4,
    emoji: '🗓️',
    context: '앞으로 3년 안에 해당되는 게 있어?',
    optionA: '결혼, 이사, 독립, 차 구매 — 목돈 나갈 일',
    optionB: '딱히 없어, 아직은 먼 일 같아',
  },
  {
    id: 5,
    emoji: '📉',
    context: '큰맘 먹고 산 주식이 다음 날 -15% 됐어.' + '\n' + '어떡해?',
    optionA: '스트레스!!! 일단 팔거나, 앱 지우고 안 보려고 해',
    optionB: '오히려 기회! 여유 자금으로 더 살까 고민해',
  },
  {
    id: 6,
    emoji: '🏦',
    context: '은행원이 두 가지 상품을 추천해줬어.' + '\n' + '둘 중에 고른다면?',
    optionA: '연 4%, 원금 100% 보장 안전한 예적금',
    optionB: '원금 손실 가능성 있지만 연 12% 예상 투자 상품',
  },
  {
    id: 7,
    emoji: '🔥',
    context: '요즘 핫하다는 그 주식' + '\n' + '내 스타일은?',
    optionA: '유튜브, 블로그 찾아보고 리스크 이해한 다음 시작',
    optionB: '일단 5만 원이라도 넣어보고 직접 움직임 지켜봐',
  },
  {
    id: 8,
    emoji: '📺',
    context: '나도 모르게 클릭할 것 같은 유튜브 영상은?',
    optionA: '"월 200 직장인, 적금만으로 2년 만에 전세 보증금 모은 비법"',
    optionB: '"28살 사회초년생, 주식 300만 원으로 시작해서 1년 수익 공개"',
  },
  {
    id: 9,
    emoji: '😌',
    context: '내가 바라는 이상적인 돈 관리는?',
    optionA: '월급 누가 관리해줬으면... 나는 신경 끄고 살래',
    optionB: '매주 자산 체크하고, 직접 굴리고 컨트롤하고 싶어',
  },
  {
    id: 10,
    emoji: '🎯',
    context: '내 재테크 슬로건을 고른다면?',
    optionA: '"쓸 땐 쓰고 모을 땐 모은다" 누릴 건 누리면서',
    optionB: '"젊을 때 바짝 모아야지" 지금 참고 시드머니 먼저',
  },
];

interface ResultType {
  typeName: string;
  img: string;
  subtitle: string;
  quote: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
}

// 0:수영 1:골프 2:사이클 3:유도 4:펜싱 5:양궁
const RESULT_TYPES: ResultType[] = [
  {
    typeName: '수영하는 Pori',
    img: swimporiImg,
    subtitle: '기본기에 충실한, 레인을 벗어나지 않는 타입',
    quote: '흔들리지 않아, 내 레인을 지킬 뿐',
    description: '변동성이 낮은 안전 자산을 선호해요.' + '\n' + '원금 보장이 최우선이고, 꾸준한 적금으로 자산을 착실히 쌓아가는 타입이에요.' + '\n' + '시장 뉴스에 흔들리지 않고 내 계획대로 가는 것이 최고의 전략이라고 믿어요.',
    strengths: ['감정적 손절 없이 안정적 보유', '꾸준한 적립으로 복리 극대화', '시장 폭락 때도 멘탈 흔들림 없음'],
    weaknesses: ['인플레이션 대비 낮은 실질 수익률', '고수익 기회를 놓치는 경향', '리스크 회피로 자산 증식 속도 더딤'],
  },
  {
    typeName: '골프 치는 Pori',
    img: golfporiImg,
    subtitle: '전략적으로 즐기는, 삶의 질을 고려하는 타입',
    quote: '즐기면서도 버는 거, 그게 나야',
    description: '소비와 투자의 균형을 잘 잡는 타입이에요.\n삶의 질을 포기하지 않으면서 자산도 꾸준히 늘리고 싶어해요.\n가치 있다고 판단한 소비에는 과감하고, 투자는 전략적으로 접근해요.',
    strengths: ['소비와 투자의 균형 감각', '전략적 타이밍 포착 능력', '다양한 자산으로 리스크 분산'],
    weaknesses: ['결정 시 지나치게 고민하는 경향', '수익률 극대화보다 안정을 택해 아쉬울 때 있음', '시장 급락 시 포트폴리오 리밸런싱 지연'],
  },
  {
    typeName: '사이클 타는 Pori',
    img: cycleporiImg,
    subtitle: '묵묵히 자신의 페달 밟는, 장거리 레이서 타입',
    quote: '오르막이 있어야 내리막도 있지, 나는 계속 달린다',
    description: '장기 복리의 힘을 믿는 타입이에요.\n단기 등락에 흔들리지 않고 꾸준히 인덱스를 적립하는 전략이 딱 맞아요.\n목적 통장을 분산 운영하며 목표별로 체계적으로 관리해요.',
    strengths: ['장기 복리 효과 극대화', '단기 등락에 휘둘리지 않는 멘탈', '목표별 분산으로 체계적 자산 관리'],
    weaknesses: ['단기 수익 기회에 무감각할 수 있음', '너무 긴 시계로 유동성 부족', '시장 급변 시 리밸런싱 타이밍 놓침'],
  },
  {
    typeName: '유도하는 Pori',
    img: judoporiImg,
    subtitle: '자산을 안전하게 지킬 줄 아는, 수비형 재테크 타입',
    quote: '지키는 것도 실력이야',
    description: '리스크보다 안전을 최우선으로 해요.\n원금 보장 상품과 비상금을 두둑이 쌓아두는 것이 최고의 재테크라고 생각해요.\n불필요한 지출을 잘 참고 한 번 더 생각하는 신중한 소비자예요.',
    strengths: ['위기 때도 흔들리지 않는 수비 능력', '비상금 확보로 기회비용 항상 준비', '불필요한 손실 거의 없음'],
    weaknesses: ['자산 성장 속도가 느린 편', '인플레이션에 취약할 수 있음', '안전 추구로 투자 기회 종종 포기'],
  },
  {
    typeName: '펜싱하는 Pori',
    img: fencingporiImg,
    subtitle: '빠른 판단으로 과감하게, 선제 공격형 투자 타입',
    quote: '남들이 망설일 때, 나는 이미 찔렀다',
    description: '높은 수익을 위해 리스크를 기꺼이 감수해요.\n시장 기회를 빠르게 포착하고 과감하게 진입하는 공격형 투자자예요.\n빠른 결정이 특기지만 가끔 충동 소비로 이어지기도 해요.',
    strengths: ['시장 기회 빠른 포착', '고수익 추구로 자산 성장 속도 빠름', '새로운 투자 트렌드 선도'],
    weaknesses: ['충동적 결정으로 손실 날 수 있음', '변동성 큰 자산으로 심리 불안정', '포트폴리오 집중 리스크'],
  },
  {
    typeName: '양궁 쏘는 Pori',
    img: archeryporiImg,
    subtitle: '한 발 한 발 신중하게 겨냥하는, 정밀 조준 타입',
    quote: '데이터가 맞다고 할 때만 쏜다',
    description: '투자 전 철저히 분석하고 근거를 확인한 뒤에야 결정해요.\n목표 금액과 기간을 정해두고 역산으로 저축 계획을 세우는 정밀한 타입이에요.\n가성비와 효율을 중시하며 즉흥적 지출은 거의 없어요.',
    strengths: ['데이터 기반 리스크 최소화', '목표 달성률 높은 계획 실행력', '가성비 높은 정밀 포트폴리오'],
    weaknesses: ['분석에 너무 오래 걸려 기회 놓침', '지나친 신중함으로 결단 지연', '직관적 기회에 느린 반응'],
  },
];

function calcResult(answers: Record<number, 'A' | 'B'>): ResultType {
  const B = (q: number) => answers[q] === 'B';
  const A = (q: number) => answers[q] === 'A';

  // Risk: Q5B, Q6B, Q8B (높을수록 위험선호)
  const risk = [B(5), B(6), B(8)].filter(Boolean).length;
  // Goal/Discipline: Q2A(계획), Q4A(근접목표), Q9B(적극관리)
  const goal = [A(2), A(4), B(9)].filter(Boolean).length;

  const hiRisk = risk >= 2;
  const hiGoal = goal >= 2;

  if (!hiRisk && !hiGoal) return RESULT_TYPES[3]; // 유도
  if (!hiRisk && hiGoal) return RESULT_TYPES[0]; // 수영
  if (hiRisk && !hiGoal) return RESULT_TYPES[4]; // 펜싱
  // hiRisk + hiGoal → 세 가지 세분화
  if (A(7) && B(10)) return RESULT_TYPES[5];      // 양궁 (분석+공격저축)
  if (A(1) || A(10)) return RESULT_TYPES[1];      // 골프 (소비+균형)
  return RESULT_TYPES[2];                          // 사이클 (장기성장)
}

// 백엔드 portiType → RESULT_TYPES 인덱스 (히어로 타입은 백엔드 판정을 우선)
const PORTI_TYPE_TO_INDEX: Record<string, number> = {
  SWIMMING: 0,  // 수영
  RHYTHMIC: 1,  // 골프 (백엔드 리듬체조 → 프론트 골프)
  CYCLING: 2,   // 사이클
  JUDO: 3,      // 유도
  FENCING: 4,   // 펜싱
  ARCHERY: 5,   // 양궁
};

const THEME_CATEGORIES = [
  { id: 'etf_domestic', label: '국내 ETF', emoji: '🇰🇷' },
  { id: 'etf_global', label: '해외 ETF', emoji: '🌏' },
  { id: 'semiconductor', label: '반도체', emoji: '💾' },
  { id: 'battery', label: '2차전지', emoji: '🔋' },
  { id: 'ai_tech', label: 'AI·테크', emoji: '🤖' },
  { id: 'bio', label: '바이오·헬스', emoji: '🧬' },
  { id: 'finance', label: '금융', emoji: '🏦' },
  { id: 'energy', label: '에너지', emoji: '⚡' },
  { id: 'reits', label: '부동산·리츠', emoji: '🏢' },
  { id: 'consumer', label: '소비재', emoji: '🛍️' },
  { id: 'defense', label: '방산', emoji: '🛡️' },
  { id: 'commodities', label: '원자재·금', emoji: '🪙' },
];

const GOAL_CATEGORIES = [
  { id: 'marriage', label: '결혼 자금', emoji: '💍' },
  { id: 'house', label: '내 집 마련', emoji: '🏠' },
  { id: 'car', label: '드림카 구매', emoji: '🚗' },
  { id: 'seedmoney', label: '종잣돈 모으기', emoji: '💰' },
  { id: 'travel', label: '해외 여행', emoji: '✈️' },
  { id: 'other', label: '자유/기타', emoji: '💼' },
];

// 거장 이름 → 사진 (API는 이미지를 주지 않으므로 프론트에서 이름으로 매칭)
const GURU_IMAGES: Record<string, string> = {
  '워렌 버핏': warrenBuffettImg,
  '워런 버핏': warrenBuffettImg,
  '켄 피셔': kenFisherImg,
  '존 보글': johnBogleImg,
  '레이 달리오': rayDalioImg,
  '스탠리 드러켄밀러': stanleyDruckenmillerImg,
  '세스 클라만': sethKlarmanImg,
};

type Step = 'intro' | 'question' | 'theme' | 'goal' | 'loading' | 'result';


export default function PortiSurvey() {
  const { userName: USER_NAME } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B'>>({});
  const [completing, setCompleting] = useState(false);
  const [result, setResult] = useState<ResultType | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({
    spending: false, investment: false, portfolio: false,
  });
  const [hoveredCat, setHoveredCat] = useState<number | null>(null);
  const [hoveredRisk, setHoveredRisk] = useState<string | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [priorities, setPriorities] = useState<(string | null)[]>([null, null, null]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const toggleDetail = (key: string) =>
    setOpenDetail(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSaveImage = () => {
    if (!result) return;
    const W = 390;
    const pad = 28;
    const img = new Image();
    img.src = result.img;
    img.onload = () => {
      const imgW = W - pad * 2;
      const imgH = Math.round((img.naturalHeight / img.naturalWidth) * imgW);
      const titleH = 64;
      const subtitleH = 56;
      const H = pad + titleH + imgH + subtitleH + pad;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      // title
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(result.typeName, W / 2, pad + 36);
      // image
      const iy = pad + titleH;
      ctx.save();
      const r = 16;
      ctx.beginPath();
      ctx.moveTo(pad + r, iy);
      ctx.lineTo(pad + imgW - r, iy);
      ctx.quadraticCurveTo(pad + imgW, iy, pad + imgW, iy + r);
      ctx.lineTo(pad + imgW, iy + imgH - r);
      ctx.quadraticCurveTo(pad + imgW, iy + imgH, pad + imgW - r, iy + imgH);
      ctx.lineTo(pad + r, iy + imgH);
      ctx.quadraticCurveTo(pad, iy + imgH, pad, iy + imgH - r);
      ctx.lineTo(pad, iy + r);
      ctx.quadraticCurveTo(pad, iy, pad + r, iy);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, pad, iy, imgW, imgH);
      ctx.restore();
      // subtitle
      ctx.fillStyle = '#abc7fe';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(result.subtitle, W / 2, iy + imgH + 34);
      const link = document.createElement('a');
      link.download = `PorTI_${result.typeName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const currentQ = QUESTIONS[currentIndex];
  const progress = completing ? 100 : (currentIndex / TOTAL_QUESTIONS) * 100;

  // 로딩 → 결과 자동 전환 + AI 진단 리포트 생성
  useEffect(() => {
    if (step !== 'loading') return;

    const localResult = calcResult(answers);
    const answersArray = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => answers[i + 1] ?? 'A');

    // 선택한 테마·목표 id → 한글 라벨로 변환해 함께 전송 (AI 진단에 활용)
    const stockThemes = priorities
      .filter((id): id is string => id !== null)
      .map(id => THEME_CATEGORIES.find(c => c.id === id)?.label ?? id);
    const lifeGoal = selectedGoal
      ? (GOAL_CATEGORIES.find(g => g.id === selectedGoal)?.label ?? selectedGoal)
      : null;

    const minDelay = new Promise<void>(resolve => setTimeout(resolve, 2800));
    const apiCall = generateAgentProfile(answersArray, stockThemes, lifeGoal)
      .then(profile => {
        setAgentProfile(profile);
        localStorage.setItem('agentProfile', JSON.stringify(profile));
        return profile;
      })
      .catch((err: unknown) => {
        console.error('[PortiSurvey] agent profile 생성 실패:', err);
        return null;
      });

    Promise.all([minDelay, apiCall]).then(([, profile]) => {
      // 히어로 타입은 백엔드 portiType 우선, 실패 시 로컬 calcResult 폴백
      const idx = profile ? PORTI_TYPE_TO_INDEX[profile.portiType] : undefined;
      setResult(idx !== undefined ? RESULT_TYPES[idx] : localResult);
      setStep('result');
    });
  }, [step, answers, priorities, selectedGoal]);

  const handleAnswer = (choice: 'A' | 'B') => {
    const newAnswers = { ...answers, [currentQ.id]: choice };
    setAnswers(newAnswers);

    if (currentIndex < TOTAL_QUESTIONS - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      // 마지막 문항: 게이지 100% 채우고 테마 선택으로 이동
      setCompleting(true);
      setTimeout(() => { setCompleting(false); setStep('theme'); }, 700);
    }
  };

  // ── 인트로 ────────────────────────────────────────────────
  if (step === 'intro') return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col shadow-2xl px-8">

        {/* 상단: 텍스트 + 캐릭터 */}
        <div className="flex items-center justify-between pt-16 mb-10">
          <p className="text-xl font-bold text-gray-800 leading-snug">
            10개의 질문으로<br />당신을 파악할게요
          </p>
          <img
            src={portiImg}
            alt="Porti"
            className="w-32 h-32 object-contain animate-floating"
          />
        </div>

        {/* 타이틀 */}
        <div className="flex flex-col items-center gap-3 mb-auto pt-14">
          <h1 className="text-5xl font-bold text-blue-500 tracking-tight font-wooridaum">PorTI</h1>
          <p className="text-sm text-gray-400">나도 모르는 나의 소비·투자 성향 찾기</p>
        </div>

        {/* 시작 버튼 */}
        <div className="pb-12">
          <button
            onClick={() => setStep('question')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-blue-500 font-bold py-4 rounded-2xl text-lg transition active:scale-95"
          >
            검사 시작
          </button>
        </div>

      </div>
    </div>
  );

  // ── 테마 선택 ────────────────────────────────────────────
  if (step === 'theme') return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col shadow-2xl">

        <div className="flex-1 flex flex-col px-6 pt-6 pb-8 overflow-y-auto">
          <p className="text-xs text-gray-400 text-right mb-4">추가 질문</p>

          {/* 제목 */}
          <div className="text-center mb-6">
            <span className="text-5xl block mb-3">📊</span>
            <p className="text-xl font-bold text-gray-800 leading-snug font-wooridaum">
              관심 있는 투자 테마를<br />골라봐요
            </p>
            <p className="text-sm text-gray-400 mt-2">선호하는 순서대로 최대 3개</p>
          </div>

          {/* 순위 슬롯 */}
          <div className="flex gap-2 mb-6">
            {[0, 1, 2].map(i => {
              const id = priorities[i];
              const cat = id ? THEME_CATEGORIES.find(c => c.id === id) : null;
              return (
                <div key={i} className="flex-1">
                  <p className="text-xs text-gray-400 text-center mb-1.5">{i + 1}순위</p>
                  <button
                    onClick={() => {
                      if (!cat) return;
                      const next = priorities.filter((_, idx) => idx !== i);
                      next.push(null);
                      setPriorities(next);
                    }}
                    className={`w-full py-3 rounded-xl border-2 flex flex-col items-center gap-0.5 transition active:scale-95
                      ${cat
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-dashed border-gray-200 bg-gray-50 text-gray-300'
                      }`}
                  >
                    {cat ? (
                      <>
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="text-[11px] font-bold leading-tight">{cat.label}</span>
                      </>
                    ) : (
                      <span className="text-2xl leading-none py-1">+</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 카테고리 그리드 */}
          <div className="grid grid-cols-3 gap-2 mb-8">
            {THEME_CATEGORIES.map(cat => {
              const rank = priorities.indexOf(cat.id);
              const isSelected = rank !== -1;
              const isFull = priorities.every(p => p !== null);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (isSelected) {
                      const filled = priorities.filter(x => x !== cat.id);
                      setPriorities([...filled, null]);
                    } else {
                      const emptyIdx = priorities.indexOf(null);
                      if (emptyIdx === -1) return;
                      const next = [...priorities];
                      next[emptyIdx] = cat.id;
                      setPriorities(next);
                    }
                  }}
                  className={`relative py-3 px-2 rounded-xl border-2 flex flex-col items-center gap-1 transition active:scale-95
                    ${isSelected
                      ? 'border-blue-400 bg-blue-50'
                      : isFull
                        ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                        : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                    }`}
                >
                  {isSelected && (
                    <span className="absolute top-1 right-1.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {rank + 1}
                    </span>
                  )}
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-xs font-semibold text-gray-700 leading-tight text-center">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* 다음 단계 버튼 */}
          <button
            onClick={() => setStep('goal')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl text-lg transition active:scale-95 mt-auto"
          >
            다음 단계로 →
          </button>
        </div>
      </div>
    </div>
  );

  // ── 목표 선택 ────────────────────────────────────────────
  if (step === 'goal') return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col shadow-2xl">

        <div className="flex-1 flex flex-col px-6 pt-6 pb-8 overflow-y-auto">
          <p className="text-xs text-gray-400 text-right mb-4">추가 질문</p>

          {/* 제목 */}
          <div className="text-center mb-6">
            <span className="text-5xl block mb-3">🎯</span>
            <p className="text-xl font-bold text-gray-800 leading-snug font-wooridaum">
              자산 형성의 목표를<br />골라봐요
            </p>
            <p className="text-sm text-gray-400 mt-2">나중에 이루고 싶은 소중한 자산 목표 (선택)</p>
          </div>

          {/* 선택된 목표 슬롯 */}
          <div className="flex justify-center mb-8">
            <div className="w-1/2">
              <p className="text-xs text-gray-400 text-center mb-1.5">나의 목표</p>
              <button
                onClick={() => setSelectedGoal(null)}
                className={`w-full py-4 rounded-xl border-2 flex flex-col items-center gap-1 transition active:scale-95 min-h-[76px] justify-center
                  ${selectedGoal
                    ? 'border-blue-400 bg-blue-50 text-blue-700 font-bold'
                    : 'border-dashed border-gray-200 bg-gray-50 text-gray-300'
                  }`}
              >
                {selectedGoal ? (
                  <>
                    <span className="text-2xl">{GOAL_CATEGORIES.find(g => g.id === selectedGoal)?.emoji}</span>
                    <span className="text-[12px] font-bold leading-tight">{GOAL_CATEGORIES.find(g => g.id === selectedGoal)?.label}</span>
                  </>
                ) : (
                  <span className="text-xl leading-none font-normal">+ 목표 선택</span>
                )}
              </button>
            </div>
          </div>

          {/* 카테고리 그리드 */}
          <div className="grid grid-cols-3 gap-2 mb-10">
            {GOAL_CATEGORIES.map(g => {
              const isSelected = selectedGoal === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGoal(prev => prev === g.id ? null : g.id);
                  }}
                  className={`py-4 px-2 rounded-xl border-2 flex flex-col items-center gap-1.5 transition active:scale-95
                    ${isSelected
                      ? 'border-blue-400 bg-blue-50 text-blue-700 font-bold'
                      : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                    }`}
                >
                  <span className="text-3xl">{g.emoji}</span>
                  <span className="text-xs font-semibold text-gray-700 leading-tight text-center">{g.label}</span>
                </button>
              );
            })}
          </div>

          {/* 분석 시작 버튼 */}
          <button
            onClick={() => setStep('loading')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl text-lg transition active:scale-95 mt-auto"
          >
            분석 시작 →
          </button>
        </div>
      </div>
    </div>
  );

  // ── 로딩 ─────────────────────────────────────────────────
  if (step === 'loading') return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col items-center justify-center shadow-2xl px-10 gap-8">
        <p className="text-sm text-blue-500 text-center leading-relaxed">
          마이데이터와 PorTI 검사를 기반으로<br />
          <span className="font-bold">{USER_NAME}</span>님을 그리고 있어요.
        </p>

        {/* 점선 원 + 마스코트 */}
        <div className="relative flex items-center justify-center w-44 h-44">
          <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-300 animate-spin [animation-duration:6s]" />
          <img src={heroImg} alt="Pori" className="w-28 h-28 object-contain relative z-10" />
        </div>
      </div>
    </div>
  );

  // ── 결과 카드 ─────────────────────────────────────────────
  if (step === 'result' && result) {
    return (
      <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
        <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col shadow-2xl">

          {/* 헤더 */}
          <header className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-10 border-b border-gray-100 shrink-0">
            <div className="w-10" />
            <h1 className="font-semibold text-base font-wooridaum">AI 자산 초상화</h1>
            <div className="w-10" />
          </header>

          <main className="flex-1 overflow-y-auto pb-32">

            {/* ── 히어로 섹션 ── */}
            <div className="bg-gradient-to-b from-blue-50 to-white px-5 pt-6 pb-8 text-center">
              <p className="text-sm text-gray-400 mb-1">{USER_NAME}님은</p>
              <h2 className="text-2xl font-bold text-blue-600 mb-1 font-wooridaum">{result.typeName}</h2>
              <p className="text-sm text-gray-500 italic mb-5">"{result.quote}"</p>

              <div className="relative mx-auto w-52 h-52 rounded-3xl overflow-hidden shadow-lg mb-5">
                <img src={result.img} alt={result.typeName} className="w-full h-full object-cover" />
                <button
                  onClick={handleSaveImage}
                  className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition active:scale-90"
                  title="이미지 저장"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              <button
                onClick={() => setShowProfile(v => !v)}
                className="flex items-center justify-center gap-1.5 mb-3 w-full"
              >
                <span className="text-xs text-blue-700 bg-blue-100 rounded-full px-4 py-1.5">
                  {result.subtitle}
                </span>
                <ChevronDown className={`w-4 h-4 text-blue-500 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
              </button>

              {showProfile && (
                <div className="bg-[#FFFDF0] border border-yellow-200 rounded-xl p-4 text-left mx-2 mb-3 shadow-sm animate-in fade-in slide-in-from-top-1">
                  <p className="text-xs font-bold text-yellow-700 mb-2">🐳 요약</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{result.description}</p>
                </div>
              )}
            </div>


            {/* ── 기존 마이데이터 기반 섹션들 ── */}
            <div className="px-5 space-y-6 py-2">

              {/* 소비 팩트 체크 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg font-wooridaum">소비</h3>
                  {(() => {
                    const SPENDING_KEYWORD: Record<string, { keyword: string; desc: string; emoji: string }> = {
                      '식비': { keyword: '맛집러', desc: '외식·배달에 지출이 집중돼요', emoji: '🍽️' },
                      '교통': { keyword: '이동왕', desc: '교통비 지출이 가장 높아요', emoji: '🚇' },
                      '쇼핑': { keyword: '쇼핑왕', desc: '쇼핑 지출이 눈에 띄어요', emoji: '🛍️' },
                      '카페': { keyword: '카페홀릭', desc: '카페 방문이 잦은 편이에요', emoji: '☕' },
                      '문화/여가': { keyword: '문화생활러', desc: '여가·문화 활동을 즐기세요', emoji: '🎬' },
                      '의료': { keyword: '건강챙김이', desc: '건강 관련 지출이 많아요', emoji: '💊' },
                      '통신': { keyword: '디지털러', desc: '통신비 지출이 높은 편이에요', emoji: '📱' },
                      '공과금': { keyword: '성실납부왕', desc: '공과금을 꼬박꼬박 납부해요', emoji: '📋' },
                      '주거': { keyword: '홈프로텍터', desc: '주거비 비중이 높아요', emoji: '🏠' },
                      '보험': { keyword: '안전제일', desc: '보험으로 미래를 대비해요', emoji: '🛡️' },
                      '교육': { keyword: '자기계발러', desc: '교육에 꾸준히 투자해요', emoji: '📚' },
                      '구독': { keyword: '구독수집가', desc: '구독 서비스를 많이 이용해요', emoji: '🎵' },
                    };
                    // agentProfile 있으면 실제 데이터, 없으면 SPENDING_CATEGORIES 폴백
                    let topName: string;
                    if (agentProfile?.categoryExpense?.length) {
                      const top = [...agentProfile.categoryExpense].sort((a, b) => b.amount - a.amount)[0];
                      topName = top.name;
                    } else {
                      const fallback = [...SPENDING_CATEGORIES].sort((a, b) => b.pct - a.pct)[0];
                      // '식비 (배달 등)' → '식비', '온라인 쇼핑' → '쇼핑' 등 정규화
                      topName = fallback.label.replace(/\s*\(.*?\)/, '').replace('온라인 ', '');
                    }
                    const match = Object.entries(SPENDING_KEYWORD).find(([key]) => topName.includes(key));
                    if (!match) return null;
                    const { keyword, desc, emoji } = match[1];
                    return (
                      <div className="ml-1 flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-red-500 border border-red-200 whitespace-nowrap">
                          {keyword} {emoji}
                        </span>
                        <span className="text-xs text-gray-500">{desc}</span>
                      </div>
                    );
                  })()}
                </div>

                {(() => {
                  const CHART_COLORS = ['#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#e5e7eb'];
                  const cats = agentProfile?.categoryExpense ?? SPENDING_CATEGORIES.map((c, i) => ({ name: c.label, amount: 0, ratio: c.pct, _color: c.color, _idx: i }));
                  const monthlyAvg = agentProfile
                    ? `${(agentProfile.monthlyAvgExpense / 10000).toFixed(1)}만`
                    : '98.5만';
                  return (
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-center my-4">
                        <div className="relative w-36 h-36" onMouseLeave={() => setHoveredCat(null)}>
                          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                            {(() => {
                              let acc = 0;
                              return cats.map((c, i) => {
                                const pct = 'ratio' in c ? c.ratio : (c as typeof SPENDING_CATEGORIES[0]).pct;
                                const start = acc;
                                const end = acc + pct;
                                acc = end;
                                const color = agentProfile ? CHART_COLORS[i % CHART_COLORS.length] : (SPENDING_CATEGORIES[i]?.color ?? CHART_COLORS[i]);
                                return (
                                  <path
                                    key={i}
                                    d={donutArcPath(start, end, 50, 28, 50, 50)}
                                    fill={color}
                                    opacity={hoveredCat !== null && hoveredCat !== i ? 0.35 : 1}
                                    style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                                    onMouseEnter={() => setHoveredCat(i)}
                                    onClick={() => setHoveredCat(prev => prev === i ? null : i)}
                                  />
                                );
                              });
                            })()}
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center shadow-inner px-1 text-center">
                              {hoveredCat !== null ? (
                                <>
                                  <span className="text-[10px] text-gray-500 leading-tight truncate max-w-[68px]">
                                    {'name' in cats[hoveredCat] ? cats[hoveredCat].name : (cats[hoveredCat] as typeof SPENDING_CATEGORIES[0]).label}
                                  </span>
                                  <span className="font-bold text-sm leading-tight mt-0.5" style={{ color: agentProfile ? CHART_COLORS[hoveredCat % CHART_COLORS.length] : SPENDING_CATEGORIES[hoveredCat]?.color }}>
                                    {'ratio' in cats[hoveredCat] ? cats[hoveredCat].ratio : (cats[hoveredCat] as typeof SPENDING_CATEGORIES[0]).pct}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] text-gray-500">월 평균 소비</span>
                                  <span className="font-bold text-gray-800 text-sm">{monthlyAvg}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 space-y-3">
                        {cats.map((c, i) => {
                          const label = 'name' in c ? c.name : (c as typeof SPENDING_CATEGORIES[0]).label;
                          const pct = 'ratio' in c ? c.ratio : (c as typeof SPENDING_CATEGORIES[0]).pct;
                          const rawAmt = agentProfile && 'amount' in c
                            ? c.amount
                            : Math.round((agentProfile?.monthlyAvgExpense ?? 985000) * pct / 100);
                          const amount = rawAmt > 0 ? `${rawAmt.toLocaleString()}원` : '';
                          const color = agentProfile ? CHART_COLORS[i % CHART_COLORS.length] : (SPENDING_CATEGORIES[i]?.color ?? '#e5e7eb');
                          return (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span className="flex items-center gap-2 text-gray-700">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                {label} <span className="text-xs text-gray-400">{pct}%</span>
                              </span>
                              {amount && <span className="text-gray-600">{amount}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-sm text-gray-700">매월 나가는 고정 지출</span>
                    <span className="font-bold text-gray-800">
                      월 {agentProfile ? agentProfile.totalFixedExpense.toLocaleString() : '245,000'}원
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(agentProfile?.fixedExpense ?? [
                      { name: '보장성 보험료', amount: 150000 },
                      { name: '통신비', amount: 65000 },
                      { name: 'OTT 및 정기구독', amount: 30000 },
                    ]).map(({ name, amount }) => (
                      <div key={name} className="flex justify-between text-gray-600">
                        <span>{name}</span>
                        <span>{amount.toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleDetail('spending')}
                  className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition active:scale-[0.98]"
                >
                  <span>자세한 설명 보기</span>
                  {openDetail.spending ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDetail.spending && (
                  <div className="bg-blue-50 p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed text-blue-900 animate-in fade-in slide-in-from-top-1">
                    {agentProfile?.expenseComment ?? '소비 분석 데이터를 불러오는 중입니다.'}
                  </div>
                )}
              </section>

              {/* 저축·투자 현황 */}
              <section className="space-y-2">
                <h3 className="font-bold text-lg font-wooridaum">저축·투자</h3>
                <p className="text-sm font-semibold text-gray-400">현황</p>

                {(() => {
                  const safe = agentProfile?.investTendency?.safeRatio ?? 31;
                  const risk = agentProfile?.investTendency?.riskRatio ?? 29;
                  const moderate = agentProfile?.investTendency?.moderateRatio ?? Math.max(0, 100 - safe - risk);

                  // 백엔드 미제공 — 툴팁 설명용 고정 라벨
                  const safeAssets = '예적금, 채권';
                  const riskAssets = '국내외 주식, 코인';

                  const riskSegs = [
                    { label: '안정', pct: safe, bg: '#D1FAE5', text: '#065F46', tip: safeAssets },
                    { label: '중도', pct: moderate, bg: '#FEF9C3', text: '#854D0E', tip: `${safeAssets} · ${riskAssets}` },
                    { label: '공격', pct: risk, bg: '#FFE4E6', text: '#9F1239', tip: riskAssets },
                  ];

                  return (
                    <div className="flex h-12 rounded-xl overflow-hidden">
                      {riskSegs.map((s, i) => (
                        <div key={s.label} className="flex flex-col items-center justify-center relative cursor-default select-none"
                          style={{ flex: s.pct, background: s.bg, borderRight: i < riskSegs.length - 1 ? '2px solid white' : undefined }}
                          onMouseEnter={() => setHoveredRisk(s.label)} onMouseLeave={() => setHoveredRisk(null)}
                        >
                          <span className="text-xs font-bold leading-tight" style={{ color: s.text }}>{s.label}</span>
                          <span className="text-[10px] font-semibold leading-tight" style={{ color: s.text }}>{s.pct}%</span>
                          {hoveredRisk === s.label && (
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                              <div className="bg-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-lg text-[11px] text-gray-700 whitespace-nowrap font-medium">{s.tip}</div>
                              <div className="flex justify-center"><div className="w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45 -mt-1.5" /></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => toggleDetail('investment')}
                  className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition active:scale-[0.98]"
                >
                  <span>자세한 설명 보기</span>
                  {openDetail.investment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDetail.investment && (
                  <div className="bg-blue-50 p-4 rounded-2xl text-sm leading-relaxed text-blue-900 animate-in fade-in slide-in-from-top-1">
                    {agentProfile?.investComment ?? '투자 성향 분석 데이터를 불러오는 중입니다.'}
                  </div>
                )}
              </section>

              {/* 성향 */}
              <section className="space-y-3">
                <h3 className="font-bold text-lg font-wooridaum">성향</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-emerald-700 mb-2">💪 강점</p>
                    {result.strengths.map((s, i) => (
                      <p key={i} className="text-xs text-emerald-800 leading-snug mb-1">• {s}</p>
                    ))}
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-red-600 mb-2">⚠️ 약점</p>
                    {result.weaknesses.map((w, i) => (
                      <p key={i} className="text-xs text-red-700 leading-snug mb-1">• {w}</p>
                    ))}
                  </div>
                </div>
              </section>

              {/* 나와 닮은 투자 거장 (API agentProfile.investor 있을 때만) */}
              {agentProfile?.investor && (() => {
                const inv = agentProfile.investor;
                const investorName = inv.name;
                // 이름 매칭되는 거장 사진(없으면 이니셜 플레이스홀더)
                const investorImg = GURU_IMAGES[investorName];
                const investorQuote = inv.investmentStyle;   // 말풍선 인용구(거장 명언)
                const investorDesc = inv.description;         // 말풍선 본문
                const hashtags = [inv.hashtag1, inv.hashtag2].filter((t): t is string => !!t);

                return (
                  <section className="space-y-3">
                    <h3 className="font-bold text-lg font-wooridaum">나와 닮은 투자 거장</h3>
                    <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex flex-col items-center text-center shrink-0 w-20">
                        <div className="w-14 h-14 rounded-full overflow-hidden shadow-inner border border-blue-100 mb-2">
                          {investorImg ? (
                            <img src={investorImg} alt={investorName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-50 flex items-center justify-center text-lg font-bold text-blue-400">{investorName.charAt(0)}</div>
                          )}
                        </div>
                        <p className="font-bold text-sm text-gray-900 leading-tight">{investorName}</p>
                      </div>
                      <div className="flex-1">
                        {/* 해시태그 */}
                        {hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {hashtags.map(tag => (
                              <span key={tag} className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 leading-none">
                                #{tag.replace(/^#/, '')}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* 노란 말풍선 박스 */}
                        <div className="bg-[#FFFDF0] border border-yellow-200 rounded-2xl rounded-tl-none p-3.5 relative shadow-sm">
                          <div className="absolute top-4 -left-2 border-[6px] border-transparent border-r-[#FFFDF0] z-10" />
                          <div className="absolute top-4 -left-[9px] border-[6px] border-transparent border-r-yellow-200 z-0" />
                          {investorQuote && (
                            <p className="text-xs text-gray-400 italic mb-1.5">"{investorQuote}"</p>
                          )}
                          <p className="text-xs text-gray-700 leading-relaxed font-semibold">{investorDesc}</p>
                        </div>
                      </div>
                    </div>

                    {/* 큰손 포트폴리오 (거장 보유 종목) */}
                    {inv?.items && inv.items.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleDetail('portfolio')}
                          className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition active:scale-[0.98]"
                        >
                          <span>💰 {investorName}의 포트폴리오</span>
                          {openDetail.portfolio ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {openDetail.portfolio && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            {inv.items.map(item => {
                              const delta = item.currentRatio - item.prevQuarterRatio;
                              const up = item.changeRate >= 0;
                              return (
                                <div key={item.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm text-gray-900 truncate">{item.stockName}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                      보유 {item.holdingMonths}개월 · {item.sharesHeld.toLocaleString()}주
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0 ml-3">
                                    <p className="text-sm font-bold text-gray-800">
                                      비중 {item.currentRatio}%
                                      {delta !== 0 && (
                                        <span className={`ml-1 text-[11px] font-semibold ${delta > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}%p
                                        </span>
                                      )}
                                    </p>
                                    <p className={`text-[11px] font-semibold ${up ? 'text-red-500' : 'text-blue-500'}`}>
                                      {up ? '▲' : '▼'} {Math.abs(item.changeRate)}%
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            <p className="text-[10px] text-gray-400 text-center pt-0.5">전분기 대비 비중 변화 · 최근 등락률 기준</p>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                );
              })()}

            </div>{/* /마이데이터 섹션 px-5 */}

          </main>

          {/* 하단 고정 버튼 */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 pt-4 pb-6 z-20 shrink-0">
            <button
              onClick={() => navigate('/prescription-intro')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition shadow-lg flex justify-center items-center gap-2 active:scale-95"
            >
              맞춤형 월급 가이드 받기 <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── 질문 ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col shadow-2xl">

        {/* 진행 게이지 */}
        <div className="w-full h-2 bg-gray-100 shrink-0">
          <div
            className="h-full bg-red-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex-1 flex flex-col px-6 pt-6 pb-6">
          {/* 문항 번호 */}
          <p className="text-xs text-gray-400 text-right mb-2">
            {currentIndex + 1} / {TOTAL_QUESTIONS}
          </p>

          {/* 질문 영역 */}
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <span className="text-5xl">{currentQ.emoji}</span>
            {currentQ.bubble ? (
              <>
                <p className="text-sm text-gray-400 text-center">{currentQ.context}</p>
                <div className="flex justify-start w-full max-w-[280px]">
                  <div className="bg-yellow-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <p className="text-base text-gray-800 leading-relaxed">{currentQ.bubble}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xl font-bold text-gray-800 text-center leading-snug whitespace-pre-line font-wooridaum">
                {currentQ.context}
              </p>
            )}
          </div>

          {/* A / B 선택지 */}
          <div className="space-y-3 shrink-0">
            <button
              onClick={() => handleAnswer('A')}
              className="w-full text-left px-5 py-4 rounded-2xl bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border-2 border-gray-100 transition active:scale-[0.98]"
            >
              <span className="text-xs font-bold text-blue-400 mr-2">A.</span>
              <span className="text-sm text-gray-700">{currentQ.optionA}</span>
            </button>
            <button
              onClick={() => handleAnswer('B')}
              className="w-full text-left px-5 py-4 rounded-2xl bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border-2 border-gray-100 transition active:scale-[0.98]"
            >
              <span className="text-xs font-bold text-blue-400 mr-2">B.</span>
              <span className="text-sm text-gray-700">{currentQ.optionB}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
