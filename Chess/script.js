'use strict';

/*
  Grandmaster Arena Online
  - Fixes Supabase game creation payload
  - Uses schema-safe inserts into public.games and public.game_moves
  - Falls back to local storage if Supabase is not configured or unavailable
  - Keeps the overlay/login flow reliable
*/

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const DEFAULT_TIME = 600;
const LOCAL_STORAGE_KEYS = {
  session: 'ga.session.v2',
  theme: 'ga.theme.v2',
  directory: 'ga.directory.v2',
  games: 'ga.games.v2',
  activeGame: 'ga.activeGame.v2'
};

const PIECE_SYMBOLS = {
  wp: '♙', wr: '♖', wn: '♘', wb: '♗', wq: '♕', wk: '♔',
  bp: '♟', br: '♜', bn: '♞', bb: '♝', bq: '♛', bk: '♚'
};

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NAMES = { p: 'Pawn', r: 'Rook', n: 'Knight', b: 'Bishop', q: 'Queen', k: 'King' };

const SUPABASE_URL = window.SUPABASE_URL || window.__SUPABASE_URL__ || '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__ || '';

const els = {};
let state = null;
let supabaseClient = null;
let tickTimer = null;

function $(id) {
  return document.getElementById(id);
}

function camelize(id) {
  return id.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

function uid() {
  return crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function opposite(color) {
  return color === 'w' ? 'b' : 'w';
}

function deepClone(obj) {
  return typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
}

function squareName(r, c) {
  return `${FILES[c]}${8 - r}`;
}

function coordsFromSquare(sq) {
  return [8 - Number(sq[1]), FILES.indexOf(sq[0])];
}

function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>'"]/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

function initialBoard() {
  const fenRows = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'.split('/');
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  fenRows.forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        c += Number(ch);
      } else {
        board[r][c] = {
          type: ch.toLowerCase(),
          color: ch === ch.toUpperCase() ? 'w' : 'b',
          moved: false
        };
        c += 1;
      }
    }
  });

  return board;
}

function defaultGame(title = 'Lobby') {
  return {
    id: uid(),
    inviteToken: uid().slice(0, 10),
    title,
    createdByUserId: null,
    createdByName: null,
    whiteUserId: null,
    whiteName: null,
    blackUserId: null,
    blackName: null,
    inviteeUserId: null,
    inviteeName: null,
    participants: [],
    status: 'active',
    result: null,
    winnerUserId: null,
    winnerName: null,
    inviteStatus: 'pending',
    inviteAcceptedAt: null,
    timeControlSeconds: DEFAULT_TIME,
    turn: 'w',
    moveCount: 0,
    lastMoveSan: null,
    lastMove: null,
    board: initialBoard(),
    moveHistory: [],
    captured: { w: [], b: [] },
    clocks: { w: DEFAULT_TIME, b: DEFAULT_TIME },
    castling: { w: { king: true, queen: true }, b: { king: true, queen: true } },
    enPassant: null,
    selected: null,
    legalMoves: [],
    activeClock: null,
    lastTick: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeGame(input) {
  const base = defaultGame(input?.title || 'Lobby');
  const game = {
    ...base,
    ...(input || {})
  };

  game.board = Array.isArray(game.board) ? game.board : initialBoard();
  game.moveHistory = Array.isArray(game.moveHistory) ? game.moveHistory : [];
  game.participants = Array.isArray(game.participants) ? game.participants : [];
  game.captured = game.captured || { w: [], b: [] };
  game.clocks = game.clocks || { w: DEFAULT_TIME, b: DEFAULT_TIME };
  game.castling = game.castling || { w: { king: true, queen: true }, b: { king: true, queen: true } };
  game.enPassant = game.enPassant || null;
  game.turn = game.turn === 'b' ? 'b' : 'w';
  game.status = game.status || 'active';
  game.result = game.result || null;
  game.inviteStatus = game.inviteStatus || 'pending';
  game.lastTick = Number.isFinite(game.lastTick) ? game.lastTick : Date.now();
  game.timeControlSeconds = Number.isFinite(game.timeControlSeconds) ? game.timeControlSeconds : DEFAULT_TIME;
  game.moveCount = Number.isFinite(game.moveCount) ? game.moveCount : 0;
  return game;
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function toast(message, type = 'info') {
  const container = els.toastContainer;
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
  }, 2600);

  setTimeout(() => el.remove(), 3200);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme === 'light' ? 'light' : 'dark';
  localStorage.setItem(LOCAL_STORAGE_KEYS.theme, document.body.dataset.theme);
  if (els.themeToggle) {
    els.themeToggle.textContent = document.body.dataset.theme === 'light' ? '☀' : '☾';
  }
}

function showApp() {
  els.loginOverlay?.classList.add('hidden');
  els.appShell?.classList.remove('hidden');
}

function showLogin() {
  els.appShell?.classList.add('hidden');
  els.loginOverlay?.classList.remove('hidden');
}

function syncUserChip() {
  els.currentUserChip.textContent = state?.session?.name || state?.session?.userId || 'Guest';
}

function createBoardGrid() {
  els.rankAxis.innerHTML = '';
  els.fileAxis.innerHTML = '';
  els.chessBoard.innerHTML = '';

  for (let r = 0; r < 8; r++) {
    const rank = document.createElement('span');
    rank.textContent = String(8 - r);
    els.rankAxis.appendChild(rank);
  }

  for (let c = 0; c < 8; c++) {
    const file = document.createElement('span');
    file.textContent = FILES[c];
    els.fileAxis.appendChild(file);
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      sq.dataset.row = String(r);
      sq.dataset.col = String(c);
      sq.addEventListener('click', onSquareClick);
      els.chessBoard.appendChild(sq);
    }
  }
}

function pieceKey(piece) {
  return `${piece.color}${piece.type}`;
}

