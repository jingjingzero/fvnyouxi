/**
 * 地牢寻路与视线模块：A* 寻路 + Bresenham 视线 + 索敌检测
 * 从 dungeon.vue 拆出。
 *
 * 依赖通过 initPathfinding(env) 注入（函数引用 / getter）：
 *  - isWalkable(col,row)         判断格子可通行
 *  - isGlassCell(col,row)        判断玻璃（阻挡移动不阻挡视野）
 *  - isObstacleBlocking(col,row) 判断是否有障碍物阻挡移动（木箱等）
 *  - isObstacleBlockingSight(col,row) 判断是否阻挡视野（木箱阻挡，玻璃不阻挡）
 *  - getVisionReduce(col,row)    草地等减少索敌范围的格子数
 *  - getPCol() / getPRow()       玩家当前格子（实时 getter）
 */

let isWalkable = () => true;
let isGlassCell = () => false;
let isObstacleBlocking = () => false;
let isObstacleBlockingSight = () => false;
let getVisionReduce = () => 0;
let getFogVisionReduce = () => 0; // 🌫️ 雾天减少敌人索敌视野格子数（实时 getter）
let getPCol = () => 0;
let getPRow = () => 0;

/** 注入寻路依赖 */
export function initPathfinding(env) {
  if (typeof env.isWalkable === 'function') isWalkable = env.isWalkable;
  if (typeof env.isGlassCell === 'function') isGlassCell = env.isGlassCell;
  if (typeof env.isObstacleBlocking === 'function') isObstacleBlocking = env.isObstacleBlocking;
  if (typeof env.isObstacleBlockingSight === 'function') isObstacleBlockingSight = env.isObstacleBlockingSight;
  if (typeof env.getVisionReduce === 'function') getVisionReduce = env.getVisionReduce;
  if (typeof env.getFogVisionReduce === 'function') getFogVisionReduce = env.getFogVisionReduce;
  if (typeof env.getPCol === 'function') getPCol = env.getPCol;
  if (typeof env.getPRow === 'function') getPRow = env.getPRow;
}

// 🧭 A* 寻路：八方向（支持对角线斜走），绕过 solid 障碍物，防止穿过墙角
export function findPath(startCol, startRow, targetCol, targetRow) {
  if (!isWalkable(targetCol, targetRow)) return [];
  if (startCol === targetCol && startRow === targetRow) return [];
  const key = (c, r) => c + ',' + r;
  const SQRT2 = Math.SQRT2;
  // 八方向启发函数（Octile 距离）
  const heuristic = (c, r) => {
    const dx = Math.abs(c - targetCol), dy = Math.abs(r - targetRow);
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
  };
  const open = [{ col: startCol, row: startRow, g: 0, h: heuristic(startCol, startRow), f: heuristic(startCol, startRow), parent: null }];
  const closed = new Set();
  const openMap = new Map();
  openMap.set(key(startCol, startRow), open[0]);
  // 八方向：4正交 + 4对角线
  const dirs = [
    [0, -1, 1], [0, 1, 1], [-1, 0, 1], [1, 0, 1],
    [-1, -1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [1, 1, SQRT2],
  ];
  let iterations = 0;
  while (open.length > 0 && iterations < 8000) {
    iterations++;
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bestIdx].f) bestIdx = i;
    const current = open.splice(bestIdx, 1)[0];
    openMap.delete(key(current.col, current.row));
    if (current.col === targetCol && current.row === targetRow) {
      const path = [];
      let n = current;
      while (n.parent) { path.unshift({ col: n.col, row: n.row }); n = n.parent; }
      return path;
    }
    closed.add(key(current.col, current.row));
    for (const [dc, dr, cost] of dirs) {
      const nc = current.col + dc, nr = current.row + dr;
      if (!isWalkable(nc, nr) || isObstacleBlocking(nc, nr) || closed.has(key(nc, nr))) continue;
      // 对角线移动：防止穿过墙角（两个相邻正交格至少一个可行走且无障碍物）
      if (dc !== 0 && dr !== 0) {
        const walkable1 = isWalkable(current.col + dc, current.row) && !isObstacleBlocking(current.col + dc, current.row);
        const walkable2 = isWalkable(current.col, current.row + dr) && !isObstacleBlocking(current.col, current.row + dr);
        if (!walkable1 && !walkable2) continue;
      }
      const g = current.g + cost;
      const existing = openMap.get(key(nc, nr));
      if (existing) {
        if (g < existing.g) {
          existing.g = g; existing.f = g + existing.h; existing.parent = current;
        }
      } else {
        const h = heuristic(nc, nr);
        const node = { col: nc, row: nr, g, h, f: g + h, parent: current };
        open.push(node);
        openMap.set(key(nc, nr), node);
      }
    }
  }
  return [];
}

