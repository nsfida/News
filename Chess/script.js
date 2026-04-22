/* global Chess */

const boardEl = document.getElementById('board');
const topCoordsEl = document.getElementById('topCoords');
const bottomCoordsEl = document.getElementById('bottomCoords');
const leftCoordsEl = document.getElementById('leftCoords');
const rightCoordsEl = document.getElementById('rightCoords');
const whiteNameEl = document.getElementById('whiteName');
const blackNameEl = document.getElementById('blackName');
const whiteClockEl = document.getElementById('whiteClock');
const blackClockEl = document.getElementById('blackClock');
const gameStatusEl = document.getElementById('gameStatus');
const turnInfoEl = document.getElementById('turnInfo');
const moveListEl = document.getElementById('moveList');
const moveCountEl = document.getElementById('moveCount');
const whiteCapturedEl = document.getElementById('whiteCaptured');
const blackCapturedEl = document.getElementById('blackCaptured');
const newGameBtn = document.getElementById('newGameBtn');
const flipBtn = document.getElementById('flipBtn');
const nameModal = document.getElementById('nameModal');
const nameForm = document.getElementById('nameForm');
const player1Input = document.getElementById('player1Input');
const player2Input = document.getElementById('player2Input');
const promotionModal = document.getElementById('promotionModal');
const promotionChoices = document.getElementById('promotionChoices');

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const defaultTime = 10 * 60;

let chess = new Chess();
let boardFlipped = false;
let selectedSquare = null;
let legalMoves = [];
let pendingPromotion = null;
let gameActive = false;
let gameFinished = false;
let moveHistory = [];
let capturedWhite = [];
let capturedBlack = [];
let clocks = { w: defaultTime, b: defaultTime };
let activeTick = null;
let tickAccum = 0;

const pieceSvgCache = new Map();
const pieceOrder = ['p', 'n', 'b', 'r', 'q', 'k'];

function fmtTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getPlayerName(color) {
  return color === 'w' ? whiteNameEl.textContent.trim() : blackNameEl.textContent.trim();
}

function squareColor(fileIdx, rankIdx) {
  return (fileIdx + rankIdx) % 2 === 0 ? 'light' : 'dark';
}

function toSquare(fileIdx, rankIdx) {
  return `${files[fileIdx]}${rankIdx + 1}`;
}

function squareToCoords(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return { file, rank };
}

function boardIndexToSquare(displayFile, displayRank) {
  if (!boardFlipped) {
    const file = displayFile;
    const rank = 7 - displayRank;
    return toSquare(file, rank);
  }
  const file = 7 - displayFile;
  const rank = displayRank;
  return toSquare(file, rank);
}

function squareToDisplay(square) {
  const { file, rank } = squareToCoords(square);
  if (!boardFlipped) {
    return { displayFile: file, displayRank: 7 - rank };
  }
  return { displayFile: 7 - file, displayRank: rank };
}

function pieceLabel(piece) {
  const white = piece.color === 'w';
  const title = {
    p: 'Pawn',
    n: 'Knight',
    b: 'Bishop',
    r: 'Rook',
    q: 'Queen',
    k: 'King'
  }[piece.type];
  return `${white ? 'White' : 'Black'} ${title}`;
}

