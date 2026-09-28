/**
 * 地牢地图解析模块：Tiled 对象层读取 + 网格构建 + 网格查询
 * 从 dungeon.vue 拆出。
 *
 * 共享状态通过 initMapReader(env) 注入：
 *  - 快照型（加载地图时设定，层内不变）：mapW/mapH/tileW/tileH/scale/currentWeather/各网格/isWalkable
 *  - 引用型：sealLayerCells（对象引用恒定）
 *  - getter 型（主文件会重新赋值的数组/对象）：sealZones/preSealedZones/sealLayers/triggers
 */
import { t } from "@/i18n";

let mapW = 0, mapH = 0, tileW = 0, tileH = 0, scale = 1;
let getCurrentWeather = () => 'sunny'; // getter 型（主文件在战斗返回时可能重随机天气）
let glassGrid = null, terrainGrid = null, visionGrid = null;
let mudSpeedMultiplier = 1.0; // 🟤 当前地图泥地瓦片移速倍率（雨天岩浆浇灭变泥地用，各图可不同）
let iceGrid = null, waterGrid = null, damageGrid = null, sandGrid = null;
let puddleGrid = null; // 💧 雨洼网格（puddle=true 的瓦片格子，雨天渲染雨洼）
let terrainNameGrid = null; // 🗺️ 瓦片名称网格（tiled terrain 属性名，每格显示用）
let isWalkable = () => true;
let sealLayerCells = {}; // 引用型（对象引用恒定）

// getter 型依赖（主文件会重新赋值数组/对象，需动态读取）
let getSealZones = () => [];
let getPreSealedZones = () => [];
let getSealLayers = () => ({});
let getTriggers = () => [];

// 敌人 id 计数器（跨模块共享同一对象）
export const enemyIdCounter = { value: 0 };

/** 注入共享状态（在 loadMapForLevel 网格构建完成后调用；getter 型每次读取最新） */
export function initMapReader(env) {
  mapW = env.mapW; mapH = env.mapH; tileW = env.tileW; tileH = env.tileH; scale = env.scale;
  if (typeof env.getCurrentWeather === 'function') getCurrentWeather = env.getCurrentWeather;
  else if (typeof env.currentWeather !== 'undefined') {
    // 兼容直接传值（转成 getter，始终读最新）
    const v = env.currentWeather;
    getCurrentWeather = () => v;
  }
  glassGrid = env.glassGrid; terrainGrid = env.terrainGrid; visionGrid = env.visionGrid;
  iceGrid = env.iceGrid; waterGrid = env.waterGrid; damageGrid = env.damageGrid; sandGrid = env.sandGrid;
  puddleGrid = env.puddleGrid; // 💧 雨洼网格
  terrainNameGrid = env.terrainNameGrid; // 🗺️ 瓦片名称网格
  if (typeof env.isWalkable === 'function') isWalkable = env.isWalkable;
  if (env.sealLayerCells) sealLayerCells = env.sealLayerCells;
  if (typeof env.getSealZones === 'function') getSealZones = env.getSealZones;
  if (typeof env.getPreSealedZones === 'function') getPreSealedZones = env.getPreSealedZones;
  if (typeof env.getSealLayers === 'function') getSealLayers = env.getSealLayers;
  if (typeof env.getTriggers === 'function') getTriggers = env.getTriggers;
}

/** 读取当前天气（getter，实时） */
function currentWeather() {
  return getCurrentWeather();
}

// ========== 对象层读取（出生点 + 道具） ==========
export function readSpawnFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const obj = layer?.objects?.find(o => o.name === 'spawn');
  if (!obj) return null;
  const col = Math.floor(obj.x / mapData.tilewidth);
  const row = Math.floor(obj.y / mapData.tileheight);
  if (col < 0 || col >= mapW || row < 0 || row >= mapH) return null;
  if (!isWalkable(col, row)) return null;
  // 🚪 是否显示"离开地牢"按钮（spawn 对象属性 showLeave，默认 true）
  const props = {};
  for (const p of obj.properties || []) props[p.name] = p.value;
  const showLeave = props.showLeave === undefined ? true : (props.showLeave === true || String(props.showLeave).toLowerCase() === 'true');
  return { col, row, showLeave };
}

// 🚪 读取所有 spawn 出生点（支持同一地图多个 spawn 点；属性 initial=true 的点为指定初始出生点）
export function readSpawnsFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const result = [];
  for (const obj of layer?.objects || []) {
    if (obj.name !== 'spawn') continue;
    const col = Math.floor(obj.x / mapData.tilewidth);
    const row = Math.floor(obj.y / mapData.tileheight);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    if (!isWalkable(col, row)) continue;
    const props = {};
    for (const p of obj.properties || []) props[p.name] = p.value;
    const showLeave = props.showLeave === undefined ? true : (props.showLeave === true || String(props.showLeave).toLowerCase() === 'true');
    const initial = props.initial === true || String(props.initial).toLowerCase() === 'true'; // 🏳️ 指定初始出生点（不随机）
    result.push({ col, row, showLeave, initial });
  }
  return result;
}

export function readPickupItemsFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const items = [];
  const objs = layer?.objects || [];
  for (let oi = 0; oi < objs.length; oi++) {
    const o = objs[oi];
    if (o.name !== 'item') continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    if (!props.itemId) continue;
    const col = Math.floor(o.x / mapData.tilewidth);
    // 道具对象是瓦片对象：瓦片 sprite.y = obj.y - 瓦片高（底边对齐），故格 row = floor(y/32) - 1
    const row = Math.floor(o.y / mapData.tileheight) - 1;
    if (!isWalkable(col, row)) continue;
    items.push({
      col, row,
      objIndex: oi, // 对象在 tmj objects 里的顺序索引（对象层渲染器 children 顺序与之一致）
      px: o.x, py: o.y, // 对象像素坐标（兜底匹配用）
      itemId: String(props.itemId), num: Number(props.num) || 1,
      img: props.img ? String(props.img) : null, taken: false,
    });
  }
  return items;
}

