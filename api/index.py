from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import json
import random

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = []  # Stores active WebSocket clients waiting for a match
pairs = {}  # Active WebRTC pairs


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Match users randomly
            if message["type"] == "find":
                if len(clients) > 1:
                    # Find a random other client
                    clients.remove(websocket)
                    match = random.choice(clients)
                    clients.remove(match)

                    # Store the pair
                    pairs[websocket] = match
                    pairs[match] = websocket

                    # Notify both users they are paired
                    await websocket.send_text(json.dumps({"type": "match"}))
                    await match.send_text(json.dumps({"type": "match"}))

            elif message["type"] in ["offer", "answer", "candidate"]:
                # Forward WebRTC data to the paired user
                if websocket in pairs:
                    await pairs[websocket].send_text(json.dumps(message))

            elif message["type"] == "skip":
                if websocket in pairs:
                    other = pairs.pop(websocket)
                    pairs.pop(other, None)
                    clients.append(other)  # Put back into queue
                    await other.send_text(json.dumps({"type": "skip"}))
                    await websocket.send_text(json.dumps({"type": "skip"}))

                clients.append(websocket)  # Put back into queue for matching

    except:
        if websocket in clients:
            clients.remove(websocket)
        if websocket in pairs:
            other = pairs.pop(websocket)
            pairs.pop(other, None)
            clients.append(other)  # Put back into queue
        await websocket.close()