function renderPiece(piece) {
  const el = document.createElement('div');
  el.className = 'piece';
  el.textContent = PIECE_SYMBOLS[pieceKey(piece)];
  el.style.fontSize = '2.4rem';
  el.setAttribute('aria-label', `${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type]}`);
  return el;
}

function setBoardToDom() {
  const squares = els.chessBoard.querySelectorAll('.square');
  squares.forEach(sq => {
    sq.classList.remove('selected', 'move-dot', 'capture-dot', 'last-from', 'last-to', 'in-check');
    sq.innerHTML = '';
    const r = Number(sq.dataset.row);
    const c = Number(sq.dataset.col);
    const p = state.board[r][c];
    if (p) sq.appendChild(renderPiece(p));
  });

  if (state.selected) {
    const selectedEl = els.chessBoard.querySelector(
      `.square[data-row="${state.selected.r}"][data-col="${state.selected.c}"]`
    );
    selectedEl?.classList.add('selected');
  }

  for (const move of state.legalMoves) {
    const el = els.chessBoard.querySelector(
      `.square[data-row="${move.to.r}"][data-col="${move.to.c}"]`
    );
    if (el) el.classList.add(move.capture ? 'capture-dot' : 'move-dot');
  }

  if (state.game.lastMove) {
    const [fr, fc] = coordsFromSquare(state.game.lastMove.from);
    const [tr, tc] = coordsFromSquare(state.game.lastMove.to);
    const fromEl = els.chessBoard.querySelector(`.square[data-row="${fr}"][data-col="${fc}"]`);
    const toEl = els.chessBoard.querySelector(`.square[data-row="${tr}"][data-col="${tc}"]`);
    fromEl?.classList.add('last-from');
    toEl?.classList.add('last-to');
  }

  if (isInCheck(state.board, state.turn)) {
    const king = findKing(state.board, state.turn);
    if (king) {
      const kingEl = els.chessBoard.querySelector(
        `.square[data-row="${king.r}"][data-col="${king.c}"]`
      );
      kingEl?.classList.add('in-check');
    }
  }
}

function refreshPlayers() {
  els.whiteName.textContent = state.game.whiteName || state.game.whiteUserId || 'White Player';
  els.blackName.textContent = state.game.blackName || state.game.blackUserId || 'Black Player';
  els.gameChip.textContent = state.game.title || 'Lobby';
  els.shareGameLink.value = createGameLink(state.game);
  els.inviteGameLink.value = state.game.inviteToken || '';
}

function refreshCaptures() {
  els.whiteCaptures.innerHTML = '';
  els.blackCaptures.innerHTML = '';

  (state.game.captured?.w || []).forEach(piece => {
    els.whiteCaptures.appendChild(renderPiece(piece));
  });
  (state.game.captured?.b || []).forEach(piece => {
    els.blackCaptures.appendChild(renderPiece(piece));
  });

  const whiteScore = (state.game.captured?.w || []).reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);
  const blackScore = (state.game.captured?.b || []).reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);

  els.whiteScore.textContent = `Material captured: ${whiteScore}`;
  els.blackScore.textContent = `Material captured: ${blackScore}`;
}

function refreshClocks() {
  els.whiteClock.textContent = formatClock(state.game.clocks.w);
  els.blackClock.textContent = formatClock(state.game.clocks.b);

  els.whiteClock.classList.toggle('active', state.turn === 'w');
  els.blackClock.classList.toggle('active', state.turn === 'b');
  els.whitePip.classList.toggle('active', state.turn === 'w');
  els.blackPip.classList.toggle('active', state.turn === 'b');

  els.whiteClock.classList.toggle('low', state.game.clocks.w <= 30);
  els.blackClock.classList.toggle('low', state.game.clocks.b <= 30);
}

