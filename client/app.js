const socket = io();
let gameId;
let playerColor;
let board;

const socket = io('https://chess-project-zzsb.onrender.com', {
  withCredentials: true,
  extraHeaders: {
    "my-custom-header": "abcd"

// Initialize chessboard
function initBoard() {
    const config = {
        position: 'start',
        draggable: true,
        onDragStart: onDragStart,
        onDrop: onDrop,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('board', config);
}

function onDragStart(source, piece) {
    if (playerColor === 'white' && piece.search(/^w/) === -1) return false;
    if (playerColor === 'black' && piece.search(/^b/) === -1) return false;
}

function onDrop(source, target) {
    socket.emit('move', {
        gameId: gameId,
        from: source,
        to: target,
        color: playerColor
    });
}

// Socket.io events
socket.on('gameStart', (data) => {
    gameId = data.gameId;
    playerColor = data.color;
    document.getElementById('status').textContent = `Game started! You're playing as ${playerColor}`;
});

socket.on('move', (data) => {
    board.position(data.fen);
});

// Initialize game
initBoard();
socket.emit('findGame');
