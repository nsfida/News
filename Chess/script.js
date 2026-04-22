/* ═══════════════════════════════════════════════════════════════
   GRANDMASTER CHESS — JavaScript Engine
   Full chess rules · Lichess-style SVG pieces · Dual timers
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════════
   SVG PIECE DEFINITIONS  (cburnett-inspired, 45×45 viewBox)
══════════════════════════════════════════════════════════════ */
const SVG = {
  wP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="22.5" cy="12" r="5.5" stroke-width="1.5"/>
      <path d="M17.5 20.5c-1.2 2.5-.5 6.5 1 8.5l-2.5 5.5v1.5h13v-1.5l-2.5-5.5c1.5-2 2.2-6 1-8.5z"/>
      <rect x="12.5" y="35.5" width="20" height="3" rx="1.5" stroke-width="1.5"/>
    </g>
  </svg>`,

  wN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 10c10 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
      <path d="M24 18c.38 5.12-5.14 7.94-8 10 3 0 7.5 1 8 7H16c0-6 4-11 5-12"/>
      <circle cx="19" cy="16" r="2.5" fill="#1a1a1a" stroke="none"/>
      <path d="M14 36h17v-3H14v3z"/>
    </g>
  </svg>`,

  wB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
      <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
      <circle cx="22.5" cy="8" r="2.5"/>
      <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  wR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 39h27v-3H9v3z" stroke-linejoin="miter"/>
      <path d="M12 36v-4h21v4H12z" stroke-linejoin="miter"/>
      <path d="M12 16h21v16H12V16z" stroke-linejoin="miter"/>
      <path d="M11 14h23" stroke-linejoin="miter"/>
      <path d="M9 9h4v2h5V9h5v2h5V9h4v5H9V9z" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  wQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="12" r="2.75"/>
      <circle cx="14" cy="9" r="2.75"/>
      <circle cx="22.5" cy="8" r="2.75"/>
      <circle cx="31" cy="9" r="2.75"/>
      <circle cx="39" cy="12" r="2.75"/>
      <path d="M6 12l3.5 18.5h26L39 12l-8.5 11-3.5-15-4.5 16-4.5-16L14.5 23 6 12z" stroke-linejoin="miter"/>
      <path d="M11 30.5h23" stroke-linejoin="miter"/>
      <path d="M11 30.5h23v3H11v-3z" stroke-linejoin="miter"/>
      <path d="M11 33.5h23v3H11v-3z" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  wK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#fff" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 11.5V5.5" stroke-width="1.8"/>
      <path d="M19.5 8.5h6" stroke-width="1.8"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" stroke-linejoin="miter"/>
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-11.5-3-15c0 0 9 9 5 24"/>
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"/>
    </g>
  </svg>`,

  bP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="22.5" cy="12" r="5.5" stroke="#888"/>
      <path d="M17.5 20.5c-1.2 2.5-.5 6.5 1 8.5l-2.5 5.5v1.5h13v-1.5l-2.5-5.5c1.5-2 2.2-6 1-8.5z" stroke="#888"/>
      <rect x="12.5" y="35.5" width="20" height="3" rx="1.5" stroke="#888"/>
    </g>
  </svg>`,

  bN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 10c10 1 16.5 8 16 29H15c0-9 10-6.5 8-21" stroke="#888"/>
      <path d="M24 18c.38 5.12-5.14 7.94-8 10 3 0 7.5 1 8 7H16c0-6 4-11 5-12" stroke="#888"/>
      <circle cx="19" cy="16" r="2.5" fill="#ccc" stroke="none"/>
      <path d="M14 36h17v-3H14v3z" stroke="#888"/>
    </g>
  </svg>`,

  bB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" stroke="#888"/>
      <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" stroke="#888"/>
      <circle cx="22.5" cy="8" r="2.5" stroke="#888"/>
      <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#aaa" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  bR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 39h27v-3H9v3z" stroke="#888" stroke-linejoin="miter"/>
      <path d="M12 36v-4h21v4H12z" stroke="#888" stroke-linejoin="miter"/>
      <path d="M12 16h21v16H12V16z" stroke="#888" stroke-linejoin="miter"/>
      <path d="M11 14h23" stroke="#888" stroke-linejoin="miter"/>
      <path d="M9 9h4v2h5V9h5v2h5V9h4v5H9V9z" stroke="#888" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  bQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="12" r="2.75" stroke="#888"/>
      <circle cx="14" cy="9" r="2.75" stroke="#888"/>
      <circle cx="22.5" cy="8" r="2.75" stroke="#888"/>
      <circle cx="31" cy="9" r="2.75" stroke="#888"/>
      <circle cx="39" cy="12" r="2.75" stroke="#888"/>
      <path d="M6 12l3.5 18.5h26L39 12l-8.5 11-3.5-15-4.5 16-4.5-16L14.5 23 6 12z" stroke="#888" stroke-linejoin="miter"/>
      <path d="M11 30.5h23" stroke="#aaa" stroke-linejoin="miter"/>
      <path d="M11 30.5h23v3H11v-3z" stroke="#888" stroke-linejoin="miter"/>
      <path d="M11 33.5h23v3H11v-3z" stroke="#888" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  bK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <g fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 11.5V5.5" stroke="#888" stroke-width="1.8"/>
      <path d="M19.5 8.5h6" stroke="#888" stroke-width="1.8"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" stroke="#888" stroke-linejoin="miter"/>
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-11.5-3-15c0 0 9 9 5 24" stroke="#888"/>
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" stroke="#aaa"/>
    </g>
  </svg>`
};

