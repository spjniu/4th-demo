import { useState, useMemo, type ReactNode } from 'react';
import type { HubItem, ProductItem } from './portfolioRegistry';
import { lookupProduct } from './portfolioRegistry';

// ─── 공통 아이콘 컴포넌트 ─────────────────────────────────

export function Logo({ letter, bg, color, size = 20, imgSrc }: { letter: string; bg: string; color: string; size?: number; imgSrc?: string }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: imgSrc ? '#fff' : bg, color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.44, fontWeight: 500, flexShrink: 0, overflow: 'hidden',
      border: imgSrc ? '0.5px solid #e2e8f0' : 'none',
    }}>
      {imgSrc
        ? <img src={imgSrc} alt={letter} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        : letter}
    </span>
  );
}

export function ProductIcon({ icon, color, size = 18 }: { icon: 'trending-up' | 'piggy-bank'; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {icon === 'trending-up' ? (
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      ) : (
        <>
          <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z" />
          <path d="M2 9v1c0 1.1.9 2 2 2h1" />
        </>
      )}
    </svg>
  );
}

// ─── 모달 쉘 ─────────────────────────────────────────────

export function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
          <button onClick={onClose} aria-label="닫기" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── HubPickerModal ───────────────────────────────────────

interface HubPickerModalProps {
  catalog: HubItem[];
  currentId: string;
  onClose: () => void;
  onPick: (h: HubItem) => void;
}

export function HubPickerModal({ catalog, currentId, onClose, onPick }: HubPickerModalProps) {
  const [filter, setFilter] = useState<'전체' | '일반' | 'IRP' | 'ISA'>('전체');
  const filtered = filter === '전체' ? catalog : catalog.filter(h => h.kind === filter);
  return (
    <ModalShell title="모으는 계좌 선택" onClose={onClose}>
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['전체', '일반', 'IRP', 'ISA'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                border: 'none', cursor: 'pointer',
                background: filter === f ? '#0f172a' : '#f1f5f9',
                color: filter === f ? '#fff' : '#64748b',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 14px 14px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(h => {
            const isCurrent = h.id === currentId;
            return (
              <button
                key={h.id}
                onClick={() => onPick(h)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: isCurrent ? '#EFF6FF' : '#fff',
                  border: `1.5px solid ${isCurrent ? '#3182F6' : '#e2e8f0'}`,
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <Logo letter={h.logo} bg={h.logoBg} color={h.logoColor} size={36} imgSrc={h.imgSrc} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{h.name}</span>
                    {h.kind !== '일반' && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 99 }}>{h.kind}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 1 }}>{h.number}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{h.sub}</div>
                </div>
                {isCurrent && <span style={{ fontSize: 11, color: '#3182F6', fontWeight: 700 }}>현재</span>}
              </button>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

// ─── ProductPickerModal ───────────────────────────────────

interface ProductPickerModalProps {
  catalog: ProductItem[];
  currentId?: string;
  mode: 'add' | 'replace';
  onClose: () => void;
  onPick: (p: ProductItem) => void;
}

export function ProductPickerModal({ catalog, currentId, mode, onClose, onPick }: ProductPickerModalProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'전체' | ProductItem['type']>('전체');
  const [selected, setSelected] = useState<ProductItem | null>(currentId ? lookupProduct(currentId) : null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter(p => {
      if (typeFilter !== '전체' && p.type !== typeFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
    });
  }, [catalog, query, typeFilter]);

  const recommended = filtered.filter(p => p.recommended);
  const others = filtered.filter(p => !p.recommended);

  const renderItem = (p: ProductItem) => {
    const isSelected = selected?.id === p.id;
    return (
      <button
        key={p.id}
        onClick={() => setSelected(p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          background: isSelected ? '#EFF6FF' : '#fff',
          border: `1.5px solid ${isSelected ? '#3182F6' : '#e2e8f0'}`,
          borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
        }}
      >
        <ProductIcon icon={p.icon} color={p.iconColor} size={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: p.badgeBg, color: p.badgeColor, padding: '1px 6px', borderRadius: 99 }}>{p.type}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
          </div>
        </div>
        {p.id === currentId && <span style={{ fontSize: 11, color: '#3182F6', fontWeight: 700 }}>현재</span>}
      </button>
    );
  };

  return (
    <ModalShell title="상품 선택" onClose={onClose}>
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상품명·유형·설명으로 검색"
            style={{
              width: '100%', padding: '9px 12px 9px 32px', fontSize: 12, borderRadius: 10,
              border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['전체', 'ETF', 'TDF', '채권', '리츠', '주식'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                border: 'none', cursor: 'pointer',
                background: typeFilter === t ? '#0f172a' : '#f1f5f9',
                color: typeFilter === t ? '#fff' : '#64748b',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
        {recommended.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>⭐</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>추천 상품</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recommended.map(renderItem)}
            </div>
          </div>
        )}
        {others.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>전체 상품</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {others.map(renderItem)}
            </div>
          </div>
        )}
        {filtered.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            검색 결과가 없어요
          </div>
        )}
      </div>

      {selected && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: 14, background: '#f8fafc' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>선택한 상품</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: selected.badgeBg, color: selected.badgeColor, padding: '1px 6px', borderRadius: 99 }}>{selected.type}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{selected.name}</span>
            {selected.recommended && <span style={{ fontSize: 11 }}>⭐</span>}
          </div>
          <p style={{ fontSize: 11, color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>{selected.description}</p>
          <button
            onClick={() => onPick(selected)}
            style={{
              width: '100%', padding: '11px 0', fontSize: 13, fontWeight: 700,
              background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
            }}
          >
            {mode === 'add' ? '이 상품 추가하기' : '이 상품으로 변경'}
          </button>
        </div>
      )}
    </ModalShell>
  );
}
