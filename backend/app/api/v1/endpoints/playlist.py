# FastAPI 웹 서버 구축에 필요한 기능들(라우터, 에러 처리, 파일 업로드 등)을 불러옵니다.
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
# 작업 진행 상황을 관리하고 프론트엔드에 전달해줄 외부 모듈을 불러옵니다.
from app.services.progress import progress_manager
# 유튜브 링크에서 불필요한 부분을 잘라내고 깔끔하게 정리해주는 함수를 불러옵니다.
from app.services.youtube import clean_youtube_url
# 아까 설정했던 ChromaDB(벡터 데이터베이스)의 'music_vault' 바구니를 불러옵니다.
from app.db.chroma import collection, async_get_collection
# 아까 설정했던 RDS(MySQL)에서 모든 플레이리스트 이름을 가져오는 함수를 불러옵니다.
from app.db.rds import get_all_playlists
# 업로드가 끝난 후 사용자에게 돌려줄 정해진 응답 형식(데이터 구조)을 불러옵니다.
from app.models.schemas import UploadResponse
# 운영체제 관련 기능(랜덤 문자열 생성 등)을 사용하기 위해 불러옵니다.
import os
# 에러가 났을 때 어디서 왜 났는지 상세한 추적 기록을 보기 위해 불러옵니다.
import traceback
# 비동기 작업을 처리하기 위한 파이썬 기본 라이브러리입니다.
import asyncio
# 유튜브 플레이리스트를 실제로 분석하고 처리하는 핵심 함수를 불러옵니다.
from app.api.v1.endpoints.analysis import process_playlist_analysis

# [5] 엔드포인트 등록 (Endpoints)
# 실제 API 요청을 처리하는 함수들이 로딩됩니다.
router = APIRouter()


