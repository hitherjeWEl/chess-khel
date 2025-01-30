const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Game storage with metadata
const games = new Map();

// Game configuration
const GAME_CONFIG = {
  MAX_PLAYERS: 2,
  TIMEOUT: 10000 // 10 seconds for move validation
};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Handle game creation/joining
  socket.on('findGame', () => {
    try {
      const availableGame = [...games.values()].find(game => 
        game.players.length === 1 && game.status === 'waiting'
      );

      if (availableGame) {
        handleJoinGame(socket, availableGame);
      } else {
        createNewGame(socket);
      }
    } catch (error) {
      console.error('Error finding game:', error);
      socket.emit('error', 'Failed to find a game');
    }
  });

  // Handle chess moves
  socket.on('move', (data) => {
    try {
      const game = games.get(data.gameId);
      if (!game) {
        return socket.emit('error', 'Game not found');
      }

      if (game.chess.turn() !== data.color[0]) {
        return socket.emit('error', 'Not your turn');
      }

      const move = game.chess.move({
        from: data.from,
        to: data.to,
        promotion: data.promotion || 'q'
      });

      if (move) {
        game.lastMove = Date.now();
        io.to(data.gameId).emit('gameState', {
          fen: game.chess.fen(),
          pgn: game.chess.pgn(),
          turn: game.chess.turn(),
          isCheck: game.chess.isCheck(),
          isCheckmate: game.chess.isCheckmate()
        });

        if (game.chess.isGameOver()) {
          handleGameEnd(game);
        }
      }
    } catch (error) {
      console.error('Move error:', error);
      socket.emit('error', 'Invalid move');
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    cleanupPlayer(socket.id);
  });
});

function handleJoinGame(socket, game) {
  game.players.push(socket.id);
  game.status = 'active';
  games.set(game.id, game);

  socket.join(game.id);
  io.to(game.id).emit('gameStart', {
    gameId: game.id,
    players: game.players,
    color: 'black',
    fen: game.chess.fen()
  });
}

function createNewGame(socket) {
  const newGame = {
    id: `game_${Date.now()}`,
    players: [socket.id],
    chess: new Chess(),
    status: 'waiting',
    createdAt: Date.now(),
    lastMove: null
  };

  games.set(newGame.id, newGame);
  socket.join(newGame.id);
  socket.emit('gameStart', {
    gameId: newGame.id,
    players: [socket.id],
    color: 'white',
    fen: newGame.chess.fen()
  });
}

function handleGameEnd(game) {
  const result = {
    winner: game.chess.isCheckmate() ? game.chess.turn() === 'w' ? 'black' : 'white' : null,
    status: game.chess.isCheckmate() ? 'checkmate' : 
           game.chess.isDraw() ? 'draw' : 
           'unknown'
  };

  io.to(game.id).emit('gameOver', result);
  games.delete(game.id);
}

function cleanupPlayer(playerId) {
  games.forEach((game, gameId) => {
    if (game.players.includes(playerId)) {
      // Notify remaining player
      game.players = game.players.filter(id => id !== playerId);
      if (game.players.length > 0) {
        io.to(gameId).emit('playerLeft', 'Opponent disconnected');
      }
      games.delete(gameId);
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    games: games.size,
    players: io.engine.clientsCount
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
