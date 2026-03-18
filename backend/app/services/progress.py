import asyncio
import json
import threading

class ProgressManager:
    def __init__(self):
        self.tasks = {}
        self.lock = threading.Lock()

    def create_task(self, task_id: str):
        with self.lock:
            if task_id not in self.tasks:
                self.tasks[task_id] = asyncio.Queue()

    async def update(self, task_id: str, message: str, progress: int):
        if task_id in self.tasks:
            data = json.dumps({"message": message, "progress": progress}, ensure_ascii=False)
            await self.tasks[task_id].put(data)

    async def get_stream(self, task_id: str):
        if task_id not in self.tasks: self.create_task(task_id)
        queue = self.tasks[task_id]
        try:
            while True:
                data = await queue.get()
                yield f"data: {data}\n\n"
                parsed = json.loads(data)
                if parsed.get('progress') >= 100 or "실패" in parsed.get('message', ''): break
        finally:
            with self.lock:
                if task_id in self.tasks: del self.tasks[task_id]

progress_manager = ProgressManager()
