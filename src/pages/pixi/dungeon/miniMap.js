/**
 * 🗺️ 地牢小地图绘制模块：局部视野小地图 + 完整地图弹窗绘制
 * 从 dungeon.vue 拆出。纯绘制（只读状态，不写状态），依赖通过 initMiniMap(env) 注入：
 *  - miniMapCanvas() / fullMapCanvas()  canvas 元素（ref.value）
 *  - mapW() / mapH()                    地图宽高
 *  - solidGrid() / exploration()        障碍网格 / 迷雾数组
 *  - playerCol() / playerRow()          玩家格子（ref.value）
 *  - visibleRadius()                    玩家可见度（格）
 *  - stairsPoint()                      楼梯点
 *  - chests() / npcs() / enemies()      宝箱 / NPC / 敌人列表
 */

let env = {
  miniMapCanvas: () => null,
  fullMapCanvas: () => null,
  mapW: () => 0,
  mapH: () => 0,
  solidGrid: () => null,
  exploration: () => null,
  playerCol: () => null,
  playerRow: () => null,
  visibleRadius: () => 4,
  stairsPoint: () => null,
  chests: () => [],
  npcs: () => [],
  enemies: () => [],
  guidePath: () => [], // 🧭 新手指引寻路路线 [{col,row},...]（不含起点）
};

/** 注入小地图绘制依赖 */
export function initMiniMap(e) {
  if (!e) return;
  env = Object.assign({}, env, e);
}