// 🎲 读取"可刷新道具图层"：层名以 items_respawn_ 开头的对象层（如 items_respawn_1 / items_respawn_2）
//   进入地牢时从这些图层中随机选取一个作为本次的道具物资刷新点；
//   选中层里的 item 对象（与 dungeon_objects 的 item 同格式：itemId/num/img + 瓦片 gid）成为本层可拾取道具。
//   返回 [{ layerName, items: [...] }, ...]（保持图层顺序），支持后续扩展三、四个图层。
export function readRespawnItemLayers(mapData) {
  const result = [];
  for (const layer of mapData.layers || []) {
    if (layer.type !== 'objectgroup') continue;
    if (!layer.name || !/^items_respawn_/i.test(layer.name)) continue;
    const items = [];
    for (let oi = 0; oi < (layer.objects || []).length; oi++) {
      const o = layer.objects[oi];
      if (o.name !== 'item') continue;
      const props = {};
      for (const p of o.properties || []) props[p.name] = p.value;
      if (!props.itemId) continue;
      // 拾取格对齐 respawn 道具手动 Sprite 的显示中心（dungeon.vue 中 Sprite 中心 = (obj.x + tileW/2, obj.y - tileW/2)），
      // 保证"玩家走到道具显示的那一格"才拾取，避免对象未居中时提前一格拾取。
      const col = Math.floor((o.x + mapData.tilewidth / 2) / mapData.tilewidth);
      const row = Math.floor((o.y - mapData.tileheight / 2) / mapData.tileheight);
      if (!isWalkable(col, row)) continue;
      items.push({
        col, row,
        objIndex: oi, // 对象在 tmj objects 里的顺序索引（对象层渲染器 children 顺序与之一致）
        px: o.x, py: o.y, // 对象像素坐标（兜底匹配用）
        itemId: String(props.itemId), num: Number(props.num) || 1,
        img: props.img ? String(props.img) : null, taken: false,
        respawn: true, layerName: layer.name, // 🎲 标记为可刷新道具 + 所属图层
        // 🎯 天气限定刷新（Tiled item 自定义属性，仅对可刷新道具生效）：
        //   weather：逗号分隔天气列表（如 "rain,storm"），空/未设置=不限天气
        //   refreshChance：0~100，该格刷出概率
        //   id：限量分组标识（同 id 的 item 共享 maxCount 上限）；不配 id 则不受限量
        //   maxCount：同 id 分组内合计最多刷出数量（取组内各 maxCount 最小值）
        weatherList: props.weather != null && props.weather !== ''
          ? String(props.weather).split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
          : null,
        refreshChance: props.refreshChance != null && props.refreshChance !== ''
          ? Math.max(0, Math.min(100, Number(props.refreshChance)))
          : null,
        groupId: props.id != null && props.id !== '' ? String(props.id) : null,
        maxCount: props.maxCount != null && props.maxCount !== ''
          ? Math.max(0, Math.floor(Number(props.maxCount)))
          : null,
      });
    }
    if (items.length) result.push({ layerName: layer.name, items });
  }
  return result;
}

// 🏰 读取对象层的"进入下一层"入口（stairs point，坐标与 spawn 一致：格左上角）
export function readStairsFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const obj = layer?.objects?.find(o => o.name === 'stairs');
  if (!obj) return null;
  const col = Math.floor(obj.x / mapData.tilewidth);
  const row = Math.floor(obj.y / mapData.tileheight);
  if (col < 0 || col >= mapW || row < 0 || row >= mapH) return null;
  const props = {};
  for (const p of obj.properties || []) props[p.name] = p.value;
  const targetLevel = Number(props.targetLevel) || 2;
  const cost = Math.max(0, Number(props.cost) || 0);
  // 💬 下楼后触发对话（进入下一层后打开对话框，参考 NPC 的 dialogRoute 条件路由）
  const dialogLoadData = props.dialogLoadData ? String(props.dialogLoadData) : null;
  const dialogRoute = (() => {
    try {
      const parsed = JSON.parse(String(props.dialogRoute || '[]'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  })();
  return { col, row, targetLevel, cost, dialogLoadData, dialogRoute };
}

// 🎨 解析光源颜色（支持 "#ff6b81" / "0xff6b81" 字符串或数字），失败回退默认暖黄
function parseLightColor(v, fallback = 0xffd98c) {
  if (v == null || v === '') return fallback;
  let s = String(v).trim();
  if (s.startsWith('#')) s = '0x' + s.slice(1);
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

// 💡 读取对象层的光点（light point）：照亮周围 radius 格的迷雾，radius 在 tiled 属性里设置
export function readLightsFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const lights = [];
  for (const o of layer?.objects || []) {
    if (o.name !== 'light') continue;
    const col = Math.floor(o.x / mapData.tilewidth);
    const row = Math.floor(o.y / mapData.tileheight);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    const radius = Math.max(1, Number(props.radius) || 3);
    // 光线是否可以穿过障碍物（布尔值，默认 false 不可以穿过）
    const canPassWall = props.canPassWall === true || String(props.canPassWall).toLowerCase() === 'true';
    // 💡 光源色温：tiled light 对象自定义属性 color（如 "#ff6b81" 暖红火把 / "#7fd4ff" 冷蓝魔法），缺省暖黄
    const color = parseLightColor(props.color);
    lights.push({ col, row, radius, canPassWall, color });
  }
  return lights;
}

// 🚪 读取对象层的封印出口感应区（sealExit）：玩家进入后在指定格子添加障碍物墙壁
export function readSealZonesFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const zones = [];
  const tw = mapData.tilewidth, th = mapData.tileheight;
  for (const o of layer?.objects || []) {
    if (o.type !== 'sealExit' && o.name !== 'sealExit') continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    const col = Math.floor(o.x / tw);
    const row = Math.floor(o.y / th);
    const w = Math.max(1, Math.floor((o.width || tw) / tw));
    const h = Math.max(1, Math.floor((o.height || th) / th));
    // sealCells 由 syncSealCellsFromLayers 从同名 seal 图层自动读取（seal 图层里画了哪些瓦片，哪些格子就是封印障碍物）
    zones.push({
      id: String(o.name || o.id || 'seal_' + zones.length),
      col, row, w, h,
      once: (() => {
        // 🐛 修复：Tiled 里 once 可能是字符串 "true"/"false"，需要正确解析
        const v = props.once;
        if (v === false || v === 'false' || v === 0) return false;
        if (v === true || v === 'true' || v === 1) return true;
        return true; // 默认只触发一次
      })(),
      sealCells: [],
      message: String(props.message || t('sealBlocked')),
      unlockType: String(props.unlockType || 'killAllEnemies'),
      unlockMessage: String(props.unlockMessage || t('sealUnlocked')),
      triggered: false,
      unlocked: false,
    });
  }
  return zones;
}

// 🔒 读取预封印区域（一开始就封锁，满足解锁条件后解除）
export function readPreSealedZonesFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const zones = [];
  for (const o of layer?.objects || []) {
    if (o.type !== 'preSealed' && o.name !== 'preSealed') continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    // sealCells 由 syncSealCellsFromLayers 从同名 seal 图层自动读取
    zones.push({
      id: String(o.name || o.id || 'preSeal_' + zones.length),
      sealCells: [],
      unlockType: String(props.unlockType || 'killAll'),
      unlockTarget: String(props.unlockTarget || ''),
      message: String(props.message || ''),
      unlockMessage: String(props.unlockMessage || t('sealUnlockedSimple')),
      unlocked: false,
    });
  }
  return zones;
}

