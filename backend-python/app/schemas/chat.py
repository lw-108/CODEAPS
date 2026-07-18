from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class ChatMessageBase(BaseModel):
    text: str
    sender: str # 'user' or 'ai'
    project_id: Optional[int] = None

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    user_id: Optional[int] = None
    timestamp: datetime

    class Config:
        from_attributes = True
