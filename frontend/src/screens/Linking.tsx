import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check } from 'lucide-react';
import { getMyDataPreview, syncAssets, getAssetSummary, type Asset, type PreviewAccount, type AssetSummary } from '../api/assetApi';
import wooriLogo   from '../assets/banks/woori.png';
import kbLogo      from '../assets/banks/kb.png';
import kakaoLogo   from '../assets/banks/kakao.png';
import tossLogo    from '../assets/banks/toss.png';
import shinhanLogo from '../assets/banks/shinhan.png';
import hanaLogo    from '../assets/banks/hana.png';

type Step = 'consent' | 'select' | 'linking' | 'account-pick' | 'complete';
type LinkStatus = 'waiting' | 'linking' | 'done';

const BANK_LIST = [
  { id: 'woori',   name: '우리은행',   logo: wooriLogo   },
  { id: 'kb',      name: '국민은행',   logo: kbLogo      },
  { id: 'kakao',   name: '카카오뱅크', logo: kakaoLogo   },
  { id: 'toss',    name: '토스뱅크',   logo: tossLogo    },
  { id: 'shinhan', name: '신한은행',   logo: shinhanLogo },
  { id: 'hana',    name: '하나은행',   logo: hanaLogo    },
];


const CONSENT_ITEMS = [
  { key: 'personal'  as const, label: '필수 개인정보 수집·이용 (필수)' },
  { key: 'financial' as const, label: '금융정보 조회·전송 동의 (필수)' },
  { key: 'terms'     as const, label: '서비스 이용약관 (필수)' },
  { key: 'marketing' as const, label: '마케팅 수신 동의 (선택)' },
];

function assetTypeLabel(assetType: string): string {
  const map: Record<string, string> = {
    SAVINGS: '입출금',
    DEPOSIT: '예·적금',
    INVESTMENT: '증권',
    CARD: '카드',
  };
  return map[assetType] ?? assetType;
}

