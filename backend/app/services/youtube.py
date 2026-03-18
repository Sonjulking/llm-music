import os
import sys
import json
import asyncio
import yt_dlp
from urllib.parse import unquote, urlparse, parse_qs
from typing import Optional, Tuple


def clean_youtube_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        if parsed.path == '/watch':
            query = parse_qs(parsed.query)
            if 'v' in query:
                return f"https://www.youtube.com/watch?v={query['v'][0]}"
        elif parsed.netloc == 'youtu.be':
            return f"https://www.youtube.com/watch?v={parsed.path[1:]}"
    except Exception:
        pass
    return url


async def download_audio_subprocess(url: str, temp_dir: str, timeout: int = 25):
    # 임시 저장될 파일의 기본 경로와 이름을 설정합니다. (예: /tmp/abc/temp_audio)
    temp_path = os.path.join(temp_dir, "temp_audio")
    # yt_dlp가 인식할 출력 템플릿입니다. 뒤에 확장자(%(ext)s)가 자동으로 붙습니다.
    output_template = f"{temp_path}.%(ext)s"  # 변수 먼저 선언

    cmd = [
        sys.executable, "-m", "yt_dlp",  # 현재 파이썬 환경의 yt_dlp 모듈을 실행합니다.
        "--extract-audio",  # 비디오에서 오디오만 추출하도록 지시합니다.
        "--audio-format", "best",  # 가장 좋은 음질의 오디오 포맷을 선택합니다.
        "--audio-quality", "128K",  # 오디오 품질을 128kbps로 설정합니다.
        "-o", output_template,  # 저장될 경로와 파일명 템플릿을 지정합니다.
        "--socket-timeout", "5",  # 네트워크 연결 시 타임아웃을 5초로 제한합니다.
        "--no-playlist",  # 재생목록 주소라도 현재 영상 하나만 받습니다.
        # [403 오류 우회 설정]
        "--cookies-from-browser", "edge",  # 유튜브 차단을 피하기 위해 엣지 브라우저의 쿠키를 가져옵니다.
        "--user-agent",  # 실제 브라우저처럼 보이도록 유저 에이전트 정보를 속입니다.
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        # 안드로이드 및 웹 클라이언트를 섞어 사용하여 유튜브의 봇 감지를 우회합니다.
        "--extractor-args", "youtube:player_client=android,web;player_skip=webpage,configs",
        # [효율성] 다운로드 후 곡 정보를 JSON 형식으로 출력하게 하여 정보를 획득합니다.
        "--print-json",
        # "--no-progress",                 # 다운로드 진행바를 출력하지 않아 로그를 깔끔하게 유지합니다.
        url  # 다운로드할 유튜브 주소를 전달합니다.
    ]
    try:
        # 명령어를 별도의 비동기 하위 프로세스로 실행합니다. 결과(stdout)를 파이프로 연결합니다.
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE,
                                                    stderr=asyncio.subprocess.PIPE)

        # 설정한 시간(timeout) 내에 작업이 완료되기를 기다립니다
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)

        # 프로세스가 정상 종료(리턴 코드 0) 되었다면
        if proc.returncode == 0:
            # 출력된 JSON 메타데이터의 첫 줄을 파싱하여 곡 정보를 가져옵니다.
            meta = json.loads(stdout.decode().splitlines()[0])
            # 임시 디렉토리에서 'temp_audio'로 시작하는 실제 파일을 찾습니다.
            files = [f for f in os.listdir(temp_dir) if f.startswith("temp_audio")]
            # 파일이 존재하면 전체 경로와 곡 제목(없으면 Unknown)을 반환합니다.
            if files: return os.path.join(temp_dir, files[0]), meta.get('title', 'Unknown')
    except Exception as e:
        print(f"❌ Error in download_audio_subprocess: {e}")
        pass
    return None, None


def search_youtube(query: str):
    try:
        with yt_dlp.YoutubeDL({'quiet': True, 'extract_flat': True}) as ydl:
            res = ydl.extract_info(f"ytsearch1:{query}", download=False)
            if res['entries']:
                entry = res['entries'][0]
                thumbnails = entry.get('thumbnails', [])
                thumbnail_url = thumbnails[-1]['url'] if thumbnails else None
                return (
                    f"https://www.youtube.com/watch?v={entry['id']}",
                    entry['title'],
                    thumbnail_url
                )
    except Exception as e:
        print(f"❌ Error in search_youtube: {e}")
        pass
    return None
