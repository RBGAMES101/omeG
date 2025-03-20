const socket = new WebSocket("wss://" + window.location.host + "/ws");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const skipBtn = document.getElementById("skipBtn");

const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

let matched = false;

// Get camera & microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    });

peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
};

peerConnection.onicecandidate = event => {
    if (event.candidate && matched) {
        socket.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
    }
};

// When WebSocket connects, request a match
socket.onopen = () => {
    socket.send(JSON.stringify({ type: "find" }));
};

// Handle WebSocket messages
socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "match") {
        matched = true;
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: "offer", offer }));
    }

    if (message.type === "offer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: "answer", answer }));
    }

    if (message.type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    }

    if (message.type === "candidate") {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }

    if (message.type === "skip") {
        resetCall();
        socket.send(JSON.stringify({ type: "find" }));
    }
};

// Skip button event
skipBtn.onclick = () => {
    socket.send(JSON.stringify({ type: "skip" }));
};

// Reset connection when skipping
function resetCall() {
    matched = false;
    peerConnection.close();
    remoteVideo.srcObject = null;

    // Create a new connection
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localVideo.srcObject = stream;
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        });

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate && matched) {
            socket.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };
}
