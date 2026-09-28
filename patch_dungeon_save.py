# -*- coding: utf-8 -*-
import io
p = r'D:\youxi\fvnyouxi\src\pages\pixi\dungeon.vue'
s = io.open(p, encoding='utf-8').read()
orig = s

# ========== 1. 新增存档读写函数（放在 VISIBLE_RADIUS 常量之后） ==========
old1 = '''const MOVE_SPEED = 7;
const VISIBLE_RADIUS = 4;
'''
new1 = '''const MOVE_SPEED = 7;
const VISIBLE_RADIUS = 4;

// ========== 地牢探索进度持久化（迷雾 + 玩家位置） ==========
const DUNGEON_SAVE_KEY = 'fv_dungeon_save_v1';
// 保存上次地牢探索进度：返回时写入 localStorage，下次进入时还原战争迷雾与位置
function saveDungeonState() {
  if (!exploration) return;
  try {
    localStorage.setItem(DUNGEON_SAVE_KEY, JSON.stringify({
      w: mapW,
      h: mapH,
      col: pCol,
      row: pRow,
      data: Array.from(exploration),
    }));
  } catch (e) { /* ignore */ }
}
// 读取上次地牢探索进度；尺寸不匹配 / 数据非法 / 出生点在墙内则返回 null（重新开局）
function loadDungeonState() {
  try {
    const raw = localStorage.getItem(DUNGEON_SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.data) || s.data.length !== mapW * mapH) return null;
    if (s.w !== mapW || s.h !== mapH) return null;
    if (typeof s.col !== 'number' || typeof s.row !== 'number') return null;
    if (s.col < 0 || s.col >= mapW || s.row < 0 || s.row >= mapH) return null;
    if (!isWalkable(s.col, s.row)) return null;
    for (const v of s.data) if (typeof v !== 'number' || v < 0 || v > 2) return null;
    return s;
  } catch (e) { return null; }
}
'''
assert s.count(old1) == 1, 'old1 count=%d' % s.count(old1)
s = s.replace(old1, new1)

# ========== 2. 出生点逻辑改为「先读存档，否则自动找出生点」 ==========
old2 = '''  exploration = new Uint8Array(mapW * mapH);

  playerGlow = new Graphics();'''
new2 = '''  exploration = new Uint8Array(mapW * mapH);

  // 🧭 读取上次地牢进度（迷雾 + 玩家位置），还原至上次返回时的场景；无存档则自动找出生点
  const saved = loadDungeonState();
  let spawnFound = false;
  if (saved) {
    exploration.set(saved.data);
    pCol = saved.col; pRow = saved.row;
    targetCol = saved.col; targetRow = saved.row;
    spawnFound = true;
  }

  playerGlow = new Graphics();'''
assert s.count(old2) == 1, 'old2 count=%d' % s.count(old2)
s = s.replace(old2, new2)

# ========== 3. 去掉旧的自动找出生点循环（已被上面覆盖，避免重复找点覆盖存档位置） ==========
old3 = '''  let spawnFound = false;
  for (let r = 2; r < mapH - 2 && !spawnFound; r++) {
    for (let c = 2; c < mapW - 2 && !spawnFound; c++) {
      if (isWalkable(c, r)) {
        pCol = c; pRow = r;
        targetCol = c; targetRow = r;
        spawnFound = true;
      }
    }
  }

  pPixelX = (pCol + 0.5) * tileW * scale;'''
new3 = '''  if (!spawnFound) {
    for (let r = 2; r < mapH - 2 && !spawnFound; r++) {
      for (let c = 2; c < mapW - 2 && !spawnFound; c++) {
        if (isWalkable(c, r)) {
          pCol = c; pRow = r;
          targetCol = c; targetRow = r;
          spawnFound = true;
        }
      }
    }
  }

  pPixelX = (pCol + 0.5) * tileW * scale;'''
assert s.count(old3) == 1, 'old3 count=%d' % s.count(old3)
s = s.replace(old3, new3)

# ========== 4. onBeforeUnmount 里先保存进度再销毁 ==========
old4 = '''onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('resize', onResize);
  if (app) {'''
new4 = '''onBeforeUnmount(() => {
  // 💾 保存地牢探索进度（迷雾 + 玩家位置），下次进入时还原
  saveDungeonState();
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('resize', onResize);
  if (app) {'''
assert s.count(old4) == 1, 'old4 count=%d' % s.count(old4)
s = s.replace(old4, new4)

io.open(p, 'w', encoding='utf-8').write(s)
print('dungeon.vue 持久化修改完成，变更点：', s != orig)