function refreshHistory() {
  els.moveHistory.innerHTML = '';
  const moves = state.game.moveHistory || [];

  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i];
    const black = moves[i + 1];
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <div class="history-num">${(i / 2) + 1}</div>
      <div class="history-move ${i === moves.length - 2 || (moves.length === 1 && i === 0) ? 'last' : ''}">${white ? escapeHtml(white.san) : ''}</div>
      <div class="history-move ${i + 1 === moves.length - 1 ? 'last' : ''}">${black ? escapeHtml(black.san) : ''}</div>
    `;
    els.moveHistory.appendChild(row);
  }

  els.lastMoveLabel.textContent = state.game.lastMoveSan ? `Last move: ${state.game.lastMoveSan}` : 'No moves yet';
}

function refreshStatus() {
  const inCheck = isInCheck(state.board, state.turn);
  const hasMoves = availableMovesFor(state.turn).length > 0;

  els.statusDot.className = 'status-dot';

  if (state.game.status === 'finished') {
    els.gameStatus.textContent = 'Match finished';
    els.statusDot.classList.add('mate');
  } else if (inCheck && !hasMoves) {
    els.gameStatus.textContent = 'Checkmate';
    els.statusDot.classList.add('mate');
  } else if (inCheck) {
    els.gameStatus.textContent = `${state.turn === 'w' ? 'White' : 'Black'} is in check`;
    els.statusDot.classList.add('check');
  } else {
    els.gameStatus.textContent = `${state.turn === 'w' ? 'White' : 'Black'} to move`;
  }
}

function refreshRecentGames(list = []) {
  els.recentGames.innerHTML = '';
  const games = list.length ? list : loadLocal(LOCAL_STORAGE_KEYS.games, []).slice(0, 12);

  if (!games.length) {
    const empty = document.createElement('div');
    empty.className = 'game-item';
    empty.textContent = 'No games yet.';
    els.recentGames.appendChild(empty);
    return;
  }

  games.forEach(game => {
    const row = document.createElement('div');
    row.className = 'game-item';
    row.addEventListener('click', () => setGame(normalizeGame(game)));
    row.innerHTML = `
      <div class="game-item-top">
        <div>
          <div class="game-title">${escapeHtml(game.title || 'Game')}</div>
          <div class="game-meta">${escapeHtml((game.id || '').slice(0, 8))} · ${new Date(game.updatedAt || game.createdAt || Date.now()).toLocaleString()}</div>
        </div>
        <div class="game-badge">${escapeHtml(game.status || 'active')}</div>
      </div>
      <div class="game-meta">${escapeHtml(game.whiteName || game.whiteUserId || 'White')} vs ${escapeHtml(game.blackName || game.blackUserId || 'Black')}</div>
    `;
    els.recentGames.appendChild(row);
  });
}

function refreshAll() {
  refreshPlayers();
  setBoardToDom();
  refreshCaptures();
  refreshClocks();
  refreshHistory();
  refreshStatus();
  syncUserChip();
  startClockTicker();
}

function startClockTicker() {
  clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    if (!state?.game || state.game.status !== 'active') return;

    const now = Date.now();
    const elapsed = (now - state.game.lastTick) / 1000;
    state.game.lastTick = now;
    state.game.clocks[state.turn] = clamp(state.game.clocks[state.turn] - elapsed, 0, 99999);

    if (state.game.clocks[state.turn] <= 0) {
      state.game.status = 'finished';
      state.game.result = state.turn === 'w' ? 'black_win' : 'white_win';
      state.game.winnerUserId = state.turn === 'w' ? state.game.blackUserId : state.game.whiteUserId;
      state.game.winnerName = state.turn === 'w' ? state.game.blackName : state.game.whiteName;
      showGameOver();
    }

    refreshClocks();
  }, 1000);
}

function showGameOver() {
  const whiteScore = materialScore('w');
  const blackScore = materialScore('b');

  els.gameoverIcon.textContent = state.game.result === 'stalemate' ? '🤝' : '🏆';
  els.gameoverTitle.textContent = state.game.result === 'stalemate' ? 'Stalemate' : 'Game Over';
  els.gameoverMessage.textContent = state.game.result === 'stalemate'
    ? 'No legal moves remain.'
    : `${state.game.winnerName || (state.game.result === 'white_win' ? 'White' : 'Black')} wins.`;

  els.gameoverStats.innerHTML = `
    <div><strong>White material:</strong> ${whiteScore}</div>
    <div><strong>Black material:</strong> ${blackScore}</div>
    <div><strong>Total moves:</strong> ${state.game.moveCount}</div>
  `;

  els.gameoverModal.classList.remove('hidden');
}

function materialScore(color) {
  let sum = 0;
  for (const row of state.board) {
    for (const p of row) {
      if (p && p.color === color) sum += PIECE_VALUES[p.type] || 0;
    }
  }
  return sum;
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === 'k') return { r, c };
    }
  }
  return null;
}

function isSquareAttacked(board, r, c, byColor) {
  const pawnDir = byColor === 'w' ? -1 : 1;
  const pawnRow = r - pawnDir;
  for (const dc of [-1, 1]) {
    const nr = pawnRow, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }

  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightMoves) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }

  const bishopDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const rookDirs = [[-1,0],[1,0],[0,-1],[0,1]];

  for (const [dr, dc] of bishopDirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  for (const [dr, dc] of rookDirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === byColor && p.type === 'k') return true;
      }
    }
  }

  return false;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.r, king.c, opposite(color));
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board) {
  return board.map(row => row.map(p => (p ? { ...p } : null)));
}

function generatePseudoMoves(board, r, c, enPassant = null) {
  const piece = board[r][c];
  if (!piece) return [];

  const color = piece.color;
  const forward = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;
  const lastRow = color === 'w' ? 0 : 7;
  const moves = [];

  function push(tr, tc, extra = {}) {
    if (!inBounds(tr, tc)) return;
    const target = board[tr][tc];
    if (target && target.color === color) return;
    moves.push({
      from: { r, c },
      to: { r: tr, c: tc },
      capture: !!target || !!extra.enPassant,
      ...extra
    });
  }

  if (piece.type === 'p') {
    const oneR = r + forward;
    if (inBounds(oneR, c) && !board[oneR][c]) {
      push(oneR, c, { promotion: oneR === lastRow });
      const twoR = r + forward * 2;
      if (r === startRow && !board[twoR][c]) {
        push(twoR, c, { doubleStep: true });
      }
    }

    for (const dc of [-1, 1]) {
      const tr = r + forward, tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color !== color) {
        push(tr, tc, { capture: true, promotion: tr === lastRow });
      }
      if (enPassant && enPassant.r === tr && enPassant.c === tc) {
        push(tr, tc, { capture: true, enPassant: true, promotion: tr === lastRow });
      }
    }
  }

  if (piece.type === 'n') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
      push(r + dr, c + dc);
    });
  }

  if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    const dirs = [];
    if (piece.type !== 'b') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    if (piece.type !== 'r') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);

    for (const [dr, dc] of dirs) {
      let tr = r + dr, tc = c + dc;
      while (inBounds(tr, tc)) {
        const target = board[tr][tc];
        if (!target) {
          push(tr, tc);
        } else {
          if (target.color !== color) push(tr, tc, { capture: true });
          break;
        }
        tr += dr;
        tc += dc;
      }
    }
  }

  if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        push(r + dr, c + dc);
      }
    }

    if (!piece.moved && !isInCheck(board, color)) {
      const row = color === 'w' ? 7 : 0;
      const rights = state.game.castling[color] || { king: false, queen: false };
      const rookKingSide = board[row][7];
      const rookQueenSide = board[row][0];

      if (rights.king && rookKingSide && rookKingSide.type === 'r' && rookKingSide.color === color && !rookKingSide.moved) {
        if (!board[row][5] && !board[row][6] &&
            !isSquareAttacked(board, row, 5, opposite(color)) &&
            !isSquareAttacked(board, row, 6, opposite(color))) {
          moves.push({ from: { r, c }, to: { r: row, c: 6 }, castle: 'k' });
        }
      }

      if (rights.queen && rookQueenSide && rookQueenSide.type === 'r' && rookQueenSide.color === color && !rookQueenSide.moved) {
        if (!board[row][1] && !board[row][2] && !board[row][3] &&
            !isSquareAttacked(board, row, 3, opposite(color)) &&
            !isSquareAttacked(board, row, 2, opposite(color))) {
          moves.push({ from: { r, c }, to: { r: row, c: 2 }, castle: 'q' });
        }
      }
    }
  }

  return moves;
}

function simulateMove(board, move) {
  const next = cloneBoard(board);
  const piece = next[move.from.r][move.from.c];
  const target = next[move.to.r][move.to.c];

  next[move.from.r][move.from.c] = null;

  if (move.enPassant) {
    const dir = piece.color === 'w' ? 1 : -1;
    next[move.to.r + dir][move.to.c] = null;
  }

  if (move.castle === 'k') {
    next[move.from.r][5] = next[move.from.r][7];
    next[move.from.r][7] = null;
    if (next[move.from.r][5]) next[move.from.r][5].moved = true;
  } else if (move.castle === 'q') {
    next[move.from.r][3] = next[move.from.r][0];
    next[move.from.r][0] = null;
    if (next[move.from.r][3]) next[move.from.r][3].moved = true;
  }

  next[move.to.r][move.to.c] = { ...piece, moved: true };

  return { board: next, captured: target };
}

function legalMovesForSquare(board, r, c) {
  const piece = board[r][c];
  if (!piece || piece.color !== state.turn || state.game.status !== 'active') return [];

  return generatePseudoMoves(board, r, c, state.game.enPassant).filter(move => {
    const next = simulateMove(board, move);
    return !isInCheck(next.board, piece.color);
  });
}

function availableMovesFor(color) {
  const list = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color) {
        const oldTurn = state.turn;
        state.turn = color;
        list.push(...legalMovesForSquare(state.board, r, c));
        state.turn = oldTurn;
      }
    }
  }
  return list;
}

function notationForMove(move, piece, capture, promotionPiece = null) {
  if (move.castle === 'k') return 'O-O';
  if (move.castle === 'q') return 'O-O-O';

  const name = piece.type === 'p' ? '' : piece.type.toUpperCase();
  const fromFile = piece.type === 'p' && capture ? FILES[move.from.c] : '';
  let san = `${name}${fromFile}${capture ? 'x' : ''}${squareName(move.to.r, move.to.c)}`;
  if (promotionPiece) san += `=${promotionPiece.toUpperCase()}`;
  return san;
}

function snapshotGameState() {
  return {
    board: state.game.board,
    turn: state.game.turn,
    clocks: state.game.clocks,
    castling: state.game.castling,
    enPassant: state.game.enPassant,
    moveHistory: state.game.moveHistory,
    captured: state.game.captured,
    lastMove: state.game.lastMove,
    lastMoveSan: state.game.lastMoveSan,
    status: state.game.status,
    result: state.game.result,
    winnerUserId: state.game.winnerUserId,
    winnerName: state.game.winnerName,
    title: state.game.title,
    lastTick: state.game.lastTick
  };
}

function rowToGame(row) {
  const snap = row?.state_json || {};
  return normalizeGame({
    id: row.id,
    inviteToken: row.invite_token,
    createdByUserId: row.created_by_userid,
    createdByName: row.created_by_name,
    whiteUserId: row.white_userid,
    whiteName: row.white_name,
    blackUserId: row.black_userid,
    blackName: row.black_name,
    inviteeUserId: row.invitee_userid,
    inviteeName: row.invitee_name,
    participants: row.participants,
    status: row.status,
    result: row.result,
    winnerUserId: row.winner_userid,
    winnerName: row.winner_name,
    inviteStatus: row.invite_status,
    inviteAcceptedAt: row.invite_accepted_at,
    timeControlSeconds: row.time_control_seconds,
    turn: row.current_turn,
    moveCount: row.move_count,
    lastMoveSan: row.last_move_san,
    board: snap.board || initialBoard(),
    moveHistory: snap.moveHistory || [],
    captured: snap.captured || { w: [], b: [] },
    clocks: snap.clocks || { w: DEFAULT_TIME, b: DEFAULT_TIME },
    castling: snap.castling || { w: { king: true, queen: true }, b: { king: true, queen: true } },
    enPassant: snap.enPassant || null,
    lastMove: snap.lastMove || null,
    lastTick: snap.lastTick || Date.now(),
    title: snap.title || row.title || 'Game'
  });
}

function gameToRowPayload(game) {
  return {
    invite_token: game.inviteToken,
    created_by_userid: game.createdByUserId || state.session?.userId || 'system',
    created_by_name: game.createdByName || state.session?.name || 'System',
    white_userid: game.whiteUserId || state.session?.userId || 'white',
    white_name: game.whiteName || state.session?.name || 'White Player',
    black_userid: game.blackUserId || game.inviteeUserId || 'black',
    black_name: game.blackName || game.inviteeName || 'Black Player',
    invitee_userid: game.inviteeUserId || game.blackUserId || 'black',
    invitee_name: game.inviteeName || game.blackName || 'Black Player',
    participants: Array.from(new Set([game.whiteUserId, game.blackUserId, game.inviteeUserId, state.session?.userId].filter(Boolean))),
    status: game.status,
    result: game.result,
    winner_userid: game.winnerUserId,
    winner_name: game.winnerName,
    time_control_seconds: game.timeControlSeconds || DEFAULT_TIME,
    current_turn: game.turn || 'w',
    move_count: game.moveCount || 0,
    last_move_san: game.lastMoveSan,
    state_json: snapshotGameState(),
    invite_status: game.inviteStatus || 'pending',
    invite_accepted_at: game.inviteAcceptedAt || null
  };
}

async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  if (window.supabase?.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }

  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    supabaseClient = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  } catch {
    return null;
  }
}

async function ensureUserDirectoryRecord(userId, name) {
  if (!userId) return;

  const localUsers = loadLocal(LOCAL_STORAGE_KEYS.directory, []);
  const existingIndex = localUsers.findIndex(u => String(u.userId).toLowerCase() === String(userId).toLowerCase());
  const userRecord = { userId, name: name || userId, isActive: true, updatedAt: new Date().toISOString() };

  if (existingIndex >= 0) {
    localUsers[existingIndex] = { ...localUsers[existingIndex], ...userRecord };
  } else {
    localUsers.unshift(userRecord);
  }
  saveLocal(LOCAL_STORAGE_KEYS.directory, localUsers.slice(0, 100));

  const supabase = await getSupabase();
  if (!supabase) return;

  try {
    await supabase
      .from('app_users')
      .upsert(
        {
          user_id: userId,
          name: name || userId,
          is_active: true
        },
        { onConflict: 'user_id' }
      );
  } catch {
    // Keep local directory if Supabase write is not available.
  }
}

async function listUsers(query = '') {
  const local = loadLocal(LOCAL_STORAGE_KEYS.directory, []);
  const q = query.trim().toLowerCase();

  let results = local.filter(u => {
    if (!q) return true;
    return `${u.userId} ${u.name}`.toLowerCase().includes(q);
  });

  const supabase = await getSupabase();
  if (supabase) {
    try {
      let req = supabase
        .from('app_users')
        .select('user_id, name, is_active, updated_at')
        .order('updated_at', { ascending: false })
        .limit(30);

      if (q) {
        req = supabase
          .from('app_users')
          .select('user_id, name, is_active, updated_at')
          .or(`user_id.ilike.%${q}%,name.ilike.%${q}%`)
          .order('updated_at', { ascending: false })
          .limit(30);
      }

      const { data, error } = await req;
      if (!error && Array.isArray(data)) {
        const mapped = data.map(row => ({
          userId: row.user_id,
          name: row.name,
          isActive: row.is_active !== false,
          updatedAt: row.updated_at
        }));

        const merged = new Map();
        [...mapped, ...results].forEach(u => {
          const key = String(u.userId).toLowerCase();
          if (!merged.has(key)) merged.set(key, u);
        });

        results = [...merged.values()];
      }
    } catch {
      // use local results
    }
  }

  return results;
}

function renderUserResults(users) {
  els.userResults.innerHTML = '';

  if (!users.length) {
    const empty = document.createElement('div');
    empty.className = 'game-item';
    empty.textContent = 'No matching users found.';
    els.userResults.appendChild(empty);
    return;
  }

  users.slice(0, 20).forEach(user => {
    const item = document.createElement('div');
    item.className = 'user-item';
    if (state.selectedUser?.userId === user.userId) item.classList.add('active');

    item.innerHTML = `
      <div class="user-main">
        <div class="user-name">${escapeHtml(user.name || user.userId)}</div>
        <div class="user-id">${escapeHtml(user.userId)}</div>
      </div>
      <div class="user-badge">${user.isActive === false ? 'Inactive' : 'Available'}</div>
    `;

    item.addEventListener('click', () => {
      state.selectedUser = user;
      els.selectedUser.textContent = `${user.name || user.userId} (${user.userId})`;
      els.userResults.querySelectorAll('.user-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });

    els.userResults.appendChild(item);
  });
}

async function searchUsers() {
  const q = els.inviteSearch.value || '';
  const users = await listUsers(q);
  renderUserResults(users);
}

function loadSession() {
  return loadLocal(LOCAL_STORAGE_KEYS.session, null);
}

function saveSession(session) {
  saveLocal(LOCAL_STORAGE_KEYS.session, session);
}

function clearSession() {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.session);
}

function restoreSession() {
  const session = loadSession();
  if (!session?.userId) return null;
  return {
    userId: String(session.userId),
    name: session.name || session.userId,
    loggedInAt: session.loggedInAt || new Date().toISOString()
  };
}

function ensureCurrentGameFromStorage() {
  const saved = loadLocal(LOCAL_STORAGE_KEYS.activeGame, null);
  if (saved?.id) return normalizeGame(saved);
  return null;
}

function saveGameLocally(game) {
  const games = loadLocal(LOCAL_STORAGE_KEYS.games, []);
  const idx = games.findIndex(g => g.id === game.id);
  const payload = { ...deepClone(game), updatedAt: new Date().toISOString() };

  if (idx >= 0) games[idx] = payload;
  else games.unshift(payload);

  saveLocal(LOCAL_STORAGE_KEYS.games, games);
  localStorage.setItem(LOCAL_STORAGE_KEYS.activeGame, JSON.stringify(payload));
  return payload;
}

async function persistGame(game, { alsoMoveRow = null } = {}) {
  const localPayload = saveGameLocally(game);

  const supabase = await getSupabase();
  if (!supabase) return localPayload;

  try {
    if (alsoMoveRow) {
      await supabase.from('game_moves').insert(alsoMoveRow);
    }

    const payload = gameToRowPayload(game);

    if (isUuidLike(game.id)) {
      const { error } = await supabase
        .from('games')
        .update(payload)
        .eq('id', game.id);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('games')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      if (data?.id) {
        game.id = data.id;
      }
    }
  } catch (err) {
    console.warn('Supabase persist failed, using local cache:', err);
  }

  return localPayload;
}

async function createGameInSupabase(selectedUser) {
  const supabase = await getSupabase();
  const creator = state.session;
  const game = defaultGame(`${creator.name} vs ${selectedUser.name || selectedUser.userId}`);

  game.createdByUserId = creator.userId;
  game.createdByName = creator.name;
  game.whiteUserId = creator.userId;
  game.whiteName = creator.name;
  game.blackUserId = selectedUser.userId;
  game.blackName = selectedUser.name || selectedUser.userId;
  game.inviteeUserId = selectedUser.userId;
  game.inviteeName = selectedUser.name || selectedUser.userId;
  game.participants = [creator.userId, selectedUser.userId];
  game.inviteStatus = 'pending';
  game.board = initialBoard();
  game.clocks = { w: DEFAULT_TIME, b: DEFAULT_TIME };
  game.turn = 'w';
  game.moveCount = 0;
  game.moveHistory = [];
  game.captured = { w: [], b: [] };
  game.castling = { w: { king: true, queen: true }, b: { king: true, queen: true } };
  game.lastTick = Date.now();

  if (supabase) {
    const payload = gameToRowPayload(game);
    const { data, error } = await supabase
      .from('games')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    if (data?.id) {
      game.id = data.id;
    }
  }

  await persistGame(game);
  return game;
}

async function loadRecentGames() {
  const supabase = await getSupabase();
  if (!supabase) {
    const local = loadLocal(LOCAL_STORAGE_KEYS.games, []);
    return local.slice(0, 12);
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data.map(row => rowToGame(row));
  } catch (err) {
    console.warn('Could not load recent games from Supabase:', err);
    return loadLocal(LOCAL_STORAGE_KEYS.games, []).slice(0, 12);
  }
}

async function openGameByIdOrToken(value) {
  const key = String(value || '').trim();
  if (!key) {
    toast('Paste a game ID or invite token first.', 'error');
    return;
  }

  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data: byId, error: idError } = await supabase
        .from('games')
        .select('*')
        .eq('id', key)
        .maybeSingle();

      if (!idError && byId) {
        setGame(rowToGame(byId));
        toast('Game loaded.', 'success');
        return;
      }

      const { data: byToken, error: tokenError } = await supabase
        .from('games')
        .select('*')
        .eq('invite_token', key)
        .maybeSingle();

      if (!tokenError && byToken) {
        setGame(rowToGame(byToken));
        toast('Game loaded.', 'success');
        return;
      }
    } catch (err) {
      console.warn('Supabase open game failed:', err);
    }
  }

  const localGames = loadLocal(LOCAL_STORAGE_KEYS.games, []);
  const match = localGames.find(g => g.id === key || g.inviteToken === key);
  if (match) {
    setGame(normalizeGame(match));
    toast('Game loaded.', 'success');
  } else {
    toast('Game not found.', 'error');
  }
}

function createGameLink(game) {
  return `${location.origin}${location.pathname}#game=${encodeURIComponent(game.id)}`;
}

