from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Message

async def get_last_messages(db: AsyncSession, limit: int = 50):
    # Fetch latest messages descending, then reverse so they are chronological
    stmt = select(Message).order_by(Message.id.desc()).limit(limit)
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return messages[::-1]

async def create_message(db: AsyncSession, nickname: str, content: str):
    msg = Message(nickname=nickname, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg
