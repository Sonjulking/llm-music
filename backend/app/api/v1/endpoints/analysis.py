from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict
import asyncio
import numpy as np
import tempfile
import traceback
import ollama
from urllib.parse import unquote
from sklearn.metrics.pairwise import cosine_similarity

from app.services.progress import progress_manager
from app.db.chroma import collection, async_get_collection, async_upsert_collection
from app.db.rds import get_playlist_from_rds
from app.services.llm import analyze_user_dna, get_gemma_brainstorming
from app.services.youtube import search_youtube, download_audio_subprocess
from app.services.audio import compute_audio_features_sync
from app.core.config import MODEL_NAME
import app.core.config as config

# [5] 엔드포인트 등록 (Endpoints)
# 실제 API 요청을 처리하는 함수들이 로딩됩니다.
router = APIRouter()


# Circular Dependency Avoidance: Defines logic here or imports carefully
async def process_playlist_analysis(playlist_id: str, songs_list: List[Dict], request: Request,
                                    task_id: Optional[str] = None):
    total = len(songs_list)
    sem = asyncio.Semaphore(5)
    success_count = 0
    lock = asyncio.Lock()

    async def analyze_task(i, s):
        nonlocal success_count
        if await request.is_disconnected(): return

        async with sem:
            try:
                if await request.is_disconnected(): return

                url = s.get('url')
                if not url:
                    yt = await asyncio.get_event_loop().run_in_executor(None, search_youtube,
                                                                        s.get('title', ''))
                    url = yt[0] if yt else None

                if not url: return

                with tempfile.TemporaryDirectory() as temp_dir:
                    file_path, title = await download_audio_subprocess(url, temp_dir)

                    if await request.is_disconnected(): return

                    if file_path:
                        analysis = await asyncio.get_event_loop().run_in_executor(None,
                                                                                  compute_audio_features_sync,
                                                                                  file_path)
                        if analysis:
                            emb, metrics = analysis
                            await async_upsert_collection(
                                ids=[f"{playlist_id}_{i}"],
                                embeddings=[emb.tolist()[0]],
                                metadatas=[{
                                    "playlist_pk": playlist_id,
                                    "title": title,
                                    "author": s.get('author', 'Unknown'),
                                    "status": "liked",
                                    "bpm": int(metrics['bpm']),
                                    "energy": float(metrics['energy']),
                                    "brightness": float(metrics['brightness']),
                                    "rhythmic_intensity": float(metrics['rhythmic_intensity'])
                                }]
                            )
                            async with lock: success_count += 1
            except Exception as e:
                print(f"❌ Error analyzing song {i}: {e}")

            if task_id:
                await progress_manager.update(task_id, f"초기 분석 중... ({i}/{total})",
                                              int((i / total) * 100))

    await asyncio.gather(*[analyze_task(i, s) for i, s in enumerate(songs_list, 1)])
    return success_count


@router.get("/list/{name}")
async def get_analysis_and_recommend(name: str, request: Request, task_id: Optional[str] = None):
    try:
        if task_id: progress_manager.create_task(task_id)
        decoded_name = unquote(name)
        print(f"🔍 [DNA Analysis Start] {decoded_name}")

        if task_id: await progress_manager.update(task_id, "취향 데이터를 로드 중입니다...", 10)

        uploaded = await async_get_collection(where={"playlist_pk": {"$eq": decoded_name}},
                                              include=["embeddings", "metadatas"])

        if not (uploaded and uploaded.get('ids')):
            print("첫 분석 이군요!!")
            playlist = await get_playlist_from_rds(decoded_name)
            if not playlist: raise HTTPException(status_code=404, detail="재생목록 없음")

            await process_playlist_analysis(decoded_name, playlist, request, task_id)

            if await request.is_disconnected():
                print(f"🛑 [Analysis Aborted] {decoded_name}")
                return None

            uploaded = await async_get_collection(where={"playlist_pk": {"$eq": decoded_name}},
                                                  include=["embeddings", "metadatas"])

        playlist_metas = []
        for m in uploaded['metadatas']:
            playlist_metas.append({
                "author": m.get('author', 'Unknown'),
                "title": m.get('title', 'Unknown'),
                "metrics": {
                    "bpm": m.get('bpm', 0),
                    "energy": m.get('energy', 0),
                    "brightness": m.get('brightness', 0),
                    "rhythmic_intensity": m.get('rhythmic_intensity', 0)
                }
            })

        report, user_metrics = await analyze_user_dna(playlist_metas)

        if task_id: await progress_manager.update(task_id, "Gemma 3가 당신의 사운드 DNA를 분석하여 선곡 중입니다...",
                                                  30)
        candidates = await get_gemma_brainstorming(playlist_metas)

        results = []
        if task_id: await progress_manager.update(task_id, "선곡된 곡들의 사운드 일치 여부를 검사 중입니다...", 50)

        async def validate_candidate(song_query):
            async with config.GLOBAL_ANALYSIS_SEM:
                if await request.is_disconnected(): return None
                yt = await asyncio.get_event_loop().run_in_executor(None, search_youtube,
                                                                    song_query)
                if not yt: return None

                video_url, video_title, video_thumbnail = yt

                with tempfile.TemporaryDirectory() as temp_dir:
                    file_path, _ = await download_audio_subprocess(video_url, temp_dir)
                    if not file_path: return None
                    analysis = await asyncio.get_event_loop().run_in_executor(None,
                                                                              compute_audio_features_sync,
                                                                              file_path)
                    if not analysis: return None
                    emb, metrics = analysis

                sims = cosine_similarity(emb.reshape(1, -1), np.array(uploaded['embeddings']))[0]
                max_sim = int(np.max(sims) * 100)

                if max_sim < 40: return None
                return {"song": song_query, "url": video_url, "sim": max_sim, "metrics": metrics,
                        "emb": emb, "thumbnail": video_thumbnail}

        tasks = [validate_candidate(song) for song in candidates[:5]]
        results = [r for r in await asyncio.gather(*tasks) if r]

        if not results: raise HTTPException(status_code=500, detail="유사도 조건을 만족하는 곡이 없습니다.")

        best = sorted(results, key=lambda x: x['sim'], reverse=True)[0]
        final_prompt = f"후보곡 '{best['song']}'가 사용자의 기존 취향(유사도 {best['sim']}%)과 왜 사운드적으로 잘 어울리는지 1문장으로 짧게 설명해줘."

        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, lambda: ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'user', 'content': final_prompt}], options=config.OLLAMA_OPTIONS))
        reason = res['message']['content'].strip()

        if task_id: await progress_manager.update(task_id, "완료!", 100)

        print(f"metrics : {best['metrics']}")

        return {
            "report": report,
            "recommended_song": best['song'],
            "youtube_link": best['url'],
            "similarity": best['sim'],
            "reason": reason,
            "metrics": user_metrics,
            "recommended_metrics": best['metrics'],
            "thumbnail": best.get("thumbnail")
        }

    except Exception as e:
        traceback.print_exc()
        if task_id: await progress_manager.update(task_id, f"실패: {str(e)}", 100)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress/{task_id}")
async def sse_progress(task_id: str):
    return StreamingResponse(progress_manager.get_stream(task_id), media_type="text/event-stream")
