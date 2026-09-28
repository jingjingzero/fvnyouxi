// 🏞️ 地牢地形特效模块（足迹 / 水面·岩浆流动 / 点光源 / 玩家倒影，拆自 dungeon.vue，行为零变化）
// 依赖通过 initTerrainFx 注入（getter/setter 实时读写主文件状态；可重赋值状态由 setter 回调写回）
import { Texture, CanvasSource, Container, TilingSprite, Graphics } from 'pixi.js';
import { attachLight, updateLight } from '../lighting.js';

let ctx = null;
export function initTerrainFx(deps) { ctx = deps; }

// ========== 👣 雪地/沙地/泥地足迹 ==========
const FOOTPRINT_TERRAINS = { '雪地': 0x7d93ab, '沙地': 0x6f5533, '泥地': 0x38271a, '草地': 0x4d6b3a }; // 🎨 深脚印色（深于地形，明显可见；草地=深草绿）
const FOOTPRINT_MAX = 14;       // 👣 最多同时 14 只脚（性能上限）
let footprints = [];            // 👣 足迹数组（模块内自持，主文件不持有该状态）
let footprintLayer = null;      // 👣 足迹容器（模块内自持，主文件不持有该状态）

// 🧱 运行时瓦片 terrain 判定（pixi-tiledmap getTile 路径，updateMagmaCover 同款，兼容各种 tileset 结构）
export function tileTerrainAt(col, row) {
  if (!ctx.mapContainer || typeof ctx.mapContainer.getTile !== 'function' || !ctx.curMapData) return '';
  const LAYER_NAME = ctx.getFloorLayerName();
  let tg = null;
  try { tg = ctx.mapContainer.getTile(LAYER_NAME, col, row); } catch (e) { tg = null; }
  if (!tg) return '';
  const tsDef = ctx.curMapData.tilesets?.[tg.tilesetIndex];
  if (tsDef?.tiles) {
    for (const [localId, def] of tsDef.tiles) {
      if (Number(localId) !== Number(tg.localId)) continue;
      const terr = def?.properties?.find(pp => pp.name === 'terrain')?.value;
      if (terr) return String(terr);
    }
  }
  return '';
}
export function spawnFootprints(col, row) {
  if (!ctx.mapContainer) return;
  let terr = ctx.getTileTerrainName(col, row);
  if (!terr || terr === '地板') terr = tileTerrainAt(col, row); // 🧱 terrainNameGrid 缺失时用运行时 getTile 兜底
  let color = FOOTPRINT_TERRAINS[terr];
  if (color == null) {
    // 🎯 包含匹配兜底（防 terrain 名带前后缀，如「雪地2」「沙地_1」）
    for (const [k, v] of Object.entries(FOOTPRINT_TERRAINS)) {
      if (terr.includes(k)) { color = v; break; }
    }
  }
  if (color == null) return;
  if (!footprintLayer) { footprintLayer = new Container(); ctx.mapContainer.addChild(footprintLayer); }
  if (footprints.length >= FOOTPRINT_MAX) {
    const old = footprints.shift();
    try { old.g.parent?.removeChild(old.g); old.g.destroy(); } catch (e) { /* ignore */ }
  }
  const left = (footprints.length % 2 === 0);
  const g = new Graphics();
  const cx = (col + 0.5) * ctx.tileW + (left ? -ctx.tileW * 0.12 : ctx.tileW * 0.12);
  const cy = (row + 0.88) * ctx.tileH;
  // 🐾 动漫猫爪：圆润大掌垫 + 4 个饱满圆趾（对称弧形排列）+ 掌垫小肉垫，卡通感
  g.ellipse(0, ctx.tileH * 0.025, ctx.tileW * 0.16, ctx.tileH * 0.095).fill({ color, alpha: 0.85 }); // 圆润掌垫
  g.ellipse(0, ctx.tileH * 0.005, ctx.tileW * 0.06, ctx.tileH * 0.035).fill({ color: 0x2a2018, alpha: 0.28 }); // 掌垫小肉垫（卡通点缀）
  const toes = [
    { x: -ctx.tileW * 0.12, y: -ctx.tileH * 0.03, r: ctx.tileW * 0.052 },
    { x: -ctx.tileW * 0.04, y: -ctx.tileH * 0.058, r: ctx.tileW * 0.058 },
    { x:  ctx.tileW * 0.04, y: -ctx.tileH * 0.058, r: ctx.tileW * 0.058 },
    { x:  ctx.tileW * 0.12, y: -ctx.tileH * 0.03, r: ctx.tileW * 0.052 },
  ];
  for (const td of toes) {
    g.circle(td.x, td.y, td.r).fill({ color, alpha: 0.85 });
  }
  // 🧭 脚印朝向 = 玩家当前移动方向（脚趾朝前进方向）
  let rot = 0;
  if (ctx.playerHeadName === 'head_front') rot = Math.PI;
  else if (ctx.playerHeadName === 'head_left') rot = -Math.PI / 2;
  else if (ctx.playerHeadName === 'head_right') rot = Math.PI / 2;
  g.rotation = rot + (left ? 0.06 : -0.06);
  g.x = cx; g.y = cy;
  footprintLayer.addChild(g);
  footprints.push({ g, life: 1, max: 1 }); // ⏱️ 1 秒渐隐（消失更快；下雨冲刷 2.4 倍更快）
}
export function updateFootprints(dt) {
  if (!footprints.length) return;
  const wet = (ctx.currentWeather === 'rain' || ctx.currentWeather === 'storm' || ctx.currentWeather === 'thunderstorm') ? 2.4 : 1; // 🌧️ 下雨足迹冲刷加速
  for (let i = footprints.length - 1; i >= 0; i--) {
    const f = footprints[i];
    f.life -= dt * wet;
    f.g.alpha = Math.max(0, Math.min(0.85, 0.85 * (f.life / f.max)));
    if (f.life <= 0) {
      try { footprintLayer?.removeChild(f.g); } catch (e) { /* ignore */ }
      try { f.g.destroy(); } catch (e) { /* ignore */ }
      footprints.splice(i, 1);
    }
  }
}

