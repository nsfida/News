'use strict';

const FILES = ['a','b','c','d','e','f','g','h'];
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const DEFAULT_TIME = 600;
const PIECE_SYMBOLS = {
  wp: '♙', wr: '♖', wn: '♘', wb: '♗', wq: '♕', wk: '♔',
  bp: '♟', br: '♜', bn: '♞', bb: '♝', bq: '♛', bk: '♚'
};
const PIECE_NAMES = { p:'Pawn', r:'Rook', n:'Knight', b:'Bishop', q:'Queen', k:'King' };
const PIECE_VALUES = { p:1, n:3, b:3, r:5, q:9, k:0 };
const GAME_STORAGE_KEY = 'ga.games.v1';
const SESSION_KEY = 'ga.session.v1';
const USERS_KEY = 'ga.directory.v1';
const THEME_KEY = 'ga.theme.v1';
const ACTIVE_GAME_KEY = 'ga.activeGame.v1';

const els = {};
let state = null;
let tickTimer = null;
let statusTimer = null;

function $(id) { return document.getElementById(id); }
function camelize(id) { return id.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase()); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function opposite(color) { return color === 'w' ? 'b' : 'w'; }
function deepClone(obj) {
  return typeof globalThis.structuredClone === 'function'
    ? globalThis.structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
}
function uid() {
  return (crypto?.randomUUID?.() || `g_${Date.now()}_${Math.random().toString(16).slice(2)}`);
}
function squareName(r, c) { return `${FILES[c]}${8 - r}`; }
function coordsFromSquare(sq) {
  const file = FILES.indexOf(sq[0]);
  const rank = 8 - Number(sq[1]);
  return [rank, file];
}
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function pieceKey(piece) { return `${piece.color}${piece.type}`; }
function prettyNameFromUserId(userId) { return userId ? String(userId).trim() : 'Guest'; }

