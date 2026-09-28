// 🎲 地牢随机道具刷新模块（拆自 dungeon.vue，行为零变化）
// 依赖通过 initRespawnItems 注入（getter/setter 实时读写主文件状态；可重赋值状态由 setter 回调写回）
import { Assets, Texture, Sprite } from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { RESPAWN_ITEM_POOL, RARE_POOL_PERCENT, itemImgUrl } from './config.js';
import { createDaojuSpine } from '../fight/CardSpine.js';

let ctx = null;
export function initRespawnItems(deps) { ctx = deps; }

const RANDOM_SPAWN_TERRAINS = ['草地', '沙地', '雪地', '冰面', '泥地', '石板'];
// 珍惜度(1~5，越大越珍惜) → 刷出数量（未配 count 时按此自动分配）
const RARITY_COUNT = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 };
// 随机道具之间的最小间距（切比雪夫距离，格）
const RANDOM_SPAWN_MIN_DIST = 4;
// 随机道具与 spawn 复活点 / stairs 入口 / 已有 item / 宝箱 的最小间距（切比雪夫距离，格）
const RANDOM_SPAWN_EXCLUDE_DIST = 3;

// 🎲 解析 tiled 地图属性 randomSpawnCount —— 只设置本层地牢可刷新的道具「总数量」
//   支持写法：数字 "20" / 对象 {"total":20}（旧版数组配置已弃用）
//   具体刷新什么道具由代码池 RESPAWN_ITEM_POOL（刷新权重 + 每道具最大数量 + spine 皮肤图）决定
//   返回：总数（>0 的整数）或 null（未配置 → 走 items_respawn_* 图层）
export function parseRandomSpawnConfig(mapData) {
  const props = {};
  for (const p of mapData?.properties || []) props[p.name] = p.value;
  const raw = props.randomSpawnCount;
  if (raw == null || raw === '') return null;
  let total = -1;
  if (typeof raw === 'number') {
    total = Math.floor(raw);
  } else if (typeof raw === 'string') {
    const t = raw.trim();
    if (/^\d+$/.test(t)) {
      total = Math.floor(Number(t));
    } else {
      try {
        const p = JSON.parse(t);
        if (typeof p === 'number') total = Math.floor(p);
        else if (p && typeof p === 'object' && p.total != null) total = Math.floor(Number(p.total));
      } catch (e) { return null; }
    }
  } else if (raw && typeof raw === 'object' && raw.total != null) {
    total = Math.floor(Number(raw.total));
  }
  if (!(total > 0)) return null;
  return total; // 只返回数量，具体道具由 RESPAWN_ITEM_POOL 决定
}

