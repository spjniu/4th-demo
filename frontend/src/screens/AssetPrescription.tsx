import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Info, Lock, LockOpen, Check, HelpCircle, Trash2, Plus, X } from 'lucide-react';
import kakaoLogo from '../assets/banks/kakao.png';
import tossLogo from '../assets/banks/toss.png';
import shinhanLogo from '../assets/banks/shinhan.png';
import wooriLogo from '../assets/banks/woori.png';
import kbLogo from '../assets/banks/kb.png';
import hanaLogo from '../assets/banks/hana.png';
import miraeLogo from '../assets/banks/mirae.png';
import samsungLogo from '../assets/banks/samsung.png';
import { useAuth } from '../contexts/AuthContext';
import { getAgentRecommend, type AgentRecommend } from '../api/agentApi';
import { createPortfolios } from '../api/portfolioApi';
import { getAssets, type Asset } from '../api/assetApi';
import { getTransferPlans } from '../api/transferApi';

const BANK_LOGOS: Record<string, string> = {
  '카카오뱅크': kakaoLogo,
  '토스뱅크': tossLogo,
  '토스증권': tossLogo,
  '신한은행': shinhanLogo,
  '우리은행': wooriLogo,
  '국민은행': kbLogo,
  'KB국민은행': kbLogo,
  'KB증권': kbLogo,
  '삼성증권': samsungLogo,
  '하나은행': hanaLogo,
  '미래에셋': miraeLogo,
  '미래에셋증권': miraeLogo,
};

interface Account {
  id: number;
  assetId?: string;
  assetType?: string;
  bank: string;
  bankName: string;
  tag: string;
  amount: number;
  percent: number;
  isPinned: boolean;
  color: string;
  comment?: string;   // AI가 이 계좌에 이 금액을 배분한 이유
}

const TAG_COLORS = [
  'bg-red-100 text-red-600',
  'bg-emerald-100 text-emerald-600',
  'bg-purple-100 text-purple-600',
  'bg-blue-100 text-blue-600',
  'bg-amber-100 text-amber-600',
  'bg-pink-100 text-pink-600',
  'bg-indigo-100 text-indigo-600',
  'bg-teal-100 text-teal-600',
];

interface LinkedAccount {
  id: string;
  assetId?: string;
  assetType?: string;
  bank: string;
  name: string;
  short: string;
  badgeBg: string;
  badgeColor: string;
}

function assetToLinked(asset: Asset): LinkedAccount {
  const inst = asset.institution ?? '';
  return {
    id: asset.id,
    assetId: asset.id,
    assetType: asset.assetType,
    bank: inst,
    name: asset.accountName ?? asset.assetType,
    short: inst.slice(0, 2),
    badgeBg: 'bg-blue-50',
    badgeColor: 'text-blue-600',
  };
}

const ASSET_TYPE_TO_CATEGORY: Record<string, string> = {
  CHECKING: 'CASH',
  PARKING: 'CASH',
  CMA: 'CASH',
  SAVINGS: 'DEPOSIT',
  DEPOSIT: 'DEPOSIT',
  STOCK: 'STOCK',
  BOND: 'BOND',
  IRP: 'IRP',
};

function toAssetCategory(assetType?: string): string {
  if (!assetType) return 'CASH';
  return ASSET_TYPE_TO_CATEGORY[assetType] ?? 'CASH';
}

const formatNumber = (n: number) => n.toLocaleString('ko-KR');
const parseDigits = (s: string) => parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;

