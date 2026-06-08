# AI 서버 업데이트 사항

## 삭제 파일

| 파일 | 이유 |
|------|------|
| `app/routers/challenge.py` | 미니챌린지 라우터로 통합 (`/mini_challenge/reward`) |
| `app/routers/propose.py` | BFF 전환으로 프론트엔드 → 백엔드(Spring Boot) → AI 서버 경로 변경, `/consultant` 라우터로 대체 |
| `app/schemas/propose.py` | 위와 동일 |

---

## 신규 파일

| 파일 | 설명 |
|------|------|
| `app/services/session.py` | Redis 기반 사용자 세션 관리 (`get_session`, `save_session`, `delete_session`). 미니챌린지에서 이전 제안·소비 데이터·주식 테마를 요청 간에 유지 |
| `app/services/agent/porti_types.py` | 포티 투자 유형 상수 및 헬퍼 (`STABLE_PORTI_TYPES`, `porti_label`) |

---

## 수정 파일

### LLM / 설정

| 파일 | 주요 변경 내용 |
|------|-------------|
| `app/core/config.py` | OpenRouter 관련 상수 제거 (`OPENROUTER_BASE_URL`, `APP_PORT`, `LOG_LEVEL`, `LLM_TEMPERATURE`). 직접 환경변수로 관리 |
| `app/services/agent/llm.py` | OpenRouter 완전 제거 → OpenAI 직접 사용으로 단순화. `USE_OPENAI_DIRECT` 분기, `OPENROUTER_API_KEY`, `_OPENROUTER_HEADERS` 제거. `OPENAI_API_KEY` 환경변수만 사용 |

### 컨설턴트

| 파일 | 주요 변경 내용 |
|------|-------------|
| `app/services/agent/consultant.py` | `_fmt_dashboard()`: `consumption.totalExpense` 중첩 구조 → `totalExpense` 최상위 필드로 변경 (BFF 전환 대응). 여유자금·저축률 계산 추가 (`free_cash = income - totalExpense`, `savings_rate`). 월급 배분 항목에 ratio % 표시 추가. `_ANALYZE_SYSTEM` 프롬프트 강화 (reasoning 2~3문장, 실제 수치 언급 규칙, 미선택 이유 설명 규칙). `analyze_goal`·`propose_reset` 에서 `temperature` 파라미터 제거 |

### 미니챌린지

| 파일 | 주요 변경 내용 |
|------|-------------|
| `app/services/agent/mini_challenge_agent.py` | **세션 기반으로 전환**: `propose_mini_challenge`·`adjust_challenge`가 Redis 세션에서 소비 데이터·테마·이전 제안 목록 읽고 씀. `_invoke_with_tools()` 헬퍼 추가 — LLM이 `get_stock_prices` 툴을 자율 호출한 뒤 structured output 반환. `get_last_proposal(session)` 함수 추가 (reward 엔드포인트에서 세션의 ticker·estimated_saving 재사용). 하드코딩된 `_TICKER_MAP` 제거 |
| `app/routers/mini_challenge.py` | `reward` 엔드포인트: 세션에서 `ticker`·`estimated_saving` 조회 → `get_all_prices`에서 해당 종목 우선 확인 → 세션 삭제. `get_all_prices`·`pick_stock` import를 `services.stock` → `services.agent.tools`로 변경 |
| `app/schemas/mini_challenge.py` | `MiniChallengeResponse`에 `target`·`challenge_sub_type` 필드 추가. `AdjustRequest`에서 `category_expense` 제거 (세션에서 읽음), `feedback` 필드만 유지. `RewardRequest`를 `user_id`만 필요하도록 단순화. `NagResponse`에 `nag_message` 필드 타입 명시 |

### 툴 / 주가

| 파일 | 주요 변경 내용 |
|------|-------------|
| `app/services/agent/tools.py` | **전면 재구성**: 기존 재무 계산 툴(`compound_interest`, `monthly_savings_needed`, `normalize_ratios`, `rebalance_diff`) 제거. yfinance 기반 주가 조회 추가 — `get_all_prices()` (5분 캐시), `pick_stock()` (살 수 있는 주식 최적 선택), `get_stock_prices` LangChain 툴 (LLM이 직접 호출용). `MINI_CHALLENGE_TOOLS = [get_stock_prices]`로 교체 |

### 자산 포트폴리오

| 파일 | 주요 변경 내용 |
|------|-------------|
| `app/services/agent/asset_portfolio.py` | `porti_types` 모듈 활용. `_fmt_mktcap()` 유틸 추가. AI 출력 스키마 확장: `_AccountCommentsOutput`, `_ReflectionOutput` 추가. `AssetPortfolioState`에 `etf_candidates`·`gather_products` 필드 추가 |
| `app/services/agent/portfolio_profile.py` | 포트폴리오 프로파일 서비스 수정 |
| `app/services/agent/rebalance.py` | 리밸런싱 서비스 수정 |

