package com.wooriport.core_api.base.dto.transfer;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class TransferExecutionResponseDto {
    private int executedCount;
    private int failedCount;
    private Long totalAmount;
    private List<ExecutionResult> results;

    @Getter
    @Builder
    public static class ExecutionResult {
        private UUID executionId;
        private UUID toAssetId;
        private String institution;
        private Long amount;
        private String status;       // COMPLETED / FAILED
        private String failReason;   // 실패 시 사유 (nullable)
    }
}
