from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String, index=True)
    content = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
