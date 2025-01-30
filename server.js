// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

// Keep the same game logic as previous server.js
// [PASTE THE GAME LOGIC FROM PREVIOUS server.js HERE]

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});