/* ══════════════════════════════════════════════════════════════
   CHESS ENGINE
══════════════════════════════════════════════════════════════ */
class ChessEngine {
  constructor() { this.reset(); }

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
    this.turn       = 'w';
    this.castling   = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassant  = null;   // [row, col] target square
    this.halfClock  = 0;
    this.moveNum    = 1;
    this.history    = [];     // { move, san, captured, castling, enPassant }
    this.captured   = { w: [], b: [] };  // pieces captured BY each color
    this.status     = null;   // null | 'check' | 'checkmate' | 'stalemate' | 'draw'
    this.winner     = null;
    this.legalMoves = null;
    this._cacheLegal();
  }

  col(p)  { return p ? p[0] : null; }   // color: 'w' | 'b'
  type(p) { return p ? p[1] : null; }   // type:  K Q R B N P
  opp(c)  { return c === 'w' ? 'b' : 'w'; }
  ok(r,c) { return r>=0 && r<8 && c>=0 && c<8; }

  // ── Find king ──
  kingPos(color, board) {
    for (let r=0;r<8;r++) for (let c=0;c<8;c++)
      if (board[r][c] === color+'K') return [r,c];
    return null;
  }

  // ── Is square (row,col) attacked by `byColor`? ──
  attacked(row, col, byColor, board) {
    const opp = byColor;
    for (let r=0;r<8;r++) {
      for (let c=0;c<8;c++) {
        const p = board[r][c];
        if (!p || this.col(p) !== opp) continue;
        const t = this.type(p);
        if (t === 'P') {
          const d = opp === 'w' ? -1 : 1;
          if (r+d === row && (c-1===col || c+1===col)) return true;
        } else if (t === 'N') {
          const dr=Math.abs(r-row), dc=Math.abs(c-col);
          if ((dr===2&&dc===1)||(dr===1&&dc===2)) return true;
        } else if (t === 'K') {
          if (Math.abs(r-row)<=1 && Math.abs(c-col)<=1) return true;
        } else {
          const dirs = t==='B' ? [[-1,-1],[-1,1],[1,-1],[1,1]]
                     : t==='R' ? [[-1,0],[1,0],[0,-1],[0,1]]
                     : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
          for (const [dr,dc] of dirs) {
            let nr=r+dr, nc=c+dc;
            while (this.ok(nr,nc)) {
              if (nr===row && nc===col) { return true; }
              if (board[nr][nc]) break;
              nr+=dr; nc+=dc;
            }
          }
        }
      }
    }
    return false;
  }

  inCheck(color, board) {
    const kp = this.kingPos(color, board);
    return kp ? this.attacked(kp[0], kp[1], this.opp(color), board) : false;
  }

  // ── Generate pseudo-legal moves for piece at [r,c] ──
  pseudoMoves(r, c, board, castling, ep) {
    const p = board[r][c];
    if (!p) return [];
    const color = this.col(p), t = this.type(p), opp = this.opp(color);
    const mv = (tr,tc,sp=null) => ({ from:[r,c], to:[tr,tc], special:sp });
    const moves = [];

    if (t === 'P') {
      const dir    = color==='w' ? -1 : 1;
      const start  = color==='w' ? 6 : 1;
      const promR  = color==='w' ? 0 : 7;
      // fwd
      if (this.ok(r+dir,c) && !board[r+dir][c]) {
        moves.push(mv(r+dir, c, r+dir===promR ? 'promo' : null));
        if (r===start && !board[r+2*dir][c])
          moves.push(mv(r+2*dir, c, 'double'));
      }
      // captures
      for (const dc of [-1,1]) {
        const nr=r+dir, nc=c+dc;
        if (this.ok(nr,nc)) {
          if (board[nr][nc] && this.col(board[nr][nc])===opp)
            moves.push(mv(nr, nc, nr===promR ? 'promo' : null));
          if (ep && ep[0]===nr && ep[1]===nc)
            moves.push(mv(nr, nc, 'ep'));
        }
      }
    }
    else if (t === 'N') {
      for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr=r+dr, nc=c+dc;
        if (this.ok(nr,nc) && this.col(board[nr][nc])!==color)
          moves.push(mv(nr,nc));
      }
    }
    else if (t === 'K') {
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr=r+dr, nc=c+dc;
        if (this.ok(nr,nc) && this.col(board[nr][nc])!==color)
          moves.push(mv(nr,nc));
      }
      // Castling
      if (color==='w' && r===7 && c===4 && !this.attacked(7,4,opp,board)) {
        if (castling.wK && !board[7][5] && !board[7][6] &&
            board[7][7]==='wR' && !this.attacked(7,5,opp,board) && !this.attacked(7,6,opp,board))
          moves.push(mv(7,6,'castleK'));
        if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1] &&
            board[7][0]==='wR' && !this.attacked(7,3,opp,board) && !this.attacked(7,2,opp,board))
          moves.push(mv(7,2,'castleQ'));
      }
      if (color==='b' && r===0 && c===4 && !this.attacked(0,4,opp,board)) {
        if (castling.bK && !board[0][5] && !board[0][6] &&
            board[0][7]==='bR' && !this.attacked(0,5,opp,board) && !this.attacked(0,6,opp,board))
          moves.push(mv(0,6,'castleK'));
        if (castling.bQ && !board[0][3] && !board[0][2] && !board[0][1] &&
            board[0][0]==='bR' && !this.attacked(0,3,opp,board) && !this.attacked(0,2,opp,board))
          moves.push(mv(0,2,'castleQ'));
      }
    }
    else {
      const dirs = t==='B' ? [[-1,-1],[-1,1],[1,-1],[1,1]]
                 : t==='R' ? [[-1,0],[1,0],[0,-1],[0,1]]
                 : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr,dc] of dirs) {
        let nr=r+dr, nc=c+dc;
        while (this.ok(nr,nc)) {
          if (board[nr][nc]) { if (this.col(board[nr][nc])===opp) moves.push(mv(nr,nc)); break; }
          moves.push(mv(nr,nc));
          nr+=dr; nc+=dc;
        }
      }
    }
    return moves;
  }

  // ── Apply move → returns {board, castling, ep, captured} ──
  applyMove(move, board, castling, ep) {
    const nb = board.map(r=>[...r]);
    const nc = {...castling};
    let nep = null, captured = null;
    const [fr,fc] = move.from, [tr,tc] = move.to;
    const piece = nb[fr][fc];
    const color = this.col(piece);

    captured = nb[tr][tc];
    nb[tr][tc] = move.promoteTo ? color + move.promoteTo : piece;
    nb[fr][fc] = null;

    if (move.special === 'ep') {
      const cr = color==='w' ? tr+1 : tr-1;
      captured = nb[cr][tc];
      nb[cr][tc] = null;
    }
    if (move.special === 'double') {
      nep = [color==='w' ? tr+1 : tr-1, tc];
    }
    if (move.special === 'castleK') {
      const row = color==='w' ? 7 : 0;
      nb[row][5] = color+'R'; nb[row][7] = null;
    }
    if (move.special === 'castleQ') {
      const row = color==='w' ? 7 : 0;
      nb[row][3] = color+'R'; nb[row][0] = null;
    }

    if (piece==='wK') { nc.wK=false; nc.wQ=false; }
    if (piece==='bK') { nc.bK=false; nc.bQ=false; }
    if (piece==='wR' && fr===7 && fc===7) nc.wK=false;
    if (piece==='wR' && fr===7 && fc===0) nc.wQ=false;
    if (piece==='bR' && fr===0 && fc===7) nc.bK=false;
    if (piece==='bR' && fr===0 && fc===0) nc.bQ=false;
    if (nb[tr][tc]==='wR' && tr===7 && tc===7 && piece!=='wR') nc.wK=false;
    if (nb[tr][tc]==='wR' && tr===7 && tc===0 && piece!=='wR') nc.wQ=false;
    if (nb[tr][tc]==='bR' && tr===0 && tc===7 && piece!=='bR') nc.bK=false;
    if (nb[tr][tc]==='bR' && tr===0 && tc===0 && piece!=='bR') nc.bQ=false;

    return { board:nb, castling:nc, ep:nep, captured };
  }

  // ── All legal moves for color ──
  allLegal(color, board, castling, ep) {
    const legal = [];
    for (let r=0;r<8;r++) {
      for (let c=0;c<8;c++) {
        if (board[r][c] && this.col(board[r][c])===color) {
          const pseudo = this.pseudoMoves(r,c,board,castling,ep);
          for (const m of pseudo) {
            if (m.special === 'promo') {
              for (const pt of ['Q','R','B','N']) {
                const pm = {...m, promoteTo:pt};
                const {board:nb} = this.applyMove(pm, board, castling, ep);
                if (!this.inCheck(color, nb)) legal.push(pm);
              }
            } else {
              const {board:nb} = this.applyMove(m, board, castling, ep);
              if (!this.inCheck(color, nb)) legal.push(m);
            }
          }
        }
      }
    }
    return legal;
  }

  _cacheLegal() {
    this.legalMoves = this.allLegal(this.turn, this.board, this.castling, this.enPassant);
  }

  // ── Make a move (returns SAN string) ──
  make(move) {
    const {board:nb, castling:nc, ep:nep, captured} = this.applyMove(move, this.board, this.castling, this.enPassant);
    const san = this._san(move, captured, nb, nc, nep);

    if (captured) this.captured[this.opp(this.turn)].push(captured);

    this.history.push({ move, san, captured,
      castling: {...this.castling}, enPassant: this.enPassant,
      board: this.board.map(r=>[...r]) });

    this.board     = nb;
    this.castling  = nc;
    this.enPassant = nep;

    const piece = nb[move.to[0]][move.to[1]];
    const t = this.type(piece);
    if (t==='P' || captured) this.halfClock = 0; else this.halfClock++;
    if (this.turn==='b') this.moveNum++;
    this.turn = this.opp(this.turn);

    this._cacheLegal();
    this._updateStatus();
    return san;
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
    for (let r=0;r<8;r++) for (let c=0;c<8;c++)
      if (this.board[r][c]) pieces.push(this.board[r][c]);
    if (pieces.length <= 2) return true;
    if (pieces.length === 3) {
      const types = pieces.map(p=>this.type(p));
      return types.includes('B') || types.includes('N');
    }
    return false;
  }

  // ── SAN notation (simplified) ──
  _san(move, captured, boardAfter) {
    const FILES = 'abcdefgh', RANKS = '87654321';
    const [fr,fc] = move.from, [tr,tc] = move.to;
    const piece = this.board[fr][fc];
    const t = this.type(piece);
    const color = this.col(piece);

    if (move.special === 'castleK') return 'O-O';
    if (move.special === 'castleQ') return 'O-O-O';

    let san = '';
    if (t !== 'P') san += t;

    // Disambiguation
    if (t !== 'P') {
      const ambig = this.legalMoves.filter(m => {
        const p2 = this.board[m.from[0]][m.from[1]];
        return p2 && this.type(p2)===t && this.col(p2)===color &&
               !(m.from[0]===fr && m.from[1]===fc) &&
               m.to[0]===tr && m.to[1]===tc;
      });
      if (ambig.length > 0) {
        if (ambig.every(m=>m.from[1]!==fc)) san += FILES[fc];
        else if (ambig.every(m=>m.from[0]!==fr)) san += RANKS[fr];
        else san += FILES[fc] + RANKS[fr];
      }
    }

    if (captured || move.special==='ep') {
      if (t==='P') san += FILES[fc];
      san += 'x';
    }
    san += FILES[tc] + RANKS[tr];

    if (move.promoteTo) san += '=' + move.promoteTo;

    // check / mate
    const opponent = this.opp(color);
    if (this.inCheck(opponent, boardAfter)) {
      const oppLegal = this.allLegal(opponent, boardAfter, this.castling, this.enPassant);
      san += oppLegal.length === 0 ? '#' : '+';
    }
    return san;
  }

  // ── Legal moves from a specific square ──
  movesFrom(r, c) {
    return this.legalMoves.filter(m => m.from[0]===r && m.from[1]===c);
  }

  // ── Material count ──
  material(color) {
    const vals = {P:1, N:3, B:3, R:5, Q:9, K:0};
    let sum = 0;
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      const p = this.board[r][c];
      if (p && this.col(p)===color) sum += vals[this.type(p)]||0;
    }
    return sum;
  }
}