// 🔘 读取地图开关（玩家触碰后激活，可解锁预封印区域）
export function readSwitchesFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const list = [];
  const tw = mapData.tilewidth, th = mapData.tileheight;
  for (const o of layer?.objects || []) {
    if (o.type !== 'switch' && o.name !== 'switch') continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    const col = Math.floor(o.x / tw);
    const row = Math.floor(o.y / th);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    list.push({
      id: String(o.id || o.name),
      switchId: String(props.switchId || o.name || 'switch'),
      col, row,
      message: String(props.message || t('switchPressed')),
      activated: false,
    });
  }
  return list;
}

// 🚪 从瓦片层自动读取有墙壁的格子，同步到封印区域（用户在 Tiled 瓦片层画了墙壁就自动生效）
export function syncSealCellsFromLayers(mapData) {
  const w = mapData.width, h = mapData.height;
  const sealLayers = getSealLayers();
  const preSealedZones = getPreSealedZones();
  const sealZones = getSealZones();
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer') continue;
    if (!layer.name || !layer.name.startsWith('seal_')) continue;
    const sealId = layer.name.replace('seal_', '');
    const cells = [];
    // 读取图层属性：initVisible（是否开局渲染，默认 true）+ unlockType/unlockTarget/unlockMessage（解锁条件）
    const props = layer.properties || [];
    const initVisibleProp = props.find(p => p.name === 'initVisible');
    const initVisible = initVisibleProp ? initVisibleProp.value !== false : true;
    const unlockTypeProp = props.find(p => p.name === 'unlockType');
    const unlockTargetProp = props.find(p => p.name === 'unlockTarget');
    const unlockMessageProp = props.find(p => p.name === 'unlockMessage');
    // pixi-tiledmap 解析后用 tiles/chunks 格式，不是原始 data
    const mark = (col, row) => {
      if (col >= 0 && col < w && row >= 0 && row < h) cells.push([col, row]);
    };
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (tile) mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw));
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (tile) mark(i % w, Math.floor(i / w));
      }
    } else if (layer.data) {
      // 兜底：原始 data 格式（gid 数组）
      for (let i = 0; i < layer.data.length; i++) {
        if (layer.data[i] > 0) mark(i % w, Math.floor(i / w));
      }
    }
    // 🗺️ 保存该 seal 图层的格子（供 interact 解锁时解封）
    sealLayerCells[sealId] = cells;
    // 同步到预封印区域（解锁条件优先用图层属性，方便在 Tiled 里直接配置）
    for (const z of preSealedZones) {
      if (z.id === sealId) {
        z.sealCells = cells;
        if (unlockTypeProp) z.unlockType = String(unlockTypeProp.value);
        if (unlockTargetProp) z.unlockTarget = String(unlockTargetProp.value);
        if (unlockMessageProp) z.unlockMessage = String(unlockMessageProp.value);
     
      }
    }
    // 同步到感应区封印
    for (const z of sealZones) {
      if (z.id === sealId) {
        z.sealCells = cells;
       
      }
    }
    // 🚪 设置渲染层初始可见性（initVisible=false 的图层开局隐藏，触发后才显示）
    const renderLayer = sealLayers[sealId];
    if (renderLayer) {
      renderLayer.visible = initVisible;
      renderLayer.alpha = initVisible ? 1 : 0;
      if (!initVisible) {
        const hideChildren = (c) => {
          if (!c.children) return;
          for (const child of c.children) {
            child.visible = false;
            child.alpha = 0;
            hideChildren(child);
          }
        };
        hideChildren(renderLayer);
      }
    
    }
  }
}

