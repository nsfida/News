/**
 * Bitcoin Paper Wallet Generator — script.js
 * ===========================================
 * 100% client-side. No external API calls. No data sent or stored.
 * All cryptography uses crypto.getRandomValues() + crypto.subtle.
 *
 * Verified against known Bitcoin test vectors:
 *   Private key: 0c28fca386c7a227600b2fe50b7cae11ec86d3bf1fbe471be89827e19d72aa1d
 *   Address:     1LoVGDgRs9hTfTNJNuXKSpywcbdvwRXpmK  ✓
 *   WIF:         KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617  ✓
 *
 * Pipeline:
 *   1. 32 random bytes → private key
 *   2. secp256k1 scalar multiply → compressed public key (33 bytes)
 *   3. SHA-256(pubkey) → RIPEMD-160 → 20-byte public key hash
 *   4. Version(0x00) + hash + checksum(dSHA256) → Base58Check → Address
 *   5. Version(0x80) + privkey + compression_flag(0x01) + checksum → Base58Check → WIF
 */

'use strict';

/* ============================================================
   SECTION 1 — QR CODE GENERATOR (embedded pure JS, no CDN)
   Based on qrcode-generator (MIT License, Kazuhiko Arase)
   ============================================================ */
const QRCode = (() => {

  const ECLevel = { L: 1, M: 0, Q: 3, H: 2 };

  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++) EXP_TABLE[i] = EXP_TABLE[i-4] ^ EXP_TABLE[i-5] ^ EXP_TABLE[i-6] ^ EXP_TABLE[i-8];
  for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;
  const gexp = n => { while (n < 0) n += 255; while (n >= 256) n -= 255; return EXP_TABLE[n]; };
  const glog = n => { if (n < 1) throw new Error('glog(' + n + ')'); return LOG_TABLE[n]; };

  class Poly {
    constructor(num, shift) {
      let o = 0; while (o < num.length && num[o] === 0) o++;
      this.n = new Array(num.length - o + shift).fill(0);
      for (let i = 0; i < num.length - o; i++) this.n[i] = num[i + o];
    }
    get(i) { return this.n[i]; }
    len() { return this.n.length; }
    mul(e) {
      const n = new Array(this.len() + e.len() - 1).fill(0);
      for (let i = 0; i < this.len(); i++)
        for (let j = 0; j < e.len(); j++)
          n[i+j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
      return new Poly(n, 0);
    }
    mod(e) {
      if (this.len() - e.len() < 0) return this;
      const ratio = glog(this.get(0)) - glog(e.get(0));
      const n = this.n.slice();
      for (let i = 0; i < e.len(); i++) n[i] ^= gexp(glog(e.get(i)) + ratio);
      return new Poly(n, 0).mod(e);
    }
  }

  const G15      = (1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0);
  const G18      = (1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0);
  const G15_MASK = (1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1);
  const bchDigit = d => { let n=0; while(d!==0){n++;d>>>=1;} return n; };
  const bchTypeInfo = data => {
    let d = data << 10;
    while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
    return ((data << 10) | d) ^ G15_MASK;
  };
  const bchTypeNum = data => {
    let d = data << 12;
    while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18));
    return (data << 12) | d;
  };

  const PATTERN_POS = [
    [],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],
    [6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],
    [6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],
    [6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],
    [6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],
    [6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],
    [6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],
    [6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],
    [6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]
  ];

  const MASK_FN = [
    (i,j)=>(i+j)%2===0, i=>i%2===0, (_,j)=>j%3===0, (i,j)=>(i+j)%3===0,
    (i,j)=>(Math.floor(i/2)+Math.floor(j/3))%2===0,
    (i,j)=>(i*j)%2+(i*j)%3===0,
    (i,j)=>((i*j)%2+(i*j)%3)%2===0,
    (i,j)=>((i*j)%3+(i+j)%2)%2===0
  ];

  const RS_BLOCKS = [
    [1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],
    [1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],
    [1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],
    [4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],
    [2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],
    [3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],
    [4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],
    [1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],
    [6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],
    [8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],
    [4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],
    [5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],
    [7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],
    [10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],
    [9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],
    [3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],
    [3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],
    [17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],
    [7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],
    [11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],
    [11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],
    [7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],
    [28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],
    [8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],
    [4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],
    [1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],
    [15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],
    [42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],
    [10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],
    [29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],
    [44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],
    [39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],
    [46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],
    [49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],
    [48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],
    [43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],
    [34,54,24,34,55,25],[20,45,15,61,46,16]
  ];

  function getRSBlocks(typeNum, ecLevel) {
    const t = RS_BLOCKS[(typeNum - 1) * 4 + ecLevel];
    const list = [];
    for (let i = 0; i < t.length; i += 3)
      for (let j = 0; j < t[i]; j++) list.push({ total: t[i+1], data: t[i+2] });
    return list;
  }

  function getECPoly(ecLen) {
    let a = new Poly([1], 0);
    for (let i = 0; i < ecLen; i++) a = a.mul(new Poly([1, gexp(i)], 0));
    return a;
  }

  function getLostPoint(m, mc) {
    let lp = 0;
    for (let r = 0; r < mc; r++) {
      for (let c = 0; c < mc; c++) {
        let s = 0; const dark = m[r][c];
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (r+dr<0||mc<=r+dr||c+dc<0||mc<=c+dc||(!dr&&!dc)) continue;
          if (dark === m[r+dr][c+dc]) s++;
        }
        if (s > 5) lp += 3 + s - 5;
      }
    }
    for (let r = 0; r < mc-1; r++) for (let c = 0; c < mc-1; c++) {
      let cnt = (m[r][c]?1:0)+(m[r+1][c]?1:0)+(m[r][c+1]?1:0)+(m[r+1][c+1]?1:0);
      if (cnt===0||cnt===4) lp+=3;
    }
    for (let r = 0; r < mc; r++) for (let c = 0; c < mc-6; c++)
      if (m[r][c]&&!m[r][c+1]&&m[r][c+2]&&m[r][c+3]&&m[r][c+4]&&!m[r][c+5]&&m[r][c+6]) lp+=40;
    for (let c = 0; c < mc; c++) for (let r = 0; r < mc-6; r++)
      if (m[r][c]&&!m[r+1][c]&&m[r+2][c]&&m[r+3][c]&&m[r+4][c]&&!m[r+5][c]&&m[r+6][c]) lp+=40;
    let dark = 0;
    for (let c = 0; c < mc; c++) for (let r = 0; r < mc; r++) if (m[r][c]) dark++;
    lp += Math.abs(Math.floor(100*dark/mc/mc) - 50) / 5 * 10;
    return lp;
  }

  class BitBuf {
    constructor() { this.buf = []; this.len = 0; }
    put(num, len) { for (let i = 0; i < len; i++) this.putBit(((num >>> (len-i-1)) & 1) === 1); }
    putBit(bit) {
      const idx = Math.floor(this.len / 8);
      if (this.buf.length <= idx) this.buf.push(0);
      if (bit) this.buf[idx] |= 0x80 >>> (this.len % 8);
      this.len++;
    }
  }

  function buildCodewords(text, typeNum, ecLevel) {
    const rsb = getRSBlocks(typeNum, ecLevel);
    const buf = new BitBuf();
    buf.put(4, 4);
    buf.put(text.length, typeNum < 10 ? 8 : 16);
    for (let i = 0; i < text.length; i++) buf.put(text.charCodeAt(i), 8);
    const totalData = rsb.reduce((s,b)=>s+b.data, 0);
    if (buf.len + 4 <= totalData * 8) buf.put(0, 4);
    while (buf.len % 8 !== 0) buf.putBit(false);
    for (let p = 0; buf.len < totalData * 8; p++) buf.put(p%2===0?0xEC:0x11, 8);

    let offset = 0;
    const dcdata = rsb.map(b => { const d=buf.buf.slice(offset,offset+b.data); offset+=b.data; return d; });
    const ecdata = rsb.map((b,i) => {
      const ec = b.total - b.data;
      const rsp = getECPoly(ec);
      const raw = new Poly(dcdata[i], rsp.len()-1);
      const mod = raw.mod(rsp);
      return Array.from({length:ec},(_,j)=>{ const mi=j+mod.len()-ec; return mi>=0?mod.get(mi):0; });
    });

    const total = rsb.reduce((s,b)=>s+b.total,0);
    const data = new Array(total); let idx=0;
    const mdc=Math.max(...rsb.map(b=>b.data)), mec=Math.max(...rsb.map(b=>b.total-b.data));
    for (let i=0;i<mdc;i++) rsb.forEach((_,r)=>{ if(i<dcdata[r].length) data[idx++]=dcdata[r][i]; });
    for (let i=0;i<mec;i++) rsb.forEach((_,r)=>{ if(i<ecdata[r].length) data[idx++]=ecdata[r][i]; });
    return data;
  }

  function buildMatrix(typeNum, ecLevel) {
    const mc = typeNum * 4 + 17;
    const m = Array.from({length:mc}, ()=>new Array(mc).fill(null));
    function probe(row,col) {
      for (let r=-1;r<=7;r++) for (let c=-1;c<=7;c++) {
        if (row+r<0||mc<=row+r||col+c<0||mc<=col+c) continue;
        m[row+r][col+c]=(0<=r&&r<=6&&(c===0||c===6))||(0<=c&&c<=6&&(r===0||r===6))||(2<=r&&r<=4&&2<=c&&c<=4);
      }
    }
    probe(0,0); probe(mc-7,0); probe(0,mc-7);
    PATTERN_POS[typeNum-1].forEach((pi,i,pos)=>pos.forEach((pj,j)=>{
      if (m[pi][pj]!=null) return;
      for (let dr=-2;dr<=2;dr++) for (let dc=-2;dc<=2;dc++)
        m[pi+dr][pj+dc]=dr===-2||dr===2||dc===-2||dc===2||(dr===0&&dc===0);
    }));
    for (let r=8;r<mc-8;r++) if(m[r][6]==null) m[r][6]=r%2===0;
    for (let c=8;c<mc-8;c++) if(m[6][c]==null) m[6][c]=c%2===0;
    if (typeNum>=7) {
      const bits=bchTypeNum(typeNum);
      for (let i=0;i<18;i++) {
        const mod=((bits>>i)&1)===1;
        m[Math.floor(i/3)][i%3+mc-8-3]=mod; m[i%3+mc-8-3][Math.floor(i/3)]=mod;
      }
    }
    return m;
  }

  function applyTypeInfo(m, mc, ecLevel, maskPattern) {
    const bits = bchTypeInfo((ecLevel<<3)|maskPattern);
    for (let i=0;i<15;i++) {
      const mod=((bits>>i)&1)===1;
      if (i<6) m[i][8]=mod; else if (i<8) m[i+1][8]=mod; else m[mc-15+i][8]=mod;
      if (i<8) m[8][mc-i-1]=mod; else if (i<9) m[8][15-i-1+1]=mod; else m[8][15-i-1]=mod;
    }
    m[mc-8][8]=true;
  }

  function placeData(m, mc, data, maskPattern) {
    const fn=MASK_FN[maskPattern];
    let inc=-1,row=mc-1,bitIdx=7,byteIdx=0;
    for (let col=mc-1;col>0;col-=2) {
      if (col===6) col--;
      for (;;) {
        for (let c=0;c<2;c++) {
          if (m[row][col-c]==null) {
            let dark=byteIdx<data.length?((data[byteIdx]>>>bitIdx)&1)===1:false;
            if (fn(row,col-c)) dark=!dark;
            m[row][col-c]=dark;
            if (--bitIdx<0){byteIdx++;bitIdx=7;}
          }
        }
        row+=inc;
        if (row<0||mc<=row){row-=inc;inc=-inc;break;}
      }
    }
  }

  function make(text, container, size) {
    size = size || 128;
    const ecLevel = ECLevel.M;
    let typeNum = 0;
    for (let t=1;t<=40;t++) {
      const rsb=getRSBlocks(t,ecLevel);
      const td=rsb.reduce((s,b)=>s+b.data,0);
      if ((4+(t<10?8:16)+text.length*8) <= td*8){typeNum=t;break;}
    }
    if (!typeNum) throw new Error('QR: data too long');

    const codewords = buildCodewords(text, typeNum, ecLevel);
    const mc = typeNum*4+17;

    // Select best mask
    let bestMask=0, bestLost=Infinity;
    for (let mp=0;mp<8;mp++) {
      const m=buildMatrix(typeNum,ecLevel);
      applyTypeInfo(m,mc,ecLevel,mp);
      placeData(m,mc,codewords,mp);
      const lp=getLostPoint(m,mc);
      if (lp<bestLost){bestLost=lp;bestMask=mp;}
    }

    // Build final matrix
    const m = buildMatrix(typeNum, ecLevel);
    applyTypeInfo(m, mc, ecLevel, bestMask);
    placeData(m, mc, codewords, bestMask);

    // Render to canvas
    const canvas = document.createElement('canvas');
    const cell = Math.max(2, Math.floor(size/mc));
    const margin = Math.floor((size - cell*mc)/2);
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,size,size);
    ctx.fillStyle='#000000';
    for (let r=0;r<mc;r++) for (let c=0;c<mc;c++)
      if (m[r][c]) ctx.fillRect(margin+c*cell, margin+r*cell, cell, cell);

    container.innerHTML='';
    container.appendChild(canvas);
    return canvas;
  }

  return { make };
})();


