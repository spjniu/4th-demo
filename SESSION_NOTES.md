# 세션 정리 노트 (2026-06-09)

## 이번 세션에서 한 작업

### 1. 하드코딩 제거 + 스켈레톤 로딩 적용 (완료)
- `challengeApi.ts` — MOCK_CHALLENGE_DETAIL 제거
- `Dashboard.tsx` — DEV_NOTI_ITEMS 7개 제거, notiLoading 스켈레톤 추가
- `NotificationPanel.tsx` — 하드코딩 body override 제거, loading prop + NotiSkeleton 추가
- `SalaryManagement.tsx` — REASONS/SPEND_REASONS/INVEST_REASONS 제거, agentLoading 스켈레톤 추가
- `PortiSurvey.tsx` — SPENDING_CATEGORIES 제거, agentProfile.categoryExpense 직접 연결

### 2. AgentService.java — generatePrescriptions null guard 추가 (완료)
```java
// generatePrescriptions(): portiType null 시 PortfolioNotSetException 던지도록
if (user.getPortiType() == null) {
    throw new PortfolioNotSetException();
}
```

### 3. asset-portfolio 1개 flow 문제 (원인 파악)
- 원인: `generatePrescriptions` 호출 시 portiType이 null로 전달 → AI에 `"None (None)"` 전달 → AI가 1개 flow만 생성
- 위 null guard로 해결

---

## 발견한 아키텍처 이슈

### POST /agent/rebalance 와 transfer_plans 단절

**현상**: `/salary-management`에서 설문 결과(portiType)가 바뀌어도 월급 분배 금액이 항상 같음

**원인 흐름**:
```
POST /agent/rebalance (recommend)
  → @Transactional(readOnly = true)  ← DB 저장 없음
  → AI 추천값 반환만 함
  → agentReasons 텍스트, agentPlanComments 툴팁에만 사용
  → 금액(rebalancingPlans[].amount)은 화면에 미연결

GET /transfer-plans  ← 화면 금액의 실제 source
  → 초기 /asset-prescription에서 POST /portfolios로 저장한 값
  → 이후 변경 없음 (설문 재실행해도 갱신 안 됨)
```

**팀 레포(최신) 확인 결과**: 동일 구조. 의도적 설계로 보임.

**AI 값이 실제로 저장되는 유일한 경로**:
- `POST /transfer-plans/generate` — 급여 ±5만 이상 변동 시 Flask `/salary` 호출 → `applyAiRebalancing()` → transfer_plans 업데이트

**초기값 설정 경로**:
```
/asset-prescription (AssetPrescription.tsx)
  → getAgentRecommend() 로 AI 추천값 화면에 표시
  → 사용자 확인 클릭
  → createPortfolios() (POST /portfolios) → portfolios.assetAmount 저장
  → 이후 급여 입금 시 transfer_plans에 복사
```

**결론**: `POST /agent/rebalance`는 advisory용(텍스트 코멘트). 실제 금액 반영은 최초 `/asset-prescription` 1회만.

---

## 발견한 버그

### AssetPrescription.tsx — 태그 배지가 assetType으로 표시

**파일**: `frontend/src/screens/AssetPrescription.tsx:129`

**현재 코드**:
```typescript
bank: plan.nickname || plan.assetType,   // ← bank에는 nickname 잘 씀
tag:  plan.assetType,                    // ← tag에는 assetType만 씀 (STOCK, IRP, CREDIT_CARD 로 표시됨)
```

**수정 필요**:
```typescript
tag: plan.nickname || plan.assetType,
```

**추가 이슈**: CREDIT_CARD 계좌가 포트폴리오 배분 대상에 포함됨. 백엔드에서 신용카드 필터링 필요.

---

## 팀 AI 서버 최신 코드 (feat/agent-tool-calling) 비교

### 새로 추가된 것
| 파일 | 내용 |
|------|------|
| `app/db/connection.py` | asyncpg DB 직접 연결 (RAG/미니챌린지 읽기용, rebalance 저장용 아님) |
| `app/routers/salary.py` | `POST /salary` — 급여 변동 시 비율 재조정 |
| `app/services/agent/salary_rebalance.py` | 비율 기반 금액 재조정 + 코멘트 생성 |
| `app/services/rag/` | RAG 검색 기능 |
| LangGraph 도입 | `rebalance.py`가 StateGraph 구조로 리팩토링됨 |

### 차이점 주의
- 팀 버전 `rebalance.py` 프롬프트: `공격형(AGGRESSIVE)`, `균형형(BALANCED)`, `안정형(CONSERVATIVE)` 표기
- 실제 Java가 보내는 값: `FENCING`, `CYCLING`, `JUDO` 등 스포츠 타입명
- **우리 버전이 더 정확**: `porti_label()` 로 변환해서 AI에 전달함

---

## mock-server (exp/kafka-baseline)

두 가지 역할:
1. **Kafka 거래 이벤트 생성기** (`mock_payment.py`) — 카드 결제/급여 입금 이벤트를 Kafka로 발행
2. **AI 서버 대역 Mock FastAPI** (`mock_asset_portfolio.py`) — 실제 AI 서버 대신 포트 8000에서 실행
   - `/portfolio/profile`, `/portfolio/rebalance`, `/portfolio/asset-portfolio` 모의 응답

**주의**: mock `/portfolio/rebalance`는 portiType 완전 무시하고 계좌 타입별 고정 비율 반환.
mock 서버로 테스트 시 설문 결과 달라도 분배 항상 같음.

---

## taehyung_seed.sql 사용법

```powershell
# 1회차 실행 (계정/상품/더미mydata 세팅)
$sql = [System.IO.File]::ReadAllText("C:\ITstudy\final_project\4th-demo\backend\sql\taehyung_seed.sql", [System.Text.Encoding]::UTF8)
$sql | docker exec -i wooriport-db psql -U wooriport -d wooriport

# 앱 플로우: /linking → /salary-select (우리은행 급여통장 지정)

# 2회차 실행 (거래 내역 적재)
# 위 동일 명령 재실행

# 앱 플로우: /porti-survey → /asset-prescription (완료 버튼 클릭!) → /dashboard
```

**portfolios/transfer_plans 초기화 필요 시**:
```sql
DELETE FROM transfer_plans WHERE user_id = (SELECT id FROM users WHERE email = 'taehyung@wooriport.com');
DELETE FROM portfolios WHERE user_id = (SELECT id FROM users WHERE email = 'taehyung@wooriport.com');
```
이후 `/asset-prescription` 다시 통과해야 함.

---

## 남은 작업

- [ ] **AssetPrescription.tsx:129** `tag: plan.assetType` → `tag: plan.nickname || plan.assetType` 수정
- [ ] **신용카드 필터링** — `recommend()` 에서 CREDIT_CARD 계좌를 rebalancingPlans에서 제외 (백엔드)
- [ ] **frontend 병합 마저 완료** (poriApi, reportApi, MissionWidget, Dashboard, MonthlyReport) — todo #6
- [ ] **4th-demo 커밋 & 푸시** — todo #7
- [ ] **팀원 확인 필요**: `recommend()` readOnly 설계가 의도적인지, 향후 transfer_plans 연결 계획 있는지
