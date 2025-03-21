const socket = new WebSocket("ws://" + window.location.host + "/ws"); // Using ws:// instead of wss://

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const nextBtn = document.getElementById("nextBtn");

let peerConnection;
let matched = false;

// Set up ICE servers for WebRTC
const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// Handle Media (Camera and Microphone)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        startWebRTC(stream);
    });

function startWebRTC(stream) {
    peerConnection = new RTCPeerConnection(config);

    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
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

// Handle WebSocket Messages (Matching & Signaling)
socket.onopen = () => {
    socket.send(JSON.stringify({ type: "find" }));
};

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

    if (message.type === "next") {
        resetCall();
        socket.send(JSON.stringify({ type: "find" }));
    }
};

// Handle "Next" Button
nextBtn.onclick = () => {
    socket.send(JSON.stringify({ type: "next" }));
};

function resetCall() {
    matched = false;
    peerConnection.close();
    remoteVideo.srcObject = null;
    startWebRTC(localVideo.srcObject);
}
