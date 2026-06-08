# 백엔드 업데이트 사항

## 신규 파일

### Consultant BFF
AI 컨설턴트 기능을 프론트엔드가 AI 서버를 직접 호출하던 방식에서 Spring Boot 백엔드를 경유하는 BFF 구조로 전환

| 파일 | 설명 |
|------|------|
| `controller/ConsultantController.java` | POST /consultant/analyze, /propose, /apply |
| `service/ConsultantService.java` | DB 스냅샷 구성 + AI 서버 호출 + apply 적용 |
| `dto/consultant/ConsultantAnalyzeRequestDto.java` | 목표 분석 요청 |
| `dto/consultant/ConsultantAnalyzeResponseDto.java` | 목표 분석 응답 |
| `dto/consultant/ConsultantProposeRequestDto.java` | 재설정 제안 요청 |
| `dto/consultant/ConsultantProposeResponseDto.java` | 재설정 제안 응답 |
| `dto/consultant/ConsultantApplyRequestDto.java` | 재설정 적용 요청 |

### Batch 리팩토링
| 파일 | 설명 |
|------|------|
| `batch/tasklet/AssetSnapshotItemProcessor.java` | 자산 스냅샷 ItemProcessor 분리 |
| `batch/tasklet/AssetSnapshotItemWriter.java` | 자산 스냅샷 ItemWriter 분리 |
| `batch/tasklet/AssetSnapshotTasklet.java` | **삭제** (ItemProcessor/Writer로 분리) |

### 기타 신규
| 파일 | 설명 |
|------|------|
| `dto/stock/` | 주식 관련 DTO |
| `dto/user/UserGoalResponseDto.java` | 사용자 목표 조회 응답 |
| `dto/user/UserGoalUpdateRequestDto.java` | 사용자 목표 수정 요청 |
| `base/exception/AssetDeletionNotAllowedException.java` | 자산 삭제 불가 예외 |
| `controller/StockController.java` | 주식 관련 컨트롤러 |
| `service/YahooFinanceService.java` | Yahoo Finance 주가 조회 서비스 |
| `sql/report_seed.sql` | 리포트 시드 데이터 |
| `sql/taehyung_seed.sql` | 태형 테스트용 시드 데이터 |

---

## 수정 파일

### 서비스 계층

| 파일 | 주요 변경 내용 |
|------|-------------|
| `PortfolioService.java` | `updatePortfolios()` — portfolios 미전달 시 기존 비율 유지하며 금액만 재계산 |
| `DashboardService.java` | 대시보드 조회 로직 보완 |
| `AgentService.java` | 에이전트 서비스 수정 |
| `AssetService.java` | 자산 삭제 예외 처리 추가 |
| `AuthService.java` | 인증 서비스 수정 |
| `PortfolioFlowService.java` | 포트폴리오 플로우 서비스 대폭 확장 |
| `ReportService.java` | 리포트 서비스 확장 |
| `TaxBenefitService.java` | 세금 혜택 서비스 추가 |
| `UsersService.java` | 사용자 서비스 수정 |

### 설정
| 파일 | 주요 변경 내용 |
|------|-------------|
| `config/WebClientConfig.java` | WebClient 설정 수정 |
| `config/security/JwtAuthenticationFilter.java` | JWT 필터 보완 |
| `resources/application.yml` | `flask.ml-url: http://localhost:8000` 추가 |

### DTO / 도메인
| 파일 | 주요 변경 내용 |
|------|-------------|
| `dto/dashboard/DashboardResponseDto.java` | 대시보드 응답 DTO 확장 |
| `dto/portfolio/PortfolioListResponseDto.java` | 포트폴리오 응답 DTO 수정 |
| `dto/report/ReportDetailResponseDto.java` | 리포트 상세 응답 DTO 확장 |
| `domain/Products.java` | Products 도메인 수정 |
| `base/exception/GlobalExceptionHandler.java` | 전역 예외 핸들러 수정 |

### 레포지토리
| 파일 | 주요 변경 내용 |
|------|-------------|
| `repository/AssetSnapshotsRepository.java` | 쿼리 추가 |
| `repository/MiniChallengesRepository.java` | 쿼리 수정 |
| `repository/PortfolioFlowItemRepository.java` | 쿼리 추가 |
| `repository/PortfolioFlowRepository.java` | 쿼리 추가 |
| `repository/PortfolioRepository.java` | 쿼리 추가 |
| `repository/ProductRepository.java` | 쿼리 추가 |
| `repository/TransactionRepository.java` | 쿼리 추가 |

### 컨트롤러
| 파일 | 주요 변경 내용 |
|------|-------------|
| `controller/AssetController.java` | 자산 관련 엔드포인트 추가 |
| `controller/UsersController.java` | 사용자 관련 엔드포인트 추가 |

### Batch
| 파일 | 주요 변경 내용 |
|------|-------------|
| `batch/config/AssetSnapshotJobConfig.java` | Batch Job 설정 변경 |
| `batch/scheduler/AssetSnapshotScheduler.java` | 스케줄러 수정 |
| `batch/scheduler/SalaryTransferScheduler.java` | 스케줄러 수정 |

### SQL
| 파일 | 주요 변경 내용 |
|------|-------------|
| `sql/dashboard_seed.sql` | 시드 데이터 수정 |

---

## API 변경 사항

### 신규 엔드포인트 (BFF)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/v1/consultant/analyze` | 사용자 목표 분석 → action 반환 |
| POST | `/api/v1/consultant/propose` | 재설정 제안 생성 |
| POST | `/api/v1/consultant/apply` | AI 제안 결과 적용 |

> 세 엔드포인트 모두 JWT 인증 필요.  
> 백엔드가 DB에서 직접 대시보드 스냅샷을 구성해 AI 서버(`http://localhost:8000`)로 중계.
