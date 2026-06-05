import { useEffect, useState, useRef, type CSSProperties, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { withdrawAccount } from '../api/userApi';
import { getDashboard, type DashboardData } from '../api/dashboardApi';
import SalaryManagement from './SalaryManagement';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notificationApi';
import { getAssets, type Asset } from '../api/assetApi';
import { analyzeGoal, proposeReset, applyReset, type AnalyzeResponse, type ProposeResponse } from '../api/consultantApi';
import { getChallengeAlarmDetail, type ChallengeAlarmDetail } from '../api/challengeApi';
import ChallengeAlarmModal from '../components/ChallengeAlarmModal';
import portiImg from '../assets/porti.png';
import sunnyImg from '../assets/sunny.png';
import rainImg from '../assets/rain.jpg';
import cloudyImg from '../assets/cloudy.png';
import tornadoImg from '../assets/tornado .png';


interface Goal {
  id: number | string;
  icon: string;
  label: string;
  target: string;
  progress: number;
  dday: number;
  color: { bg: string; bar: string; text: string; badge: string; badgeText: string };
}

interface SpendingItem { label: string; pct: number; color: string; }
interface PopularProduct { rank: number; name: string; sub: string; pct: number; }
interface PortfolioSlice { label: string; pct: number; color: string; rate?: string; }
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

// (하드) 또래비교 인기상품 — API 미제공
const POPULAR_PRODUCTS: PopularProduct[] = [
  { rank: 1, name: 'TIGER 미국S&P500', sub: 'ETF · 가입률 68%', pct: 68 },
  { rank: 2, name: '우리은행 정기적금', sub: '적금 · 가입률 54%', pct: 54 },
  { rank: 3, name: '토스뱅크 파킹통장', sub: '파킹 · 가입률 47%', pct: 47 },
];

const DONUT_R = 28;
const CIRC = 2 * Math.PI * DONUT_R;

function DonutChart({ data }: { data: PortfolioSlice[] }) {
  let offset = 0;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
      {data.map((d, i) => {
        const dash = (d.pct / 100) * CIRC;
        const el = (
          <circle key={i} cx="40" cy="40" r={DONUT_R} fill="none" stroke={d.color} strokeWidth="14" strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={-offset} />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

function pctToXY(cx: number, cy: number, r: number, pct: number) {
  const rad = (pct / 100) * 2 * Math.PI - Math.PI / 2;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function SalaryDonutChart({ data, total, totalAmt, size = 128 }: {
  data: PortfolioSlice[];
  total: string;
  totalAmt: number;
  size?: number;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const cx = 64, cy = 64, outerR = 56, innerR = 36, midR = (outerR + innerR) / 2;

  let cum = 0;
  const segments = data.map((d) => {
    const start = cum;
    cum += d.pct;
    const o1 = pctToXY(cx, cy, outerR, start);
    const o2 = pctToXY(cx, cy, outerR, cum);
    const i2 = pctToXY(cx, cy, innerR, cum);
    const i1 = pctToXY(cx, cy, innerR, start);
    const large = d.pct > 50 ? 1 : 0;
    const path = `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y} Z`;
    const labelPos = pctToXY(cx, cy, midR, start + d.pct / 2);
    return { path, labelPos };
  });

  const active = activeIdx !== null ? data[activeIdx] : null;
  const fmtAmt = (n: number) => `${Math.round(n / 10000)}만`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 128 128">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={data[i].color}
            opacity={activeIdx === null || activeIdx === i ? 1 : 0.25}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
            style={{ cursor: 'default', transition: 'opacity 0.15s' }}
          />
        ))}
        {segments.map((seg, i) => (
          <text
            key={`l${i}`}
            x={seg.labelPos.x} y={seg.labelPos.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fontWeight={700} fill="white"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {data[i].pct}
          </text>
        ))}
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none', width: size * 0.6,
      }}>
        {active ? (
          <>
            <div style={{ fontSize: size < 100 ? 8 : 9, fontWeight: 700, color: active.color, lineHeight: 1.4 }}>{active.label}</div>
            <div style={{ fontSize: size < 100 ? 10 : 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{fmtAmt(totalAmt * active.pct / 100)}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: size < 100 ? 8 : 9, color: '#94a3b8', lineHeight: 1.4 }}>급여</div>
            <div style={{ fontSize: size < 100 ? 10 : 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{total}</div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, right }: { icon: string; title: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 0 0 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{title}</span>
      </div>
      {right}
    </div>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '14px 14px 12px', ...style }}>
      {children}
    </div>
  );
}

function Pill({ children, bg, color }: { children: ReactNode; bg: string; color: string }) {
  return <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 99, background: bg, color }}>{children}</span>;
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{ border: '0.5px solid #e2e8f0', background: 'none', borderRadius: 8, padding: '4px 9px', fontSize: 11, fontWeight: 500, color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}>
      {children}
    </button>
  );
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

function AccountManagePanel({ onClose }: { onClose: () => void }) {
  const [banks, setBanks] = useState<LinkedBank[]>([]);
  const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getAssets()
      .then(assets => setBanks(assetsToLinkedBanks(assets)))
      .catch(() => { });
  }, []);

  const toggleBank = (id: string) =>
    setExpandedBanks(prev => ({ ...prev, [id]: !prev[id] }));

  const totalAccounts = banks.reduce((sum, b) => sum + b.accounts.length, 0);

  const removeAccount = (bankId: string, accountId: string) => {
    setBanks(prev => prev
      .map(b => b.id === bankId ? { ...b, accounts: b.accounts.filter(a => a.id !== accountId) } : b)
      .filter(b => b.accounts.length > 0));
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
                        onClick={() => removeAccount(bank.id, acc.id)}
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
          onClick={() => { onClose(); /* 라우터 이동은 부모에서 처리 */ }}
          style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 700, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
        >
          + 새 기관 연동하기
        </button>
      </div>
    </div>
  );
}

// ─── 설정 패널 ─────────────────────────────────────

interface SettingsItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
  to: string;
}

