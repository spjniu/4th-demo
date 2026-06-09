import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, HelpCircle, Check, X } from 'lucide-react';
import wooriLogo from '../assets/banks/woori.png';
import kakaoLogo from '../assets/banks/kakao.png';
import tossLogo from '../assets/banks/toss.png';
import shinhanLogo from '../assets/banks/shinhan.png';
import hanaLogo from '../assets/banks/hana.png';
import kbLogo from '../assets/banks/kb.png';
import miraeLogo from '../assets/banks/mirae.png';
import heroImg from '../assets/hero.png';
import { updatePortfolios } from '../api/portfolioApi';
import { getTransferPlans, updateTransferPlan } from '../api/transferApi';
import { getAssets } from '../api/assetApi';
import { getAgentRecommend } from '../api/agentApi';

type View = 'summary' | 'detail' | 'success';
type Tab = 'spend' | 'invest';

const fmt = (n: number) => n.toLocaleString('ko-KR');

const SPEND_TYPE_META: Record<string, { tag: string; color: string }> = {
  SPENDING: { tag: '생활비', color: '#F59E0B' },
  CASH:     { tag: '생활비', color: '#F59E0B' },
  EMERGENCY: { tag: '비상금', color: '#6366F1' },
  TARGET:   { tag: '목표',   color: '#10B981' },
  SAVING:   { tag: '저축',   color: '#3B82F6' },
  DEPOSIT:  { tag: '저축',   color: '#3B82F6' },
};


const BANK_META: Record<string, { bg: string; imgSrc: string }> = {
  '카카오뱅크': { bg: '#FEE500', imgSrc: kakaoLogo },
  '토스뱅크': { bg: '#3182F6', imgSrc: tossLogo },
  '토스증권': { bg: '#3182F6', imgSrc: tossLogo },
  '신한은행': { bg: '#0046FF', imgSrc: shinhanLogo },
  '하나은행': { bg: '#009F6B', imgSrc: hanaLogo },
  '우리은행': { bg: '#0067AC', imgSrc: wooriLogo },
  'KB국민은행': { bg: '#FFBC00', imgSrc: kbLogo },
  '미래에셋': { bg: '#F05928', imgSrc: miraeLogo },
};