/* ============================================================
   SECTION 2 — BITCOIN CRYPTOGRAPHY (verified pure JS)
   ============================================================ */

/** SHA-256 via WebCrypto (available in all modern browsers) */
async function sha256(data) {
  const ab = data instanceof Uint8Array ? data.buffer : data;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', ab));
}

/** Double SHA-256 */
async function hash256(data) {
  return sha256(await sha256(data));
}

/**
 * RIPEMD-160 — pure JS with CORRECT Merkle-Damgard padding.
 *
 * ROOT CAUSE OF THE ORIGINAL BUG:
 *   The previous version allocated (messageLength + 64) bytes unconditionally.
 *   For a 32-byte input (SHA-256 output) this created 96 bytes, which pads
 *   to 128 bytes = 2 blocks, corrupting the hash.
 *
 *   The correct approach: padding length = Math.ceil((ml + 1 + 8) / 64) * 64
 *   For 32-byte input: ceil(41/64)*64 = 64 bytes = exactly 1 block. ✓
 *
 * Verified: matches Node.js crypto.createHash('ripemd160') for all test inputs.
 */
function ripemd160(message) {
  const ml = message.length;
  const bitLen = ml * 8;

  // *** THE FIX: correct padding length calculation ***
  const paddedLen = Math.ceil((ml + 1 + 8) / 64) * 64;

  const msg = new Uint8Array(paddedLen);
  msg.set(message);
  msg[ml] = 0x80; // append '1' bit

  // Append 64-bit little-endian bit length at the very end
  const dv = new DataView(msg.buffer);
  dv.setUint32(paddedLen - 8, bitLen >>> 0, true);
  dv.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000), true);

  const W = new Uint32Array(msg.buffer); // 32-bit little-endian words

  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;

  // Message schedule indices
  const RL = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13];
  const RR = [5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11];
  // Rotation amounts
  const SL = [11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6];
  const SR = [8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11];
  // Round constants
  const KL = [0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
  const KR = [0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];

  function f(j, x, y, z) {
    if (j < 16) return (x ^ y ^ z);
    if (j < 32) return (x & y) | (~x & z);
    if (j < 48) return (x | ~y) ^ z;
    if (j < 64) return (x & z) | (y & ~z);
    return x ^ (y | ~z);
  }
  const rol = (x, n) => (x << n) | (x >>> (32 - n));
  const u32 = x => x >>> 0;

  const blocks = W.length / 16;
  for (let i = 0; i < blocks; i++) {
    const X = W.subarray(i * 16, i * 16 + 16);
    let al=h0, bl=h1, cl=h2, dl=h3, el=h4;
    let ar=h0, br=h1, cr=h2, dr=h3, er=h4;

    for (let j = 0; j < 80; j++) {
      const r = Math.floor(j / 16);
      let TL = u32(al + f(j,    bl,cl,dl) + X[RL[j]] + KL[r]);
      TL = u32(rol(TL, SL[j]) + el);
      al=el; el=dl; dl=rol(cl,10); cl=bl; bl=TL;

      let TR = u32(ar + f(79-j, br,cr,dr) + X[RR[j]] + KR[r]);
      TR = u32(rol(TR, SR[j]) + er);
      ar=er; er=dr; dr=rol(cr,10); cr=br; br=TR;
    }
    const T = u32(h1 + cl + dr);
    h1 = u32(h2 + dl + er);
    h2 = u32(h3 + el + ar);
    h3 = u32(h4 + al + br);
    h4 = u32(h0 + bl + cr);
    h0 = T;
  }

  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer);
  [h0,h1,h2,h3,h4].forEach((h,i) => ov.setUint32(i*4, h, true));
  return out;
}

