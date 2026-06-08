// 미션 위젯 — 소비 기반 추천 미션(미시작/진행중) + 삼색 진행바
import type { MissionView } from './shared';

const THREE_COLOR_BAR_BG = 'linear-gradient(to right, #10B981 33%, #FBBF24 33% 66%, #EF4444 66%)';

export default function MissionWidget({ mission, progress, onStart, onPause }: {
  mission: MissionView;
  progress: number;
  onStart: () => void;
  onPause: () => void;
}) {
  const { icon, title, savings } = mission;
  const isProgressing = progress > 0;

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
        /* 상태 1 — 미션 없음 (progress === 0) */
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
                {icon} {title}
              </p>
            </div>
          </div>

          {/* 삼색 진행바 (초록/노랑/빨강 3등분, 고정) */}
          <div style={{ height: 10, background: THREE_COLOR_BAR_BG, borderRadius: 99, marginTop: 4 }} />

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
              onClick={onStart}
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
        /* 상태 2 — 미션 진행중 (progress > 0) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>이번주 미션</span>
            <div style={{ background: '#FFD700', borderRadius: 8, padding: '3px 8px' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#713F12' }}>🏆 성공 시 {savings}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</span>
          </div>

          {/* 삼색 진행바 + 흰 점 */}
          <div style={{ position: 'relative', height: 10, background: THREE_COLOR_BAR_BG, borderRadius: 99, margin: '8px 0 4px' }}>
            <div style={{
              position: 'absolute',
              left: `${Math.min(100, progress)}%`,
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
              {progress}% 달성중
            </span>
            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>100%</span>
          </div>

          {/* 중앙 일시정지 버튼만 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <button
              onClick={onPause}
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
}
