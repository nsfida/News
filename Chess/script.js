import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/* ══════════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════════ */
const USERS_URLS = [
  'https://livenews.live/Chess/data/users.json',
  'data/users.json'
];

const FALLBACK_USERS = [
  { Name: 'Nadeem Shahzad Fida',  UserID: 'nsfida', Pass: '746210' },
  { Name: 'Ogunsiku Babatunde',   UserID: 'othims',  Pass: '35642502' }
];

const SUPABASE_URL      = 'https://xwuqiteezvutzfekjbot.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXFpdGVlenZ1dHpmZWtqYm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDI2NDksImV4cCI6MjA5MjQ3ODY0OX0.vloiHcIgNbrAcT6XTIEalgZvxmRXK95tVJR9yzoxihk';

const SESSION_KEY = 'gm_arena_session';
const THEME_KEY   = 'gm_arena_theme';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FILES = 'abcdefgh';
const RANKS = '87654321';

function nowISO() { return new Date().toISOString(); }
function uid() { return crypto.randomUUID(); }
function normalizeText(v) { return String(v ?? '').trim().toLowerCase(); }
function cloneBoard(b) { return b.map(r => [...r]); }
function sqName(r, c) { return FILES[c] + RANKS[r]; }
function deepCopy(v) { return JSON.parse(JSON.stringify(v)); }
function fmtTime(sec) {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('input');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
}
function formatDateTime(v) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(v));
  } catch {
    return v || '';
  }
}

/* ══════════════════════════════════════════════════════════════
   SVG PIECES
══════════════════════════════════════════════════════════════ */
const SVG = {
  wP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="22.5" cy="12" r="5.5"/><path d="M17.5 20.5c-1.2 2.5-.5 6.5 1 8.5l-2.5 5.5v1.5h13v-1.5l-2.5-5.5c1.5-2 2.2-6 1-8.5z"/><rect x="12.5" y="35.5" width="20" height="3" rx="1.5"/></g></svg>`,
  wN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 5.12-5.14 7.94-8 10 3 0 7.5 1 8 7H16c0-6 4-11 5-12"/><circle cx="19" cy="16" r="2.5" fill="#1a1a1a" stroke="none"/><path d="M14 36h17v-3H14v3z"/></g></svg>`,
  wB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><circle cx="22.5" cy="8" r="2.5"/><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/></g></svg>`,
  wR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3z" stroke-linejoin="miter"/><path d="M12 36v-4h21v4H12z" stroke-linejoin="miter"/><path d="M12 16h21v16H12V16z" stroke-linejoin="miter"/><path d="M11 14h23" stroke-linejoin="miter"/><path d="M9 9h4v2h5V9h5v2h5V9h4v5H9V9z" stroke-linejoin="miter"/></g></svg>`,
  wQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M6 12l3.5 18.5h26L39 12l-8.5 11-3.5-15-4.5 16-4.5-16L14.5 23 6 12z" stroke-linejoin="miter"/><path d="M11 30.5h23" stroke-linejoin="miter"/><path d="M11 30.5h23v3H11v-3z" stroke-linejoin="miter"/><path d="M11 33.5h23v3H11v-3z" stroke-linejoin="miter"/></g></svg>`,
  wK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.5V5.5" stroke-width="1.8"/><path d="M19.5 8.5h6" stroke-width="1.8"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-11.5-3-15c0 0 9 9 5 24"/><path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"/></g></svg>`,
  bP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="22.5" cy="12" r="5.5" stroke="#888"/><path d="M17.5 20.5c-1.2 2.5-.5 6.5 1 8.5l-2.5 5.5v1.5h13v-1.5l-2.5-5.5c1.5-2 2.2-6 1-8.5z" stroke="#888"/><rect x="12.5" y="35.5" width="20" height="3" rx="1.5" stroke="#888"/></g></svg>`,
  bN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10 1 16.5 8 16 29H15c0-9 10-6.5 8-21" stroke="#888"/><path d="M24 18c.38 5.12-5.14 7.94-8 10 3 0 7.5 1 8 7H16c0-6 4-11 5-12" stroke="#888"/><circle cx="19" cy="16" r="2.5" fill="#ccc" stroke="none"/><path d="M14 36h17v-3H14v3z" stroke="#888"/></g></svg>`,
  bB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" stroke="#888"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" stroke="#888"/><circle cx="22.5" cy="8" r="2.5" stroke="#888"/><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#aaa" stroke-linejoin="miter"/></g></svg>`,
  bR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3z" stroke="#888" stroke-linejoin="miter"/><path d="M12 36v-4h21v4H12z" stroke="#888" stroke-linejoin="miter"/><path d="M12 16h21v16H12V16z" stroke="#888" stroke-linejoin="miter"/><path d="M11 14h23" stroke="#888" stroke-linejoin="miter"/><path d="M9 9h4v2h5V9h5v2h5V9h4v5H9V9z" stroke="#888" stroke-linejoin="miter"/></g></svg>`,
  bQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.75" stroke="#888"/><circle cx="14" cy="9" r="2.75" stroke="#888"/><circle cx="22.5" cy="8" r="2.75" stroke="#888"/><circle cx="31" cy="9" r="2.75" stroke="#888"/><circle cx="39" cy="12" r="2.75" stroke="#888"/><path d="M6 12l3.5 18.5h26L39 12l-8.5 11-3.5-15-4.5 16-4.5-16L14.5 23 6 12z" stroke="#888" stroke-linejoin="miter"/><path d="M11 30.5h23" stroke="#aaa" stroke-linejoin="miter"/><path d="M11 30.5h23v3H11v-3z" stroke="#888" stroke-linejoin="miter"/><path d="M11 33.5h23v3H11v-3z" stroke="#888" stroke-linejoin="miter"/></g></svg>`,
  bK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.5V5.5" stroke="#888" stroke-width="1.8"/><path d="M19.5 8.5h6" stroke="#888" stroke-width="1.8"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" stroke="#888" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-11.5-3-15c0 0 9 9 5 24" stroke="#888"/><path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" stroke="#aaa"/></g></svg>`
};

/* ══════════════════════════════════════════════════════════════
   CHESS ENGINE
══════════════════════════════════════════════════════════════ */
class ChessEngine {
  constructor() { this.reset(); }

  reset() {
    this.board = [
      ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
      ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
      ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ];
    this.turn = 'w';
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassant = null;
    this.halfClock = 0;
    this.moveNum = 1;
    this.history = [];
    this.captured = { w: [], b: [] };
    this.status = null;
    this.winner = null;
    this.legalMoves = [];
    this._cacheLegal();
  }