/**
 * secp256k1 — minimal implementation for public key derivation only.
 * Uses JavaScript BigInt for arbitrary-precision arithmetic.
 */
const secp256k1 = (() => {
  const P  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
  const N  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
  const Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;

  const modp = a => ((a % P) + P) % P;

  // Modular inverse mod P via extended Euclidean algorithm
  function modInv(a) {
    let [lm, hm, lo, hi] = [1n, 0n, ((a % P) + P) % P, P];
    while (lo > 1n) {
      const q = hi / lo;
      [lm, hm, lo, hi] = [hm - lm*q, lm, hi - lo*q, lo];
    }
    return ((lm % P) + P) % P;
  }

  function pointAdd(A, B) {
    if (!A) return B;
    if (!B) return A;
    const [x1,y1]=A, [x2,y2]=B;
    if (x1===x2) {
      if (y1!==y2) return null;
      const lam = modp(3n*x1*x1 * modInv(2n*y1));
      const x3  = modp(lam*lam - 2n*x1);
      return [x3, modp(lam*(x1-x3) - y1)];
    }
    const lam = modp((y2-y1) * modInv(x2-x1));
    const x3  = modp(lam*lam - x1 - x2);
    return [x3, modp(lam*(x1-x3) - y1)];
  }

  function scalarMul(k, point) {
    let result=null, addend=point;
    while (k>0n) {
      if (k&1n) result=pointAdd(result,addend);
      addend=pointAdd(addend,addend);
      k>>=1n;
    }
    return result;
  }

  function bigIntTo32Bytes(n) {
    const hex = n.toString(16).padStart(64,'0');
    const out = new Uint8Array(32);
    for (let i=0;i<32;i++) out[i]=parseInt(hex.slice(i*2,i*2+2),16);
    return out;
  }

  /**
   * Returns 33-byte compressed public key:
   *   0x02 if y is even, 0x03 if y is odd, followed by x (32 bytes)
   */
  function getCompressedPublicKey(privKeyBytes) {
    const k = BigInt('0x' + Array.from(privKeyBytes).map(b=>b.toString(16).padStart(2,'0')).join(''));
    if (k <= 0n || k >= N) throw new Error('Private key out of valid range');
    const [x,y] = scalarMul(k, [Gx,Gy]);
    const prefix = (y & 1n) === 0n ? 0x02 : 0x03;
    return new Uint8Array([prefix, ...bigIntTo32Bytes(x)]);
  }

  return { getCompressedPublicKey };
})();

