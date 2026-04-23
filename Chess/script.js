// script.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

'use strict';

const SUPABASE_URL = 'https://xwuqiteezvutzfekjbot.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dXFpdGVlenZ1dHpmZWtqYm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDI2NDksImV4cCI6MjA5MjQ3ODY0OX0.vloiHcIgNbrAcT6XTIEalgZvxmRXK95tVJR9yzoxihk';
const USERS_JSON = 'data/users.json';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FILES = 'abcdefgh';
const RANKS = '87654321';
const SESSION_KEY = 'gm_arena_session';
const THEME_KEY = 'gm_arena_theme';

const SVG = {
  wP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="22.5" cy="12" r="5.5" stroke-width="1.5"/><path d="M17.5 20.5c-1.2 2.5-.5 6.5 1 8.5l-2.5 5.5v1.5h13v-1.5l-2.5-5.5c1.5-2 2.2-6 1-8.5z"/><rect x="12.5" y="35.5" width="20" height="3" rx="1.5" stroke-width="1.5"/></g></svg>`,
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

function cloneBoard(board) {
  return board.map(row => [...row]);
}
function sqName(r, c) {
  return FILES[c] + RANKS[r];
}
function nowISO() {
  return new Date().toISOString();
}
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function uid() {
  return crypto.randomUUID();
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}
function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value || '';
  }
}

class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = [
      ['bR','bN','bB','bQ','bK','bB','bN','bR'],
      ['bP','bP','bP','bP','bP','bP','bP','bP'],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['wP','wP','wP','wP','wP','wP','wP','wP'],
      ['wR','wN','wB','wQ','wK','wB','wN','wR']
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
            ? [[-1,-1],[-1,1],[1,-1],[1,1]]
            : t === 'R'
              ? [[-1,0],[1,0],[0,-1],[0,1]]
              : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
          for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (this.ok(nr, nc)) {
              if (nr === row && nc === col) return true;
              if (board[nr][nc]) break;
              nr += dr;
              nc += dc;
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
    const color = this.col(p);
    const t = this.type(p);
    const opp = this.opp(color);
    const moves = [];
    const mv = (tr, tc, sp = null) => ({ from: [r, c], to: [tr, tc], special: sp });

    if (t === 'P') {
      const dir = color === 'w' ? -1 : 1;
      const start = color === 'w' ? 6 : 1;
      const promR = color === 'w' ? 0 : 7;

      if (this.ok(r + dir, c) && !board[r + dir][c]) {
        moves.push(mv(r + dir, c, r + dir === promR ? 'promo' : null));
        if (r === start && !board[r + 2 * dir][c]) {
          moves.push(mv(r + 2 * dir, c, 'double'));
        }
      }

      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (!this.ok(nr, nc)) continue;
        if (board[nr][nc] && this.col(board[nr][nc]) === opp) {
          moves.push(mv(nr, nc, nr === promR ? 'promo' : null));
        }
        if (ep && ep[0] === nr && ep[1] === nc) {
          moves.push(mv(nr, nc, 'ep'));
        }
      }
    } else if (t === 'N') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nc = c + dc;
        if (this.ok(nr, nc) && this.col(board[nr][nc]) !== color) {
          moves.push(mv(nr, nc));
        }
      }
    } else if (t === 'K') {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        if (this.ok(nr, nc) && this.col(board[nr][nc]) !== color) {
          moves.push(mv(nr, nc));
        }
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
    } else {
      const dirs = t === 'B'
        ? [[-1,-1],[-1,1],[1,-1],[1,1]]
        : t === 'R'
          ? [[-1,0],[1,0],[0,-1],[0,1]]
          : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (this.ok(nr, nc)) {
          if (board[nr][nc]) {
            if (this.col(board[nr][nc]) === opp) moves.push(mv(nr, nc));
            break;
          }
          moves.push(mv(nr, nc));
          nr += dr;
          nc += dc;
        }
      }
    }

    return moves;
  }

  applyMove(move, board = this.board, castling = this.castling, ep = this.enPassant) {
    const nb = cloneBoard(board);
    const nc = { ...castling };
    let nep = null;
    let captured = null;

    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = nb[fr][fc];
    const color = this.col(piece);
    const target = nb[tr][tc];

    captured = target;
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

    const placedPiece = move.promoteTo ? color + move.promoteTo : piece;
    nb[tr][tc] = placedPiece;

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

    if (move.special === 'double') {
      nep = [color === 'w' ? tr + 1 : tr - 1, tc];
    }

    return { board: nb, castling: nc, ep: nep, captured };
  }

  allLegal(color, board = this.board, castling = this.castling, ep = this.enPassant) {
    const legal = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!board[r][c] || this.col(board[r][c]) !== color) continue;
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

    const historyMove = {
      move: {
        from: [...move.from],
        to: [...move.to],
        special: move.special ?? null,
        promoteTo: move.promoteTo ?? null
      },
      san,
      captured,
      board: cloneBoard(this.board),
      afterBoard: cloneBoard(nb)
    };

    this.history.push(historyMove);

    this.board = nb;
    this.castling = nc;
    this.enPassant = nep;

    const movedPiece = nb[move.to[0]][move.to[1]];
    const movedType = this.type(movedPiece);
    if (movedType === 'P' || captured) this.halfClock = 0;
    else this.halfClock++;

    if (this.turn === 'b') this.moveNum++;
    this.turn = this.opp(this.turn);

    this._cacheLegal();
    this._updateStatus();
    return { san, captured };
  }

  _updateStatus() {
    if (this.legalMoves.length === 0) {
      if (this.inCheck(this.turn, this.board)) {
        this.status = 'checkmate';
        this.winner = this.opp(this.turn);
      } else {
        this.status = 'stalemate';
      }
    } else if (this.inCheck(this.turn, this.board)) {
      this.status = 'check';
    } else if (this.halfClock >= 100) {
      this.status = 'draw50';
    } else if (this._insufficientMaterial()) {
      this.status = 'drawMat';
    } else {
      this.status = null;
    }
  }

  _insufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c]) pieces.push(this.board[r][c]);
      }
    }
    if (pieces.length <= 2) return true;
    if (pieces.length === 3) {
      const types = pieces.map(p => this.type(p));
      return types.includes('B') || types.includes('N');
    }
    return false;
  }

  _san(move, captured, boardAfter) {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[fr][fc];
    const t = this.type(piece);
    const color = this.col(piece);

    if (move.special === 'castleK') return 'O-O';
    if (move.special === 'castleQ') return 'O-O-O';

    let san = '';
    if (t !== 'P') san += t;

    if (t !== 'P') {
      const ambig = this.legalMoves.filter(m => {
        const p2 = this.board[m.from[0]][m.from[1]];
        return p2 &&
          this.type(p2) === t &&
          this.col(p2) === color &&
          !(m.from[0] === fr && m.from[1] === fc) &&
          m.to[0] === tr &&
          m.to[1] === tc;
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
    const vals = { P:1, N:3, B:3, R:5, Q:9, K:0 };
    let sum = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && this.col(p) === color) sum += vals[this.type(p)] || 0;
      }
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

  restore(snapshot) {
    if (!snapshot || !snapshot.board) {
      this.reset();
      return;
    }
    this.board = snapshot.board.map(row => [...row]);
    this.turn = snapshot.turn ?? 'w';
    this.castling = { wK: true, wQ: true, bK: true, bQ: true, ...(snapshot.castling || {}) };
    this.enPassant = snapshot.enPassant ? [...snapshot.enPassant] : null;
    this.halfClock = snapshot.halfClock ?? 0;
    this.moveNum = snapshot.moveNum ?? 1;
    this.history = Array.isArray(snapshot.history) ? deepCopy(snapshot.history) : [];
    this.captured = snapshot.captured ? {
      w: [...(snapshot.captured.w || [])],
      b: [...(snapshot.captured.b || [])]
    } : { w: [], b: [] };
    this.status = snapshot.status ?? null;
    this.winner = snapshot.winner ?? null;
    this._cacheLegal();
  }
}

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

  reset(seconds) {
    this.stop();
    this.time = seconds;
  }
}

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
    this.pendingPromotion = null;
    this.timeControl = 600;

    this.timers = { w: null, b: null };
    this.gameActive = false;
    this.pollTimer = null;
    this.syncLock = false;
    this.lastSyncedAt = null;

    this.selectedInvitee = null;
    this._boardReady = false;
    this._bindStaticEvents();
    this._applyTheme();
    this._fitBoard();
  }

  $(id) {
    return document.getElementById(id);
  }

  $all(sel) {
    return [...document.querySelectorAll(sel)];
  }

  toast(message, type = 'info') {
    const wrap = this.$('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.transition = 'opacity .25s, transform .25s';
      setTimeout(() => el.remove(), 260);
    }, 2400);
  }

  _fitBoard() {
    const maxW = Math.min(window.innerWidth * 0.44, window.innerHeight * 0.75, 620);
    const size = Math.max(320, Math.floor(maxW));
    document.documentElement.style.setProperty('--board-size', `${size}px`);
  }

  _applyTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved === 'light' ? 'light' : 'dark';
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

  _bindStaticEvents() {
    window.addEventListener('resize', () => this._fitBoard());

    this.$('theme-toggle')?.addEventListener('click', () => this._toggleTheme());
    this.$('logout-btn')?.addEventListener('click', () => this.logout());

    this.$('login-form')?.addEventListener('submit', e => {
      e.preventDefault();
      this.login();
    });

    this.$('invite-search')?.addEventListener('input', () => this.renderUserSearch());

    this.$('create-game-btn')?.addEventListener('click', () => this.createInviteGame());

    this.$('open-game-btn')?.addEventListener('click', () => {
      const id = this.$('game-id-input').value.trim();
      if (!id) return this.toast('Paste a game ID first.', 'error');
      this.openGameById(id);
    });

    this.$('copy-game-link')?.addEventListener('click', () => this.copyCurrentGameLink('game'));
    this.$('copy-invite-link')?.addEventListener('click', () => this.copyCurrentGameLink('invite'));

    this.$('new-game-btn')?.addEventListener('click', () => this.resetToLobby());
    this.$('rematch-btn')?.addEventListener('click', () => this.rematch());

    this.$('game-id-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const id = this.$('game-id-input').value.trim();
        if (id) this.openGameById(id);
      }
    });
  }

  async init() {
    this.users = await this.loadUsers();
    this.restoreSession();
    this.renderUserSearch();
    this.renderRecentGames([]);

    if (this.session) {
      await this.enterApp();
    } else {
      this.$('login-overlay').classList.remove('hidden');
      this.$('app-shell').classList.add('hidden');
      this.$('login-userid').focus();
    }

    this.renderBoard();
    this._updateStatusLine();
  }

  async loadUsers() {
    try {
      const res = await fetch(USERS_JSON, { cache: 'no-store' });
      if (!res.ok) throw new Error('Unable to load users.json');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(err);
      this.toast('Could not load users.json. Check that the file is available.', 'error');
      return [];
    }
  }

  restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      this.session = raw ? JSON.parse(raw) : null;
    } catch {
      this.session = null;
    }
  }

  saveSession(user) {
    this.session = {
      Name: user.Name,
      UserID: user.UserID
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  }

  logout() {
    this._stopPolling();
    this._stopTimers();
    this.session = null;
    this.currentGame = null;
    this.currentGameId = null;
    this.currentInviteToken = null;
    this.playerColor = null;
    this.viewOnly = true;
    localStorage.removeItem(SESSION_KEY);
    this.$('app-shell').classList.add('hidden');
    this.$('login-overlay').classList.remove('hidden');
    this.$('login-userid').value = '';
    this.$('login-password').value = '';
    this.$('login-error').textContent = '';
    this.$('login-userid').focus();
    this.engine.reset();
    this.renderBoard();
    this.renderCaptures();
    this.renderHistory();
    this._updateStatusLine();
  }

  async login() {
    const userId = this.$('login-userid').value.trim();
    const password = this.$('login-password').value;

    const match = this.users.find(u =>
      String(u.UserID).toLowerCase() === userId.toLowerCase() &&
      String(u.Pass) === password
    );

    if (!match) {
      this.$('login-error').textContent = 'Invalid User ID or Password.';
      return;
    }

    this.$('login-error').textContent = '';
    this.saveSession(match);
    await this.enterApp();
  }

  async enterApp() {
    this.$('login-overlay').classList.add('hidden');
    this.$('app-shell').classList.remove('hidden');

    this.$('current-user-chip').textContent = `${this.session.Name} · ${this.session.UserID}`;
    this.renderUserSearch();
    await this.loadRecentGames();

    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    const game = params.get('game');

    if (invite) {
      await this.openGameByInvite(invite);
    } else if (game) {
      await this.openGameById(game);
    } else {
      this.resetBoardToLobby();
    }

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
    if (this.engine.status && ['checkmate', 'stalemate', 'draw50', 'drawMat'].includes(this.engine.status)) return false;
    return this.engine.turn === this.myColor;
  }

  renderUserSearch() {
    const query = this.$('invite-search').value.trim().toLowerCase();
    const results = this.users
      .filter(u => {
        const n = String(u.Name || '').toLowerCase();
        const id = String(u.UserID || '').toLowerCase();
        return !query || n.includes(query) || id.includes(query);
      })
      .slice(0, 20);

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
        <div class="user-badge">Invite</div>
      `;
      row.addEventListener('click', () => {
        this.selectedInvitee = user;
        this.$('selected-user').textContent = `${user.Name} (@${user.UserID})`;
        this.renderUserSearch();
      });
      wrap.appendChild(row);
    });

    if (!this.selectedInvitee && results.length) {
      this.$('selected-user').textContent = 'None';
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

    const gameId = uid();
    const inviteToken = uid().replaceAll('-', '');
    const initialState = this.engine.snapshot();

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
      state_json: initialState,
      invite_status: 'pending',
      invite_accepted_at: null,
      created_at: nowISO(),
      updated_at: nowISO()
    };

    const { error } = await supabase.from('games').insert(payload);
    if (error) {
      console.error(error);
      this.toast('Could not create game in Supabase.', 'error');
      return;
    }

    this.currentInviteToken = inviteToken;
    const gameLink = `${location.origin}${location.pathname}?game=${gameId}`;
    const inviteLink = `${location.origin}${location.pathname}?invite=${inviteToken}`;

    await this.loadRecentGames();
    await this.openGameById(gameId, { preserveUrl: true });

    this.$('share-game-link').value = gameLink;
    this.$('invite-game-link').value = inviteLink;
    await this.copyText(inviteLink);
    this.toast('Game created and invite link copied.', 'success');
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

    if (game.invite_status === 'pending' && this.session && this.session.UserID === game.invitee_userid) {
      await supabase.from('games').update({
        invite_status: 'accepted',
        invite_accepted_at: nowISO(),
        updated_at: nowISO()
      }).eq('id', game.id);
      game.invite_status = 'accepted';
      game.invite_accepted_at = nowISO();
    }

    this._applyGameMeta(game);
    this._prepareGameUI();
    this.renderBoard();
    this.renderCaptures();
    this.renderHistory();
    this.renderShareLinks();
    this.syncClocks();
    this._updateStatusLine();

    if (!options.preserveUrl) {
      const url = `${location.pathname}?game=${game.id}`;
      history.replaceState({}, '', url);
    }

    this.gameActive = true;
    this._stopTimers();
    this._startTimersForTurn(this.engine.turn);
    this._startPolling();

    if (Array.isArray(game.participants) && game.participants.includes(this.session?.UserID)) {
      this.toast(`Loaded ${game.white_name} vs ${game.black_name}.`, 'success');
    } else {
      this.toast('Loaded game in read-only mode.', 'info');
    }
  }

  _applyGameMeta(game) {
    this.$('game-chip').textContent = `Game ${game.id.slice(0, 8)}`;
    this.$('white-name').textContent = game.white_name || 'White Player';
    this.$('black-name').textContent = game.black_name || 'Black Player';

    const secs = game.time_control_seconds ?? 600;
    this.timeControl = secs;

    if (this.timers.w) this.timers.w.reset(secs);
    if (this.timers.b) this.timers.b.reset(secs);

    this.$('white-clock').textContent = formatTime(secs);
    this.$('black-clock').textContent = formatTime(secs);
    this.$('white-score').textContent = '';
    this.$('black-score').textContent = '';
  }

  _prepareGameUI() {
    const isWhiteTurn = this.engine.turn === 'w';
    this.$('white-card').classList.toggle('active', isWhiteTurn);
    this.$('black-card').classList.toggle('active', !isWhiteTurn);
    this.$('game-id-input').value = this.currentGameId || '';
    this.selected = null;
    this.pendingPromotion = null;
    this._boardReady = true;
  }

  renderShareLinks() {
    const gameLink = this.currentGameId ? `${location.origin}${location.pathname}?game=${this.currentGameId}` : '';
    const inviteLink = this.currentGame?.invite_token ? `${location.origin}${location.pathname}?invite=${this.currentGame.invite_token}` : '';

    this.$('share-game-link').value = gameLink;
    this.$('invite-game-link').value = inviteLink;
  }

  async copyCurrentGameLink(kind = 'game') {
    const text = kind === 'invite' ? this.$('invite-game-link').value : this.$('share-game-link').value;
    if (!text) {
      this.toast('No link available yet.', 'error');
      return;
    }
    await this.copyText(text);
    this.toast(kind === 'invite' ? 'Invite link copied.' : 'Game link copied.', 'success');
  }

  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const temp = document.createElement('input');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
  }

  renderBoard() {
    const board = this.$('chess-board');
    const rankAxis = this.$('rank-axis');
    const fileAxis = this.$('file-axis');

    board.innerHTML = '';
    rankAxis.innerHTML = '';
    fileAxis.innerHTML = '';

    ['8','7','6','5','4','3','2','1'].forEach(n => {
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
    return board.children[r * 8 + c];
  }

  clearBoardMarks() {
    this.$all('.square').forEach(sq => {
      sq.classList.remove('selected', 'last-from', 'last-to', 'in-check', 'capture-dot', 'move-dot');
      sq.querySelector('.move-marker')?.remove();
    });
  }

  applyHighlights() {
    this.clearBoardMarks();

    if (this.engine.history.length) {
      const last = this.engine.history[this.engine.history.length - 1];
      if (last?.move) {
        this.getSquareEl(...last.move.from)?.classList.add('last-from');
        this.getSquareEl(...last.move.to)?.classList.add('last-to');
      }
    }

    if (this.engine.status === 'check' || this.engine.status === 'checkmate') {
      const kp = this.engine.kingPos(this.engine.turn, this.engine.board);
      if (kp) this.getSquareEl(...kp)?.classList.add('in-check');
    }

    if (this.selected) {
      this.getSquareEl(...this.selected)?.classList.add('selected');

      for (const move of this.legalDots || []) {
        const [tr, tc] = move.to;
        const square = this.getSquareEl(tr, tc);
        if (!square) continue;
        const capture = !!this.engine.board[tr][tc] || move.special === 'ep';
        if (capture) square.classList.add('capture-dot');
        else square.classList.add('move-dot');

        const marker = document.createElement('div');
        marker.className = 'move-marker';
        square.appendChild(marker);
      }
    }
  }

  renderCaptures() {
    const whiteCaptures = this.$('white-captures');
    const blackCaptures = this.$('black-captures');
    whiteCaptures.innerHTML = '';
    blackCaptures.innerHTML = '';

    this.engine.captured.w.forEach(p => {
      const holder = document.createElement('div');
      holder.innerHTML = SVG[p];
      whiteCaptures.appendChild(holder);
    });

    this.engine.captured.b.forEach(p => {
      const holder = document.createElement('div');
      holder.innerHTML = SVG[p];
      blackCaptures.appendChild(holder);
    });

    const wMat = this.engine.material('w');
    const bMat = this.engine.material('b');
    const diff = wMat - bMat;
    this.$('white-score').textContent = diff > 0 ? `+${diff}` : '';
    this.$('black-score').textContent = diff < 0 ? `+${Math.abs(diff)}` : '';
  }

  renderHistory() {
    const wrap = this.$('move-history');
    wrap.innerHTML = '';

    if (!this.engine.history.length) {
      const empty = document.createElement('div');
      empty.className = 'game-meta';
      empty.textContent = 'No moves yet.';
      wrap.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.engine.history.length; i += 2) {
      const whiteMove = this.engine.history[i];
      const blackMove = this.engine.history[i + 1];

      const row = document.createElement('div');
      row.className = 'history-row';

      const num = document.createElement('div');
      num.className = 'history-num';
      num.textContent = `${Math.floor(i / 2) + 1}.`;

      const w = document.createElement('div');
      w.className = 'history-move' + (i === this.engine.history.length - 1 ? ' last' : '');
      w.textContent = whiteMove?.san || '';

      const b = document.createElement('div');
      b.className = 'history-move' + (i + 1 === this.engine.history.length - 1 ? ' last' : '');
      b.textContent = blackMove?.san || '';

      row.appendChild(num);
      row.appendChild(w);
      row.appendChild(b);
      wrap.appendChild(row);
    }

    wrap.scrollTop = wrap.scrollHeight;
    const lastSan = this.engine.history.at(-1)?.san || '';
    this.$('last-move-label').textContent = lastSan ? `Last move: ${lastSan}` : '';
  }

  syncClocks() {
    const white = this.$('white-clock');
    const black = this.$('black-clock');
    const whitePip = this.$('white-pip');
    const blackPip = this.$('black-pip');

    if (this.timers.w) white.textContent = formatTime(this.timers.w.time);
    if (this.timers.b) black.textContent = formatTime(this.timers.b.time);

    white.className = 'clock';
    black.className = 'clock';
    whitePip.className = 'clock-pip';
    blackPip.className = 'clock-pip';

    const activeColor = this.engine.turn;
    const activeClock = activeColor === 'w' ? white : black;
    const activePip = activeColor === 'w' ? whitePip : blackPip;

    activeClock.classList.add('active');
    activePip.classList.add('active');

    if ((this.timers.w?.time ?? this.timeControl) <= 30 && activeColor === 'w') white.classList.add('low');
    if ((this.timers.b?.time ?? this.timeControl) <= 30 && activeColor === 'b') black.classList.add('low');
  }

  _updateStatusLine() {
    const statusEl = this.$('game-status');
    const dot = this.$('status-dot');
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

    if (this.engine.status === 'check') {
      statusEl.textContent = `${this.engine.turn === 'w' ? this.currentGame.white_name : this.currentGame.black_name} is in check`;
      dot.classList.add('check');
    } else if (this.engine.status === 'checkmate') {
      const winnerName = this.engine.winner === 'w' ? this.currentGame.white_name : this.currentGame.black_name;
      statusEl.textContent = `Checkmate. ${winnerName} wins.`;
      dot.classList.add('mate');
    } else if (this.engine.status === 'stalemate') {
      statusEl.textContent = 'Stalemate. Draw.';
    } else if (this.engine.status === 'draw50') {
      statusEl.textContent = 'Draw by 50-move rule.';
    } else if (this.engine.status === 'drawMat') {
      statusEl.textContent = 'Draw by insufficient material.';
    } else {
      const turnName = this.engine.turn === 'w' ? this.currentGame.white_name : this.currentGame.black_name;
      statusEl.textContent = `${turnName} to move`;
    }

    this.$('white-card').classList.toggle('active', this.engine.turn === 'w');
    this.$('black-card').classList.toggle('active', this.engine.turn === 'b');
    this.renderShareLinks();
  }

  _startTimersForTurn(turn) {
    if (this.timers.w && this.timers.b) {
      if (turn === 'w') {
        this.timers.w.start();
        this.timers.b.stop();
      } else {
        this.timers.b.start();
        this.timers.w.stop();
      }
    }
    this.syncClocks();
  }

  _stopTimers() {
    this.timers.w?.stop();
    this.timers.b?.stop();
  }

  _buildTimers(seconds) {
    this.timers.w = new Timer(
      seconds,
      s => { this.$('white-clock').textContent = formatTime(s); this.syncClocks(); },
      () => this.handleTimeOut('w')
    );
    this.timers.b = new Timer(
      seconds,
      s => { this.$('black-clock').textContent = formatTime(s); this.syncClocks(); },
      () => this.handleTimeOut('b')
    );
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

  async persistFinishedGame(result, winnerColor = null) {
    if (!this.currentGameId) return;
    const winnerUserId = winnerColor === 'w' ? this.currentGame.white_userid : winnerColor === 'b' ? this.currentGame.black_userid : null;
    const winnerName = winnerColor === 'w' ? this.currentGame.white_name : winnerColor === 'b' ? this.currentGame.black_name : null;

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

  handleSquareClick(r, c) {
    if (!this.canMove()) return;
    if (this.pendingPromotion) return;

    const piece = this.engine.board[r][c];
    const turn = this.engine.turn;

    if (piece && this.engine.col(piece) === turn) {
      this.selected = [r, c];
      this.legalDots = this.engine.movesFrom(r, c);
      this.applyHighlights();
      return;
    }

    if (!this.selected) return;

    const candidates = (this.legalDots || []).filter(m => m.to[0] === r && m.to[1] === c);
    if (!candidates.length) {
      this.selected = null;
      this.legalDots = [];
      this.applyHighlights();
      return;
    }

    const promo = candidates.find(m => m.special === 'promo');
    if (promo) {
      this.showPromotion(candidates[0]);
      return;
    }

    this.commitMove(candidates[0]);
  }

  showPromotion(baseMove) {
    this.pendingPromotion = baseMove;
    const wrap = this.$('promotion-pieces');
    wrap.innerHTML = '';
    const color = this.engine.turn;

    ['Q', 'R', 'B', 'N'].forEach(pt => {
      const btn = document.createElement('button');
      btn.className = 'promo-btn';
      btn.innerHTML = SVG[color + pt];
      btn.addEventListener('click', () => {
        this.$('promotion-modal').classList.add('hidden');
        const move = { ...baseMove, promoteTo: pt };
        this.pendingPromotion = null;
        this.commitMove(move);
      });
      wrap.appendChild(btn);
    });

    this.$('promotion-modal').classList.remove('hidden');
  }

  async commitMove(move) {
    if (!this.canMove()) return;

    const moveColor = this.engine.turn;
    const result = this.engine.make(move);
    const san = result.san;

    this.selected = null;
    this.legalDots = [];
    this.applyHighlights();
    this.renderBoard();
    this.renderCaptures();
    this.renderHistory();
    this.syncClocks();
    this._updateStatusLine();

    this._stopTimers();

    const nextTurn = this.engine.turn;
    if (!this.engine.status || this.engine.status === 'check') {
      this._startTimersForTurn(nextTurn);
    }

    await this.saveMoveToDatabase(move, san, moveColor);

    if (this.engine.status === 'checkmate') {
      const winnerName = this.engine.winner === 'w' ? this.currentGame.white_name : this.currentGame.black_name;
      this.gameActive = false;
      this._stopTimers();
      setTimeout(() => this.showGameOver('♛', 'Checkmate', `${winnerName} wins by checkmate.`, this.engine.winner), 350);
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
    const payload = {
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
    const { error: moveErr } = await supabase.from('game_moves').insert(payload);
    if (moveErr) {
      console.error(moveErr);
      this.toast('Move saved locally, but failed to store in game_moves.', 'error');
    }

    const updatePayload = {
      state_json: snapshot,
      move_count: this.engine.history.length,
      last_move_san: san,
      current_turn: this.engine.turn,
      status: 'active',
      updated_at: nowISO()
    };

    const { error: gameErr } = await supabase.from('games').update(updatePayload).eq('id', this.currentGameId);
    if (gameErr) {
      console.error(gameErr);
      this.toast('Game state update failed in Supabase.', 'error');
    }

    this.syncLock = false;
    this.lastSyncedAt = nowISO();
  }

  async loadRecentGames() {
    if (!this.session) return [];
    const userId = this.session.UserID;

    const { data, error } = await supabase
      .from('games')
      .select('id, white_name, black_name, status, result, last_move_san, current_turn, updated_at, move_count')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false })
      .limit(12);

    if (error) {
      console.error(error);
      return [];
    }

    this.renderRecentGames(data || []);
    return data || [];
  }

  renderRecentGames(list) {
    const wrap = this.$('recent-games');
    wrap.innerHTML = '';

    if (!list || !list.length) {
      const empty = document.createElement('div');
      empty.className = 'game-meta';
      empty.textContent = this.session ? 'No saved games yet.' : 'Login to see your games.';
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
        <div class="game-meta">${escapeHtml(game.last_move_san || 'No moves yet')}</div>
      `;
      item.addEventListener('click', () => this.openGameById(game.id));
      wrap.appendChild(item);
    });
  }

  async _startPolling() {
    this._stopPolling();
    this.pollTimer = setInterval(() => this.pollCurrentGame(), 2500);
  }

  _stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  async pollCurrentGame() {
    if (!this.currentGameId || this.syncLock || !this.session) return;

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', this.currentGameId)
      .maybeSingle();

    if (error || !data) return;
    if (!this.lastSyncedAt || data.updated_at !== this.lastSyncedAt) {
      if (data.state_json && data.state_json.board) {
        this.currentGame = data;
        this.engine.restore(data.state_json);
        this._applyGameMeta(data);
        this.renderBoard();
        this.renderCaptures();
        this.renderHistory();
        this.syncClocks();
        this._updateStatusLine();
        this.lastSyncedAt = data.updated_at;
      } else {
        await this.openGameRecord(data, { preserveUrl: true });
      }
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
    const opponentUserId = this.myColor === 'w' ? this.currentGame.black_userid : this.currentGame.white_userid;
    const opponent = this.users.find(u => u.UserID === opponentUserId);
    if (!opponent) {
      this.toast('Opponent profile not found.', 'error');
      return;
    }
    this.selectedInvitee = opponent;
    this.$('selected-user').textContent = `${opponent.Name} (@${opponent.UserID})`;
    await this.createInviteGame();
  }

  async showGameOver(icon, title, message, winnerColor) {
    this.$('gameover-icon').textContent = icon;
    this.$('gameover-title').textContent = title;
    this.$('gameover-message').textContent = message;

    const moves = Math.ceil(this.engine.history.length / 2);
    const whiteTime = this.timers.w ? formatTime(this.timers.w.time) : formatTime(this.timeControl);
    const blackTime = this.timers.b ? formatTime(this.timers.b.time) : formatTime(this.timeControl);

    this.$('gameover-stats').innerHTML = `
      <div>Moves played: <b>${moves}</b></div>
      <div>${escapeHtml(this.currentGame.white_name)} time left: <b>${whiteTime}</b></div>
      <div>${escapeHtml(this.currentGame.black_name)} time left: <b>${blackTime}</b></div>
    `;

    this.$('gameover-modal').classList.remove('hidden');
    if (winnerColor) {
      this.$('game-chip').textContent = `Game ${this.currentGameId.slice(0, 8)} · Finished`;
    }
  }

  async _loadGameInviteAcceptData(game) {
    if (!game || !this.session) return;
    if (game.invitee_userid !== this.session.UserID) return;
    await supabase.from('games').update({
      invite_status: 'accepted',
      invite_accepted_at: nowISO(),
      updated_at: nowISO()
    }).eq('id', game.id);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const app = new GameController();
  window._game = app;
  await app.init();
});
