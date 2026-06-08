package com.wooriport.core_api.base.dto.consultant;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

import java.util.List;

@Getter
public class ConsultantApplyRequestDto {

    @NotBlank
    private String action;  // "salary" | "portfolio"

    private List<SalaryAllocation> salaryAllocations;
    private List<PortfolioItem> portfolio;

    @Getter
    public static class SalaryAllocation {
        private String purpose;
        private int plannedAmount;
        private int ratio;
    }

    @Getter
    public static class PortfolioItem {
        private String assetType;
        private int ratio;
    }
}