/** Base58 encoding */
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(bytes) {
  let leadZeros = 0;
  for (const b of bytes) { if (b!==0) break; leadZeros++; }
  let n = 0n;
  for (const b of bytes) n = n*256n + BigInt(b);
  let result = '';
  while (n > 0n) { result = BASE58[Number(n%58n)] + result; n = n/58n; }
  return '1'.repeat(leadZeros) + result;
}

/**
 * Derive P2PKH mainnet Bitcoin address from private key.
 * Uses compressed public key → compressed address (starts with '1').
 */
async function privateKeyToAddress(privKeyBytes) {
  // 1. Compressed secp256k1 public key (33 bytes)
  const pubKey = secp256k1.getCompressedPublicKey(privKeyBytes);

  // 2. SHA-256 of public key
  const pubKeySHA256 = await sha256(pubKey);

  // 3. RIPEMD-160 of that SHA-256 → 20-byte "hash160"
  const hash160 = ripemd160(pubKeySHA256);

  // 4. Prepend mainnet version byte 0x00
  const versioned = new Uint8Array(21);
  versioned[0] = 0x00;
  versioned.set(hash160, 1);

  // 5. Checksum = first 4 bytes of SHA-256(SHA-256(versioned))
  const checksum = (await hash256(versioned)).slice(0, 4);

  // 6. Concatenate and Base58Check encode
  const payload = new Uint8Array(25);
  payload.set(versioned, 0);
  payload.set(checksum, 21);
  return base58Encode(payload);
}

