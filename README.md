# 🎵 LLM-Music: Gemma 3 & Sound DNA Analysis Agent

**LLM-Music**은 사용자의 유튜브 플레이리스트를 분석하여 음악적 취향(Sound DNA)을 시각화하고, Gemma 3 (LLM)와 CLAP (Contrastive Language-Audio Pretraining) 모델을 활용해 사용자의 취향과 물리적/감성적으로 최대한 유사하게 일치하는 새로운 곡을 추천해주는 AI 에이전트 프로젝트입니다.

---

## ✨ 핵심 기능 (Key Features)

1.  **유튜브 플레이리스트 분석 **
    *   사용자가 `.txt` 파일로 업로드한 유튜브 링크나, DB에 저장된 재생목록을 자동으로 다운로드 및 분석합니다.
    *   유튜브 링크에서 오디오를 추출하여 물리적 파형 데이터를 수집합니다.

2.  **Sound DNA 시각화 **
    *   **Librosa**를 사용하여 4가지 핵심 오디오 지표를 추출합니다:
        *   **BPM (Tempo):** 음악의 빠르기
        *   **Energy (Zero Crossing Rate):** 사운드의 격렬함과 밀도
        *   **Brightness (Spectral Centroid):** 음색의 밝기 (고음역대 분포)
        *   **Rhythmic Intensity (Onset Strength):** 비트의 명확성 및 리듬감
    *   추출된 데이터는 Radar Chart로 시각화되어 사용자의 음악 성향을 한눈에 보여줍니다.

    ### 📊 오디오 분석 지표 기준 및 과학적 근거
    본 프로젝트에서 사용하는 4가지 핵심 지표는 **Music Information Retrieval (MIR)** 분야의 표준 알고리즘을 기반으로 합니다.

    #### 1. BPM (Tempo) - 음악의 심장박동
    *   **근거:** Tzanetakis, G., & Cook, P. (2002). *Musical genre classification of audio signals*.
    *   **해석:** 120 BPM은 댄스 음악의 표준 템포(Disco/House)로 간주되며, 인간의 보행 속도(약 110-120 steps/min)와 유사하여 '흥분'과 '활동성'을 유발합니다. 반면 90 BPM 미만은 안정시 심박수(60-100)와 겹쳐 편안함을 줍니다.

    #### 2. Brightness (Spectral Centroid) - 소리의 음색
    *   **근거:** Schubert, E., et al. (2004). *The spectral centroid as a physical correlate of brightness*.
    *   **원리:** 주파수 스펙트럼의 무게중심을 계산합니다.
    *   **기준 (2000Hz):**
        *   **High (>2000):** 고음역 배음(Harmonics)이 풍부하여 '챙챙거리는' 금속성 사운드 (예: 일렉기타, 신디사이저).
        *   **Low (<2000):** 기본음이 강하고 따뜻한 사운드 (예: 첼로, 피아노, 베이스).

    #### 3. Energy (Zero Crossing Rate) - 소리의 거칠기
    *   **근거:** Gouyon, F., et al. (2000). *On the use of zero-crossing rate for signal classification*.
    *   **원리:** 파형이 0점을 교차하는 횟수입니다. 타악기나 왜곡(Distortion)된 소리일수록 파형 변화가 급격하여 ZCR이 높습니다.
    *   **적용:** 록이나 EDM처럼 노이즈가 많은 장르를 구분하는 척도로 사용됩니다.

    #### 4. Rhythmic Intensity (Onset Strength) - 비트의 명확성
    *   **근거:** Ellis, D. P. W. (2007). *Beat Tracking by Dynamic Programming*. (Librosa의 기반 알고리즘)
    *   **해석:** 소리의 에너지가 급격히 변하는 지점(Onset)의 평균 강도입니다. 수치가 높을수록 킥 드럼이나 비트가 뚜렷하다는 것을 의미하며, 낮을수록 앰비언트나 클래식처럼 흐르는 듯한 곡임을 나타냅니다.

    ---

    ### 📏 지표 요약표
    | 지표 (Metric)            | 수치 기준 (Threshold) | 해석 (Interpretation) |
            |:-----------------------| :--- | :--- |
    | **BPM**                | 120 이상 | **빠르고 경쾌한** (활동성, 댄스) |
    | (Tempo)                | 90 미만 | **차분하고 느린** (이완, 발라드) |
    | **Energy**             | 0.05 초과 | **강렬하고 자극적인** (타악기/노이즈 성분 다수) |
    | (ZCR)                  | 0.05 이하 | **부드럽고 편안한** (고조파 위주) |
    | **Brightness**         | 2000 초과 | **밝고 화사한** (고주파 성분 우세) |
    | (Spectral Centroid)    | 2000 이하 | **어둡고 묵직한** (저주파 성분 우세) |
    | **Rhythmic Intensity** | 1.0 이상 | **뚜렷한 리듬감** (강한 어택) |
    | (Onset Strength)       | 1.0 미만 | **흐릿한 리듬감** (약한 어택) |

