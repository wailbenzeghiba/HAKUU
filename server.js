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

  socket.on("find-peer", () => {
    if (waitingUser && waitingUser.id !== socket.id) {
      const room = socket.id + "#" + waitingUser.id;
      socket.join(room);
      waitingUser.join(room);

      socket.emit("matched", { room, peerId: waitingUser.id });
      waitingUser.emit("matched", { room, peerId: socket.id });

      waitingUser = null;
    } else {
      waitingUser = socket;
    }
  });

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
