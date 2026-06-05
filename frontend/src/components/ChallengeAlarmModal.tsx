import { useEffect, useState } from 'react';
import type { ChallengeAlarmDetail, DailyLog } from '../api/challengeApi';
import { suggestNewChallenge } from '../api/challengeApi';
import missionpori from '../assets/missionpori.png';

interface Props {
  detail: ChallengeAlarmDetail;
  userName: string;
  onClose: () => void;
}

const BLUE_LIGHT = '#E0F2FE';

// 파란 영역 하단: 파란 배경에 흰 물결
function WhiteWaveOnBlue() {
  return (
    <svg
      viewBox="0 0 375 44"
      style={{ display: 'block', width: '100%', height: 44, marginBottom: -1 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="wave-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="50%" stopColor="#87CEEB" />
          <stop offset="100%" stopColor="#C8E9F7" />
        </linearGradient>
      </defs>
      <rect width="375" height="44" fill="url(#wave-grad)" />
      {/* 겹치는 입체 파도 1 (뒤쪽 - 파도 블루 반투명) */}
      <path
        d="M-20,12 C40,32 95,2 145,22 C195,42 235,-2 285,18 C325,38 350,12 395,27 L395,44 L-20,44 Z"
        fill="#00BFFF"
        opacity={0.25}
      />
      {/* 겹치는 입체 파도 2 (중간 - 하늘 블루 반투명) */}
      <path
        d="M-20,25 C30,7 75,32 125,12 C175,-8 215,32 265,12 C305,-3 340,22 395,7 L395,44 L-20,44 Z"
        fill="#87CEEB"
        opacity={0.4}
      />
      {/* 가장 위의 최종 불투명 흰색 물결 */}
      <path
        d="M0,22 C35,0 80,44 130,20 C180,-4 230,44 280,20 C315,4 350,36 375,22 L375,44 L0,44 Z"
        fill="white"
      />
    </svg>
  );
}

function ProgressBar({ progressPercent, weeklyStatus }: { progressPercent: number; weeklyStatus: string }) {
  const pct = Math.min(100, Math.max(0, progressPercent));
  const isPin = weeklyStatus === 'ACTIVE';
  const handleEmoji = isPin ? '📍' : '☕';
  return (
    <div style={{ marginTop: 10, marginBottom: 5 }}>
      <div style={{ position: 'relative', height: 12, borderRadius: 99 }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: 'linear-gradient(to right, #10B981 0%, #10B981 33%, #FBBF24 33%, #FBBF24 66%, #EF4444 66%, #EF4444 100%)',
        }} />
        <div style={{
          position: 'absolute',
          left: `${pct}%`,
          top: '50%',
          transform: isPin ? 'translate(-50%, -85%)' : 'translate(-50%, -75%)',
          fontSize: isPin ? 22 : 18,
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))',
        }}>
          {handleEmoji}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: '0 2px' }}>
        <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>0%</span>
        <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>100%</span>
      </div>
    </div>
  );
}