  col(p) { return p ? p[0] : null; }
  type(p) { return p ? p[1] : null; }
  opp(c) { return c === 'w' ? 'b' : 'w'; }
  ok(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  kingPos(color, board = this.board) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === color + 'K') return [r, c];
      }
    }
    return null;
  }

  attacked(row, col, byColor, board = this.board) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p || this.col(p) !== byColor) continue;
        const t = this.type(p);

        if (t === 'P') {
          const d = byColor === 'w' ? -1 : 1;
          if (r + d === row && (c - 1 === col || c + 1 === col)) return true;
        } else if (t === 'N') {
          const dr = Math.abs(r - row), dc = Math.abs(c - col);
          if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) return true;
        } else if (t === 'K') {
          if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return true;
        } else {
          const dirs = t === 'B'
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : t === 'R'
              ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
              : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (this.ok(nr, nc)) {
              if (nr === row && nc === col) return true;
              if (board[nr][nc]) break;
              nr += dr; nc += dc;
            }
          }
        }
      }
    }
    return false;
  }

  inCheck(color, board = this.board) {
    const kp = this.kingPos(color, board);
    return kp ? this.attacked(kp[0], kp[1], this.opp(color), board) : false;
  }

  pseudoMoves(r, c, board = this.board, castling = this.castling, ep = this.enPassant) {
    const p = board[r][c];
    if (!p) return [];
    const color = this.col(p), t = this.type(p), opp = this.opp(color);
    const moves = [];
    const mv = (tr, tc, special = null) => ({ from: [r, c], to: [tr, tc], special });

    if (t === 'P') {
      const dir = color === 'w' ? -1 : 1;
      const start = color === 'w' ? 6 : 1;
      const promR = color === 'w' ? 0 : 7;

      if (this.ok(r + dir, c) && !board[r + dir][c]) {
        moves.push(mv(r + dir, c, r + dir === promR ? 'promo' : null));
        if (r === start && !board[r + 2 * dir][c]) moves.push(mv(r + 2 * dir, c, 'double'));
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (!this.ok(nr, nc)) continue;
        if (board[nr][nc] && this.col(board[nr][nc]) === opp) {
          moves.push(mv(nr, nc, nr === promR ? 'promo' : null));
        }
        if (ep && ep[0] === nr && ep[1] === nc) moves.push(mv(nr, nc, 'ep'));
      }
      return moves;
    }

    if (t === 'N') {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (this.ok(nr, nc) && this.col(board[nr][nc]) !== color) moves.push(mv(nr, nc));
      }
      return moves;
    }

    if (t === 'K') {
      for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (this.ok(nr, nc) && this.col(board[nr][nc]) !== color) moves.push(mv(nr, nc));
      }
      if (color === 'w' && r === 7 && c === 4 && !this.attacked(7, 4, opp, board)) {
        if (castling.wK && !board[7][5] && !board[7][6] && board[7][7] === 'wR' &&
            !this.attacked(7, 5, opp, board) && !this.attacked(7, 6, opp, board)) {
          moves.push(mv(7, 6, 'castleK'));
        }
        if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0] === 'wR' &&
            !this.attacked(7, 3, opp, board) && !this.attacked(7, 2, opp, board)) {
          moves.push(mv(7, 2, 'castleQ'));
        }
      }
      if (color === 'b' && r === 0 && c === 4 && !this.attacked(0, 4, opp, board)) {
        if (castling.bK && !board[0][5] && !board[0][6] && board[0][7] === 'bR' &&
            !this.attacked(0, 5, opp, board) && !this.attacked(0, 6, opp, board)) {
          moves.push(mv(0, 6, 'castleK'));
        }
        if (castling.bQ && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0] === 'bR' &&
            !this.attacked(0, 3, opp, board) && !this.attacked(0, 2, opp, board)) {
          moves.push(mv(0, 2, 'castleQ'));
        }
      }
      return moves;
    }

    const dirs = t === 'B'
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : t === 'R'
        ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
        : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (this.ok(nr, nc)) {
        if (board[nr][nc]) {
          if (this.col(board[nr][nc]) === opp) moves.push(mv(nr, nc));
          break;
        }
        moves.push(mv(nr, nc));
        nr += dr; nc += dc;
      }
    }
    return moves;
  }

  applyMove(move, board = this.board, castling = this.castling, ep = this.enPassant) {
    const nb = cloneBoard(board);
    const nc = { ...castling };
    let nep = null, captured = null;
    const [fr, fc] = move.from, [tr, tc] = move.to;
    const piece = nb[fr][fc];
    const color = this.col(piece);

    captured = nb[tr][tc];
    nb[fr][fc] = null;

    if (move.special === 'ep') {
      const cr = color === 'w' ? tr + 1 : tr - 1;
      captured = nb[cr][tc];
      nb[cr][tc] = null;
    }
    if (move.special === 'castleK') {
      const row = color === 'w' ? 7 : 0;
      nb[row][5] = color + 'R';
      nb[row][7] = null;
    }
    if (move.special === 'castleQ') {
      const row = color === 'w' ? 7 : 0;
      nb[row][3] = color + 'R';
      nb[row][0] = null;
    }

    nb[tr][tc] = move.promoteTo ? color + move.promoteTo : piece;

    if (piece === 'wK') { nc.wK = false; nc.wQ = false; }
    if (piece === 'bK') { nc.bK = false; nc.bQ = false; }
    if (piece === 'wR' && fr === 7 && fc === 7) nc.wK = false;
    if (piece === 'wR' && fr === 7 && fc === 0) nc.wQ = false;
    if (piece === 'bR' && fr === 0 && fc === 7) nc.bK = false;
    if (piece === 'bR' && fr === 0 && fc === 0) nc.bQ = false;
    if (captured === 'wR' && tr === 7 && tc === 7) nc.wK = false;
    if (captured === 'wR' && tr === 7 && tc === 0) nc.wQ = false;
    if (captured === 'bR' && tr === 0 && tc === 7) nc.bK = false;
    if (captured === 'bR' && tr === 0 && tc === 0) nc.bQ = false;

    if (move.special === 'double') nep = [color === 'w' ? tr + 1 : tr - 1, tc];
    return { board: nb, castling: nc, ep: nep, captured };
  }

  allLegal(color, board = this.board, castling = this.castling, ep = this.enPassant) {
    const legal = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p || this.col(p) !== color) continue;
        const pseudo = this.pseudoMoves(r, c, board, castling, ep);
        for (const m of pseudo) {
          if (m.special === 'promo') {
            for (const pt of ['Q', 'R', 'B', 'N']) {
              const pm = { ...m, promoteTo: pt };
              const { board: nb } = this.applyMove(pm, board, castling, ep);
              if (!this.inCheck(color, nb)) legal.push(pm);
            }
          } else {
            const { board: nb } = this.applyMove(m, board, castling, ep);
            if (!this.inCheck(color, nb)) legal.push(m);
          }
        }
      }
    }
    return legal;
  }

  _cacheLegal() {
    this.legalMoves = this.allLegal(this.turn, this.board, this.castling, this.enPassant);
  }

  make(move) {
    const { board: nb, castling: nc, ep: nep, captured } = this.applyMove(move, this.board, this.castling, this.enPassant);
    const san = this._san(move, captured, nb);
    if (captured) this.captured[this.opp(this.turn)].push(captured);

    this.history.push({
      move: { from: [...move.from], to: [...move.to], special: move.special || null, promoteTo: move.promoteTo || null },
      san,
      captured,
      board: cloneBoard(this.board),
      afterBoard: cloneBoard(nb)
    });

    this.board = nb;
    this.castling = nc;
    this.enPassant = nep;
    const movedType = this.type(nb[move.to[0]][move.to[1]]);
    if (movedType === 'P' || captured) this.halfClock = 0;
    else this.halfClock += 1;
    if (this.turn === 'b') this.moveNum += 1;
    this.turn = this.opp(this.turn);
    this._cacheLegal();
    this._updateStatus();
    return { san, captured };
  }

  _updateStatus() {
    if (this.legalMoves.length === 0) {
      this.status = this.inCheck(this.turn, this.board) ? 'checkmate' : 'stalemate';
      if (this.status === 'checkmate') this.winner = this.opp(this.turn);
      return;
    }
    if (this.inCheck(this.turn, this.board)) { this.status = 'check'; return; }
    if (this.halfClock >= 100) { this.status = 'draw50'; return; }
    if (this._insufficientMaterial()) { this.status = 'drawMat'; return; }
    this.status = null;
  }

  _insufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) if (this.board[r][c]) pieces.push(this.board[r][c]);
    }
    if (pieces.length <= 2) return true;
    if (pieces.length === 3) {
      const types = pieces.map(p => this.type(p));
      return types.includes('B') || types.includes('N');
    }
    return false;
  }

  _san(move, captured, boardAfter) {
    const [fr, fc] = move.from, [tr, tc] = move.to;
    const piece = this.board[fr][fc];
    const t = this.type(piece), color = this.col(piece);
    if (move.special === 'castleK') return 'O-O';
    if (move.special === 'castleQ') return 'O-O-O';

    let san = '';
    if (t !== 'P') san += t;

    if (t !== 'P') {
      const ambig = this.legalMoves.filter(m => {
        const p2 = this.board[m.from[0]][m.from[1]];
        return p2 && this.type(p2) === t && this.col(p2) === color &&
          !(m.from[0] === fr && m.from[1] === fc) && m.to[0] === tr && m.to[1] === tc;
      });
      if (ambig.length > 0) {
        if (ambig.every(m => m.from[1] !== fc)) san += FILES[fc];
        else if (ambig.every(m => m.from[0] !== fr)) san += RANKS[fr];
        else san += FILES[fc] + RANKS[fr];
      }
    }

    if (captured || move.special === 'ep') {
      if (t === 'P') san += FILES[fc];
      san += 'x';
    }

    san += FILES[tc] + RANKS[tr];
    if (move.promoteTo) san += '=' + move.promoteTo;

    const opponent = this.opp(color);
    if (this.inCheck(opponent, boardAfter)) {
      const oppLegal = this.allLegal(opponent, boardAfter, this.castling, this.enPassant);
      san += oppLegal.length === 0 ? '#' : '+';
    }
    return san;
  }

  movesFrom(r, c) {
    return this.legalMoves.filter(m => m.from[0] === r && m.from[1] === c);
  }

  material(color) {
    const vals = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
    let sum = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.board[r][c];
      if (p && this.col(p) === color) sum += vals[this.type(p)] || 0;
    }
    return sum;
  }

  snapshot() {
    return deepCopy({
      board: this.board,
      turn: this.turn,
      castling: this.castling,
      enPassant: this.enPassant,
      halfClock: this.halfClock,
      moveNum: this.moveNum,
      history: this.history,
      captured: this.captured,
      status: this.status,
      winner: this.winner
    });
  }

  restore(snap) {
    if (!snap || !snap.board) {
      this.reset();
      return;
    }
    this.board = snap.board.map(row => [...row]);
    this.turn = snap.turn ?? 'w';
    this.castling = { wK: true, wQ: true, bK: true, bQ: true, ...(snap.castling || {}) };
    this.enPassant = snap.enPassant ? [...snap.enPassant] : null;
    this.halfClock = snap.halfClock ?? 0;
    this.moveNum = snap.moveNum ?? 1;
    this.history = Array.isArray(snap.history) ? deepCopy(snap.history) : [];
    this.captured = snap.captured
      ? { w: [...(snap.captured.w || [])], b: [...(snap.captured.b || [])] }
      : { w: [], b: [] };
    this.status = snap.status ?? null;
    this.winner = snap.winner ?? null;
    this._cacheLegal();
  }
}