/* ══════════════════════════════════════════════════════════════
   TIMER
══════════════════════════════════════════════════════════════ */
class Timer {
  constructor(seconds, onTick, onExpire) {
    this.time    = seconds;
    this.onTick  = onTick;
    this.onExpire= onExpire;
    this._id     = null;
    this.running = false;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this._id = setInterval(()=>{
      this.time--;
      this.onTick(this.time);
      if (this.time <= 0) { this.stop(); this.onExpire(); }
    }, 1000);
  }
  stop() {
    if (this._id) clearInterval(this._id);
    this._id = null;
    this.running = false;
  }
  reset(seconds) { this.stop(); this.time = seconds; }
}

/* ══════════════════════════════════════════════════════════════
   GAME CONTROLLER
══════════════════════════════════════════════════════════════ */
class GameController {
  constructor() {
    this.engine     = new ChessEngine();
    this.selected   = null;   // [row, col]
    this.legalDots  = [];
    this.gameActive = false;
    this.pendingPromo = null;
    this.timeControl  = 600;
    this.players    = { w: 'Player 1', b: 'Player 2' };
    this.timers     = { w: null, b: null };
    this.lastFrom   = null;
    this.lastTo     = null;

    this._bindSetup();
  }

  // ── DOM helpers ──
  $  = id => document.getElementById(id);
  $$ = sel => document.querySelectorAll(sel);

