const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const TILE = 32;
const COLS = 4;
const ROWS = 2;
const W = TILE * COLS;
const H = TILE * ROWS;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function genStoneTile(rng, baseR, baseG, baseB, brickH, mortarColor, noiseAmp) {
  const px = new Array(TILE * TILE * 3);
  for (let y = 0; y < TILE; y++) {
    const row = Math.floor(y / brickH);
    const rowOffset = (row % 2) * (TILE / 2);
    for (let x = 0; x < TILE; x++) {
      const col = Math.floor((x + rowOffset) / (TILE / 2));
      const isMortarV = ((x + rowOffset) % (TILE / 2)) === 0;
      const isMortarH = (y % brickH) === 0;
      let r, g, b;
      if (isMortarV || isMortarH) {
        r = mortarColor[0]; g = mortarColor[1]; b = mortarColor[2];
      } else {
        const brickSeed = row * 100 + col * 17;
        const brickRng = mulberry32(brickSeed + 1);
        const shade = (brickRng() - 0.5) * 18;
        const noise = (rng() - 0.5) * noiseAmp;
        r = clamp(baseR + shade + noise, 0, 255);
        g = clamp(baseG + shade + noise, 0, 255);
        b = clamp(baseB + shade + noise, 0, 255);
      }
      const idx = (y * TILE + x) * 3;
      px[idx] = r; px[idx + 1] = g; px[idx + 2] = b;
    }
  }
  return px;
}

function genFloorTile(rng, baseR, baseG, baseB, noiseAmp) {
  const px = new Array(TILE * TILE * 3);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const blotch = Math.sin(x * 0.3) * Math.cos(y * 0.25) * 8;
      const noise = (rng() - 0.5) * noiseAmp;
      const v = blotch + noise;
      const idx = (y * TILE + x) * 3;
      px[idx] = clamp(baseR + v, 0, 255);
      px[idx + 1] = clamp(baseG + v, 0, 255);
      px[idx + 2] = clamp(baseB + v, 0, 255);
    }
  }
  return px;
}

const raw = Buffer.alloc(H * (1 + W * 3));
const rng = mulberry32(42);

const floorBases = [[58,52,48],[52,50,55],[62,55,48],[50,54,52]];
for (let c = 0; c < COLS; c++) {
  const tile = genFloorTile(rng, floorBases[c][0], floorBases[c][1], floorBases[c][2], 14);
  for (let y = 0; y < TILE; y++) {
    const rowStart = y * (1 + W * 3) + 1 + c * TILE * 3;
    Buffer.from(tile.slice(y * TILE * 3, (y + 1) * TILE * 3)).copy(raw, rowStart);
  }
}

const wallBases = [[110,105,98],[100,100,108],[118,108,95],[95,100,98]];
const mortar = [40, 38, 36];
for (let c = 0; c < COLS; c++) {
  const tile = genStoneTile(rng, wallBases[c][0], wallBases[c][1], wallBases[c][2], 8, mortar, 10);
  for (let y = 0; y < TILE; y++) {
    const rowStart = (TILE + y) * (1 + W * 3) + 1 + c * TILE * 3;
    Buffer.from(tile.slice(y * TILE * 3, (y + 1) * TILE * 3)).copy(raw, rowStart);
  }
}

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const sig = Buffer.from([137,80,78,71,13,10,26,10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
const idat = zlib.deflateSync(raw);
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);

const outPath = path.resolve(__dirname, '..', 'public', 'map', 'assets', 'dungeon_tiles.png');
fs.writeFileSync(outPath, png);
console.log('OK:', outPath, png.length, 'bytes');