function pieceSvg(type, color) {
  const key = `${type}-${color}`;
  if (pieceSvgCache.has(key)) return pieceSvgCache.get(key);

  const isWhite = color === 'w';
  const fill = isWhite ? '#f8f7f3' : '#12131d';
  const fill2 = isWhite ? '#e7e0d5' : '#2a2f43';
  const stroke = isWhite ? '#a99b87' : '#6f7895';
  const glow = isWhite ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.08)';
  const paths = {
    p: `
      <circle cx="50" cy="26" r="11" />
      <path d="M35 84c0-15 5-22 15-28 10 6 15 13 15 28H35Z" />
      <path d="M42 54h16l4 10H38l4-10Z" />
      <path d="M30 92h40" />
    `,
    n: `
      <path d="M37 88c0-12 4-20 10-28 3-4 2-10-1-16 10-1 18 2 24 10 4 4 8 12 8 20 0 7-3 13-8 18H37Z" />
      <path d="M42 42c4-10 12-16 22-16 8 0 13 3 16 8-8 1-12 6-14 11l-24-3Z" />
      <path d="M40 59c5 1 9 4 11 9" />
      <path d="M31 92h38" />
    `,
    b: `
      <path d="M50 16c10 0 18 8 18 18 0 6-3 11-7 14 9 7 12 17 11 28H28c-1-11 2-21 11-28-4-3-7-8-7-14 0-10 8-18 18-18Z" />
      <path d="M42 60h16" />
      <path d="M31 92h38" />
    `,
    r: `
      <path d="M33 20h10v10h14V20h10v10h10v12H33V30h0Z" />
      <path d="M37 42h26c3 8 5 16 6 26 0 10-2 17-7 24H38c-5-7-7-14-7-24 1-10 3-18 6-26Z" />
      <path d="M31 92h38" />
    `,
    q: `
      <path d="M27 30l11 10 12-18 10 18 13-10-5 25c-2 9-5 15-9 19H41c-4-4-7-10-9-19l-5-25Z" />
      <circle cx="32" cy="21" r="5" />
      <circle cx="50" cy="15" r="5" />
      <circle cx="68" cy="21" r="5" />
      <path d="M35 63h30" />
      <path d="M31 92h38" />
    `,
    k: `
      <path d="M47 17h6v13h13v6H53v13h-6V36H34v-6h13V17Z" />
      <path d="M34 43h32c4 8 6 17 6 27 0 10-3 17-8 22H36c-5-5-8-12-8-22 0-10 2-19 6-27Z" />
      <path d="M31 92h38" />
    `
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${pieceLabel({ type, color })}">
      <defs>
        <linearGradient id="g-${key}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${isWhite ? '#ffffff' : '#22283a'}" />
          <stop offset="55%" stop-color="${fill}" />
          <stop offset="100%" stop-color="${fill2}" />
        </linearGradient>
        <filter id="s-${key}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${glow}" />
        </filter>
      </defs>
      <g filter="url(#s-${key})" fill="url(#g-${key})" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        ${paths[type]}
      </g>
    </svg>
  `;

  const uri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  pieceSvgCache.set(key, uri);
  return uri;
}

function buildCoordinateLabels() {
  const filesDisplay = boardFlipped ? [...files].reverse() : [...files];
  const ranksDisplay = boardFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];

  topCoordsEl.innerHTML = filesDisplay.map(f => `<span>${f}</span>`).join('');
  bottomCoordsEl.innerHTML = filesDisplay.map(f => `<span>${f}</span>`).join('');
  leftCoordsEl.innerHTML = ranksDisplay.map(r => `<span>${r}</span>`).join('');
  rightCoordsEl.innerHTML = ranksDisplay.map(r => `<span>${r}</span>`).join('');
}

function buildBoard() {
  boardEl.innerHTML = '';

  for (let displayRank = 0; displayRank < 8; displayRank++) {
    for (let displayFile = 0; displayFile < 8; displayFile++) {
      const square = boardIndexToSquare(displayFile, displayRank);
      const { file, rank } = squareToCoords(square);
      const sq = document.createElement('div');
      sq.className = `square ${squareColor(file, rank)}`;
      sq.dataset.square = square;
      sq.addEventListener('click', onSquareClick);
      boardEl.appendChild(sq);
    }
  }
}

function clearHighlights() {
  document.querySelectorAll('.square').forEach(squareEl => {
    squareEl.classList.remove('selected', 'legal', 'capture', 'last-from', 'last-to', 'check');
  });
}

function getSquareEl(square) {
  return boardEl.querySelector(`[data-square="${square}"]`);
}

function showLegalMoves(square) {
  legalMoves = chess.moves({ square, verbose: true });
  const fromEl = getSquareEl(square);
  if (fromEl) fromEl.classList.add('selected');

  legalMoves.forEach(move => {
    const targetEl = getSquareEl(move.to);
    if (!targetEl) return;
    targetEl.classList.add(move.captured ? 'capture' : 'legal');
  });

  if (isKingInCheck(chess.turn())) {
    const kingSquare = findKingSquare(chess.turn());
    if (kingSquare) getSquareEl(kingSquare)?.classList.add('check');
  }
}

function findKingSquare(color) {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.type === 'k' && piece.color === color) {
        return toSquare(f, 7 - r);
      }
    }
  }
  return null;
}

function isKingInCheck(color) {
  return chess.isCheck() && chess.turn() === color;
}

function renderBoard() {
  clearHighlights();
  buildCoordinateLabels();

  const board = chess.board();
  const squares = Array.from(boardEl.children);
  squares.forEach(squareEl => {
    squareEl.innerHTML = '';
    squareEl.classList.remove('last-from', 'last-to', 'check');
  });

  if (chess.history({ verbose: true }).length > 0) {
    const last = chess.history({ verbose: true }).at(-1);
    getSquareEl(last.from)?.classList.add('last-from');
    getSquareEl(last.to)?.classList.add('last-to');
  }

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;
      const square = toSquare(file, 7 - rank);
      const squareEl = getSquareEl(square);
      if (!squareEl) continue;
      const img = document.createElement('img');
      img.className = 'piece';
      img.alt = pieceLabel(piece);
      img.src = pieceSvg(piece.type, piece.color);
      squareEl.appendChild(img);
    }
  }

  if (selectedSquare) {
    showLegalMoves(selectedSquare);
  } else if (isKingInCheck(chess.turn())) {
    const kingSquare = findKingSquare(chess.turn());
    if (kingSquare) getSquareEl(kingSquare)?.classList.add('check');
  }

  renderMoveList();
  renderCaptured();
  renderClocks();
  renderStatus();
}

function renderMoveList() {
  moveListEl.innerHTML = '';
  const history = chess.history({ verbose: true });
  moveCountEl.textContent = `${history.length} move${history.length === 1 ? '' : 's'}`;

  for (let i = 0; i < history.length; i += 2) {
    const whiteMove = history[i];
    const blackMove = history[i + 1];
    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `
      <div class="move-no">${Math.floor(i / 2) + 1}.</div>
      <div class="move-san white">${whiteMove ? whiteMove.san : ''}</div>
      <div class="move-san black">${blackMove ? blackMove.san : ''}</div>
    `;
    moveListEl.appendChild(row);
  }

  if (!history.length) {
    const empty = document.createElement('div');
    empty.className = 'move-row';
    empty.innerHTML = '<div class="move-no">1.</div><div class="move-san white">Waiting</div><div class="move-san black">for first move</div>';
    moveListEl.appendChild(empty);
  }
}

function renderCaptured() {
  whiteCapturedEl.innerHTML = capturedWhite.map(p => `<span class="capture-piece"><img alt="${p}" src="${pieceSvg(p, 'w')}"></span>`).join('');
  blackCapturedEl.innerHTML = capturedBlack.map(p => `<span class="capture-piece"><img alt="${p}" src="${pieceSvg(p, 'b')}"></span>`).join('');
}

function renderClocks() {
  whiteClockEl.textContent = fmtTime(clocks.w);
  blackClockEl.textContent = fmtTime(clocks.b);

  const whiteUrgent = clocks.w <= 60 && clocks.w > 0;
  const blackUrgent = clocks.b <= 60 && clocks.b > 0;
  whiteClockEl.style.color = whiteUrgent ? '#ffb4b4' : '';
  blackClockEl.style.color = blackUrgent ? '#ffb4b4' : '';
}

function renderStatus() {
  const turn = chess.turn();
  const whiteTurn = turn === 'w';
  const activePlayer = getPlayerName(turn);
  const inCheck = chess.isCheck();

  if (!gameActive) {
    gameStatusEl.textContent = gameFinished ? 'Game over' : 'Ready';
    turnInfoEl.textContent = gameFinished ? 'Start a new match to play again' : 'Enter names to begin';
    return;
  }

  if (chess.isCheckmate()) {
    const winner = getPlayerName(turn === 'w' ? 'b' : 'w');
    gameStatusEl.textContent = 'Checkmate';
    turnInfoEl.textContent = `${winner} wins the game`;
    return;
  }

  if (chess.isStalemate()) {
    gameStatusEl.textContent = 'Stalemate';
    turnInfoEl.textContent = 'The game is drawn';
    return;
  }

  if (chess.isThreefoldRepetition()) {
    gameStatusEl.textContent = 'Threefold repetition';
    turnInfoEl.textContent = 'The game is drawn';
    return;
  }

  if (chess.isDraw()) {
    gameStatusEl.textContent = 'Draw';
    turnInfoEl.textContent = 'The game is drawn';
    return;
  }

  gameStatusEl.textContent = inCheck ? 'Check' : 'In progress';
  turnInfoEl.textContent = `${activePlayer} to move${inCheck ? ' and must respond to check' : ''}`;

  document.getElementById('whiteLabel').textContent = whiteTurn ? 'White to move' : 'White';
  document.getElementById('blackLabel').textContent = whiteTurn ? 'Black' : 'Black to move';
}

function openPromotionPicker(color, from, to) {
  pendingPromotion = { from, to, color };
  const pieces = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' }
  ];

  promotionChoices.innerHTML = '';
  pieces.forEach(piece => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'promo-choice';
    btn.innerHTML = `<img alt="${piece.label}" src="${pieceSvg(piece.type, color)}">`;
    btn.addEventListener('click', () => {
      promotionModal.classList.remove('show');
      const move = chess.move({ from, to, promotion: piece.type });
      pendingPromotion = null;
      if (move) {
        afterMove(move);
      }
    });
    promotionChoices.appendChild(btn);
  });

  promotionModal.classList.add('show');
}

function afterMove(move) {
  if (move.captured) {
    if (move.color === 'w') {
      capturedBlack.push(move.captured);
    } else {
      capturedWhite.push(move.captured);
    }
  }

  selectedSquare = null;
  legalMoves = [];
  moveHistory.push(move.san);

  if (chess.isCheckmate() || chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial() || chess.isThreefoldRepetition()) {
    gameFinished = true;
    gameActive = false;
    stopTicking();
    renderBoard();
    const winner = chess.isCheckmate() ? getPlayerName(move.color) : null;
    if (chess.isCheckmate()) {
      gameStatusEl.textContent = 'Checkmate';
      turnInfoEl.textContent = `${winner} wins the match`;
    } else {
      gameStatusEl.textContent = 'Draw';
      turnInfoEl.textContent = 'The match ended in a draw';
    }
    return;
  }

  renderBoard();
}

function onSquareClick(e) {
  if (!gameActive || gameFinished || promotionModal.classList.contains('show')) return;
  const square = e.currentTarget.dataset.square;
  const piece = chess.get(square);

  if (selectedSquare) {
    const legal = legalMoves.find(m => m.to === square);
    if (legal) {
      if (legal.promotion) {
        openPromotionPicker(chess.turn(), selectedSquare, square);
        return;
      }
      const move = chess.move({ from: selectedSquare, to: square });
      if (move) afterMove(move);
      return;
    }
  }

  if (piece && piece.color === chess.turn()) {
    selectedSquare = square;
    renderBoard();
  } else {
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
  }
}

function startTicking() {
  stopTicking();
  tickAccum = 0;
  activeTick = setInterval(() => {
    if (!gameActive || gameFinished) return;
    const current = chess.turn();
    clocks[current] -= 1;
    if (clocks[current] <= 0) {
      clocks[current] = 0;
      renderClocks();
      const winnerColor = current === 'w' ? 'b' : 'w';
      gameFinished = true;
      gameActive = false;
      stopTicking();
      gameStatusEl.textContent = 'Time out';
      turnInfoEl.textContent = `${getPlayerName(winnerColor)} wins on time`;
      renderBoard();
      return;
    }
    renderClocks();
  }, 1000);
}

function stopTicking() {
  if (activeTick) {
    clearInterval(activeTick);
    activeTick = null;
  }
}

function resetGame(keepNames = true) {
  chess = new Chess();
  selectedSquare = null;
  legalMoves = [];
  pendingPromotion = null;
  gameActive = keepNames;
  gameFinished = false;
  moveHistory = [];
  capturedWhite = [];
  capturedBlack = [];
  clocks = { w: defaultTime, b: defaultTime };
  stopTicking();
  if (keepNames) startTicking();
  renderBoard();
}

function setDefaultNames() {
  const p1 = player1Input.value.trim() || 'Player 1';
  const p2 = player2Input.value.trim() || 'Player 2';
  whiteNameEl.textContent = p1;
  blackNameEl.textContent = p2;
}

function init() {
  buildBoard();
  buildCoordinateLabels();
  renderBoard();
  renderClocks();
  gameActive = false;
  gameFinished = false;
  gameStatusEl.textContent = 'Ready';
  turnInfoEl.textContent = 'Enter names to begin';

  newGameBtn.addEventListener('click', () => {
    resetGame(true);
  });

  flipBtn.addEventListener('click', () => {
    boardFlipped = !boardFlipped;
    buildBoard();
    renderBoard();
  });

  nameForm.addEventListener('submit', event => {
    event.preventDefault();
    setDefaultNames();
    nameModal.classList.remove('show');
    resetGame(true);
  });

  player1Input.value = 'Player 1';
  player2Input.value = 'Player 2';
  whiteNameEl.textContent = 'Player 1';
  blackNameEl.textContent = 'Player 2';
  renderStatus();
}

init();
