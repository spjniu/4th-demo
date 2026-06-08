package com.wooriport.core_api.service;

import com.wooriport.core_api.base.dto.consultant.*;
import com.wooriport.core_api.base.dto.dashboard.DashboardResponseDto;
import com.wooriport.core_api.domain.PortfolioFlows;
import com.wooriport.core_api.domain.Portfolios;
import com.wooriport.core_api.domain.Users;
import com.wooriport.core_api.repository.PortfolioFlowRepository;
import com.wooriport.core_api.repository.PortfolioRepository;
import com.wooriport.core_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultantService {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final PortfolioFlowRepository portfolioFlowRepository;
    private final WebClient webClient;

    @Value("${flask.ml-url}")
    private String flaskMlUrl;

    private static final List<String> INVEST_KEYWORDS =
            List.of("ETF", "주식", "투자", "채권", "적금", "예금", "저축", "현금성", "파킹", "CMA", "IRP", "연금", "비상금");

    // ──────────────────────────────────────
    // POST /consultant/analyze
    // ──────────────────────────────────────
    public ConsultantAnalyzeResponseDto analyze(UUID userId, ConsultantAnalyzeRequestDto request) {
        Map<String, Object> body = new HashMap<>();
        body.put("user_goal", request.getUserGoal());
        body.put("dashboard_snapshot", buildSnapshot(userId));

        Map<String, Object> res = callFlask("/consultant/analyze", body);
        return ConsultantAnalyzeResponseDto.builder()
                .action((String) res.get("action"))
                .reasoning((String) res.get("reasoning"))
                .build();
    }

    // ──────────────────────────────────────
    // POST /consultant/propose
    // ──────────────────────────────────────
    public ConsultantProposeResponseDto propose(UUID userId, ConsultantProposeRequestDto request) {
        Map<String, Object> body = new HashMap<>();
        body.put("user_goal", request.getUserGoal());
        body.put("action", request.getAction());
        body.put("dashboard_snapshot", buildSnapshot(userId));

        Map<String, Object> res = callFlask("/consultant/propose", body);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawAllocations =
                (List<Map<String, Object>>) res.getOrDefault("salary_allocations", List.of());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawPortfolio =
                (List<Map<String, Object>>) res.getOrDefault("portfolio", List.of());

        List<ConsultantProposeResponseDto.SalaryAllocation> salaryAllocations = rawAllocations.stream()
                .map(a -> ConsultantProposeResponseDto.SalaryAllocation.builder()
                        .purpose((String) a.getOrDefault("purpose", "기타"))
                        .plannedAmount(toInt(a.get("plannedAmount")))
                        .ratio(toInt(a.get("ratio")))
                        .build())
                .collect(Collectors.toList());

        List<ConsultantProposeResponseDto.PortfolioItem> portfolio = rawPortfolio.stream()
                .map(p -> ConsultantProposeResponseDto.PortfolioItem.builder()
                        .assetType((String) p.getOrDefault("assetType", ""))
                        .ratio(toInt(p.get("ratio")))
                        .build())
                .collect(Collectors.toList());

        return ConsultantProposeResponseDto.builder()
                .summary((String) res.getOrDefault("summary", ""))
                .explanation((String) res.getOrDefault("explanation", ""))
                .salaryAllocations(salaryAllocations)
                .portfolio(portfolio)
                .build();
    }

    // ──────────────────────────────────────
    // POST /consultant/apply
    // ──────────────────────────────────────
    @Transactional
    public void apply(UUID userId, ConsultantApplyRequestDto request) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userId));

        List<Portfolios> currentPortfolios = portfolioRepository.findByUserId(userId);
        long currentInvestAmount = user.getMonthlyInvestAmount() == null ? 0L : user.getMonthlyInvestAmount();
        long monthlyIncome = user.getSalary() == null ? 0L : user.getSalary();

        long newInvestAmount;

        if ("portfolio".equals(request.getAction())
                && request.getPortfolio() != null
                && !request.getPortfolio().isEmpty()) {

            // AI가 제안한 비율로 각 자산의 투자 금액 재계산
            newInvestAmount = currentInvestAmount > 0
                    ? currentInvestAmount
                    : Math.round(monthlyIncome * 0.2);

            final long portfolioInvestAmount = newInvestAmount;
            portfolioRepository.deleteByUserId(userId);

            List<Portfolios> newPortfolios = request.getPortfolio().stream()
                    .map(p -> currentPortfolios.stream()
                            .filter(port -> port.getAsset() != null &&
                                    port.getAsset().getAssetType().name().equals(p.getAssetType()))
                            .findFirst()
                            .map(port -> Portfolios.builder()
                                    .user(user)
                                    .asset(port.getAsset())
                                    .assetAmount(Math.round((double) portfolioInvestAmount * p.getRatio() / 100))
                                    .build())
                            .orElse(null))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            portfolioRepository.saveAll(newPortfolios);

        } else {
            // salary action: AI 제안 배분 중 투자성 항목 합계 → 새 투자 금액
            newInvestAmount = request.getSalaryAllocations() == null ? 0L
                    : request.getSalaryAllocations().stream()
                            .filter(a -> a.getPurpose() != null &&
                                    INVEST_KEYWORDS.stream().anyMatch(kw -> a.getPurpose().contains(kw)))
                            .mapToLong(a -> (long) a.getPlannedAmount())
                            .sum();

            if (newInvestAmount <= 0) {
                newInvestAmount = currentInvestAmount > 0
                        ? currentInvestAmount
                        : Math.round(monthlyIncome * 0.2);
            }

            // 기존 비율 유지하며 금액만 재계산
            if (currentInvestAmount > 0 && !currentPortfolios.isEmpty()) {
                final long finalNewInvestAmount = newInvestAmount;
                currentPortfolios.forEach(p ->
                        p.updateAmount(p.getAssetAmount() * finalNewInvestAmount / currentInvestAmount));
            }
        }

        // portfolioFlow 금액 비례 재계산
        if (currentInvestAmount > 0 && newInvestAmount != currentInvestAmount) {
            final long finalNewInvestAmount = newInvestAmount;
            portfolioFlowRepository.findAllByUserIdWithItems(userId).stream()
                    .filter(flow -> flow.getAmount() != null)
                    .forEach(flow ->
                            flow.updateAmount(flow.getAmount() * finalNewInvestAmount / currentInvestAmount));
        }

        user.updateMonthlyInvestAmount(newInvestAmount);
        log.info("[ConsultantService] apply — userId: {}, action: {}, {}원 → {}원",
                userId, request.getAction(), currentInvestAmount, newInvestAmount);
    }

    // ──────────────────────────────────────
    // 대시보드 스냅샷 구성 (AI 서버 전달용)
    // ──────────────────────────────────────
    private Map<String, Object> buildSnapshot(UUID userId) {
        DashboardResponseDto dashboard = dashboardService.getDashboard(userId);
        DashboardResponseDto.SalaryPlan sp = dashboard.getSalaryPlan();

        List<Map<String, Object>> allocations = sp.getAllocations() == null
                ? List.of()
                : sp.getAllocations().stream().map(a -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("purpose", a.getPurpose() != null ? a.getPurpose() : "기타");
                    m.put("plannedAmount", a.getPlannedAmount() != null ? a.getPlannedAmount() : 0);
                    m.put("ratio", sp.getMonthlyIncome() != null && sp.getMonthlyIncome() > 0
                            ? (int) Math.round((a.getPlannedAmount() != null ? a.getPlannedAmount() : 0)
                                    * 100.0 / sp.getMonthlyIncome())
                            : 0);
                    return m;
                }).collect(Collectors.toList());

        Map<String, Object> salaryPlan = new HashMap<>();
        salaryPlan.put("monthlyIncome", sp.getMonthlyIncome());
        salaryPlan.put("investmentAmount", sp.getInvestmentAmount());
        salaryPlan.put("allocations", allocations);

        List<Map<String, Object>> portfolioItems = dashboard.getPortfolio() == null
                ? List.of()
                : dashboard.getPortfolio().stream().map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("categoryLabel", p.getCategoryLabel());
                    m.put("ratio", p.getRatio() != null ? p.getRatio() : 0);
                    return m;
                }).collect(Collectors.toList());

        long totalExpense = dashboard.getConsumption() != null
                && dashboard.getConsumption().getTotalExpense() != null
                ? dashboard.getConsumption().getTotalExpense() : 0L;

        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("salaryPlan", salaryPlan);
        snapshot.put("portfolio", portfolioItems);
        snapshot.put("totalExpense", totalExpense);
        return snapshot;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callFlask(String path, Map<String, Object> body) {
        try {
            Map<String, Object> response = webClient.post()
                    .uri(flaskMlUrl + path)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            if (response == null) throw new IllegalStateException("AI 서버 응답이 없습니다.");
            return response;
        } catch (Exception e) {
            log.error("AI 서버 호출 실패 [{}]: {}", path, e.getMessage());
            throw new IllegalStateException("AI 서버 호출 실패: " + e.getMessage(), e);
        }
    }

    private int toInt(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return n.intValue();
        return 0;
    }
}
