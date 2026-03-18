# FastAPI 웹 프레임워크의 핵심 기능을 불러옵니다.
from fastapi import FastAPI
# 다른 도메인(웹사이트)에서 이 서버로 요청을 보낼 수 있도록 보안(CORS)을 설정하는 도구를 불러옵니다.
from fastapi.middleware.cors import CORSMiddleware
# 비동기 환경에서 서버가 켜지거나 꺼질 때 특정 작업을 처리할 수 있게 해주는 도구입니다.
from contextlib import asynccontextmanager
# 비동기 프로그래밍을 위한 파이썬 표준 라이브러리를 불러옵니다.
import asyncio
# 앱의 기본 설정(이전에 만든 DEVICE, DB_CONFIG 등이 있는 파일)을 config라는 이름으로 불러옵니다.
import app.core.config as config
# 이전에 우리가 여러 기능(분석, 플레이리스트)을 하나로 묶어둔 멀티탭(api_router)을 불러옵니다.
from app.api.v1.router import api_router


# [2] FastAPI 앱 인스턴스 생성 (Application Factory)
# 설정(Config)을 로드하고, 라우터들을 등록하여 서버 본체를 만듭니다.

# 이 아래의 함수가 서버의 수명 주기(시작과 종료)를 관리하는 함수임을 알려주는 장식(데코레이터)입니다.
@asynccontextmanager
# 서버가 실행될 때(FastAPI 앱이 켜질 때) 동작할 비동기 함수를 정의합니다.
async def lifespan(app: FastAPI):
    # 서버가 켜지면 터미널 창에 어떤 연산 장치(CPU 또는 MPS)로 시작하는지 알림 문구를 출력합니다.
    print(f"🚀 [System] Starting server on {config.DEVICE}...")

    # ★ 이전에 빈값(None)으로 비워두었던 전역 변수에, 드디어 실제 제어기를 할당합니다.
    # 분석 작업이 동시에 '최대 2개'까지만 실행되도록 제한(Semaphore(2))을 거는 부분입니다.
    config.GLOBAL_ANALYSIS_SEM = asyncio.Semaphore(2)

    # 여기까지가 서버가 켜질 때 실행되는 준비 과정이며, yield 이후는 서버가 동작하는 동안 유지됩니다.
    yield


# 실제 FastAPI 웹 서버의 본체(app)를 생성합니다.
# API 설명서에 표시될 제목을 설정하고, 방금 만든 수명 주기(lifespan) 함수를 연결합니다.
app = FastAPI(title="Gemma 3 DNA Music AI DJ", lifespan=lifespan)

# 서버에 중간 처리기(Middleware)를 추가하여 CORS(교차 출처 리소스 공유)를 허용합니다.
# (이 설정이 없으면, 웹 브라우저 화면(프론트엔드)에서 이 서버로 접속을 시도할 때 에러가 발생합니다.)
app.add_middleware(
    CORSMiddleware,
    # 모든 도메인(웹사이트)에서의 접속을 허용합니다. ("*")
    allow_origins=["*"],
    # GET, POST, PUT, DELETE 등 모든 종류의 HTTP 요청 방식을 허용합니다. ("*")
    allow_methods=["*"],
    # 모든 종류의 HTTP 요청 헤더를 허용합니다. ("*")
    allow_headers=["*"],
)

# ★ 메인 앱(벽면 콘센트)에 우리가 미리 만들어둔 기능 묶음 멀티탭(api_router)을 최종적으로 꽂아줍니다.
app.include_router(api_router)
