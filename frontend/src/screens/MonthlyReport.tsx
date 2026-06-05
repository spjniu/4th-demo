import { useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TODAY = new Date();

// ─── 목 데이터 ──────────────────────────────────────────────────────────────

const MOCK_ASSET_TREND = [
  { label: '5/1',  value: 3200 },
  { label: '5/8',  value: 3238 },
  { label: '5/15', value: 3213 },
  { label: '5/22', value: 3282 },
  { label: '5/27', value: 3298 },
];

const MOCK_BREAKDOWN = [
  { category: 'ETF',    pct: 40, change:  4, color: '#1D9E75', items: [{ name: 'TIGER 미국S&P500', detail: '25%' }, { name: 'KODEX 나스닥100', detail: '15%' }] },
  { category: '현금성', pct: 35, change:  2, color: '#5DCAA5', items: [{ name: '토스뱅크 파킹통장', detail: '700만 원' }, { name: '신한은행 입출금', detail: '420만 원' }] },
  { category: '적금',   pct: 15, change:  0, color: '#9FE1CB', items: [{ name: '우리 Super 정기적금', detail: '480만 원' }] },
  { category: 'IRP',    pct: 10, change:  1, color: '#085041', items: [{ name: '미래에셋 퇴직연금', detail: '10%' }] },
];

const MOCK_MARKET = '연속된 금리 동결 신호로 기술주 중심 반등이 이어졌습니다. S&P500은 월간 +2.0%, 코스피는 반도체 업황 기대감에 +1.4% 상승했습니다.';

const MOCK_CUMULATIVE = [
  { label: '1주', thisMonth: 28, lastMonth: 32 },
  { label: '2주', thisMonth: 51, lastMonth: 58 },
  { label: '3주', thisMonth: 70, lastMonth: 79 },
  { label: '4주', thisMonth: 83, lastMonth: 92 },
];

const MOCK_EXPENSE_HINTS: Record<string, string> = {
  '식비':     '배달앱 이용 빈도가 높았어요\n지난달 대비 +12% 증가했어요',
  '교통':     '지하철·버스 중심으로 안정적으로 이용했어요\n지난달 수준을 유지하고 있어요',
  '쇼핑':     '온라인 쇼핑이 전체의 80%예요\n충동구매 패턴이 감지됐어요',
  '문화/여가': 'OTT·영화 지출이 주를 이뤘어요\n지난달 대비 소폭 감소했어요',
  '기타':     '편의점·카페 소비가 주를 이뤘어요\n소액 지출이 자주 발생하고 있어요',
};

const MOCK_TREND = [
  { label: '5/1',  portfolio: 0.0, sp500: 0.0 },
  { label: '5/8',  portfolio: 1.2, sp500: 0.8 },
  { label: '5/15', portfolio: 0.4, sp500: 1.5 },
  { label: '5/22', portfolio: 2.1, sp500: 1.8 },
  { label: '5/27', portfolio: 2.4, sp500: 2.0 },
];

const MOCK_BENCHMARK_COMMENT =
  '이번달 포트폴리오는 S&P500 대비 +0.4%p 아웃퍼폼했습니다. ETF 비중 40%의 분산 투자가 기술주 상승 흐름을 효과적으로 포착했으며, 현재 구성이 시장 변동성 대비 안정적인 성과를 내고 있어요.';

// TODO: 백엔드 연동 시 fetch로 교체
const MOCK_DATA = {
  totalIncome:  3_200_000,
  totalExpense: 2_450_000,
  expenseCategories: [
    { category: '식비',     value: 1_029_000 },
    { category: '쇼핑',     value:   514_500 },
    { category: '문화/여가', value:   441_000 },
    { category: '기타',     value:   269_500 },
    { category: '교통',     value:   196_000 },
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

// ─── 자산 내역 아코디언 ────────────────────────────────────────────────────────

function BreakdownList() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div>
      {MOCK_BREAKDOWN.map((cat, i) => (
        <div key={cat.category} style={{ borderBottom: i < MOCK_BREAKDOWN.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
          <div
            onClick={() => setOpenIdx(prev => prev === i ? null : i)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 0', cursor: 'pointer' }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', flex: 1 }}>{cat.category}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>총 {cat.pct}%</span>
            <ChangeBadge value={cat.change} />
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>{openIdx === i ? '↑' : '↓'}</span>
          </div>
          {openIdx === i && (
            <div style={{ paddingLeft: 18, paddingBottom: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {cat.items.map((item, j) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{item.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{item.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
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

function SpendingDonut({ categories }: { categories: { category: string; value: number }[] }) {
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
  const hint = activeIdx !== null ? MOCK_EXPENSE_HINTS[categories[activeIdx].category] : null;

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

// ─── 벤치마크 비교 차트 ───────────────────────────────────────────────────────

function BenchmarkChart({ data }: { data: typeof MOCK_TREND }) {
  const W = 290, H = 110, PAD = { t: 12, b: 28, l: 32, r: 12 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const allVals = data.flatMap(d => [d.portfolio, d.sp500]);
  const minV = Math.min(...allVals) - 0.5, maxV = Math.max(...allVals) + 0.5;
  const xOf = (i: number) => PAD.l + (i / (data.length - 1)) * iW;
  const yOf = (v: number) => PAD.t + (1 - (v - minV) / (maxV - minV)) * iH;
  const toPath = (key: 'portfolio' | 'sp500') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(d[key]).toFixed(1)}`).join(' ');
  const gridVals = [0.75, 0.5, 0.25].map(r => minV + (maxV - minV) * r);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#f1f5f9" strokeWidth={1} />
          <text x={PAD.l - 4} y={yOf(v)} textAnchor="end" dominantBaseline="middle" fontSize={8} fill="#94a3b8">
            {v > 0 ? '+' : ''}{v.toFixed(1)}%
          </text>
        </g>
      ))}
      <line x1={PAD.l} y1={yOf(0)} x2={W - PAD.r} y2={yOf(0)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 2" />
      <path d={toPath('sp500')} fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="5 3" />
      <path d={toPath('portfolio')} fill="none" stroke="#7F77DD" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={i} cx={xOf(i)} cy={yOf(d.portfolio)} r={3.5} fill="#fff" stroke="#7F77DD" strokeWidth={2} />)}
      {data.map((d, i) => <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.label}</text>)}
    </svg>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function MonthlyReport({ onClose }: { onClose?: () => void } = {}) {
  const navigate  = useNavigate();
  const [year,  setYear]  = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth() + 1);

  const userGoal = sessionStorage.getItem('user:goal') ?? '';
  const data = MOCK_DATA; // TODO: 백엔드 연동 시 fetchAgentReport(year, month) 으로 교체

  const isCurrentMonth = year === TODAY.getFullYear() && month === TODAY.getMonth() + 1;
  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (isCurrentMonth) return; if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const lastTrend  = MOCK_TREND[MOCK_TREND.length - 1];
  const outperform = lastTrend.portfolio >= lastTrend.sp500;

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
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 52px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ──── 자산 블록 ──── */}
          <BlockHeader color="#378ADD">자산</BlockHeader>

          {/* 수입·지출 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatBox label="총 수입" value={fmtMan(data.totalIncome)}  color="#0F6E56" />
            <StatBox label="총 지출" value={fmtMan(data.totalExpense)} color="#A32D2D" />
          </div>

          {/* 포트폴리오 추이 */}
          <Card>
            <SectionTitle>한달간 변화 추이</SectionTitle>
            <AssetTrendChart data={MOCK_ASSET_TREND} />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>전월 대비</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>+98만 원</span>
                <ChangeBadge value={3.1} />
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
            <BreakdownList />
          </Card>

          {/* 시장 상황 */}
          <Card>
            <SectionTitle>시장 상황 요약</SectionTitle>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, margin: 0 }}>{MOCK_MARKET}</p>
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
            <CumulativeChart data={MOCK_CUMULATIVE} />
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>이번달</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#EF9F27', margin: 0 }}>83만 원</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>저번달</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', margin: 0 }}>92만 원</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>전감</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56', margin: 0 }}>-9만 원</p>
              </div>
            </div>
          </Card>

          {/* 지출 파이차트 */}
          <Card>
            <SectionTitle>카테고리별 비중</SectionTitle>
            <SpendingDonut categories={data.expenseCategories} />
          </Card>

          {/* AI 가이드라인 */}
          <div style={{ background: '#0f172a', borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>Pori의 다음달 가이드</p>
            <p style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.9, margin: 0 }}>{data.nextMonthGuideline}</p>
          </div>

          {/* 벤치마크 비교 */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: outperform ? '#E1F5EE' : '#FCEBEB', color: outperform ? '#0F6E56' : '#A32D2D', flexShrink: 0 }}>
                {outperform ? '아웃퍼폼' : '언더퍼폼'}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>vs S&P500 기준</span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 20, height: 2.5, background: '#7F77DD', borderRadius: 99 }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>내 포폴</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 3" /></svg>
                <span style={{ fontSize: 11, color: '#64748b' }}>S&P500</span>
              </div>
            </div>
            <BenchmarkChart data={MOCK_TREND} />
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: '#F3F2FE', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>내 포폴</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#7F77DD', margin: 0 }}>+{lastTrend.portfolio}%</p>
              </div>
              <div style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>S&P500</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', margin: 0 }}>+{lastTrend.sp500}%</p>
              </div>
              <div style={{ flex: 1, background: outperform ? '#E1F5EE' : '#FCEBEB', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 2px' }}>차이</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: outperform ? '#0F6E56' : '#A32D2D', margin: 0 }}>
                  {outperform ? '+' : ''}{(lastTrend.portfolio - lastTrend.sp500).toFixed(1)}%p
                </p>
              </div>
            </div>
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
              {MOCK_BENCHMARK_COMMENT}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
