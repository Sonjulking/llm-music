import librosa
import numpy as np
import torch
import threading
from transformers import ClapModel, ClapProcessor
from typing import Optional, Dict, Tuple
from app.core.config import DEVICE, TOTAL_ANALYSIS_DURATION, SEGMENT_DURATION

_clap_model, _clap_processor = None, None
_model_lock = threading.Lock()


def get_clap_model():
    global _clap_model, _clap_processor
    with _model_lock:
        if _clap_model is None:
            print("📦 [System] Loading CLAP model...")
            _clap_model = ClapModel.from_pretrained("laion/clap-htsat-fused").to(DEVICE)
            _clap_processor = ClapProcessor.from_pretrained("laion/clap-htsat-fused")
    return _clap_model, _clap_processor


def extract_physical_metrics(y, sr) -> Dict:
    try:
        # 1. '온셋(Onset)' 강도를 먼저 계산하여 리듬감을 측정합니다.
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        avg_onset_strength = np.mean(onset_env)

        # 2. 계산된 온셋 엔벨로프를 기반으로 비트(BPM)를 추정합니다.
        tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)

        # 3. '스펙트럼 중심(Spectral Centroid)'을 계산하여 음색의 밝기를 측정합니다.
        # 소리의 주파수 분포에서 '무게 중심'이 어디인지 찾는 것이며,
        # 높은 주파수(고음)에 에너지가 몰려 있을수록 '밝고 챙챙거리는' 소리로 판정됩니다.
        centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))

        # 4. '제로 크로싱 레이트(Zero Crossing Rate, ZCR)'를 통해 에너지와 거칠기를 측정합니다.
        # 소리의 파형이 0(중심선)을 초당 몇 번 교차하는지 세는 것으로,
        # 타악기나 잡음, 찌그러진(Distorted) 소리일수록 이 값이 높게 나타납니다.
        zcr = np.mean(librosa.feature.zero_crossing_rate(y))

        # 5. 계산된 값들을 정수 또는 소수점 둘째/넷째 자리까지 반올림하여 딕셔너리로 반환합니다.
        return {
            "bpm": int(tempo),
            "brightness": round(float(centroid), 2),
            "energy": round(float(zcr), 4),
            "rhythmic_intensity": round(float(avg_onset_strength), 4)
        }
    except Exception as e:
        print(f"❌ Error in extract_physical_metrics: {e}")
        return {"bpm": 0, "brightness": 0, "energy": 0, "rhythmic_intensity": 0}


def compute_audio_features_sync(file_path: str) -> Optional[Tuple[np.ndarray, Dict]]:
    try:
        # [1] 싱글톤 패턴으로 미리 로드된 CLAP 모델(AI)과 전처리기(Processor)를 가져옵니다.
        clap_model, clap_processor = get_clap_model()

        # [2] librosa를 사용해 오디오 파일을 로드해.
        # sr=48000: 1초당 48,000번 샘플링(고음질), duration: 전체가 아닌 90초만 읽어서 메모리를 아낍니다.
        y, sr = librosa.load(file_path, sr=48000, duration=TOTAL_ANALYSIS_DURATION)

        # [3] 아까 만든 함수를 호출해서 이 곡의 물리적 특성(BPM, 에너지, 밝기)을 딕셔너리로 뽑아냅니다..
        metrics = extract_physical_metrics(y, sr)

        # [4] 각 15초 단위 세그먼트의 '분위기(임베딩)'를 저장할 바구니를 만듭니다.
        embeddings = []

        # [5] 15초 분량에 해당하는 데이터 개수(step)를 계산합니다. (15초 * 48000Hz)
        step = SEGMENT_DURATION * sr

        # [6] 90초 분량의 데이터를 15초씩 잘라서 반복문을 돌립니다. (총 6번)
        for start in range(0, int(TOTAL_ANALYSIS_DURATION * sr), step):
            # 남은 데이터가 15초보다 짧으면 분석하지 않고 멈춰.
            if start + step > len(y): break

            # [7] 15초만큼의 소리 데이터를 슬라이싱합니다..
            segment = y[start: start + step]

            # [8] 잘라낸 소리를 AI(CLAP)가 이해할 수 있는 형태(Tensor)로 변환하고 GPU(MPS/CPU)로 보내.
            inputs = clap_processor(audio=segment, return_tensors="pt", sampling_rate=48000).to(
                DEVICE)

            with torch.no_grad():  # 역전파(학습)가 아니니까 메모리 절약을 위해 기울기 계산을 꺼.
                # [9] AI 모델에게 "이 소리에서 특징을 뽑아줘"라고 시켜.
                outputs = clap_model.get_audio_features(**inputs)

                # [10] 결과값에서 실제 벡터(숫자 리스트)만 추출해서 넘파이 배열로 바꿔 저장해.
                emb = outputs.pooler_output.cpu().numpy() if hasattr(outputs,
                                                                     'pooler_output') else outputs.cpu().numpy()
                embeddings.append(emb)

        # [11] ★ np.mean: 15초마다 뽑은 6개의 분위기를 '평균' 내서 이 곡의 전체 대표 DNA를 만들어 반환해.
        return np.mean(embeddings, axis=0), metrics
    except Exception as e:
        print(f"❌ Error in compute_audio_features_sync: {e}")
        return None
