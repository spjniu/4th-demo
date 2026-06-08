from __future__ import annotations

import json
import logging
from typing import Any, TypeVar

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, ToolMessage
from pydantic import BaseModel

from app.schemas.consultant import (
    ResetAllocation,
    ResetAnalyzeRequest,
    ResetAnalyzeResponse,
    ResetPortfolioItem,
    ResetProposeRequest,
    ResetProposeResponse,
)
from app.services.agent.consultant_tools import CONSULTANT_TOOLS
from app.services.agent.llm import ainvoke_structured, get_llm

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

_ANALYZE_SYSTEM = (
    "당신은 개인 재무 관리 AI Pori입니다.\n"
    "사용자 목표를 분석해 월급 배분 재설정(salary)과 투자 포트폴리오 재설정(portfolio) 중 더 적합한 것을 추천합니다.\n\n"
    '반드시 아래 JSON 형식으로만 응답하세요:\n{"action": "salary" 또는 "portfolio", "reasoning": "추천 이유"}\n\n'
    "reasoning 작성 규칙:\n"
    "- 월 소득, 저축률, 여유자금, 지출액 등 제공된 실제 수치를 반드시 언급하세요\n"
    "- 선택한 옵션이 왜 더 적합한지, 선택하지 않은 옵션이 왜 덜 적합한지 모두 설명하세요\n"
    "- 2~3문장으로 구체적으로 작성하세요\n\n"
    "기준:\n"
    "- salary: 저축률이 낮거나 지출 구조 조정이 우선일 때, 특정 목적 자금 마련이 시급할 때\n"
    "- portfolio: 저축률이 충분하지만 투자 수익이 목표 달성에 필요할 때, 자산 배분 불균형이 명확할 때"
)

_SALARY_SYSTEM = (
    "당신은 개인 재무 관리 AI Pori입니다.\n"
    "사용자의 목표와 현재 재무 상황을 바탕으로 월급 배분 비율을 재설정해 주세요.\n\n"
    "반드시 get_current_rates 툴을 호출해 현재 예금·적금 금리를 확인한 뒤,\n"
    "실제 상품명과 금리를 언급하며 저축 항목을 제안하세요.\n\n"
    "반드시 아래 JSON 형식으로만 최종 응답하세요:\n"
    '{"summary":"변경 요약 1문장","explanation":"배분 기준과 실제 상품 금리를 포함한 기대 효과 2-3문장",'
    '"salary_allocations":[{"purpose":"생활비","plannedAmount":1500000,"ratio":50}],"portfolio":[]}\n\n'
    "규칙:\n"
    "- 모든 ratio 합계 = 100\n"
    "- plannedAmount = 월 소득 x (ratio / 100), 원 단위 반올림\n"
    "- 생활비·저축·투자·목표 적금 등 현실적 항목으로 구성 (3~5개)\n"
    "- explanation에 조회한 상품명과 금리를 반드시 포함하세요"
)

_PORTFOLIO_SYSTEM = (
    "당신은 개인 재무 관리 AI Pori입니다.\n"
    "사용자의 목표와 현재 투자 상황을 바탕으로 포트폴리오를 재구성해 주세요.\n\n"
    "반드시 get_market_snapshot 툴을 호출해 현재 ETF 주가를 확인한 뒤,\n"
    "구체적인 종목명을 언급하며 포트폴리오를 제안하세요.\n\n"
    "반드시 아래 JSON 형식으로만 최종 응답하세요:\n"
    '{"summary":"변경 요약 1문장","explanation":"구성 기준과 실제 종목 현황을 포함한 기대 효과 2-3문장",'
    '"salary_allocations":[],"portfolio":[{"assetType":"ETF","ratio":60},{"assetType":"적금","ratio":30},{"assetType":"현금성","ratio":10}]}\n\n'
    "규칙:\n"
    "- 모든 ratio 합계 = 100\n"
    "- 사용자 목표·투자 성향에 맞는 자산 유형 선택 (3~5개)\n"
    "- 자산 유형 예시: ETF, 적금, IRP, 현금성, 해외주식, 채권\n"
    "- explanation에 조회한 종목명을 반드시 포함하세요"
)


