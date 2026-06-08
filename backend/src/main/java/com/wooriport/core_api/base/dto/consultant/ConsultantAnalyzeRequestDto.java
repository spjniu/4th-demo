package com.wooriport.core_api.base.dto.consultant;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ConsultantAnalyzeRequestDto {

    @NotBlank
    private String userGoal;
}