### 스키마

| 파일 | 주요 변경 내용 |
|------|-------------|
| `app/schemas/portfolio.py` | `ProductItem`에 `interest`, `invest_interests`, `porti_type`, `porti_comment`, `invest_assets` 필드 추가. `PortfolioItem`에 `ticker` 필드 추가. `InvestmentPlan`에 `gathering_id`·`gathering_account` Optional 필드 추가 |

### 스크립트 / 의존성

| 파일 | 주요 변경 내용 |
|------|-------------|
| `requirements.txt` | `redis[asyncio]>=5.0.0` 추가 (세션 스토어) |
| `scripts/load_products.py` | **주요 변경** — OpenRouter 임베딩 → OpenAI `text-embedding-3-small`(1536차원)으로 교체. 국채(KRX Bond) 수집 제거. ETF: 1년 수익률 → **3년 CAGR** 계산으로 변경, 레버리지·인버스 ETF 제외, 일평균 거래대금 1억 미만 ETF 제외. FSS 금리: `intr_rate` → **`intr_rate2`(최고우대금리)** 사용. `products` 테이블에 `ticker`, `mktcap`, `avg_trading_value` 컬럼 추가(자동 마이그레이션). 임베딩은 ETF 상품명만 생성 |

---

## API 변경 사항

### 삭제 엔드포인트

| 엔드포인트 | 이유 |
|-----------|------|
| `POST /challenge` | BFF 전환으로 불필요 |
| `POST /challenge/reward` | `/mini_challenge/reward`로 통합 |
| `POST /propose` | `/consultant/analyze`, `/consultant/propose`로 대체 |

### 변경 엔드포인트

| 엔드포인트 | 변경 내용 |
|-----------|---------|
| `POST /consultant/analyze` | 요청 바디: `consumption.totalExpense` 중첩 → `totalExpense` 최상위로 변경 |
| `POST /consultant/propose` | 동일 (`totalExpense` 위치 변경) |
| `POST /mini_challenge/reward` | 요청 바디: 기존 `estimated_saving` 직접 전달 → `user_id`만 전달, 세션에서 ticker·금액 자동 조회 |
| `POST /mini_challenge/adjust` | 요청 바디: `category_expense` 제거 (세션에서 자동 조회), `feedback` 필드만 필요 |

### 환경변수 변경

| 항목 | 기존 | 변경 후 |
|------|------|---------|
| LLM API 키 | `OPENROUTER_API_KEY` | `OPENAI_API_KEY` |
| LLM Base URL | `OPENROUTER_BASE_URL` 환경변수 또는 config 상수 | 제거 (OpenAI 기본 URL 사용) |
| 임베딩 모델 | `nvidia/llama-nemotron-embed-vl-1b-v2:free` (2048차원) | `text-embedding-3-small` (1536차원) |
| 세션 스토어 | 없음 | `REDIS_URL` (redis://localhost:6379) |

---

## 추가 업데이트

### 컨설턴트 툴 호출 추가 (`consultant_tools.py` 신규)

`propose_reset` 호출 시 LLM이 실시간 데이터 툴을 자율 호출하도록 변경.

| 툴 | 설명 | 활용 시점 |
|----|------|---------|
| `get_current_rates()` | 우리은행 예금·적금 최고금리 조회 (products DB) | salary 재설정 시 |
| `get_market_snapshot()` | 주요 ETF·주식 현재 주가 조회 (yfinance) | portfolio 재설정 시 |

- `consultant.py`에 `_invoke_with_tools()` 헬퍼 추가 (mini_challenge 패턴 동일)
- `_SALARY_SYSTEM` / `_PORTFOLIO_SYSTEM` 프롬프트에 툴 호출 의무화 및 실제 데이터 언급 규칙 추가

### PorTI 투자 성향 반영

백엔드 `buildSnapshot()`이 `portiType`·`portiComment` 필드를 추가로 전달.
AI 서버에서 이를 프롬프트에 반영해 성향별 맞춤 제안 생성.

| 항목 | 내용 |
|------|------|
| `_fmt_dashboard()` | `portiType` 있으면 `"투자 성향: CYCLING (투자형_장기형 ...)"` 형태로 컨텍스트 상단 출력 |
| `_ANALYZE_SYSTEM` | 성향 기반 action 판단 기준 추가 (안전형 → salary, 투자형 → portfolio) |
| `_SALARY_SYSTEM` | 성향별 저축·투자 비중 가이드라인 추가 |
| `_PORTFOLIO_SYSTEM` | 성향별 ETF·현금성 비중 가이드라인 추가 |
