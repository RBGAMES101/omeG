from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import json
import os

app = FastAPI()

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change to your frontend URL for security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = set()  # Active WebSocket connections

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join("static", "index.html"))

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
                    break  # Only send to one user at a time

    except:
        clients.remove(websocket)
        await websocket.close()