/**
 * Encode private key as Wallet Import Format (WIF), compressed variant.
 *
 * Format: 0x80 + privkey(32 bytes) + 0x01 (compression flag) + checksum(4 bytes)
 * The 0x01 compression flag tells wallets to use the compressed public key,
 * which MUST match the address derived above. Without it the address won't match.
 *
 * Compressed WIF starts with 'K' or 'L' on mainnet.
 */
async function privateKeyToWIF(privKeyBytes) {
  const extended = new Uint8Array(34);
  extended[0] = 0x80;             // mainnet version
  extended.set(privKeyBytes, 1);  // 32-byte private key
  extended[33] = 0x01;            // *** compression flag — CRITICAL ***

  const checksum = (await hash256(extended)).slice(0, 4);

  const payload = new Uint8Array(38);
  payload.set(extended, 0);
  payload.set(checksum, 34);
  return base58Encode(payload);
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/** Generate a complete Bitcoin wallet */
async function generateWallet() {
  const privKey = new Uint8Array(32);
  // Keep re-rolling until valid (probability of failure ≈ 1 in 2^128)
  do { crypto.getRandomValues(privKey); }
  while (privKey.every(b=>b===0));

  const hex     = bytesToHex(privKey);
  const address = await privateKeyToAddress(privKey);
  const wif     = await privateKeyToWIF(privKey);
  return { hex, address, wif };
}


/* ============================================================
   SECTION 3 — UI & APPLICATION LOGIC
   ============================================================ */

let currentWallet  = null;
let privateVisible = false;

const elAddress  = document.getElementById('walletAddress');
const elWIF      = document.getElementById('walletWIF');
const elHEX      = document.getElementById('walletHEX');
const elQRAddr   = document.getElementById('qrAddress');
const elQRWif    = document.getElementById('qrWif');
const elDate     = document.getElementById('walletDate');
const elToggle   = document.getElementById('visibilityToggle');
const elGenerate = document.getElementById('generateBtn');
const elDownload = document.getElementById('downloadBtn');
const elPrint    = document.getElementById('printBtn');
const elTheme    = document.getElementById('themeToggle');
const elToast    = document.getElementById('toast');

// ── Theme toggle ──
if (localStorage.getItem('btc-wallet-theme') === 'light') document.body.classList.add('light-mode');
elTheme.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  localStorage.setItem('btc-wallet-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});

// ── Toast ──
let _toastTimer;
function showToast(msg, type='success') {
  elToast.textContent = msg;
  elToast.className = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{ elToast.className='toast'; }, 2500);
}

// ── Visibility toggle ──
const WIF_MASK_HTML = `
  <div class="mask-overlay">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
    <span>Hidden</span>
  </div>`;

function setPrivateVisible(visible) {
  privateVisible = visible;
  const eyeOpen   = elToggle.querySelector('.eye-open');
  const eyeClosed = elToggle.querySelector('.eye-closed');
  const wifEl     = document.getElementById('walletWIF');
  const wifQREl   = document.getElementById('qrWif');
  const copyBtn   = document.querySelector('.private-copy');

  if (visible) {
    eyeOpen.style.display='none'; eyeClosed.style.display='block';
    wifEl.classList.remove('masked'); wifQREl.classList.remove('masked');
    if (copyBtn) copyBtn.classList.remove('masked');
  } else {
    eyeOpen.style.display='block'; eyeClosed.style.display='none';
    wifEl.classList.add('masked'); wifQREl.classList.add('masked');
    if (copyBtn) copyBtn.classList.add('masked');
  }
}
elToggle.addEventListener('click', ()=>setPrivateVisible(!privateVisible));

// ── Copy buttons ──
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!currentWallet) return;
    const t = btn.dataset.copy;
    const text = t==='address' ? currentWallet.address : t==='wif' ? currentWallet.wif : currentWallet.hex;
    try {
      await navigator.clipboard.writeText(text);
      const orig = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(()=>{ btn.classList.remove('copied'); btn.innerHTML=orig; }, 2000);
      showToast('Copied!', 'success');
    } catch { showToast('Copy failed — select manually.', 'error'); }
  });
});

