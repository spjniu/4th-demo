// 절세 위젯 — 13월의 월급(예상 세액공제) 요약 (+ 펼침 IRP/연금 납입 현황)
//   계산값은 백엔드 /dashboard 의 taxSaving(= TaxBenefitPolicy 정책 기준)에서 그대로 내려옴.
import { useState } from 'react';
import type { DashboardTaxSaving } from '../../api/dashboardApi';
import { fmtWon } from './shared';

export function TaxSavingWidget({ taxDeduction, active, onClick }: {
  taxDeduction: number;
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
      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>절세</span>

      {/* 중앙 예상 환급액 */}
      <div style={{ display: 'flex', flexDirection: 'column', margin: '4px 0' }}>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>13월의 월급으로</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#1D9E75', marginTop: 2, lineHeight: 1.35 }}>
          {taxDeduction.toLocaleString()}원<br />돌려받아요
        </span>
      </div>

      {/* 하단 */}
      <div>
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>+ 더 채우면 환급 ↑</span>
      </div>
    </div>
  );
}

const PEN_COLOR = '#1D9E75';   // 연금저축 — 초록
const IRP_COLOR = '#3B82F6';   // IRP — 파랑

export function TaxSavingDetail({ view }: { view: DashboardTaxSaving }) {
  const { deductionRate, totalTaxDeduction, remaining, bars } = view;

  // 연금저축 + IRP 는 합산 900만 한도 (그 중 연금저축 단독은 600만까지).
  const pen = bars.find(b => b.label === '연금저축');
  const irp = bars.find(b => b.label === 'IRP');
  const combinedLimit = irp?.limit ?? 9_000_000;       // 합산 한도 900만
  const pensionSubLimit = pen?.limit ?? 6_000_000;     // 연금저축 단독 한도 600만
  const penDeductible = pen?.deductible ?? 0;          // 공제대상(바 채움)
  const irpDeductible = irp?.deductible ?? 0;
  const used = penDeductible + irpDeductible;

  // 합산 한도까지 남은 여력 (backend remaining = 900 − 합산납입)
  const combinedRemaining = remaining;
  // 각 계좌에 더 넣을 수 있는 금액
  const penAddable = Math.max(0, Math.min(pensionSubLimit - (pen?.contribution ?? 0), combinedRemaining));
  const irpAddable = combinedRemaining;

  const penW = combinedLimit > 0 ? penDeductible / combinedLimit * 100 : 0;
  const irpW = combinedLimit > 0 ? irpDeductible / combinedLimit * 100 : 0;
  const markerLeft = combinedLimit > 0 ? pensionSubLimit / combinedLimit * 100 : 0;

  // 바 호버 시 해당 세그먼트 위에 금액 툴팁 (세그먼트 중심에 동적 배치)
  const [hovered, setHovered] = useState<'pen' | 'irp' | null>(null);
  const tip = hovered === 'pen'
    ? { left: penW / 2, text: `연금 ${fmtWon(penDeductible)}` }
    : hovered === 'irp'
      ? { left: penW + irpW / 2, text: `IRP ${fmtWon(irpDeductible)}` }
      : null;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E0F2FE',
      borderRadius: 22,
      padding: '16px',
      boxShadow: '0 2px 12px rgba(0,149,219,0.06)'
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>연금·IRP 세액공제 현황</span>
        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 99, background: '#E1F5EE', color: '#0F6E56' }}>
          {deductionRate.toFixed(1)}% 공제율
        </span>
      </div>
      {/* 헤드라인 */}
      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 16px' }}>
        {combinedRemaining > 0
          ? <>최대 환급까지 <b style={{ color: PEN_COLOR }}>{fmtWon(combinedRemaining)}</b> 남았어요!</>
          : <>세액공제 한도를 모두 채웠어요 🎉</>}
      </p>

      {/* 합산 공제대상 라벨 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>합산 공제대상</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmtWon(used)}</span>
          {' '}/ {fmtWon(combinedLimit)}
        </span>
      </div>

      {/* 합산 바 (호버 시 세그먼트 금액 툴팁 + 600만 한도 마커) */}
      <div style={{ position: 'relative', height: 24, marginBottom: 6 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#EEF2F6', borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
          <div
            onMouseEnter={() => { if (penDeductible > 0) setHovered('pen'); }}
            onMouseLeave={() => setHovered(null)}
            style={{ width: `${penW}%`, background: PEN_COLOR, opacity: hovered && hovered !== 'pen' ? 0.5 : 1, transition: 'width 0.4s ease, opacity 0.15s ease' }}
          />
          <div
            onMouseEnter={() => { if (irpDeductible > 0) setHovered('irp'); }}
            onMouseLeave={() => setHovered(null)}
            style={{ width: `${irpW}%`, background: IRP_COLOR, opacity: hovered && hovered !== 'irp' ? 0.5 : 1, transition: 'width 0.4s ease, opacity 0.15s ease' }}
          />
        </div>
        {/* 연금 600만 한도 마커 */}
        <div style={{ position: 'absolute', left: `${markerLeft}%`, top: 0, bottom: 0, width: 2, background: '#fff', opacity: 0.85, transform: 'translateX(-1px)', pointerEvents: 'none' }} />
        {/* 호버 툴팁 */}
        {tip && (
          <div style={{ position: 'absolute', left: `${tip.left}%`, bottom: 'calc(100% + 7px)', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 5, animation: 'fadeIn 0.12s ease-out' }}>
            <div style={{ background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 7, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
              {tip.text}
            </div>
            <div style={{ width: 0, height: 0, margin: '0 auto', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #0f172a' }} />
          </div>
        )}
      </div>

      {/* 한도 라벨 (연금 600만 / 합산 900만) */}
      <div style={{ position: 'relative', height: 30, marginBottom: 16 }}>
        <div style={{ position: 'absolute', left: `${markerLeft}%`, transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ width: 1, height: 6, background: '#cbd5e1', margin: '0 auto 2px' }} />
          <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap' }}>연금 최대 한도<br />({fmtWon(pensionSubLimit)})</p>
        </div>
        <div style={{ position: 'absolute', right: 0, textAlign: 'right' }}>
          <div style={{ width: 1, height: 6, background: '#cbd5e1', marginLeft: 'auto', marginBottom: 2 }} />
          <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap' }}>합산 최대 한도<br />({fmtWon(combinedLimit)})</p>
        </div>
      </div>

      {/* 어디에 얼마를 더 넣을 수 있나요? */}
      <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>✅</span> 어디에 얼마를 더 넣을 수 있나요?
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: '#F0FAF6', border: '1px solid #D6F0E5', borderRadius: 14, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PEN_COLOR }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>연금저축</span>
          </div>
          <p style={{ margin: '0 0 6px' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: PEN_COLOR }}>{fmtWon(penAddable)}</span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 3 }}>가능</span>
          </p>
          <p style={{ fontSize: 10, color: '#64748b', margin: 0, lineHeight: 1.4 }}>단독으로 최대 {fmtWon(pensionSubLimit)}까지만 채울 수 있어요.</p>
        </div>
        <div style={{ flex: 1, background: '#EFF4FE', border: '1px solid #DBE6FE', borderRadius: 14, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: IRP_COLOR }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>IRP</span>
          </div>
          <p style={{ margin: '0 0 6px' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: IRP_COLOR }}>{fmtWon(irpAddable)}</span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 3 }}>가능</span>
          </p>
          <p style={{ fontSize: 10, color: '#64748b', margin: 0, lineHeight: 1.4 }}>연금저축과 합쳐서 남은 금액 모두 입금 가능해요.</p>
        </div>
      </div>

      {/* 올해 예상 세액공제 */}
      <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 12, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 3px' }}>올해 예상 세액공제</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#085041', margin: 0 }}>
              {totalTaxDeduction > 0 ? `${totalTaxDeduction.toLocaleString()}원` : '–'}
            </p>
          </div>
          {remaining > 0 && (
            <div style={{ background: '#E1F5EE', borderRadius: 8, padding: '6px 10px', textAlign: 'right' }}>
              <p style={{ fontSize: 9, color: '#0F6E56', margin: '0 0 1px' }}>한도 추가 납입 시</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#085041', margin: 0 }}>
                +{Math.round(remaining * deductionRate / 100).toLocaleString()}원 환급↑
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