/* ══════════════════════════════════════════════════════════════
   TIMER
══════════════════════════════════════════════════════════════ */
class Timer {
  constructor(seconds, onTick, onExpire) {
    this.time = seconds;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.running = false;
    this._id = null;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this._id = setInterval(() => {
      this.time -= 1;
      this.onTick(this.time);
      if (this.time <= 0) {
        this.stop();
        this.onExpire();
      }
    }, 1000);
  }
  stop() {
    if (this._id) clearInterval(this._id);
    this._id = null;
    this.running = false;
  }
  reset(s) {
    this.stop();
    this.time = s;
  }
}

/* ══════════════════════════════════════════════════════════════
   GAME CONTROLLER
══════════════════════════════════════════════════════════════ */
class GameController {
  constructor() {
    this.engine = new ChessEngine();
    this.users = [];
    this.session = null;
    this.currentGame = null;
    this.currentGameId = null;
    this.currentInviteToken = null;
    this.playerColor = null;
    this.viewOnly = true;
    this.selected = null;
    this.legalDots = [];
    this.pendingPromotion = null;
    this.timeControl = 600;
    this.timers = { w: null, b: null };
    this.gameActive = false;
    this.pollTimer = null;
    this.syncLock = false;
    this.lastSyncedAt = null;
    this.selectedInvitee = null;
    this._loginInProgress = false;

    this._bindStaticEvents();
    this._applyTheme();
    this._fitBoard();
  }

