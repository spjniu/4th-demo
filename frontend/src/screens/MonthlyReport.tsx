import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getReportDetail, getTaxBenefits, type ReportDetail, type TaxBenefitResponse } from '../api/reportApi';

const TODAY = new Date();

// ─── 목 데이터 ──────────────────────────────────────────────────────────────

const MOCK_ASSET_TREND = [
  { label: '5/1', value: 3200 },
  { label: '5/8', value: 3238 },
  { label: '5/15', value: 3213 },
  { label: '5/22', value: 3282 },
  { label: '5/27', value: 3298 },
];

const MOCK_HOLDINGS = [
  { name: 'TIGER 미국S&P500', category: '주식 ETF', returnRate: 8.4 },
  { name: 'KODEX 나스닥100', category: '주식 ETF', returnRate: 12.1 },
  { name: '우리 Super 정기적금', category: '적금', returnRate: 3.5 },
  { name: '토스뱅크 파킹통장', category: '현금성', returnRate: 2.0 },
  { name: '신한은행 입출금', category: '현금성', returnRate: 0.1 },
  { name: '국고채 3년물', category: '채권', returnRate: -0.8 },
];

const MOCK_MISSIONS = [
  { title: '커피 6번만 마시기', period: '5월 7일 ~ 5월 14일', result: '성공', note: '05.14 삼성전자 매수' },
  { title: '배달 2번만 시키기', period: '5월 15일 ~ 5월 22일', result: '실패', note: '-' },
  { title: '택시 1번만 타기', period: '5월 23일 ~ 5월 30일', result: '성공', note: '05.30 카카오 매수' },
];

const MOCK_TAX_DEDUCTIONS = [
  { category: 'IRP', paid: 300_000, deducted: 49_500 },
  { category: '연금 저축', paid: 340_000, deducted: 56_100 },
];

const MOCK_MISSION_COMMENT = '이번 달 총 3개의 소비 미션 중 2개를 성공하여 약 45,000원을 아낄 수 있었고, 성공 보상으로 삼성전자 0.17주와 카카오 0.22주를 성공적으로 분할 매수하였습니다. 아주 훌륭한 저축 흐름이에요!';

const MOCK_TAX_COMMENT = 'IRP와 연금저축 납입을 통해 총 105,600원의 세액 공제 혜택을 확보하였습니다. 소득 세액 공제 한도가 아직 남아 있으니, 연말까지 납입 금액을 조금 더 늘려 절세 효과를 극대화해 보시길 추천해요.';

const MOCK_MARKET = '보유하신 상품과 시장 동향을 매칭해 볼 때, 미국 S&P500 및 나스닥 등 해외 ETF의 비중(40%)이 견고하여 이달 시장 반등에 효과적으로 대응하였습니다. 금리 동결 수혜로 당분간 기술주 기반 자산들의 강세가 지속될 것으로 기대됩니다.';

const MOCK_CUMULATIVE = [
  { label: '1주', thisMonth: 28, lastMonth: 32 },
  { label: '2주', thisMonth: 51, lastMonth: 58 },
  { label: '3주', thisMonth: 70, lastMonth: 79 },
  { label: '4주', thisMonth: 83, lastMonth: 92 },
];

const MOCK_EXPENSE_HINTS: Record<string, string> = {
  '식비': '배달앱 이용 빈도가 높았어요\n지난달 대비 +12% 증가했어요',
  '교통': '지하철·버스 중심으로 안정적으로 이용했어요\n지난달 수준을 유지하고 있어요',
  '쇼핑': '온라인 쇼핑이 전체의 80%예요\n충동구매 패턴이 감지됐어요',
  '문화/여가': 'OTT·영화 지출이 주를 이뤘어요\n지난달 대비 소폭 감소했어요',
  '기타': '편의점·카페 소비가 주를 이뤘어요\n소액 지출이 자주 발생하고 있어요',
};



// TODO: 백엔드 연동 시 fetch로 교체
const MOCK_DATA = {
  totalIncome: 3_200_000,
  totalExpense: 2_450_000,
  expenseCategories: [
    { category: '식비', value: 1_029_000 },
    { category: '쇼핑', value: 514_500 },
    { category: '문화/여가', value: 441_000 },
    { category: '기타', value: 269_500 },
    { category: '교통', value: 196_000 },
  ],
  nextMonthGuideline:
    '온라인 쇼핑 비중을 10% 줄이고 비상금 계좌에 추가 적립을 권장해요. 현재 ETF 비중은 유지하되 IRP 납입 한도를 늘려 세액 공제 혜택을 최대화해보세요.',
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function fmtMan(n: number) {
  return `${Math.round(Math.abs(n) / 10000).toLocaleString()}만 원`;
}
function pctToXY(cx: number, cy: number, r: number, pct: number) {
  const rad = (pct / 100) * 2 * Math.PI - Math.PI / 2;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── 공용 UI ──────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 14, ...style }}>
      {children}
    </div>
  );
}