function setGame(game) {
  state.game = normalizeGame(game);
  state.board = deepClone(state.game.board);
  state.turn = state.game.turn || 'w';
  state.selected = null;
  state.legalMoves = [];
  state.pendingPromotion = null;
  saveLocal(LOCAL_STORAGE_KEYS.activeGame, state.game);
  refreshAll();
}

function updateGameOutcome() {
  const moves = availableMovesFor(state.turn);
  const inCheck = isInCheck(state.board, state.turn);

  if (moves.length === 0) {
    state.game.status = 'finished';
    if (inCheck) {
      state.game.result = state.turn === 'w' ? 'black_win' : 'white_win';
      state.game.winnerUserId = state.turn === 'w' ? state.game.blackUserId : state.game.whiteUserId;
      state.game.winnerName = state.turn === 'w' ? state.game.blackName : state.game.whiteName;
      els.gameoverIcon.textContent = '🏆';
      els.gameoverTitle.textContent = 'Checkmate';
      els.gameoverMessage.textContent = `${state.turn === 'w' ? 'Black' : 'White'} wins by checkmate.`;
    } else {
      state.game.result = 'stalemate';
      state.game.winnerUserId = null;
      state.game.winnerName = null;
      els.gameoverIcon.textContent = '🤝';
      els.gameoverTitle.textContent = 'Stalemate';
      els.gameoverMessage.textContent = 'No legal moves remain.';
    }
    showGameOver();
  } else {
    state.game.status = 'active';
    state.game.result = null;
    els.gameoverModal.classList.add('hidden');
  }
}