// ── Generate ──
async function generate() {
  elGenerate.disabled = true;
  elGenerate.innerHTML = `<span class="spinner"></span> Generating…`;

  const wrapper = document.getElementById('walletWrapper');
  wrapper.style.animation = 'none';
  wrapper.offsetHeight;
  wrapper.style.animation = 'card-enter 0.55s cubic-bezier(0.34,1.56,0.64,1) both';

  setPrivateVisible(false);
  elAddress.textContent = '…';
  elHEX.textContent = '…';
  elWIF.querySelector('.real-text').textContent = '…';
  elQRAddr.innerHTML = '';
  elQRWif.innerHTML = WIF_MASK_HTML;

  try {
    currentWallet = await generateWallet();

    elAddress.textContent = currentWallet.address;
    elHEX.textContent = currentWallet.hex;
    elWIF.querySelector('.real-text').textContent = currentWallet.wif;
    elDate.textContent = 'Generated: ' + new Date().toLocaleString();

    // Address QR
    QRCode.make(currentWallet.address, elQRAddr, 128);

    // WIF QR — render but keep behind mask overlay
    const tmpDiv = document.createElement('div');
    QRCode.make(currentWallet.wif, tmpDiv, 128);
    const wifCanvas = tmpDiv.querySelector('canvas');
    elQRWif.innerHTML = WIF_MASK_HTML;
    if (wifCanvas) elQRWif.appendChild(wifCanvas);

  } catch (err) {
    console.error('Wallet generation error:', err);
    showToast('Generation failed — please try again.', 'error');
  } finally {
    elGenerate.disabled = false;
    elGenerate.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
      </svg> Generate New Wallet`;
  }
}

elGenerate.addEventListener('click', generate);
elPrint.addEventListener('click', ()=>window.print());

// ── Download PNG ──
elDownload.addEventListener('click', async () => {
  if (!currentWallet) { showToast('Generate a wallet first.', 'error'); return; }
  elDownload.disabled = true;
  elDownload.innerHTML = `<span class="spinner"></span> Preparing…`;

  try {
    const isLight = document.body.classList.contains('light-mode');
    const scale = 2.5;
    const CW=860, CH=460, W=CW*scale, H=CH*scale;

    const canvas=document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext('2d');

    // Background
    ctx.fillStyle = isLight?'#ffffff':'#141820';
    ctx.beginPath(); ctx.roundRect(0,0,W,H,18*scale); ctx.fill();

    // Gold stripe
    const grd=ctx.createLinearGradient(0,0,W,0);
    grd.addColorStop(0,'#F7931A'); grd.addColorStop(0.5,'#ffb347'); grd.addColorStop(1,'#F7931A');
    ctx.fillStyle=grd; ctx.fillRect(0,0,W,3*scale);

    // Header bg
    ctx.fillStyle=isLight?'#f8f9fc':'#1a1f2e'; ctx.fillRect(0,3*scale,W,78*scale);

    // BTC circle
    ctx.beginPath(); ctx.arc(38*scale,42*scale,20*scale,0,Math.PI*2);
    ctx.fillStyle='#F7931A'; ctx.fill();

    // Header text
    ctx.fillStyle=isLight?'#111827':'#eef0f5';
    ctx.font=`800 ${17*scale}px Syne,sans-serif`; ctx.fillText('Bitcoin',68*scale,35*scale);
    ctx.font=`${10*scale}px Syne,sans-serif`;
    ctx.fillStyle=isLight?'#6b7280':'#8b95aa'; ctx.fillText('Paper Wallet',68*scale,50*scale);

    // Badge
    ctx.fillStyle='rgba(247,147,26,0.12)';
    const bW=148*scale,bH=22*scale,bX=W-bW-20*scale,bY=31*scale;
    ctx.beginPath(); ctx.roundRect(bX,bY,bW,bH,4*scale); ctx.fill();
    ctx.strokeStyle='rgba(247,147,26,0.4)'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#F7931A';
    ctx.font=`700 ${8*scale}px "Space Mono",monospace`;
    ctx.fillText('SECURE COLD STORAGE',bX+12*scale,bY+15*scale);

    // Header separator
    ctx.fillStyle='rgba(247,147,26,0.15)'; ctx.fillRect(0,81*scale,W,1);

    // Body
    const bodyTop=100*scale, pad=28*scale, halfW=W/2;
    const textCol=isLight?'#1f2937':'#c8d4e8';

    // PUBLIC label
    ctx.fillStyle='#00c853'; ctx.font=`700 ${9*scale}px Syne,sans-serif`;
    ctx.fillText('PUBLIC ADDRESS',pad,bodyTop);

    // Address QR
    const addrCvs=elQRAddr.querySelector('canvas');
    const qrSz=128*scale;
    ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.roundRect(pad,bodyTop+10*scale,qrSz,qrSz,6*scale); ctx.fill();
    if (addrCvs) ctx.drawImage(addrCvs,pad+4*scale,bodyTop+14*scale,qrSz-8*scale,qrSz-8*scale);

    // Address text
    ctx.fillStyle=textCol; ctx.font=`${8*scale}px "Space Mono",monospace`;
    const addr=currentWallet.address, half=Math.ceil(addr.length/2);
    ctx.fillText(addr.slice(0,half), pad, bodyTop+148*scale);
    ctx.fillText(addr.slice(half),   pad, bodyTop+161*scale);

    // Divider
    ctx.fillStyle='rgba(247,147,26,0.15)'; ctx.fillRect(halfW-0.5,bodyTop-8*scale,1,230*scale);

    // PRIVATE label
    ctx.fillStyle='#e05c5c'; ctx.font=`700 ${9*scale}px Syne,sans-serif`;
    ctx.fillText('PRIVATE KEY (WIF)',halfW+pad,bodyTop);

    // WIF QR
    const wifCvs=elQRWif.querySelector('canvas');
    ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.roundRect(halfW+pad,bodyTop+10*scale,qrSz,qrSz,6*scale); ctx.fill();
    if (wifCvs) ctx.drawImage(wifCvs,halfW+pad+4*scale,bodyTop+14*scale,qrSz-8*scale,qrSz-8*scale);

    // WIF text
    ctx.fillStyle=textCol; ctx.font=`${7*scale}px "Space Mono",monospace`;
    const wif=currentWallet.wif, chunk=24;
    for (let i=0,ln=0;i<wif.length;i+=chunk,ln++)
      ctx.fillText(wif.slice(i,i+chunk),halfW+pad,bodyTop+149*scale+ln*13*scale);

    // HEX label
    ctx.fillStyle=isLight?'#9ca3af':'#525c70'; ctx.font=`700 ${8*scale}px Syne,sans-serif`;
    ctx.fillText('HEX PRIVATE KEY',halfW+pad,bodyTop+205*scale);

    // HEX text
    ctx.fillStyle=isLight?'#6b7280':'#525c70'; ctx.font=`${6.5*scale}px "Space Mono",monospace`;
    ctx.fillText(currentWallet.hex.slice(0,32),halfW+pad,bodyTop+218*scale);
    ctx.fillText(currentWallet.hex.slice(32),   halfW+pad,bodyTop+231*scale);

    // Footer
    const fy=H-50*scale;
    ctx.fillStyle=isLight?'#f8f9fc':'#1a1f2e'; ctx.fillRect(0,fy,W,50*scale);
    ctx.fillStyle='rgba(247,147,26,0.15)'; ctx.fillRect(0,fy,W,1);
    ctx.fillStyle='#e89c3a'; ctx.font=`600 ${8.5*scale}px Syne,sans-serif`;
    ctx.fillText('⚠  Never share your private key. Store this wallet offline and securely.',pad,fy+20*scale);
    ctx.fillStyle=isLight?'#9ca3af':'#525c70'; ctx.font=`${7.5*scale}px "Space Mono",monospace`;
    ctx.fillText(elDate.textContent,pad,fy+37*scale);

    const link=document.createElement('a');
    link.download=`bitcoin-wallet-${currentWallet.address.slice(0,10)}.png`;
    link.href=canvas.toDataURL('image/png'); link.click();
    showToast('Wallet saved as PNG!','success');

  } catch(err) {
    console.error('Download error:',err);
    showToast('Download failed — try Print instead.','error');
  } finally {
    elDownload.disabled=false;
    elDownload.innerHTML=`
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg> Download PNG`;
  }
});

// ── Auto-generate on load ──
generate();