# 프론트엔드 업데이트 사항

## 신규 파일

### Dashboard 위젯 컴포넌트 분리
기존 `Dashboard.tsx`에 인라인으로 작성되어 있던 차트·위젯 코드를 기능별로 분리

| 파일 | 설명 |
|------|------|
| `components/dashboard/shared.ts` | 대시보드 공통 데이터 변환 유틸 (`buildSalarySlices`, `buildSpendingItems`, `buildPortfolioSlices`, `computeConsumption`, `computeMission`) |
| `components/dashboard/charts.tsx` | 공통 차트 컴포넌트 (`DonutChart`, `SalaryDonutChart` 등) |
| `components/dashboard/WeatherAssetWidget.tsx` | 날씨 기반 자산 현황 위젯 |
| `components/dashboard/ConsumptionWidget.tsx` | 소비 현황 위젯 + 상세 드로어 |
| `components/dashboard/SalaryGuideWidget.tsx` | 급여 배분 안내 위젯 |
| `components/dashboard/MissionWidget.tsx` | 소비 미션 위젯 |
| `components/dashboard/InvestmentWidget.tsx` | 투자 현황 위젯 + 상세 드로어 |
| `components/dashboard/TaxSavingWidget.tsx` | 세제 혜택 위젯 + 상세 드로어 |

---

## 수정 파일

### API 계층

| 파일 | 주요 변경 내용 |
|------|-------------|
| `api/consultantApi.ts` | **BFF 전환**: AI 서버 직접 호출(`http://localhost:8000`) → Spring Boot 경유(`/consultant/analyze`, `/consultant/propose`). `salary_allocations` → `salaryAllocations` (camelCase). `analyzeGoal`·`proposeReset` 시그니처에서 `dashboard` 파라미터 제거 |
| `api/poriApi.ts` | **BFF 전환**: `fetchProposal`이 `analyzeGoal` + `proposeReset` 순서 호출로 재구현. `applyProposal`이 기존 `PATCH /dashboard/apply` 대신 `POST /consultant/apply` 호출. `ProposalPortfolioItem`에 `ratio` 필드 추가 (백엔드 apply 전달용) |
| `api/portfolioApi.ts` | `updatePortfolios()` — `portfolios`가 빈 배열일 때 바디에 포함하지 않도록 수정 |
| `api/dashboardApi.ts` | `DashboardConsumption`에 `lastMonthExpense`, `weeklyExpenses` 필드 추가. `DashboardTaxSaving` / `DashboardTaxSavingBar` 인터페이스 신규 추가. `DashboardData`에 `taxSaving` 필드 추가 |
| `api/reportApi.ts` | **전면 재구현**: 기존 stub → 실제 API 호출. `getReportDetail(year, month)` (`GET /reports/{year}/{month}`), `getTaxBenefits()` (`GET /tax-benefits`) 추가. 관련 인터페이스(`ReportDetail`, `AssetSnapshot`, `TaxBenefitResponse` 등) 정의 |
| `api/assetApi.ts` | `deleteAsset(assetId)` 추가 (`DELETE /assets/{assetId}`) |
| `api/userApi.ts` | `getGoal()` (`GET /users/me/goal`), `updateGoal(goal)` (`PATCH /users/me/goal`) 추가. `UserGoal` 인터페이스 정의 |

### 화면 컴포넌트

| 파일 | 주요 변경 내용 |
|------|-------------|
| `screens/Dashboard.tsx` | 인라인 차트/로직 → `components/dashboard/` 위젯으로 교체. `analyzeGoal`·`proposeReset` 직접 호출 → `fetchProposal` / `applyProposal` (poriApi) 사용. `applyProposal` 호출 시 `dashboard` 파라미터 제거 (`dashboard` 없이도 BFF가 서버에서 스냅샷 조회). `deleteAsset` 연동으로 계좌 연결 해제 기능 추가 |
| `screens/Linking.tsx` | 대시보드에서 "+ 새 기관 연동" 진입 시 약관 스텝 스킵 (`location.state.returnTo` 파라미터). 이미 연동된 계좌는 선택 해제 불가(항상 유지). 전체 선택 시 연동된 계좌는 보호 |
| `screens/MonthlyReport.tsx` | 실제 API(`getReportDetail`, `getTaxBenefits`) 연동. 자산 추이·주간 지출·카테고리 지출·세액공제 섹션 구현 |
| `screens/PortiSurvey.tsx` | 관심 테마·목표 저장 (`updateGoal`) 연동. 설문 완료 시 서버에 결과 반영 |

---

## API 변경 사항

### 컨설턴트 BFF 전환

| 구분 | 기존 | 변경 후 |
|------|------|---------|
| analyze 호출 대상 | `http://localhost:8000/consultant/analyze` (AI 서버 직접) | `http://localhost:8080/api/v1/consultant/analyze` (Spring Boot BFF) |
| propose 호출 대상 | `http://localhost:8000/consultant/propose` (AI 서버 직접) | `http://localhost:8080/api/v1/consultant/propose` (Spring Boot BFF) |
| apply 호출 대상 | `POST /dashboard/apply` | `POST /consultant/apply` |
| 요청 바디 필드명 | `salary_allocations` (snake_case) | `salaryAllocations` (camelCase) |

### 신규 API 연동

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/reports/{year}/{month}` | 월간 리포트 상세 조회 |
| GET | `/tax-benefits` | 세제 혜택 조회 |
| DELETE | `/assets/{assetId}` | 자산(계좌) 연결 해제 |
| GET | `/users/me/goal` | 관심 테마·목표 조회 |
| PATCH | `/users/me/goal` | 관심 테마·목표 수정 |
