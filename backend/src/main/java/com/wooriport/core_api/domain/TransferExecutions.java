package com.wooriport.core_api.domain;

import com.wooriport.core_api.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transfer_executions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class TransferExecutions extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private TransferPlans plan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    // 출금 통장
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_asset_id", nullable = false)
    private Assets fromAsset;

    // 입금 통장
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_asset_id", nullable = false)
    private Assets toAsset;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ExecutionStatus status = ExecutionStatus.PENDING;

    // 실제 이체 완료 시각 (COMPLETED일 때 채워짐)
    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    // 비즈니스 메서드
    public void complete() {
        this.status = ExecutionStatus.COMPLETED;
        this.executedAt = LocalDateTime.now();
    }

    public void fail() {
        this.status = ExecutionStatus.FAILED;
    }

    public boolean isCompleted() {
        return this.status == ExecutionStatus.COMPLETED;
    }

    public enum ExecutionStatus {
        PENDING, COMPLETED, FAILED
    }
}