function EmojiCell({ log }: { log: DailyLog }) {
  const [show, setShow] = useState(false);

  // 말풍선 박스 동적 스타일
  const bubbleStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 10,
    background: '#fff',
    color: '#000',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 12,
    whiteSpace: 'nowrap',
    border: '1.5px solid #000',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10,
  };

  // 말풍선 꼬리 동적 스타일
  const tailStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    width: 10,
    height: 10,
    background: '#fff',
    borderRight: '1.5px solid #000',
    borderBottom: '1.5px solid #000',
    boxSizing: 'border-box',
  };

  // 가변 텍스트 대응 동적 위치 정렬
  if (log.day === 1) {
    bubbleStyle.left = 0;
    bubbleStyle.transform = 'none';
    tailStyle.left = 13;
    tailStyle.transform = 'translateY(-6px) rotate(45deg)';
  } else if (log.day === 7) {
    bubbleStyle.right = 0;
    bubbleStyle.left = 'auto';
    bubbleStyle.transform = 'none';
    tailStyle.right = 13;
    tailStyle.transform = 'translateY(-6px) rotate(45deg)';
  } else {
    bubbleStyle.left = '50%';
    bubbleStyle.transform = 'translateX(-50%)';
    tailStyle.left = '50%';
    tailStyle.transform = 'translate(-50%, -6px) rotate(45deg)';
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div
        onMouseEnter={() => log.achieved && setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 36, height: 36, borderRadius: 6,
          background: log.achieved ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
          border: `1px solid ${log.achieved ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
          cursor: log.achieved ? 'pointer' : 'default',
        }}
      >
        {log.achieved ? '😢' : ''}
      </div>
      <span style={{ fontSize: 9, color: '#475569', fontWeight: 500 }}>day{log.day}</span>

      {show && log.transaction && (
        <div style={bubbleStyle}>
          <div style={{ fontWeight: 600 }}>
            {log.transaction.date} {log.transaction.time} {log.transaction.name}
          </div>
          <div style={tailStyle} />
        </div>
      )}
    </div>
  );
}

export default function ChallengeAlarmModal({ detail, userName, onClose }: Props) {
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const isActive = detail.weeklyStatus === 'ACTIVE';
  const isFailed = detail.weeklyStatus === 'FAILED';

  const headerTitle = isActive
    ? `${userName}님의 이번주 미션 연관 결제가 발생했어요`
    : `${userName}님의 이번주 미션`;

  async function handleContinue() {
    if (isFailed) {
      setSuggesting(true);
      try { await suggestNewChallenge(); } catch { /* ignore */ }
      setSuggesting(false);
    }
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          border: 'none',
          width: '100%', maxWidth: 375,
          display: 'flex', flexDirection: 'column', gap: 14,
          paddingBottom: 32,
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* 파란 영역 + 흰 물결 */}
        <div style={{ background: '#00BFFF' }}>
          <div style={{ padding: '16px 16px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{headerTitle}</span>
          </div>
          <WhiteWaveOnBlue />
        </div>

        {/* 본문 콘텐츠 영역 */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 노란 박스: 가운데 정렬, pori + 미션 제목 */}
          <div style={{
            background: '#FEF9C3', borderRadius: 12,
            padding: '8px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <img src={missionpori} alt="미션 포리" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
            <p style={{ fontSize: 17, fontWeight: 700, color: '#713F12', margin: 0 }}>{detail.title}</p>
          </div>

          {/* 연한 파란 내부 박스: day트래커 + 진행 바 */}
          <div style={{
            background: BLUE_LIGHT, borderRadius: 12,
            padding: '12px 12px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
              {detail.dailyLogs.map(log => <EmojiCell key={log.day} log={log} />)}
            </div>
            <ProgressBar progressPercent={detail.progressPercent} weeklyStatus={detail.weeklyStatus} />
          </div>

          {/* 보상 배지 영역 (진행 중에만 노출) */}
          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                background: '#FFD700',
                borderRadius: 10,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#713F12' }}>
                  🏆 성공 시 {detail.tickerName} {detail.estimatedShares}
                </span>
              </div>
              <button style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#64748B',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}>
                자세히 보기
              </button>
            </div>
          )}

          {/* AI 코멘트 */}
          <div style={{
            background: '#F0F9FF',
            border: '1.5px solid #0095DB',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 13, color: '#334155', lineHeight: 1.6,
          }}>
            <p style={{ margin: 0 }}>{detail.aiComment}</p>
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {isActive ? (
              <button onClick={onClose} style={{ padding: '10px 36px', borderRadius: 12, background: '#0095DB', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                확인
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: '#F1F5F9', color: '#475569', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                  취소
                </button>
                <button onClick={handleContinue} disabled={suggesting} style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: '#0095DB', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, opacity: suggesting ? 0.7 : 1 }}>
                  {suggesting ? '처리 중...' : '계속'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
