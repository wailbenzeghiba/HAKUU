// ===== server.js =====
// Node.js backend with Express and Socket.IO
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;
let waitingUser = null;

io.on("connection", (socket) => {
  console.log("New client connected: " + socket.id);

  if (waitingUser) {
    const room = socket.id + "#" + waitingUser.id;
    socket.join(room);
    waitingUser.join(room);

    socket.emit("matched", { room, peerId: waitingUser.id });
    waitingUser.emit("matched", { room, peerId: socket.id });

    waitingUser = null;
  } else {
    waitingUser = socket;
  }

  socket.on("signal", ({ peerId, data }) => {
    io.to(peerId).emit("signal", { peerId: socket.id, data });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected: " + socket.id);
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
    socket.broadcast.emit("peer-disconnected", socket.id);
  });
});

app.use(express.static("public"));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ===== public/index.html =====
// Place this file in a /public directory
/*<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Random Video Chat</title>
  <style>
    body { display: flex; flex-direction: column; align-items: center; font-family: sans-serif; }
    video { width: 300px; height: 225px; margin: 10px; background: black; }
    button { margin: 10px; padding: 10px 20px; }
  </style>
</head>
<body>
  <h1>Random Video Chat</h1>
  <video id="localVideo" autoplay muted playsinline></video>
  <video id="remoteVideo" autoplay playsinline></video>
  <button id="disconnectBtn">Disconnect</button>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const disconnectBtn = document.getElementById('disconnectBtn');

    let localStream;
    let peerConnection;
    const config = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;
        socket.on('matched', ({ peerId }) => startCall(peerId));
        socket.on('signal', async ({ peerId, data }) => {
          if (data.type === 'offer') {
            await createPeerConnection(peerId);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('signal', { peerId, data: answer });
          } else if (data.type === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          } else if (data.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data));
          }
        });

        socket.on('peer-disconnected', id => {
          if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
            remoteVideo.srcObject = null;
          }
        });
      });

    async function startCall(peerId) {
      await createPeerConnection(peerId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('signal', { peerId, data: offer });
    }

    async function createPeerConnection(peerId) {
      peerConnection = new RTCPeerConnection(config);
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
      peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
      };
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('signal', { peerId, data: event.candidate });
        }
      };
    }

    disconnectBtn.onclick = () => {
      if (peerConnection) peerConnection.close();
      remoteVideo.srcObject = null;
      location.reload();
    };
  </script>
</body>
</html>
*/