// ========== 敌人系统 ==========
// 👾 读取对象层的敌人复活点（enemy point），enemies 属性为 JSON 数组，可包含多种不同敌人
// layerName：默认读取 dungeon_objects；也可传入其他对象层名（如埋击层 dungeon_ambush）
export function readEnemiesFromMap(mapData, layerName = 'dungeon_objects') {
  const list = [];
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === layerName);
  if (layerName === 'dungeon_objects') enemyIdCounter.value = 0; // 每次加载地图重置 id 计数器，确保敌人 id 稳定
  for (const o of layer?.objects || []) {
    if (o.name !== 'enemy') continue;
    const col = Math.floor(o.x / mapData.tilewidth);
    const row = Math.floor(o.y / mapData.tileheight);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    if (!isWalkable(col, row)) continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    // 解析 enemies JSON 数组（可包含多种不同敌人）
    let enemies = [];
    try {
      const parsed = JSON.parse(String(props.enemies || '[]'));
      if (Array.isArray(parsed)) enemies = parsed;
    } catch (err) {
      // 🛡️ 容错：Tiled 里手写 JSON 时可能用全角冒号「：」/全角逗号「，」/裸键名（无引号），
      //    导致 JSON.parse 失败 → enemies=[] → 敌人不创建不显示。这里宽松修复后重试：
      //    ① 全角符号转半角  ② 给裸键名补双引号（如 ,speed:60 → ,"speed":60）③ 单引号转双引号
      let raw = String(props.enemies || '[]');
      raw = raw.replace(/：/g, ':').replace(/，/g, ',').replace(/（/g, '(').replace(/）/g, ')')
        .replace(/“|”/g, '"').replace(/‘|’/g, "'").trim();
      // 裸键补引号：捕获 { 或 , 后面的键名（不含引号）直到 :，给键名加双引号
      raw = raw.replace(/([,{]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
      // 单引号键/值转双引号（值里的单引号字符串也转，避免嵌套问题）
      raw = raw.replace(/'([^']*)'/g, '"$1"');
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) enemies = parsed;
        else console.warn('[地牢敌人] enemies 宽松解析后非数组:', String(props.enemies || '').slice(0, 120));
      } catch (err2) {
        console.warn('[地牢敌人] enemies JSON 解析失败:', String(props.enemies || '').slice(0, 120));
        enemies = [];
      }
    }
    if (enemies.length === 0) continue;
    // 🎲 概率掉落表（Tiled enemy 自定义属性 dropRates）：JSON [{"item":"魔晶LV1","base":0.15}, ...]
    //    战斗胜利后按 base 独立概率判定掉落；与 dropItems（固定数量掉落）并存
    let dropRates = [];
    try {
      const parsed = JSON.parse(String(props.dropRates || '[]'));
      if (Array.isArray(parsed)) dropRates = parsed;
    } catch (err) {
      // 🛡️ 容错：全角符号/裸键名/单引号（与 enemies 相同的宽松修复）
      let raw = String(props.dropRates || '[]');
      raw = raw.replace(/：/g, ':').replace(/，/g, ',').replace(/（/g, '(').replace(/）/g, ')')
        .replace(/“|”/g, '"').replace(/‘|’/g, "'").trim();
      raw = raw.replace(/([,{]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
      raw = raw.replace(/'([^']*)'/g, '"$1"');
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) dropRates = parsed;
      } catch (err2) { dropRates = []; }
    }
    // 显示用第一种敌人的名称和 spine
    const first = enemies[0];
    // 🏷️ 敌人 id：优先用 Tiled 对象自定义属性 enemyId，没有则用自增数字兜底
    const customEnemyId = props.enemyId ? String(props.enemyId) : String(++enemyIdCounter.value);
    list.push({
      id: customEnemyId,
      spawnCol: col, spawnRow: row,
      col, row,
      px: (col + 0.5) * tileW * scale,
      py: (row + 0.5) * tileH * scale,
      enemies,                          // 多种敌人配置数组
      displayName: String(first.name || t('enemyFallbackName')),
      dropRates,                           // 🎲 概率掉落表（[{item,base}]，Tiled dropRates 属性）
      // spine 资源 key：优先用对象级别的 spine 属性（Tiled 里直接加），没有再用 enemies 数组第一个的 spine
      spineKey: String(props.spine || first.spine || 'dilaoQ'),
      forceDilaoQ: props.forceDilaoQ === true, // 🧪 局部开关：true 时强制用主角 dilaoQ，false 时用 spineKey 配置的资源
      // 🔍 头像放大倍率（Tiled enemy 自定义属性 scale，默认 1；魔化猫等可在 tiled 里调大）
      scale: Math.max(0.1, Number(props.scale) || 1),
      // 🏃 逃跑型敌人：Tiled 勾选 flee=true 后，玩家靠近 fleeRange 格内会远离玩家移动（不索敌不追击）
      flee: props.flee === true,
      fleeRange: Math.max(1, Number(props.fleeRange) || 3),
      // 🌑 暗影怪判定：spine 为 monster1 / daanyingguai，或 tiled 显式勾选 isShadow=true → 转为暗影怪行为（不进入战斗、触碰停留扣血、掉 SHADOW_DROPS）
      isShadow: props.isShadow === true || ['monster1', 'daanyingguai'].includes(String(props.spine || first.spine || '').trim().toLowerCase()),
      aggroRadius: Math.max(1, Number(props.aggroRadius) || 5),
      speed: Math.max(0.5, Number(props.speed) || 2.5),
      // 👁️ 扇形视野（弧度，默认120度）
      fovAngle: Math.max(0.3, (Number(props.fovAngle) || 120) * Math.PI / 180),
      // 初始朝向角度（弧度）：右=0, 下=PI/2, 左=PI, 上=-PI/2
      facing: ( { front: Math.PI / 2, back: -Math.PI / 2, left: Math.PI, right: 0 } )[String(props.facing || 'front')] ?? Math.PI / 2,
      // 🏃 追击脱离距离 & 巡逻范围
      chaseRange: Math.max((Number(props.aggroRadius) || 5) + 2, Number(props.chaseRange) || ((Number(props.aggroRadius) || 5) * 2)),
      patrolRange: Math.max(1, Number(props.patrolRange) || 3),
      closeRange: Math.max(0.5, Number(props.closeRange) || 1.5), // 近身圆形索敌半径（格），此范围内无视方向
      patrolTimer: 0,
      loseTargetTimer: 0,
      sprite: null,
      visionSprite: null,  // 索敌范围可视化 Graphics
      alertSprite: null,   // 追击红色感叹号
      lastTargetCol: -1, lastTargetRow: -1, // 上次寻路目标（用于检测玩家移动）
      state: 'patrol',  // 初始巡逻（patrol/chase）
      path: [],
      moveTimer: 0,
      aggroed: false,
      defeated: false,
      headName: null,
      // 💬 战斗后对话配置（Tiled 布尔值 dialogAfterBattle=true 时，击败该敌人后触发对话）
      dialogAfterBattle: props.dialogAfterBattle === true, // 🔔 是否战斗后进入对话
      noRespawn: props.noRespawn === true, // 💀 特殊敌人：true=重新进入地牢也不复活（永不复活）
      dialogBeforeBattle: props.dialogBeforeBattle === true, // 💬 是否战斗前进入对话（仅 dialogAfterBattle=true 时生效；true=战斗前先对话再战斗，false=战斗结束后对话）
      dialogLoadData: props.dialogLoadData ? String(props.dialogLoadData) : null, // 对话数据路径（如 'npc/jingling'）
      dialogName: props.dialogName ? String(props.dialogName) : null, // 默认对话名
      dialogRoute: (() => { // 条件路由数组（JSON，条件判断选择对话）
        try {
          const parsed = JSON.parse(String(props.dialogRoute || '[]'));
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          try {
            const cleaned = String(props.dialogRoute || '[]').replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\s+/g, ' ');
            const parsed = JSON.parse(cleaned);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e2) { return []; }
        }
      })(),
      // 🎁 击败掉落道具（Tiled 属性 dropItems，JSON 数组）：
      //   [{"item":"魔晶","count":2},{"item":"草药","count":1}]（item=道具名，count=数量）
      dropItems: (() => {
        try {
          const parsed = JSON.parse(String(props.dropItems || '[]'));
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          try {
            const cleaned = String(props.dropItems || '[]')
              .replace(/\n/g, ' ').replace(/\t/g, ' ').replace(/s+/g, ' ')
              .replace(/：/g, ':').replace(/，/g, ',');
            const parsed = JSON.parse(
              cleaned.replace(/([,{]s*)([A-Za-z_][A-Za-z0-9_]*)(s*:)/g, '$1"$2"$3').replace(/'([^']*)'/g, '"$1"')
            );
            return Array.isArray(parsed) ? parsed : [];
          } catch (e2) { return []; }
        }
      })(),
    });
  }
  return list;
}