function initialBoard() {
  const rows = START_FEN.split('/');
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  rows.forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        c += Number(ch);
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase();
        board[r][c++] = { type, color, moved: false };
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
    status: 'active',
    result: null,
    winnerUserId: null,
    whiteUserId: null,
    blackUserId: null,
    participants: [],
    turn: 'w',
    board: initialBoard(),
    moveCount: 0,
    moveHistory: [],
    captured: { w: [], b: [] },
    selected: null,
    legalMoves: [],
    lastMove: null,
    enPassant: null,
    castling: { w: { king: true, queen: true }, b: { king: true, queen: true } },
    clocks: { w: DEFAULT_TIME, b: DEFAULT_TIME },
    activeClock: null,
    lastTick: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeGame(game) {
  const base = defaultGame(game?.title || 'Lobby');
  const merged = {
    ...base,
    ...game,
    participants: Array.isArray(game?.participants) ? game.participants : base.participants,
    moveHistory: Array.isArray(game?.moveHistory) ? game.moveHistory : base.moveHistory,
    captured: game?.captured || base.captured,
    clocks: game?.clocks || base.clocks,
    castling: game?.castling || base.castling,
    board: parseBoard(game?.board),
    status: game?.status || 'active',
    turn: game?.turn || 'w',
    enPassant: game?.enPassant || null,
    lastMove: game?.lastMove || null,
    lastMoveSan: game?.lastMoveSan || null,
    moveCount: Number.isFinite(game?.moveCount) ? game.moveCount : 0,
    updatedAt: game?.updatedAt || new Date().toISOString(),
    createdAt: game?.createdAt || new Date().toISOString()
  };
  merged.clocks.w = Number.isFinite(merged.clocks.w) ? merged.clocks.w : DEFAULT_TIME;
  merged.clocks.b = Number.isFinite(merged.clocks.b) ? merged.clocks.b : DEFAULT_TIME;
  merged.castling.w = merged.castling.w || { king: true, queen: true };
  merged.castling.b = merged.castling.b || { king: true, queen: true };
  merged.captured.w = Array.isArray(merged.captured.w) ? merged.captured.w : [];
  merged.captured.b = Array.isArray(merged.captured.b) ? merged.captured.b : [];
  merged.lastTick = Number.isFinite(game?.lastTick) ? game.lastTick : Date.now();
  return merged;
}

function saveGames(games) {
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(games));
}
function loadGames() {
  try { return JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function upsertGame(game) {
  const games = loadGames();
  const idx = games.findIndex(g => g.id === game.id);
  const payload = { ...game, updatedAt: new Date().toISOString() };
  if (idx >= 0) games[idx] = payload;
  else games.unshift(payload);
  saveGames(games);
  localStorage.setItem(ACTIVE_GAME_KEY, game.id);
}
function getActiveGameId() {
  return localStorage.getItem(ACTIVE_GAME_KEY) || null;
}
function loadGameById(id) {
  return loadGames().find(g => g.id === id) || null;
}
function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
function loadDirectory() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}
function saveDirectory(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function ensureElements() {
  const ids = [
    'login-overlay','login-form','login-userid','login-password','login-error','app-shell',
    'game-chip','status-dot','game-status','current-user-chip','theme-toggle','logout-btn',
    'invite-search','user-results','selected-user','create-game-btn','game-id-input','open-game-btn',
    'recent-games','rank-axis','file-axis','chess-board','last-move-label',
    'white-name','black-name','white-clock','black-clock','white-pip','black-pip',
    'share-game-link','invite-game-link','copy-game-link','copy-invite-link',
    'white-captures','black-captures','white-score','black-score','move-history',
    'promotion-modal','promotion-pieces','gameover-modal','gameover-icon','gameover-title',
    'gameover-message','gameover-stats','new-game-btn','rematch-btn','toast-container'
  ];
  for (const id of ids) {
    const el = $(id);
    els[id] = el;
    els[camelize(id)] = el;
  }
}

function applyTheme(theme) {
  document.body.dataset.theme = theme === 'light' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, document.body.dataset.theme);
  els.themeToggle.textContent = document.body.dataset.theme === 'light' ? '☀' : '☾';
}

function showApp() {
  els.loginOverlay?.classList.add('hidden');
  els.appShell?.classList.remove('hidden');
}
function showLoginOverlay() {
  els.appShell?.classList.add('hidden');
  els.loginOverlay?.classList.remove('hidden');
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
  setTimeout(() => el.remove(), 3100);
}

function login(userId, password) {
  const id = String(userId || '').trim();
  const pass = String(password || '').trim();
  if (!id || !pass) return { ok: false, message: 'Enter both User ID and Password.' };

  const directory = loadDirectory();
  const match = directory.find(u => String(u.userId).toLowerCase() === id.toLowerCase());

  const session = {
    userId: id,
    name: match?.name || prettyNameFromUserId(id),
    loggedInAt: new Date().toISOString()
  };
  saveSession(session);

  if (!match) {
    directory.unshift({ userId: id, name: session.name, passwordHint: true, isActive: true });
    saveDirectory(directory.slice(0, 100));
  }

  return { ok: true, session };
}

function restoreSession() {
  const session = loadSession();
  if (!session?.userId) return null;
  return {
    userId: String(session.userId),
    name: session.name || prettyNameFromUserId(session.userId),
    loggedInAt: session.loggedInAt || new Date().toISOString()
  };
}

function setupLogin() {
  els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    els.loginError.textContent = '';
    const result = login(els.loginUserid.value, els.loginPassword.value);
    if (!result.ok) {
      els.loginError.textContent = result.message;
      return;
    }
    state.session = result.session;
    showApp();
    syncUserChip();
    ensureGameLoaded();
    toast(`Welcome, ${state.session.name}.`, 'success');
  });
}

function syncUserChip() {
  const name = state?.session?.name || 'Guest';
  els.currentUserChip.textContent = name;
}

function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  applyTheme(saved);
  els.themeToggle.addEventListener('click', () => {
    applyTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light');
  });
}

function setupLogout() {
  els.logoutBtn.addEventListener('click', () => {
    clearSession();
    state.session = null;
    showLoginOverlay();
    toast('Logged out.', 'info');
  });
}

function parseBoard(board) {
  return board || initialBoard();
}

function createGameLink(game) {
  return `${location.origin}${location.pathname}#game=${encodeURIComponent(game.id)}`;
}

function setGame(game) {
  state.game = normalizeGame(game);
  state.turn = state.game.turn || 'w';
  state.board = parseBoard(state.game.board);
  state.selected = null;
  state.legalMoves = [];
  state.promotion = null;
  refreshAll();
}

