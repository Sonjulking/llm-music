import ollama
import numpy as np
import asyncio
from typing import List, Dict, Tuple
from app.core.config import MODEL_NAME
import app.core.config as config


def summarize_playlist_sound(playlist_metas: List[Dict]) -> Tuple[str, Dict]:
    print(f"DEBUG: 데이터 개수 = {len(playlist_metas)}")

    bpms = [m['metrics']['bpm'] for m in playlist_metas if m['metrics']['bpm'] > 0]
    energies = [m['metrics']['energy'] for m in playlist_metas]
    brightnesses = [m['metrics']['brightness'] for m in playlist_metas]
    rhythms = [m['metrics'].get('rhythmic_intensity', 0) for m in playlist_metas]

    if not bpms: return "데이터가 부족하여 사운드 성향을 요약할 수 없습니다.", {}

    # [2025-09-11] 주석 유지: 물리적 지표들의 평균 계산
    avg_bpm = np.mean(bpms)
    avg_energy = np.mean(energies)
    avg_bright = np.mean(brightnesses)
    avg_rhythm = np.mean(rhythms)

    # 수치 기반 성향 키워드 매핑
    tempo_desc = "빠르고 경쾌한" if avg_bpm > 120 else "차분하고 느린" if avg_bpm < 90 else "적당한 속도감의"
    energy_desc = "강렬하고 자극적인" if avg_energy > 0.05 else "부드럽고 편안한"
    bright_desc = "밝고 화사한" if avg_bright > 2000 else "어둡고 묵직한"

    # 리듬 강도에 따른 BPM 신뢰도 설명 추가
    rhythm_desc = ""
    if avg_rhythm < 1.0:
        rhythm_desc = "(리듬감이 약해 BPM 수치의 신뢰도가 낮음, 클래식장르일 가능성 높음)"
    else:
        rhythm_desc = "(뚜렷한 리듬감을 가짐)"

    summary_text = (f"전체적으로 {tempo_desc} 템포(평균 {int(avg_bpm)} BPM)를 가지고 있으며{rhythm_desc}, "
                    f"{energy_desc} 에너지와 {bright_desc} 음색을 띠는 곡들이 주를 이룹니다.")

    metrics = {
        "bpm": int(avg_bpm),
        "energy": float(avg_energy),
        "brightness": float(avg_bright),
        "rhythmic_intensity": float(avg_rhythm)
    }

    return summary_text, metrics


async def analyze_user_dna(playlist_info: List[Dict]) -> Tuple[str, Dict]:
    sound_summary, user_metrics = summarize_playlist_sound(playlist_info)
    song_details = "\n".join([f"- {s['author']} - {s['title']}" for s in playlist_info[:10]])

    prompt = (
        f"당신은 음악을 분석하는 음악 전문 큐레이터입니다.\n"
        f"제공된 플레이리스트와 오디오 분석 데이터를 기반으로 사용자의 취향을 요약하세요.\n\n"
        f"[데이터 정제 지침]\n"
        f"- 곡 제목에 포함된 '[가사/해석/발음/lyrics]' 등의 부가 정보는 무시하고 아티스트와 곡명에만 집중하세요.\n"
        f"다음은 사용자의 재생목록에 대한 물리적 파형 분석 결과입니다: **{sound_summary}**\n\n"
        f"[세부 곡 목록]\n{song_details}\n\n"
        f"[분석 및 출력 규칙]\n"
        f"1. 리스너 페르소나: 비유적인 미사여구를 배제하고, '주요 장르 + 청취 태도' 조합의 담백한 키워드로 정의하세요.\n"
        f"2. 분석 내용: 왜 이 페르소나가 도출되었는지 오디오 태그와 아티스트의 특징을 연결하여 2~3문장으로 설명하세요.\n"
        f"3. 주의: 소설을 쓰지 말고, 실제 데이터에 기반한 음악적 분석만 제공하세요.\n"
        f"4. 모든 답변은 한국어로 작성하세요."
    )

    try:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, lambda: ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'user', 'content': prompt}], options=config.OLLAMA_OPTIONS))
        return res['message']['content'].strip(), user_metrics
    except Exception as e:
        print(f"❌ Error in analyze_user_dna: {e}")
        return "당신의 재생목록은 독특한 사운드 텍스처를 가지고 있습니다.", user_metrics


async def get_gemma_brainstorming(playlist_info: List[Dict]) -> List[str]:
    # 사운드 요약 추가
    sound_summary, _ = summarize_playlist_sound(playlist_info)
    print("sound summary : " + sound_summary)

    song_details = "\n".join([f"- {s['author']} - {s['title']}" for s in playlist_info[:10]])
    song_list_str = "\n".join([f"- {s['author']} - {s['title']}" for s in playlist_info[:15]])

    prompt = (
        f"당신은 전문 DJ입니다\n\n"
        f"물리적 분석 데이터 중 BPM은 클래식이나 앰비언트 장르(리듬 강도가 낮은 곡)에서 실제보다 2배 높게 측정될 수 있습니다. 수치 자체에 매몰되지 말고, \n\n"
        f"곡의 제목과 아티스트의 장르적 특성을 결합하여 최종적인 사운드 질감을 판단하세요.\n\n"
        f"다음은 사용자의 재생목록에 대한 물리적 파형 분석 결과입니다: **{sound_summary}**\n\n"
        f"[세부 곡 목록]\n{song_details}\n\n"
        f"[분석 요청]\n"
        f"위의 물리적 데이터와 곡 목록을 결합하여:\n"
        f"이 성향과 유사한 사운드 질감을 가진 새로운 곡 10곡을 추천하세요.\n"
        f"단, 비교적 최신곡을 우선으로 추천해주세요.\n"
        f"반드시 '가수 - 제목' 형식으로 한 줄에 한 곡씩만 출력하세요.\n\n"
        f"[현재 재생목록]\n{song_list_str}"
    )

    try:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, lambda: ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'user', 'content': prompt}], options=config.OLLAMA_OPTIONS))

        #  LLM 응답에서 추천 곡 리스트 추출
        recommended_songs = [
            c.strip().replace("- ", "")
            for c in res['message']['content'].split('\n')
            if " - " in c
        ]

        # --- [추가된 프린트 로직] ---
        print("\n" + "=" * 50)
        print(f"🎸 [Gemma 3 Brainstorming Results]")
        print(f"사운드 요약: {sound_summary}")
        print("-" * 50)
        for i, song in enumerate(recommended_songs, 1):
            print(f"{i}. {song}")
        print("=" * 50 + "\n")
        return recommended_songs
    except Exception as e:
        print(f"❌ Error in get_gemma_brainstorming: {e}")
        return []
