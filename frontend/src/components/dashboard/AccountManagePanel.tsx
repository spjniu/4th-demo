import { useState, useEffect } from 'react';
import { deleteAsset, getAssets, type Asset } from '../../api/assetApi';

interface LinkedAccount {
  id: string;
  name: string;
  number: string;
  type: '입출금' | '예·적금' | '증권' | '카드';
  balance: number;
}

interface LinkedBank {
  id: string;
  name: string;
  short: string;
  badgeBg: string;
  badgeColor: string;
  accounts: LinkedAccount[];
}

const BANK_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  '우리은행': { bg: '#DBEAFE', color: '#1E40AF' },
  '카카오뱅크': { bg: '#FEF3C7', color: '#854D0E' },
  '토스뱅크': { bg: '#DBEAFE', color: '#1D4ED8' },
  '신한은행': { bg: '#DBEAFE', color: '#1E40AF' },
  '국민은행': { bg: '#FEF3C7', color: '#92400E' },
  '하나은행': { bg: '#D1FAE5', color: '#065F46' },
  '미래에셋증권': { bg: '#FFEDD5', color: '#9A3412' },
};

function assetTypeToLabel(type: string): '입출금' | '예·적금' | '증권' | '카드' {
  if (['CHECKING', 'PARKING', 'CMA'].includes(type)) return '입출금';
  if (['SAVINGS', 'DEPOSIT'].includes(type)) return '예·적금';
  if (['STOCK', 'IRP', 'ISA'].includes(type)) return '증권';
  return '카드';
}

function assetsToLinkedBanks(assets: Asset[]): LinkedBank[] {
  const map = new Map<string, LinkedBank>();
  assets
    .filter(a => a.assetType !== 'CREDIT_CARD' && a.assetType !== 'DEBIT_CARD')
    .forEach(a => {
      if (!map.has(a.institution)) {
        const badge = BANK_BADGE_COLORS[a.institution] ?? { bg: '#F1F5F9', color: '#475569' };
        map.set(a.institution, {
          id: a.institution,
          name: a.institution,
          short: a.institution.slice(0, 2),
          badgeBg: badge.bg,
          badgeColor: badge.color,
          accounts: [],
        });
      }
      map.get(a.institution)!.accounts.push({
        id: a.id,
        name: a.accountName,
        number: a.assetNumber,
        type: assetTypeToLabel(a.assetType),
        balance: a.balance,
      });
    });
  return Array.from(map.values());
}

interface AccountManagePanelProps {
  onClose: () => void;
  onAddInstitution: () => void;
}

export default function AccountManagePanel({ onClose, onAddInstitution }: AccountManagePanelProps) {
  const [banks, setBanks] = useState<LinkedBank[]>([]);
  const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});
  const [removing, setRemoving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{ bankId: string; accountId: string; accountName: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getAssets()
      .then(assets => setBanks(assetsToLinkedBanks(assets)))
      .catch(() => {});
  }, []);

  const toggleBank = (id: string) =>
    setExpandedBanks(prev => ({ ...prev, [id]: !prev[id] }));

  const totalAccounts = banks.reduce((sum, b) => sum + b.accounts.length, 0);

  const confirmRemove = async () => {
    if (!pendingRemove || removing) return;
    const { bankId, accountId } = pendingRemove;
    setRemoving(true);
    try {
      await deleteAsset(accountId);
      setBanks(prev => prev
        .map(b => b.id === bankId ? { ...b, accounts: b.accounts.filter(a => a.id !== accountId) } : b)
        .filter(b => b.accounts.length > 0));
      setPendingRemove(null);
    } catch (e) {
      setPendingRemove(null);
      setErrorMsg(e instanceof Error ? e.message : '계좌 해제 중 오류가 발생했습니다.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{
      background: '#fff', borderRadius: '20px 20px 0 0',
      maxWidth: 375, width: '100%', maxHeight: '85vh',
      overflowY: 'auto',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🔗</span>
          <span style={{ fontSize: 17, fontWeight: 500, color: '#0f172a' }}>내 계좌 연결 관리</span>
          <span style={{ fontSize: 11, fontWeight: 500, background: '#E6F1FB', color: '#185FA5', padding: '1px 7px', borderRadius: 99 }}>
            {banks.length}개 기관 · {totalAccounts}개 계좌
          </span>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }} aria-label="닫기">✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 12px 8px' }}>
        {banks.map(bank => {
          const expanded = !!expandedBanks[bank.id];
          return (
            <div key={bank.id} style={{ border: '0.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
              <button
                onClick={() => toggleBank(bank.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: bank.badgeBg, color: bank.badgeColor, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {bank.short}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{bank.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{bank.accounts.length}개 계좌 연결</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {expanded && (
                <div style={{ borderTop: '0.5px solid #f1f5f9', background: '#EFF8FF' }}>
                  {bank.accounts.map(acc => (
                    <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px 10px 60px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, background: '#fff', color: '#475569', padding: '1px 6px', borderRadius: 99, border: '0.5px solid #e2e8f0' }}>{acc.type}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{acc.name}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{acc.number}</div>
                        <div style={{ fontSize: 11, color: '#0f172a', marginTop: 2, fontWeight: 600 }}>{acc.balance.toLocaleString()}원</div>
                      </div>
                      <button
                        onClick={() => setPendingRemove({ bankId: bank.id, accountId: acc.id, accountName: acc.name })}
                        style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', background: '#fff', border: '0.5px solid #fecaca', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', flexShrink: 0 }}
                      >
                        해제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {banks.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            연결된 계좌가 없어요.<br />아래 버튼으로 새 기관을 연동해보세요.
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px 20px', borderTop: '0.5px solid #e2e8f0' }}>
        <button
          onClick={onAddInstitution}
          style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 700, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
        >
          + 새 기관 연동하기
        </button>
      </div>

      {pendingRemove && (
        <div
          onClick={() => { if (!removing) setPendingRemove(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, animation: 'fadeIn 0.15s ease-out' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 290, padding: '22px 20px 16px', boxShadow: '0 12px 44px rgba(0,0,0,0.22)', animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>🔗</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>계좌 연결 해제</div>
            <div style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', lineHeight: 1.5, marginBottom: 18 }}>
              <b style={{ color: '#0f172a' }}>{pendingRemove.accountName}</b> 계좌의<br />연결을 해제할까요?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPendingRemove(null)} disabled={removing} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#475569', background: '#f1f5f9', border: 'none', borderRadius: 11, cursor: removing ? 'default' : 'pointer' }}>취소</button>
              <button onClick={confirmRemove} disabled={removing} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 11, cursor: removing ? 'default' : 'pointer', opacity: removing ? 0.6 : 1 }}>
                {removing ? '해제 중…' : '해제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          onClick={() => setErrorMsg(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, animation: 'fadeIn 0.15s ease-out' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 290, padding: '22px 20px 16px', boxShadow: '0 12px 44px rgba(0,0,0,0.22)', animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>해제할 수 없어요</div>
            <div style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', lineHeight: 1.5, marginBottom: 18 }}>{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} style={{ width: '100%', padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#0f172a', border: 'none', borderRadius: 11, cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
}