3.  **페르소나 분석**
    *   추출된 물리적 데이터와 곡 메타데이터를 **Gemma 3 (27b)** LLM에게 제공합니다.
    *   AI는 이를 바탕으로 사용자의 "리스너 페르소나"를 정의하고, 취향을 3줄 요약으로 설명해줍니다.

4.  **하이브리드 추천 시스템**
    *   **1단계: LLM Brainstorming** - Gemma 3가 사용자의 취향 키워드를 바탕으로 후보곡 10곡을 1차 선별합니다.
    *   **2단계: Vector Similarity Check** - 후보곡들의 오디오를 실제로 다운로드하여 **CLAP 임베딩**을 생성한 뒤, 사용자의 기존 플레이리스트와 **Cosine Similarity(코사인 유사도)**를 비교합니다. 유사도가 **40% 이상**인 곡만 최종 추천됩니다.

---

## 🛠 기술 스택 (Tech Stack)

### Frontend
*   **React (Vite)**
*   **TypeScript**
*   **MUI (Material UI)**
*   **Framer Motion**: 부드러운 애니메이션 및 인터랙션 구현
*   **Chart.js / React-Chartjs-2**: Sound DNA Radar Chart 시각화
*   **Axios / Server-Sent Events (SSE)**: 백엔드와의 비동기 통신 및 실시간 진행률 표시

### Backend
*   **Python (FastAPI)**
*   **Librosa**: 오디오 신호 처리 및 특징 추출 (BPM, Energy 등)
*   **PyTorch & LAION CLAP**: 오디오-텍스트 멀티모달 임베딩 모델
*   **ChromaDB**: 오디오 벡터 임베딩 저장 및 유사도 검색 (Vector Search)
*   **MySQL (AWS RDS)**: 플레이리스트 관리
*   **Ollama**: 로컬 LLM (Gemma 3:27b) 실행 및 추론
*   **yt-dlp**: 유튜브 오디오 데이터 추출

---

## ⚙️ 동작 원리 (Operating Principles)

이 코드는 다음과 같은 파이프라인으로 동작합니다:

### 1. 데이터 수집 및 전처리
1.  사용자가 유튜브 링크가 담긴 `.txt` 파일을 업로드합니다.
2.  백엔드는 `yt-dlp`를 통해 각 링크의 오디오를 임시 폴더에 다운로드합니다 (`tempfile` 활용).

### 2. 오디오 특성 추출
다운로드된 오디오는 두 가지 경로로 분석됩니다:
*   **물리적 분석 (Physical Constraints):** `Librosa` 라이브러리를 사용하여 BPM, Energy, Brightness, Rhythmic Intensity 수치를 계산합니다. 이는 음악의 "구조적 특징"을 파악합니다.
*   **의미적 분석 (Semantic Embedding):** `LAION CLAP` 모델이 90초 분량의 오디오를 15초 단위로 잘라 분석하고, 이를 512차원 벡터로 변환하여 평균값을 냅니다. 이는 음악의 "분위기(Mood)"를 수치화합니다.