function onSquareClick(e) {
  if (!state?.game || state.game.status !== 'active') return;
  const sq = e.currentTarget;
  const r = Number(sq.dataset.row);
  const c = Number(sq.dataset.col);
  const piece = state.board[r][c];

  if (state.selected) {
    const chosen = state.legalMoves.find(m => m.to.r === r && m.to.c === c);
    if (chosen) {
      if (chosen.promotion) {
        openPromotionPicker(chosen);
      } else {
        applyMove(chosen);
      }
      return;
    }
  }

  if (piece && piece.color === state.turn) {
    state.selected = { r, c };
    state.legalMoves = legalMovesForSquare(state.board, r, c);
    refreshBoardOnly();
    return;
  }

  state.selected = null;
  state.legalMoves = [];
  refreshBoardOnly();
}

function refreshBoardOnly() {
  setBoardToDom();
  refreshStatus();
  refreshClocks();
}

function openPromotionPicker(move) {
  els.promotionPieces.innerHTML = '';
  ['q', 'r', 'b', 'n'].forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'promo-btn';
    btn.type = 'button';
    btn.innerHTML = `<span style="font-size:2rem;line-height:1;">${PIECE_SYMBOLS[`${state.turn}${type}`]}</span>`;
    btn.addEventListener('click', async () => {
      els.promotionModal.classList.add('hidden');
      await applyMove(move, type);
    });
    els.promotionPieces.appendChild(btn);
  });

  els.promotionModal.classList.remove('hidden');
}