// 🎲 随机刷新道具：位置随机落在「允许地形 且 上方无障碍物 且 未被固定 item 占用」的格子上，
//   数量按配置（count 或珍惜度），道具之间保持最小间距。
export function spawnRandomItems() {
  const total = ctx.randomSpawnConfig; // 🎲 tiled 只传总数（randomSpawnCount 属性）
  if (!total || !ctx.mapW || !ctx.mapH) return;
  // 🚫 禁止刷新区域：spawn 复活点 / stairs 入口 / 已有 item / 宝箱 周围（RANDOM_SPAWN_EXCLUDE_DIST 格）不刷新道具
  const forbidden = [];
  const pushPt = (p) => { if (p && p.col != null && p.row != null) forbidden.push({ col: p.col, row: p.row }); };
  for (const sp of ctx.spawnPoints || []) pushPt(sp);   // 🏳️ 所有 spawn 复活点
  for (const it of ctx.pickupItems) if (!it.respawn) pushPt(it); // 🎁 地图已有固定 item
  for (const ch of ctx.chests || []) pushPt(ch);         // 🎁 所有宝箱（含瓦片宝箱）
  pushPt(ctx.stairsPoint);                               // 🚪 stairs 入口
  const nearForbidden = (c, r) => {
    for (const p of forbidden) {
      if (Math.max(Math.abs(p.col - c), Math.abs(p.row - r)) < RANDOM_SPAWN_EXCLUDE_DIST) return true;
    }
    return false;
  };
  const candidates = [];
  for (let r = 1; r < ctx.mapH - 1; r++) {
    for (let c = 1; c < ctx.mapW - 1; c++) {
      if (!RANDOM_SPAWN_TERRAINS.includes(ctx.getTileTerrainName(c, r))) continue;
      if (!ctx.isWalkable(c, r)) continue;
      if (nearForbidden(c, r)) continue;
      candidates.push({ col: c, row: r });
    }
  }
  // 洗牌（保证随机性）
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const placed = [];
  const farEnough = (c, r) => {
    for (const p of placed) {
      if (Math.max(Math.abs(p.col - c), Math.abs(p.row - r)) < RANDOM_SPAWN_MIN_DIST) return false;
    }
    return true;
  };
  // 🎲 从代码道具池按权重抽取 total 个道具（每个道具受其 max 每次最大数量限制）
  const picks = pickRespawnItems(total);
  for (const pk of picks) {
    for (let i = 0; i < candidates.length;) {
      const cand = candidates[i];
      if (farEnough(cand.col, cand.row)) {
        candidates.splice(i, 1);
        placed.push({ col: cand.col, row: cand.row });
        const it = {
          col: cand.col, row: cand.row,
          px: cand.col * ctx.tileW, py: (cand.row + 1) * ctx.tileH, // 对齐手动 Sprite 中心到格中心
          itemId: pk.name, num: 1, img: pk.img, _skin: pk.img, // _skin = daojuall spine 皮肤名
          taken: false, respawn: true, layerName: 'random',
        };
        ctx.pickupItems.push(it);
        createRespawnItemSprite(it);
        break;
      } else {
        i++;
      }
    }
  }
}

// 🎲 从 RESPAWN_ITEM_POOL 逐格抽取道具（两级概率）：
//   每格 roll 一次 0~100：
//     · r < 100−RARE_POOL_PERCENT → 主池（rare=false，如赤莓/翠息草/风萤果），按各自 chance 比例分
//     · r ≥ 100−RARE_POOL_PERCENT → 稀有池（rare=true，如忆尘晶/月露草/幽冥花蕊），按各自 chance 比例分
//   同道具可在多格重复出现（受 max 上限）；某池空时概率让给另一池；无可用道具时提前停止
export function pickRespawnItems(total) {
  const pool = RESPAWN_ITEM_POOL;
  if (!pool || !pool.length) return [];
  const rare = pool.filter(it => it.rare);
  const main = pool.filter(it => !it.rare);
  const counts = {};
  const picks = [];
  // 按各自 chance 比例瓜分 budget 区间
  const pickByChance = (list, budget) => {
    const sum = list.reduce((s, c) => s + (c.chance || 0), 0);
    let r = Math.random() * budget;
    for (const c of list) {
      const w = sum > 0 ? ((c.chance || 0) / sum) * budget : budget / list.length;
      r -= w;
      if (r <= 0) return c;
    }
    return list[list.length - 1];
  };
  const mainBudget = 100 - RARE_POOL_PERCENT; // 主池总占比（默认 94%）
  for (let k = 0; k < total; k++) {
    // 可用（未满 max）的道具
    const mAvail = main.filter(it => !it.max || (counts[it.name] || 0) < it.max);
    const rAvail = rare.filter(it => !it.max || (counts[it.name] || 0) < it.max);
    if (!mAvail.length && !rAvail.length) break;
    const r = Math.random() * 100;
    let pick = null;
    if (r < mainBudget) {
      if (mAvail.length) pick = pickByChance(mAvail, mainBudget);
    } else {
      if (rAvail.length) pick = pickByChance(rAvail, RARE_POOL_PERCENT);
    }
    if (!pick) {
      // 当前池已空 → 概率让给另一个池
      if (mAvail.length) pick = pickByChance(mAvail, 100);
      else if (rAvail.length) pick = pickByChance(rAvail, 100);
    }
    if (!pick) break;
    counts[pick.name] = (counts[pick.name] || 0) + 1;
    picks.push({ name: pick.name, img: pick.img || null });
  }
  return picks;
}

