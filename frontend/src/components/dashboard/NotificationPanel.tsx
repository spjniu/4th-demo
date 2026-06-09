import { type Dispatch, type SetStateAction } from 'react';
import { markNotificationRead, markAllNotificationsRead } from '../../api/notificationApi';

export interface NotiItem {
  id: string;
  type: string;
  icon: string;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const CHALLENGE_TYPES = new Set(['CHALLENGE_NAG', 'CHALLENGE_COMPLETE', 'CHALLENGE_FAILED']);

interface NotificationPanelProps {
  onClose: () => void;
  items: NotiItem[];
  setItems: Dispatch<SetStateAction<NotiItem[]>>;
  onChallengeClick: (id: string, type: string) => void;
  onReportClick: () => void;
  onSalaryClick: () => void;
  userName: string;
}

export default function NotificationPanel({ onClose, items, setItems, onChallengeClick, onReportClick, onSalaryClick, userName }: NotificationPanelProps) {
  const markRead = (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!id.startsWith('dev-')) markNotificationRead(id).catch(() => {});
  };
  const markAll = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    markAllNotificationsRead().catch(() => {});
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
        {items.map(n => {
          let title = n.title;
          let body = n.body;
          let icon = n.icon;
          let iconBg = n.iconBg;

          if (n.type === 'SALARY_REBALANCING') {
            title = '월급';
            body = '급여가 들어왔어요 - PorTI의 월급 가이드를 확인하고 편하게 분배해봐요!';
          } else if (n.type === 'REPORT_READY') {
            title = '월간리포트';
            body = `${userName}님의 월간리포트가 도착했어요 - 2026년 5월의 소비·투자를 종합 분석했어요!`;
          } else if (n.type === 'CHALLENGE_NAG') {
            title = '미니챌린지';
            icon = '🟡';
            iconBg = '#FEF9C3';
            if (n.body.includes('50%')) body = '벌써 미션에 50%나 도달했어요...';
            else if (n.body.includes('80%')) body = '벌써 미션에 80%나 도달했어요...';
            else if (n.body.includes('90%')) body = '벌써 미션에 90%나 도달했어요...';
          } else if (n.type === 'CHALLENGE_COMPLETE') {
            title = '미니챌린지';
            icon = '🏆';
            iconBg = '#E1F5EE';
            body = '뿌우~축하해요 성공했어요';
          } else if (n.type === 'CHALLENGE_FAILED') {
            title = '미니챌린지';
            icon = '😢';
            iconBg = '#FCEBEB';
            body = '뿌우,,,아쉽게 실패했어요';
          }

          return (
            <div key={n.id} onClick={() => {
              markRead(n.id);
              if (n.type === 'REPORT_READY') { onReportClick(); return; }
              if (n.type === 'SALARY_REBALANCING') { onSalaryClick(); return; }
              if (CHALLENGE_TYPES.has(n.type)) onChallengeClick(n.id, n.type);
            }}
              style={{
                background: '#fff', border: '0.5px solid #f1f5f9', borderRadius: 14, padding: 14,
                display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                opacity: n.read ? 0.5 : 1, transition: 'opacity .15s',
              }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, color: n.read ? '#64748b' : '#0f172a', margin: '0 0 4px', lineHeight: 1.35 }}>{title}</p>
                <p style={{ fontSize: 12, color: n.read ? '#94a3b8' : '#64748b', margin: 0, lineHeight: 1.55 }}>{body}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{n.time}</span>
                {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#378ADD', display: 'block' }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
