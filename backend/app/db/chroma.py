# AI 텍스트(벡터) 데이터를 저장하고 검색하는 데 특화된 ChromaDB 라이브러리를 불러옵니다.
import chromadb
# 이전에 설정해둔 ChromaDB 데이터가 실제 파일로 저장될 폴더 경로('./music_vector_db')를 불러옵니다.
from app.core.config import DB_PATH
import asyncio


# ChromaDB에 연결하고 데이터를 담을 '바구니(컬렉션)'를 준비하는 함수를 정의합니다.
def get_chroma_client():
    # 지정된 폴더(DB_PATH)에 데이터를 영구적으로(Persistent) 저장하는 클라이언트(접속기)를 만듭니다.
    # (이렇게 설정하면 서버 컴퓨터를 껐다 켜도 분석해 둔 데이터가 날아가지 않고 유지됩니다.)
    chroma_client = chromadb.PersistentClient(path=DB_PATH)

    # "music_vault"(음악 금고)라는 이름의 데이터 바구니(컬렉션)를 가져옵니다. 
    # 이름처럼 get(가져오거나) or create(없으면 새로 만들기) 역할을 동시에 수행합니다.
    collection = chroma_client.get_or_create_collection(name="music_vault")

    # 데이터 바구니가 성공적으로 준비되었는지 터미널 창에 초록색 체크 표시와 함께 출력합니다.
    print(f"✅ [ChromaDB] Collection loaded: {collection.name}")

    # 준비된 데이터 바구니(컬렉션 객체)를 함수 밖으로 내보내서 쓸 수 있게 합니다.
    return collection


# 위에서 만든 함수를 바로 실행하여,
# 앞으로 프로그램 전체에서 음악 데이터를 넣고 뺄 때 사용할 'collection'이라는 변수에 완성된 바구니를 담아둡니다.
collection = get_chroma_client()


async def async_get_collection(**kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: collection.get(**kwargs))


async def async_upsert_collection(**kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: collection.upsert(**kwargs))