function ensureGameLoaded() {
  const hashGame = new URLSearchParams(location.hash.replace(/^#/, '?')).get('game');
  const activeId = hashGame || getActiveGameId();
  let game = activeId ? loadGameById(activeId) : null;
  if (!game) {
    game = defaultGame('Lobby');
    game.whiteUserId = state.session?.userId || 'white';
    game.blackUserId = 'black';
    game.participants = [game.whiteUserId, game.blackUserId];
    upsertGame(game);
  }
  setGame(normalizeGame(game));
}

function setupGameButtons() {
  els.createGameBtn.addEventListener('click', () => {
    const selected = state.selectedUser;
    const game = defaultGame(selected?.name ? `${state.session.name} vs ${selected.name}` : 'New Game');
    game.whiteUserId = state.session?.userId || 'white';
    game.blackUserId = selected?.userId || 'black';
    game.participants = [game.whiteUserId, game.blackUserId];
    upsertGame(game);
    setGame(game);
    els.shareGameLink.value = createGameLink(game);
    els.inviteGameLink.value = game.inviteToken;
    toast('Game link created.', 'success');
  });

  els.openGameBtn.addEventListener('click', () => {
    const value = els.gameIdInput.value.trim();
    if (!value) return toast('Paste a game ID or invite token first.', 'error');
    const match = loadGames().find(g => g.id === value || g.inviteToken === value);
    if (!match) return toast('Game not found.', 'error');
    setGame(match);
    toast('Game loaded.', 'success');
  });

  els.copyGameLink.addEventListener('click', async () => {
    await copyText(els.shareGameLink.value || location.href);
    toast('Game link copied.', 'success');
  });

  els.copyInviteLink.addEventListener('click', async () => {
    await copyText(els.inviteGameLink.value || '');
    toast('Invite copied.', 'success');
  });

  els.newGameBtn.addEventListener('click', () => {
    const game = defaultGame('New Game');
    game.whiteUserId = state.session?.userId || 'white';
    game.participants = [game.whiteUserId];
    upsertGame(game);
    setGame(game);
    els.gameoverModal.classList.add('hidden');
    toast('New game started.', 'success');
  });

  els.rematchBtn.addEventListener('click', () => {
    const prev = state.game;
    const game = defaultGame(`${prev.title || 'Game'} Rematch`);
    game.whiteUserId = prev.blackUserId || prev.whiteUserId || state.session?.userId || 'white';
    game.blackUserId = prev.whiteUserId || 'black';
    game.participants = [game.whiteUserId, game.blackUserId];
    upsertGame(game);
    setGame(game);
    els.gameoverModal.classList.add('hidden');
    toast('Rematch created.', 'success');
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

function createBoardDOM() {
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

function getPiece(r, c) { return state.board[r]?.[c] || null; }
function setPiece(r, c, piece) { state.board[r][c] = piece; }
function cloneBoard(board) { return board.map(row => row.map(p => p ? { ...p } : null)); }

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
  const pawnRows = r - pawnDir;
  for (const dc of [-1, 1]) {
    const nr = pawnRows, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }

  const knightDeltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightDeltas) {
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
      nr += dr; nc += dc;
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
      nr += dr; nc += dc;
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

function generatePseudoMoves(board, r, c, opts = {}) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  const color = piece.color;
  const forward = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;
  const lastRow = color === 'w' ? 0 : 7;

  function pushMove(tr, tc, extra = {}) {
    if (!inBounds(tr, tc)) return;
    const target = board[tr][tc];
    if (target && target.color === color) return;
    moves.push({ from: { r, c }, to: { r: tr, c: tc }, capture: !!target || !!extra.enPassant, ...extra });
  }

  if (piece.type === 'p') {
    const oneR = r + forward;
    if (inBounds(oneR, c) && !board[oneR][c]) {
      pushMove(oneR, c, { promotion: oneR === lastRow });
      const twoR = r + forward * 2;
      if (r === startRow && !board[twoR][c]) {
        pushMove(twoR, c, { doubleStep: true });
      }
    }
    for (const dc of [-1, 1]) {
      const tr = r + forward, tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color !== color) {
        pushMove(tr, tc, { capture: true, promotion: tr === lastRow });
      }
      if (opts.enPassant && opts.enPassant.r === tr && opts.enPassant.c === tc) {
        pushMove(tr, tc, { capture: true, enPassant: true, promotion: tr === lastRow });
      }
    }
  }

  if (piece.type === 'n') {
    const d = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    d.forEach(([dr, dc]) => pushMove(r + dr, c + dc));
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
          pushMove(tr, tc);
        } else {
          if (target.color !== color) pushMove(tr, tc, { capture: true });
          break;
        }
        tr += dr; tc += dc;
      }
    }
  }

  if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        pushMove(r + dr, c + dc);
      }
    }

    if (!piece.moved && !isInCheck(board, color)) {
      const row = color === 'w' ? 7 : 0;
      const rights = state.game.castling[color] || { king: false, queen: false };
      const rookKingside = board[row][7];
      const rookQueenside = board[row][0];
      if (rights.king && rookKingside && rookKingside.type === 'r' && rookKingside.color === color && !rookKingside.moved) {
        if (!board[row][5] && !board[row][6] &&
            !isSquareAttacked(board, row, 5, opposite(color)) &&
            !isSquareAttacked(board, row, 6, opposite(color))) {
          moves.push({ from: { r, c }, to: { r: row, c: 6 }, castle: 'k' });
        }
      }
      if (rights.queen && rookQueenside && rookQueenside.type === 'r' && rookQueenside.color === color && !rookQueenside.moved) {
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

function generateLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece || piece.color !== state.turn || state.game.status !== 'active') return [];
  const pseudo = generatePseudoMoves(board, r, c, { enPassant: state.game.enPassant });
  return pseudo.filter(move => {
    const next = simulateMove(board, move);
    return !isInCheck(next.board, piece.color);
  });
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
  if (move.castle) {
    const row = move.from.r;
    if (move.castle === 'k') {
      next[row][5] = next[row][7];
      next[row][7] = null;
      if (next[row][5]) next[row][5].moved = true;
    } else {
      next[row][3] = next[row][0];
      next[row][0] = null;
      if (next[row][3]) next[row][3].moved = true;
    }
  }
  const placed = { ...piece, moved: true };
  next[move.to.r][move.to.c] = placed;
  return { board: next, captured: target };
}

