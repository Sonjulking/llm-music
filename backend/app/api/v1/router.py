from fastapi import APIRouter
from app.api.v1.endpoints import analysis, playlist

# [4] 라우터 통합 (Router Aggregation)
# 여러 갈래로 나뉜 엔드포인트들을 하나로 묶어줍니다.
api_router = APIRouter()
api_router.include_router(analysis.router, tags=["analysis"])
api_router.include_router(playlist.router, tags=["playlist"])
