package com.wooriport.core_api.domain;

import com.wooriport.core_api.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AuditLogs extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    // ORCHESTRATOR / SAVING / TRAVEL / WEDDING / REBALANCE
    @Column(name = "agent_type", nullable = false, length = 50)
    private String agentType;

    // 호출된 MCP Tool 이름 (calc_dsr_ltv, project_savings 등)
    @Column(name = "tool_name", nullable = false, length = 100)
    private String toolName;

    // Tool 호출 파라미터 (JSON)
    @Column(name = "input_params", columnDefinition = "TEXT")
    private String inputParams;

    // Tool 실행 결과 (JSON)
    @Column(name = "output_result", columnDefinition = "TEXT")
    private String outputResult;

    // Claude API 토큰 사용량 (비용 추적)
    @Column(name = "token_used", nullable = false)
    @Builder.Default
    private Integer tokenUsed = 0;
}
