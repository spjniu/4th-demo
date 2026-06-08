// 투자 위젯 — 포트폴리오 상위 3개 수익률 요약 (+ 펼침 상세 도넛)
import type { DashboardPortfolioItem } from '../../api/dashboardApi';
import { DonutChart } from './charts';
import { fmtManwon, PORTFOLIO_COLOR, type PortfolioSlice } from './shared';

// 수익률 문자열 → 표시용 텍스트/색상 (+ 상승 ▲빨강 / 하락 ▼파랑)
function rateDisplay(r: string | undefined): { text: string; color: string } {
  if (!r || r === '-') return { text: '-', color: '#94a3b8' };
  if (r.startsWith('+')) return { text: '▲' + r.slice(1), color: '#EF4444' };
  if (r.startsWith('-')) return { text: '▼' + r.slice(1), color: '#0095DB' };
  return { text: r, color: '#94a3b8' };
}

export function InvestmentWidget({ investAmt, portfolioItems, active, onClick }: {
  investAmt: number;
  portfolioItems: DashboardPortfolioItem[];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${active ? '#0095DB' : '#E0F2FE'}`,
        borderRadius: 22,
        padding: '16px',
        boxShadow: '0 2px 12px rgba(0,149,219,0.06)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 180,
        boxSizing: 'border-box',
      }}
    >
      {/* 상단 */}
      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>투자</span>

      {/* 중앙 포트폴리오 리스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '6px 0' }}>
        {portfolioItems.map((p, idx) => {
          const catColor = PORTFOLIO_COLOR[p.categoryLabel] ?? '#94a3b8';
          const rateInfo = rateDisplay(p.rate);

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.categoryLabel}
                </span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: rateInfo.color, flexShrink: 0 }}>
                {rateInfo.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* 하단 총투자금액 */}
      <div>
        <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>총 투자금액</p>
        <p style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          {fmtManwon(investAmt)}
        </p>
      </div>
    </div>
  );
}

export function InvestmentDetail({ portfolioSlices, portfolio }: {
  portfolioSlices: PortfolioSlice[];
  portfolio: DashboardPortfolioItem[];
}) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E0F2FE',
      borderRadius: 22,
      padding: '16px',
      boxShadow: '0 2px 12px rgba(0,149,219,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <DonutChart data={portfolioSlices} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {portfolioSlices.map(p => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#0f172a' }}>{p.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.rate && p.rate !== '-' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: p.rate.startsWith('+') ? '#A32D2D' : '#64748b' }}>{p.rate}</span>
                )}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{p.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, borderTop: '1px dashed #e2e8f0', paddingTop: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>상품별 비중 상세</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {portfolio.map((cat, idx) => {
            const catColor = PORTFOLIO_COLOR[cat.categoryLabel] ?? '#94a3b8';
            const showRate = cat.rate && cat.rate !== '-';
            return (
              <div key={idx}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{cat.categoryLabel} (총 {cat.ratio}%)</span>
                  {showRate && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: cat.rate.startsWith('+') ? '#A32D2D' : '#94a3b8', marginLeft: 2 }}>{cat.rate}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {cat.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EFF8FF', padding: '8px 10px', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: '#0f172a' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.rate && item.rate !== '-' && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: item.rate.startsWith('+') ? '#A32D2D' : '#94a3b8' }}>{item.rate}</span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{item.ratio}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
