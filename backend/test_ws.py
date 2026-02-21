import asyncio
import websockets

async def hello():
    uri = "ws://127.0.0.1:8000/ws/chat"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            await websocket.send('{"nickname": "test", "content": "hello"}')
            print("Message sent.")
            response = await websocket.recv()
            print(f"Received: {response}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(hello())
