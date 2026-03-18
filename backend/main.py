import uvicorn

# [1] 서버 진입점 (Entry Point)
# uvicorn.run을 통해 웹 서버를 가장 먼저 실행합니다.

if __name__ == "__main__":
    print("main 시작")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