function BlockHeader({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 6px' }}>
      <div style={{ width: 4, height: 22, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>{children}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 7px 2px' }}>{children}</p>;
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 3px' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color, margin: 0 }}>{value}</p>
    </div>
  );
}

function ChangeBadge({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: pos ? '#E1F5EE' : '#FCEBEB',
      color: pos ? '#0F6E56' : '#A32D2D',
    }}>
      {pos ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  );
}

// ─── 자산 추이 차트 ────────────────────────────────────────────────────────────

function AssetTrendChart({ data }: { data: typeof MOCK_ASSET_TREND }) {
  const W = 290, H = 100, PAD = { t: 10, b: 28, l: 36, r: 12 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const vals = data.map(d => d.value);
  const minV = Math.min(...vals) - 40, maxV = Math.max(...vals) + 20;
  const xOf = (i: number) => PAD.l + (i / (data.length - 1)) * iW;
  const yOf = (v: number) => PAD.t + (1 - (v - minV) / (maxV - minV)) * iH;
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(d.value).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${xOf(data.length - 1).toFixed(1)} ${yOf(minV).toFixed(1)} L ${xOf(0).toFixed(1)} ${yOf(minV).toFixed(1)} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#378ADD" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#378ADD" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.4, 0.75].map((r, i) => {
        const v = minV + (maxV - minV) * r;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD.l - 4} y={yOf(v)} textAnchor="end" dominantBaseline="middle" fontSize={8} fill="#94a3b8">{Math.round(v)}만</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#ag)" />
      <path d={linePath} fill="none" stroke="#378ADD" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={i} cx={xOf(i)} cy={yOf(d.value)} r={3.5} fill="#fff" stroke="#378ADD" strokeWidth={2} />)}
      {data.map((d, i) => <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.label}</text>)}
    </svg>
  );
}

// ─── 보유 상품 리스트 ──────────────────────────────────────────────────────────

function HoldingsList() {
  return (
    <div>
      {MOCK_HOLDINGS.map((holding, i) => {
        const pos = holding.returnRate >= 0;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: i < MOCK_HOLDINGS.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{holding.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{holding.category}</p>
            </div>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: pos ? '#0F6E56' : '#A32D2D',
            }}>
              {pos ? '+' : ''}{holding.returnRate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 누적 지출 비교 차트 ───────────────────────────────────────────────────────

function CumulativeChart({ data }: { data: typeof MOCK_CUMULATIVE }) {
  const W = 290, H = 100, PAD = { t: 10, b: 28, l: 28, r: 12 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const maxV = Math.max(...data.flatMap(d => [d.thisMonth, d.lastMonth])) * 1.25;
  const xOf = (i: number) => PAD.l + (i / (data.length - 1)) * iW;
  const yOf = (v: number) => PAD.t + (1 - v / maxV) * iH;
  const toPath = (key: 'thisMonth' | 'lastMonth') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(d[key]).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      {[0.5, 1].map((r, i) => {
        const v = maxV * r, y = yOf(v);
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD.l - 4} y={y} textAnchor="end" dominantBaseline="middle" fontSize={8} fill="#94a3b8">{Math.round(v)}만</text>
          </g>
        );
      })}
      <path d={toPath('lastMonth')} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 3" />
      <path d={toPath('thisMonth')} fill="none" stroke="#EF9F27" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={i} cx={xOf(i)} cy={yOf(d.thisMonth)} r={3} fill="#fff" stroke="#EF9F27" strokeWidth={2} />)}
      {data.map((d, i) => <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.label}</text>)}
    </svg>
  );
}

// ─── 지출 도넛 차트 ───────────────────────────────────────────────────────────

const EXPENSE_COLORS = ['#D85A30', '#EF9F27', '#7F77DD', '#378ADD', '#1D9E75', '#94a3b8'];