# 클라이언트(사용자)가 "/upload" 주소로 파일을 전송(POST)할 때 실행되는 함수입니다.
# 응답은 미리 정의한 UploadResponse 형식으로 나갑니다.
@router.post("/upload", response_model=UploadResponse)
async def upload_playlist(
        # 현재 들어온 HTTP 요청 자체의 정보를 담고 있는 변수입니다.
        request: Request,
        # 폼(Form) 데이터로 받을 재생목록 이름입니다. (...은 필수 값을 의미합니다)
        playlist_id: str = Form(...),
        # 폼 데이터로 받을 작업 ID입니다. (None이 기본값이라 필수는 아닙니다)
        task_id: str = Form(None),
        # 클라이언트가 업로드한 텍스트 파일 객체입니다. (필수 값)
        file: UploadFile = File(...)
):
    # 사용자가 보낸 task_id가 있으면 그걸 쓰고, 없으면 무작위 글자를 섞어 고유한 임시 ID를 직접 만듭니다.
    actual_task_id = task_id if task_id else f"task_{playlist_id}_{os.urandom(4).hex()}"
    # 파일 업로드 처리가 시작되었음을 서버 터미널에 알립니다.
    print("📂 [Upload] File processing started...")

    try:
        # ChromaDB에서 사용자가 입력한 playlist_id와 똑같은 이름이 이미 있는지 1개만 찾아봅니다.
        existing = await async_get_collection(where={"playlist_pk": {"$eq": playlist_id}}, limit=1)
        # 만약 이미 존재하고, 그 안에 데이터(ids)도 들어있다면
        if existing and existing.get('ids'):
            # 클라이언트에게 "이미 있는 이름이다"라는 400번(잘못된 요청) 에러를 던지고 함수를 끝냅니다.
            raise HTTPException(
                status_code=400,
                detail=f"이미 존재하는 ID('{playlist_id}')입니다. 다른 이름을 사용해주세요."
            )

        # 업로드된 파일의 실제 내용(바이트 데이터)을 비동기로 읽어옵니다.
        content = await file.read()
        text = ""
        # 한글 윈도우(cp949), 맥(utf-8) 등 다양한 환경에서 만든 파일의 글자 깨짐을 막기 위해 여러 인코딩 방식을 시도합니다.
        for encoding in ['utf-8', 'cp949', 'euc-kr']:
            try:
                # 읽어온 바이트 데이터를 문자열(텍스트)로 변환해봅니다.
                text = content.decode(encoding)
                # 성공하면 반복문을 즉시 빠져나갑니다.
                break
            except UnicodeDecodeError:
                # 에러가 나면(인코딩 방식이 틀리면) 다음 방식으로 넘어가 계속 시도합니다.
                continue

        # 모든 방식을 써도 글자를 읽어내지 못해 텍스트가 비어있다면
        if not text:
            # 400번 에러를 발생시키고 종료합니다.
            raise HTTPException(status_code=400, detail="파일 인코딩을 지원하지 않거나 읽을 수 없습니다.")

        # 읽어낸 텍스트 파일의 내용에서 앞뒤 공백을 자르고, 줄바꿈(엔터) 기준으로 한 줄씩 나눕니다.
        lines = text.strip().splitlines()
        # 리스트 내포 문법을 이용해 한 줄씩 검사합니다. 
        # 'youtube.com'이나 'youtu.be'가 포함된 줄만 찾아 깔끔하게 링크를 정리한 뒤, 
        # dict.fromkeys를 이용해 중복된 노래 주소를 하나로 합치고 다시 리스트로 만듭니다.
        youtube_links = list(dict.fromkeys([
            clean_youtube_url(line.strip())
            for line in lines
            if 'youtube.com' in line or 'youtu.be' in line
        ]))

        # 몇 개의 유튜브 링크를 찾아냈는지 터미널에 성공 메시지를 띄웁니다.
        print(f"✅ [Upload] Parsed {len(youtube_links)} songs for playlist: {playlist_id}")

        # 만약 찾아낸 유튜브 링크가 단 하나도 없다면
        if not youtube_links:
            # 유효한 링크가 없다는 400번 에러를 발생시킵니다.
            raise HTTPException(status_code=400, detail="유효한 유튜브 링크가 없습니다.")

        # 진행 상황 관리기에 이번 작업 ID를 등록하여 관리를 시작합니다.
        progress_manager.create_task(actual_task_id)
        # 프론트엔드(화면)에 분석 준비가 완료되었다는 메시지와 진행률 5%를 비동기로 전달합니다.
        await progress_manager.update(actual_task_id, f"분석 준비 완료: {len(youtube_links)}개의 곡", 5)

        # 찾아낸 링크들을 가지고 {'url': '링크', 'title': 'Track 1'} 형태의 딕셔너리 리스트로 예쁘게 포장합니다.
        songs_list = [{'url': url, 'title': f'Track {i + 1}'} for i, url in
                      enumerate(youtube_links)]

        # 진짜 핵심 기능입니다! 포장된 곡 리스트를 분석 함수로 넘겨 본격적인 AI/음악 분석을 시작합니다. 
        # 작업이 끝나면 성공적으로 분석된 곡의 개수를 반환받습니다.
        success_count = await process_playlist_analysis(playlist_id, songs_list, request,
                                                        actual_task_id)

        # 만약 한 곡도 성공하지 못했다면 (모두 실패했다면)
        if success_count == 0:
            # 진행 상태를 100%로 만들고 실패 메시지를 남깁니다.
            await progress_manager.update(actual_task_id, "모든 곡 분석 실패", 100)
            # 서버 에러(500번)를 발생시킵니다.
            raise HTTPException(status_code=500, detail="분석에 성공한 곡이 없습니다. URL을 확인해주세요.")

        # 성공했다면 진행 상태를 100%로 만들고 몇 곡이 성공했는지 메시지를 남깁니다.
        await progress_manager.update(actual_task_id, f"완료! ({success_count}곡 분석 성공)", 100)

        # 클라이언트에게 성공했다는 최종 결과(미리 정해둔 응답 규격)를 반환합니다.
        return UploadResponse(
            message="재생목록 생성이 완료되었습니다.",
            playlist_id=playlist_id,
            total_links=len(youtube_links),
            analyzed_count=success_count
        )

    # HTTPException으로 우리가 일부러 낸 에러(400번 등)는 그대로 다시 밖으로 던집니다.
    except HTTPException:
        raise
    # 그 외에 예상치 못한 진짜 서버 오류(파이썬 문법 에러 등)가 발생했다면
    except Exception as e:
        # 어디서 에러가 났는지 터미널에 상세히 빨간불로 띄웁니다.
        print(f"🔥 Critical Error: {traceback.format_exc()}")
        # 만약 작업 ID가 만들어져 있던 상태라면 진행 상황에도 오류 메시지와 함께 100% 종료 처리를 합니다.
        if actual_task_id:
            await progress_manager.update(actual_task_id, f"오류 발생: {str(e)}", 100)
        # 사용자에게는 서버 내부 오류가 발생했다는 500번 에러를 보냅니다.
        raise HTTPException(status_code=500, detail="서버 내부 오류가 발생했습니다.")


# 사용자가 "/playlists" 주소로 재생목록 정보 요청(GET)을 보낼 때 실행되는 함수입니다.
@router.get("/playlists")
async def list_playlists():
    # 아까 만들어둔 RDS(MySQL)에서 모든 플레이리스트 이름을 가져오는 함수를 실행하고 그 결과를 반환합니다.
    return await get_all_playlists()