  fmt(sec) {
    const m = Math.floor(sec/60), s = sec%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // ── Setup Modal ──
  _bindSetup() {
    this.$$('.time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.$$('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.timeControl = parseInt(btn.dataset.time);
      });
    });

    this.$('start-game-btn').addEventListener('click', () => this._startGame());
    this.$('new-game-btn')  .addEventListener('click', () => this._showSetup());
    this.$('rematch-btn')   .addEventListener('click', () => this._rematch());
    this.$('new-match-btn') .addEventListener('click', () => this._showSetup());
    this.$('resign-btn')    .addEventListener('click', () => this._resign());
    this.$('draw-btn')      .addEventListener('click', () => this._offerDraw());

    // Allow Enter to start
    ['player1-name','player2-name'].forEach(id =>
      this.$(id).addEventListener('keydown', e => { if(e.key==='Enter') this._startGame(); })
    );
  }

  _showSetup() {
    this._stopTimers();
    this.$('setup-modal').classList.remove('hidden');
    this.$('gameover-modal').classList.add('hidden');
  }

  _startGame() {
    const n1 = (this.$('player1-name').value.trim() || 'Player 1').slice(0,18);
    const n2 = (this.$('player2-name').value.trim() || 'Player 2').slice(0,18);
    this.players = { w: n1, b: n2 };
    this.$('setup-modal').classList.add('hidden');
    this._init();
  }

  _rematch() {
    this.$('gameover-modal').classList.add('hidden');
    this._init();
  }

  _init() {
    this.engine.reset();
    this.selected = null;
    this.legalDots = [];
    this.gameActive = true;
    this.lastFrom = null;
    this.lastTo   = null;

    this._stopTimers();
    this.timers.w = new Timer(this.timeControl,
      s => { this._updateClock('w', s); },
      () => this._timeOut('w'));
    this.timers.b = new Timer(this.timeControl,
      s => { this._updateClock('b', s); },
      () => this._timeOut('b'));

    this._updateClock('w', this.timeControl);
    this._updateClock('b', this.timeControl);

    this._renderBoard();
    this._updateNames();
    this._updateStatus();
    this._updateCaptures();
    this._renderHistory();

    // White goes first
    this.timers.w.start();
    this._updateActiveCard('w');
  }

  _stopTimers() {
    if (this.timers.w) this.timers.w.stop();
    if (this.timers.b) this.timers.b.stop();
  }

  // ── Clock UI ──
  _updateClock(color, secs) {
    const el = this.$(`${color==='w'?'white':'black'}-clock`);
    const pip = this.$(`${color==='w'?'white':'black'}-pip`);
    el.textContent = this.fmt(secs);
    el.className = 'clock';
    if (this.engine.turn === color && this.gameActive) {
      el.classList.add('active');
      pip.classList.add('active');
    } else {
      pip.classList.remove('active');
    }
    if (secs <= 30 && this.engine.turn === color) el.classList.add('low');
  }

  _timeOut(color) {
    this.gameActive = false;
    const winner = this.engine.opp(color);
    this._showGameOver('⏰', 'Time Out!',
      `${this.players[winner]} wins on time.`, winner);
  }

  _updateActiveCard(color) {
    this.$('white-card').classList.toggle('active-card', color==='w');
    this.$('black-card').classList.toggle('active-card', color==='b');
    this._updateClock('w', this.timers.w ? this.timers.w.time : this.timeControl);
    this._updateClock('b', this.timers.b ? this.timers.b.time : this.timeControl);
  }

  // ── Names ──
  _updateNames() {
    this.$('white-name').textContent = this.players.w;
    this.$('black-name').textContent = this.players.b;
  }

  // ── Board Rendering ──
  _renderBoard() {
    const board = this.$('chess-board');
    const rankAxis = this.$('rank-axis');
    const fileAxis = this.$('file-axis');
    board.innerHTML = '';
    rankAxis.innerHTML = '';
    fileAxis.innerHTML = '';

    // Axes
    ['8','7','6','5','4','3','2','1'].forEach(r => {
      const s = document.createElement('span');
      s.textContent = r; rankAxis.appendChild(s);
    });
    ['a','b','c','d','e','f','g','h'].forEach(f => {
      const s = document.createElement('span');
      s.textContent = f; fileAxis.appendChild(f==='a'?s:s);
    });
    // re-render file axis
    fileAxis.innerHTML = '';
    'abcdefgh'.split('').forEach(f => {
      const s = document.createElement('span'); s.textContent = f;
      fileAxis.appendChild(s);
    });

    for (let r=0;r<8;r++) {
      for (let c=0;c<8;c++) {
        const sq = document.createElement('div');
        sq.className = `square ${(r+c)%2===0?'light':'dark'}`;
        sq.dataset.r = r; sq.dataset.c = c;
        sq.addEventListener('click', () => this._onSquareClick(r,c));

        const piece = this.engine.board[r][c];
        if (piece) {
          const pd = document.createElement('div');
          pd.className = 'piece';
          pd.innerHTML = SVG[piece];
          sq.appendChild(pd);
        }
        board.appendChild(sq);
      }
    }
    this._applyHighlights();
  }

  _getSquareEl(r,c) {
    return this.$('chess-board').children[r*8+c];
  }

  _clearHighlights() {
    this.$$('.square').forEach(sq => {
      sq.classList.remove('selected','last-from','last-to','in-check','capture-dot');
      sq.querySelector('.move-dot')?.remove();
    });
  }

  _applyHighlights() {
    this._clearHighlights();

    // Last move
    if (this.lastFrom) this._getSquareEl(...this.lastFrom).classList.add('last-from');
    if (this.lastTo)   this._getSquareEl(...this.lastTo).classList.add('last-to');

    // Check
    if (this.engine.status === 'check' || this.engine.status === 'checkmate') {
      const kp = this.engine.kingPos(this.engine.turn, this.engine.board);
      if (kp) this._getSquareEl(...kp).classList.add('in-check');
    }

    // Selected + dots
    if (this.selected) {
      this._getSquareEl(...this.selected).classList.add('selected');
      for (const m of this.legalDots) {
        const [tr,tc] = m.to;
        const sq = this._getSquareEl(tr,tc);
        const isCapture = !!this.engine.board[tr][tc] || m.special==='ep';
        if (isCapture) sq.classList.add('capture-dot');
        const dot = document.createElement('div');
        dot.className = 'move-dot';
        sq.appendChild(dot);
      }
    }
  }

  // ── Handle clicks ──
  _onSquareClick(r, c) {
    if (!this.gameActive) return;
    if (this.pendingPromo) return;

    const e = this.engine;
    const piece = e.board[r][c];
    const turn  = e.turn;

    // Clicking own piece → select
    if (piece && e.col(piece) === turn) {
      this.selected = [r,c];
      this.legalDots = e.movesFrom(r,c);
      this._applyHighlights();
      return;
    }

    // No selection → nothing
    if (!this.selected) return;

    // Try to make a move
    const [fr,fc] = this.selected;
    const move = this.legalDots.find(m =>
      m.to[0]===r && m.to[1]===c && !m.promoteTo
    );

    if (!move) {
      // Clicked empty square that's not a legal move
      if (!piece) { this.selected=null; this.legalDots=[]; this._applyHighlights(); }
      return;
    }

    if (move.special === 'promo' && !move.promoteTo) {
      // Show promo modal
      this._showPromotion(move, fr, fc, r, c);
      return;
    }

    this._executeMove(move);
  }

  _executeMove(move) {
    const e = this.engine;
    const prevTurn = e.turn;

    this.lastFrom = [...move.from];
    this.lastTo   = [...move.to];

    const san = e.make(move);
    this.selected = null;
    this.legalDots = [];

    // Switch timers
    this.timers[prevTurn].stop();
    if (!e.status?.includes('mate') && e.status !== 'stalemate' && !e.status?.startsWith('draw')) {
      this.timers[e.turn].start();
    }

    this._renderBoard();
    this._updateCaptures();
    this._appendHistory(san, prevTurn);
    this._updateStatus();
    this._updateActiveCard(e.turn);

    // Game over?
    if (e.status === 'checkmate') {
      this._stopTimers();
      this.gameActive = false;
      const wName = this.players[e.winner];
      setTimeout(()=>this._showGameOver('♛', 'Checkmate!',
        `${wName} wins by checkmate!`, e.winner), 600);
    } else if (e.status === 'stalemate') {
      this._stopTimers();
      this.gameActive = false;
      setTimeout(()=>this._showGameOver('🤝','Stalemate!',
        'The game is a draw.', null), 600);
    } else if (e.status?.startsWith('draw')) {
      this._stopTimers();
      this.gameActive = false;
      setTimeout(()=>this._showGameOver('🤝','Draw!',
        e.status==='draw50' ? '50-move rule.' : 'Insufficient material.', null), 600);
    }
  }

  // ── Promotion Modal ──
  _showPromotion(baseMove, fr, fc, tr, tc) {
    const color = this.engine.col(this.engine.board[fr][fc]);
    const modal = this.$('promotion-modal');
    const piecesEl = this.$('promotion-pieces');
    piecesEl.innerHTML = '';
    this.pendingPromo = { baseMove };

    ['Q','R','B','N'].forEach(pt => {
      const btn = document.createElement('button');
      btn.className = 'promo-piece-btn';
      btn.innerHTML = SVG[color+pt];
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
        this.pendingPromo = null;
        const pm = { ...baseMove, promoteTo: pt };
        this._executeMove(pm);
      });
      piecesEl.appendChild(btn);
    });

    modal.classList.remove('hidden');
  }

  // ── Status Bar ──
  _updateStatus() {
    const e = this.engine;
    const statusEl = this.$('game-status');
    const indicator = this.$('status-indicator');
    indicator.className = 'status-indicator';

    let msg = '';
    if (e.status === 'check') {
      const name = this.players[e.turn];
      msg = `${name} is in Check!`;
      statusEl.className = 'game-status check';
      indicator.classList.add('check');
    } else if (e.status === 'checkmate') {
      msg = `Checkmate — ${this.players[e.winner]} wins`;
      statusEl.className = 'game-status checkmate';
      indicator.classList.add('mate');
    } else if (e.status === 'stalemate') {
      msg = 'Stalemate — Draw';
      statusEl.className = 'game-status';
    } else if (e.status?.startsWith('draw')) {
      msg = 'Draw';
      statusEl.className = 'game-status';
    } else {
      const name = this.players[e.turn];
      const color = e.turn === 'w' ? 'White' : 'Black';
      msg = `${name} (${color}) to move`;
      statusEl.className = 'game-status';
    }
    statusEl.textContent = msg;

    // Last move label
    const lastSan = e.history.length ? e.history[e.history.length-1].san : '';
    this.$('last-move-label').textContent = lastSan ? `Last move: ${lastSan}` : '';
  }

  // ── Captured Pieces ──
  _updateCaptures() {
    const e = this.engine;
    const VALS = {P:1, N:3, B:3, R:5, Q:9};

    // Pieces captured BY white (black pieces removed)
    const wCap = this.$('black-captures');
    wCap.innerHTML = '';
    e.captured.w.forEach(p => {
      const d = document.createElement('div');
      d.innerHTML = SVG[p];
      wCap.appendChild(d);
    });

    // Pieces captured BY black (white pieces removed)
    const bCap = this.$('white-captures');
    bCap.innerHTML = '';
    e.captured.b.forEach(p => {
      const d = document.createElement('div');
      d.innerHTML = SVG[p];
      bCap.appendChild(d);
    });

    // Material advantage
    const wMat = e.material('w'), bMat = e.material('b');
    const diff = wMat - bMat;
    this.$('white-score').textContent = diff > 0 ? `+${diff}` : '';
    this.$('black-score').textContent = diff < 0 ? `+${Math.abs(diff)}` : '';
  }

  // ── Move History ──
  _renderHistory() {
    this.$('history-list').innerHTML = '';
  }

  _appendHistory(san, colorWhoMoved) {
    const e = this.engine;
    const list = this.$('history-list');

    // Remove last-move highlight
    list.querySelectorAll('.move-san').forEach(el => el.classList.remove('last-move'));

    if (colorWhoMoved === 'w') {
      // New row
      const row = document.createElement('div');
      row.className = 'move-row';
      row.dataset.moveIdx = e.history.length - 1;

      const numSpan = document.createElement('span');
      numSpan.className = 'move-num';
      numSpan.textContent = e.moveNum - 1 + '.';

      const wSpan = document.createElement('span');
      wSpan.className = 'move-san last-move';
      wSpan.textContent = san;

      const bSpan = document.createElement('span');
      bSpan.className = 'move-san';
      bSpan.textContent = '';

      row.appendChild(numSpan);
      row.appendChild(wSpan);
      row.appendChild(bSpan);
      list.appendChild(row);
    } else {
      // Fill in black's move in last row
      const rows = list.querySelectorAll('.move-row');
      if (rows.length > 0) {
        const lastRow = rows[rows.length-1];
        const spans = lastRow.querySelectorAll('.move-san');
        if (spans[1]) {
          spans[1].textContent = san;
          spans[1].classList.add('last-move');
        }
      }
    }

    list.scrollTop = list.scrollHeight;
  }

  // ── Resign / Draw ──
  _resign() {
    if (!this.gameActive) return;
    this.gameActive = false;
    this._stopTimers();
    const loser  = this.engine.turn;
    const winner = this.engine.opp(loser);
    this._showGameOver('⚑', 'Resignation',
      `${this.players[loser]} resigned. ${this.players[winner]} wins!`, winner);
  }

  _offerDraw() {
    if (!this.gameActive) return;
    const opponent = this.engine.opp(this.engine.turn);
    const name = this.players[opponent];
    // Simple auto-accept for local 2-player (both players see screen)
    if (confirm(`Offer draw to ${name}? (Both players must agree.)`)) {
      this.gameActive = false;
      this._stopTimers();
      this._showGameOver('🤝','Draw Agreed!','The game is a draw.', null);
    }
  }

  // ── Game Over Modal ──
  _showGameOver(icon, title, message, winner) {
    this.$('gameover-icon').textContent = icon;
    this.$('gameover-title').textContent = title;
    this.$('gameover-message').textContent = message;

    const e = this.engine;
    const wMat = e.material('w'), bMat = e.material('b');
    const moves = Math.ceil(e.history.length / 2);
    const wTime = this.timers.w ? this.fmt(this.timers.w.time) : '--';
    const bTime = this.timers.b ? this.fmt(this.timers.b.time) : '--';

    this.$('gameover-stats').innerHTML =
      `<div>Moves played: <b>${moves}</b></div>` +
      `<div>${this.players.w} time left: <b>${wTime}</b></div>` +
      `<div>${this.players.b} time left: <b>${bTime}</b></div>`;

    this.$('gameover-modal').classList.remove('hidden');
  }
}

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
// Set CSS board size variable
const BOARD_PX = Math.min(560, Math.floor(Math.min(window.innerWidth * 0.5, window.innerHeight * 0.8)));
document.documentElement.style.setProperty('--board-size', BOARD_PX + 'px');

window.addEventListener('DOMContentLoaded', () => {
  window._game = new GameController();
  // Focus first input
  document.getElementById('player1-name').focus();
});