// 👁️ 视线检测：Bresenham 射线，中间格被 solid 阻挡则返回 false（索敌被障碍物阻挡）
export function hasLineOfSight(c1, r1, c2, r2) {
  const dc = Math.abs(c2 - c1), dr = Math.abs(r2 - r1);
  const sc = c1 < c2 ? 1 : -1, sr = r1 < r2 ? 1 : -1;
  let err = dc - dr;
  let c = c1, r = r1;
  let guard = 0;
  while (guard++ < 200) {
    if (c === c2 && r === r2) return true;
    // 起点和终点不算阻挡；玻璃格子不阻挡视野（能看穿）；solid 墙或 pushable 障碍物阻挡
    if (!(c === c1 && r === r1) && !isGlassCell(c, r) && (!isWalkable(c, r) || isObstacleBlockingSight(c, r))) return false;
    const e2 = 2 * err;
    if (e2 > -dr) { err -= dr; c += sc; }
    if (e2 < dc) { err += dc; r += sr; }
  }
  return false;
}

// 🌙 天黑索敌加成：地牢天黑时怪物索敌范围扩大 ×1.4（dungeon.vue 每帧 setNightBoost 同步）
let nightBoost = 1;
export function setNightBoost(v) { nightBoost = v; }
// 🌕 血月索敌加成：血月天气怪物索敌范围扩大 ×1.3（dungeon.vue 每帧 setBloodMoonBoost 同步）
let bloodMoonBoost = 1;
export function setBloodMoonBoost(v) { bloodMoonBoost = v; }

// 👁️ 索敌检测：近身圆形（无视方向）+ 扇形/全向（追击时提升范围并全向），均需视线
export function canSeePlayer(e) {
  const pCol = getPCol();
  const pRow = getPRow();
  const dx = pCol - e.col;
  const dy = pRow - e.row;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) return false;
  // 🌿 草地减少敌人索敌范围：根据敌人所在格子的 visionReduce 减去具体格子数
  const enemyVisionReduce = getVisionReduce(e.col, e.row);
  // 追击状态下提升索敌范围 ×1.5，且全向 360 度（已警觉，不再受扇形朝向限制）
  const isChasing = e.state === 'chase';
  // 🌫️ 雾天减少敌人索敌视野：与玩家雾天可见度同源（weatherFogReduce 格数）
  const fogReduce = getFogVisionReduce();
  // 🦅 leiniaofu（雷鸟）：索敌范围缩小 25%（sightScale=0.75）+ 无视障碍物视线（ignoreSightBlock）
  const sightScale = e.sightScale || 1;
  const ignoreBlock = !!e.ignoreSightBlock;
  const effRadius = Math.max(0, (isChasing ? e.aggroRadius * 1.5 : e.aggroRadius) - enemyVisionReduce - fogReduce) * nightBoost * bloodMoonBoost * sightScale;
  const effCloseRange = Math.max(0, e.closeRange - enemyVisionReduce - fogReduce) * nightBoost * bloodMoonBoost * sightScale;
  const effFov = isChasing ? Math.PI * 2 : (e.fovHalved ? e.fovAngle / 2 : e.fovAngle); // 🐰 黑米被动：索敌角度减半
  // 近身圆形范围：closeRange 内无视方向，但仍需视线（leiniaofu 无视障碍物）
  if (dist <= effCloseRange) {
    return ignoreBlock ? true : hasLineOfSight(e.col, e.row, pCol, pRow);
  }
  if (dist > effRadius) return false;
  // 非全向时检查扇形角度
  if (effFov < Math.PI * 2 - 0.01) {
    const playerAngle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(playerAngle - e.facing);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    if (angleDiff > effFov / 2) return false;
  }
  return ignoreBlock ? true : hasLineOfSight(e.col, e.row, pCol, pRow);
}