function capturePieceIfAny(prevTurn, target) {
  if (!target) return;
  state.game.captured[prevTurn].push(target);
}

async function applyMove(move, promotion = null) {
  const movingPiece = state.board[move.from.r][move.from.c];
  const target = state.board[move.to.r][move.to.c];
  const prevTurn = state.turn;

  const sim = simulateMove(state.board, move);
  state.board = sim.board;
  state.game.board = deepClone(state.board);

  if (move.castle === 'k' || move.castle === 'q') {
    // handled in simulateMove
  }

  state.game.turn = opposite(state.turn);
  state.turn = opposite(state.turn);
  state.game.moveCount += 1;
  state.game.enPassant = move.doubleStep ? { r: (move.from.r + move.to.r) / 2, c: move.to.c } : null;
  state.game.lastMove = { from: squareName(move.from.r, move.from.c), to: squareName(move.to.r, move.to.c) };

  if (movingPiece.type === 'k') {
    state.game.castling[movingPiece.color] = { king: false, queen: false };
  }

  if (movingPiece.type === 'r') {
    if (movingPiece.color === 'w' && move.from.r === 7 && move.from.c === 0) state.game.castling.w.queen = false;
    if (movingPiece.color === 'w' && move.from.r === 7 && move.from.c === 7) state.game.castling.w.king = false;
    if (movingPiece.color === 'b' && move.from.r === 0 && move.from.c === 0) state.game.castling.b.queen = false;
    if (movingPiece.color === 'b' && move.from.r === 0 && move.from.c === 7) state.game.castling.b.king = false;
  }

  if (target) {
    capturePieceIfAny(prevTurn, target);
    if (target.type === 'r') {
      if (target.color === 'w' && move.to.r === 7 && move.to.c === 0) state.game.castling.w.queen = false;
      if (target.color === 'w' && move.to.r === 7 && move.to.c === 7) state.game.castling.w.king = false;
      if (target.color === 'b' && move.to.r === 0 && move.to.c === 0) state.game.castling.b.queen = false;
      if (target.color === 'b' && move.to.r === 0 && move.to.c === 7) state.game.castling.b.king = false;
    }
  }

  if (move.enPassant) {
    const dir = movingPiece.color === 'w' ? 1 : -1;
    const capturedPawn = state.board[move.to.r + dir]?.[move.to.c];
    if (capturedPawn) capturePieceIfAny(prevTurn, capturedPawn);
  }

  let promotionPiece = null;
  const landing = state.board[move.to.r][move.to.c];
  if (landing && landing.type === 'p' && (move.to.r === 0 || move.to.r === 7)) {
    promotionPiece = promotion || 'q';
    state.board[move.to.r][move.to.c] = { ...landing, type: promotionPiece, moved: true };
    state.game.board = deepClone(state.board);
  }

  state.game.lastMoveSan = notationForMove(move, movingPiece, !!target || !!move.enPassant, promotionPiece);
  state.game.moveHistory.push({
    moveIndex: state.game.moveCount,
    san: state.game.lastMoveSan,
    from: squareName(move.from.r, move.from.c),
    to: squareName(move.to.r, move.to.c),
    piece: movingPiece.type,
    color: movingPiece.color,
    capture: !!target || !!move.enPassant,
    promotion: promotionPiece
  });

  state.game.lastTick = Date.now();
  state.selected = null;
  state.legalMoves = [];
  state.pendingPromotion = null;

  updateGameOutcome();
  await persistGame(state.game, {
    alsoMoveRow: {
      game_id: state.game.id,
      move_index: state.game.moveCount,
      moved_by_userid: state.session?.userId || 'system',
      moved_by_name: state.session?.name || 'System',
      color: movingPiece.color,
      from_square: squareName(move.from.r, move.from.c),
      to_square: squareName(move.to.r, move.to.c),
      san: state.game.lastMoveSan,
      special_move: move.castle ? 'castle' : move.enPassant ? 'en_passant' : promotionPiece ? 'promotion' : null,
      promotion_piece: promotionPiece,
      state_json: snapshotGameState()
    }
  });

  refreshAll();
}

