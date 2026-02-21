from pydantic import BaseModel
from datetime import datetime

class MessageRead(BaseModel):
    id: int
    nickname: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