// 🧑 读取地牢 NPC 标记点（装饰性 spine 角色）
export function readNpcsFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const list = [];
  for (const o of layer?.objects || []) {
    if (o.name !== 'npc') continue;
    const col = Math.floor(o.x / mapData.tilewidth);
    const row = Math.floor(o.y / mapData.tileheight);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    list.push({
      col, row,
      id: o.id, // 🎯 tiled 对象 id（对话 moveNpcOnEnd 用 npcId 定位）
      // 🏷️ npcId：NPC 唯一标识（代码配置表 npcConfig.js 的 NPC_CONFIG 决定对话/行为，
      //    没填用 tiled 对象 id；tiled 里配的旧对话字段仍保留作为兼容兜底）
      npcId: String(props.npcId || o.id || 'npc_' + list.length),
      px: (col + 0.5) * tileW * scale,
      py: (row + 0.5) * tileH * scale,
      spineKey: String(props.spine || 'NPCQ'),   // spine 资源 key（参考 loadAssets.js）
      scale: Math.max(0.1, Number(props.scale) || 1),  // 缩放大小
      animation: props.animation ? String(props.animation) : null, // 播放的动画（未指定则不播放）
      loop: props.loop !== false, // 是否循环播放（默认 true）
      skin: props.skin ? String(props.skin) : null, // 指定皮肤（未指定则默认）
      isHead: props.isHead === true, // 🎭 是否是头像（是头像则不播放动画，只静态显示皮肤）
      speed: Math.max(0.5, Number(props.speed) || 5), // 🏃 移动速度（格/秒，默认 5，比玩家快，逃跑才追不上）
      flee: props.flee === true, // 🏃 逃跑型 NPC：玩家靠近会远离玩家移动（Tiled 布尔值，默认不勾选）
      fleeRange: Math.max(1, Number(props.fleeRange) || 3), // 🏃 玩家靠近多少格内开始逃跑（默认 3）
      fleeStuck: 0, // ⏱️ 重叠/无路可逃时的停留倒计时（0 = 可正常选目标逃跑）
      forceDilaoQ: props.forceDilaoQ === true, // 🧪 局部开关：true 时强制用主角 dilaoQ 渲染，false 时用 spine 属性配置的资源
      merchant: props.merchant === true, // 💰 商人：触碰后右下角互动可交易，点击打开商店
      needTask: props.needTask ? String(props.needTask) : null, // 🔒 任务门禁：需接到该任务后才能互动对话（任务 id，如 'find_liya'）
      // 💬 触碰对话配置（玩家走到 NPC 格子时触发）
      dialogLoadData: props.dialogLoadData ? String(props.dialogLoadData) : null, // 对话数据路径（如 'npc/jingling'）
      dialogName: props.dialogName ? String(props.dialogName) : null,             // 默认对话名（如 'hl01'）
      dialogRoute: (() => {                                                          // 对话路由（JSON数组，条件判断选择对话）
        const raw = String(props.dialogRoute || '[]');
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          // 容错：Tiled 里可能存了字面量 \n 等转义字符，清理后重试
          try {
            const cleaned = raw.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\s+/g, ' ');
            const parsed = JSON.parse(cleaned);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e2) {
            console.warn('[地牢NPC] dialogRoute JSON解析失败:', raw);
            return [];
          }
        }
      })(),
      sprite: null,
    });
  }
  return list;
}

// 📦 从 Tiled 对象层读取可推动障碍物（pushable）
export function readObstaclesFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const list = [];
  for (const o of layer?.objects || []) {
    if (o.name !== 'pushable') continue;
    if (o.visible === false) continue; // 👻 tiled 中隐藏的木箱不生成
    const col = Math.floor(o.x / mapData.tilewidth);
    const row = Math.floor(o.y / mapData.tileheight);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    list.push({
      type: 'pushable',
      col, row,
      initCol: col, initRow: row, // 🔄 保存初始位置（重置时恢复）
      px: (col + 0.5) * tileW * scale,
      py: (row + 0.5) * tileH * scale,
      locked: false,
    });
  }
  return list;
}

// 🪟 收集 glass=true 的瓦片并构建玻璃网格（阻挡移动但不阻挡视野）
export function buildGlassGrid(mapData) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));
  // 收集每个 tileset 中 glass=true 的瓦片 localId（和 collectSolidTiles 同样的 Map 遍历方式）
  const glassTiles = mapData.tilesets.map(ts => {
    const glass = new Set();
    const tiles = ts?.tiles; // Map<number, TiledTileDefinition>
    if (!tiles) return glass;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const glassProp = props.find(p => p.name === 'glass');
      if (glassProp && (glassProp.value === true || String(glassProp.value).toLowerCase() === 'true')) {
        glass.add(localId);
      }
    }
    return glass;
  });
  // 遍历瓦片层，标记玻璃格子（和 buildSolidGrid 同样的方式：layer.tiles / chunks）
  const mark = (col, row) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = 1;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = glassTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw));
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = glassTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w));
        }
      }
    }
  }
  return grid;
}

// 🪟 检查指定格子是否是玻璃（阻挡移动但不阻挡视野）
export function isGlassCell(col, row) {
  if (!glassGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return false;
  return glassGrid[row][col] === 1;
}

// 🌊 构建地形网格：收集每个格子的 speedMultiplier 属性（1.0=正常，<1=减速，>1=加速）
export function buildTerrainGrid(mapData) {
  // 🟤 记录当前地图泥地瓦片倍率（雨天岩浆浇灭变泥地时使用）
  mudSpeedMultiplier = 1.0;
  for (const ts of mapData.tilesets) {
    const tiles = ts?.tiles; if (!tiles) continue;
    for (const [localId, def] of tiles) {
      const props = def?.properties; if (!props) continue;
      const terr = props.find(p => p.name === 'terrain')?.value;
      if (terr === '泥地') {
        const sp = props.find(p => p.name === 'speedMultiplier');
        const val = Number(sp?.value);
        if (isFinite(val) && val > 0) { mudSpeedMultiplier = val; }
      }
    }
  }
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(1.0));
  // 收集每个 tileset 中带 speedMultiplier 的瓦片 localId → 倍率
  const speedTiles = mapData.tilesets.map(ts => {
    const map = new Map();
    const tiles = ts?.tiles;
    if (!tiles) return map;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const sp = props.find(p => p.name === 'speedMultiplier');
      if (sp) {
        const val = Number(sp.value);
        if (isFinite(val) && val > 0) map.set(localId, val);
      }
    }
    return map;
  });
  // 遍历瓦片层，标记地形倍率
  const mark = (col, row, mult) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = mult;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = speedTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw), ts.get(tile.localId));
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = speedTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w), ts.get(tile.localId));
        }
      }
    }
  }
  return grid;
}

// 🗺️ 构建瓦片名称网格：收集每个格子的 terrain 属性名（tiled 瓦片自定义属性）
export function buildTerrainNameGrid(mapData) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(''));
  const nameTiles = mapData.tilesets.map(ts => {
    const map = new Map();
    const tiles = ts?.tiles;
    if (!tiles) return map;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const terr = props.find(p => p.name === 'terrain');
      if (terr && terr.value) map.set(Number(localId), String(terr.value)); // 🔧 Number 归一（tmj localId 可能是字符串）
    }
    return map;
  });
  const mark = (col, row, name) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = name;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = nameTiles[tile.tilesetIndex];
          if (ts && ts.has(Number(tile.localId))) mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw), ts.get(Number(tile.localId))); // 🔧 Number 归一
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = nameTiles[tile.tilesetIndex];
        if (ts && ts.has(Number(tile.localId))) mark(i % w, Math.floor(i / w), ts.get(Number(tile.localId))); // 🔧 Number 归一
      }
    }
  }
  return grid;
}

