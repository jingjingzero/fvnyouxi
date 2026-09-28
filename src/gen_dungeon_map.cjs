/**
 * 生成地牢地图 dungeon.tmj（30x20, 32px瓦片）
 * 布局：外墙 + 十字内墙分隔4个房间，门洞连通
 * 墙壁瓦片(id 4-7, gid 5-8) 标 solid=true
 */
const fs = require('fs');
const path = require('path');

const W = 30, H = 20;
const FLOOR_GIDS = [1, 2, 3, 4];  // 4种地板变体
const WALL_GIDS = [5, 6, 7, 8];   // 4种墙壁变体

// 初始化全地板
const grid = Array.from({ length: H }, () => new Array(W).fill(0));

// 简单伪随机（用于瓦片变体）
function prng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
const rng = prng(12345);

// 填充地板（带变体）
for (let r = 0; r < H; r++) {
  for (let c = 0; c < W; c++) {
    const v = rng();
    if (v < 0.6) grid[r][c] = FLOOR_GIDS[0];
    else if (v < 0.8) grid[r][c] = FLOOR_GIDS[1];
    else if (v < 0.93) grid[r][c] = FLOOR_GIDS[2];
    else grid[r][c] = FLOOR_GIDS[3];
  }
}

// 辅助：设置墙壁（带变体）
function setWall(r, c) {
  if (r >= 0 && r < H && c >= 0 && c < W) {
    const v = rng();
    if (v < 0.5) grid[r][c] = WALL_GIDS[0];
    else if (v < 0.75) grid[r][c] = WALL_GIDS[1];
    else if (v < 0.92) grid[r][c] = WALL_GIDS[2];
    else grid[r][c] = WALL_GIDS[3];
  }
}

// 1. 外墙（1格厚）
for (let c = 0; c < W; c++) { setWall(0, c); setWall(H - 1, c); }
for (let r = 0; r < H; r++) { setWall(r, 0); setWall(r, W - 1); }

// 2. 垂直内墙（col 14），分隔左右，留门洞 rows 5-6 和 13-14
for (let r = 1; r < H - 1; r++) {
  if ((r >= 5 && r <= 6) || (r >= 13 && r <= 14)) continue; // 门洞
  setWall(r, 14);
}

// 3. 水平内墙（row 10），分隔上下，留门洞 cols 6-7 和 21-22
for (let c = 1; c < W - 1; c++) {
  if ((c >= 6 && c <= 7) || (c >= 21 && c <= 22)) continue; // 门洞
  setWall(10, c);
}

// 4. 房间内添加一些装饰性柱子/障碍（也是solid，增加探索感）
// Room 1 (top-left): 柱子 at (4,4)
setWall(4, 4);
// Room 2 (top-right): 柱子 at (20,3) and (24,6)
setWall(3, 20); setWall(6, 24);
// Room 3 (bottom-left): 柱子 at (5,15)
setWall(15, 5);
// Room 4 (bottom-right): 柱子 at (18,20) and (16,25)
setWall(16, 20); setWall(18, 25);

// 转换为一维 data 数组（TMJ 格式：row-major）
const data = [];
for (let r = 0; r < H; r++) {
  for (let c = 0; c < W; c++) {
    data.push(grid[r][c]);
  }
}

// 构建 TMJ
const tmj = {
  compressionlevel: -1,
  height: H,
  infinite: false,
  layers: [{
    data: data,
    height: H,
    id: 1,
    name: "地板与墙壁",
    opacity: 1,
    type: "tilelayer",
    visible: true,
    width: W,
    x: 0,
    y: 0
  }],
  nextlayerid: 2,
  nextobjectid: 1,
  orientation: "orthogonal",
  renderorder: "right-down",
  tiledversion: "1.12.2",
  tileheight: 32,
  tilesets: [{
    firstgid: 1,
    name: "dungeon_tiles",
    tilewidth: 32,
    tileheight: 32,
    tilecount: 8,
    columns: 4,
    image: "assets/dungeon_tiles.png",
    imagewidth: 128,
    imageheight: 64,
    // 墙壁瓦片 id 4-7（gid 5-8）标 solid=true
    tiles: [
      { id: 4, properties: [{ name: "solid", type: "bool", value: true }] },
      { id: 5, properties: [{ name: "solid", type: "bool", value: true }] },
      { id: 6, properties: [{ name: "solid", type: "bool", value: true }] },
      { id: 7, properties: [{ name: "solid", type: "bool", value: true }] },
    ]
  }],
  tilewidth: 32,
  type: "map",
  version: "1.10",
  width: W
};

const outPath = path.resolve(__dirname, '..', 'public', 'map', 'dungeon.tmj');
fs.writeFileSync(outPath, JSON.stringify(tmj, null, 2), 'utf-8');
console.log('Generated:', outPath);
console.log('Map:', W + 'x' + H, 'tiles, total', data.length, 'gids');

// 验证：统计墙壁和地板数量
let wallCount = 0, floorCount = 0;
for (const g of data) {
  if (g >= 5 && g <= 8) wallCount++;
  else floorCount++;
}
console.log('Floor tiles:', floorCount, '| Wall tiles:', wallCount);