function SpendingDonut({ categories, report }: { categories: { category: string; value: number }[]; report: ReportDetail | null }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const total = categories.reduce((s, c) => s + c.value, 0);
  const cx = 64, cy = 64, outerR = 56, innerR = 36;
  let cum = 0;
  const slices = categories.map((c, i) => {
    const pct = (c.value / total) * 100;
    const start = cum; cum += pct;
    const o1 = pctToXY(cx, cy, outerR, start), o2 = pctToXY(cx, cy, outerR, cum);
    const i2 = pctToXY(cx, cy, innerR, cum), i1 = pctToXY(cx, cy, innerR, start);
    const large = pct > 50 ? 1 : 0;
    return {
      path: `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y} Z`,
      pct, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length], label: c.category,
    };
  });
  const active = activeIdx !== null ? slices[activeIdx] : null;
  const hint = activeIdx !== null
    ? (report?.categoryExpenses?.[activeIdx]?.hoverComment || MOCK_EXPENSE_HINTS[categories[activeIdx].category])
    : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
          <svg width="128" height="128" viewBox="0 0 128 128">
            {slices.map((s, i) => (
              <path key={i} d={s.path} fill={s.color}
                opacity={activeIdx === null || activeIdx === i ? 1 : 0.25}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                style={{ cursor: 'default', transition: 'opacity 0.15s' }}
              />
            ))}
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', width: 60 }}>
            {active ? (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, color: active.color, lineHeight: 1.4 }}>{active.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{active.pct.toFixed(0)}%</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.4 }}>이번달</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{Math.round(total / 10000)}만 원</div>
              </>
            )}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: activeIdx === i ? s.color : '#475569', fontWeight: activeIdx === i ? 600 : 400, flex: 1, transition: 'color 0.15s' }}>{s.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{s.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: hint ? '#f8fafc' : 'transparent', border: `0.5px solid ${hint ? '#e2e8f0' : 'transparent'}`, minHeight: 48, fontSize: 12, color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-line', transition: 'background 0.2s' }}>
        {hint ?? <span style={{ color: '#cbd5e1', fontSize: 11 }}>항목에 마우스를 올려보세요</span>}
      </div>
    </div>
  );
}

// ─── 미션 요약 섹션 ─────────────────────────────────────────────────────────────

function SpringDecorator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: -6, zIndex: 1, position: 'relative' }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <svg key={i} width="16" height="24" viewBox="0 0 16 24" fill="none">
          {/* 스프링 링 뒷선 */}
          <path d="M4 14 C4 10, 12 10, 12 14" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          {/* 스프링 링 앞선 */}
          <path d="M4 6 C4 10, 12 10, 12 6" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="6" y="8" width="4" height="8" rx="2" fill="#64748b" />
        </svg>
      ))}
    </div>
  );
}