// 🗺️ 获取指定格子瓦片材质名称（直接读取 tiled terrain 属性）
export function getTileTerrainName(col, row) {
  const w = currentWeather();
  if (!terrainNameGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return '';
  const isMagma = damageGrid && (damageGrid[row][col] || 0) > 0;
  // 🌧️ 雨类：岩浆被浇灭变泥地
  if (isMagma && (w === 'rain' || w === 'storm' || w === 'thunderstorm')) return '泥地';
  // ❄️ 雪天：岩浆冻结为石板、水面结冰
  if (isMagma && w === 'snow') return '石板';
  if (w === 'snow' && isWaterCell(col, row)) return '冰面';
  const name = terrainNameGrid[row][col];
  return name || '地板';
}

// 🌊 获取指定格子的地形移速倍率（1.0=正常）
// 🌧️ 雨天/暴风雨/雷雨天：岩浆被浇灭变泥地，泥地减速（泥地 speedMultiplier=0.6）
// ❄️ 雪天：岩浆被冻结为石板，移速恢复正常
export function getTerrainSpeed(col, row) {
  const w = currentWeather();
  // 岩浆格子标记（damageGrid>0）
  const isMagmaCell = damageGrid && col >= 0 && col < mapW && row >= 0 && row < mapH && (damageGrid[row][col] || 0) > 0;
  // 🌧️ 雨类 → 泥地（用当前地图泥地倍率）
  if (isMagmaCell && (w === 'rain' || w === 'storm' || w === 'thunderstorm')) {
    return mudSpeedMultiplier;
  }
  // ❄️ 雪天 → 石板（1.0 正常）
  if (isMagmaCell && w === 'snow') {
    return 1.0;
  }
  // ❄️ 雪天：水格冻结为冰面，移速恢复正常（不再是水的减速）
  if (w === 'snow' && isWaterCell(col, row)) return 1.0;
  if (!terrainGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return 1.0;
  return terrainGrid[row][col] || 1.0;
}

// 🌿 构建视野减少网格（收集 visionReduce 属性的瓦片，值为具体减少的格子数，如1=减少1格视野）
export function buildVisionGrid(mapData) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));
  const visionTiles = mapData.tilesets.map(ts => {
    const map = new Map();
    const tiles = ts?.tiles;
    if (!tiles) return map;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const vr = props.find(p => p.name === 'visionReduce');
      if (vr) {
        const val = Number(vr.value);
        if (isFinite(val) && val > 0) map.set(localId, val); // 具体减少的格子数
      }
    }
    return map;
  });
  const mark = (col, row, val) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = val;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = visionTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw), ts.get(tile.localId));
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = visionTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w), ts.get(tile.localId));
        }
      }
    }
  }
  return grid;
}

// 💧 构建雨洼网格：收集拥有 puddle=true 属性的瓦片格子（雨天/暴风雨/雷雨天在其上渲染雨洼）
export function buildPuddleGrid(mapData) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));
  const puddleTiles = mapData.tilesets.map(ts => {
    const map = new Map();
    const tiles = ts?.tiles;
    if (!tiles) return map;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const pd = props.find(p => p.name === 'puddle');
      if (pd && (pd.value === true || String(pd.value).toLowerCase() === 'true')) {
        map.set(localId, 1);
      }
    }
    return map;
  });
  const mark = (col, row, val) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = val;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = puddleTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw), ts.get(tile.localId));
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = puddleTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w), ts.get(tile.localId));
        }
      }
    }
  }
  return grid;
}

// 💧 判断指定格子是否为雨洼格（puddle=true 的石板，雨天渲染雨洼）
export function isPuddleCell(col, row) {
  if (!puddleGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return false;
  return puddleGrid[row][col] === 1;
}

// 🧊 构建冰面网格：收集 terrain=冰面 的瓦片格子（1=冰面）
export function buildIceGrid(mapData) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));
  const iceTiles = mapData.tilesets.map(ts => {
    const map = new Map();
    const tiles = ts?.tiles;
    if (!tiles) return map;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const terr = props.find(p => p.name === 'terrain');
      if (terr && String(terr.value).includes('冰')) {
        map.set(localId, 1);
      }
    }
    return map;
  });
  const mark = (col, row, val) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = val;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = iceTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw), ts.get(tile.localId));
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = iceTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w), ts.get(tile.localId));
        }
      }
    }
  }
  return grid;
}

// 🧊 判断指定格子是否为冰面
export function isIceCell(col, row) {
  if (!iceGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return false;
  // ❄️ 雪天：水面结冰，水属性格子也视为冰面（滑行）
  if (currentWeather() === 'snow' && isWaterCell(col, row)) return true;
  return iceGrid[row][col] === 1;
}

// 💧 构建水属性网格：收集 terrain=浅水/深水 的瓦片格子（1=水，下雪时冻结为冰面）
export function buildWaterGrid(mapData) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));
  const waterTiles = mapData.tilesets.map(ts => {
    const map = new Map();
    const tiles = ts?.tiles;
    if (!tiles) return map;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const terr = props.find(p => p.name === 'terrain');
      if (terr && (String(terr.value) === '浅水' || String(terr.value) === '深水')) {
        map.set(localId, 1);
      }
    }
    return map;
  });
  const mark = (col, row, val) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = val;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = waterTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw), ts.get(tile.localId));
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = waterTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w), ts.get(tile.localId));
        }
      }
    }
  }
  return grid;
}

// 💧 判断指定格子是否为水属性（浅水/深水）
export function isWaterCell(col, row) {
  if (!waterGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return false;
  return waterGrid[row][col] === 1;
}

// ❄️ 是否为"冷水"天气（下雪：岩浆被冻成石板、水面结冰、灯光失效）
export function isSnowWeather() {
  return currentWeather() === 'snow';
}

// 🌿 获取指定格子的视野减少格子数（0=不减少，1=减少1格视野）
export function getVisionReduce(col, row) {
  if (!visionGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return 0;
  return visionGrid[row][col] || 0;
}

// 🔥 构建伤害网格（收集 damage 属性的瓦片，站上去持续扣血，0=不扣血）
export function buildDamageGrid(mapData) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));
  const damageTiles = mapData.tilesets.map(ts => {
    const map = new Map();
    const tiles = ts?.tiles;
    if (!tiles) return map;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const dmg = props.find(p => p.name === 'damage');
      if (dmg) {
        const val = Number(dmg.value);
        if (isFinite(val) && val > 0) map.set(localId, val);
      }
    }
    return map;
  });
  const mark = (col, row, val) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = val;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = damageTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw), ts.get(tile.localId));
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = damageTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w), ts.get(tile.localId));
        }
      }
    }
  }
  return grid;
}

