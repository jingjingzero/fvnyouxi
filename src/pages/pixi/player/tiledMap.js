/**
 * 🗺️ Tiled 地图导入模块（pixi-tiledmap v2 + PixiJS 8）
 *
 * 职责：
 *   1. 加载 .tmj / .tmx（自动解析外部 .tsx/.tsj tileset 与贴图）→ 渲染容器
 *   2. 自动计算地图边界（tmj 像素宽高 × 缩放）
 *   3. 读取瓦片自定义属性 `solid=true` → 合并成碰撞矩形（供 rectPoolArr 使用）
 *
 * 用法（配合 map.js 的 tiled 配置）：
 *   - 初始化时先 `await ensureTiledMap(url)` 预加载（matter.vue 已处理）
 *   - map.js 工厂里用 `getTiledMapCached(url)` 同步读取 mapData 生成碰撞/边界
 *   - 渲染时用 `getTiledMapCached(url).container` 挂到 bgContainer（替代 backgroundImages）
 */
import { loadTiledMapAsset } from 'pixi-tiledmap';
import { Assets } from 'pixi.js';

// URL -> { mapData, container } 缓存（多地图可复用同一份 tmj）
const tiledCache = new Map();

/**
 * 贴图加载器（解决 pixi-tiledmap 的一个限制）：
 * 外部 tsx 的贴图路径会按「地图目录 + 图名」解析（如 /map/caodi.png），
 * 但贴图实际在 tsx 所在子目录（如 /map/assets/）。此处先按原路径加载，
 * 失败/为空时回退到「地图目录/assets/图名」。
 * @param {string} url
 */
async function tiledLoadAsset(url) {
  let tex = null;
  try {
    tex = await Assets.load(url);
  } catch (e) {
    tex = null;
  }
  if (tex) return tex;
  const slash = url.lastIndexOf('/');
  const base = url.slice(0, slash + 1);
  const name = url.slice(slash + 1);
  const alt = `${base}assets/${name}`;
  if (alt === url) throw new Error(`[Tiled] 贴图加载失败: ${url}`);
  return Assets.load(alt);
}

/**
 * 预加载 / 获取一份 tiled 地图资源（内部缓存，重复调用只加载一次）
 * @param {string} url - tmj/tmx 的 URL（相对 public 根目录，如 '/map/map1.tmj'）
 * @returns {Promise<{mapData: ResolvedMap, container: Container}>}
 */
export async function ensureTiledMap(url) {
  // 🐛 修复：matter 组件卸载时 app.destroy(true,{children:true}) 会把 tiled 容器销毁
  //    （container.destroyed=true，scale 被置 null）。但 tiledCache 仍保留这个已销毁的容器引用，
  //    重新进入游戏（读档/重挂）时若不重建，updateStaticBackground 对已销毁容器调用
  //    cont.scale.set 会报 "Cannot read properties of null (reading 'set')"（仅 tiled 地图受影响）。
  //    → 检测到已销毁容器时删除缓存，强制重新加载一份新容器。
  const cached = tiledCache.get(url);
  if (cached && cached.container && cached.container.destroyed) {
    tiledCache.delete(url);
  }
  if (!tiledCache.has(url)) {
    const asset = await loadTiledMapAsset(url, { loadAsset: tiledLoadAsset });
    tiledCache.set(url, asset);
  }
  return tiledCache.get(url);
}

/** 同步读取已缓存的 tiled 资源（未加载返回 null） */
export function getTiledMapCached(url) {
  const asset = tiledCache.get(url);
  // 🐛 兜底保护：缓存容器若已被销毁（app.destroy 后遗留），删除缓存并返回 null，
  //    避免外部拿到已销毁容器后调用 .set 报错
  if (asset && asset.container && asset.container.destroyed) {
    tiledCache.delete(url);
    return null;
  }
  return asset || null;
}

/**
 * 收集每个 tileset 中带 `solid=true` 的瓦片 localId 集合
 * @param {ResolvedMap} mapData - pixi-tiledmap 解析后的地图数据
 * @returns {Set<number>[]} 按 tilesetIndex 对应的 solid localId 集合
 */
export function collectSolidTiles(mapData) {
  return mapData.tilesets.map(ts => {
    const solid = new Set();
    const tiles = ts?.tiles; // Map<number, TiledTileDefinition>
    if (!tiles) return solid;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const solidProp = props.find(p => p.name === 'solid');
      if (solidProp && (solidProp.value === true || solidProp.value === 'true' || solidProp.value === 1)) {
        solid.add(localId);
      }
    }
    return solid;
  });
}


/**
 * 生成 solid 网格（1 = 实心）。遍历所有可见 tilelayer，按 gid→tileset 判定。
 * 兼容普通图层与 infinite 分块（chunks）。
 * @returns {number[][]} grid[row][col]
 */