// 🎲 刷新可刷新道具：从所有 items_respawn_* 图层中随机选取一个作为本次地牢的道具物资刷新点
//   普通进入地牢 / 切换层时调用；战斗结束返回不调用（保持当前图层与已拾取状态，不重新刷新）
//   现有 dungeon_objects 层的 item（拾取后不再刷新）不受影响。
//   渲染方式：不依赖 tiled 对象层瓦片（pixi-tiledmap 渲染不可靠），改为手动创建 Sprite。
//   🎲 若 tiled 地图属性配置了 randomSpawnCount，则改用随机刷新模式（位置随机、数量按珍惜度）。
export function refreshRespawnItems() {
  // 1) 清除旧的 respawn 道具（仅移除 respawn:true 项，现有 item 不动）
  ctx.setPickupItems(ctx.pickupItems.filter(it => !it.respawn));
  // 2) 销毁旧的 respawn 手动 Sprite
  for (const sp of ctx.respawnItemSprites) {
    try { sp.destroy(); } catch (e) { /* ignore */ }
  }
  ctx.setRespawnItemSprites([]);
  // 3) 隐藏所有可刷新道具图层（避免 tiled 瓦片与手动 Sprite 双显）
  for (const l of ctx.respawnItemLayers) {
    const layer = ctx.getObjectLayer(l.layerName);
    if (layer) layer.visible = false;
  }
  ctx.setActiveRespawnLayer(null);
  // 🎲 随机刷新模式：tiled 地图属性配置了 randomSpawnCount → 位置随机，忽略 items_respawn_* 图层
  if (ctx.randomSpawnConfig) {
    spawnRandomItems();
    return;
  }
  if (ctx.respawnItemLayers.length > 0) {
    const picked = ctx.respawnItemLayers[Math.floor(Math.random() * ctx.respawnItemLayers.length)];
    ctx.setActiveRespawnLayer(picked.layerName);
    // 🎯 天气限定刷新过滤（Tiled item 自定义属性）：
    //   weatherList：配置了特定天气但当前天气不在列表 → 该格不刷新
    //   refreshChance：每格刷新概率（0~100），随机不命中 → 不刷新
    //   id + maxCount：id 相同的限量道具组成一组，该组在地牢中合计最多刷出
    //     min(各 maxCount) 个（组内随机抽取刷新在哪些格）；不配 id 的道具不受限量
    const groupMap = new Map(); // id -> { max, items }
    const normals = [];
    for (const it of picked.items) {
      if (it.weatherList && it.weatherList.length && !it.weatherList.includes(ctx.currentWeather)) continue;
      if (it.refreshChance != null && (Math.random() * 100) > it.refreshChance) continue;
      if (it.groupId != null && it.maxCount != null) {
        const gid = String(it.groupId);
        if (!groupMap.has(gid)) groupMap.set(gid, { max: Infinity, items: [] });
        const g = groupMap.get(gid);
        g.max = Math.min(g.max, it.maxCount);
        g.items.push(it);
      } else {
        normals.push(it);
      }
    }
    // 每组随机抽取上限数量的 item（组内刷新在哪些格随机决定）
    const chosen = [];
    for (const g of groupMap.values()) {
      const pool = [...g.items];
      const n = Math.min(g.max, pool.length);
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        chosen.push(pool.splice(idx, 1)[0]);
      }
    }
    for (const it of normals) { const item = { ...it, taken: false }; ctx.pickupItems.push(item); createRespawnItemSprite(item); }
    for (const it of chosen) { const item = { ...it, taken: false }; ctx.pickupItems.push(item); createRespawnItemSprite(item); }
  }
}