// 🔥 获取指定格子的伤害值（0=不扣血，>0=每秒扣血量）
// 🌧️ 雨天/暴风雨/雷雨天/雪天：岩浆被浇灭/冻结，无伤害
export function getDamage(col, row) {
  const w = currentWeather();
  if (w === 'rain' || w === 'storm' || w === 'thunderstorm' || w === 'snow') return 0;
  if (!damageGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return 0;
  return damageGrid[row][col] || 0;
}

// 🏜️ 构建沙地网格（收集 slowMax/slowRate/slowHold 属性的瓦片，进入后渐进减速，离开后保持一段时间）
export function buildSandGrid(mapData) {
  const w = mapData.width, h = mapData.height;
  const grid = Array.from({ length: h }, () => new Array(w).fill(null));
  const sandTiles = mapData.tilesets.map(ts => {
    const map = new Map();
    const tiles = ts?.tiles;
    if (!tiles) return map;
    for (const [localId, def] of tiles) {
      const props = def?.properties;
      if (!props) continue;
      const slowMax = props.find(p => p.name === 'slowMax');
      if (!slowMax) continue;
      const maxVal = Number(slowMax.value);
      if (!isFinite(maxVal) || maxVal <= 0) continue;
      const rateProp = props.find(p => p.name === 'slowRate');
      const holdProp = props.find(p => p.name === 'slowHold');
      map.set(localId, {
        slowMax: Math.min(0.9, maxVal), // 最多减速90%
        slowRate: Math.max(0.05, Number(rateProp?.value) || 0.3), // 每秒增加的减速比例
        slowHold: Math.max(0, Number(holdProp?.value) || 2.0), // 离开后保持秒数
      });
    }
    return map;
  });
  const mark = (col, row, cfg) => {
    if (col >= 0 && col < w && row >= 0 && row < h) grid[row][col] = cfg;
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i];
          if (!tile) continue;
          const ts = sandTiles[tile.tilesetIndex];
          if (ts && ts.has(tile.localId)) {
            mark(chunk.x + (i % cw), chunk.y + Math.floor(i / cw), ts.get(tile.localId));
          }
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const ts = sandTiles[tile.tilesetIndex];
        if (ts && ts.has(tile.localId)) {
          mark(i % w, Math.floor(i / w), ts.get(tile.localId));
        }
      }
    }
  }
  return grid;
}

// 🏜️ 获取指定格子的沙地配置（null=不是沙地）
export function getSandConfig(col, row) {
  if (!sandGrid || col < 0 || col >= mapW || row < 0 || row >= mapH) return null;
  return sandGrid[row][col] || null;
}

// 🎯 读取箱子目标位置（推到此处触发宝箱）
export function readPushTargetsFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const list = [];
  for (const o of layer?.objects || []) {
    if (o.name !== 'push_target') continue;
    const col = Math.floor(o.x / mapData.tilewidth);
    const row = Math.floor(o.y / mapData.tileheight);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    list.push({
      id: String(props.id || ''),
      chestId: String(props.chestId || ''),
      col, row,
      triggered: false,
    });
  }
  return list;
}

// 📦 读取宝箱（初始隐藏，推箱子触发后显示，玩家靠近打开获得物品）
export function readChestsFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const list = [];
  for (const o of layer?.objects || []) {
    if (o.name !== 'chest') continue;
    if (o.visible === false) continue; // 👻 tiled 中隐藏的宝箱不生成
    const col = Math.floor(o.x / mapData.tilewidth);
    const row = Math.floor(o.y / mapData.tileheight);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    // 🎁 奖励：优先 items JSON 数组（元素用 itemId/name + num，参考 item 对象拾取格式）；
    //    未写 items 时回退读 itemId + num 单道具属性（完全同 item 对象拾取奖励）
    let items = [];
    try {
      const parsed = JSON.parse(String(props.items || '[]'));
      if (Array.isArray(parsed)) items = parsed;
    } catch (e) { items = []; }
    if (!items.length && props.itemId) {
      items = [{ itemId: String(props.itemId), num: Number(props.num) || 1 }];
    }
    const showOnStart = props.showOnStart === true || String(props.showOnStart) === 'true';
    list.push({
      id: String(props.id || o.id || ''), // 🏷️ 宝箱唯一标识（CHEST_CONFIG 的 key；push_target.chestId 引用它）
      col, row,
      items,
      needItem: props.needItem ? String(props.needItem) : '', // 🔑 解锁所需物品（空=无需解锁）
      needItemNum: Number(props.needItemNum) || 1,           // 🔑 解锁所需数量（默认 1）
      respawn: props.respawn === true || String(props.respawn) === 'true', // 🔄 respawn=true → 每次重新进入地牢刷新（不持久化状态）
      showOnStart,
      visible: showOnStart, // 🚩 showOnStart=true → 初始直接显示；否则初始隐藏（如推箱子触发后显示）
      opened: false,  // 是否已打开
    });
  }
  return list;
}

// 📦 从瓦片层读取宝箱（tiled 瓦片摆放方式）：扫描所有瓦片层中 terrain="未开启的宝箱" 的瓦片
//    生成宝箱（visible=true 直接显示），开启后替换瓦片：下面格=已开启箱体(86)、上面格=盖子(70)
export function readChestTilesFromMap(mapData) {
  const w = mapData.width, h = mapData.height;
  // 构建每个 tileset 中 terrain="未开启的宝箱" 的 localId 集合
  const chestTiles = mapData.tilesets.map(ts => {
    const s = new Set();
    const tiles = ts?.tiles; if (!tiles) return s;
    for (const [localId, def] of tiles) {
      const props = def?.properties; if (!props) continue;
      if (props.find(p => p.name === 'terrain')?.value === '未开启的宝箱') s.add(localId);
    }
    return s;
  });
  const list = [];
  const add = (layer, col, row, tile) => {
    if (col < 0 || col >= w || row < 0 || row >= h) return;
    const ts = chestTiles[tile.tilesetIndex];
    if (!ts || !ts.has(tile.localId)) return;
    // 同格只生成一个（多瓦片层重叠时只取第一个遇到的）
    if (list.some(x => x.col === col && x.row === row)) return;
    list.push({
      id: 'tilechest_' + col + '_' + row,
      col, row,
      layer: layer.name,           // 宝箱瓦片所在层（替换瓦片用同一层）
      tsIndex: tile.tilesetIndex,  // pengzhuang 图块集 index
      closeLocal: tile.localId,    // 未开启宝箱瓦片（id 85）
      openLocal: 86,               // 已开启宝箱·箱体（下面格，与未开启对齐）
      lidLocal: 70,                // 已开启宝箱·盖子（上面格，纯视觉不影响）
      items: DEFAULT_CHEST_ITEMS,
      visible: true,               // 瓦片宝箱直接显示在地图上
      opened: false,
      fromTile: true,              // 标记：由瓦片生成的宝箱
    });
  };
  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || layer.visible === false) continue;
    if (layer.chunks && layer.chunks.length > 0) {
      for (const chunk of layer.chunks) {
        const cw = chunk.width;
        for (let i = 0; i < chunk.tiles.length; i++) {
          const tile = chunk.tiles[i]; if (!tile) continue;
          add(layer, chunk.x + (i % cw), chunk.y + Math.floor(i / cw), tile);
        }
      }
    } else if (layer.tiles) {
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i]; if (!tile) continue;
        add(layer, i % w, Math.floor(i / w), tile);
      }
    }
  }
  return list;
}
// 🎁 瓦片宝箱默认物品（可在 tiled 瓦片属性或这里调整）
export const DEFAULT_CHEST_ITEMS = [
  { name: '魔晶LV1', num: 2 },
  { name: '灵力晶核', num: 1 },
];

