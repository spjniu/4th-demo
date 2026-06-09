import { useEffect, useState } from 'react';
import type { ChallengeAlarmDetail, DailyLog, StockInfo } from '../api/challengeApi';
import { suggestNewChallenge, getStockInfo } from '../api/challengeApi';
import missionpori from '../assets/missionpori.png';

interface Props {
  detail: ChallengeAlarmDetail;
  userName: string;
  onClose: () => void;
}

const BLUE_LIGHT = '#E0F2FE';
const fmt = (n: number) => n.toLocaleString('ko-KR');

// ── Wave SVG ────────────────────────────────────────────────
function WaveBar({ topColor }: { topColor: string }) {
  return (
    <svg viewBox="0 0 375 44" style={{ display: 'block', width: '100%', height: 44, marginBottom: -1 }} preserveAspectRatio="none">
      <rect width="375" height="44" fill={topColor} />
      <path d="M-20,12 C40,32 95,2 145,22 C195,42 235,-2 285,18 C325,38 350,12 395,27 L395,44 L-20,44 Z" fill={topColor} opacity={0.25} />
      <path d="M0,22 C35,0 80,44 130,20 C180,-4 230,44 280,20 C315,4 350,36 375,22 L375,44 L0,44 Z" fill="white" />
    </svg>
  );
}

// ── 진행 바 (50% / 80% / 90% 마일스톤 마커 포함) ─────────────
function ProgressBar({ progressPercent, weeklyStatus }: { progressPercent: number; weeklyStatus: string }) {
  const pct = Math.min(100, Math.max(0, progressPercent));
  const isActive  = weeklyStatus === 'ACTIVE';
  const isSuccess = weeklyStatus === 'SUCCESS';

  const pinEmoji    = isActive ? '📍' : isSuccess ? '🏆' : '😢';
  const pinFontSize = isActive ? 22 : 20;

  return (
    <div style={{ marginTop: 10, marginBottom: 5 }}>
      <div style={{ position: 'relative', height: 12, borderRadius: 99 }}>
        {/* 3색 바 */}
        <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(to right, #10B981 0%, #10B981 33%, #FBBF24 33%, #FBBF24 66%, #EF4444 66%, #EF4444 100%)' }} />

        {/* 마일스톤 마커 50 / 80 / 90 */}
        {[50, 80, 90].map(m => (
          <div key={m} style={{
            position: 'absolute', left: `${m}%`, top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 2, height: 18,
            background: 'rgba(255,255,255,0.75)',
            borderRadius: 1,
            pointerEvents: 'none',
          }} />
        ))}

        {/* 현재 위치 핀 */}
        <div style={{
          position: 'absolute', left: `${pct}%`, top: '50%',
          transform: 'translate(-50%, -80%)',
          fontSize: pinFontSize, lineHeight: 1,
          pointerEvents: 'none', userSelect: 'none',
          filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))',
        }}>
          {pinEmoji}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: '0 2px' }}>
        <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>0%</span>
        <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>100%</span>
      </div>
    </div>
  );
}

// ── Day 트래커 셀 ────────────────────────────────────────────
function EmojiCell({ log }: { log: DailyLog }) {
  const [show, setShow] = useState(false);
  const bubbleStyle: React.CSSProperties = {
    position: 'absolute', bottom: '100%', marginBottom: 10,
    background: '#fff', color: '#000', borderRadius: 12, padding: '8px 12px',
    fontSize: 12, whiteSpace: 'nowrap', border: '1.5px solid #000',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10,
  };
  const tailStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', width: 10, height: 10,
    background: '#fff', borderRight: '1.5px solid #000', borderBottom: '1.5px solid #000',
    boxSizing: 'border-box',
  };
  if (log.day === 1) {
    bubbleStyle.left = 0; bubbleStyle.transform = 'none';
    tailStyle.left = 13; tailStyle.transform = 'translateY(-6px) rotate(45deg)';
  } else if (log.day === 7) {
    bubbleStyle.right = 0; bubbleStyle.left = 'auto'; bubbleStyle.transform = 'none';
    tailStyle.right = 13; tailStyle.transform = 'translateY(-6px) rotate(45deg)';
  } else {
    bubbleStyle.left = '50%'; bubbleStyle.transform = 'translateX(-50%)';
    tailStyle.left = '50%'; tailStyle.transform = 'translate(-50%, -6px) rotate(45deg)';
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
          fontSize: 20, cursor: log.achieved ? 'pointer' : 'default',
        }}
      >{log.achieved ? '😢' : ''}</div>
      <span style={{ fontSize: 9, color: '#475569', fontWeight: 500 }}>day{log.day}</span>
      {show && log.transaction && (
        <div style={bubbleStyle}>
          <div style={{ fontWeight: 600 }}>{log.transaction.date} {log.transaction.time} {log.transaction.name}</div>
          <div style={tailStyle} />
        </div>
      )}
    </div>
  );
}

