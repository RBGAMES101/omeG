from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your frontend URL for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = set()  # Store active WebSocket clients

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Relay offer/answer/ICE candidates to a random user
            for client in clients:
                if client != websocket:
                    await client.send_text(json.dumps(message))
                    break  # Send to one random user only

    except:
        clients.remove(websocket)
        await websocket.close()
