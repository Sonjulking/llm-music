import torch
import warnings

# [2025-09-11] 주석 유지: 경고 메시지 억제
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=DeprecationWarning)

# [3] 설정 로드 (Configuration)
# 앱이 시작될 때 환경변수나 상수들을 메모리에 올립니다.

# 사용할 AI 모델의 이름 지정
MODEL_NAME = 'gemma3:27b'

# LLM 추론 속도 최적화를 위한 전역 옵션 (M4 Pro 메모리 대역폭 절약 및 속도 향상용)
OLLAMA_OPTIONS = {
    # "num_ctx": 4096,
    # "num_predict": 512,
    # "temperature": 0.7
}

# 음악 벡터 데이터베이스가 저장될 로컬 컴퓨터 내의 폴더 경로입니다.
DB_PATH = "./music_vector_db"
# Mac의 Apple Silicon(MPS) 가속이 가능하면 'mps'를 사용하고, 아니면 기본 'cpu'를 연산 장치로 설정합니다.
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"

# 전체 음악/데이터 분석을 진행할 총 시간(초 단위)을 90초로 설정합니다.
TOTAL_ANALYSIS_DURATION = 90

# 90초의 전체 시간을 쪼개서 분석할 때, 각 조각(세그먼트)의 길이를 15초로 설정합니다
SEGMENT_DURATION = 15

import os
from dotenv import load_dotenv

# .env 파일에서 환경 변수를 불러옵니다.
load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'charset': 'utf8mb4'
}

# 프로그램 전체에서 분석 작업이 동시에 너무 많이 실행되지 않도록 막아주는
# 동기화 장치(세마포어)를 담을 변수입니다. 아직 실행 전이라 빈값(None)을 넣어두었습니다.
GLOBAL_ANALYSIS_SEM = None