// 🗺️ 局部视野小地图：中心跟随玩家，半径比玩家视野大得多（玩家视野 ×3，下限 12 格）
export function drawMiniMap() {
  const c = env.miniMapCanvas();
  const mapW = env.mapW(), mapH = env.mapH();
  const solidGrid = env.solidGrid(), exploration = env.exploration();
  if (!c || !mapW || !mapH || !solidGrid || !exploration) return;
  // 兜底：强制 canvas 为正方形（宽高不等时重设，防止初始化时序导致默认 300x150 长方形）
  if (c.width !== c.height) {
    const dpr = window.devicePixelRatio || 1;
    const disp = Math.min(window.innerHeight * 0.28, 230);
    c.style.width = Math.round(disp) + 'px';
    c.style.height = Math.round(disp) + 'px';
    c.width = Math.max(1, Math.round(disp * dpr));
    c.height = Math.max(1, Math.round(disp * dpr));
  }
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,10,16,0.7)';
  ctx.fillRect(0, 0, W, H);
  const pc = env.playerCol(), pr = env.playerRow();
  if (pc == null || pr == null) return;
  const R = Math.max((env.visibleRadius() || 4) * 3, 12);
  const cell = Math.min(W, H) / (R * 2 + 1);
  const baseX = (W - cell * (R * 2 + 1)) / 2;   // 视野左上角 x（居中偏移）
  const baseY = (H - cell * (R * 2 + 1)) / 2;   // 视野左上角 y（居中偏移）
  // 格子层：已探索显示、未探索保持黑（迷雾）、越界暗色
  for (let dr = -R; dr <= R; dr++) {
    for (let dc = -R; dc <= R; dc++) {
      const col = pc + dc, row = pr + dr;
      const x = baseX + (dc + R) * cell, y = baseY + (dr + R) * cell;
      if (col < 0 || col >= mapW || row < 0 || row >= mapH || !solidGrid[row]) {
        ctx.fillStyle = 'rgba(18,20,28,0.9)'; // 越界暗色
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
        continue;
      }
      if (solidGrid[row][col]) {
        ctx.fillStyle = 'rgba(120,38,38,0.85)'; // 障碍物
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
        continue;
      }
      const st = exploration[row * mapW + col] || 0;
      if (st >= 1) {
        ctx.fillStyle = st === 2 ? 'rgba(140,165,205,0.6)' : 'rgba(92,106,132,0.55)'; // 当前可见 / 已探索
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      } else {
        ctx.fillStyle = 'rgba(10,12,18,0.98)'; // 未探索黑
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      }
    }
  }
  const cellX = (col, row) => baseX + (col - pc + R) * cell + cell / 2;
  const cellY = (col, row) => baseY + (row - pr + R) * cell + cell / 2;
  const stairsPoint = env.stairsPoint();
  // 楼梯（已探索才显示）
  if (stairsPoint && stairsPoint.row != null && stairsPoint.col != null
    && Math.abs(stairsPoint.col - pc) <= R && Math.abs(stairsPoint.row - pr) <= R
    && exploration[stairsPoint.row * mapW + stairsPoint.col]) {
    const sx = cellX(stairsPoint.col, stairsPoint.row), sy = cellY(stairsPoint.col, stairsPoint.row);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, cell * 0.45), 0, Math.PI * 2); ctx.fill();
  }
  // 宝箱（未开；迷雾中不显示）
  for (const ch of env.chests() || []) {
    if (!ch || ch.opened || !ch.visible) continue;
    if (Math.abs(ch.col - pc) > R || Math.abs(ch.row - pr) > R) continue;
    if (!exploration[ch.row * mapW + ch.col]) continue; // 🌫️ 迷雾中不显示
    const cx = cellX(ch.col, ch.row), cy = cellY(ch.col, ch.row);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, cell * 0.4), 0, Math.PI * 2); ctx.fill();
  }
  // 🧑 NPC（已探索才显示，绿点）
  for (const n of env.npcs() || []) {
    if (!n || n.col == null || n.row == null) continue;
    if (Math.abs(n.col - pc) > R || Math.abs(n.row - pr) > R) continue;
    if (!exploration[n.row * mapW + n.col]) continue; // 🌫️ 迷雾中的 NPC 不显示
    const nx = cellX(n.col, n.row), ny = cellY(n.col, n.row);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(nx, ny, Math.max(2, cell * 0.34), 0, Math.PI * 2); ctx.fill();
  }
  // 敌人（已探索才显示）
  for (const e of env.enemies() || []) {
    if (!e || e.col == null || e.row == null) continue;
    if (Math.abs(e.col - pc) > R || Math.abs(e.row - pr) > R) continue;
    if (!exploration[e.row * mapW + e.col]) continue; // 🌫️ 迷雾中的敌人不显示
    const ex = cellX(e.col, e.row), ey = cellY(e.col, e.row);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(ex, ey, Math.max(2, cell * 0.42), 0, Math.PI * 2); ctx.fill();
  }
  // 🧭 新手指引寻路路线（玩家 → 莫奇，穿迷雾显示金色路线；已贴合目标时完全不显示）
  const guidePath = env.guidePath() || [];
  if (guidePath.length) {
    const allPts = [{ col: pc, row: pr }, ...guidePath];
    // 🧭 已贴合目标（只剩 1 段）→ 不画，避免露出多余节点
    if (allPts.length > 2) {
      ctx.strokeStyle = 'rgba(255,217,140,0.95)';
      ctx.lineWidth = Math.max(1, cell * 0.16);
      ctx.beginPath();
      let penDown = false;
      for (const p of allPts) {
        if (Math.abs(p.col - pc) > R || Math.abs(p.row - pr) > R) { penDown = false; continue; }
        const x = cellX(p.col, p.row), y = cellY(p.col, p.row);
        if (penDown) ctx.lineTo(x, y);
        else { ctx.moveTo(x, y); penDown = true; }
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,233,184,0.95)';
      for (const p of allPts) {
        if (Math.abs(p.col - pc) > R || Math.abs(p.row - pr) > R) continue;
        ctx.beginPath(); ctx.arc(cellX(p.col, p.row), cellY(p.col, p.row), Math.max(1.2, cell * 0.12), 0, Math.PI * 2); ctx.fill();
      }
      const targetP = allPts[allPts.length - 1];
      ctx.fillStyle = 'rgba(255,233,184,0.95)';
      ctx.beginPath(); ctx.arc(cellX(targetP.col, targetP.row), cellY(targetP.col, targetP.row), Math.max(1.5, cell * 0.16), 0, Math.PI * 2); ctx.fill();
    }
  }
  // 玩家（中心，醒目金色 + 光圈）
  const px = W / 2, py = H / 2;
  ctx.strokeStyle = 'rgba(255,220,120,0.5)';
  ctx.lineWidth = Math.max(1, cell * 0.3);
  ctx.beginPath(); ctx.arc(px, py, Math.max(3, cell * 0.85), 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.arc(px, py, Math.max(2, cell * 0.5), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px, py, Math.max(1, cell * 0.22), 0, Math.PI * 2); ctx.fill();
}