// 🖼️ 为 respawn 道具手动创建 Sprite（放 respawnItemContainer，mapContainer 子节点，随镜头移动）
export function createRespawnItemSprite(it) {
  if (!ctx.respawnItemContainer) return;
  const sp = new Sprite(Texture.WHITE);
  sp.anchor.set(0.5, 0.5);
  // 对齐 tiled 对象瓦片渲染位置：对象瓦片底边对齐，Sprite 中心 = (obj.x + tileW/2, obj.y - tileW/2)
  sp.x = it.px + ctx.tileW / 2;
  sp.y = it.py - ctx.tileH / 2;
  const size = ctx.tileW * 0.72; // 道具占格子约 72%，避免贴边
  sp.width = size;
  sp.height = size;
  ctx.respawnItemContainer.addChild(sp);
  it._sprite = sp;
  ctx.respawnItemSprites.push(sp);
  // ✨ 道具描边（亮金色，便于在迷雾/地形上识别）
  try { sp.filters = [new OutlineFilter({ thickness: 2, color: 0xffd700, alpha: 0.9, quality: 0.3 })]; } catch (e) { /* 忽略 */ }
  // 🖼️ 应用纹理（优先 daojuall spine 皮肤图，其次静态图）
  applyRespawnSpriteTexture(it);
}

// 🖼️ 为 respawn 道具应用纹理：随机道具（_skin）走 daojuall spine 皮肤图；
//   普通图层道具（无 _skin）走 itemImgUrl 静态图。图未就绪时先留白块，就绪后自动补上
export function applyRespawnSpriteTexture(it) {
  const sp = it._sprite;
  if (!sp || sp.destroyed) return;
  let url = '';
  // 1) spine 皮肤图（daojuall 皮肤名 → dataURL）
  if (it._skin) {
    url = ctx.dungeonDaojuImgMap.value[it._skin] || (typeof window !== 'undefined' && window.__daojuImgMap?.[it._skin]) || '';
  }
  // 2) 静态图兜底（tiled item 的 img key 或 ITEM_IMG_MAP）
  if (!url) url = itemImgUrl(it.itemId, it.img);
  if (!url) return;
  const size = ctx.tileW * 0.72;
  Assets.load(url).then(tex => {
    if (sp && !sp.destroyed) {
      sp.texture = tex;
      sp.width = size;
      sp.height = size;
    }
  }).catch(() => { /* 图片加载失败则保持白色占位，不影响逻辑 */ });
}

// 🎲 预渲染随机道具池的 spine 皮肤图（RESPAWN_ITEM_POOL 中所有 img），
//   完成后自动给已创建但未上图的 respawn 道具补图（首次进入地牢短暂白块后出图）
export async function ensureRespawnSkins() {
  const pre = (typeof window !== 'undefined' && window.__daojuImgMap) || {};
  const skins = new Set();
  for (const c of RESPAWN_ITEM_POOL || []) if (c.img) skins.add(c.img);
  for (const skin of skins) {
    if (ctx.dungeonDaojuImgMap.value[skin] || pre[skin]) {
      if (pre[skin] && !ctx.dungeonDaojuImgMap.value[skin]) {
        ctx.dungeonDaojuImgMap.value = { ...ctx.dungeonDaojuImgMap.value, [skin]: pre[skin] };
      }
      continue;
    }
    try {
      const result = await createDaojuSpine(skin, 80, 80);
      if (result?.canvas) {
        const url = result.canvas.toDataURL();
        ctx._dungeonDaojuCache[skin] = url;
        ctx.dungeonDaojuImgMap.value = { ...ctx.dungeonDaojuImgMap.value, [skin]: url };
        if (window.__daojuImgMap) window.__daojuImgMap[skin] = url;
        result.destroy?.();
      }
    } catch (e) { console.warn('[地牢随机道具] spine 加载失败:', skin, e); }
  }
  // 图就绪后，刷新已创建但未上图的 respawn 道具
  for (const it of ctx.pickupItems) {
    if (it.respawn && it._sprite) applyRespawnSpriteTexture(it);
  }
}