function notationForMove(move, piece, capture, promotionPiece = null) {
  if (move.castle === 'k') return 'O-O';
  if (move.castle === 'q') return 'O-O-O';
  const name = piece.type === 'p' ? '' : piece.type.toUpperCase();
  const fromFile = piece.type === 'p' && capture ? FILES[move.from.c] : '';
  const sep = capture ? 'x' : '';
  let note = `${name}${fromFile}${sep}${squareName(move.to.r, move.to.c)}`;
  if (promotionPiece) note += `=${promotionPiece.toUpperCase()}`;
  return note;
}

function applyMove(move, promotion = null) {
  const board = state.board;
  const piece = board[move.from.r][move.from.c];
  const target = board[move.to.r][move.to.c];
  const prevTurn = state.turn;
  state.game.lastTick = Date.now();

  const sim = simulateMove(board, move);
  const nextBoard = sim.board;

  state.board = nextBoard;
  state.game.board = deepClone(nextBoard);
  state.game.turn = opposite(state.turn);
  state.turn = opposite(state.turn);
  state.game.moveCount += 1;
  state.game.enPassant = move.doubleStep ? { r: (move.from.r + move.to.r) / 2, c: move.to.c } : null;
  state.game.lastMove = { from: squareName(move.from.r, move.from.c), to: squareName(move.to.r, move.to.c) };
  state.game.lastMoveSan = notationForMove(move, piece, !!target || !!move.enPassant, promotion);

  if (piece.type === 'p' || target || move.enPassant) state.game.activeClock = null;

  if (piece.type === 'k') state.game.castling[piece.color] = { king: false, queen: false };
  if (piece.type === 'r') {
    if (piece.color === 'w' && move.from.r === 7 && move.from.c === 0) state.game.castling.w.queen = false;
    if (piece.color === 'w' && move.from.r === 7 && move.from.c === 7) state.game.castling.w.king = false;
    if (piece.color === 'b' && move.from.r === 0 && move.from.c === 0) state.game.castling.b.queen = false;
    if (piece.color === 'b' && move.from.r === 0 && move.from.c === 7) state.game.castling.b.king = false;
  }

  if (target) {
    state.game.captured[prevTurn].push(target);
    if (target.type === 'r') {
      if (target.color === 'w' && move.to.r === 7 && move.to.c === 0) state.game.castling.w.queen = false;
      if (target.color === 'w' && move.to.r === 7 && move.to.c === 7) state.game.castling.w.king = false;
      if (target.color === 'b' && move.to.r === 0 && move.to.c === 0) state.game.castling.b.queen = false;
      if (target.color === 'b' && move.to.r === 0 && move.to.c === 7) state.game.castling.b.king = false;
    }
  }

  const movedPiece = state.board[move.to.r][move.to.c];
  if (movedPiece.type === 'p' && (move.to.r === 0 || move.to.r === 7)) {
    const chosen = promotion || 'q';
    state.pendingPromotion = { r: move.to.r, c: move.to.c, color: movedPiece.color, chosen, move };
    state.board[move.to.r][move.to.c] = { ...movedPiece, type: chosen, moved: true };
    state.game.board = deepClone(state.board);
  }

  const moveRecord = {
    moveIndex: state.game.moveCount,
    san: state.game.lastMoveSan,
    from: squareName(move.from.r, move.from.c),
    to: squareName(move.to.r, move.to.c),
    piece: piece.type,
    color: piece.color,
    capture: !!target || !!move.enPassant,
    promotion: state.pendingPromotion ? state.pendingPromotion.chosen : null
  };
  state.game.moveHistory.push(moveRecord);

  updateGameOutcome();
  upsertGame(state.game);
  state.selected = null;
  state.legalMoves = [];
  refreshAll();
}