const TERM_META: Record<string, { label: string; bg: string; text: string }> = {
  '단': { label: '단기', bg: 'bg-red-100', text: 'text-red-700' },
  '중': { label: '중기', bg: 'bg-amber-100', text: 'text-amber-700' },
  '장': { label: '장기', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const PRODUCT_TYPE_META: Record<string, { tag: string; term: string }> = {
  DEPOSIT: { tag: '예금', term: '단' },
  BOND: { tag: '채권', term: '중' },
  STOCK: { tag: '주식', term: '장' },
};


const REASONS = [
  '생활비 카테고리 지난달 32,000원 초과',
  '비상금 최근 3개월 미인출',
  '투자 비율 20% 유지 기준 충족',
];

const SPEND_REASONS = [
  '생활비 카테고리 지난달 32,000원 초과',
  '비상금 최근 3개월 미인출',
];

const INVEST_REASONS = [
  '단기 목적 자산(생활 여유 자금)의 유동성 확보와 우대 금리 혜택을 위해 추천해요',
  '중기 목표 자금 마련 및 안정적 가치 상승을 위한 자산 분산 투자처예요',
];

interface Plan {
  id: string;
  name: string;
  tag: string;
  amount: number;
  delta: number;
  editedDelta: number;
  color: string;
  logo: string;
  term?: string | null;
  institution?: string | null;
  interestRate?: number | null;
  productType?: string;
}

interface Props {
  onClose?: () => void;
}

export default function SalaryManagement({ onClose }: Props) {
  const navigate = useNavigate();
  
  const handleClose = () => {
    if (onClose) onClose();
    else navigate('/dashboard');
  };

  const [view, setView] = useState<View>('summary');
  const [activeTab, setActiveTab] = useState<Tab>('spend');
  const [spendPlans, setSpendPlans] = useState<Plan[]>([]);
  const [investPlans, setInvestPlans] = useState<Plan[]>([]);
  const [salary, setSalary] = useState(0);
  const [salaryDelta, setSalaryDelta] = useState(0);
  const [salaryAccount, setSalaryAccount] = useState<{ institution: string; logo: string } | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; bank: string; logo: string }>>([]);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccId, setSelectedAccId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [agentReasons, setAgentReasons] = useState<string[]>(REASONS);
  const [agentPlanComments, setAgentPlanComments] = useState<Record<string, string>>({});



  useEffect(() => {
    const now = new Date();
    // agent 추천 (실패해도 하드코딩 fallback 유지)
    getAgentRecommend()
      .then(rec => {
        const reasons: string[] = [];
        if (rec.fixedExpenseComment) reasons.push(rec.fixedExpenseComment);
        rec.rebalancingPlans?.forEach(p => {
          if (p.comment) reasons.push(p.comment);
        });
        if (reasons.length > 0) setAgentReasons(reasons);
        const comments: Record<string, string> = {};
        rec.rebalancingPlans?.forEach(p => {
          if (p.assetId && p.comment) comments[p.assetId] = p.comment;
        });
        setAgentPlanComments(comments);
      })
      .catch(() => { /* fallback: hardcoded REASONS already set */ });

    Promise.all([
      getTransferPlans(now.getFullYear(), now.getMonth() + 1),
      getAssets(),
    ])
      .then(([planData, assets]) => {
        // 급여 계좌 정보
        const salaryAsset = assets.find(a => a.isSalary);
        if (salaryAsset) {
          setSalary(planData.currentSalary ?? salaryAsset.balance);
          setSalaryAccount({
            institution: salaryAsset.institution,
            logo: BANK_META[salaryAsset.institution]?.imgSrc ?? wooriLogo,
          });
        }
        setSalaryDelta(planData.salaryDiff ?? 0);

        // 지출 항목 (portfolioItems: CASH/DEPOSIT/EMERGENCY)
        if (planData.portfolioItems.length > 0) {
          setSpendPlans(planData.portfolioItems.map(p => {
            const typeMeta = SPEND_TYPE_META[p.assetType] ?? { tag: p.assetType, color: '#94A3B8' };
            return {
              id: p.planId,
              name: p.institution ?? '계좌',
              tag: typeMeta.tag,
              amount: p.baselineAmount,
              delta: p.plannedAmount,
              editedDelta: p.plannedAmount,
              color: typeMeta.color,
              logo: p.institution ? (BANK_META[p.institution]?.imgSrc ?? wooriLogo) : wooriLogo,
            };
          }));
        }

        // 투자 항목 (flowItems: portfolio_flows 기반)
        if (planData.flowItems.length > 0) {
          setInvestPlans(planData.flowItems.map(p => {
            const meta = PRODUCT_TYPE_META[p.productType ?? ''] ?? { tag: p.productType ?? '투자', term: null };
            return {
              id: p.planId,
              name: p.institution ?? '투자계좌',
              tag: meta.tag,
              amount: p.baselineAmount,
              delta: p.plannedAmount,
              editedDelta: p.plannedAmount,
              color: '#3b82f6',
              logo: p.institution ? (BANK_META[p.institution]?.imgSrc ?? wooriLogo) : wooriLogo,
              term: meta.term ?? null,
              institution: p.institution,
              interestRate: null,
              productType: p.productType ?? undefined,
            };
          }));
        }

        setAccounts(
          assets.map(a => ({
            id: a.id,
            name: a.accountName,
            bank: a.institution,
            logo: BANK_META[a.institution]?.imgSrc ?? wooriLogo,
          })),
        );
      })
      .catch(err => console.error('이체 계획 조회 실패:', err));
  }, []);

  const spendDelta = spendPlans.reduce((s, p) => s + p.editedDelta, 0);
  const investDelta = investPlans.reduce((s, p) => s + p.editedDelta, 0);
  const remain = salary - spendDelta - investDelta;
  const isOver = remain < 0;

  const handleConfirm = async () => {
    try {
      await Promise.all(
        spendPlans
          .filter(p => p.editedDelta !== p.delta)
          .map(p => updateTransferPlan(p.id, p.editedDelta)),
      );
    } catch (err) {
      console.error('[SalaryManagement] PATCH /transfer-plans 실패:', err);
    }
    try {
      const portfolios = investPlans.map(p => ({
        assetType: p.productType ?? p.tag,
        assetAmount: p.editedDelta,
        assetId: p.id,
      }));
      await updatePortfolios(portfolios, investDelta);
    } catch (err) {
      console.error('[SalaryManagement] PATCH /portfolios 실패:', err);
    }
    setView('success');
  };

  const activePlans = activeTab === 'spend' ? spendPlans : investPlans;
  const setActivePlans = activeTab === 'spend' ? setSpendPlans : setInvestPlans;

  const openAddModal = () => { setSelectedAccId(null); setNewTag(''); setShowAddModal(true); };

  const addAccount = () => {
    const acc = accounts.find(a => a.id === selectedAccId);
    const tag = newTag.trim();
    if (!acc || !tag) return;
    setActivePlans(prev => [...prev, {
      id: String(Date.now()), name: acc.name, tag,
      amount: 0, delta: 0, editedDelta: 0,
      color: '#94A3B8', logo: acc.logo,
    }]);
    setShowAddModal(false);
  };

  // ── 요약 카드 ─────────────────────────────────────────
  // Case1: |salaryDiff| ≤ 5만 → 회색, "월급이 들어왔어요", currentSalary 표시
  // Case2: |salaryDiff| > 5만 → 빨간색, "월급에 변동이 있어요", salaryDiff 표시
  const isCase2 = Math.abs(salaryDelta) > 50000;

  if (view === 'summary') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex justify-center">
        <div className="w-full max-w-[375px] flex flex-col h-screen">
          {/* Header */}
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <span className="text-base font-bold text-slate-800">월급</span>
            </div>
            <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-700 text-base p-1 flex items-center justify-center">✕</button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <h3 className="text-lg font-bold text-slate-800 text-center mt-2.5 mb-1.5">
              {isCase2 ? '월급에 변동이 있어요!' : '월급이 들어왔어요!'}
            </h3>

            {/* 월급 금액: Case1=변동없음(+없음), Case2=변동(+붙음) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                {salaryAccount?.logo && (
                  <img src={salaryAccount.logo} alt="" className="w-4 h-4 rounded-full object-contain" />
                )}
                <p className="text-xs text-slate-400">{salaryAccount?.institution ?? '급여'} 급여통장</p>
              </div>
              {isCase2 ? (
                <p className="text-3xl font-extrabold text-red-500">
                  {salaryDelta >= 0 ? '+' : ''}{fmt(salaryDelta)}원
                </p>
              ) : (
                <p className="text-3xl font-extrabold text-slate-600">
                  {fmt(salary)}원
                </p>
              )}
            </div>

            {/* Pori 분배 가이드 (agent API, 실패 시 fallback) */}
            <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-2xl px-4 py-3.5 space-y-1.5">
              <p className="text-xs font-bold text-blue-500 mb-0.5">Pori의 분배 가이드</p>
              {agentReasons.map((r, i) => (
                <p key={i} className="text-xs text-[#92400e] leading-relaxed">{r}</p>
              ))}
            </div>

            {/* 세부 분배 계획 */}
            <div className="flex flex-col gap-3">
              {/* 지출할 금액 */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex">
                <div className="w-[80px] shrink-0 bg-[#f8fafc] border-r border-slate-100 flex flex-col items-center justify-center p-2 text-center">
                  <p className="text-xs font-bold text-slate-500 leading-tight">지출할<br />금액</p>
                </div>
                <div className="flex-1 p-3.5 space-y-3.5 bg-white">
                  {spendPlans.map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-slate-100">
                          <img src={p.logo} alt="" className="w-4 h-4 object-contain" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0">{p.tag}</span>
                      </div>
                      {/* Case2에만 +/- 표시 */}
                      <span className={`text-xs font-extrabold shrink-0 ${isCase2 ? 'text-red-500' : 'text-slate-600'}`}>
                        {isCase2 && p.editedDelta >= 0 ? '+' : ''}{fmt(p.editedDelta)}원
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 투자할 금액 */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex">
                <div className="w-[80px] shrink-0 bg-[#f8fafc] border-r border-slate-100 flex flex-col items-center justify-center p-2 text-center">
                  <p className="text-xs font-bold text-blue-600 leading-tight">투자할<br />금액</p>
                </div>
                <div className="flex-1 p-3.5 space-y-3.5 bg-white">
                  {investPlans.map(p => {
                    const termInfo = p.term ? TERM_META[p.term] : null;
                    return (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-slate-100">
                            <img src={p.logo} alt="" className="w-4 h-4 object-contain" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                          {termInfo ? (
                            <span className={`${termInfo.bg} ${termInfo.text} px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0`}>{termInfo.label}</span>
                          ) : (
                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0">{p.tag}</span>
                          )}
                        </div>
                        <span className={`text-xs font-extrabold shrink-0 ${isCase2 ? 'text-red-500' : 'text-slate-600'}`}>
                          {isCase2 && p.editedDelta >= 0 ? '+' : ''}{fmt(p.editedDelta)}원
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex border-t border-slate-100 bg-white shrink-0">
            <button onClick={() => setView('detail')}
              className="flex-1 py-4 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-colors border-r border-slate-100">
              재설정
            </button>
            <button onClick={handleConfirm}
              className="flex-1 py-4 text-blue-600 font-bold text-sm hover:bg-blue-50 transition-colors">
              이대로 하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 완료 화면 ────────────────────────────────────────────
  if (view === 'success') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-[popIn_0.25s_cubic-bezier(0.16,1,0.3,1)]">
          <img src={heroImg} alt="Pori" className="w-28 h-28 object-contain" />
          <h2 className="text-xl font-bold text-slate-800">월급 나누기 완료</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-1 px-12 py-3 bg-blue-600 text-white font-bold rounded-xl text-base hover:bg-blue-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  // ── 상세 (재설정) ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] h-screen flex flex-col bg-white relative shadow-2xl overflow-hidden">


        <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100 shrink-0">
          <button className="p-2" onClick={() => setView('summary')}><ChevronLeft className="w-6 h-6" /></button>
          <h1 className="font-semibold text-lg">월급 관리</h1>
          <button className="p-2 text-slate-400" onClick={handleClose}><X className="w-5 h-5" /></button>
        </header>

        <main className="flex-1 overflow-y-auto p-5 pt-4 pb-6">

          {/* 급여통장 노드 */}
          <div className="flex flex-col items-center mb-1">
            <p className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <img src={salaryAccount?.logo ?? wooriLogo} alt="" className="w-4 h-4 rounded-full object-contain" />
              {salaryAccount?.institution ?? '급여'} 급여통장
            </p>
            <div className="border-2 border-slate-700 rounded-2xl px-6 py-2.5 shadow-sm bg-white text-center">
              <p className="text-xs text-slate-400">{fmt(salary)}<span className="ml-0.5">원</span></p>
              {salaryDelta !== 0 && (
                <p className="text-sm font-bold text-red-500 mt-0.5">
                  {salaryDelta > 0 ? '+' : ''}{fmt(salaryDelta)}원
                </p>
              )}
            </div>
          </div>

          {/* T자 분기선 */}
          <div className="relative h-7 pointer-events-none">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] h-[14px] bg-slate-300" />
            <div className="absolute left-[25%] right-[25%] top-[12px] h-[2px] bg-slate-300 rounded-sm" />
            <div className="absolute left-[25%] -translate-x-1/2 top-[12px] w-[2px] h-[16px] bg-slate-300" />
            <div className="absolute right-[25%] translate-x-1/2 top-[12px] w-[2px] h-[16px] bg-slate-300" />
          </div>

          {/* 탭 노드 */}
          <div className="grid grid-cols-2 gap-4 mb-1">
            <button onClick={() => setActiveTab('spend')} className="text-left w-full">
              <p className={`text-xs font-semibold mb-1 text-center transition-colors ${activeTab === 'spend' ? 'text-slate-600' : 'text-slate-300'}`}>지출할 금액</p>
              <div className={`rounded-2xl px-3 py-2.5 text-center transition-all ${activeTab === 'spend' ? 'border-2 border-slate-700 bg-white' : 'border border-slate-200 bg-white opacity-50'}`}>
                <p className="text-xs text-slate-400">{fmt(spendDelta)}<span className="ml-0.5">원</span></p>
                <p className={`text-sm font-bold ${spendDelta < 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {spendDelta < 0 ? '−' : '+'}{fmt(Math.abs(spendDelta))}원
                </p>
              </div>
            </button>
            <button onClick={() => setActiveTab('invest')} className="text-left w-full">
              <p className={`text-xs font-semibold mb-1 text-center transition-colors ${activeTab === 'invest' ? 'text-blue-400' : 'text-slate-300'}`}>투자할 금액</p>
              <div className={`rounded-2xl px-3 py-2.5 text-center transition-all ${activeTab === 'invest' ? 'border-2 border-blue-400 bg-blue-50' : 'border border-slate-200 bg-white opacity-50'}`}>
                <p className="text-xs text-slate-400">{fmt(investDelta)}<span className="ml-0.5">원</span></p>
                <p className={`text-sm font-bold ${investDelta < 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {investDelta < 0 ? '−' : '+'}{fmt(Math.abs(investDelta))}원
                </p>
              </div>
            </button>
          </div>

          {/* 계좌 트리 */}
          <div className="relative mt-3">
            {/* 브랜치 연결선 (Symmetrical Dynamic SVG Path - 오버랩 처리로 선 끊김 방지) */}
            <div className="relative h-8 w-full pointer-events-none mb-1">
              <svg className="absolute inset-0 w-full h-full text-slate-300 overflow-visible" fill="none" stroke="currentColor">
                <path
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={activeTab === 'spend'
                    ? "M 87.5 -8 L 87.5 16 L 24 16 L 24 40"
                    : "M 262.5 -8 L 262.5 16 L 326 16 L 326 40"
                  }
                />
              </svg>
            </div>

            <div className="space-y-5 relative">
              {activePlans.map((plan, idx) => {
                const isInvest = activeTab === 'invest';
                const isNeg = plan.editedDelta < 0;
                const abs = Math.abs(plan.editedDelta);
                const termInfo = plan.term ? TERM_META[plan.term] : null;
                const meta = isInvest && plan.institution ? BANK_META[plan.institution] : null;
                const isLast = idx === activePlans.length - 1;

                // 💡 동적 안전 조절 한도 계산 (마이너스 차단 & 전체 월급 인상분(10만원) 한도 내 배분 가능)
                const minVal = 0; // 마이너스 불가능
                const safeMax = Math.max(0, plan.editedDelta + remain);

                return (
                  <div key={plan.id} className={`relative pt-2 ${isInvest ? 'pr-12 pl-1' : 'pl-12 pr-1'}`}>
                    {/* 수직선 세그먼트 (top-[-8px] 오버랩을 적용하여 dynamic SVG와 Flawless하게 결합) */}
                    {isInvest ? (
                      /* 투자 탭: 우측 수직선 */
                      <div className={`absolute right-[23px] top-[-8px] w-[2px] bg-slate-300 z-0
                        ${isLast ? 'h-[52px]' : '-bottom-5'}`} />
                    ) : (
                      /* 지출 탭: 좌측 수직선 (지출 탭에도 계좌 추가 버튼을 없앴으므로, 마지막 카드이면 h-[52px]로 끝맺음) */
                      <div className={`absolute left-[23px] top-[-8px] w-[2px] bg-slate-300 z-0
                        ${isLast ? 'h-[52px]' : '-bottom-5'}`} />
                    )}

                    {/* 수평 화살표 */}
                    <svg className={`absolute top-11 w-6 h-4 text-slate-300 ${isInvest ? 'right-6' : 'left-6'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="none"
                      style={isInvest ? { transform: 'scaleX(-1)' } : undefined}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M0 12h20M16 6l6 6-6 6" />
                    </svg>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      {/* 카드 헤더 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isInvest ? (
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                              <img src={meta?.imgSrc ?? plan.logo} alt="" className="w-5 h-5 object-contain" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                              <img src={plan.logo} alt="" className="w-5 h-5 object-contain" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-700 text-sm leading-tight">{plan.name}</p>
                            {isInvest && plan.institution && (
                              <p className="text-[10px] text-slate-400 leading-none mt-0.5">{plan.institution}</p>
                            )}
                          </div>
                        </div>
                        {isInvest && termInfo ? (
                          <span className={`${termInfo.bg} ${termInfo.text} px-2 py-0.5 rounded-md text-xs font-medium`}>{termInfo.label}</span>
                        ) : (
                          <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md text-xs font-medium">{plan.tag}</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 text-right mb-1">{fmt(plan.amount)}원</p>
                      {isInvest && plan.interestRate != null && (
                        <p className="text-xs text-emerald-600 font-medium text-right mb-1">연 {plan.interestRate}%</p>
                      )}

                      {/* 컴팩트 조정 영역 (수동 조절 스크롤 제거, + - 5000원 버튼 및 AI 추천 팁 제공) */}
                      <div className="mt-2.5 flex items-center gap-2">
                        {/* 컴팩트 디스플레이 필 */}
                        <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-2 py-1 flex items-center justify-between">
                          {/* 마이너스 버튼 */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = plan.editedDelta - 5000;
                              if (nextVal >= minVal) {
                                setActivePlans(prev => prev.map(p => p.id === plan.id ? { ...p, editedDelta: nextVal } : p));
                              }
                            }}
                            disabled={plan.editedDelta <= minVal}
                            className={`w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center font-extrabold text-xs focus:outline-none transition-all
                              ${plan.editedDelta <= minVal ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600 active:scale-95'}`}
                          >
                            -
                          </button>

                          {/* 중앙 정합 금액값 */}
                          <div className="flex items-center gap-1 font-extrabold text-sm">
                            <span className={plan.editedDelta > 0 ? 'text-red-500' : 'text-slate-500'}>
                              {plan.editedDelta > 0 ? '+' : ''}{fmt(plan.editedDelta)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">원</span>

                            {/* 미세다이얼 아이콘 */}
                            <svg className={`w-3.5 h-3.5 ml-1 text-slate-300 shrink-0 ${plan.editedDelta !== 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <circle cx={12} cy={12} r={9} strokeDasharray="3 3" />
                              <circle cx={12} cy={12} r={3} />
                            </svg>
                          </div>

                          {/* 플러스 버튼 */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = plan.editedDelta + 5000;
                              if (nextVal <= safeMax) {
                                setActivePlans(prev => prev.map(p => p.id === plan.id ? { ...p, editedDelta: nextVal } : p));
                              }
                            }}
                            disabled={plan.editedDelta >= safeMax}
                            className={`w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center font-extrabold text-xs focus:outline-none transition-all
                              ${plan.editedDelta >= safeMax ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600 active:scale-95'}`}
                          >
                            +
                          </button>
                        </div>

                        {/* AI 추천 팁 툴팁 */}
                        <div className="relative shrink-0 flex items-center">
                          <button
                            type="button"
                            onMouseEnter={() => setTooltip(plan.id)}
                            onMouseLeave={() => setTooltip(null)}
                            className="p-1.5 focus:outline-none rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                          >
                            <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-500 transition-colors" />
                          </button>
                          {tooltip === plan.id && (
                            <div className="absolute right-0 bottom-8 w-60 bg-slate-800 text-white text-[11px] px-3 py-2.5 rounded-xl shadow-xl z-50 leading-relaxed pointer-events-none">
                              <div className="absolute -bottom-1 right-3.5 w-2 h-2 bg-slate-800 rotate-45" />
                              💡 {agentPlanComments[plan.id] ?? (isInvest ? INVEST_REASONS : SPEND_REASONS)[idx] ?? 'AI 추천 조정 금액이에요'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </main>

        {/* 하단 고정 바 (h-screen flex layout으로 완벽 격리 및 고정) */}
        <div className="bg-white border-t border-slate-100 px-5 pt-3 pb-6 shrink-0 shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.06)] z-20">
          <div className="flex justify-between items-baseline mb-0.5">
            <span className="text-xs font-semibold text-slate-500">통장에 남은 금액</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-extrabold ${isOver ? 'text-red-500' : 'text-blue-600'}`}>{fmt(remain)}</span>
              <span className="text-lg text-slate-400">원</span>
            </div>
          </div>
          <span className={`block text-[10px] text-red-500 font-medium h-3 mb-2 transition-opacity ${isOver ? 'opacity-100' : 'opacity-0'}`}>
            +{fmt(salary)}원보다 많이 배분했어요
          </span>
          <button disabled={isOver} onClick={handleConfirm}
            className={`w-full ${isOver ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white py-3.5 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2`}>
            완료 <Check className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 계좌 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-11/12 max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-base font-bold text-slate-800">계좌 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="px-6 pb-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">계좌 선택</label>
                <div className="space-y-2">
                  {accounts.map(acc => {
                    const isSel = selectedAccId === acc.id;
                    return (
                      <button key={acc.id} type="button"
                        onClick={() => setSelectedAccId(isSel ? null : acc.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border-2 flex items-center justify-between transition active:scale-[0.98] ${isSel ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div className="flex items-center gap-2.5">
                          <img src={acc.logo} alt="" className="w-8 h-8 rounded-full object-contain border border-slate-100 bg-white shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400">{acc.bank}</p>
                            <p className="text-sm font-bold text-slate-800">{acc.name}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSel ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                          {isSel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">태그</label>
                <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addAccount(); }}
                  placeholder="예: 여행 자금"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
              </div>
            </div>
            <div className="flex border-t border-slate-100 bg-slate-50">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-500 font-semibold hover:bg-slate-100 transition-colors border-r border-slate-200">취소</button>
              <button onClick={addAccount} disabled={!selectedAccId || !newTag.trim()}
                className="flex-1 py-4 text-blue-600 font-bold hover:bg-blue-50 transition-colors disabled:text-slate-300 disabled:hover:bg-slate-50">추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
