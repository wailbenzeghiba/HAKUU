// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

app.use(express.static("public")); // serve your client files from ./public

let waitingSocket = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("find-peer", () => {
    if (waitingSocket && waitingSocket !== socket) {
      // Pair them
      const peer1 = waitingSocket;
      const peer2 = socket;

      // Save peer info for signaling
      peer1.peerId = peer2.id;
      peer2.peerId = peer1.id;

      // Notify both clients they're matched
      peer1.emit("matched", { peerId: peer2.id });
      peer2.emit("matched", { peerId: peer1.id });

      // Clear waiting socket
      waitingSocket = null;
    } else {
      // No one waiting, put this socket in queue
      waitingSocket = socket;
    }
  });

  socket.on("signal", ({ peerId, data }) => {
    const peer = io.sockets.sockets.get(peerId);
    if (peer) {
      peer.emit("signal", { peerId: socket.id, data });
    }
  });

  socket.on("chat-message", ({ peerId, msg }) => {
    const peer = io.sockets.sockets.get(peerId);
    if (peer) {
      peer.emit("chat-message", { from: socket.id, msg });
    }
  });

  socket.on("disconnect-peer", () => {
    if (socket.peerId) {
      const peer = io.sockets.sockets.get(socket.peerId);
      if (peer) {
        peer.emit("peer-disconnected");
      }
    }
    cleanup(socket);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.peerId) {
      const peer = io.sockets.sockets.get(socket.peerId);
      if (peer) {
        peer.emit("peer-disconnected");
      }
    }
    cleanup(socket);
  });

  function cleanup(sock) {
    if (waitingSocket === sock) {
      waitingSocket = null;
    }
    if (sock.peerId) {
      const peer = io.sockets.sockets.get(sock.peerId);
      if (peer) {
        peer.peerId = null;
      }
      sock.peerId = null;
    }
  }
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
