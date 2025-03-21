from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import random
import json

app = FastAPI()

# Enable CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Accept requests from all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = []  # Store WebSocket clients (users)
pairs = {}  # Active WebRTC pairs


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # When the user wants to match with someone
            if message["type"] == "find":
                if len(clients) > 1:
                    clients.remove(websocket)
                    match = random.choice(clients)
                    clients.remove(match)

                    # Create a WebRTC pair and notify both users
                    pairs[websocket] = match
                    pairs[match] = websocket

                    await websocket.send_text(json.dumps({"type": "match"}))
                    await match.send_text(json.dumps({"type": "match"}))

            # Handle WebRTC signaling (offer/answer/ICE candidates)
            elif message["type"] in ["offer", "answer", "candidate"]:
                if websocket in pairs:
                    await pairs[websocket].send_text(json.dumps(message))

            # Handle "next" (skip to new user)
            elif message["type"] == "next":
                if websocket in pairs:
                    other = pairs.pop(websocket)
                    pairs.pop(other, None)
                    clients.append(other)
                    await other.send_text(json.dumps({"type": "next"}))

                clients.append(websocket)
                socket.send(json.dumps({"type": "find"}))

    except:
        # Clean up when the user disconnects
        if websocket in clients:
            clients.remove(websocket)
        if websocket in pairs:
            other = pairs.pop(websocket)
            pairs.pop(other, None)
            clients.append(other)
        await websocket.close()