const SETTINGS_ITEMS: SettingsItem[] = [
  { id: 'salary-split', icon: '💰', title: '월급 나눈 비율 재설정', desc: '각 계좌별 분배 비율을 다시 정해요', to: '/prescription-loading' },
  { id: 'portfolio', icon: '📊', title: '포트폴리오 재설정', desc: '흐름·상품 구성을 처음부터 다시 짜요', to: '/asset-portfolio' },
];

function SettingsPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (to: string) => void }) {
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
          <span style={{ fontSize: 18 }}>⚙️</span>
          <span style={{ fontSize: 17, fontWeight: 500, color: '#0f172a' }}>설정</span>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }} aria-label="닫기">✕</button>
      </div>

      {/* 항목 리스트 */}
      <div style={{ padding: '12px 12px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', padding: '4px 6px 8px' }}>자산 관리 재설정</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SETTINGS_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.to)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px', background: '#fff', border: '0.5px solid #e2e8f0',
                borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CHALLENGE_TYPES = new Set(['CHALLENGE_NAG', 'CHALLENGE_COMPLETE', 'CHALLENGE_FAILED']);

function NotificationPanel({ onClose, items, setItems, onChallengeClick }: {
  onClose: () => void;
  items: NotiItem[];
  setItems: Dispatch<SetStateAction<NotiItem[]>>;
  onChallengeClick: (id: string, type: string) => void;
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

// ─── 날씨 자산 위젯 ───
type WeatherType = 'sunny' | 'cloudy' | 'rain' | 'tornado';

function getWeatherState(dashboard: DashboardData): WeatherType {
  const exceed = dashboard.consumption.budgetExceedRate ?? 0;
  if (!dashboard.consumption.isBudgetExceeded) return 'sunny';
  if (exceed < 0.2) return 'rain';
  return 'tornado';
}

const WEATHER_CONFIG: Record<WeatherType, {
  img: string; label: string; desc: string;
  bg: string; textColor: string;
}> = {
  sunny: { img: sunnyImg, label: '맑음', desc: '자산 흐름이 순항 중이에요', bg: 'linear-gradient(160deg,#38bdf8,#0369a1)', textColor: '#fff' },
  cloudy: { img: cloudyImg, label: '흐림', desc: '지출이 살짝 늘고 있어요', bg: 'linear-gradient(160deg,#94a3b8,#475569)', textColor: '#fff' },
  rain: { img: rainImg, label: '비', desc: '예산을 초과하고 있어요', bg: 'linear-gradient(160deg,#1e40af,#1e3a5f)', textColor: '#e0f2fe' },
  tornado: { img: tornadoImg, label: '폭풍', desc: '지출 관리가 시급해요!', bg: 'linear-gradient(160deg,#7f1d1d,#1e1b4b)', textColor: '#fecaca' },
};

function WeatherAssetWidget({ dashboard }: { dashboard: DashboardData }) {
  const weather = getWeatherState(dashboard);
  const cfg = WEATHER_CONFIG[weather];
  const total = dashboard.assetsSummary.totalBalance;
  const invest = dashboard.assetsSummary.investmentBalance;
  const cash = dashboard.assetsSummary.cashBalance;
  const fmtM = (n: number) => `${Math.round(n / 10000).toLocaleString()}만`;

  // 요일별 예상 지출 5칸 (Mon~Fri)
  const dailyAmt = Math.round(dashboard.consumption.totalExpense / 30);
  const weekdays = [
    { label: 'Mon', amt: dailyAmt },
    { label: 'Tue', amt: dailyAmt },
    { label: 'Wed', amt: dailyAmt },
    { label: 'Thu', amt: dailyAmt },
    { label: 'Fri', amt: dailyAmt },
  ];

  return (
    <div style={{
      borderRadius: 22, overflow: 'hidden',
      background: cfg.bg,
      padding: '18px 20px 16px',
      color: cfg.textColor,
      position: 'relative',
      minHeight: 180,
    }}>
      {/* 날씨 이미지 — 오른쪽 위 */}
      <img
        src={cfg.img}
        alt={cfg.label}
        style={{
          position: 'absolute', top: 12, right: 16,
          width: 80, height: 80, objectFit: 'contain',
          opacity: 0.9,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
        }}
      />

      {/* 날씨 레이블 */}
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, opacity: 0.85 }}>{cfg.label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.65 }}>{cfg.desc}</p>

      {/* 총 자산 */}
      <p style={{ margin: '14px 0 2px', fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
        {fmtM(total)}<span style={{ fontSize: 16, fontWeight: 500, marginLeft: 4 }}>원</span>
      </p>
      <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>총 자산</p>

      {/* 구분선 */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', margin: '14px 0 10px' }} />

      {/* 투자 / 현금 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        {[
          { label: '💰 투자', value: fmtM(invest) },
          { label: '💵 현금', value: fmtM(cash) },
        ].map(item => (
          <div key={item.label}>
            <p style={{ margin: 0, fontSize: 10, opacity: 0.65 }}>{item.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700 }}>{item.value}원</p>
          </div>
        ))}
      </div>

      {/* 요일별 예상 지출 바 */}
      <div>
        <div style={{ display: 'flex', gap: 6 }}>
          {weekdays.map(w => (
            <div key={w.label} style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, opacity: 0.7 }}>{w.label}</p>
              <div style={{
                height: 28, borderRadius: 6,
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{fmtM(w.amt)}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 9, opacity: 0.6, textAlign: 'right' }}>지난달 동일 시점 기준 예상치</p>
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
  const [bannerVisible, setBannerVisible] = useState(true);
  const [anomalyOpen, setAnomalyOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [portfolioDetailOpen, setPortfolioDetailOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const DEV_NOTI_ITEMS: NotiItem[] = [
    { id: 'dev-nag', type: 'CHALLENGE_NAG', icon: '⚡', iconBg: '#FEF9C3', title: '[DEV] 챌린지 소비 감지', body: '커피 3잔만 마시기 — 결제가 발생했어요', time: '방금 전', read: false },
    { id: 'dev-complete', type: 'CHALLENGE_COMPLETE', icon: '🏆', iconBg: '#E1F5EE', title: '[DEV] 챌린지 성공!', body: '커피 3잔만 마시기 — 이번 주 미션 성공했어요', time: '1시간 전', read: false },
    { id: 'dev-failed', type: 'CHALLENGE_FAILED', icon: '😢', iconBg: '#FCEBEB', title: '[DEV] 챌린지 종료', body: '커피 3잔만 마시기 — 다음엔 꼭 성공해봐요', time: '1일 전', read: false },
  ];
  const [notiItems, setNotiItems] = useState<NotiItem[]>(DEV_NOTI_ITEMS);
  const [accountMgmtOpen, setAccountMgmtOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  type PoriStep = 'input' | 'analyzing' | 'choice' | 'proposing' | 'preview' | 'applying' | 'done';
  const [poriOpen, setPoriOpen] = useState(false);
  const [poriStep, setPoriStep] = useState<PoriStep>('input');
  const [poriMessage, setPoriMessage] = useState('');
  const [poriAnalysis, setPoriAnalysis] = useState<AnalyzeResponse | null>(null);
  const [poriChosenAction, setPoriChosenAction] = useState<'salary' | 'portfolio'>('salary');
  const [poriProposal, setPoriProposal] = useState<ProposeResponse | null>(null);
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

  // ── 표시용 헬퍼 ─────────────────────────────────────────
  const fmtManwon = (n: number) => `${Math.round(n / 10000).toLocaleString()}만 원`;

  // 월급 분배 도넛 데이터 (API allocations → SalaryDonutChart 슬라이스)
  const SALARY_PALETTE = ['#EF9F27', '#7F77DD', '#378ADD', '#1D9E75', '#94a3b8'];
  const salarySlices: PortfolioSlice[] = dashboard
    ? (() => {
      const income = dashboard.salaryPlan.monthlyIncome;
      if (income <= 0) return [];

      const slices: PortfolioSlice[] = dashboard.salaryPlan.allocations.map((a, i) => ({
        label: a.purpose ?? '기타',
        pct: Math.round(a.plannedAmount / income * 100),
        color: SALARY_PALETTE[i % (SALARY_PALETTE.length - 2)],
      }));

      const investAmt = dashboard.salaryPlan.investmentAmount ?? 0;
      if (investAmt > 0) {
        slices.push({ label: '투자', pct: Math.round(investAmt / income * 100), color: '#1D9E75' });
      }

      const surplus = dashboard.salaryPlan.surplus ?? 0;
      if (surplus > 0) {
        slices.push({ label: '잔여', pct: Math.round(surplus / income * 100), color: '#94a3b8' });
      }

      return slices;
    })()
    : [];

  // 소비 카테고리 색상 (API 카테고리명 → 표시 색상 매핑, (하드))
  const SPENDING_COLOR: Record<string, string> = {
    '식비': '#D85A30',
    '문화/여가': '#D85A30',
    '온라인쇼핑': '#A32D2D',
    '교통': '#D85A30',
    '기타': '#D85A30',
  };
  const generateChallenge = (cats: typeof dashboard extends null ? never : (typeof dashboard)['consumption']['categories']) => {
    const top = [...(cats ?? [])].sort((a, b) => b.percentage - a.percentage)[0];
    const name = top?.categoryName ?? '';
    if (/카페|커피/.test(name)) return { icon: '☕', title: '이번달 카페 5번 줄이기', step: 20 };
    if (/배달/.test(name)) return { icon: '🍕', title: '이번달 배달음식 5번만 시키기', step: 20 };
    if (/외식|식비/.test(name)) return { icon: '🍽', title: '이번달 외식 3번 줄이기', step: 33 };
    if (/쇼핑|온라인/.test(name)) return { icon: '🛍', title: '이번달 충동구매 0번 도전', step: 25 };
    if (/편의점/.test(name)) return { icon: '🏪', title: '편의점 지출 20% 줄이기', step: 20 };
    if (/구독/.test(name)) return { icon: '📱', title: '불필요한 구독 1개 해지하기', step: 100 };
    if (/교통/.test(name)) return { icon: '🚌', title: '이번달 택시 10번 줄이기', step: 10 };
    return { icon: '💡', title: `이번달 ${name || '지출'} 10% 줄이기`, step: 10 };
  };

  const spendingItems: SpendingItem[] = dashboard
    ? dashboard.consumption.categories.map(c => ({
      label: c.categoryName,
      pct: c.percentage,
      color: SPENDING_COLOR[c.categoryName] ?? '#D85A30',
    }))
    : [];

  // 포트폴리오 카테고리별 색상 (categoryLabel → 색상)
  const PORTFOLIO_COLOR: Record<string, string> = {
    'ETF': '#1D9E75',
    '현금성': '#5DCAA5',
    '적금': '#9FE1CB',
    'IRP': '#085041',
  };
  const portfolioSlices: PortfolioSlice[] = dashboard
    ? dashboard.portfolio.map(p => ({
      label: p.categoryLabel,
      pct: p.ratio,
      color: PORTFOLIO_COLOR[p.categoryLabel] ?? '#94a3b8',
      rate: p.rate,
    }))
    : [];

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

        {/* 월급 알림 배너 (하드) — 별도 API 미제공 */}
        {bannerVisible && (
          <div style={{ padding: '0 16px', marginBottom: 10 }}>
            <div style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: 22, padding: '16px', position: 'relative' }}>
              {/* 1. 닫기 버튼 - 우측 상단 모서리에 절대 위치로 배치 */}
              <button
                onClick={() => setBannerVisible(false)}
                style={{ position: 'absolute', right: 12, top: 12, border: 'none', background: 'none', cursor: 'pointer', color: '#854F0B', fontSize: 16, lineHeight: 1, padding: 0 }}
                aria-label="닫기"
              >✕</button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingRight: 8 }}>
                {/* 2. 좌측: 타이틀 및 설명 텍스트 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>🔔</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#854F0B' }}>
                      월급이 들어왔어요
                    </span>
                    <span style={{ fontSize: 10, color: '#854F0B', opacity: 0.8 }}>방금 전</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#854F0B', margin: 0, lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                    Pori가 자동으로 이번 달 분배 계획을 세웠어요.{'\n'}확인하고 자동이체를 시작해볼까요?
                  </p>
                </div>

                {/* 3. 우측: 확인 버튼 - 우측 끝 테두리에서 살짝 왼쪽으로 당겨지도록 여백 설정 */}
                <div style={{ flexShrink: 0, marginRight: 8 }}>
                  <button
                    onClick={() => setSalaryMgmtOpen(true)}
                    style={{ fontSize: 11, fontWeight: 600, padding: '6px 12px', background: '#854F0B', color: '#FAEEDA', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
            {(() => {
              const totalExpense = dashboard.consumption.totalExpense;
              const budget = (dashboard.consumption as any).budget || (totalExpense * 1.5);
              const remainingPercent = Math.round((budget - totalExpense) / budget * 100);

              let fillColor = '#0095DB';
              if (remainingPercent < 20 || dashboard.consumption.isBudgetExceeded) {
                fillColor = '#EF4444';
              } else if (remainingPercent >= 20 && remainingPercent < 50) {
                fillColor = '#FFD700';
              }

              return (
                <div
                  onClick={() => setRecapOpen(v => !v)}
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${recapOpen ? '#0095DB' : '#E0F2FE'}`,
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
                    {dashboard.consumption.isBudgetExceeded && (
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
            })()}
          </div>

          {/* [3] 월급 가이드 위젯 */}
          <div style={{ gridColumn: '2' }}>
            {(() => {
              const income = dashboard.salaryPlan.monthlyIncome;
              const topSlices = [...salarySlices]
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 2);

              return (
                <div
                  onClick={() => setSalaryMgmtOpen(true)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E0F2FE',
                    borderRadius: 22,
                    padding: '16px',
                    boxShadow: '0 2px 12px rgba(0,149,219,0.06)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 180,
                    boxSizing: 'border-box',
                    position: 'relative',
                  }}
                >
                  {/* 상단 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>월급</span>
                  </div>

                  {/* 중앙 SalaryDonutChart */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                    <SalaryDonutChart
                      data={salarySlices}
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
              );
            })()}
          </div>

          {/* 소비 펼침 영역 (recapOpen) */}
          {recapOpen && (
            <div style={{ gridColumn: '1 / -1' }}>
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
                  {dashboard.consumption.categories.map((item, idx) => (
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
            </div>
          )}

          {/* [4] 미션 위젯 */}
          <div style={{ gridColumn: '1 / -1' }}>
            {dashboard ? (() => {
              const ch = generateChallenge(dashboard.consumption.categories);

              let savings = 'TIGER 미국S&P500 0.03주';
              if (ch.title.includes('카페') || ch.title.includes('커피')) {
                savings = 'TIGER 미국S&P500 0.02주';
              } else if (ch.title.includes('배달') || ch.title.includes('외식')) {
                savings = 'TIGER 미국S&P500 0.05주';
              } else if (ch.title.includes('쇼핑')) {
                savings = 'TIGER 미국S&P500 0.06주';
              }

              const threeColorBarBg = 'linear-gradient(to right, #10B981 33%, #FBBF24 33% 66%, #EF4444 66%)';
              const isProgressing = challengeProgress > 0;

              return (
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E0F2FE',
                  borderRadius: 22,
                  padding: '16px',
                  boxShadow: '0 2px 12px rgba(0,149,219,0.06)',
                  position: 'relative'
                }}>
                  {!isProgressing ? (
                    /* 상태 1 — 미션 없음 (challengeProgress === 0) */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>⚓ 이번주 추천 미션</span>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Pori의 추천</span>
                      </div>

                      {/* Pori 코멘트 및 미션 추천 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0F9FF', padding: '10px 12px', borderRadius: 12 }}>
                        <img src="/src/assets/missionpori.png" alt="Pori" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 11, color: '#0095DB', fontWeight: 600 }}>"뿌우~ 도전해볼만한 미션을 가져왔어요!"</p>
                          <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ch.icon} {ch.title}
                          </p>
                        </div>
                      </div>

                      {/* 삼색 진행바 (초록/노랑/빨강 3등분, 고정) */}
                      <div style={{ height: 10, background: threeColorBarBg, borderRadius: 99, marginTop: 4 }} />

                      {/* 보상 및 변경 버튼 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <div style={{ background: '#FFD700', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#713F12' }}>🏆 성공 시 {savings}</span>
                        </div>

                        <button
                          onClick={() => alert('더 알맞은 미션으로 변경되었습니다!')}
                          style={{ border: 'none', background: '#F1F5F9', borderRadius: 8, padding: '5px 10px', fontSize: 10, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                        >
                          🔄 변경
                        </button>
                      </div>

                      {/* 버튼 행: [쉽게 ▲] [▶ 시작] [어렵게 ▼] */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => alert('난이도가 한 단계 쉬워졌습니다!')}
                          style={{ flex: 1, padding: '10px 0', border: '1px solid #E0F2FE', background: '#FFFFFF', borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                        >
                          쉽게 ▲
                        </button>
                        <button
                          onClick={() => {
                            setChallengeProgress(1);
                            sessionStorage.setItem(`challenge:progress:${new Date().getMonth()}`, '1');
                          }}
                          style={{ flex: 2, padding: '10px 0', border: 'none', background: 'linear-gradient(135deg, #0095DB, #00BFFF)', borderRadius: 12, fontSize: 12, fontWeight: 800, color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,149,219,0.2)' }}
                        >
                          ▶ 시작
                        </button>
                        <button
                          onClick={() => alert('난이도가 한 단계 어려워졌습니다!')}
                          style={{ flex: 1, padding: '10px 0', border: '1px solid #E0F2FE', background: '#FFFFFF', borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                        >
                          어렵게 ▼
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 상태 2 — 미션 진행중 (challengeProgress > 0) */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>이번주 미션</span>
                        <div style={{ background: '#FFD700', borderRadius: 8, padding: '3px 8px' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#713F12' }}>🏆 성공 시 {savings}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                        <span style={{ fontSize: 24 }}>{ch.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{ch.title}</span>
                      </div>

                      {/* 삼색 진행바 + 흰 점 */}
                      <div style={{ position: 'relative', height: 10, background: threeColorBarBg, borderRadius: 99, margin: '8px 0 4px' }}>
                        <div style={{
                          position: 'absolute',
                          left: `${Math.min(100, challengeProgress)}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 12,
                          height: 12,
                          background: '#FFFFFF',
                          border: '2px solid #0095DB',
                          borderRadius: '50%',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'left 0.3s ease'
                        }} />
                      </div>

                      {/* 0% ~ 100% 레이블 및 진행상태 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>0%</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0095DB' }}>
                          {challengeProgress}% 달성중
                        </span>
                        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>100%</span>
                      </div>

                      {/* 중앙 일시정지 버튼만 */}
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                        <button
                          onClick={() => {
                            setChallengeProgress(0);
                            sessionStorage.setItem(`challenge:progress:${new Date().getMonth()}`, '0');
                          }}
                          style={{
                            width: '50%',
                            padding: '10px 0',
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#64748b',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                          }}
                        >
                          ⏸ 일시정지
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : null}
          </div>

          {/* [5] 투자 위젯 */}
          <div style={{ gridColumn: '1' }}>
            {(() => {
              const investAmt = dashboard.assetsSummary.investmentBalance;
              const portfolioItems = dashboard.portfolio.slice(0, 3);

              return (
                <div
                  onClick={() => setPortfolioDetailOpen(v => !v)}
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${portfolioDetailOpen ? '#0095DB' : '#E0F2FE'}`,
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
                      const rateInfo = (() => {
                        const r = p.rate;
                        if (!r || r === '-') return { text: '-', color: '#94a3b8' };
                        if (r.startsWith('+')) return { text: '▲' + r.slice(1), color: '#EF4444' };
                        if (r.startsWith('-')) return { text: '▼' + r.slice(1), color: '#0095DB' };
                        return { text: r, color: '#94a3b8' };
                      })();

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
            })()}
          </div>

          {/* [6] 절세 위젯 */}
          <div style={{ gridColumn: '2' }}>
            {(() => {
              const IRP_LIMIT = 9_000_000;
              const PENSION_LIMIT = 6_000_000;
              const annualIncome = dashboard.salaryPlan.monthlyIncome * 12;
              const taxRate = annualIncome <= 55_000_000 ? 0.165 : 0.132;

              const irpAmt = dashboard.portfolio.find(p => p.categoryLabel === 'IRP')?.assetAmount ?? 0;
              const pensionAmt = dashboard.portfolio.find(p => p.categoryLabel === '연금저축')?.assetAmount ?? 0;

              const deductibleAmt = Math.min(IRP_LIMIT, irpAmt + pensionAmt);
              const taxDeduction = Math.round(deductibleAmt * taxRate);

              return (
                <div
                  onClick={() => setAnomalyOpen(v => !v)}
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${anomalyOpen ? '#0095DB' : '#E0F2FE'}`,
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
            })()}
          </div>

          {/* 투자 펼침 영역 (portfolioDetailOpen) */}
          {portfolioDetailOpen && (
            <div style={{ gridColumn: '1 / -1' }}>
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
                    {dashboard.portfolio.map((cat, idx) => {
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
            </div>
          )}

          {/* 절세 펼침 영역 (anomalyOpen 활용) */}
          {anomalyOpen && dashboard && (() => {
            const IRP_LIMIT = 9_000_000;
            const PENSION_LIMIT = 6_000_000;
            const annualIncome = dashboard.salaryPlan.monthlyIncome * 12;
            const taxRate = annualIncome <= 55_000_000 ? 0.165 : 0.132;

            const irpAmt = dashboard.portfolio.find(p => p.categoryLabel === 'IRP')?.assetAmount ?? 0;
            const pensionAmt = dashboard.portfolio.find(p => p.categoryLabel === '연금저축')?.assetAmount ?? 0;

            const irpPct = Math.min(100, Math.round(irpAmt / IRP_LIMIT * 100));
            const pensionPct = Math.min(100, Math.round(pensionAmt / PENSION_LIMIT * 100));

            const deductibleAmt = Math.min(IRP_LIMIT, irpAmt + pensionAmt);
            const taxDeduction = Math.round(deductibleAmt * taxRate);
            const remaining = Math.max(0, IRP_LIMIT - irpAmt - pensionAmt);

            const fmtWon = (n: number) => n >= 10_000 ? `${Math.round(n / 10_000)}만원` : `${n.toLocaleString()}원`;

            const bars = [
              { label: 'IRP', amt: irpAmt, limit: IRP_LIMIT, pct: irpPct, color: '#085041' },
              { label: '연금저축', amt: pensionAmt, limit: PENSION_LIMIT, pct: pensionPct, color: '#1D9E75' },
            ];

            return (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E0F2FE',
                  borderRadius: 22,
                  padding: '16px',
                  boxShadow: '0 2px 12px rgba(0,149,219,0.06)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 99, background: '#E1F5EE', color: '#0F6E56' }}>
                      {(taxRate * 100).toFixed(1)}% 공제율
                    </span>
                  </div>
                  {/* IRP / 연금저축 바 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                    {bars.map(b => (
                      <div key={b.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{b.label}</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{fmtWon(b.amt)}</span>
                            {' '}/ {fmtWon(b.limit)}
                          </span>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${b.pct}%`, height: '100%', background: b.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                          <span style={{ fontSize: 10, color: b.color, fontWeight: 600 }}>{b.pct}% 채움</span>
                          {b.pct < 100 && (
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>한도까지 {fmtWon(b.limit - b.amt)} 남음</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 세액공제 예상 */}
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 3px' }}>올해 예상 세액공제</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: '#085041', margin: 0 }}>
                          {taxDeduction > 0 ? `${taxDeduction.toLocaleString()}원` : '–'}
                        </p>
                      </div>
                      {remaining > 0 && (
                        <div style={{ background: '#E1F5EE', borderRadius: 8, padding: '6px 10px', textAlign: 'right' }}>
                          <p style={{ fontSize: 9, color: '#0F6E56', margin: '0 0 1px' }}>한도 추가 납입 시</p>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#085041', margin: 0 }}>
                            +{Math.round(remaining * taxRate).toLocaleString()}원 환급↑
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 6, paddingBottom: 20 }}>
                <button
                  onClick={() => { setSidebarOpen(false); setAccountMgmtOpen(true); }}
                  style={{ fontSize: 15, color: '#0f172a', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                >
                  내 계좌 연결 관리
                </button>
                <span style={{ fontSize: 15, color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}>목표 이력</span>
                <button
                  onClick={() => { setSidebarOpen(false); navigate('/tax-calculator'); }}
                  style={{ fontSize: 15, color: '#0f172a', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                >
                  세금 계산기
                </button>
                <button
                  onClick={() => { setSidebarOpen(false); navigate('/monthly-report'); }}
                  style={{ fontSize: 15, color: '#0f172a', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                >
                  월간 리포트
                </button>
                <span style={{ fontSize: 15, color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}>관심사 재설정</span>
                <button
                  onClick={() => { setSidebarOpen(false); setSettingsOpen(true); }}
                  style={{ fontSize: 15, color: '#0f172a', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                >
                  내 포트폴리오 변경하기
                </button>
              </div>
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
            <AccountManagePanel onClose={() => setAccountMgmtOpen(false)} />
          </div>
        </div>
      )}

      {/* 월급 관리 모달 */}
      {salaryMgmtOpen && (
        <SalaryManagement onClose={() => setSalaryMgmtOpen(false)} />
      )}

      {/* 설정 패널 */}
      {settingsOpen && (
        <div
          onClick={() => setSettingsOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ width: '100%', maxWidth: 375, display: 'flex', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
            <SettingsPanel
              onClose={() => setSettingsOpen(false)}
              onNavigate={(to) => { setSettingsOpen(false); navigate(to); }}
            />
          </div>
        </div>
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
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Pori에게 말해보세요</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>목표를 입력하면 월급 비율이나 포트폴리오를 조정해 드려요</p>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
                  {['내년 봄에 유럽 여행 가고 싶어 🌍', '2년 뒤까지 결혼자금 3000만원 모으고 싶어 💍', '매달 투자 비중 늘리고 싶어 📈'].map(ex => (
                    <button key={ex} onClick={() => setPoriMessage(ex)}
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
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#0f172a', resize: 'none', outline: 'none', marginBottom: 12, fontFamily: 'inherit' }}
                />
                {poriError && <p style={{ fontSize: 11, color: '#A32D2D', marginBottom: 8 }}>{poriError}</p>}
                <button
                  disabled={!poriMessage.trim()}
                  onClick={async () => {
                    if (!dashboard) return;
                    setPoriStep('analyzing');
                    setPoriError(null);
                    try {
                      const result = await analyzeGoal(poriMessage.trim(), dashboard);
                      setPoriAnalysis(result);
                      setPoriChosenAction(result.action);
                      setPoriStep('choice');
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
                  }}
                >Pori에게 보내기 →</button>
              </>
            )}

            {/* ── step: analyzing / proposing / applying ── */}
            {(poriStep === 'analyzing' || poriStep === 'proposing' || poriStep === 'applying') && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <span style={{ fontSize: 40 }}>🐥</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6, marginTop: 16 }}>
                  {poriStep === 'analyzing' && '목표를 분석하고 있어요...'}
                  {poriStep === 'proposing' && '재설정안 만드는 중이에요...'}
                  {poriStep === 'applying' && '대시보드 업데이트 중...'}
                </p>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>잠깐만 기다려 주세요</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
              </div>
            )}

            {/* ── step: choice ── */}
            {poriStep === 'choice' && poriAnalysis && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>🐥</span>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>어떤 부분을 바꿀까요?</p>
                </div>
                <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '10px 12px', marginBottom: 16, borderLeft: '3px solid #1D9E75' }}>
                  <p style={{ fontSize: 12, color: '#0F6E56', margin: 0, lineHeight: 1.6 }}>🐥 {poriAnalysis.reasoning}</p>
                </div>
                {(['salary', 'portfolio'] as const).map(action => (
                  <button key={action} onClick={() => setPoriChosenAction(action)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
                      background: '#fff', border: `2px solid ${poriChosenAction === action ? '#1D9E75' : '#e2e8f0'}`,
                      borderRadius: 14, cursor: 'pointer', textAlign: 'left', marginBottom: 8,
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', fontSize: 18, background: poriChosenAction === action ? '#E1F5EE' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {action === 'salary' ? '💰' : '📊'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {action === 'salary' ? '월급 비율 재설정' : '포트폴리오 재설정'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {action === 'salary' ? '월급 배분 비율을 목표에 맞게 조정해요' : '투자 포트폴리오 구성을 재설계해요'}
                      </div>
                    </div>
                    {poriAnalysis.action === action && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#E1F5EE', color: '#0F6E56', padding: '2px 8px', borderRadius: 99 }}>추천</span>
                    )}
                  </button>
                ))}
                {poriError && <p style={{ fontSize: 11, color: '#A32D2D', margin: '4px 0 8px' }}>{poriError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setPoriStep('input')}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
                  >← 다시 입력</button>
                  <button
                    onClick={async () => {
                      if (!dashboard) return;
                      setPoriStep('proposing');
                      setPoriError(null);
                      try {
                        const result = await proposeReset(poriMessage.trim(), poriChosenAction, dashboard);
                        setPoriProposal(result);
                        setPoriStep('preview');
                      } catch (e) {
                        setPoriError(e instanceof Error ? e.message : 'AI 서버 오류');
                        setPoriStep('choice');
                      }
                    }}
                    style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1D9E75, #085041)', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                  >재설정안 보기 →</button>
                </div>
              </>
            )}

            {/* ── step: preview ── */}
            {poriStep === 'preview' && poriProposal && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>🐥</span>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Pori의 제안</p>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{poriProposal.summary}</p>
                  <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.6 }}>{poriProposal.explanation}</p>
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: '0 0 8px' }}>
                  {poriChosenAction === 'salary' ? '변경될 월급 배분' : '변경될 포트폴리오'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {poriChosenAction === 'salary'
                    ? poriProposal.salary_allocations.map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EEF2FF', padding: '9px 12px', borderRadius: 10 }}>
                          <span style={{ fontSize: 13, color: '#0f172a' }}>{a.purpose}</span>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#4338CA' }}>{a.ratio}%</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{a.plannedAmount.toLocaleString()}원</span>
                          </div>
                        </div>
                      ))
                    : poriProposal.portfolio.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF9EC', padding: '9px 12px', borderRadius: 10 }}>
                          <span style={{ fontSize: 13, color: '#0f172a' }}>{p.assetType}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#854F0B' }}>{p.ratio}%</span>
                        </div>
                      ))
                  }
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPoriStep('choice')}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
                  >← 다시 선택</button>
                  <button
                    onClick={async () => {
                      if (!poriProposal || !dashboard) return;
                      setPoriStep('applying');
                      setPoriError(null);
                      try {
                        await applyReset(poriProposal, poriChosenAction, dashboard);
                        setPoriStep('done');
                        getDashboard().then(setDashboard).catch(() => {});
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

            {/* ── step: done ── */}
            {poriStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>적용 완료!</p>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
                  {poriChosenAction === 'salary' ? '월급 배분이' : '포트폴리오가'} 업데이트됐어요
                </p>
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
