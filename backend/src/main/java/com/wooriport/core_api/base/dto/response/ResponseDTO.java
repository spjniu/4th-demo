package com.wooriport.core_api.base.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ResponseDTO<T> {
    private Integer status;     // HTTP 상태 코드
    private boolean success;    // 성공 여부
    private String message;     // 설명 메시지
    private T data;             // 실제 응답 데이터

    public static <T> ResponseDTO<T> success(int status, String message, T data) {
        return new ResponseDTO<>(status, true, message, data);
    }

    public static <T> ResponseDTO<T> fail(int status, String message) {
        return new ResponseDTO<>(status, false, message, null);
    }
}