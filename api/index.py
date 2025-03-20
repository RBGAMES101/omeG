from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
import asyncio

app = FastAPI()

waiting_users = []  # In-memory matchmaking queue

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    waiting_users.append(websocket)

    if len(waiting_users) >= 2:
        user1 = waiting_users.pop(0)
        user2 = waiting_users.pop(0)

        await user1.send_json({"match": True})
        await user2.send_json({"match": True})

        async def relay_messages(sender, receiver):
            try:
                while True:
                    msg = await sender.receive_text()
                    await receiver.send_text(msg)
            except:
                pass  # Ignore disconnects

        asyncio.create_task(relay_messages(user1, user2))
        asyncio.create_task(relay_messages(user2, user1))
