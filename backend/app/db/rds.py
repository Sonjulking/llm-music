import mysql.connector
# 이전에 설정해둔 데이터베이스 접속 정보(주소, 아이디, 비밀번호 등)를 불러옵니다.
from app.core.config import DB_CONFIG
import asyncio


# 데이터베이스와 연결 통로를 만들어주는 함수를 정의합니다.
def get_db_connection():
    # DB_CONFIG 원본을 보호하기 위해 복사본을 만듭니다.
    config = DB_CONFIG.copy()
    # 접속 시 인증 방식을 강제로 구버전으로 맞추는 마법의 한 줄입니다.
    config['auth_plugin'] = 'mysql_native_password'

    # DB_CONFIG에 담긴 설정들을 풀어서(**) 전달하여 연결 객체를 반환합니다.
    return mysql.connector.connect(**config)


# 특정 이름(name)을 가진 재생목록의 곡 정보들을 가져오는 비동기 함수입니다.
async def get_playlist_from_rds(name: str):
    loop = asyncio.get_event_loop()
    def _fetch():
        try:  # 오류가 발생할 수 있는 데이터베이스 작업을 안전하게 시도합니다.
            # DB와 연결 통로를 엽니다.
            conn = get_db_connection()
            # DB에 SQL 명령을 내리고 결과를 받아올 '커서(Cursor)'를 만듭니다.
            # dictionary=True는 결과를 다루기 쉬운 딕셔너리 형태로 받겠다는 뜻입니다.
            cursor = conn.cursor(dictionary=True)
            # music_list 테이블에서 조건(name = %s)에 맞는 제목, URL, 작성자를 가져오라고 명령합니다.
            # (%s를 쓰는 이유는 해킹(SQL 인젝션)을 방지하기 위해 안전하게 변수를 넣는 방식입니다.)
            cursor.execute("SELECT title, url, author FROM music_list WHERE name = %s", (name,))
            # 명령을 통해 검색된 모든 데이터를 가져와 res 변수에 저장합니다.
            res = cursor.fetchall()
            # 작업이 끝났으므로 커서를 닫아 메모리를 정리합니다.
            cursor.close()
            # 데이터베이스와의 연결을 안전하게 끊습니다.
            conn.close()
            # 찾아온 결과물(음악 정보들)을 함수 밖으로 내보냅니다.
            return res
        except Exception as e:  # 만약 위 과정 중 데이터베이스 접속 실패 등 에러가 발생하면 여기서 잡습니다.
            # 에러의 원인을 터미널 창에 빨간 엑스 표시와 함께 출력합니다.
            print(f"❌ RDS Error: {e}")
            # 프로그램이 죽지 않도록 빈 리스트를 반환하며 부드럽게 넘어갑니다.
            return []
    return await loop.run_in_executor(None, _fetch)


# 데이터베이스에 있는 모든 재생목록의 '이름'들만 중복 없이 가져오는 비동기 함수입니다.
async def get_all_playlists():
    """RDS에서 모든 고유 재생목록 이름을 가져옵니다."""
    loop = asyncio.get_event_loop()
    def _fetch():
        try:
            # 원본 접속 정보가 변경되지 않도록 복사본을 하나 만듭니다.
            config = DB_CONFIG.copy()
            # 한글이나 특수문자가 깨지지 않도록 유니코드 사용 옵션을 켭니다.
            config['use_unicode'] = True
            # 여기서도 동일하게 인증 방식을 명시해 줍니다.
            config['auth_plugin'] = 'mysql_native_password'

            # 설정된 정보로 데이터베이스에 연결합니다.
            conn = mysql.connector.connect(**config)
            # 명령을 내릴 커서를 만듭니다. (여기선 딕셔너리 옵션을 쓰지 않았습니다.)
            cursor = conn.cursor()
            # music_list 테이블에서 고유한 이름(name)과 그 플레이리스트의 가장 최근 곡 추가일(MAX(created_at))을 가져옵니다.
            cursor.execute("SELECT name, MAX(created_at) FROM music_list WHERE name IS NOT NULL GROUP BY name")
            # 가져온 결과를 {'name': '플리이름', 'created_At': '시간'} 형태의 딕셔너리 리스트로 변환합니다.
            results = [{"name": row[0], "created_At": str(row[1]) if row[1] else ""} for row in cursor.fetchall()]
            # 작업이 끝난 커서를 닫습니다.
            cursor.close()
            # 데이터베이스 연결을 끊습니다.
            conn.close()
            # 깔끔하게 정리된 고유 이름들의 리스트를 내보냅니다.
            return results
        except Exception as e:  # 에러가 발생했을 때의 대비책입니다.
            # 어떤 에러인지 터미널에 출력합니다.
            print(f"❌ RDS Error: {e}")
            # 에러 시 빈 리스트를 반환합니다.
            return []
    return await loop.run_in_executor(None, _fetch)