// 🧹 清空足迹（换层 / 卸载时调用，主文件销毁点调用）
export function clearFootprints() {
  for (const f of footprints) {
    try { f.g.parent?.removeChild(f.g); } catch (e) { /* ignore */ }
    try { f.g.destroy(); } catch (e) { /* ignore */ }
  }
  footprints = [];
  try {
    if (footprintLayer) {
      footprintLayer.parent?.removeChild(footprintLayer);
      footprintLayer.destroy({ children: true });
    }
  } catch (e) { /* ignore */ }
  footprintLayer = null;
}

// ========== 🌊 水面 / 岩浆表面流动动画 ==========
let flowTime = 0;
let _flowWaterTex = null;
let _flowMagmaTex = null;
let magmaBubbleTimer = 0;

// 🎨 程序生成流动纹理（水=半透明白色横波纹；岩浆=橙红亮斑）
export function makeFlowTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const cctx = c.getContext('2d');
  if (kind === 'water') {
    cctx.clearRect(0, 0, 64, 64);
    cctx.strokeStyle = 'rgba(255,255,255,0.5)';
    cctx.lineWidth = 2;
    for (let y = 8; y < 64; y += 13) {
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.bezierCurveTo(16, y - 3, 34, y + 3, 50, y - 2);
      cctx.lineTo(64, y - 4);
      cctx.stroke();
    }
  } else {
    cctx.clearRect(0, 0, 64, 64);
    const g = cctx.createRadialGradient(32, 32, 3, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,190,60,0.85)');
    g.addColorStop(0.5, 'rgba(255,110,10,0.5)');
    g.addColorStop(1, 'rgba(255,60,0,0)');
    cctx.fillStyle = g;
    for (let i = 0; i < 12; i++) {
      cctx.beginPath();
      cctx.arc((i * 23 + 5) % 64, (i * 37 + 7) % 64, 9 + (i % 3) * 5, 0, Math.PI * 2);
      cctx.fill();
    }
  }
  // ⚡ CanvasSource 同步可用：避免 Image 异步空纹理（OOM / 不渲染）
  return new Texture({ source: new CanvasSource({ resource: c }) });
}
// 🏗️ 创建流动层：每个水格/岩浆格一个 TilingSprite（瓦片之上，地图坐标）
export function createFlowLayer() {
  if (ctx.flowLayer) { try { ctx.mapContainer?.removeChild(ctx.flowLayer); } catch (e) { /* ignore */ } try { ctx.flowLayer.destroy({ children: true }); } catch (e) { /* ignore */ } }
  ctx.setFlowLayer(null); ctx.setFlowWaterSprites([]); ctx.setFlowMagmaSprites([]); ctx.setMagmaBubbles([]);
  if (!ctx.mapContainer) return;
  const layer = new Container();
  ctx.setFlowLayer(layer);
  ctx.mapContainer.addChild(layer);
  const addCells = (cells, tex, alpha, blend, list) => {
    if (!tex || !cells.length) return;
    for (const cell of cells) {
      const ts = new TilingSprite({ texture: tex, width: ctx.tileW, height: ctx.tileH });
      ts.position.set(cell.col * ctx.tileW, cell.row * ctx.tileH);
      ts.alpha = alpha;
      if (blend) ts.blendMode = blend;
      ts._cc = cell.col; ts._cr = cell.row;
      layer.addChild(ts);
      list.push(ts);
    }
  };
  _flowWaterTex = _flowWaterTex || makeFlowTexture('water');
  _flowMagmaTex = _flowMagmaTex || makeFlowTexture('magma');
  addCells(ctx.waterCells, _flowWaterTex, 0.32, null, ctx.flowWaterSprites);
  addCells(ctx.magmaCells, _flowMagmaTex, 0.5, 'add', ctx.flowMagmaSprites);
  flowTime = 0;
}
export function updateFlowLayers(dt) {
  if (!ctx.flowLayer) return;
  flowTime += dt;
  // 🌧️ 雨类岩浆被浇灭变泥地；❄️ 雪天岩浆冻石板、水面结冰 → 对应流动隐藏
  const isMud = ctx.currentWeather === 'rain' || ctx.currentWeather === 'storm' || ctx.currentWeather === 'thunderstorm';
  const isFreeze = ctx.currentWeather === 'snow';
  if (ctx.flowWaterSprites.length) {
    const show = !isFreeze;
    for (const ts of ctx.flowWaterSprites) {
      if (ts.visible !== show) ts.visible = show;
      if (show) { ts.tilePosition.x += 16 * dt; ts.tilePosition.y += 7 * dt; }
    }
  }
  if (ctx.flowMagmaSprites.length) {
    const show = !isMud && !isFreeze;
    for (const ts of ctx.flowMagmaSprites) {
      if (ts.visible !== show) ts.visible = show;
      if (show) { ts.tilePosition.x += 26 * dt; ts.tilePosition.y += 11 * dt; }
    }
    // 🔥 岩浆气泡上浮（限数量，仅视口内生成）
    magmaBubbleTimer -= dt;
    if (show && magmaBubbleTimer <= 0) {
      magmaBubbleTimer = 0.12;
      if (ctx.magmaBubbles.length < 70 && ctx.magmaCells.length) {
        const cell = ctx.magmaCells[(Math.random() * ctx.magmaCells.length) | 0];
        if (ctx.isEntityOnScreen(cell.col * ctx.tileW * ctx.scale, cell.row * ctx.tileH * ctx.scale, ctx.tileW * ctx.scale * 2)) {
          const b = new Graphics();
          b.circle(0, 0, ctx.tileW * (0.06 + Math.random() * 0.04)).fill({ color: 0xffb050, alpha: 0.9 });
          b.x = (cell.col + 0.5) * ctx.tileW;
          b.y = (cell.row + 0.65) * ctx.tileH;
          ctx.flowLayer.addChild(b);
          ctx.magmaBubbles.push({ g: b, life: 1.3, max: 1.3, vx: (Math.random() - 0.5) * 8, vy: -(16 + Math.random() * 12) });
        }
      }
    }
    for (let i = ctx.magmaBubbles.length - 1; i >= 0; i--) {
      const bb = ctx.magmaBubbles[i];
      bb.life -= dt;
      bb.g.x += bb.vx * dt;
      bb.g.y += bb.vy * dt;
      bb.g.alpha = Math.max(0, Math.min(0.85, (bb.life / bb.max) * 0.85));
      if (bb.life <= 0) {
        try { ctx.flowLayer?.removeChild(bb.g); } catch (e) { /* ignore */ }
        try { bb.g.destroy(); } catch (e) { /* ignore */ }
        ctx.magmaBubbles.splice(i, 1);
      }
    }
  }
}

