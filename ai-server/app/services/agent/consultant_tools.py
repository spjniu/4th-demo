from __future__ import annotations

import logging

from langchain_core.tools import tool

from app.services.agent.tools import get_all_prices
from app.services.rag.retriever import get_products_context

logger = logging.getLogger(__name__)


@tool
async def get_current_rates() -> str:
    """우리은행 현재 예금·적금 최고금리를 조회합니다. salary 재설정 시 저축 상품 추천에 반드시 호출하세요."""
    context = await get_products_context(product_types=["DEPOSIT", "SAVING"], limit_per_type=3)
    return context or "현재 상품 금리 정보를 조회할 수 없습니다."


@tool
async def get_market_snapshot() -> list[dict]:
    """주요 ETF·주식 현재 주가를 조회합니다. 포트폴리오 재설정 시 반드시 호출하세요."""
    prices = await get_all_prices()
    return [{"name": n, "ticker": t, "price_krw": p} for n, t, p in prices]


CONSULTANT_TOOLS = [get_current_rates, get_market_snapshot]
