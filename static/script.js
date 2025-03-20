const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startChat = document.getElementById("startChat");

let peerConnection;
let socket = new WebSocket("wss://" + window.location.host + "/api/ws");
let localStream;

// STUN server for WebRTC
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

socket.onmessage = async (event) => {
    let message = JSON.parse(event.data);

    if (message.offer) {
        peerConnection = new RTCPeerConnection(config);
        addTracks();
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        let answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.send(JSON.stringify({ answer: answer }));
    } 
    else if (message.answer) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } 
    else if (message.iceCandidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
    }
};

async function startCall() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    
    peerConnection = new RTCPeerConnection(config);
    addTracks();

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({ offer: offer }));
}

function addTracks() {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (event) => remoteVideo.srcObject = event.streams[0];
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) socket.send(JSON.stringify({ iceCandidate: event.candidate }));
    };
}

startChat.onclick = startCall;