function MissionSummarySection({ comment }: { comment: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <SpringDecorator />
      <Card style={{ borderTop: 'none', borderRadius: '0 0 14px 14px', paddingTop: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'center' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', height: 28 }}>
              <th style={{ padding: '4px', fontWeight: 600, textAlign: 'left' }}>미션</th>
              <th style={{ padding: '4px', fontWeight: 600 }}>기간</th>
              <th style={{ padding: '4px', fontWeight: 600 }}>결과</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_MISSIONS.map((m, i) => (
              <tr key={i} style={{ borderBottom: i < MOCK_MISSIONS.length - 1 ? '1px solid #f1f5f9' : 'none', height: 36 }}>
                <td style={{ padding: '6px 4px', fontWeight: 600, color: '#0f172a', textAlign: 'left' }}>{m.title}</td>
                <td style={{ padding: '6px 4px', color: '#64748b' }}>{m.period}</td>
                <td style={{ padding: '6px 4px' }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: m.result === '성공' ? '#E1F5EE' : '#FCEBEB',
                    color: m.result === '성공' ? '#0F6E56' : '#A32D2D'
                  }}>
                    {m.result}
                  </span>
                  {m.result === '성공' && m.note !== '-' && (
                    <span style={{ display: 'block', fontSize: 9, color: '#64748b', marginTop: 2 }}>{m.note}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 에이전트 코멘트 */}
        <div style={{ marginTop: 14, padding: '12px', background: '#f8fafc', borderRadius: 10, border: '0.5px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#378ADD' }}>🤖 Pori의 피드백</p>
          <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{comment}</p>
        </div>
      </Card>
    </div>
  );
}

function TaxDeductionSection({ taxResponse }: { taxResponse: TaxBenefitResponse | null }) {
  const taxData = taxResponse?.accounts && taxResponse.accounts.length > 0
    ? taxResponse.accounts
        .filter(a => a.accountType === 'IRP' || a.accountType === 'PENSION_SAVINGS')
        .map(a => ({
          category: a.accountType === 'IRP' ? 'IRP' : '연금 저축',
          paid: a.currentContribution,
          deducted: a.taxDeduction ?? 0
        }))
    : MOCK_TAX_DEDUCTIONS;

  const totalDeducted = taxResponse?.pensionSummary?.totalTaxDeduction ?? 105600;
  const dynamicComment = taxResponse?.pensionSummary
    ? `IRP와 연금저축 납입을 통해 총 ${totalDeducted.toLocaleString()}원의 세액 공제 혜택을 확보하였습니다. 소득 세액 공제 한도가 아직 남아 있으니, 연말까지 납입 금액을 조금 더 늘려 절세 효과를 극대화해 보시길 추천해요.`
    : MOCK_TAX_COMMENT;

  return (
    <Card>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'center' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', height: 30 }}>
            <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'left' }}>구분</th>
            <th style={{ padding: '6px 4px', fontWeight: 600 }}>이번달 납입액</th>
            <th style={{ padding: '6px 4px', fontWeight: 600 }}>이번달 공제액</th>
          </tr>
        </thead>
        <tbody>
          {taxData.map((t, i) => (
            <tr key={i} style={{ borderBottom: i < taxData.length - 1 ? '1px solid #f1f5f9' : 'none', height: 36 }}>
              <td style={{ padding: '6px 4px', fontWeight: 700, color: '#0f172a', textAlign: 'left' }}>{t.category}</td>
              <td style={{ padding: '6px 4px', color: '#0F6E56', fontWeight: 600 }}>{t.paid.toLocaleString()}원</td>
              <td style={{ padding: '6px 4px', color: '#378ADD', fontWeight: 600 }}>
                {t.deducted > 0 ? `+${t.deducted.toLocaleString()}원` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 에이전트 코멘트 */}
      <div style={{ marginTop: 14, padding: '12px', background: '#f8fafc', borderRadius: 10, border: '0.5px solid #e2e8f0' }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#1D9E75' }}>💡 절세 제안</p>
        <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{dynamicComment}</p>
      </div>
    </Card>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function MonthlyReport({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();
  const [year, setYear] = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth() + 1);

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [taxResponse, setTaxResponse] = useState<TaxBenefitResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getReportDetail(year, month).catch(() => null),
      getTaxBenefits().catch(() => null)
    ])
      .then(([rep, tax]) => {
        if (!cancelled) {
          setReport(rep);
          setTaxResponse(tax);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, month]);

  const userGoal = sessionStorage.getItem('user:goal') ?? '';
  const data = MOCK_DATA;
  const isCurrentMonth = year === TODAY.getFullYear() && month === TODAY.getMonth() + 1;
  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (isCurrentMonth) return; if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  // API 결과 매핑
  const totalIncome = report?.totalIncome ?? MOCK_DATA.totalIncome;
  const totalExpense = report?.totalExpense ?? MOCK_DATA.totalExpense;
  const marketCondition = report?.marketCondition ?? MOCK_MARKET;
  const guideline = report?.guideline ?? MOCK_DATA.nextMonthGuideline;

  // 자산 추이 그래프 데이터 매핑
  const trendData = report?.assetSnapshots && report.assetSnapshots.length > 0
    ? report.assetSnapshots.map(s => {
        const parts = s.snapshotDate.split('-');
        const m = parseInt(parts[1] || '0', 10);
        const d = parseInt(parts[2] || '0', 10);
        return {
          label: `${m}/${d}`,
          value: Math.round(s.totalAmount / 10000)
        };
      })
    : MOCK_ASSET_TREND;

  // 누적 지출 그래프 데이터 매핑
  const cumulativeData = report?.weeklyExpenses && report.weeklyExpenses.length > 0
    ? report.weeklyExpenses.map(w => ({
        label: `${w.week}주`,
        thisMonth: Math.round(w.currCumulative / 10000),
        lastMonth: Math.round(w.prevCumulative / 10000)
      }))
    : MOCK_CUMULATIVE;

  // 도넛 차트 카테고리 소비 매핑
  const donutCategories = report?.categoryExpenses && report.categoryExpenses.length > 0
    ? report.categoryExpenses.map(c => ({
        category: c.category,
        value: c.amount
      }))
    : data.expenseCategories;

  // 전월 대비 % 계산
  const firstVal = trendData[0]?.value ?? 0;
  const lastVal = trendData[trendData.length - 1]?.value ?? 0;
  const trendPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 1000) / 10 : 3.1;

  // 누적 지출 요약 (마지막 주 기준)
  const lastWeek = cumulativeData[cumulativeData.length - 1];
  const thisMonthTotal = lastWeek?.thisMonth ?? 83;
  const lastMonthTotal = lastWeek?.lastMonth ?? 92;
  const cumulDiff = thisMonthTotal - lastMonthTotal;

  // 미션 코멘트
  const missionComment = report?.eventComment ?? MOCK_MISSION_COMMENT;

  return (
    <div style={{ minHeight: onClose ? 'auto' : '100vh', background: '#f8fafc', display: 'flex', justifyContent: 'center', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", width: '100%' }}>
      <div style={{ width: '100%', maxWidth: 375, minHeight: onClose ? 'auto' : '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px', background: '#fff', borderBottom: '0.5px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => onClose ? onClose() : navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={22} color="#0f172a" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={17} color="#64748b" />
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', minWidth: 86, textAlign: 'center' }}>
              {year}년 {month}월
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              style={{ background: 'none', border: 'none', padding: 6, cursor: isCurrentMonth ? 'not-allowed' : 'pointer', opacity: isCurrentMonth ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={17} color="#64748b" />
            </button>
          </div>
          {onClose ? (
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, display: 'flex', alignItems: 'center', padding: 6 }} aria-label="닫기">✕</button>
          ) : (
            <div style={{ width: 34 }} />
          )}
        </div>

        {/* 본문 */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              {/* 심플 CSS 로딩 스핀 */}
              <div style={{ width: 28, height: 28, border: '3px solid #cbd5e1', borderTopColor: '#378ADD', borderRadius: '50%', margin: '0 auto 12px' }} />
              리포트를 분석하고 있어요...
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 52px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ──── 자산 블록 ──── */}
            <BlockHeader color="#378ADD">자산</BlockHeader>

            {/* 수입·지출 요약 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox label="총 수입" value={fmtMan(totalIncome)} color="#0F6E56" />
              <StatBox label="총 지출" value={fmtMan(totalExpense)} color="#A32D2D" />
            </div>

          {/* 포트폴리오 추이 */}
          <Card>
            <SectionTitle>한달간 변화 추이</SectionTitle>
            <AssetTrendChart data={trendData} />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>전월 대비</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChangeBadge value={trendPct} />
              </div>
            </div>
            {userGoal && (
              <div style={{ marginTop: 8, padding: '10px 12px', background: '#EEEDFE', borderRadius: 10, fontSize: 12, color: '#534AB7', lineHeight: 1.7 }}>
                🎯 <strong>{userGoal}</strong> 목표 기준으로 현재 포트폴리오는 목표 달성 경로에 있어요.
              </div>
            )}
          </Card>

          {/* 자산 내역 */}
          <Card>
            <SectionTitle>자산 내역 상세</SectionTitle>
            <HoldingsList />
            <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 8, margin: '8px 0 0' }}>지난달 대비 수익 상승률입니다</p>
          </Card>

          {/* 시장 상황 */}
          <Card>
            <SectionTitle>시장 상황 요약</SectionTitle>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, margin: 0 }}>{marketCondition}</p>
          </Card>

          {/* ──── 소비 블록 ──── */}
          <BlockHeader color="#EF9F27">소비</BlockHeader>

          {/* 누적 지출 비교 */}
          <Card>
            <SectionTitle>이번달 vs 저번달 누적 지출</SectionTitle>
            <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 20, height: 2.5, background: '#EF9F27', borderRadius: 99 }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>이번달</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" /></svg>
                <span style={{ fontSize: 11, color: '#64748b' }}>저번달</span>
              </div>
            </div>
            <CumulativeChart data={cumulativeData} />
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>이번달</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#EF9F27', margin: 0 }}>{thisMonthTotal}만 원</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>저번달</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', margin: 0 }}>{lastMonthTotal}만 원</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>전감</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: cumulDiff <= 0 ? '#0F6E56' : '#A32D2D', margin: 0 }}>{cumulDiff > 0 ? '+' : ''}{cumulDiff}만 원</p>
              </div>
            </div>
          </Card>

          {/* 지출 파이차트 */}
          <Card>
            <SectionTitle>카테고리별 비중</SectionTitle>
            <SpendingDonut categories={donutCategories} report={report} />
          </Card>

          {/* AI 가이드라인 */}
          <div style={{ background: '#0f172a', borderRadius: 14, padding: '16px 18px', marginTop: 4 }}>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>Pori의 다음달 가이드</p>
            <p style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.9, margin: 0 }}>{guideline}</p>
          </div>

          {/* 미션 요약 */}
          <SectionTitle>소비 미션 요약</SectionTitle>
          <MissionSummarySection comment={missionComment} />

          {/* ──── 세금 공제 ──── */}
          <BlockHeader color="#1D9E75">세금 공제</BlockHeader>
          <TaxDeductionSection taxResponse={taxResponse} />

          </div>
        )}
      </div>
    </div>
  );
}
