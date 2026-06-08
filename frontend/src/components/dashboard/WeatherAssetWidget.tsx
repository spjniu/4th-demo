// 자산 날씨 위젯 — 예산 초과율에 따라 날씨 테마가 바뀌는 총자산 카드
import type { DashboardData } from '../../api/dashboardApi';
import sunnyImg from '../../assets/sunny.png';
import rainImg from '../../assets/rain.png';
import cloudyImg from '../../assets/cloudy.png';
import tornadoImg from '../../assets/tornado .png';

type WeatherType = 'sunny' | 'cloudy' | 'rain' | 'tornado';

function getWeatherState(dashboard: DashboardData): WeatherType {
  const { totalExpense, lastMonthExpense } = dashboard.consumption;
  if (lastMonthExpense <= 0) return 'sunny';   // 비교할 저번 달 데이터 없음
  const over = (totalExpense - lastMonthExpense) / lastMonthExpense;
  if (over <= 0) return 'sunny';      // 저번 달 이하
  if (over <= 0.10) return 'cloudy';  // 0~10% 초과
  if (over <= 0.20) return 'rain';    // 10~20% 초과
  return 'tornado';                   // 20% 초과
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

export default function WeatherAssetWidget({ dashboard }: { dashboard: DashboardData }) {
  const weather = getWeatherState(dashboard);
  const cfg = WEATHER_CONFIG[weather];
  const total = dashboard.assetsSummary.totalBalance;
  const invest = dashboard.assetsSummary.investmentBalance;
  const cash = dashboard.assetsSummary.cashBalance;
  const fmtM = (n: number) => `${Math.round(n / 10000).toLocaleString()}만`;

  // 이번 주 요일별 실제 지출 (백엔드 weeklyExpenses: [월,화,수,목,금,토,일])
  const weekly = dashboard.consumption.weeklyExpenses ?? [];
  const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = (new Date().getDay() + 6) % 7;   // JS 일=0…토=6 → 월=0…일=6 로 변환
  const weekdays = WEEKDAY_LABELS.map((label, i) => ({ label, amt: weekly[i] ?? 0, isToday: i === todayIdx }));

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
              <p style={{ margin: '0 0 3px', fontSize: 9, opacity: w.isToday ? 1 : 0.7, fontWeight: w.isToday ? 700 : 400 }}>{w.label}</p>
              <div style={{
                height: 28, borderRadius: 6,
                background: w.isToday ? '#fff' : 'rgba(255,255,255,0.25)',
                border: w.isToday ? '1.5px solid rgba(255,255,255,0.9)' : 'none',
                boxShadow: w.isToday ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 9, fontWeight: w.isToday ? 800 : 700, color: w.isToday ? '#0f172a' : '#fff' }}>{fmtM(w.amt)}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 9, opacity: 0.6, textAlign: 'right' }}>이번 주 요일별 지출</p>
      </div>
    </div>
  );
}