### 3. 데이터 저장
*   분석된 벡터 데이터는 **ChromaDB**에 저장되어, 추후 빠른 유사도 검색에 사용됩니다.
*   곡의 제목, 아티스트 정보는 **MySQL**에 저장됩니다.

### 4. 추천 및 검증
1.  **Sound Summary:** 사용자의 전체 플레이리스트 물리적 지표 평균을 계산하고, 이를 텍스트로 변환하여 LLM에게 전달합니다 (예: "빠르고 경쾌한 120BPM, 밝은 음색").
2.  **LLM Reasoning:** Gemma 3는 이 요약 정보와 곡 목록을 보고 사용자의 페르소나를 도출(ex:힙합을 좋아하는 사용자다.)하고, 어울릴만한 곡들을 제안합니다.
3.  **Cross-Validation:** 제안된 곡을 유튜브에서 검색하여 실제로 오디오를 다운로드한 뒤, 사용자의 기존 플레이리스트 벡터와 **코사인 유사도**를 계산합니다.
    *   *LLM은 텍스트(제목)만 보고 추천하므로 소리 호불호를 모를 수 있지만, CLAP 벡터 검증을 통해 "실제 소리의 성격"이 비슷한 곡만 필터링합니다.*

---

## 🚀 실행 방법 (How to Run)

### Backend
```bash
# 1. 의존성 설치
pip install -r requirements.txt

# 2. Ollama 실행 및 모델 풀링 (사전 설치 필요)
ollama pull gemma3:27b

# 3. 서버 실행
# backend 디렉토리 기준
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
# 1. 패키지 설치
npm install

# 2. 개발 서버 실행
npm run dev
```

---

## 📂 프로젝트 구조 (Structure)

```
llm-music/
├── backend/
│   ├── app/
│   │   ├── api/          # API 엔드포인트 라우팅
│   │   ├── core/         # 공통 설정 및 앱 설정
│   │   ├── db/           # 데이터베이스 연결 및 설정
│   │   ├── models/       # 데이터 모델 스키마
│   │   ├── services/     # 핵심 비즈니스 로직 (LLM, 분석, 유튜브 등)
│   │   └── main.py       # FastAPI 앱 진입점
│   ├── api.py            # (Legacy) 기존 모놀리식 서버
│   ├── music_vector_db/  # ChromaDB 벡터 오디오 저장소
│   ├── music_vault.db    # 메타데이터 관계형 DB
│   └── requirements.txt  # Python 패키지 의존성
├── frontend/
│   ├── src/
│   │   ├── dashboard.tsx # 메인 대시보드 (Sound DNA)
│   │   ├── App.tsx       # 메인 라우팅 설정
│   │   └── ...
│   ├── package.json      # Node 패키지 스크립트
│   └── ...
└── README.md             # 프로젝트 설명서
```
### 📚 References (Audio Analysis Algorithms)
* **BPM (Tempo):** Tzanetakis, G., & Cook, P. (2002). *Musical genre classification of audio signals*. IEEE Transactions on Speech and Audio Processing. [📄 Link](https://ieeexplore.ieee.org/document/1021072)
* **Brightness (Spectral Centroid):** Schubert, E., et al. (2004). *The spectral centroid as a physical correlate of brightness in music*. The Journal of the Acoustical Society of America. [📄 Link](https://asa.scitation.org/doi/10.1121/1.1736270)
* **Energy (Zero Crossing Rate):** Gouyon, F., et al. (2000). *On the use of zero-crossing rate for an application of classification of percussive sounds*. Proceedings of the COST G-6 Conference on Digital Audio Effects (DAFx-00). [📄 Link](https://www.francoispachet.fr/wp-content/uploads/2021/01/gouyon-00-dafx00.pdf)
* **Rhythmic Intensity (Onset Strength):** Ellis, D. P. W. (2007). *Beat Tracking by Dynamic Programming*. Journal of New Music Research. [📄 Link](https://academiccommons.columbia.edu/doi/10.7916/D8CV4T9J/download)cal genre classification of audio signals*. IEEE Transactions on Speech and Audio Processing. [📄 Link](https://ieeexplore.ieee.org/document/1021072)