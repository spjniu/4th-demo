// 소비 위젯 — 세로 연료게이지로 예산 잔여 비율 표시 (+ 펼침 상세)
import type { DashboardCategoryExpense } from '../../api/dashboardApi';
import { fmtManwon, type ConsumptionView, type SpendingItem } from './shared';

export function ConsumptionWidget({ view, active, onClick }: {
  view: ConsumptionView;
  active: boolean;
  onClick: () => void;
}) {
  const { totalExpense, remainingPercent, fillColor, isBudgetExceeded } = view;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>소비</span>
        {isBudgetExceeded && (
          <span style={{ fontSize: 9, fontWeight: 700, background: '#FCEBEB', color: '#EF4444', padding: '2px 6px', borderRadius: 99 }}>초과</span>
        )}
      </div>

      {/* 중앙 세로 연료탱크 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
        <div style={{
          width: 20,
          height: 60,
          background: '#F8FAFC',
          border: '1px solid #E0F2FE',
          borderRadius: 8,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${Math.max(0, Math.min(100, remainingPercent))}%`,
            background: fillColor,
            borderRadius: '0 0 6px 6px',
            transition: 'height 0.4s ease'
          }} />
        </div>

        <div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: fillColor, lineHeight: 1.2 }}>
            {remainingPercent}%
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>남음</p>
        </div>
      </div>

      {/* 하단 총지출액 */}
      <div>
        <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>지출액</p>
        <p style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          {fmtManwon(totalExpense)}
        </p>
      </div>
    </div>
  );
}

export function ConsumptionDetail({ spendingItems, categories }: {
  spendingItems: SpendingItem[];
  categories: DashboardCategoryExpense[];
}) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E0F2FE',
      borderRadius: 22,
      padding: '16px',
      boxShadow: '0 2px 12px rgba(0,149,219,0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0 }}>지출 카테고리 비율</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
        {spendingItems.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#64748b', width: 60, flexShrink: 0 }}>{s.label}</span>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
              <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#0f172a', width: 32, textAlign: 'right', flexShrink: 0 }}>{s.pct}%</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>상세 지출 내역</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbd5e1' }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', margin: 0 }}>{item.categoryName}</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{item.sub ?? '-'}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{item.expenseAmount.toLocaleString()}원</p>
          </div>
        ))}
      </div>
    </div>
  );
}
