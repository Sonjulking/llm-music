from pydantic import BaseModel
from typing import Optional, List, Dict

class UploadResponse(BaseModel):
    message: str
    playlist_id: str
    total_links: int
    analyzed_count: int
