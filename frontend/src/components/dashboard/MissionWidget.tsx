// 미니챌린지 위젯 — AI 추천 챌린지 표시 + 난이도/주제 조정 + 시작
import type { ChallengeProposal } from '../../api/challengeApi';
import { getChallengeIcon } from '../../api/challengeApi';

const THREE_COLOR_BAR_BG = 'linear-gradient(to right, #10B981 33%, #FBBF24 33% 66%, #EF4444 66%)';

const fmt = (n: number) => n.toLocaleString('ko-KR');

interface Props {
  proposal: ChallengeProposal | null;  // AI 제안 (null = 로딩 중)
  loading: boolean;
  adjusting: boolean;                   // 조정 API 호출 중
  progress: number;                     // 0 = 미시작, >0 = 진행중
  onStart: () => void;
  onEasier: () => void;
  onHarder: () => void;
  onChangeTopic: () => void;
}

export default function MissionWidget({ proposal, loading, adjusting, progress, onStart, onEasier, onHarder, onChangeTopic }: Props) {
  const isProgressing = progress > 0;
  const isBusy = loading || adjusting;
  const icon = proposal ? getChallengeIcon(proposal) : '💡';

  // ── 진행중 ───────────────────────────────────────────────────
  if (isProgressing && proposal) {
    return (
      <div style={{
        background: '#FFFFFF', border: '1px solid #E0F2FE', borderRadius: 22,
        padding: '16px', boxShadow: '0 2px 12px rgba(0,149,219,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>미니챌린지</span>
          <div style={{ background: '#FFD700', borderRadius: 8, padding: '3px 8px' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#713F12' }}>
              🏆 성공 시 {proposal.ticker} {fmt(Math.round(proposal.estimatedSaving / 78500 * 100) / 100)}주
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{proposal.title}</span>
        </div>

        {/* 삼색 진행바 + 🟡 이모지 */}
        <div style={{ position: 'relative', height: 10, background: THREE_COLOR_BAR_BG, borderRadius: 99, margin: '8px 0 4px' }}>
          <div style={{
            position: 'absolute',
            left: `${Math.min(100, progress)}%`,
            top: '50%',
            transform: 'translate(-50%, -75%)',
            fontSize: 18, lineHeight: 1, pointerEvents: 'none',
            filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.2))',
            transition: 'left 0.3s ease',
          }}>🟡</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>0%</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0095DB' }}>
            벌써 미션에 {progress}%나 도달했어요...
          </span>
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>100%</span>
        </div>
      </div>
    );
  }

  // ── 로딩 중 ───────────────────────────────────────────────────
  if (isBusy || !proposal) {
    return (
      <div style={{
        background: '#FFFFFF', border: '1px solid #E0F2FE', borderRadius: 22,
        padding: '16px', boxShadow: '0 2px 12px rgba(0,149,219,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>⚓ 이번주 추천 미션</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>AI 분석 중...</span>
        </div>
        {/* 스켈레톤 */}
        {[80, 60, 40].map((w, i) => (
          <div key={i} style={{
            height: 14, borderRadius: 7, background: '#E2E8F0',
            width: `${w}%`, marginBottom: 10,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
        <div style={{ height: 10, background: THREE_COLOR_BAR_BG, borderRadius: 99, marginTop: 8, opacity: 0.4 }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
    );
  }

  // ── 미시작: AI 제안 표시 ──────────────────────────────────────
  const savingsLabel = `${proposal.ticker} ~${fmt(proposal.estimatedSaving)}원 절약`;

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E0F2FE', borderRadius: 22,
      padding: '16px', boxShadow: '0 2px 12px rgba(0,149,219,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>⚓ 이번주 추천 미션</span>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Pori의 추천</span>
      </div>

      {/* AI 제안 카드 */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: '#F0F9FF', padding: '10px 12px', borderRadius: 12, marginTop: 10,
      }}>
        <img src="/src/assets/missionpori.png" alt="Pori" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#0095DB', fontWeight: 600 }}>
            "{proposal.description}"
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            {icon} {proposal.title}
          </p>
        </div>
      </div>

      {/* 삼색 바 */}
      <div style={{ height: 10, background: THREE_COLOR_BAR_BG, borderRadius: 99, marginTop: 12 }} />

      {/* 보상 + 변경 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ background: '#FFD700', borderRadius: 8, padding: '4px 10px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#713F12' }}>🏆 {savingsLabel}</span>
        </div>
        <button
          onClick={onChangeTopic}
          disabled={adjusting}
          style={{
            border: 'none', background: '#F1F5F9', borderRadius: 8, padding: '5px 10px',
            fontSize: 10, color: '#475569', fontWeight: 600, cursor: 'pointer', opacity: adjusting ? 0.5 : 1,
          }}
        >
          🔄 다른 미션
        </button>
      </div>

      {/* [쉽게 ▲] [▶ 시작] [어렵게 ▼] */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={onEasier}
          disabled={adjusting}
          style={{
            flex: 1, padding: '10px 0', border: '1px solid #E0F2FE', background: '#FFFFFF',
            borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#64748b',
            cursor: 'pointer', opacity: adjusting ? 0.5 : 1,
          }}
        >
          쉽게 ▲
        </button>
        <button
          onClick={onStart}
          disabled={adjusting}
          style={{
            flex: 2, padding: '10px 0', border: 'none',
            background: adjusting ? '#CBD5E1' : 'linear-gradient(135deg, #0095DB, #00BFFF)',
            borderRadius: 12, fontSize: 12, fontWeight: 800, color: '#FFFFFF',
            cursor: adjusting ? 'not-allowed' : 'pointer',
            boxShadow: adjusting ? 'none' : '0 2px 10px rgba(0,149,219,0.2)',
          }}
        >
          ▶ 시작
        </button>
        <button
          onClick={onHarder}
          disabled={adjusting}
          style={{
            flex: 1, padding: '10px 0', border: '1px solid #E0F2FE', background: '#FFFFFF',
            borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#64748b',
            cursor: 'pointer', opacity: adjusting ? 0.5 : 1,
          }}
        >
          어렵게 ▼
        </button>
      </div>
    </div>
  );
}