def _fmt_dashboard(snap: dict[str, Any]) -> str:
    income = snap.get("salaryPlan", {}).get("monthlyIncome", 0)
    allocs = snap.get("salaryPlan", {}).get("allocations", [])
    portfolio = snap.get("portfolio", [])
    total_expense = snap.get("totalExpense", 0)
    free_cash = income - total_expense if income > 0 else 0
    savings_rate = round(free_cash / income * 100, 1) if income > 0 else 0.0

    alloc_lines = "\n".join(
        f"  - {a.get('purpose','기타')}: {a.get('plannedAmount',0):,}원 ({a.get('ratio',0)}%)"
        for a in allocs
    ) or "  (없음)"

    portfolio_lines = "\n".join(
        f"  - {p.get('categoryLabel','?')}: {p.get('ratio',0)}%"
        for p in portfolio
    ) or "  (없음)"

    return (
        f"월 소득: {income:,}원\n"
        f"이번 달 총 지출: {total_expense:,}원\n"
        f"월 여유자금: {free_cash:,}원\n"
        f"저축률: {savings_rate}%\n"
        f"현재 월급 배분:\n{alloc_lines}\n"
        f"현재 포트폴리오:\n{portfolio_lines}"
    )


async def _invoke_with_tools(
    messages: list[BaseMessage],
    output_schema: type[T],
) -> T | None:
    """LLM이 CONSULTANT_TOOLS를 자율 호출하도록 하고, 결과를 포함해 structured output 반환."""
    llm = get_llm().bind_tools(CONSULTANT_TOOLS)
    response = await llm.ainvoke(messages)

    if response.tool_calls:
        extended: list[BaseMessage] = list(messages) + [response]
        tool_map = {t.name: t for t in CONSULTANT_TOOLS}
        for tc in response.tool_calls:
            if tc["name"] in tool_map:
                try:
                    result = await tool_map[tc["name"]].ainvoke(tc["args"])
                    extended.append(
                        ToolMessage(
                            content=json.dumps(result, ensure_ascii=False, default=str),
                            tool_call_id=tc["id"],
                        )
                    )
                except Exception as e:
                    logger.warning("tool 실행 실패 (%s): %s", tc["name"], e)
        return await ainvoke_structured(extended, output_schema)

    return await ainvoke_structured(messages, output_schema)


class _AnalyzeAI(ResetAnalyzeResponse):
    pass


class _ProposeAI(ResetProposeResponse):
    pass


async def analyze_goal(req: ResetAnalyzeRequest) -> ResetAnalyzeResponse:
    context = f"사용자 목표: {req.user_goal}\n\n{_fmt_dashboard(req.dashboard_snapshot)}"
    result = await ainvoke_structured(
        [SystemMessage(content=_ANALYZE_SYSTEM), HumanMessage(content=context)],
        _AnalyzeAI,
        max_tokens=256,
    )
    if result is None:
        raise ValueError("분석 응답 파싱 실패")
    return ResetAnalyzeResponse(action=result.action, reasoning=result.reasoning)


async def propose_reset(req: ResetProposeRequest) -> ResetProposeResponse:
    system = _SALARY_SYSTEM if req.action == "salary" else _PORTFOLIO_SYSTEM
    income = req.dashboard_snapshot.get("salaryPlan", {}).get("monthlyIncome", 0)
    context = (
        f"사용자 목표: {req.user_goal}\n\n"
        f"{_fmt_dashboard(req.dashboard_snapshot)}\n\n"
        f"월 소득({income:,}원) 기준으로 {'월급 배분' if req.action == 'salary' else '포트폴리오'}을 재설정해 주세요."
    )
    result = await _invoke_with_tools(
        [SystemMessage(content=system), HumanMessage(content=context)],
        _ProposeAI,
    )
    if result is None:
        raise ValueError("제안 응답 파싱 실패")
    return ResetProposeResponse(
        summary=result.summary,
        explanation=result.explanation,
        salary_allocations=[ResetAllocation(**a.model_dump()) for a in result.salary_allocations],
        portfolio=[ResetPortfolioItem(**p.model_dump()) for p in result.portfolio],
    )
