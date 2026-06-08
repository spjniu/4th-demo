import { useEffect, useState, useRef, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { withdrawAccount } from '../api/userApi';
import { getDashboard, type DashboardData } from '../api/dashboardApi';
import SalaryManagement from './SalaryManagement';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notificationApi';
import { getAssets, deleteAsset, type Asset } from '../api/assetApi';
import { fetchProposal, applyProposal, type Proposal } from '../api/poriApi';
import { getChallengeAlarmDetail, type ChallengeAlarmDetail } from '../api/challengeApi';
import ChallengeAlarmModal from '../components/ChallengeAlarmModal';
import portiImg from '../assets/porti.png';
import {
  buildSalarySlices,
  buildSpendingItems,
  buildPortfolioSlices,
  computeConsumption,
  computeMission,
} from '../components/dashboard/shared';
import WeatherAssetWidget from '../components/dashboard/WeatherAssetWidget';
import { ConsumptionWidget, ConsumptionDetail } from '../components/dashboard/ConsumptionWidget';
import SalaryGuideWidget from '../components/dashboard/SalaryGuideWidget';
import MissionWidget from '../components/dashboard/MissionWidget';
import { InvestmentWidget, InvestmentDetail } from '../components/dashboard/InvestmentWidget';
import { TaxSavingWidget, TaxSavingDetail } from '../components/dashboard/TaxSavingWidget';


interface Goal {
  id: number | string;
  icon: string;
  label: string;
  target: string;
  progress: number;
  dday: number;
  color: { bg: string; bar: string; text: string; badge: string; badgeText: string };
}

interface NotiItem { id: string; type: string; icon: string; iconBg: string; title: string; body: string; time: string; read: boolean; }

const GOAL_COLORS: Goal['color'][] = [
  { bg: '#EEEDFE', bar: '#7F77DD', text: '#534AB7', badge: '#EEEDFE', badgeText: '#534AB7' },
  { bg: '#E1F5EE', bar: '#1D9E75', text: '#0F6E56', badge: '#E1F5EE', badgeText: '#0F6E56' },
  { bg: '#FAEEDA', bar: '#EF9F27', text: '#854F0B', badge: '#FAEEDA', badgeText: '#854F0B' },
  { bg: '#FCEBEB', bar: '#E24B4A', text: '#A32D2D', badge: '#FCEBEB', badgeText: '#A32D2D' },
];

function pickGoalIcon(text: string): string {
  if (/여행|해외|비행|유럽|제주|일본/.test(text)) return '✈';
  if (/집|주택|전세|매매|부동산/.test(text)) return '🏠';
  if (/차|자동차/.test(text)) return '🚗';
  if (/결혼|웨딩/.test(text)) return '💍';
  if (/공부|학위|자격증|교육/.test(text)) return '📚';
  return '🎯';
}


// ─── 알림 패널 ───

// ─── 내 계좌 연결 관리 ────────────────────────────

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

function AccountManagePanel({ onClose, onAddInstitution }: { onClose: () => void; onAddInstitution: () => void }) {
  const [banks, setBanks] = useState<LinkedBank[]>([]);
  const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});
  const [removing, setRemoving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{ bankId: string; accountId: string; accountName: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getAssets()
      .then(assets => setBanks(assetsToLinkedBanks(assets)))
      .catch(() => { });
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
      {/* 헤더 */}
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

      {/* 은행 아코디언 리스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 12px 8px' }}>
        {banks.map(bank => {
          const expanded = !!expandedBanks[bank.id];
          return (
            <div key={bank.id} style={{ border: '0.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
              {/* 은행 헤더 */}
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

              {/* 계좌 목록 */}
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

      {/* 푸터: 추가 연동 */}
      <div style={{ padding: '12px 16px 20px', borderTop: '0.5px solid #e2e8f0' }}>
        <button
          onClick={onAddInstitution}
          style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 700, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
        >
          + 새 기관 연동하기
        </button>
      </div>

      {/* 해제 확인 다이얼로그 */}
      {pendingRemove && (
        <div
          onClick={() => { if (!removing) setPendingRemove(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 28, animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 18, width: '100%', maxWidth: 290,
              padding: '22px 20px 16px', boxShadow: '0 12px 44px rgba(0,0,0,0.22)',
              animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>🔗</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>계좌 연결 해제</div>
            <div style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', lineHeight: 1.5, marginBottom: 18 }}>
              <b style={{ color: '#0f172a' }}>{pendingRemove.accountName}</b> 계좌의<br />연결을 해제할까요?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPendingRemove(null)}
                disabled={removing}
                style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#475569', background: '#f1f5f9', border: 'none', borderRadius: 11, cursor: removing ? 'default' : 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={confirmRemove}
                disabled={removing}
                style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 11, cursor: removing ? 'default' : 'pointer', opacity: removing ? 0.6 : 1 }}
              >
                {removing ? '해제 중…' : '해제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 해제 실패 안내 다이얼로그 */}
      {errorMsg && (
        <div
          onClick={() => setErrorMsg(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 28, animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 18, width: '100%', maxWidth: 290,
              padding: '22px 20px 16px', boxShadow: '0 12px 44px rgba(0,0,0,0.22)',
              animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>해제할 수 없어요</div>
            <div style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', lineHeight: 1.5, marginBottom: 18 }}>
              {errorMsg}
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              style={{ width: '100%', padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#0f172a', border: 'none', borderRadius: 11, cursor: 'pointer' }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CHALLENGE_TYPES = new Set(['CHALLENGE_NAG', 'CHALLENGE_COMPLETE', 'CHALLENGE_FAILED']);

function NotificationPanel({ onClose, items, setItems, onChallengeClick, userName }: {
  onClose: () => void;
  items: NotiItem[];
  setItems: Dispatch<SetStateAction<NotiItem[]>>;
  onChallengeClick: (id: string, type: string) => void;
  userName: string;
}) {
  const markRead = (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    markNotificationRead(id).catch(() => { });
  };
  const markAll = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    markAllNotificationsRead().catch(() => { });
  };
  const unreadCount = items.filter(n => !n.read).length;

  return (
    <div style={{
      background: '#fff', borderRadius: '20px 20px 0 0',
      display: 'flex', flexDirection: 'column',
      maxWidth: 375, width: '100%', maxHeight: '85vh',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <span style={{ fontSize: 17, fontWeight: 500, color: '#0f172a' }}>알림</span>
          {unreadCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 500, background: '#E6F1FB', color: '#185FA5', padding: '1px 7px', borderRadius: 99 }}>{unreadCount}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {unreadCount > 0 && (
            <button onClick={markAll} style={{ fontSize: 12, fontWeight: 500, color: '#64748b', border: 'none', background: 'none', cursor: 'pointer' }}>모두 읽음</button>
          )}
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }} aria-label="닫기">✕</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '8px 12px 20px', overflowY: 'auto' }}>
        {items.map(n => (
          <div key={n.id} onClick={() => {
            markRead(n.id);
            if (CHALLENGE_TYPES.has(n.type)) onChallengeClick(n.id, n.type);
          }}
            style={{
              background: '#fff', border: '0.5px solid #f1f5f9', borderRadius: 14, padding: 14,
              display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
              opacity: n.read ? 0.5 : 1, transition: 'opacity .15s',
            }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: n.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
              {n.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, color: n.read ? '#64748b' : '#0f172a', margin: '0 0 4px', lineHeight: 1.35 }}>{n.title}</p>
              <p style={{ fontSize: 12, color: n.read ? '#94a3b8' : '#64748b', margin: 0, lineHeight: 1.55 }}>{n.body}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{n.time}</span>
              {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#378ADD', display: 'block' }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ─── 메인 대시보드 ───

export default function Dashboard() {
  const { userName: USER_NAME, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleWithdraw = async () => {
    if (window.confirm('정말로 회원 탈퇴를 하시겠습니까?\n탈퇴 시 모든 자산 정보 및 설정이 영구 삭제되며 복구할 수 없습니다.')) {
      try {
        await withdrawAccount();
        alert('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
        logout();
        navigate('/login');
      } catch (err) {
        alert(err instanceof Error ? err.message : '회원 탈퇴 처리 중 오류가 발생했습니다.');
      }
    }
  };

  // 알림 타입 → 아이콘/색상 매핑
  function notiTypeToIcon(type: string): { icon: string; iconBg: string } {
    const map: Record<string, { icon: string; iconBg: string }> = {
      SALARY_REBALANCING: { icon: '💳', iconBg: '#E6F1FB' },
      SPENDING_TREND: { icon: '📉', iconBg: '#FCEBEB' },
      REPORT_READY: { icon: '📋', iconBg: '#E1F5EE' },
      CHALLENGE_NAG: { icon: '⚡', iconBg: '#FEF9C3' },
      CHALLENGE_COMPLETE: { icon: '🏆', iconBg: '#E1F5EE' },
      CHALLENGE_FAILED: { icon: '😢', iconBg: '#FCEBEB' },
    };
    return map[type] ?? { icon: '🔔', iconBg: '#F1F5F9' };
  }

  function formatRelativeTime(createdAt: string): string {
    const diff = Date.now() - new Date(createdAt).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '방금 전';
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    return `${Math.floor(hr / 24)}일 전`;
  }

  // ── 대시보드 API 상태 ────────────────────────────────────
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    getDashboard()
      .then(d => { if (!cancelled) setDashboard(d); })
      .catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : '대시보드 조회 실패'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    getNotifications()
      .then(notifications => {
        const fetched = (notifications ?? []).map(n => {
          const { icon, iconBg } = notiTypeToIcon(n.type);
          return { id: n.id, type: n.type, icon, iconBg, title: n.title, body: n.content, time: formatRelativeTime(n.sentAt), read: n.isRead };
        });
        setNotiItems(prev => [...fetched, ...prev.filter(n => n.id.startsWith('dev-'))]);
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── UI 상태 ──────────────────────────────────────────────
  const [anomalyOpen, setAnomalyOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [portfolioDetailOpen, setPortfolioDetailOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const DEV_NOTI_ITEMS: NotiItem[] = [
    { id: 'dev-salary', type: 'SALARY_REBALANCING', icon: '💳', iconBg: '#E6F1FB', title: '월급', body: '급여가 들어왔어요 - PorTI의 월급 가이드를 확인하고 편하게 분배해봐요!', time: '방금 전', read: false },
    { id: 'dev-nag-50', type: 'CHALLENGE_NAG', icon: '⚡', iconBg: '#FEF9C3', title: '이번주 소비 미션', body: '50% 도달했어요ㅜㅡㅜ', time: '1시간 전', read: false },
    { id: 'dev-nag-80', type: 'CHALLENGE_NAG', icon: '⚡', iconBg: '#FEF9C3', title: '이번주 소비 미션', body: '80% 도달했어요..!', time: '2시간 전', read: false },
    { id: 'dev-nag-90', type: 'CHALLENGE_NAG', icon: '⚡', iconBg: '#FEF9C3', title: '이번주 소비 미션', body: '90% 도달했어요!!!', time: '3시간 전', read: false },
    { id: 'dev-complete', type: 'CHALLENGE_COMPLETE', icon: '🏆', iconBg: '#E1F5EE', title: '이번주 소비 미션', body: '뿌우~축하해요 성공했어요', time: '5시간 전', read: false },
    { id: 'dev-failed', type: 'CHALLENGE_FAILED', icon: '😢', iconBg: '#FCEBEB', title: '이번주 소비 미션', body: '뿌우,,,아쉽게 실패했어요', time: '1일 전', read: false },
    { id: 'dev-report', type: 'REPORT_READY', icon: '📋', iconBg: '#E1F5EE', title: '월간리포트', body: `${USER_NAME}님의 월간리포트가 도착했어요 - 2026년 5월의 소비·투자를 종합 분석했어요!`, time: '2일 전', read: false },
  ];
  const [notiItems, setNotiItems] = useState<NotiItem[]>(DEV_NOTI_ITEMS);
  const [accountMgmtOpen, setAccountMgmtOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salaryMgmtOpen, setSalaryMgmtOpen] = useState(false);
  const [peerTab, setPeerTab] = useState<'asset' | 'product'>('asset');
  const [goals, setGoals] = useState<Goal[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('user:goals') ?? '[]'); } catch { return []; }
  });
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [challengeProgress, setChallengeProgress] = useState<number>(() => {
    try { return parseInt(sessionStorage.getItem(`challenge:progress:${new Date().getMonth()}`) ?? '0', 10); }
    catch { return 0; }
  });
  const [challengeAlarmOpen, setChallengeAlarmOpen] = useState(false);
  const [challengeAlarmDetail, setChallengeAlarmDetail] = useState<ChallengeAlarmDetail | null>(null);

  // ── SSE 구독 ─────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const es = new EventSource(
      `http://localhost:8080/api/v1/notifications/subscribe?token=${token}`
    );

    es.addEventListener('notification', async (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as {
        id: string; type: string; title: string; content: string; sentAt: string;
      };

      const { icon, iconBg } = notiTypeToIcon(payload.type);
      setNotiItems(prev => [{
        id: payload.id, type: payload.type, icon, iconBg,
        title: payload.title, body: payload.content,
        time: formatRelativeTime(payload.sentAt), read: false,
      }, ...prev]);

      const challengeTypeMap: Record<string, 'ACTIVE' | 'SUCCESS' | 'FAILED'> = {
        CHALLENGE_NAG: 'ACTIVE',
        CHALLENGE_COMPLETE: 'SUCCESS',
        CHALLENGE_FAILED: 'FAILED',
      };

      if (payload.type in challengeTypeMap) {
        try {
          const detail = await getChallengeAlarmDetail(payload.id);
          setChallengeAlarmDetail({ ...detail, weeklyStatus: challengeTypeMap[payload.type] });
          setChallengeAlarmOpen(true);
        } catch { /* ignore */ }
      }
    });

    es.onerror = () => es.close();

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pori ─────────────────────────────────────────────────
  type PoriStep = 'input' | 'loading' | 'preview' | 'applying' | 'done';
  const [poriOpen, setPoriOpen] = useState(false);
  const [poriStep, setPoriStep] = useState<PoriStep>('input');
  const [poriMessage, setPoriMessage] = useState('');
  const [poriProposal, setPoriProposal] = useState<Proposal | null>(null);
  const [poriError, setPoriError] = useState<string | null>(null);
  const poriInputRef = useRef<HTMLTextAreaElement>(null);

  // 대시보드 fetch 결과로 목표 카드 채우기 (events[0] 우선)
  useEffect(() => {
    if (!dashboard || dashboard.events.length === 0) return;
    const e = dashboard.events[0];
    setGoals([{
      id: e.id,
      icon: pickGoalIcon(e.title),
      label: e.title,
      target: `${e.currentAmount.toLocaleString()} / ${e.targetAmount.toLocaleString()}원`,
      progress: e.progressRate,
      dday: e.dday,
      color: GOAL_COLORS[0],
    }]);
  }, [dashboard]);

  // ── 위젯 표시용 파생 데이터 (API → props 매핑) ──────────
  // 매핑/계산 로직은 components/dashboard/shared.ts 에 모아둠.
  const salarySlices = dashboard ? buildSalarySlices(dashboard.salaryPlan) : [];
  const spendingItems = dashboard ? buildSpendingItems(dashboard.consumption.categories) : [];
  const portfolioSlices = dashboard ? buildPortfolioSlices(dashboard.portfolio) : [];
  const consumptionView = dashboard ? computeConsumption(dashboard.consumption) : null;
  const mission = dashboard ? computeMission(dashboard.consumption.categories) : null;
  const taxSaving = dashboard?.taxSaving ?? null;

  const handleGoalSubmit = () => {
    const text = goalText.trim();
    if (!text) return;
    const newGoal: Goal = {
      id: Date.now(),
      icon: pickGoalIcon(text),
      label: text,
      target: '목표 설정 중',
      progress: 0,
      dday: 365,
      color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
    };
    const updated = [newGoal]; // 단일 목표
    setGoals(updated);
    sessionStorage.setItem('user:goals', JSON.stringify(updated));
    sessionStorage.setItem('user:goal', text);
    setGoalText('');
    setGoalModalOpen(false);
    navigate('/prescription-loading');
  };

  const unreadCount = notiItems.filter(n => !n.read).length;

  // ── 로딩 / 에러 화면 ────────────────────────────────────
  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#EFF8FF', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
        <p style={{ fontSize: 14, color: '#A32D2D', margin: 0 }}>{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >다시 시도</button>
      </div>
    );
  }
  if (!dashboard) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF8FF' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid #e2e8f0', borderTopColor: '#0095DB',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      background: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{
        maxWidth: 375,
        width: '100%',
        minHeight: '100vh',
        background: '#EFF8FF',
        position: 'relative',
        boxShadow: '0 0 24px rgba(0,0,0,0.05)',
        paddingBottom: 48,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ height: 8 }} />

        {/* 헤더 */}
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setSidebarOpen(true)} style={{ border: '1px solid #E0F2FE', background: '#FFFFFF', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0f172a', boxShadow: '0 2px 12px rgba(0,149,219,0.06)' }} aria-label="메뉴">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#534AB7' }}>
                {USER_NAME.charAt(0)}
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>좋은 아침이에요</p>
                <p style={{ fontSize: 15, fontWeight: 500, color: '#0f172a', margin: 0 }}>{USER_NAME} 님</p>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotiOpen(true)} style={{ border: '1px solid #E0F2FE', background: '#FFFFFF', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,149,219,0.06)' }} aria-label="알림">
                🔔
              </button>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: '#E24B4A', borderRadius: '50%', border: '1.5px solid #f8fafc' }} />
              )}
            </div>
          </div>

        </div>

        {/* 위젯 그리드 레이아웃 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '0 16px',
          marginBottom: 16
        }}>
          {/* [1] 자산 날씨 위젯 */}
          <div style={{ gridColumn: '1 / -1' }}>
            <WeatherAssetWidget dashboard={dashboard} />
          </div>

          {/* [2] 소비 위젯 */}
          <div style={{ gridColumn: '1' }}>
            <ConsumptionWidget
              view={consumptionView!}
              active={recapOpen}
              onClick={() => setRecapOpen(v => !v)}
            />
          </div>

          {/* [3] 월급 가이드 위젯 */}
          <div style={{ gridColumn: '2' }}>
            <SalaryGuideWidget
              income={dashboard.salaryPlan.monthlyIncome}
              slices={salarySlices}
              onClick={() => setSalaryMgmtOpen(true)}
            />
          </div>

          {/* 소비 펼침 영역 (recapOpen) */}
          {recapOpen && (
            <div style={{ gridColumn: '1 / -1' }}>
              <ConsumptionDetail
                spendingItems={spendingItems}
                categories={dashboard.consumption.categories}
              />
            </div>
          )}

          {/* [4] 미션 위젯 */}
          <div style={{ gridColumn: '1 / -1' }}>
            {mission && (
              <MissionWidget
                mission={mission}
                progress={challengeProgress}
                onStart={() => {
                  setChallengeProgress(1);
                  sessionStorage.setItem(`challenge:progress:${new Date().getMonth()}`, '1');
                }}
                onPause={() => {
                  setChallengeProgress(0);
                  sessionStorage.setItem(`challenge:progress:${new Date().getMonth()}`, '0');
                }}
              />
            )}
          </div>

          {/* [5] 투자 위젯 */}
          <div style={{ gridColumn: '1' }}>
            <InvestmentWidget
              investAmt={dashboard.assetsSummary.investmentBalance}
              portfolioItems={dashboard.portfolio.slice(0, 3)}
              active={portfolioDetailOpen}
              onClick={() => setPortfolioDetailOpen(v => !v)}
            />
          </div>

          {/* [6] 절세 위젯 */}
          <div style={{ gridColumn: '2' }}>
            <TaxSavingWidget
              taxDeduction={taxSaving!.totalTaxDeduction}
              active={anomalyOpen}
              onClick={() => setAnomalyOpen(v => !v)}
            />
          </div>

          {/* 투자 펼침 영역 (portfolioDetailOpen) */}
          {portfolioDetailOpen && (
            <div style={{ gridColumn: '1 / -1' }}>
              <InvestmentDetail portfolioSlices={portfolioSlices} portfolio={dashboard.portfolio} />
            </div>
          )}

          {/* 절세 펼침 영역 (anomalyOpen) */}
          {anomalyOpen && taxSaving && (
            <div style={{ gridColumn: '1 / -1' }}>
              <TaxSavingDetail view={taxSaving} />
            </div>
          )}
        </div>



      </div>

      {/* 목표 추가 모달 */}
      {goalModalOpen && (
        <div
          onClick={() => setGoalModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 375, background: '#fff',
              borderRadius: '20px 20px 0 0', padding: '20px 20px 36px',
              animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>새 목표 추가</span>
              <button onClick={() => setGoalModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>어떤 목표를 이루고 싶으세요?</p>
            <input
              value={goalText}
              onChange={e => setGoalText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleGoalSubmit(); }}
              placeholder="예: 내년 5월에 유럽 여행 가고 싶어요"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 12,
                fontSize: 14, padding: '12px 14px',
                border: '1px solid #e2e8f0', borderRadius: 12,
                background: '#EFF8FF', color: '#0f172a', outline: 'none',
              }}
            />
            <button
              onClick={handleGoalSubmit}
              disabled={!goalText.trim()}
              style={{
                width: '100%', padding: '14px 0', fontSize: 14, fontWeight: 700,
                background: goalText.trim() ? '#0f172a' : '#cbd5e1',
                color: '#fff', border: 'none', borderRadius: 12,
                cursor: goalText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Pori가 목표 설정해드릴게요 →
            </button>
          </div>
        </div>
      )}

      {/* 사이드바 */}
      {sidebarOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 999,
          display: 'flex', animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            width: '80%', maxWidth: 300, background: '#fff', height: '100%',
            display: 'flex', flexDirection: 'column',
            animation: 'slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{ padding: '20px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: 0 }}>전체 메뉴</h2>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }} aria-label="닫기">✕</button>
            </div>

            <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 24px' }}>
              {[
                {
                  label: '초기 설정',
                  items: [
                    { id: 'account', title: '계좌 연결 관리', disabled: false, onClick: () => { setSidebarOpen(false); setAccountMgmtOpen(true); } },
                    { id: 'salary', title: '급여 통장 변경', disabled: false, onClick: () => { setSidebarOpen(false); setSalaryMgmtOpen(true); } },
                  ],
                },
                {
                  label: 'PorTI',
                  items: [
                    { id: 'interest', title: '관심사 재설정', disabled: false, onClick: () => { setSidebarOpen(false); navigate('/porti-survey', { state: { mode: 'editGoal' } }); } },
                    { id: 'portrait', title: 'AI 자산 초상화', disabled: false, onClick: () => { if (!localStorage.getItem('agentProfile')) { alert('아직 AI 자산 초상화가 없어요. 먼저 PorTI 진단을 완료해주세요.'); return; } setSidebarOpen(false); navigate('/porti-survey', { state: { mode: 'viewProfile' } }); } },
                  ],
                },
                {
                  label: '자산 관리',
                  items: [
                    { id: 'report', title: '월간리포트 조회', disabled: false, onClick: () => { setSidebarOpen(false); navigate('/monthly-report'); } },
                    { id: 'salary-split', title: '월급 분배 수정', disabled: false, onClick: () => { setSidebarOpen(false); navigate('/prescription-loading'); } },
                    { id: 'invest-split', title: '투자 분배 수정', disabled: false, onClick: () => { setSidebarOpen(false); navigate('/asset-portfolio'); } },
                  ],
                },
              ].map(section => (
                <div key={section.label} style={{ marginBottom: 26 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 14, paddingLeft: 2 }}>
                    [{section.label}]
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingLeft: 6 }}>
                    {section.items.map(item => (
                      <button
                        key={item.id}
                        onClick={item.onClick}
                        disabled={item.disabled}
                        style={{
                          fontSize: 15, fontWeight: 500, textAlign: 'left',
                          color: item.disabled ? '#cbd5e1' : '#0f172a',
                          cursor: item.disabled ? 'default' : 'pointer',
                          background: 'none', border: 'none', padding: 0,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        {item.title}
                        {item.disabled && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: 99 }}>준비 중</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '20px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16, flexShrink: 0 }}>
              <button
                onClick={handleLogout}
                style={{ fontSize: 13, color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                로그아웃
              </button>
              <button
                onClick={handleWithdraw}
                style={{ fontSize: 13, color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                회원탈퇴
              </button>
            </div>
          </div>

          <div style={{ flex: 1 }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* 알림 패널 */}
      {notiOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{ width: '100%', maxWidth: 375, display: 'flex', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
            <NotificationPanel
              onClose={() => setNotiOpen(false)}
              items={notiItems}
              setItems={setNotiItems}
              userName={USER_NAME}
              onChallengeClick={async (id, type) => {
                const challengeTypeMap: Record<string, 'ACTIVE' | 'SUCCESS' | 'FAILED'> = {
                  CHALLENGE_NAG: 'ACTIVE',
                  CHALLENGE_COMPLETE: 'SUCCESS',
                  CHALLENGE_FAILED: 'FAILED',
                };
                const detail = await getChallengeAlarmDetail(id);
                setChallengeAlarmDetail({ ...detail, weeklyStatus: challengeTypeMap[type] });
                setNotiOpen(false);
                setChallengeAlarmOpen(true);
              }}
            />
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '85vh', zIndex: -1 }} onClick={() => setNotiOpen(false)} />
        </div>
      )}

      {/* 내 계좌 연결 관리 패널 */}
      {accountMgmtOpen && (
        <div
          onClick={() => setAccountMgmtOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ width: '100%', maxWidth: 375, display: 'flex', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
            <AccountManagePanel
              onClose={() => setAccountMgmtOpen(false)}
              onAddInstitution={() => { setAccountMgmtOpen(false); navigate('/linking', { state: { returnTo: '/dashboard' } }); }}
            />
          </div>
        </div>
      )}

      {/* 월급 관리 모달 */}
      {salaryMgmtOpen && (
        <SalaryManagement onClose={() => setSalaryMgmtOpen(false)} />
      )}

      {/* ── Pori 플로팅 버튼 (프로젝트 영역 우하단) ── */}
      {!poriOpen && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: 375,
          pointerEvents: 'none', zIndex: 400,
        }}>
          <button
            onClick={() => { setPoriOpen(true); setPoriStep('input'); setPoriMessage(''); setPoriProposal(null); setPoriError(null); }}
            style={{
              position: 'absolute', bottom: 28, right: 20,
              pointerEvents: 'auto',
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0095DB, #00BFFF)',
              border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,149,219,0.35)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            aria-label="Pori AI 열기"
          >
            <img src={portiImg} alt="Pori" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          </button>
        </div>
      )}

      {/* ── Pori 모달 ── */}
      {poriOpen && (
        <div
          onClick={() => { if (poriStep === 'input') { setPoriOpen(false); } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            alignItems: 'center',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 375,
              background: '#fff', borderRadius: '20px 20px 0 0',
              padding: '20px 16px 36px',
              maxHeight: '82vh', overflowY: 'auto',
              animation: 'slideUp 0.25s ease-out',
            }}
          >
            {/* 핸들 */}
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 18px' }} />

            {/* ── step: input ── */}
            {poriStep === 'input' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 28 }}>🐥</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Pori에게 물어보세요</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>재무 목표를 자연어로 입력하면 대시보드를 조정해 드려요</p>
                  </div>
                </div>
                <div style={{ background: '#EFF8FF', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
                  {['내년 봄에 유럽 여행 가고 싶어 🌍', '2년 뒤까지 결혼자금 3000만원 모으고 싶어 💍', '매달 투자 비중 늘리고 싶어 📈'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => setPoriMessage(ex)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '6px 4px', fontSize: 12, color: '#475569', cursor: 'pointer', borderRadius: 6 }}
                    >{ex}</button>
                  ))}
                </div>
                <textarea
                  ref={poriInputRef}
                  value={poriMessage}
                  onChange={e => setPoriMessage(e.target.value)}
                  placeholder="예: 6개월 안에 노트북 살 돈 모으고 싶어"
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1px solid #e2e8f0', borderRadius: 10,
                    padding: '10px 12px', fontSize: 13, color: '#0f172a',
                    resize: 'none', outline: 'none', marginBottom: 12,
                    fontFamily: 'inherit',
                  }}
                />
                {poriError && <p style={{ fontSize: 11, color: '#A32D2D', marginBottom: 8 }}>{poriError}</p>}
                <button
                  disabled={!poriMessage.trim()}
                  onClick={async () => {
                    if (!dashboard) return;
                    setPoriStep('loading');
                    setPoriError(null);
                    try {
                      const proposal = await fetchProposal(poriMessage, dashboard);
                      setPoriProposal(proposal);
                      setPoriStep('preview');
                    } catch (e) {
                      setPoriError(e instanceof Error ? e.message : 'AI 서버 오류');
                      setPoriStep('input');
                    }
                  }}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                    background: poriMessage.trim() ? 'linear-gradient(135deg, #1D9E75, #085041)' : '#e2e8f0',
                    color: poriMessage.trim() ? '#fff' : '#94a3b8',
                    fontSize: 14, fontWeight: 700, cursor: poriMessage.trim() ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                  }}
                >Pori에게 보내기 →</button>
              </>
            )}

            {/* ── step: loading ── */}
            {poriStep === 'loading' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🐥</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>분석 중이에요...</p>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>현재 재무 상태를 보고 최적 플랜을 찾고 있어요</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#1D9E75',
                      animation: `bounce 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
              </div>
            )}

            {/* ── step: preview ── */}
            {poriStep === 'preview' && poriProposal && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 22 }}>🐥</span>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Pori의 제안</p>
                </div>
                <p style={{ fontSize: 12, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>{poriProposal.explanation}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {poriProposal.changes.events.map((ev, i) => (
                    <div key={i} style={{ background: '#E1F5EE', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, color: '#0F6E56', fontWeight: 600, margin: '0 0 3px' }}>🎯 목표 추가</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>{ev.title}</p>
                      <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                        목표금액 {parseInt(ev.targetAmount).toLocaleString()}원 · 마감 {ev.deadline}
                      </p>
                    </div>
                  ))}
                  {poriProposal.changes.salaryAllocations.map((al, i) => (
                    <div key={i} style={{ background: '#EEF2FF', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, color: '#4338CA', fontWeight: 600, margin: '0 0 3px' }}>💸 월 배분 변경</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                        {al.purpose} &nbsp;+{al.plannedAmount.toLocaleString()}원/월
                      </p>
                    </div>
                  ))}
                  {poriProposal.changes.portfolio.map((pt, i) => (
                    <div key={i} style={{ background: '#FEF9EC', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, color: '#854F0B', fontWeight: 600, margin: '0 0 3px' }}>📊 포트폴리오 조정</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                        {pt.assetType} → {pt.assetAmount.toLocaleString()}원/월
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setPoriOpen(false)}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
                  >거절</button>
                  <button
                    onClick={async () => {
                      setPoriStep('applying');
                      try {
                        await applyProposal(poriProposal);
                        setPoriStep('done');
                        const fresh = await getDashboard();
                        setDashboard(fresh);
                      } catch (e) {
                        setPoriError(e instanceof Error ? e.message : '적용 실패');
                        setPoriStep('preview');
                      }
                    }}
                    style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #085041)', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                  >✓ 승인하기</button>
                </div>
                {poriError && <p style={{ fontSize: 11, color: '#A32D2D', marginTop: 8, textAlign: 'center' }}>{poriError}</p>}
              </>
            )}

            {/* ── step: applying ── */}
            {poriStep === 'applying' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🐥</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>대시보드 업데이트 중...</p>
              </div>
            )}

            {/* ── step: done ── */}
            {poriStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>적용 완료!</p>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>대시보드가 업데이트 되었어요</p>
                <button
                  onClick={() => setPoriOpen(false)}
                  style={{ padding: '10px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #085041)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >닫기</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 챌린지 알람 모달 ── */}
      {challengeAlarmOpen && challengeAlarmDetail && (
        <ChallengeAlarmModal
          detail={challengeAlarmDetail}
          userName={USER_NAME ?? '사용자'}
          onClose={() => setChallengeAlarmOpen(false)}
        />
      )}

    </div>
  );
}