function setupLogin() {
  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.loginError.textContent = '';

    const userId = els.loginUserid.value.trim();
    const password = els.loginPassword.value.trim();

    if (!userId || !password) {
      els.loginError.textContent = 'Enter both User ID and Password.';
      return;
    }

    const name = userId;
    const session = {
      userId,
      name,
      loggedInAt: new Date().toISOString()
    };

    saveSession(session);
    state.session = session;
    await ensureUserDirectoryRecord(userId, name);

    showApp();
    syncUserChip();
    await loadAndRenderRecentGames();
    ensureGameLoadedAfterLogin();
    toast(`Welcome, ${name}.`, 'success');
  });
}

async function loadAndRenderRecentGames() {
  const games = await loadRecentGames();
  refreshRecentGames(games);
}

function ensureGameLoadedAfterLogin() {
  const hashGame = new URLSearchParams(location.hash.replace(/^#/, '?')).get('game');
  if (hashGame) {
    openGameByIdOrToken(hashGame);
    return;
  }

  const saved = ensureCurrentGameFromStorage();
  if (saved) {
    setGame(saved);
    return;
  }

  const newGame = defaultGame('Lobby');
  newGame.whiteUserId = state.session.userId;
  newGame.whiteName = state.session.name;
  newGame.participants = [state.session.userId];
  saveGameLocally(newGame);
  setGame(newGame);
}

function setupLogout() {
  els.logoutBtn.addEventListener('click', () => {
    clearSession();
    state.session = null;
    showLogin();
    toast('Logged out.', 'info');
  });
}

function setupThemeToggle() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.theme);
  applyTheme(saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  els.themeToggle.addEventListener('click', () => {
    applyTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light');
  });
}

function setupInviteFlow() {
  els.inviteSearch.addEventListener('input', () => {
    searchUsers();
  });

  els.createGameBtn.addEventListener('click', async () => {
    const selected = state.selectedUser;
    if (!selected?.userId) {
      toast('Select a user first.', 'error');
      return;
    }

    try {
      await ensureUserDirectoryRecord(selected.userId, selected.name || selected.userId);
      const game = await createGameInSupabase(selected);
      setGame(game);
      els.shareGameLink.value = createGameLink(game);
      els.inviteGameLink.value = game.inviteToken;
      toast('Game created and synced.', 'success');
      await loadAndRenderRecentGames();
    } catch (err) {
      console.error(err);
      toast(`Could not create game in Supabase.`, 'error');
    }
  });

  els.openGameBtn.addEventListener('click', async () => {
    await openGameByIdOrToken(els.gameIdInput.value);
  });

  els.copyGameLink.addEventListener('click', async () => {
    await copyText(els.shareGameLink.value || location.href);
    toast('Game link copied.', 'success');
  });

  els.copyInviteLink.addEventListener('click', async () => {
    await copyText(els.inviteGameLink.value || '');
    toast('Invite token copied.', 'success');
  });

  els.newGameBtn.addEventListener('click', async () => {
    const game = defaultGame('New Game');
    game.whiteUserId = state.session.userId;
    game.whiteName = state.session.name;
    game.participants = [state.session.userId];
    await persistGame(game);
    setGame(game);
    els.gameoverModal.classList.add('hidden');
    toast('New game started.', 'success');
    await loadAndRenderRecentGames();
  });

  els.rematchBtn.addEventListener('click', async () => {
    const prev = state.game;
    const game = defaultGame(`${prev.title || 'Game'} Rematch`);
    game.whiteUserId = prev.blackUserId || prev.whiteUserId || state.session.userId;
    game.whiteName = prev.blackName || prev.whiteName || state.session.name;
    game.blackUserId = prev.whiteUserId || 'black';
    game.blackName = prev.whiteName || 'Black Player';
    game.participants = [game.whiteUserId, game.blackUserId].filter(Boolean);
    await persistGame(game);
    setGame(game);
    els.gameoverModal.classList.add('hidden');
    toast('Rematch created.', 'success');
    await loadAndRenderRecentGames();
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function setupPromotionModal() {
  els.promotionModal.addEventListener('click', (e) => {
    if (e.target === els.promotionModal) {
      els.promotionModal.classList.add('hidden');
    }
  });
}

function ensureElements() {
  const ids = [
    'login-overlay', 'login-form', 'login-userid', 'login-password', 'login-error',
    'app-shell', 'game-chip', 'status-dot', 'game-status', 'current-user-chip',
    'theme-toggle', 'logout-btn', 'invite-search', 'user-results', 'selected-user',
    'create-game-btn', 'game-id-input', 'open-game-btn', 'recent-games', 'rank-axis',
    'file-axis', 'chess-board', 'last-move-label', 'white-name', 'black-name',
    'white-clock', 'black-clock', 'white-pip', 'black-pip', 'share-game-link',
    'invite-game-link', 'copy-game-link', 'copy-invite-link', 'white-captures',
    'black-captures', 'white-score', 'black-score', 'move-history', 'promotion-modal',
    'promotion-pieces', 'gameover-modal', 'gameover-icon', 'gameover-title',
    'gameover-message', 'gameover-stats', 'new-game-btn', 'rematch-btn', 'toast-container'
  ];

  for (const id of ids) {
    const el = $(id);
    els[id] = el;
    els[camelize(id)] = el;
  }
}

function bindGlobalEvents() {
  window.addEventListener('hashchange', () => {
    const hashGame = new URLSearchParams(location.hash.replace(/^#/, '?')).get('game');
    if (hashGame) openGameByIdOrToken(hashGame);
  });
}

function seedDirectoryIfEmpty() {
  const existing = loadLocal(LOCAL_STORAGE_KEYS.directory, []);
  if (existing.length) return;

  saveLocal(LOCAL_STORAGE_KEYS.directory, [
    { userId: 'player1', name: 'Player One', isActive: true },
    { userId: 'player2', name: 'Player Two', isActive: true },
    { userId: 'guest', name: 'Guest', isActive: true }
  ]);
}

function initState() {
  state = {
    session: restoreSession(),
    game: normalizeGame(ensureCurrentGameFromStorage() || defaultGame('Lobby')),
    board: initialBoard(),
    turn: 'w',
    selected: null,
    legalMoves: [],
    selectedUser: null,
    pendingPromotion: null
  };

  if (state.game?.board) state.board = deepClone(state.game.board);
  if (state.game?.turn) state.turn = state.game.turn;
}

function setInitialView() {
  if (state.session) {
    showApp();
  } else {
    showLogin();
  }

  syncUserChip();
  setGame(state.game);
}

function refreshRecentGamesList() {
  loadAndRenderRecentGames();
}

document.addEventListener('DOMContentLoaded', async () => {
  ensureElements();
  seedDirectoryIfEmpty();
  initState();

  setupThemeToggle();
  setupLogin();
  setupLogout();
  setupInviteFlow();
  setupPromotionModal();
  bindGlobalEvents();

  createBoardGrid();
  setInitialView();

  if (state.session) {
    await ensureUserDirectoryRecord(state.session.userId, state.session.name);
  }

  await loadAndRenderRecentGames();
  searchUsers();

  if (state.session && !state.game?.id) {
    ensureGameLoadedAfterLogin();
  }

  refreshAll();
});
