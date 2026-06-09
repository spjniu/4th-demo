import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getMonthlyReport,
  type MonthlyReportData,
  type MiniChallenge,
  type TaxBenefitSummary,
  type PortfolioBreakdownItem,
} from '../api/reportApi';

const TODAY = new Date();

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function fmtMan(n: number) {
  return `${Math.round(Math.abs(n) / 10000).toLocaleString()}만 원`;
}
function pctToXY(cx: number, cy: number, r: number, pct: number) {
  const rad = (pct / 100) * 2 * Math.PI - Math.PI / 2;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
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

function AssetTrendChart({ data }: { data: { label: string; value: number }[] }) {
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

function HoldingsList({ items }: { items: PortfolioBreakdownItem[] }) {
  return (
    <div>
      {items.map((holding, i) => {
        const pos = holding.monthlyChangeRate >= 0;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: i < items.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{holding.productName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{holding.productType} · {holding.ticker}</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: pos ? '#0F6E56' : '#A32D2D' }}>
              {pos ? '+' : ''}{holding.monthlyChangeRate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 누적 지출 비교 차트 ───────────────────────────────────────────────────────

function CumulativeChart({ data }: { data: { label: string; thisMonth: number; lastMonth: number }[] }) {
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

function SpendingDonut({ categories, hints }: { categories: { category: string; value: number }[]; hints: Record<string, string> }) {
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
  const hint = activeIdx !== null ? hints[categories[activeIdx].category] : null;

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

function MissionSummarySection({ missions, comment }: { missions: MiniChallenge[]; comment: string }) {
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
            {missions.map((m, i) => {
              const result = m.status === 'COMPLETED' ? '성공' : m.status === 'FAILED' ? '실패' : '진행중';
              const period = m.completedAt
                ? `${fmtDate(m.startedAt)} ~ ${fmtDate(m.completedAt)}`
                : fmtDate(m.startedAt);
              return (
                <tr key={i} style={{ borderBottom: i < missions.length - 1 ? '1px solid #f1f5f9' : 'none', height: 36 }}>
                  <td style={{ padding: '6px 4px', fontWeight: 600, color: '#0f172a', textAlign: 'left' }}>{m.title}</td>
                  <td style={{ padding: '6px 4px', color: '#64748b' }}>{period}</td>
                  <td style={{ padding: '6px 4px' }}>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: result === '성공' ? '#E1F5EE' : result === '실패' ? '#FCEBEB' : '#FEF9E7',
                      color: result === '성공' ? '#0F6E56' : result === '실패' ? '#A32D2D' : '#B7791F',
                    }}>
                      {result}
                    </span>
                    {m.rewardStockTicker && (
                      <span style={{ display: 'block', fontSize: 9, color: '#64748b', marginTop: 2 }}>{m.rewardStockTicker}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 14, padding: '12px', background: '#f8fafc', borderRadius: 10, border: '0.5px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#378ADD' }}>🤖 Pori의 피드백</p>
          <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{comment}</p>
        </div>
      </Card>
    </div>
  );
}

function TaxDeductionSection({ tax }: { tax: TaxBenefitSummary }) {
  const rows = [
    { category: 'IRP',    paid: tax.irpContribution,     deducted: tax.irpCumulativeDeduction },
    { category: '연금 저축', paid: tax.pensionContribution, deducted: tax.pensionCumulativeDeduction },
  ];
  const comment = `IRP와 연금저축 납입을 통해 총 ${tax.totalTaxSavings.toLocaleString()}원의 세액 공제 혜택을 확보하였습니다. 소득 세액 공제 한도가 아직 남아 있으니, 연말까지 납입 금액을 조금 더 늘려 절세 효과를 극대화해 보시길 추천해요.`;

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
          {rows.map((t, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none', height: 36 }}>
              <td style={{ padding: '6px 4px', fontWeight: 700, color: '#0f172a', textAlign: 'left' }}>{t.category}</td>
              <td style={{ padding: '6px 4px', color: '#0F6E56', fontWeight: 600 }}>{t.paid.toLocaleString()}원</td>
              <td style={{ padding: '6px 4px', color: '#378ADD', fontWeight: 600 }}>
                {t.deducted > 0 ? `+${t.deducted.toLocaleString()}원` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 14, padding: '12px', background: '#f8fafc', borderRadius: 10, border: '0.5px solid #e2e8f0' }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#1D9E75' }}>💡 절세 제안</p>
        <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{comment}</p>
      </div>
    </Card>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function MonthlyReport({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();
  const prevMonthDate = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1);
  const [year, setYear] = useState(prevMonthDate.getFullYear());
  const [month, setMonth] = useState(prevMonthDate.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userGoal = sessionStorage.getItem('user:goal') ?? '';

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMonthlyReport(year, month)
      .then(setReport)
      .catch((err: Error) => setError(err.message ?? '리포트를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [year, month]);

  const isCurrentMonth = year === prevMonthDate.getFullYear() && month === prevMonthDate.getMonth() + 1;
  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (isCurrentMonth) return; if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const trendData = report?.assetSnapshots.map(s => {
    const [, m, d] = s.snapshotDate.split('-');
    return { label: `${parseInt(m)}/${parseInt(d)}`, value: Math.round(s.totalAmount / 10000) };
  }) ?? [];

  const cumulativeData = report?.weeklyExpenses.map(w => ({
    label: `${w.week}주`,
    thisMonth: Math.round(w.currCumulative / 10000),
    lastMonth: Math.round(w.prevCumulative / 10000),
  })) ?? [];

  const donutCategories = report?.categoryExpenses.map(c => ({
    category: c.category,
    value: c.amount,
  })) ?? [];

  const expenseHints: Record<string, string> = Object.fromEntries(
    (report?.categoryExpenses ?? []).map(c => [c.category, c.hoverComment])
  );

  const lastWeek = cumulativeData[cumulativeData.length - 1];
  const thisMonthTotal = lastWeek?.thisMonth ?? 0;
  const lastMonthTotal = lastWeek?.lastMonth ?? 0;
  const cumulDiff = thisMonthTotal - lastMonthTotal;

  const firstSnap = report?.assetSnapshots[0]?.totalAmount ?? 0;
  const lastSnap = report?.assetSnapshots[report?.assetSnapshots.length - 1]?.totalAmount ?? 0;
  const assetChangeAmt = Math.round((lastSnap - firstSnap) / 10000);

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
              <div style={{ width: 28, height: 28, border: '3px solid #cbd5e1', borderTopColor: '#378ADD', borderRadius: '50%', margin: '0 auto 12px' }} />
              리포트를 분석하고 있어요...
            </div>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: '#A32D2D', fontSize: 13 }}>
            {error}
          </div>
        ) : report && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 52px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ──── 자산 블록 ──── */}
            <BlockHeader color="#378ADD">자산</BlockHeader>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox label="총 수입" value={fmtMan(report.totalIncome)} color="#0F6E56" />
              <StatBox label="총 지출" value={fmtMan(report.totalExpense)} color="#A32D2D" />
            </div>

            <Card>
              <SectionTitle>한달간 변화 추이</SectionTitle>
              <AssetTrendChart data={trendData} />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>전월 대비</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {assetChangeAmt >= 0 ? '+' : ''}{assetChangeAmt}만 원
                  </span>
                  <ChangeBadge value={report.assetChangeRate} />
                </div>
              </div>
              {report.trendComment && (
                <div style={{ marginTop: 8, padding: '10px 12px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                  {report.trendComment}
                </div>
              )}
              {userGoal && (
                <div style={{ marginTop: 8, padding: '10px 12px', background: '#EEEDFE', borderRadius: 10, fontSize: 12, color: '#534AB7', lineHeight: 1.7 }}>
                  🎯 <strong>{userGoal}</strong> 목표 기준으로 현재 포트폴리오는 목표 달성 경로에 있어요.
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle>자산 내역 상세</SectionTitle>
              <HoldingsList items={report.portfolioBreakdown} />
              <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', margin: '8px 0 0' }}>지난달 대비 수익 상승률입니다</p>
            </Card>

            <Card>
              <SectionTitle>시장 상황 요약</SectionTitle>
              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, margin: 0 }}>{report.marketCondition}</p>
            </Card>

            {/* ──── 소비 블록 ──── */}
            <BlockHeader color="#EF9F27">소비</BlockHeader>

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
                  <p style={{ fontSize: 14, fontWeight: 700, color: cumulDiff <= 0 ? '#0F6E56' : '#A32D2D', margin: 0 }}>
                    {cumulDiff > 0 ? '+' : ''}{cumulDiff}만 원
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle>카테고리별 비중</SectionTitle>
              <SpendingDonut categories={donutCategories} hints={expenseHints} />
            </Card>

            <div style={{ background: '#0f172a', borderRadius: 14, padding: '16px 18px', marginTop: 4 }}>
              <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>Pori의 다음달 가이드</p>
              <p style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.9, margin: 0 }}>{report.guideline}</p>
            </div>

            <SectionTitle>소비 미션 요약</SectionTitle>
            <MissionSummarySection missions={report.miniChallenges} comment={report.eventComment} />

            {/* ──── 세금 공제 ──── */}
            <BlockHeader color="#1D9E75">세금 공제</BlockHeader>
            <TaxDeductionSection tax={report.taxBenefitSummary} />

          </div>
        )}
      </div>
    </div>
  );
}
