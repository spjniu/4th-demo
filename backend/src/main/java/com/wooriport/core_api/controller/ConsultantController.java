package com.wooriport.core_api.controller;

import com.wooriport.core_api.base.dto.consultant.*;
import com.wooriport.core_api.base.dto.response.ResponseDTO;
import org.springframework.http.HttpStatus;
import com.wooriport.core_api.config.security.CustomUserDetails;
import com.wooriport.core_api.service.ConsultantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Consultant", description = "AI 컨설턴트 BFF API")
@RestController
@RequestMapping("/api/v1/consultant")
@RequiredArgsConstructor
public class ConsultantController {

    private final ConsultantService consultantService;

    @Operation(
            summary = "목표 분석",
            description = "사용자 목표를 분석해 salary/portfolio 중 어떤 재설정이 필요한지 판단합니다."
    )
    @PostMapping("/analyze")
    public ResponseEntity<ResponseDTO<ConsultantAnalyzeResponseDto>> analyze(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ConsultantAnalyzeRequestDto request) {

        return ResponseEntity.ok(ResponseDTO.success(200, "목표 분석 성공",
                consultantService.analyze(userDetails.getUserId(), request)));
    }

    @Operation(
            summary = "재설정 제안",
            description = "분석 결과(action)를 바탕으로 월급 배분 또는 포트폴리오 재설정 안을 생성합니다."
    )
    @PostMapping("/propose")
    public ResponseEntity<ResponseDTO<ConsultantProposeResponseDto>> propose(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ConsultantProposeRequestDto request) {

        return ResponseEntity.ok(ResponseDTO.success(200, "재설정 제안 성공",
                consultantService.propose(userDetails.getUserId(), request)));
    }

    @Operation(
            summary = "재설정 적용",
            description = "AI 제안 결과를 실제 포트폴리오/투자 금액에 반영합니다. 백엔드가 DB에서 assetId를 직접 조회해 적용합니다."
    )
    @PostMapping("/apply")
    public ResponseEntity<ResponseDTO<Void>> apply(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ConsultantApplyRequestDto request) {

        consultantService.apply(userDetails.getUserId(), request);
        return ResponseEntity.ok(ResponseDTO.success(200, "재설정 적용 성공", null));
    }
}