// ⚡ 读取感应区（玩家进入触发：显示消息弹窗 或 进入对话，根据自定义属性决定）
// 属性：message=消息内容（非空则进入时弹消息窗）/ title=消息标题（可选，默认"📜 提示"）
//      dialogLoadData+dialogRoute=进入对话（参考 stairs 的 dialogRoute 条件路由）
//      once=是否只触发一次 / cooldown=再次触发冷却秒数
export function readTriggersFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const list = [];
  for (const o of layer?.objects || []) {
    if (o.name !== 'trigger') continue;
    const col = Math.floor(o.x / mapData.tilewidth);
    const row = Math.floor(o.y / mapData.tileheight);
    const w = Math.max(1, Math.floor((o.width || mapData.tilewidth) / mapData.tilewidth));
    const h = Math.max(1, Math.floor((o.height || mapData.tileheight) / mapData.tileheight));
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    list.push({
      col, row, w, h,
      // 🏷️ triggerId：感应器标识（代码配置表 triggerConfig.js 的 TRIGGER_CONFIG 决定触发行为，
      //    没填用对象名；tiled 里配的旧行为字段仍保留作为兼容兜底）
      triggerId: String(props.triggerId || o.name || 'trigger_' + list.length),
      message: props.message ? String(props.message) : null, // 💬 消息弹窗内容（非空则进入时弹窗）
      title: props.title ? String(props.title) : '📜 提示', // 🏷️ 消息弹窗标题
      dialogLoadData: props.dialogLoadData ? String(props.dialogLoadData) : null,
      dialogName: props.dialogName ? String(props.dialogName) : null,
      // 👾 埋击敌人配置（两种方式二选一）：
      // 1. ambushLayer：对象层名（推荐）——把 enemy 对象放在独立对象层里，触碰后整层敌人出现并追击
      // 2. spawnEnemies：JSON 数组——直接在属性里指定位置+敌人配置
      ambushLayer: props.ambushLayer ? String(props.ambushLayer) : null, // 埋击敌人对象层名
      spawnEnemies: (() => {
        try {
          const parsed = JSON.parse(String(props.spawnEnemies || '[]'));
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })(),
      ambushTriggered: false, // 👾 埋击是否已触发（只触发一次）
      dialogRoute: (() => {
        try {
          const parsed = JSON.parse(String(props.dialogRoute || '[]'));
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })(),
      once: (() => {
        const v = props.once;
        if (v === false || v === 'false' || v === 0) return false;
        if (v === true || v === 'true' || v === 1) return true;
        return true; // 默认只触发一次
      })(),
      cooldown: Math.max(0, Number(props.cooldown) || 0),
      triggered: false,
      cooldownTimer: 0,
    });
  }
  return list;
}

// 🖐️ 从 Tiled 对象层读取互动点（玩家靠近显示互动按钮，点击/空格触发）
// tiled 只摆位置 + 填 interactId（没填用对象名/tiled 对象 id），互动内容由上层配置表
// interactConfig.js 的 INTERACT_CONFIG 决定；对象名或 type 以 interact 开头即可（interact / interact_door）
// 可选属性：interactId(标识) / once(是否只触发一次,默认true)；旧内容字段保留读取兼容旧地图
export function readInteractablesFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const list = [];
  const tw = mapData.tilewidth, th = mapData.tileheight;
  for (const o of layer?.objects || []) {
    if (!String(o.type || '').startsWith('interact') && !String(o.name || '').startsWith('interact')) continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    const col = Math.floor(o.x / tw);
    const row = Math.floor(o.y / th);
    const w = Math.max(1, Math.floor((o.width || tw) / tw));
    const h = Math.max(1, Math.floor((o.height || th) / th));
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    list.push({
      id: String(o.name || o.id || 'interact_' + list.length),
      // 🏷️ interactId：互动点标识（代码配置表 interactConfig.js 的 INTERACT_CONFIG 决定互动内容，
      //    没填用对象名/tiled 对象 id；tiled 里配的旧内容字段仍保留作为兼容兜底）
      interactId: String(props.interactId || o.name || o.id || 'interact_' + list.length),
      col, row, w, h,
      type: String(props.type || 'inspect'), // unlock=解锁(需物品) / inspect=查看 / custom=自定义弹窗
      title: String(props.title || t('interactFallback')),
      content: String(props.content || ''),
      requireItem: String(props.requireItem || ''), // 解锁需要的物品名
      unlockMessage: String(props.unlockMessage || t('unlockSuccessMsg')),
      failMessage: String(props.failMessage || t('noKeyMsg')),
      buttonText: String(props.buttonText || t('interactFallback')),
      sealId: String(props.sealId || ''), // 🔐 解锁后要隐藏并解封的 seal 图层 id（对应 seal_{sealId} 层）
      once: (() => {
        // 🐛 修复：Tiled 里 once 可能是字符串 "true"/"false"，需要正确解析（false=可重复触发）
        const v = props.once;
        if (v === false || v === 'false' || v === 0) return false;
        if (v === true || v === 'true' || v === 1) return true;
        return true; // 默认只触发一次
      })(),
      triggered: false,
    });
  }
  return list;
}

// ⛏️ 读取采集点（对象层 gather）：只摆位置 + 填 gatherId（采集点标识），
//    采集产出（物品/数量/时长/惊扰范围）由上层配置表 gatherConfig.js 的 GATHER_CONFIG 决定
//    可选属性：gatherId(标识，没填用对象名) / once(是否只采集一次,默认true)
export function readGatherPointsFromMap(mapData) {
  const layer = mapData.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  const list = [];
  const tw = mapData.tilewidth, th = mapData.tileheight;
  for (const o of layer?.objects || []) {
    if (o.type !== 'gather' && o.name !== 'gather') continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    const col = Math.floor(o.x / tw);
    const row = Math.floor(o.y / th);
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) continue;
    const gatherId = String(props.gatherId || o.name || 'gather_' + list.length);
    list.push({
      id: String(o.id || gatherId),
      gatherId,
      col, row,
      once: (() => {
        const v = props.once;
        if (v === false || v === 'false' || v === 0) return false;
        if (v === true || v === 'true' || v === 1) return true;
        return true; // 默认只采集一次
      })(),
      triggered: false,
    });
  }
  return list;
}

// 👾 读取埋击敌人组：扫描所有感应区的 ambushLayer 属性，去重读取对应对象层的 enemy 对象
// 这些敌人平时不创建 sprite（隐藏），触碰对应感应区后 spawnAmbushLayer 才创建并追击
export function readAmbushGroupsFromMap(mapData) {
  const groups = [];
  const seenLayers = new Set();
  const triggers = getTriggers();
  for (const t of triggers) {
    if (!t.ambushLayer) continue;
    if (seenLayers.has(t.ambushLayer)) continue;
    seenLayers.add(t.ambushLayer);
    const layerEnemies = readEnemiesFromMap(mapData, t.ambushLayer);
    groups.push({ layer: t.ambushLayer, enemies: layerEnemies, triggered: false });
  }
  return groups;
}
