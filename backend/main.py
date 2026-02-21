from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import json
import os

from database import engine, Base, AsyncSessionLocal
from models import Message
import crud
import schemas

app = FastAPI(title="Real-time Chat App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://rtchat-frontend-5173.loca.lt",
        "https://friendly-cow-23.loca.lt",
        "https://terrible-stingray-64.loca.lt"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.broadcast_user_count()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_user_count(self):
        count_msg = json.dumps({"type": "users_count", "count": len(self.active_connections)})
        for connection in self.active_connections:
            try:
                await connection.send_text(count_msg)
            except RuntimeError:
                pass # Connection already closed

    async def broadcast_message(self, message: schemas.MessageRead):
        msg_json = json.dumps({
            "type": "message",
            "message": message.model_dump(mode="json")
        })
        for connection in self.active_connections:
            try:
                await connection.send_text(msg_json)
            except RuntimeError:
                pass 

manager = ConnectionManager()

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Create tables (for production better to use Alembic, but this is a minimal project)
        await conn.run_sync(Base.metadata.create_all)

@app.get("/messages", response_model=List[schemas.MessageRead])
async def read_messages(db: AsyncSession = Depends(get_db)):
    return await crud.get_last_messages(db)

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                nickname = payload.get("nickname", "Anonymous").strip()
                content = payload.get("content", "").strip()
                
                if nickname and content:
                    # Retrieve a temporary session so we don't hold the DB connection open across the websocket loop
                    async with AsyncSessionLocal() as db:
                        msg = await crud.create_message(db, nickname, content)
                        msg_schema = schemas.MessageRead.model_validate(msg)
                    await manager.broadcast_message(msg_schema)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_user_count()

@app.get("/health")
async def health_check():
    return {"status": "ok"}