function PhoneFrame({ children, bottomLabel }: { children: React.ReactNode; bottomLabel: string }) {
  return (
    <div className="min-h-screen bg-gray-200 flex justify-center font-sans">
      <div className="w-full max-w-[390px] min-h-screen bg-white flex flex-col shadow-2xl">
        <div className="flex-1 px-6 pt-10 pb-4 flex flex-col overflow-y-auto">
          {children}
        </div>
        <div className="border-t border-gray-200 py-4 flex justify-center shrink-0">
          <span className="text-gray-400 text-sm font-medium">{bottomLabel}</span>
        </div>
      </div>
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div className={`w-5 h-5 rounded flex items-center justify-center transition ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </div>
  );
}

export default function Linking() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('consent');
  const [consents, setConsents] = useState({ personal: false, financial: false, terms: false, marketing: false });
  const [selected, setSelected] = useState<string[]>([]);
  const [linkStatus, setLinkStatus] = useState<Record<string, LinkStatus>>({});
  const [pickedAccounts, setPickedAccounts] = useState<string[]>([]);
  const [previewAccounts, setPreviewAccounts] = useState<PreviewAccount[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [syncedAssets, setSyncedAssets] = useState<Asset[]>([]);

  const togglePickedAccount = (id: string) =>
    setPickedAccounts(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const allRequired = consents.personal && consents.financial && consents.terms;

  const toggleConsent = (key: keyof typeof consents) =>
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleBank = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);

  useEffect(() => {
    if (step !== 'linking') return;

    const initial: Record<string, LinkStatus> = {};
    selected.forEach(id => { initial[id] = 'waiting'; });
    setLinkStatus(initial);

    let delay = 0;
    selected.forEach((id, i) => {
      setTimeout(() => {
        setLinkStatus(prev => ({ ...prev, [id]: 'linking' }));
        setTimeout(() => {
          setLinkStatus(prev => ({ ...prev, [id]: 'done' }));
          if (i === selected.length - 1) {
            // 마지막 은행 완료 후 마이데이터 계좌 목록 조회 (해당 사용자의 전체 계좌)
            getMyDataPreview([])
              .then(accounts => { setPreviewAccounts(accounts); })
              .catch(() => { setPreviewAccounts([]); })
              .finally(() => { setTimeout(() => setStep('account-pick'), 600); });
          }
        }, 1200);
      }, delay);
      delay += 1500;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Step 1: 서비스 동의 ──────────────────────────────────
  if (step === 'consent') return (
    <PhoneFrame bottomLabel="서비스 동의">
      <div className="bg-blue-50 rounded-2xl p-6 flex flex-col items-center mb-6">
        <Lock className="w-8 h-8 text-blue-500 mb-2" />
        <p className="font-bold text-gray-800 text-base">마이데이터 서비스</p>
        <p className="text-sm text-blue-500 mt-0.5">안전하게 연결합니다</p>
      </div>

      <p className="font-bold text-gray-800 mb-3">서비스 이용 동의</p>

      {/* 전체 동의 */}
      <button
        onClick={() => {
          const allChecked = CONSENT_ITEMS.every(item => consents[item.key]);
          const next = !allChecked;
          setConsents({ personal: next, financial: next, terms: next, marketing: next });
        }}
        className="flex items-center justify-between w-full bg-blue-50 rounded-2xl px-4 py-3 mb-4 active:scale-[0.99] transition"
      >
        <span className="text-sm font-bold text-blue-700 text-left">전체 동의 (선택 항목 포함)</span>
        <Checkbox checked={CONSENT_ITEMS.every(item => consents[item.key])} />
      </button>

      <div className="space-y-5 flex-1">
        {CONSENT_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleConsent(key)}
            className="flex items-center justify-between w-full"
          >
            <span className="text-sm text-gray-700 text-left">{label}</span>
            <Checkbox checked={consents[key]} />
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep('select')}
        disabled={!allRequired}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white py-4 rounded-2xl font-bold mt-6 transition active:scale-95"
      >
        모두 동의하고 시작
      </button>
    </PhoneFrame>
  );

  // ── Step 2: 계좌 선택 ────────────────────────────────────
  if (step === 'select') return (
    <PhoneFrame bottomLabel="자산 연결">
      <h2 className="text-xl font-bold text-gray-800 mb-1">연결할 기관을 선택해 주세요</h2>
      <p className="text-sm text-gray-400 mb-4">선택한 기관의 자산이 자동으로 연결됩니다</p>

      {/* 전체 선택 */}
      <button
        onClick={() => setSelected(
          selected.length === BANK_LIST.length ? [] : BANK_LIST.map(b => b.id)
        )}
        className="flex items-center justify-between w-full bg-blue-50 rounded-2xl px-4 py-3 mb-3 active:scale-[0.99] transition"
      >
        <span className="text-sm font-bold text-blue-700">전체 선택</span>
        <Checkbox checked={selected.length === BANK_LIST.length} />
      </button>

      <div className="space-y-3 flex-1">
        {BANK_LIST.map(bank => (
          <button
            key={bank.id}
            onClick={() => toggleBank(bank.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition active:scale-95 ${
              selected.includes(bank.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                <img src={bank.logo} alt={bank.name} className="w-7 h-7 object-contain" />
              </div>
              <span className="text-sm font-medium text-gray-700">{bank.name}</span>
            </div>
            <Checkbox checked={selected.includes(bank.id)} />
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep('linking')}
        disabled={selected.length === 0}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white py-4 rounded-2xl font-bold mt-6 transition active:scale-95"
      >
        {selected.length > 0 ? `${selected.length}개 기관 연결하기` : '기관을 선택해주세요'}
      </button>
    </PhoneFrame>
  );

  // ── Step 3: 연동 중 ──────────────────────────────────────
  if (step === 'linking') return (
    <PhoneFrame bottomLabel="연결 중">
      <div className="flex flex-col items-center w-full">
        <h2 className="text-xl font-bold text-gray-800 mb-6">자산 불러오는 중</h2>

        <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-6" />

        <p className="text-sm text-gray-400 text-center mb-8 leading-relaxed">
          흩어진 자산을<br />한곳에 모으고 있어요
        </p>

        <div className="w-full space-y-3">
          {selected.map(id => {
            const bank = BANK_LIST.find(b => b.id === id)!;
            const status = linkStatus[id] ?? 'waiting';
            return (
              <div
                key={id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                  status === 'done'    ? 'border-green-200 bg-green-50' :
                  status === 'linking' ? 'border-blue-200  bg-blue-50'  :
                                        'border-gray-100  bg-gray-50'
                }`}
              >
                <span className={`w-5 text-center text-sm font-bold leading-none ${
                  status === 'done'    ? 'text-green-500' :
                  status === 'linking' ? 'text-blue-400'  :
                                        'text-gray-300'
                }`}>
                  {status === 'done' ? '✓' : status === 'linking' ? '···' : ''}
                </span>
                <span className={`text-sm font-medium ${
                  status === 'done'    ? 'text-green-700' :
                  status === 'linking' ? 'text-blue-700'  :
                                        'text-gray-400'
                }`}>
                  {bank.name}&nbsp;
                  {status === 'done' ? '완료' : status === 'linking' ? '연결 중' : '대기 중'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </PhoneFrame>
  );

  // ── Step 5: 연동 완료 ───────────────────────────────────
  if (step === 'complete') return (
    <PhoneFrame bottomLabel="연동 완료">
      <div className="flex flex-col items-center text-center mt-8 mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">연동 완료!</h2>
        <p className="text-sm text-gray-400">{syncedAssets.length}개 자산이 연결되었어요</p>
      </div>

      <div className="space-y-3 mb-8">
        <div className="bg-gray-50 rounded-2xl px-5 py-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">총 자산</span>
          <span className="text-base font-bold text-gray-800">
            {summary ? `${summary.totalBalance.toLocaleString()}원` : '-'}
          </span>
        </div>
        <div className="bg-gray-50 rounded-2xl px-5 py-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">투자 자산</span>
          <span className="text-base font-bold text-gray-800">
            {summary ? `${summary.investBalance.toLocaleString()}원` : '-'}
          </span>
        </div>
        <div className="bg-gray-50 rounded-2xl px-5 py-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">카드 개수</span>
          <span className="text-base font-bold text-gray-800">
            {summary ? `${summary.linkedCardCount}개 연결됨` : '-'}
          </span>
        </div>
      </div>

      <button
        onClick={() => navigate('/salary-select', { state: { linkedAccounts: syncedAssets } })}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold transition active:scale-95"
      >
        급여통장 설정하기 →
      </button>
    </PhoneFrame>
  );

  // ── Step 4: 계좌 선택 ───────────────────────────────────
  const allAssetNumbers = previewAccounts.map(a => a.assetNumber);
  const isAll = allAssetNumbers.length > 0 && allAssetNumbers.every(n => pickedAccounts.includes(n));

  // institution 별로 그룹핑
  const groupedPreview = previewAccounts.reduce<Record<string, PreviewAccount[]>>((acc, pa) => {
    if (!acc[pa.institution]) acc[pa.institution] = [];
    acc[pa.institution].push(pa);
    return acc;
  }, {});

  return (
    <PhoneFrame bottomLabel="계좌 선택">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
        <h2 className="text-lg font-bold text-gray-800">연결 완료!</h2>
      </div>
      <p className="text-sm text-gray-700 mb-4">
        가져온 계좌 중 사용할 계좌를 선택해주세요
      </p>

      {/* 전체 선택 */}
      <button
        onClick={() => setPickedAccounts(isAll ? [] : allAssetNumbers)}
        className="flex items-center justify-between w-full bg-blue-50 rounded-2xl px-4 py-3 mb-4 active:scale-[0.99] transition"
      >
        <span className="text-sm font-bold text-blue-700">전체 선택</span>
        <Checkbox checked={isAll} />
      </button>

      <div className="flex-1 overflow-y-auto space-y-5 -mx-2 px-2">
        {previewAccounts.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">연결된 계좌가 없습니다</p>
        ) : (
          Object.entries(groupedPreview).map(([institution, accs]) => {
            const bank = BANK_LIST.find(b => b.name === institution);
            return (
              <div key={institution}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  {bank?.logo && (
                    <div className="w-5 h-5 rounded-full bg-white border border-gray-100 overflow-hidden flex items-center justify-center">
                      <img src={bank.logo} alt={institution} className="w-4 h-4 object-contain" />
                    </div>
                  )}
                  <p className="text-xs font-bold text-gray-500">{institution}</p>
                </div>
                <div className="space-y-2">
                  {accs.map(acc => {
                    const checked = pickedAccounts.includes(acc.assetNumber);
                    return (
                      <button
                        key={acc.assetNumber}
                        onClick={() => togglePickedAccount(acc.assetNumber)}
                        className={`w-full text-left px-4 py-3 rounded-2xl border-2 flex items-center justify-between transition active:scale-[0.98] ${
                          checked ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              {assetTypeLabel(acc.assetType)}
                            </span>
                            <span className="text-sm font-bold text-gray-800 truncate">{acc.accountName}</span>
                          </div>
                          <p className="text-xs text-gray-500">{acc.balance.toLocaleString()}원</p>
                        </div>
                        <Checkbox checked={checked} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={async () => {
          setSyncLoading(true);
          try {
            const assets = await syncAssets(pickedAccounts);
            setSyncedAssets(assets);
            const s = await getAssetSummary().catch(() => null);
            setSummary(s);
            setStep('complete');
          } catch {
            navigate('/salary-select', { state: { linkedAccounts: [] } });
          } finally {
            setSyncLoading(false);
          }
        }}
        disabled={pickedAccounts.length === 0 || syncLoading}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white py-4 rounded-2xl font-bold mt-6 transition active:scale-95"
      >
        {syncLoading
          ? '연결 중...'
          : pickedAccounts.length > 0
            ? `${pickedAccounts.length}개 계좌 연결하고 급여통장 설정하기 →`
            : '계좌를 선택해주세요'}
      </button>
    </PhoneFrame>
  );
}
