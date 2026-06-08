package com.wooriport.core_api.base.dto.consultant;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ConsultantProposeRequestDto {

    @NotBlank
    private String userGoal;

    @NotBlank
    private String action;  // "salary" | "portfolio"
}