// ========== 💡 Tiled light 对象 → 动态点光源（火把/篝火/发光物，火焰摇曳） ==========
let lightFlickerTime = 0;
export function createMapLights() {
  clearMapLights();
  if (!ctx.app || !ctx.lightPoints.length) return;
  for (const lp of ctx.lightPoints) {
    // 🎨 色温：light 对象自定义 color 属性（火把暖黄/篝火橙红/魔法冷蓝…），缺省 0xffd98c
    const s = attachLight(ctx.app.stage, ctx.tileW * ctx.scale * (lp.radius * 1.5), lp.color || 0xffd98c);
    ctx.mapLightSprites.push({ s, col: lp.col, row: lp.row, radius: lp.radius });
  }
}
export function updateMapLights(dt) {
  if (!ctx.mapLightSprites.length) return;
  lightFlickerTime += dt;
  const t = lightFlickerTime;
  for (const ml of ctx.mapLightSprites) {
    const cx = ctx.mapOffsetX + (ml.col + 0.5) * ctx.tileW * ctx.scale;
    const cy = ctx.mapOffsetY + (ml.row + 0.5) * ctx.tileH * ctx.scale;
    // 🔥 火焰摇曳：每盏灯相位不同，半径/强度正弦微扰
    const ph = ml.col * 3.1 + ml.row * 7.7;
    const flick = 0.82 + 0.18 * Math.sin(t * 5.2 + ph);
    const flick2 = 0.9 + 0.1 * Math.sin(t * 3.1 + ph * 1.7);
    const alpha = Math.min(0.55, 0.3 * flick); // 💡 光晕全天气显示
    const radius = ctx.tileW * ctx.scale * (ml.radius * 1.5 + 0.3) * flick2;
    updateLight(ml.s, cx, cy, radius, alpha);
  }
}
export function clearMapLights() {
  for (const ml of ctx.mapLightSprites) { try { ml.s.destroy(); } catch (e) { /* ignore */ } }
  ctx.setMapLightSprites([]);
}

