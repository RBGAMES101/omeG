const startButton = document.getElementById("start");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let pc = new RTCPeerConnection();
let socket = new WebSocket("wss://" + window.location.host + "/api/ws");

// Store signaling data in localStorage (Fallback)
socket.onmessage = async (event) => {
    let data = JSON.parse(event.data);
    localStorage.setItem("signaling", JSON.stringify(data));
    if (data.match) {
        let offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.send(JSON.stringify({ offer }));
    } else if (data.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
};

// If server is down, load previous signaling data
if (!navigator.onLine) {
    let savedData = localStorage.getItem("signaling");
    if (savedData) {
        let data = JSON.parse(savedData);
        pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
}

startButton.onclick = async () => {
    let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
};

pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
};