export function buildSolidGrid(mapData, solidTiles) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));

  const mark = (col, row) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = 1;
  };

  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      // infinite 分块
      for (const chunk of layer.chunks) {
        const cw = chunk.width, ch = chunk.height;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = solidTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            const col = chunk.x + (i % cw);
            const row = chunk.y + Math.floor(i / cw);
            mark(col, row);
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = solidTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w));
        }
      }
    }
  }
  return grid;
}

/**
 * 把 solid 网格合并成「非重叠」的最大矩形（按列范围完全一致才纵向合并）
 * @returns {{c0:number,c1:number,top:number,height:number}[]}
 */
export function mergeSolidRects(grid) {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const rects = [];
  const active = new Map(); // key "c0,c1" -> {c0,c1,top,height}

  for (let r = 0; r < h; r++) {
    // 本行水平 run
    const runs = [];
    let c = 0;
    while (c < w) {
      if (grid[r][c]) {
        let c2 = c;
        while (c2 < w && grid[r][c2]) c2++;
        runs.push({ c0: c, c1: c2 - 1 });
        c = c2;
      } else c++;
    }
    const runKeys = new Set(runs.map(x => `${x.c0},${x.c1}`));
    // 关闭无延续的 active
    for (const [key, rect] of active) {
      if (!runKeys.has(key)) {
        rects.push(rect);
        active.delete(key);
      }
    }
    // 延续或新建
    for (const run of runs) {
      const key = `${run.c0},${run.c1}`;
      if (active.has(key)) active.get(key).height++;
      else active.set(key, { c0: run.c0, c1: run.c1, top: r, height: 1 });
    }
  }
  for (const rect of active.values()) rects.push(rect);
  return rects;
}
// 碰撞体Y轴向下偏移量（VH单位，数值越大下陷越多，建议1~3，按需微调）
const TILED_COLLISION_Y_OFFSET = 15;

export function buildTiledCollisionRects(mapData, scale = 1, opts = {}) {
  const { obstacleRaiseCells = 1.5, worldYOffset = 0 } = opts;
  const solidTiles = collectSolidTiles(mapData);
  const grid = buildSolidGrid(mapData, solidTiles);
  const tw = mapData.tilewidth, th = mapData.tileheight;
  const mapBottomPx = mapData.height * th;
  // 🎯 底部锚点：世界 y 从地图底部往上计算（配合 tiled 容器 pivot 左下角锚点）
  const mapHeightPx = mapData.height * th;
  return mergeSolidRects(grid).map(r => {
    const bottomPx = (r.top + r.height) * th;
    const isObstacle = bottomPx < mapBottomPx - 1; // 不触底 = 障碍物（悬浮平台）
    const raisePx = isObstacle ? obstacleRaiseCells * th : 0; // 顶部抬高（tmj 像素）

    // ===================== 核心修改：碰撞体底部整体向下偏移 =====================
    const offsetWorldY = TILED_COLLISION_Y_OFFSET * scale;
    // 🎯 底部锚点：地图底部对齐 worldYOffset（地面线），矩形底部 y = (bottomPx - mapHeightPx)*scale + 偏移
    //    地图加高（mapHeightPx 变大）时，地面矩形 bottomPx 同增，差值不变 → 地面碰撞位置固定
    const finalY = (bottomPx - mapHeightPx) * scale + offsetWorldY + worldYOffset;

    return {
      // ⚠️ 游戏矩形约定：x = 中心 x，y = 底部，矩形从 y-h 向上延伸到 y
      x: (r.c0 + (r.c1 - r.c0 + 1) / 2) * tw * scale,
      y: finalY, // 底部坐标下移，碰撞盒整体下沉
      w: (r.c1 - r.c0 + 1) * tw * scale,
      h: (r.height * th + raisePx) * scale,
      // 🎯 阴影表面用：真实顶面世界 y（不含碰撞 OFFSET，保证阴影贴地位置与主地面 groundTopY 一致）
      _topY: (bottomPx - mapHeightPx - (r.height * th + raisePx)) * scale + worldYOffset,
    };
  });
}

/**
 * 自动计算地图边界（tmj 像素宽高 × 缩放）
 * @returns {{width:number,height:number}}
 */
export function getTiledBounds(mapData, scale = 1) {
  return {
    width: mapData.width * mapData.tilewidth * scale,
    height: mapData.height * mapData.tileheight * scale,
  };
}

/**
 * 计算「地面顶部」的 Tiled 像素 y（供出生点使用）
 * 规则：取触碰地图底部的实心块的顶边（主地面）。
 * @returns {number} Tiled 像素 y（0 = 地图顶部）
 */
export function getGroundTopTiledY(mapData) {
  const solidTiles = collectSolidTiles(mapData);
  const grid = buildSolidGrid(mapData, solidTiles);
  const rects = mergeSolidRects(grid);
  const th = mapData.tileheight;
  const mapBottomPx = mapData.height * th;
  // 触碰底部的实心块（如主地面）
  const bottom = rects.find(r => (r.top + r.height) * th >= mapBottomPx - 1);
  return bottom ? bottom.top * th : 0;
}
