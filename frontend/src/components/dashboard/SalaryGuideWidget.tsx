// 월급 가이드 위젯 — 월급 분배 도넛 + 상위 2개 범례
import { SalaryDonutChart } from './charts';
import { fmtManwon, type PortfolioSlice } from './shared';

export default function SalaryGuideWidget({ income, slices, onClick, highlight = false }: {
  income: number;
  slices: PortfolioSlice[];
  onClick: () => void;
  highlight?: boolean;
}) {
  const topSlices = [...slices].sort((a, b) => b.pct - a.pct).slice(0, 2);

  return (
    <>
      <style>{`@keyframes salaryPulse { 0%,100%{box-shadow:0 0 0 0 rgba(29,158,117,0)} 50%{box-shadow:0 0 0 8px rgba(29,158,117,0.25)} }`}</style>
      <div
        onClick={onClick}
        style={{
          background: highlight ? '#F0FBF7' : '#FFFFFF',
          border: highlight ? '2px solid #1D9E75' : '1px solid #E0F2FE',
          borderRadius: 22,
          padding: '16px',
          boxShadow: highlight ? '0 0 0 0 rgba(29,158,117,0)' : '0 2px 12px rgba(0,149,219,0.06)',
          animation: highlight ? 'salaryPulse 1s ease-in-out 3' : undefined,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 180,
          boxSizing: 'border-box',
          position: 'relative',
          transition: 'border 0.3s, background 0.3s',
        }}
      >
      {/* 상단 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>월급</span>
      </div>

      {/* 중앙 SalaryDonutChart */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
        <SalaryDonutChart
          data={slices}
          total={fmtManwon(income)}
          totalAmt={income}
          size={80}
        />
      </div>

      {/* 하단 범례 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {topSlices.map((s, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.label} {s.pct}%
            </span>
          </div>
        ))}
      </div>

      {/* 우측 하단 화살표 */}
      <span style={{ position: 'absolute', bottom: 12, right: 16, fontSize: 14, color: '#94a3b8', fontWeight: 700 }}>›</span>
    </div>
    </>
  );
}