// ── 카테고리 → 이모지 ────────────────────────────────────────
function getCategoryEmoji(category: string): string {
  switch (category) {
    case '카페': return '☕';
    case '배달': return '🛵';
    case '야식': return '🌙';
    case '술':   return '🍺';
    case '쇼핑': return '🛍️';
    case '택시': return '🚕';
    case '식비': return '🍽️';
    case '교통': return '🚌';
    case '편의점': return '🏪';
    default: return '🪙';
  }
}

// ── 주식 차트 path 생성 ──────────────────────────────────────
function buildPricePath(closes: number[], w: number, h: number, padding = 6) {
  if (closes.length < 2) return '';
  const min = Math.min(...closes), max = Math.max(...closes);
  const range = max - min || 1;
  const step = w / (closes.length - 1);
  return closes.map((c, i) => {
    const x = i * step;
    const y = h - padding - ((c - min) / range) * (h - padding * 2);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

// ── 주식 차트 뷰 (ACTIVE "자세히 보기" / SUCCESS "주식 받기") ─
function StockChartView({
  detail, savedCount, categoryEmoji, savedEmojis,
  stockInfo, stockLoading, isSuccess,
  onBack, onClose,
}: {
  detail: ChallengeAlarmDetail;
  savedCount: number;
  categoryEmoji: string;
  savedEmojis: number[];
  stockInfo: StockInfo | null;
  stockLoading: boolean;
  isSuccess: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const closes = stockInfo?.chart.map(p => p.close) ?? [];
  const isUp = (stockInfo?.changeAmount ?? 0) >= 0;
  const color = isUp ? '#EF4444' : '#3B82F6';
  const linePath = buildPricePath(closes, 300, 80);
  const areaPath = closes.length > 1 ? `${linePath} L 300 80 L 0 80 Z` : '';
  const gradId = `sg-${detail.tickerName}`;
  const lastClose = closes[closes.length - 1] ?? 0;
  const minC = Math.min(...closes), maxC = Math.max(...closes);
  const lastY = closes.length > 1 ? 80 - 6 - ((lastClose - minC) / (maxC - minC || 1)) * (80 - 12) : 40;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 375, display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 16px 32px', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#0095DB' }}>← 뒤로</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>리워드 주식 정보</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B' }}>✕</button>
        </div>

        {/* 배너 */}
        {isSuccess ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: '0 0 2px' }}>🎉 미션 성공! 주식이 적립되었어요</p>
            <p style={{ fontSize: 11, color: '#16A34A', margin: 0 }}>아래 주식이 {detail.estimatedShares} 적립 완료되었습니다</p>
          </div>
        ) : (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#B45309', margin: '0 0 2px' }}>미션을 지키고 꼭 지급받으세요!</p>
            <p style={{ fontSize: 11, color: '#D97706', margin: 0 }}>실패 시에는 리워드가 적립되지 않고 회수됩니다</p>
          </div>
        )}

        {/* 주식 차트 카드 */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {stockLoading ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '24px 0' }}>차트 불러오는 중...</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 2px' }}>지급 예정 주식</p>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>{stockInfo?.name ?? detail.tickerName}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color, margin: '0 0 2px' }}>{fmt(stockInfo?.currentPrice ?? 0)}원</p>
                  <p style={{ fontSize: 11, color, fontWeight: 600, margin: 0 }}>
                    {(stockInfo?.changeAmount ?? 0) >= 0 ? '+' : ''}{fmt(stockInfo?.changeAmount ?? 0)}원 ({stockInfo?.changeRate?.toFixed(1) ?? '0'}%)
                  </p>
                </div>
              </div>
              {closes.length > 1 && (
                <div style={{ width: '100%' }}>
                  <svg width="100%" height="90" viewBox="0 0 300 80" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#${gradId})`} />
                    <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="300" cy={lastY} r="4" fill={color} />
                    <circle cx="300" cy={lastY} r="7" fill={color} opacity="0.2" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: 9, color: '#94A3B8' }}>{stockInfo?.chart[0]?.date}</span>
                    <span style={{ fontSize: 9, color: '#94A3B8' }}>{stockInfo?.chart[stockInfo.chart.length - 1]?.date}</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, background: isUp ? '#FEF2F2' : '#EFF6FF', borderRadius: 8, padding: '5px 10px' }}>
                <span style={{ fontSize: 10, color, fontWeight: 700 }}>
                  {isUp ? '▲' : '▼'} 현재 {fmt(stockInfo?.currentPrice ?? 0)}원 · 오늘 {stockInfo?.changeRate?.toFixed(1) ?? '0'}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* 절약 공식: [이모지 N개] = 종목 N주 */}
        <div style={{ background: '#F0F9FF', border: '2px solid #0095DB', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: 130 }}>
              {savedEmojis.map(i => <span key={i} style={{ fontSize: 22 }}>{categoryEmoji}</span>)}
              {savedCount > 8 && <span style={{ fontSize: 12, color: '#64748B', alignSelf: 'center' }}>+{savedCount - 8}</span>}
            </div>
            {detail.weeklyBaseline !== undefined && (
              <span style={{ fontSize: 10, color: '#0095DB', fontWeight: 700 }}>
                {detail.weeklyBaseline}잔 → {detail.target}잔 ({savedCount}잔 절약)
              </span>
            )}
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#0095DB' }}>=</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{detail.tickerName}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#1E293B' }}>{detail.estimatedShares}</span>
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: isSuccess ? '#16A34A' : '#0095DB', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
          {isSuccess ? '✓ 확인' : '확인'}
        </button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function ChallengeAlarmModal({ detail, userName, onClose }: Props) {
  const [suggesting, setSuggesting] = useState(false);
  const [showChartDetail, setShowChartDetail] = useState(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // 차트 뷰 열릴 때 주식 데이터 fetch
  useEffect(() => {
    if (!showChartDetail || stockInfo || stockLoading) return;
    setStockLoading(true);
    getStockInfo(detail.tickerName)
      .then(s => setStockInfo(s))
      .finally(() => setStockLoading(false));
  }, [showChartDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  const isActive  = detail.weeklyStatus === 'ACTIVE';
  const isSuccess = detail.weeklyStatus === 'SUCCESS';
  const isFailed  = detail.weeklyStatus === 'FAILED';

  const savedCount     = detail.weeklyBaseline !== undefined ? Math.max(0, detail.weeklyBaseline - detail.target) : 5;
  const categoryEmoji  = getCategoryEmoji(detail.category);
  const savedEmojis    = Array.from({ length: Math.min(savedCount, 8) }, (_, i) => i);

  async function handleNewMission() {
    setSuggesting(true);
    try { await suggestNewChallenge(); } catch { /* ignore */ }
    setSuggesting(false);
    onClose();
  }

  // ── 차트 뷰 ──
  if (showChartDetail) {
    return (
      <StockChartView
        detail={detail}
        savedCount={savedCount}
        categoryEmoji={categoryEmoji}
        savedEmojis={savedEmojis}
        stockInfo={stockInfo}
        stockLoading={stockLoading}
        isSuccess={isSuccess}
        onBack={() => setShowChartDetail(false)}
        onClose={onClose}
      />
    );
  }

  // ── 헤더 색상 / 문구 (상태별) ──
  const headerBg    = isSuccess ? '#16A34A' : isFailed ? '#64748B' : '#00BFFF';
  const headerTitle = isActive
    ? `${userName}님의 이번주 미션 연관 결제가 발생했어요`
    : isSuccess
    ? `${userName}님, 이번주 미션 성공했어요! 🎉`
    : `${userName}님의 이번주 미션이 종료됐어요`;

  // ── SUCCESS 메인 모달 ──
  if (isSuccess) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 375, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 32, overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
          {/* 초록 헤더 */}
          <div style={{ background: headerBg }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{headerTitle}</span>
            </div>
            <WaveBar topColor={headerBg} />
          </div>

          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 성공 축하 배너 */}
            <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 4px' }}>🏆</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#166534', margin: '0 0 4px' }}>미션 달성!</p>
              <p style={{ fontSize: 13, color: '#15803D', margin: 0 }}>{detail.title}</p>
            </div>

            {/* 칠판 (미션 제목) */}
            <div style={{ background: '#1F3F30', border: '4px solid #8B5A2B', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: 'inset 0 0 8px rgba(0,0,0,0.4)' }}>
              <img src={missionpori} alt="Pori" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: '#F8FAF6', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{detail.title}</p>
            </div>

            {/* day 트래커 + 완료 바 */}
            <div style={{ background: BLUE_LIGHT, borderRadius: 12, padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                {detail.dailyLogs.map(log => <EmojiCell key={log.day} log={log} />)}
              </div>
              <ProgressBar progressPercent={100} weeklyStatus="SUCCESS" />
            </div>

            {/* 리워드 안내 */}
            <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, color: '#15803D', fontWeight: 600, margin: '0 0 2px' }}>🎁 지급 예정 리워드</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#166534', margin: 0 }}>{detail.tickerName} {detail.estimatedShares}</p>
              </div>
              <button onClick={() => setShowChartDetail(true)} style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                주식 받기 →
              </button>
            </div>

            <button onClick={onClose} style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: '#16A34A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FAILED 메인 모달 ──
  if (isFailed) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 375, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 32, overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
          {/* 회색 헤더 */}
          <div style={{ background: headerBg }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{headerTitle}</span>
            </div>
            <WaveBar topColor={headerBg} />
          </div>

          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 실패 메시지 */}
            <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 4px' }}>😢</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#991B1B', margin: '0 0 4px' }}>아쉽게 실패했어요</p>
              <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>다음엔 꼭 성공할 수 있어요! 포기하지 마세요</p>
            </div>

            {/* 칠판 */}
            <div style={{ background: '#1F3F30', border: '4px solid #8B5A2B', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: 'inset 0 0 8px rgba(0,0,0,0.4)' }}>
              <img src={missionpori} alt="Pori" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: '#F8FAF6', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{detail.title}</p>
            </div>

            {/* day 트래커 + 최종 바 */}
            <div style={{ background: BLUE_LIGHT, borderRadius: 12, padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                {detail.dailyLogs.map(log => <EmojiCell key={log.day} log={log} />)}
              </div>
              <ProgressBar progressPercent={detail.progressPercent} weeklyStatus="FAILED" />
            </div>

            {/* AI 코멘트 */}
            <div style={{ background: '#F0F9FF', border: '1.5px solid #0095DB', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>{detail.aiComment}</p>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: '#F1F5F9', color: '#475569', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                닫기
              </button>
              <button onClick={handleNewMission} disabled={suggesting} style={{ flex: 2, padding: '14px 0', borderRadius: 12, background: '#0095DB', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: suggesting ? 0.7 : 1 }}>
                {suggesting ? '처리 중...' : '새 미션 도전하기 →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE 메인 모달 ──
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 375, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 32, overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        {/* 파란 헤더 */}
        <div style={{ background: headerBg }}>
          <div style={{ padding: '16px 16px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{headerTitle}</span>
          </div>
          <WaveBar topColor={headerBg} />
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 칠판 */}
          <div style={{ background: '#1F3F30', border: '4px solid #8B5A2B', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: 'inset 0 0 8px rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.1)' }}>
            <img src={missionpori} alt="Pori" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
            <p style={{ fontSize: 17, fontWeight: 700, color: '#F8FAF6', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{detail.title}</p>
          </div>

          {/* day 트래커 + 진행 바 (50/80/90 마커 포함) */}
          <div style={{ background: BLUE_LIGHT, borderRadius: 12, padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
              {detail.dailyLogs.map(log => <EmojiCell key={log.day} log={log} />)}
            </div>
            <ProgressBar progressPercent={detail.progressPercent} weeklyStatus="ACTIVE" />
          </div>

          {/* 보상 배지 + 자세히 보기 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ background: 'linear-gradient(135deg, #FFFDF0, #FEF3C7)', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>🏆 성공 시 {detail.tickerName} {detail.estimatedShares}</span>
            </div>
            <button onClick={() => setShowChartDetail(true)} style={{ fontSize: 12, fontWeight: 700, color: '#0095DB', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px' }}>
              자세히 보기 ❯
            </button>
          </div>

          {/* AI 코멘트 */}
          <div style={{ background: '#F0F9FF', border: '1.5px solid #0095DB', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>{detail.aiComment}</p>
          </div>

          <button onClick={onClose} style={{ padding: '12px 36px', borderRadius: 12, background: '#0095DB', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, alignSelf: 'center' }}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