export default function AssetPrescription() {
  const { userName: USER_NAME } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const recommend = location.state?.recommend as AgentRecommend | undefined;

  const [totalSalary, setTotalSalary] = useState(recommend?.salary ?? 0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [showFixedInfo, setShowFixedInfo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLinkedId, setSelectedLinkedId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [deleteTargetIdx, setDeleteTargetIdx] = useState<number | null>(null);
  const [bankPickerForIdx, setBankPickerForIdx] = useState<number | null>(null);
  const [commentTooltip, setCommentTooltip] = useState<number | null>(null);
  const [customLinkedAccounts, setCustomLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isCreatingNewWoori, setIsCreatingNewWoori] = useState(false);
  const [newWooriName, setNewWooriName] = useState('');

  const allLinkedAccounts = [...linkedAccounts, ...customLinkedAccounts];
  const [toast, setToast] = useState<{ top: number; left: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyRecommend = (data: AgentRecommend, assets: Asset[] = []) => {
    setTotalSalary(data.salary);
    setInvestmentAmount(data.investAmount);
    const assetMap = Object.fromEntries(assets.map(a => [a.id, a]));
    setAccounts(data.rebalancingPlans.map((plan, i) => ({
      id: i,
      assetId: plan.assetId,
      assetType: plan.assetType,
      bank: assetMap[plan.assetId]?.accountName || plan.institution,   // 왼쪽 = 통장이름
      bankName: plan.institution,
      tag: plan.nickname || plan.assetType,                            // 파란칸 = nickname(생활비/비상금/적금)
      amount: plan.amount,
      percent: data.salary > 0 ? Math.round((plan.amount / data.salary) * 100) : 0,
      isPinned: false,
      color: TAG_COLORS[i % TAG_COLORS.length],
      comment: plan.comment ?? undefined,
    })));
  };

  // 자산 목록 로드 + 추천 데이터로 초기화
  useEffect(() => {
    const now = new Date();

    if (recommend) {
      getAssets()
        .then(assets => {
          setLinkedAccounts(assets.map(assetToLinked));
          applyRecommend(recommend, assets);   // 통장이름 조인 위해 assets 전달
        })
        .catch(() => applyRecommend(recommend));
    } else {
      // assets + (agentRecommend or transferPlans) 동시 로드
      Promise.all([
        getAssets(),
        getAgentRecommend().catch(() => null), // Flask 장애 시 null
      ]).then(([assets, rec]) => {
        setLinkedAccounts(assets.map(assetToLinked));
        if (rec) {
          applyRecommend(rec, assets);
        } else {
          // Flask 장애 fallback: transfer-plans + assets로 분배 구성
          const assetMap = Object.fromEntries(assets.map(a => [a.id, a]));
          getTransferPlans(now.getFullYear(), now.getMonth() + 1)
            .then(plan => {
              if (plan.currentSalary) setTotalSalary(plan.currentSalary);
              if (plan.portfolioItems.length > 0) {
                const salary = plan.currentSalary ?? 0;
                setAccounts(plan.portfolioItems.map((p, i) => {
                  const asset = assetMap[p.assetId];
                  // bank = 통장이름, tag = nickname(accountPurpose) — applyRecommend 와 동일 규칙
                  const ASSET_TYPE_LABEL: Record<string, string> = {
                    CASH: '생활비', DEPOSIT: '저축', EMERGENCY: '비상금',
                    SAVING: '저축', FIXED: '고정지출', STOCK: '투자',
                  };
                  const accountName = asset?.accountName ?? p.accountName ?? p.institution ?? p.assetType;
                  return {
                    id: i,
                    assetId: p.assetId,
                    assetType: p.assetType,
                    bank: accountName,
                    bankName: p.institution ?? '',
                    tag: p.accountPurpose ?? ASSET_TYPE_LABEL[p.assetType] ?? p.assetType,
                    amount: p.plannedAmount,
                    percent: salary > 0 ? Math.round((p.plannedAmount / salary) * 100) : 0,
                    isPinned: false,
                    color: TAG_COLORS[i % TAG_COLORS.length],
                  };
                }));
              }
            })
            .catch(() => { });
        }
      }).catch(() => { });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const [investmentAmount, setInvestmentAmount] = useState(recommend?.investAmount ?? 0);

  const totalAmount = accounts.reduce((sum, a) => sum + a.amount, 0);
  const spendAmount = totalSalary - investmentAmount;
  const remain = spendAmount - totalAmount;
  const isOver = remain < 0;

  const updateAmount = (idx: number, amount: number) => {
    setAccounts(prev => prev.map((a, i) => i === idx
      ? { ...a, amount, percent: totalSalary > 0 ? Math.round((amount / totalSalary) * 100) : 0 }
      : a));
  };

  const updateTag = (idx: number, tag: string) => {
    setAccounts(prev => prev.map((a, i) => i === idx ? { ...a, tag } : a));
  };

  const pickBankFor = (linked: LinkedAccount) => {
    if (bankPickerForIdx === null) return;
    setAccounts(prev => prev.map((a, i) => i === bankPickerForIdx ? { ...a, assetId: linked.assetId, assetType: linked.assetType, bank: linked.name, bankName: linked.bank } : a));
    setBankPickerForIdx(null);
  };

  const confirmDelete = () => {
    if (deleteTargetIdx === null) return;
    setAccounts(prev => prev.filter((_, i) => i !== deleteTargetIdx));
    setDeleteTargetIdx(null);
  };

  const openAddModal = () => {
    setSelectedLinkedId(null);
    setNewTag('');
    setIsCreatingNewWoori(false);
    setNewWooriName('');
    setShowAddModal(true);
  };

  const createNewWooriAccount = () => {
    const name = newWooriName.trim();
    if (!name) return;
    if (allLinkedAccounts.some(a => a.name === name)) return;
    const newAcc: LinkedAccount = {
      id: `woori-new-${Date.now()}`,
      bank: '우리은행',
      name,
      short: '우리',
      badgeBg: 'bg-blue-100',
      badgeColor: 'text-blue-800',
    };
    setCustomLinkedAccounts(prev => [...prev, newAcc]);
    setSelectedLinkedId(newAcc.id);
    setIsCreatingNewWoori(false);
    setNewWooriName('');
  };

  const addAccount = () => {
    const linked = allLinkedAccounts.find(a => a.id === selectedLinkedId);
    const tag = newTag.trim();
    if (!linked || !tag) return;
    const nextId = accounts.reduce((max, a) => Math.max(max, a.id), -1) + 1;
    const color = TAG_COLORS[accounts.length % TAG_COLORS.length];
    setAccounts(prev => [
      ...prev,
      { id: nextId, assetId: linked.assetId, assetType: linked.assetType, bank: linked.name, bankName: linked.bank, tag, amount: 0, percent: 0, isPinned: false, color },
    ]);
    setShowAddModal(false);
  };

  const togglePin = (idx: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const willPin = !accounts[idx].isPinned;
    setAccounts(prev => prev.map((a, i) => i === idx ? { ...a, isPinned: willPin } : a));

    if (willPin) {
      const rect = e.currentTarget.getBoundingClientRect();
      setToast({ top: rect.top - 45, left: rect.right - 230 });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 3000);
    }
  };

  const handleComplete = () => {
    if (isOver) return;
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    const portfolios = accounts.map(a => ({
      assetType: toAssetCategory(a.assetType),
      assetAmount: a.amount,
      ...(a.assetId ? { assetId: a.assetId } : {}),
    }));
    try {
      await createPortfolios(portfolios, investmentAmount, totalSalary);
    } catch (err) {
      console.error('[AssetPrescription] POST /portfolios 실패:', err);
    }
    navigate('/prescription-complete');
  };

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white relative shadow-2xl pb-32">

        {/* 상단 네비게이션 */}
        <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-20">
          <button className="p-2" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-lg">월급 관리</h1>
          <div className="w-10" />
        </header>

        <main className="p-5 pt-2">
          {/* 헤더 텍스트 */}
          <h2 className="text-base font-bold leading-snug mb-3.5 text-slate-800">
            <span className="text-blue-600">Pori</span>가 {USER_NAME}님에 맞게 월급을 나눠봤어요!
          </h2>

          {/* Row 1: 급여통장 (중앙 정렬) */}
          <div className="flex flex-col items-center justify-center relative z-10 pt-2">
            <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-center gap-1">
              <img src={wooriLogo} alt="우리은행" className="w-4 h-4 rounded-full object-contain" />
              우리은행 급여통장
            </p>

            <div className="border-2 border-slate-700 rounded-2xl px-5 py-2.5 shadow-sm bg-white min-w-[140px] text-center">
              <span className="text-base font-extrabold tracking-tight">
                {formatNumber(totalSalary)}<span className="text-xs font-bold text-slate-600 ml-0.5">원</span>
              </span>
            </div>
          </div>

          {/* 급여통장에서 아래 두 갈래로 나뉘는 T자형 연결선 영역 (높이 28px 확보) */}
          <div className="relative h-7 pointer-events-none z-0">
            {/* 1. 중앙 수직 하강선 */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[3px] h-[14px] bg-slate-700" />

            {/* 2. 가로 분기선 (좌측 25% 지점부터 우측 25% 지점까지) */}
            <div className="absolute left-[25%] right-[25%] top-[12px] h-[3px] bg-slate-700 rounded-sm" />

            {/* 3. 좌측 25% 지점 수직 하강선 (지출할 금액 카드로) */}
            <div className="absolute left-[25%] -translate-x-1/2 top-[12px] w-[3px] h-[16px] bg-slate-700" />

            {/* 4. 우측 25% 지점 수직 하강선 (투자할 금액 카드로) */}
            <div className="absolute right-[25%] translate-x-1/2 top-[12px] w-[3px] h-[16px] bg-slate-700" />
          </div>

          {/* Row 2: 지출할 금액 (좌) + 투자할 금액 (우) - 1:1 대칭 그리드 구조 */}
          <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
            {/* 지출할 금액 카드 (자동 계산) */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1 text-center flex items-center justify-center gap-0.5">
                지출할 금액
                <span className="relative inline-block align-middle">
                  <button
                    type="button"
                    onMouseEnter={() => setShowFixedInfo(true)}
                    onMouseLeave={() => setShowFixedInfo(false)}
                    onClick={() => setShowFixedInfo(prev => !prev)}
                    className="p-0.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 outline-none"
                    aria-label="고정지출 안내"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                  {showFixedInfo && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[240px] bg-slate-800 text-white text-[11px] p-3 rounded-xl shadow-xl z-50 text-left font-normal leading-relaxed pointer-events-none">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 transform rotate-45" />
                      <p className="font-bold text-blue-300 mb-1">고정지출은?</p>
                      보험료·통신비·구독료처럼 매달 주계좌에서 자동으로 빠져나가던 돈을 Pori가 계산해서 <span className="font-bold text-yellow-300">'생활비'</span> 통장에 먼저 배분해뒀어요. 금액은 자유롭게 조정 가능해요.
                    </div>
                  )}
                </span>
              </p>
              <div className="border-2 border-slate-700 rounded-2xl px-4 py-2.5 shadow-sm bg-white text-center">
                <span className="text-base font-extrabold tracking-tight text-slate-800">
                  {formatNumber(spendAmount)}<span className="text-xs font-bold text-slate-500 ml-0.5">원</span>
                </span>
              </div>
            </div>

            {/* 투자할 금액 카드 (사용자 조정 가능) */}
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-1 text-center">투자할 금액</p>
              <div className="border-2 border-blue-400 rounded-2xl px-2 py-2.5 shadow-sm bg-blue-50 flex items-center justify-center gap-0.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(investmentAmount)}
                  onChange={e => {
                    const v = parseDigits(e.target.value);
                    setInvestmentAmount(Math.min(v, totalSalary));
                  }}
                  className="text-base font-extrabold text-blue-800 bg-transparent outline-none text-center w-full min-w-0"
                />
                <span className="text-xs font-bold text-blue-600 shrink-0">원</span>
              </div>
            </div>
          </div>

          {/* 계좌 리스트 트리 영역 */}
          <div className="relative">
            {/* 세로 줄: 지출할 금액 박스 아래에서 시작하여 남은 금액 화살표 머리 꼭지점 속으로 쏙 파고드는 단일 트리선 */}
            <div className="absolute left-6 top-[-14px] bottom-[3px] w-[3px] bg-slate-700 rounded-sm z-0" />

            <div className="space-y-5 relative">
              {accounts.map((acc, index) => (
                <div key={acc.id} className="relative pl-12 pr-1 pt-2">
                  {/* 트리를 잇는 꺾인 선 (SVG 화살표) */}
                  <svg className="absolute left-6 top-11 w-6 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="none">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M0 12h20M16 6l6 6-6 6" />
                  </svg>

                  <div className={`bg-white border ${acc.isPinned ? 'border-rose-200 shadow-sm' : 'border-slate-200'} rounded-2xl p-4 transition-all duration-300`}>
                    <div className="flex justify-between items-center mb-3 gap-2">
                      {/* 왼쪽: 로고 + 통장명 */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {BANK_LOGOS[acc.bankName] ? (
                          <img
                            src={BANK_LOGOS[acc.bankName]}
                            alt={acc.bankName}
                            className="w-7 h-7 rounded-full object-contain border border-slate-100 bg-white shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                            {acc.bankName?.slice(0, 2)}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setBankPickerForIdx(index)}
                          className="font-bold text-slate-700 bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 hover:bg-slate-50 outline-none rounded px-1 py-0.5 text-sm transition-colors text-left"
                        >
                          {acc.bank}
                        </button>
                      </div>
                      {/* 오른쪽: 태그 + ? + 잠금 + 삭제 */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="text"
                          value={acc.tag}
                          onChange={(e) => updateTag(index, e.target.value)}
                          placeholder="태그"
                          className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md text-xs font-medium outline-none focus:ring-2 focus:ring-blue-300 w-16 text-center"
                        />
                        {/* AI 배분 이유 툴팁 (항상 표시, comment 없으면 기본 멘트) */}
                        <div className="relative">
                          <button
                            type="button"
                            onMouseEnter={() => setCommentTooltip(index)}
                            onMouseLeave={() => setCommentTooltip(null)}
                            className="p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                            aria-label="배분 이유 보기"
                          >
                            <HelpCircle className="w-5 h-5 text-blue-400" />
                          </button>
                          {commentTooltip === index && (
                            <div className="absolute right-0 bottom-9 w-64 bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 rounded-xl shadow-xl z-50 pointer-events-none">
                              <div className="absolute -bottom-1 right-3.5 w-2 h-2 bg-slate-800 rotate-45" />
                              💡 {acc.comment?.trim() || 'Pori가 소비 패턴을 분석해 추천한 금액이에요. 필요하면 직접 조정하세요.'}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => togglePin(index, e)}
                          className={`p-1.5 rounded-full transition-colors ${acc.isPinned ? 'bg-rose-50' : 'hover:bg-slate-100'}`}
                          aria-label={acc.isPinned ? '잠금 해제' : '잠금'}
                        >
                          {acc.isPinned ? (
                            <Lock className="w-5 h-5 text-rose-500" />
                          ) : (
                            <LockOpen className="w-5 h-5 text-blue-400" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTargetIdx(index)}
                          className="p-1.5 rounded-full hover:bg-rose-50 transition-colors"
                          aria-label="계좌 삭제"
                        >
                          <Trash2 className="w-5 h-5 text-slate-400 hover:text-rose-500 transition-colors" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      {/* -만원 버튼 */}
                      <button
                        type="button"
                        disabled={acc.isPinned || acc.amount < 10000}
                        onClick={() => updateAmount(index, Math.max(0, acc.amount - 10000))}
                        className="w-12 h-12 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 hover:bg-slate-50 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        -
                      </button>

                      {/* 직접 입력 */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={acc.isPinned}
                          value={formatNumber(acc.amount)}
                          onChange={(e) => updateAmount(index, parseDigits(e.target.value))}
                          className={`w-full bg-slate-50 border ${acc.isPinned ? 'border-rose-100 opacity-60 cursor-not-allowed' : 'border-slate-200'} rounded-xl py-3 pr-8 pl-3 text-right font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg`}
                        />
                        <span className="absolute right-3 top-3.5 text-slate-400 text-sm font-semibold">원</span>
                      </div>

                      {/* +만원 버튼 */}
                      <button
                        type="button"
                        disabled={acc.isPinned}
                        onClick={() => updateAmount(index, acc.amount + 10000)}
                        className="w-12 h-12 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 hover:bg-slate-50 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* + 계좌 추가 버튼 (트리에 이어붙임) */}
              <div className="relative pl-12 pr-1 pt-2">
                <svg className="absolute left-6 top-7 w-6 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="none">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M0 12h20M16 6l6 6-6 6" />
                </svg>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors font-semibold text-sm active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  계좌 추가
                </button>
              </div>

              {/* 통장에 남은 금액 연결 — 깔끔한 하향 화살표 */}
              <div className="relative h-10 mt-1 z-0">
                {/* 
                  화살표 머리 (아래 방향): 
                  - 위의 계좌 리스트에 사용된 custom SVG와 동일한 머리 각도, 두께(2.5px), stroke-round 스타일 적용
                  - 소수점 픽셀 정렬(left-[13.5px])을 통해 세로 트리선의 가로 정중앙 축과 100% 정확하게 포개어짐
                */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="absolute left-[13.5px] bottom-0 text-slate-700 z-10"
                >
                  <path d="M6 14l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

        </main>

        {/* 하단 고정 바 (남은 금액 및 완료 버튼) */}
        <div className="fixed bottom-0 max-w-[390px] w-full bg-white border-t border-slate-200 p-4 pb-6 z-20 flex justify-between items-center shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 mb-0.5">통장에 남은 금액</span>
            <div className="text-2xl font-extrabold flex items-baseline gap-1">
              <span className={isOver ? 'text-red-500' : 'text-blue-600'}>{formatNumber(remain)}</span>
              <span className="text-lg text-slate-400">원</span>
            </div>
            <span className={`text-[10px] text-red-500 font-medium h-3 mt-0.5 transition-opacity ${isOver ? 'opacity-100' : 'opacity-0'}`}>
              월급보다 많이 배분했어요
            </span>
          </div>
          <button
            disabled={isOver}
            onClick={handleComplete}
            className={`${isOver ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-8 py-3.5 rounded-xl font-bold text-lg transition-colors shadow-md flex items-center gap-2`}
          >
            완료 <Check className="w-5 h-5" />
          </button>
        </div>

        {/* 핀 안내 툴팁 */}
        {toast && (
          <div
            className="fixed z-50 bg-slate-800 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg pointer-events-none animate-in fade-in"
            style={{ top: toast.top, left: toast.left }}
          >
            다음에는 이 계좌에 들어가는 금액은 변하지 않아요
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-slate-800 transform rotate-45" />
          </div>
        )}
      </div>

      {/* 팝업 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-11/12 max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="p-7 text-center pt-8">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-slate-800 text-lg font-medium leading-relaxed">
                급여 통장에 남는{' '}
                <span className="text-blue-600 font-bold text-xl">{formatNumber(remain)}원</span>은<br />
                <span className="font-semibold bg-slate-100 px-2 py-0.5 rounded-md mt-1 inline-block">[우리은행 계좌]</span>
                에 남겨놓을까요?
              </p>
            </div>
            <div className="flex border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 text-slate-500 font-semibold hover:bg-slate-100 transition-colors border-r border-slate-200"
              >
                재설정
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-4 text-blue-600 font-bold hover:bg-blue-50 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계좌 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-11/12 max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-base font-bold text-slate-800">계좌 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="px-6 pb-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">내 계좌에서 선택</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 -mr-1">
                  {allLinkedAccounts.map(acc => {
                    const alreadyAdded = accounts.some(a => a.bank === acc.name);
                    const isSelected = selectedLinkedId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => setSelectedLinkedId(isSelected ? null : acc.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border-2 flex items-center justify-between transition active:scale-[0.98] ${alreadyAdded
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {BANK_LOGOS[acc.bank] ? (
                            <img
                              src={BANK_LOGOS[acc.bank]}
                              alt={acc.bank}
                              className="w-9 h-9 rounded-full object-contain border border-slate-100 bg-white shrink-0"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${acc.badgeBg} ${acc.badgeColor}`}>
                              {acc.short}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-medium">{acc.bank}</p>
                            <p className="text-sm font-bold text-slate-800 truncate">{acc.name}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${alreadyAdded
                          ? 'border-slate-200 bg-slate-100'
                          : isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-300'
                          }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          {alreadyAdded && <Check className="w-3 h-3 text-slate-400" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 우리은행 새 통장 만들기 */}
                <div className="mt-3">
                  {!isCreatingNewWoori ? (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewWoori(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-colors font-semibold text-sm active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      우리은행 새 통장 만들기
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl border-2 border-blue-300 bg-blue-50/60 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <img src={wooriLogo} alt="우리은행" className="w-9 h-9 rounded-full object-contain border border-slate-100 bg-white shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-500 font-medium">우리은행 · 신규 통장</p>
                          <p className="text-xs text-slate-600">월급을 나눠 담을 통장을 만들어요</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={newWooriName}
                        onChange={(e) => setNewWooriName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') createNewWooriAccount(); }}
                        placeholder="새 통장 이름 (예: 유럽 여행 자금)"
                        autoFocus
                        className="w-full bg-white border border-blue-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setIsCreatingNewWoori(false); setNewWooriName(''); }}
                          className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={createNewWooriAccount}
                          disabled={!newWooriName.trim() || allLinkedAccounts.some(a => a.name === newWooriName.trim())}
                          className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          개설하기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">태그</label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="예: 비상금"
                  onKeyDown={(e) => { if (e.key === 'Enter') addAccount(); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-4 text-slate-500 font-semibold hover:bg-slate-100 transition-colors border-r border-slate-200"
              >
                취소
              </button>
              <button
                onClick={addAccount}
                disabled={!selectedLinkedId || !newTag.trim()}
                className="flex-1 py-4 text-blue-600 font-bold hover:bg-blue-50 transition-colors disabled:text-slate-300 disabled:hover:bg-slate-50"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계좌 변경 picker 모달 */}
      {bankPickerForIdx !== null && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-11/12 max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-base font-bold text-slate-800">계좌 변경</h3>
              <button onClick={() => setBankPickerForIdx(null)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="px-6 -mt-1 mb-3 text-xs text-slate-500">내 계좌 중 하나를 선택해주세요.</p>
            <div className="px-6 pb-4">
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 -mr-1">
                {allLinkedAccounts.map(acc => {
                  const currentBank = accounts[bankPickerForIdx]?.bank;
                  const isCurrent = currentBank === acc.name;
                  const usedByOther = accounts.some((a, i) => a.bank === acc.name && i !== bankPickerForIdx);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={usedByOther}
                      onClick={() => pickBankFor(acc)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border-2 flex items-center justify-between transition active:scale-[0.98] ${usedByOther
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : isCurrent
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {BANK_LOGOS[acc.bank] ? (
                          <img
                            src={BANK_LOGOS[acc.bank]}
                            alt={acc.bank}
                            className="w-9 h-9 rounded-full object-contain border border-slate-100 bg-white shrink-0"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${acc.badgeBg} ${acc.badgeColor}`}>
                            {acc.short}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 font-medium">{acc.bank}</p>
                          <p className="text-sm font-bold text-slate-800 truncate">{acc.name}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${usedByOther
                        ? 'border-slate-200 bg-slate-100'
                        : isCurrent
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                        }`}>
                        {isCurrent && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        {usedByOther && <Check className="w-3 h-3 text-slate-400" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계좌 삭제 확인 모달 */}
      {deleteTargetIdx !== null && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-11/12 max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="p-7 text-center pt-8">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-rose-500" />
              </div>
              <p className="text-slate-800 text-lg font-medium leading-relaxed">
                <span className="font-bold text-slate-900">{accounts[deleteTargetIdx]?.bank}</span> 계좌를<br />
                삭제할까요?
              </p>
              <p className="text-xs text-slate-400 mt-2">삭제한 배분은 다른 계좌로 다시 나눠야 해요.</p>
            </div>
            <div className="flex border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setDeleteTargetIdx(null)}
                className="flex-1 py-4 text-slate-500 font-semibold hover:bg-slate-100 transition-colors border-r border-slate-200"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-4 text-rose-600 font-bold hover:bg-rose-50 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
