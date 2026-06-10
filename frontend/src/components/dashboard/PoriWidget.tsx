import { useState, useRef } from 'react';
import { getDashboard, type DashboardData } from '../../api/dashboardApi';
import { fetchProposal, applyProposal, type Proposal } from '../../api/poriApi';
import portiImg from '../../assets/porti.png';

type PoriStep = 'input' | 'loading' | 'preview' | 'applying' | 'done';

interface PoriWidgetProps {
  dashboard: DashboardData;
  onDashboardUpdate: (d: DashboardData) => void;
}

export default function PoriWidget({ dashboard, onDashboardUpdate }: PoriWidgetProps) {
  const [poriOpen, setPoriOpen] = useState(false);
  const [poriStep, setPoriStep] = useState<PoriStep>('input');
  const [poriMessage, setPoriMessage] = useState('');
  const [poriProposal, setPoriProposal] = useState<Proposal | null>(null);
  const [poriError, setPoriError] = useState<string | null>(null);
  const poriInputRef = useRef<HTMLTextAreaElement>(null);

  const openPori = () => {
    setPoriOpen(true);
    setPoriStep('input');
    setPoriMessage('');
    setPoriProposal(null);
    setPoriError(null);
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      {!poriOpen && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: 375,
          pointerEvents: 'none', zIndex: 400,
        }}>
          <button
            onClick={openPori}
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

      {/* Pori 모달 */}
      {poriOpen && (
        <div
          onClick={() => { if (poriStep === 'input') setPoriOpen(false); }}
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
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 18px' }} />

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
                        onDashboardUpdate(fresh);
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

            {poriStep === 'applying' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🐥</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>대시보드 업데이트 중...</p>
              </div>
            )}

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
    </>
  );
}