// 🗺️ 完整地图弹窗：按容器尺寸设置 canvas 并绘制全图
export function setupFullMap() {
  const c = env.fullMapCanvas();
  const mapW = env.mapW(), mapH = env.mapH();
  const solidGrid = env.solidGrid();
  if (!c || !mapW || !mapH || !solidGrid) return;
  const dpr = window.devicePixelRatio || 1;
  const maxH = Math.min(window.innerHeight * 0.74, 760);
  const maxW = window.innerWidth * 0.84;
  let dispH = maxH;
  let dispW = dispH * (mapW / mapH);
  if (dispW > maxW) { dispW = maxW; dispH = dispW * (mapH / mapW); }
  c.style.width = Math.round(dispW) + 'px';
  c.style.height = Math.round(dispH) + 'px';
  c.width = Math.max(1, Math.round(dispW * dpr));
  c.height = Math.max(1, Math.round(dispH * dpr));
  drawFullMap();
}

// 🗺️ 完整地图：显示全部地图结构（可走格 + 障碍物）+ 全部实体标注
export function drawFullMap() {
  const c = env.fullMapCanvas();
  const mapW = env.mapW(), mapH = env.mapH();
  const solidGrid = env.solidGrid(), exploration = env.exploration();
  if (!c || !mapW || !mapH || !solidGrid || !exploration) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(8,10,16,1)';
  ctx.fillRect(0, 0, c.width, c.height);
  const cell = Math.min(c.width / mapW, c.height / mapH);
  const ox = (c.width - cell * mapW) / 2, oy = (c.height - cell * mapH) / 2;
  for (let r = 0; r < mapH; r++) {
    for (let col = 0; col < mapW; col++) {
      const x = ox + col * cell, y = oy + r * cell;
      if (solidGrid[r] && solidGrid[r][col]) {
        ctx.fillStyle = 'rgba(120,38,38,0.85)';
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      } else {
        ctx.fillStyle = 'rgba(66,78,100,0.55)';
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      }
    }
  }
  const dot = (col, row, color, k) => {
    const dx = ox + (col + 0.5) * cell, dy = oy + (row + 0.5) * cell;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(dx, dy, Math.max(2, cell * k), 0, Math.PI * 2); ctx.fill();
  };
  const stairsPoint = env.stairsPoint();
  if (stairsPoint && stairsPoint.row != null && stairsPoint.col != null) dot(stairsPoint.col, stairsPoint.row, '#4ade80', 0.45);
  for (const ch of env.chests() || []) if (ch && !ch.opened && ch.visible) dot(ch.col, ch.row, '#fbbf24', 0.4);
  for (const e of env.enemies() || []) if (e && e.col != null && e.row != null) dot(e.col, e.row, '#ef4444', 0.42);
  // 🧭 新手指引寻路路线（玩家 → 莫奇，全图显示金色路线；已贴合目标时完全不显示）
  const guidePath = env.guidePath() || [];
  if (guidePath.length) {
    const allPts = [{ col: env.playerCol(), row: env.playerRow() }, ...guidePath];
    // 🧭 已贴合目标（只剩 1 段）→ 不画，避免露出多余节点
    if (allPts.length > 2) {
      ctx.strokeStyle = 'rgba(255,217,140,0.95)';
      ctx.lineWidth = Math.max(1, cell * 0.18);
      ctx.beginPath();
      ctx.moveTo(ox + (allPts[0].col + 0.5) * cell, oy + (allPts[0].row + 0.5) * cell);
      for (let i = 1; i < allPts.length; i++) ctx.lineTo(ox + (allPts[i].col + 0.5) * cell, oy + (allPts[i].row + 0.5) * cell);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,233,184,0.95)';
      for (const p of allPts) {
        ctx.beginPath(); ctx.arc(ox + (p.col + 0.5) * cell, oy + (p.row + 0.5) * cell, Math.max(1.2, cell * 0.12), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  const pc = env.playerCol(), pr = env.playerRow();
  if (pc != null && pr != null) {
    const dx = ox + (pc + 0.5) * cell, dy = oy + (pr + 0.5) * cell;
    ctx.strokeStyle = 'rgba(255,220,120,0.6)';
    ctx.lineWidth = Math.max(1, cell * 0.3);
    ctx.beginPath(); ctx.arc(dx, dy, Math.max(3, cell * 0.85), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(dx, dy, Math.max(2, cell * 0.5), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(dx, dy, Math.max(1, cell * 0.22), 0, Math.PI * 2); ctx.fill();
  }
}

export default { initMiniMap, drawMiniMap, setupFullMap, drawFullMap };