// 🌊 玩家水面倒影：脚下是水面格子时显示（垂直镜像 + 半透明），离开水面隐藏；皮肤/位置/比例每帧跟随玩家
export function updatePlayerReflection(dt) {
  if (!ctx.playerReflection || !ctx.playerSprite) return;
  const onWater = ctx.isWaterCell(ctx.pCol, ctx.pRow);
  ctx.playerReflection.visible = onWater;
  if (!onWater) return;
  // 位置：与玩家同水平中心（同样的 headOff 偏移），倒影中心位于玩家视觉中心下方约半格处
  ctx.playerReflection.x = ctx.mapOffsetX + ctx.pPixelX - ctx.playerHeadOff.x;
  ctx.playerReflection.y = ctx.mapOffsetY + ctx.pPixelY + ctx.tileH * ctx.scale * 0.55;
  // 皮肤同步：跟随玩家朝向（head_front/left/right/back）
  if (ctx.playerReflectionHead !== ctx.playerHeadName) {
    ctx.setPlayerReflectionHead(ctx.playerHeadName);
    try {
      ctx.playerReflection.skeleton.setSkin(null);
      ctx.playerReflection.skeleton.setSkinByName(ctx.playerHeadName);
      try { ctx.playerReflection.skeleton.setSlotsToSetupPose(); } catch (e) { }
      ctx.playerReflection.update(0.05);
    } catch (e) { /* 忽略 */ }
  }
  // 比例同步：保持垂直镜像（y 取反）
  const sx = ctx.playerSprite.scale.x || 1;
  const sy = ctx.playerSprite.scale.y || sx;
  ctx.playerReflection.scale.set(sx, -sy);
}