function availableMovesFor(color) {
  const list = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color) list.push(...generateLegalMoves(state.board, r, c));
    }
  }
  return list;
}

function updateGameOutcome() {
  const color = state.turn;
  const moves = availableMovesFor(color);
  const inCheck = isInCheck(state.board, color);

  if (moves.length === 0) {
    state.game.status = 'finished';
    if (inCheck) {
      state.game.result = color === 'w' ? 'black_win' : 'white_win';
      state.game.winnerUserId = color === 'w' ? state.game.blackUserId : state.game.whiteUserId;
      els.gameoverIcon.textContent = '🏆';
      els.gameoverTitle.textContent = 'Checkmate';
      els.gameoverMessage.textContent = `${color === 'w' ? 'Black' : 'White'} wins by checkmate.`;
    } else {
      state.game.result = 'stalemate';
      state.game.winnerUserId = null;
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

function showGameOver() {
  const whiteScore = materialScore('w');
  const blackScore = materialScore('b');
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

function onSquareClick(e) {
  if (!state || state.game.status !== 'active') return;
  const sq = e.currentTarget;
  const r = Number(sq.dataset.row);
  const c = Number(sq.dataset.col);
  const piece = getPiece(r, c);

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
    state.legalMoves = generateLegalMoves(state.board, r, c);
    refreshBoard();
    return;
  }

  state.selected = null;
  state.legalMoves = [];
  refreshBoard();
}

function openPromotionPicker(move) {
  els.promotionPieces.innerHTML = '';
  const choices = ['q','r','b','n'];
  choices.forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'promo-btn';
    btn.type = 'button';
    btn.dataset.type = type;
    btn.innerHTML = `<span style="font-size:2rem;line-height:1;">${PIECE_SYMBOLS[`${state.turn}${type}`]}</span>`;
    btn.addEventListener('click', () => {
      els.promotionModal.classList.add('hidden');
      applyMove(move, type);
    });
    els.promotionPieces.appendChild(btn);
  });
  state.pendingPromotion = { move };
  els.promotionModal.classList.remove('hidden');
}

function renderPiece(piece) {
  const el = document.createElement('div');
  el.className = 'piece';
  el.setAttribute('aria-label', `${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type]}`);
  el.textContent = PIECE_SYMBOLS[pieceKey(piece)];
  el.style.fontSize = '2.4rem';
  return el;
}

function refreshBoard() {
  const squares = els.chessBoard.querySelectorAll('.square');
  squares.forEach((sq) => {
    const r = Number(sq.dataset.row);
    const c = Number(sq.dataset.col);
    sq.classList.remove('selected', 'move-dot', 'capture-dot', 'last-from', 'last-to', 'in-check');
    sq.innerHTML = '';
    const p = state.board[r][c];
    if (p) sq.appendChild(renderPiece(p));
  });

  if (state.selected) {
    const sel = els.chessBoard.querySelector(`.square[data-row="${state.selected.r}"][data-col="${state.selected.c}"]`);
    if (sel) sel.classList.add('selected');
    for (const m of state.legalMoves) {
      const el = els.chessBoard.querySelector(`.square[data-row="${m.to.r}"][data-col="${m.to.c}"]`);
      if (el) el.classList.add(m.capture ? 'capture-dot' : 'move-dot');
    }
  }

  if (state.game.lastMove) {
    const from = coordsFromSquare(state.game.lastMove.from);
    const to = coordsFromSquare(state.game.lastMove.to);
    const fromEl = els.chessBoard.querySelector(`.square[data-row="${from[0]}"][data-col="${from[1]}"]`);
    const toEl = els.chessBoard.querySelector(`.square[data-row="${to[0]}"][data-col="${to[1]}"]`);
    fromEl?.classList.add('last-from');
    toEl?.classList.add('last-to');
  }

  if (isInCheck(state.board, state.turn)) {
    const king = findKing(state.board, state.turn);
    const kingEl = king && els.chessBoard.querySelector(`.square[data-row="${king.r}"][data-col="${king.c}"]`);
    kingEl?.classList.add('in-check');
  }
}

function refreshHistory() {
  els.moveHistory.innerHTML = '';
  const rows = [];
  for (let i = 0; i < state.game.moveHistory.length; i += 2) {
    const w = state.game.moveHistory[i];
    const b = state.game.moveHistory[i + 1];
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <div class="history-num">${(i / 2) + 1}</div>
      <div class="history-move ${i === state.game.moveHistory.length - (state.game.moveHistory.length % 2 === 0 ? 2 : 1) ? 'last' : ''}">${w ? w.san : ''}</div>
      <div class="history-move ${b && i + 1 === state.game.moveHistory.length - 1 ? 'last' : ''}">${b ? b.san : ''}</div>
    `;
    rows.push(row);
  }
  rows.reverse().forEach(row => els.moveHistory.appendChild(row));
  els.lastMoveLabel.textContent = state.game.lastMoveSan ? `Last move: ${state.game.lastMoveSan}` : 'No moves yet';
}

function refreshCaptures() {
  els.whiteCaptures.innerHTML = '';
  els.blackCaptures.innerHTML = '';
  const whiteCap = state.game.captured.w || [];
  const blackCap = state.game.captured.b || [];
  whiteCap.forEach(p => els.whiteCaptures.appendChild(renderPiece(p)));
  blackCap.forEach(p => els.blackCaptures.appendChild(renderPiece(p)));
  els.whiteScore.textContent = `Material captured: ${whiteCap.reduce((s, p) => s + (PIECE_VALUES[p.type] || 0), 0)}`;
  els.blackScore.textContent = `Material captured: ${blackCap.reduce((s, p) => s + (PIECE_VALUES[p.type] || 0), 0)}`;
}

function refreshClocks() {
  els.whiteClock.textContent = formatClock(state.game.clocks.w);
  els.blackClock.textContent = formatClock(state.game.clocks.b);
  const active = state.turn;
  els.whiteClock.classList.toggle('active', active === 'w');
  els.blackClock.classList.toggle('active', active === 'b');
  els.whitePip.classList.toggle('active', active === 'w');
  els.blackPip.classList.toggle('active', active === 'b');
  els.whiteClock.classList.toggle('low', state.game.clocks.w <= 30);
  els.blackClock.classList.toggle('low', state.game.clocks.b <= 30);
}

function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

function refreshPlayers() {
  els.whiteName.textContent = state.game.whiteUserId || 'White Player';
  els.blackName.textContent = state.game.blackUserId || 'Black Player';
  els.currentUserChip.textContent = state.session?.name || state.session?.userId || 'Guest';
  els.gameChip.textContent = state.game.title || 'Lobby';
  els.shareGameLink.value = createGameLink(state.game);
  els.inviteGameLink.value = state.game.inviteToken || '';
}

function refreshSidebar() {
  refreshPlayers();
  refreshClocks();
  refreshCaptures();
  refreshHistory();
  renderRecentGames();
}

function refreshStatus() {
  const check = isInCheck(state.board, state.turn);
  const hasMoves = availableMovesFor(state.turn).length > 0;
  els.statusDot.className = 'status-dot';

  if (state.game.status === 'finished') {
    els.gameStatus.textContent = 'Match finished';
    els.statusDot.classList.add('mate');
  } else if (check && !hasMoves) {
    els.gameStatus.textContent = 'Checkmate';
    els.statusDot.classList.add('mate');
  } else if (check) {
    els.gameStatus.textContent = `${state.turn === 'w' ? 'White' : 'Black'} is in check`;
    els.statusDot.classList.add('check');
  } else {
    els.gameStatus.textContent = `${state.turn === 'w' ? 'White' : 'Black'} to move`;
  }
}

function renderRecentGames() {
  const games = loadGames().slice(0, 12);
  els.recentGames.innerHTML = '';
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
    row.addEventListener('click', () => setGame(game));
    row.innerHTML = `
      <div class="game-item-top">
        <div>
          <div class="game-title">${escapeHtml(game.title || 'Game')}</div>
          <div class="game-meta">${escapeHtml(game.id.slice(0, 8))} · ${new Date(game.updatedAt || game.createdAt || Date.now()).toLocaleString()}</div>
        </div>
        <div class="game-badge">${game.status || 'active'}</div>
      </div>
      <div class="game-meta">${escapeHtml(game.whiteUserId || 'White')} vs ${escapeHtml(game.blackUserId || 'Black')}</div>
    `;
    els.recentGames.appendChild(row);
  });
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>'"]/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
}

function bindSearch() {
  els.inviteSearch.addEventListener('input', () => {
    const q = els.inviteSearch.value.trim().toLowerCase();
    const users = loadDirectory().filter(u => !q || `${u.userId} ${u.name}`.toLowerCase().includes(q));
    els.userResults.innerHTML = '';

    users.slice(0, 20).forEach(u => {
      const item = document.createElement('div');
      item.className = 'user-item';
      if (state.selectedUser?.userId === u.userId) item.classList.add('active');
      item.innerHTML = `
        <div class="user-main">
          <div class="user-name">${escapeHtml(u.name || u.userId)}</div>
          <div class="user-id">${escapeHtml(u.userId)}</div>
        </div>
        <div class="user-badge">${u.isActive === false ? 'Inactive' : 'Available'}</div>
      `;
      item.addEventListener('click', () => {
        state.selectedUser = u;
        els.selectedUser.textContent = `${u.name || u.userId} (${u.userId})`;
        els.userResults.querySelectorAll('.user-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
      });
      els.userResults.appendChild(item);
    });

    if (!users.length) {
      const empty = document.createElement('div');
      empty.className = 'game-item';
      empty.textContent = 'No matching users found.';
      els.userResults.appendChild(empty);
    }
  });
}

function setupPromotionModal() {
  els.promotionModal.addEventListener('click', (e) => {
    if (e.target === els.promotionModal) {
      els.promotionModal.classList.add('hidden');
      state.pendingPromotion = null;
      state.selected = null;
      state.legalMoves = [];
      refreshBoard();
    }
  });
}

function startTimers() {
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
      showGameOver();
      upsertGame(state.game);
    }

    refreshClocks();
  }, 1000);
}

function refreshAll() {
  refreshBoard();
  refreshSidebar();
  refreshStatus();
  startTimers();
}

function seedDirectoryIfEmpty() {
  const users = loadDirectory();
  if (users.length) return;
  saveDirectory([
    { userId: 'player1', name: 'Player One', isActive: true },
    { userId: 'player2', name: 'Player Two', isActive: true },
    { userId: 'guest', name: 'Guest', isActive: true }
  ]);
}

function init() {
  ensureElements();
  seedDirectoryIfEmpty();
  setupTheme();
  setupLogin();
  setupLogout();
  setupGameButtons();
  setupPromotionModal();
  createBoardDOM();
  bindSearch();

  state = {
    session: restoreSession(),
    game: null,
    board: initialBoard(),
    turn: 'w',
    selected: null,
    legalMoves: [],
    selectedUser: null,
    pendingPromotion: null
  };

  syncUserChip();

  if (state.session) {
    showApp();
    ensureGameLoaded();
  } else {
    showLoginOverlay();
  }

  window.addEventListener('hashchange', () => {
    if (location.hash.includes('game=')) ensureGameLoaded();
  });

  renderRecentGames();
  refreshAll();
}

document.addEventListener('DOMContentLoaded', init);