  $(id) { return document.getElementById(id); }
  $all(sel) { return [...document.querySelectorAll(sel)]; }

  toast(msg, type = 'info') {
    const wrap = this.$('toast-container');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.cssText = 'opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s';
      setTimeout(() => el.remove(), 260);
    }, 2400);
  }

  _fitBoard() {
    const maxW = Math.min(window.innerWidth * 0.44, window.innerHeight * 0.75, 620);
    const size = Math.max(320, Math.floor(maxW));
    document.documentElement.style.setProperty('--board-size', `${size}px`);
  }

  _applyTheme() {
    const theme = (localStorage.getItem(THEME_KEY) === 'light') ? 'light' : 'dark';
    document.body.dataset.theme = theme;
    const btn = this.$('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☾' : '☀';
  }

  _toggleTheme() {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    this.$('theme-toggle').textContent = next === 'dark' ? '☾' : '☀';
  }

  _showEl(el) {
    if (!el) return;
    el.classList.remove('hidden');
    el.style.removeProperty('display');
  }

  _hideEl(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
  }

  _bindStaticEvents() {
    window.addEventListener('resize', () => this._fitBoard());
    this.$('theme-toggle')?.addEventListener('click', () => this._toggleTheme());
    this.$('logout-btn')?.addEventListener('click', () => this.logout());

    this.$('login-form')?.addEventListener('submit', e => {
      e.preventDefault();
      this.login();
    });

    this.$('login-userid')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.login(); }
    });

    this.$('login-password')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.login(); }
    });

    this.$('invite-search')?.addEventListener('input', () => this.renderUserSearch());

    this.$('create-game-btn')?.addEventListener('click', () => this.createInviteGame());

    this.$('open-game-btn')?.addEventListener('click', () => {
      const id = this.$('game-id-input').value.trim();
      if (!id) {
        this.toast('Paste a game ID first.', 'error');
        return;
      }
      this.openGameById(id);
    });

    this.$('game-id-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const id = this.$('game-id-input').value.trim();
        if (id) this.openGameById(id);
      }
    });

    this.$('copy-game-link')?.addEventListener('click', () => this.copyCurrentGameLink('game'));
    this.$('copy-invite-link')?.addEventListener('click', () => this.copyCurrentGameLink('invite'));
    this.$('new-game-btn')?.addEventListener('click', () => this.resetToLobby());
    this.$('rematch-btn')?.addEventListener('click', () => this.rematch());
  }

  async init() {
    this.users = await this.loadUsers();
    this.restoreSession();

    if (this.session) {
      await this.enterApp();
    } else {
      this._showOverlay();
    }

    this.renderUserSearch();
    this.renderRecentGames([]);
    this.renderBoard();
    this.renderCaptures();
    this.renderHistory();
    this._updateStatusLine();
  }

  _showOverlay() {
    this._showEl(this.$('login-overlay'));
    this._hideEl(this.$('app-shell'));
    this.$('login-userid')?.focus();
  }

  _showApp() {
    this._hideEl(this.$('login-overlay'));
    const shell = this.$('app-shell');
    if (shell) {
      shell.classList.remove('hidden');
      shell.style.display = 'flex';
    }
  }

  async loadUsers() {
    for (const url of USERS_URLS) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = JSON.parse(text.replace(/,\s*([}\]])/g, '$1'));
        }
        if (Array.isArray(data) && data.length) return data;
      } catch (err) {
        console.warn(`Failed loading users from ${url}`, err);
      }
    }
    this.toast('Could not fetch users.json — using built-in list.', 'info');
    return [...FALLBACK_USERS];
  }

  restoreSession() {
    try {
      this.session = JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      this.session = null;
    }
  }

  saveSession(user) {
    this.session = { Name: user.Name, UserID: user.UserID };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  }

  async login() {
    if (this._loginInProgress) return;
    this._loginInProgress = true;

    const btn = this.$('login-btn');
    const errorBox = this.$('login-error');
    const inputUser = this.$('login-userid').value.trim();
    const password = this.$('login-password').value;

    errorBox.textContent = '';
    if (btn) btn.disabled = true;

    try {
      if (!inputUser || !password) {
        errorBox.textContent = 'Enter both User ID and Password.';
        return;
      }

      if (!this.users.length) this.users = await this.loadUsers();

      const match = this.users.find(u =>
        normalizeText(u.UserID) === normalizeText(inputUser) &&
        String(u.Pass ?? '').trim() === String(password).trim()
      );

      if (!match) {
        errorBox.textContent = 'Invalid User ID or Password.';
        this.toast('Login failed — check your credentials.', 'error');
        return;
      }

      this.saveSession(match);
      await this.ensureUserExists(match);
      await this.enterApp();
      this.toast(`Welcome, ${match.Name}!`, 'success');
    } catch (err) {
      console.error('login() error:', err);
      errorBox.textContent = 'Something went wrong. Please try again.';
      this.toast('Login error — see console for details.', 'error');
    } finally {
      if (btn) btn.disabled = false;
      this._loginInProgress = false;
    }
  }

  async ensureUserExists(user) {
    const record = {
      user_id: user.UserID,
      name: user.Name,
      is_active: true
    };

    try {
      await supabase.from('app_users').upsert(record, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('Failed syncing app_users:', err);
    }
  }

  async enterApp() {
    this._showApp();
    this.$('current-user-chip').textContent = `${this.session.Name} · ${this.session.UserID}`;

    await this.loadRecentGames();

    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    const game = params.get('game');

    if (invite) {
      await this.openGameByInvite(invite);
    } else if (game) {
      await this.openGameById(game, { preserveUrl: true });
    } else {
      this.resetBoardToLobby();
    }
  }

  logout() {
    this._stopTimers();
    this._stopPolling();
    this.session = null;
    this.currentGame = null;
    this.currentGameId = null;
    this.currentInviteToken = null;
    this.playerColor = null;
    this.viewOnly = true;
    this.gameActive = false;
    localStorage.removeItem(SESSION_KEY);

    this.$('login-userid').value = '';
    this.$('login-password').value = '';
    this.$('login-error').textContent = '';
    this._showOverlay();

    this.engine.reset();
    this.renderBoard();
    this.renderCaptures();
    this.renderHistory();
    this._updateStatusLine();
  }

  get myColor() {
    if (!this.currentGame || !this.session) return null;
    if (this.currentGame.white_userid === this.session.UserID) return 'w';
    if (this.currentGame.black_userid === this.session.UserID) return 'b';
    return null;
  }

  canMove() {
    if (!this.gameActive) return false;
    if (this.viewOnly) return false;
    if (!this.myColor) return false;
    if (['checkmate', 'stalemate', 'draw50', 'drawMat'].includes(this.engine.status)) return false;
    return this.engine.turn === this.myColor;
  }

  renderUserSearch() {
    const query = this.$('invite-search').value.trim().toLowerCase();
    const results = this.users.filter(u => {
      const name = String(u.Name || '').toLowerCase();
      const id = String(u.UserID || '').toLowerCase();
      return !query || name.includes(query) || id.includes(query);
    }).slice(0, 20);

    const wrap = this.$('user-results');
    wrap.innerHTML = '';

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'game-meta';
      empty.textContent = query ? 'No matching users found.' : 'Start typing to search users.';
      wrap.appendChild(empty);
      return;
    }

    results.forEach(user => {
      const row = document.createElement('div');
      row.className = 'user-item' + (this.selectedInvitee?.UserID === user.UserID ? ' active' : '');
      row.innerHTML = `
        <div class="user-main">
          <div class="user-name">${escapeHtml(user.Name)}</div>
          <div class="user-id">@${escapeHtml(user.UserID)}</div>
        </div>
        <div class="user-badge">Invite</div>`;
      row.addEventListener('click', () => {
        this.selectedInvitee = user;
        this.$('selected-user').textContent = `${user.Name} (@${user.UserID})`;
        this.renderUserSearch();
      });
      wrap.appendChild(row);
    });

    if (!this.selectedInvitee) this.$('selected-user').textContent = 'None';
  }

  async _insertGameRow(payload) {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert([payload])
        .select('*')
        .single();

      if (error) return { data: null, error };
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async createInviteGame() {
    if (!this.session) return;
    if (!this.selectedInvitee) {
      this.toast('Select a user first.', 'error');
      return;
    }
    if (this.selectedInvitee.UserID === this.session.UserID) {
      this.toast('You cannot invite yourself.', 'error');
      return;
    }

    try {
      const gameId = uid();
      const inviteToken = uid().replaceAll('-', '');
      const state = new ChessEngine().snapshot();

      const payload = {
        id: gameId,
        invite_token: inviteToken,

        created_by_userid: this.session.UserID,
        created_by_name: this.session.Name,

        white_userid: this.session.UserID,
        white_name: this.session.Name,

        black_userid: this.selectedInvitee.UserID,
        black_name: this.selectedInvitee.Name,

        invitee_userid: this.selectedInvitee.UserID,
        invitee_name: this.selectedInvitee.Name,

        participants: [this.session.UserID, this.selectedInvitee.UserID],

        status: 'active',
        result: null,
        winner_userid: null,
        winner_name: null,

        time_control_seconds: this.timeControl,
        current_turn: 'w',
        move_count: 0,
        last_move_san: null,
        state_json: state,

        invite_status: 'pending',
        invite_accepted_at: null,

        created_at: nowISO(),
        updated_at: nowISO()
      };

      const { data, error } = await this._insertGameRow(payload);

      if (error || !data) {
        console.error('Could not create game in Supabase:', error);
        this.toast(`Could not create game in Supabase: ${error?.message || 'unknown error'}`, 'error');
        return;
      }

      this.currentInviteToken = data.invite_token || inviteToken;
      await this.openGameRecord(data, { preserveUrl: true });
      this.renderShareLinks();

      const inviteText = this.$('invite-game-link').value;
      if (inviteText) {
        await copyText(inviteText);
      }

      this.toast('Game created — invite link copied!', 'success');
      await this.loadRecentGames();
    } catch (err) {
      console.error('createInviteGame() failed:', err);
      this.toast('Could not create game in Supabase.', 'error');
    }
  }

  async openGameByInvite(token) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('invite_token', token)
      .maybeSingle();

    if (error || !data) {
      this.toast('Invite link not found.', 'error');
      return;
    }

    this.currentInviteToken = token;
    await this.openGameRecord(data, { preserveUrl: true });
  }

  async openGameById(id, options = {}) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      this.toast('Game ID not found.', 'error');
      return;
    }

    this.currentInviteToken = data.invite_token || null;
    await this.openGameRecord(data, options);
  }

  async openGameRecord(game, options = {}) {
    this._stopPolling();
    this.currentGame = game;
    this.currentGameId = game.id;
    this.playerColor = this.myColor;
    this.viewOnly = !this.playerColor;

    this.engine.reset();

    if (game.state_json && game.state_json.board) {
      this.engine.restore(game.state_json);
    } else {
      const { data: moves } = await supabase
        .from('game_moves')
        .select('*')
        .eq('game_id', game.id)
        .order('move_index', { ascending: true });

      if (Array.isArray(moves) && moves.length) {
        this.engine.reset();
        for (const row of moves) {
          const move = {
            from: [FILES.indexOf(row.from_square[0]), RANKS.indexOf(row.from_square[1])],
            to: [FILES.indexOf(row.to_square[0]), RANKS.indexOf(row.to_square[1])],
            special: row.special_move || null,
            promoteTo: row.promotion_piece || null
          };
          this.engine.make(move);
        }
      }
    }

    if (game.invite_status === 'pending' && this.session?.UserID === game.invitee_userid) {
      await supabase.from('games').update({
        invite_status: 'accepted',
        invite_accepted_at: nowISO(),
        updated_at: nowISO()
      }).eq('id', game.id);
      game.invite_status = 'accepted';
    }

    this._applyGameMeta(game);
    this.selected = null;
    this.legalDots = [];
    this.pendingPromotion = null;
    this.renderBoard();
    this.renderCaptures();
    this.renderHistory();
    this.renderShareLinks();
    this.syncClocks();
    this._updateStatusLine();

    if (!options.preserveUrl) {
      history.replaceState({}, '', `${location.pathname}?game=${game.id}`);
    }

    this.gameActive = true;
    this._stopTimers();
    this._buildTimers(this.timeControl);
    this._startTimersForTurn(this.engine.turn);
    this._startPolling();

    if (Array.isArray(game.participants) && game.participants.includes(this.session?.UserID)) {
      this.toast(`Loaded ${game.white_name} vs ${game.black_name}.`, 'success');
    } else {
      this.toast('Loaded game (read-only).', 'info');
    }
  }

  _applyGameMeta(game) {
    this.$('game-chip').textContent = `Game ${String(game.id).slice(0, 8)}`;
    this.$('white-name').textContent = game.white_name || 'White Player';
    this.$('black-name').textContent = game.black_name || 'Black Player';
    const secs = game.time_control_seconds ?? 600;
    this.timeControl = secs;
    this.$('white-clock').textContent = fmtTime(secs);
    this.$('black-clock').textContent = fmtTime(secs);
    this.$('game-id-input').value = game.id;
  }

  renderShareLinks() {
    const gameLink = this.currentGameId
      ? `${location.origin}${location.pathname}?game=${this.currentGameId}`
      : '';
    const inviteLink = this.currentGame?.invite_token
      ? `${location.origin}${location.pathname}?invite=${this.currentGame.invite_token}`
      : '';
    this.$('share-game-link').value = gameLink;
    this.$('invite-game-link').value = inviteLink;
  }

  async copyCurrentGameLink(kind = 'game') {
    const text = kind === 'invite' ? this.$('invite-game-link').value : this.$('share-game-link').value;
    if (!text) {
      this.toast('No link available yet.', 'error');
      return;
    }
    await copyText(text);
    this.toast(kind === 'invite' ? 'Invite link copied.' : 'Game link copied.', 'success');
  }

  renderBoard() {
    const board = this.$('chess-board');
    const rankAxis = this.$('rank-axis');
    const fileAxis = this.$('file-axis');
    if (!board) return;

    board.innerHTML = '';
    rankAxis.innerHTML = '';
    fileAxis.innerHTML = '';

    ['8', '7', '6', '5', '4', '3', '2', '1'].forEach(n => {
      const s = document.createElement('span');
      s.textContent = n;
      rankAxis.appendChild(s);
    });

    FILES.split('').forEach(f => {
      const s = document.createElement('span');
      s.textContent = f;
      fileAxis.appendChild(s);
    });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        sq.dataset.r = r;
        sq.dataset.c = c;
        sq.addEventListener('click', () => this.handleSquareClick(r, c));
        const piece = this.engine.board[r][c];
        if (piece) {
          const holder = document.createElement('div');
          holder.className = 'piece';
          holder.innerHTML = SVG[piece] || '';
          sq.appendChild(holder);
        }
        board.appendChild(sq);
      }
    }
    this.applyHighlights();
  }

  getSquareEl(r, c) {
    const board = this.$('chess-board');
    return board ? board.children[r * 8 + c] : null;
  }

  clearMarks() {
    this.$all('.square').forEach(sq => {
      sq.classList.remove('selected', 'last-from', 'last-to', 'in-check', 'capture-dot', 'move-dot');
      sq.querySelector('.move-marker')?.remove();
    });
  }

  applyHighlights() {
    this.clearMarks();
    const last = this.engine.history.at(-1);
    if (last?.move) {
      this.getSquareEl(...last.move.from)?.classList.add('last-from');
      this.getSquareEl(...last.move.to)?.classList.add('last-to');
    }
    if (this.engine.status === 'check' || this.engine.status === 'checkmate') {
      const kp = this.engine.kingPos(this.engine.turn, this.engine.board);
      if (kp) this.getSquareEl(...kp)?.classList.add('in-check');
    }
    if (this.selected) {
      this.getSquareEl(...this.selected)?.classList.add('selected');
      for (const move of (this.legalDots || [])) {
        const [tr, tc] = move.to;
        const square = this.getSquareEl(tr, tc);
        if (!square) continue;
        const capture = !!this.engine.board[tr][tc] || move.special === 'ep';
        square.classList.add(capture ? 'capture-dot' : 'move-dot');
        const marker = document.createElement('div');
        marker.className = 'move-marker';
        square.appendChild(marker);
      }
    }
  }

  renderCaptures() {
    const wc = this.$('white-captures');
    const bc = this.$('black-captures');
    if (!wc || !bc) return;
    wc.innerHTML = '';
    bc.innerHTML = '';
    this.engine.captured.w.forEach(p => {
      const h = document.createElement('div');
      h.innerHTML = SVG[p];
      wc.appendChild(h);
    });
    this.engine.captured.b.forEach(p => {
      const h = document.createElement('div');
      h.innerHTML = SVG[p];
      bc.appendChild(h);
    });
    const diff = this.engine.material('w') - this.engine.material('b');
    this.$('white-score').textContent = diff > 0 ? `+${diff}` : '';
    this.$('black-score').textContent = diff < 0 ? `+${Math.abs(diff)}` : '';
  }

  renderHistory() {
    const wrap = this.$('move-history');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!this.engine.history.length) {
      const empty = document.createElement('div');
      empty.className = 'game-meta';
      empty.textContent = 'No moves yet.';
      wrap.appendChild(empty);
      this.$('last-move-label').textContent = '';
      return;
    }
    for (let i = 0; i < this.engine.history.length; i += 2) {
      const wMove = this.engine.history[i];
      const bMove = this.engine.history[i + 1];
      const row = document.createElement('div');
      row.className = 'history-row';
      const num = document.createElement('div');
      num.className = 'history-num';
      num.textContent = `${Math.floor(i / 2) + 1}.`;
      const w = document.createElement('div');
      w.className = 'history-move' + (i === this.engine.history.length - 1 ? ' last' : '');
      w.textContent = wMove?.san || '';
      const b = document.createElement('div');
      b.className = 'history-move' + (i + 1 === this.engine.history.length - 1 ? ' last' : '');
      b.textContent = bMove?.san || '';
      row.appendChild(num);
      row.appendChild(w);
      row.appendChild(b);
      wrap.appendChild(row);
    }
    wrap.scrollTop = wrap.scrollHeight;
    this.$('last-move-label').textContent = `Last move: ${this.engine.history.at(-1)?.san || ''}`;
  }

  syncClocks() {
    const white = this.$('white-clock');
    const black = this.$('black-clock');
    const whitePip = this.$('white-pip');
    const blackPip = this.$('black-pip');
    if (!white || !black) return;

    if (this.timers.w) white.textContent = fmtTime(this.timers.w.time);
    if (this.timers.b) black.textContent = fmtTime(this.timers.b.time);

    white.className = 'clock';
    black.className = 'clock';
    whitePip.className = 'clock-pip';
    blackPip.className = 'clock-pip';

    const isWTurn = this.engine.turn === 'w';
    (isWTurn ? white : black).classList.add('active');
    (isWTurn ? whitePip : blackPip).classList.add('active');

    if ((this.timers.w?.time ?? this.timeControl) <= 30 && isWTurn) white.classList.add('low');
    if ((this.timers.b?.time ?? this.timeControl) <= 30 && !isWTurn) black.classList.add('low');

    this.$('white-card').classList.toggle('active', isWTurn);
    this.$('black-card').classList.toggle('active', !isWTurn);
  }

  _buildTimers(seconds) {
    this.timers.w = new Timer(
      seconds,
      s => { if (this.$('white-clock')) this.$('white-clock').textContent = fmtTime(s); this.syncClocks(); },
      () => this.handleTimeOut('w')
    );
    this.timers.b = new Timer(
      seconds,
      s => { if (this.$('black-clock')) this.$('black-clock').textContent = fmtTime(s); this.syncClocks(); },
      () => this.handleTimeOut('b')
    );
  }

  _startTimersForTurn(turn) {
    if (turn === 'w') {
      this.timers.w?.start();
      this.timers.b?.stop();
    } else {
      this.timers.b?.start();
      this.timers.w?.stop();
    }
    this.syncClocks();
  }

  _stopTimers() {
    this.timers.w?.stop();
    this.timers.b?.stop();
  }

  handleTimeOut(color) {
    if (!this.gameActive) return;
    this.gameActive = false;
    this._stopTimers();
    const winnerColor = color === 'w' ? 'b' : 'w';
    const winnerName = winnerColor === 'w' ? this.currentGame.white_name : this.currentGame.black_name;
    this.showGameOver('⏰', 'Time Out', `${winnerName} wins on time.`, winnerColor);
    this.persistFinishedGame('time_forfeit', winnerColor);
  }

  _updateStatusLine() {
    const statusEl = this.$('game-status');
    const dot = this.$('status-dot');
    if (!statusEl || !dot) return;
    dot.className = 'status-dot';

    if (!this.session) {
      statusEl.textContent = 'Waiting for login...';
      return;
    }
    if (!this.currentGame) {
      statusEl.textContent = 'Lobby ready';
      this.$('game-chip').textContent = 'Lobby';
      return;
    }

    const wName = this.currentGame.white_name, bName = this.currentGame.black_name;
    const turnName = this.engine.turn === 'w' ? wName : bName;

    if (this.engine.status === 'check') {
      statusEl.textContent = `${turnName} is in check`;
      dot.classList.add('check');
    } else if (this.engine.status === 'checkmate') {
      const winner = this.engine.winner === 'w' ? wName : bName;
      statusEl.textContent = `Checkmate — ${winner} wins!`;
      dot.classList.add('mate');
    } else if (this.engine.status === 'stalemate') {
      statusEl.textContent = 'Stalemate — draw.';
    } else if (this.engine.status === 'draw50') {
      statusEl.textContent = 'Draw by 50-move rule.';
    } else if (this.engine.status === 'drawMat') {
      statusEl.textContent = 'Draw — insufficient material.';
    } else {
      statusEl.textContent = `${turnName} to move`;
    }
    this.renderShareLinks();
  }

  handleSquareClick(r, c) {
    if (!this.canMove() || this.pendingPromotion) return;
    const piece = this.engine.board[r][c];
    const turn = this.engine.turn;

    if (piece && this.engine.col(piece) === turn) {
      this.selected = [r, c];
      this.legalDots = this.engine.movesFrom(r, c);
      this.applyHighlights();
      return;
    }

    if (!this.selected) return;

    const legal = (this.legalDots || []).filter(m => m.to[0] === r && m.to[1] === c);
    if (!legal.length) {
      this.selected = null;
      this.legalDots = [];
      this.applyHighlights();
      return;
    }

    const promo = legal.find(m => m.special === 'promo');
    if (promo) {
      this.showPromotion(legal[0]);
      return;
    }
    this.commitMove(legal[0]);
  }

  showPromotion(baseMove) {
    this.pendingPromotion = baseMove;
    const wrap = this.$('promotion-pieces');
    const color = this.engine.turn;
    wrap.innerHTML = '';
    ['Q', 'R', 'B', 'N'].forEach(pt => {
      const btn = document.createElement('button');
      btn.className = 'promo-btn';
      btn.innerHTML = SVG[color + pt];
      btn.addEventListener('click', () => {
        this._hideEl(this.$('promotion-modal'));
        this.pendingPromotion = null;
        this.commitMove({ ...baseMove, promoteTo: pt });
      });
      wrap.appendChild(btn);
    });
    this._showEl(this.$('promotion-modal'));
  }

  async commitMove(move) {
    if (!this.canMove()) return;
    const moveColor = this.engine.turn;
    const { san } = this.engine.make(move);

    this.selected = null;
    this.legalDots = [];
    this.applyHighlights();
    this.renderBoard();
    this.renderCaptures();
    this.renderHistory();
    this.syncClocks();
    this._updateStatusLine();
    this._stopTimers();

    if (!this.engine.status || this.engine.status === 'check') {
      this._startTimersForTurn(this.engine.turn);
    }

    await this.saveMoveToDatabase(move, san, moveColor);

    if (this.engine.status === 'checkmate') {
      const winner = this.engine.winner === 'w' ? this.currentGame.white_name : this.currentGame.black_name;
      this.gameActive = false;
      this._stopTimers();
      setTimeout(() => this.showGameOver('♛', 'Checkmate', `${winner} wins by checkmate!`, this.engine.winner), 350);
      await this.persistFinishedGame('checkmate', this.engine.winner);
    } else if (this.engine.status === 'stalemate') {
      this.gameActive = false;
      this._stopTimers();
      setTimeout(() => this.showGameOver('🤝', 'Stalemate', 'The game ended in a draw.', null), 350);
      await this.persistFinishedGame('stalemate', null);
    } else if (this.engine.status === 'draw50') {
      this.gameActive = false;
      this._stopTimers();
      setTimeout(() => this.showGameOver('🤝', 'Draw', 'Draw by 50-move rule.', null), 350);
      await this.persistFinishedGame('draw', null);
    } else if (this.engine.status === 'drawMat') {
      this.gameActive = false;
      this._stopTimers();
      setTimeout(() => this.showGameOver('🤝', 'Draw', 'Draw by insufficient material.', null), 350);
      await this.persistFinishedGame('draw', null);
    }
  }

  async saveMoveToDatabase(move, san, moveColor) {
    if (!this.currentGameId) return;
    const snapshot = this.engine.snapshot();

    const movePayload = {
      game_id: this.currentGameId,
      move_index: this.engine.history.length,
      moved_by_userid: this.session.UserID,
      moved_by_name: this.session.Name,
      color: moveColor,
      from_square: sqName(move.from[0], move.from[1]),
      to_square: sqName(move.to[0], move.to[1]),
      san,
      special_move: move.special || null,
      promotion_piece: move.promoteTo || null,
      state_json: snapshot,
      created_at: nowISO()
    };

    this.syncLock = true;

    const { error: mErr } = await supabase.from('game_moves').insert(movePayload);
    if (mErr) {
      console.error(mErr);
      this.toast('Move save failed.', 'error');
    }

    const { error: gErr } = await supabase.from('games').update({
      state_json: snapshot,
      move_count: this.engine.history.length,
      last_move_san: san,
      current_turn: this.engine.turn,
      status: 'active',
      updated_at: nowISO()
    }).eq('id', this.currentGameId);

    if (gErr) {
      console.error(gErr);
      this.toast('Game state update failed.', 'error');
    }

    this.syncLock = false;
    this.lastSyncedAt = nowISO();
  }

  async persistFinishedGame(result, winnerColor = null) {
    if (!this.currentGameId) return;
    const winnerUserId = winnerColor === 'w' ? this.currentGame.white_userid
      : winnerColor === 'b' ? this.currentGame.black_userid : null;
    const winnerName = winnerColor === 'w' ? this.currentGame.white_name
      : winnerColor === 'b' ? this.currentGame.black_name : null;

    await supabase.from('games').update({
      status: 'finished',
      result,
      winner_userid: winnerUserId,
      winner_name: winnerName,
      state_json: this.engine.snapshot(),
      move_count: this.engine.history.length,
      last_move_san: this.engine.history.at(-1)?.san || null,
      current_turn: this.engine.turn,
      updated_at: nowISO()
    }).eq('id', this.currentGameId);
  }

  async loadRecentGames() {
    if (!this.session) return [];
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id,white_name,black_name,status,result,last_move_san,current_turn,updated_at,move_count')
        .contains('participants', [this.session.UserID])
        .order('updated_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error(error);
        return [];
      }
      this.renderRecentGames(data || []);
      return data || [];
    } catch (err) {
      console.error('loadRecentGames error:', err);
      return [];
    }
  }

  renderRecentGames(list) {
    const wrap = this.$('recent-games');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!list?.length) {
      const empty = document.createElement('div');
      empty.className = 'game-meta';
      empty.textContent = this.session ? 'No saved games yet.' : 'Login to see games.';
      wrap.appendChild(empty);
      return;
    }

    list.forEach(game => {
      const item = document.createElement('div');
      item.className = 'game-item';
      const badge = game.status === 'finished'
        ? (game.result || 'finished')
        : `${game.current_turn === 'w' ? 'White' : 'Black'} to move`;

      item.innerHTML = `
        <div class="game-item-top">
          <div>
            <div class="game-title">${escapeHtml(game.white_name)} vs ${escapeHtml(game.black_name)}</div>
            <div class="game-meta">${formatDateTime(game.updated_at)} · ${game.move_count || 0} moves</div>
          </div>
          <div class="game-badge">${escapeHtml(badge)}</div>
        </div>
        <div class="game-meta">${escapeHtml(game.last_move_san || 'No moves yet')}</div>`;

      item.addEventListener('click', () => this.openGameById(game.id));
      wrap.appendChild(item);
    });
  }

  _startPolling() {
    this._stopPolling();
    this.pollTimer = setInterval(() => this.pollCurrentGame(), 2500);
  }

  _stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  async pollCurrentGame() {
    if (!this.currentGameId || this.syncLock || !this.session) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', this.currentGameId)
        .maybeSingle();

      if (error || !data) return;

      if (this.lastSyncedAt && data.updated_at <= this.lastSyncedAt) return;
      if (this.syncLock) return;

      if (data.state_json?.board) {
        this.currentGame = data;
        this.engine.restore(data.state_json);
        this._applyGameMeta(data);
        this.renderBoard();
        this.renderCaptures();
        this.renderHistory();
        this.syncClocks();
        this._updateStatusLine();
        this.lastSyncedAt = data.updated_at;

        if (this.gameActive && (!data.status || data.status === 'active')) {
          this._stopTimers();
          this._startTimersForTurn(this.engine.turn);
        }
      }
    } catch (err) {
      console.warn('Poll error:', err);
    }
  }

  resetBoardToLobby() {
    this.currentGame = null;
    this.currentGameId = null;
    this.currentInviteToken = null;
    this.playerColor = null;
    this.viewOnly = true;
    this.gameActive = false;
    this._stopTimers();
    this._stopPolling();
    this.engine.reset();
    this.$('game-chip').textContent = 'Lobby';
    this.$('share-game-link').value = '';
    this.$('invite-game-link').value = '';
    this.$('white-name').textContent = 'White Player';
    this.$('black-name').textContent = 'Black Player';
    this.renderBoard();
    this.renderCaptures();
    this.renderHistory();
    this.syncClocks();
    this._updateStatusLine();
  }

  resetToLobby() {
    this.resetBoardToLobby();
    history.replaceState({}, '', location.pathname);
    this.toast('Returned to lobby.', 'info');
  }

  async rematch() {
    if (!this.currentGame || !this.session) return;
    if (!this.myColor) {
      this.toast('Only a participant can request a rematch.', 'error');
      return;
    }
    const oppId = this.myColor === 'w' ? this.currentGame.black_userid : this.currentGame.white_userid;
    const opp = this.users.find(u => u.UserID === oppId);
    if (!opp) {
      this.toast('Opponent not found.', 'error');
      return;
    }
    this.selectedInvitee = opp;
    this.$('selected-user').textContent = `${opp.Name} (@${opp.UserID})`;
    await this.createInviteGame();
  }

  showGameOver(icon, title, message, winnerColor) {
    this.$('gameover-icon').textContent = icon;
    this.$('gameover-title').textContent = title;
    this.$('gameover-message').textContent = message;
    const moves = Math.ceil(this.engine.history.length / 2);
    const whiteTime = fmtTime(this.timers.w?.time ?? this.timeControl);
    const blackTime = fmtTime(this.timers.b?.time ?? this.timeControl);
    this.$('gameover-stats').innerHTML = `
      <div>Moves played: <b>${moves}</b></div>
      <div>${escapeHtml(this.currentGame.white_name)} time left: <b>${whiteTime}</b></div>
      <div>${escapeHtml(this.currentGame.black_name)} time left: <b>${blackTime}</b></div>`;
    this._showEl(this.$('gameover-modal'));
    if (winnerColor) {
      this.$('game-chip').textContent = `Game ${String(this.currentGameId).slice(0, 8)} · Finished`;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', async () => {
  const app = new GameController();
  window._game = app;
  await app.init();
});
