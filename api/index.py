from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# CORS to allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your frontend domain for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = set()  # Store WebRTC clients

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Relay WebRTC signaling messages to other clients
            for client in clients:
                if client != websocket:
                    await client.send_text(json.dumps(message))
                    break  # Send only to one other client

    except:
        clients.remove(websocket)
        await websocket.close()
