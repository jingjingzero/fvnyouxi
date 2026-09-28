// 🏜️ 地牢氛围特效模块（光柱/体积光 + 漂浮尘埃 + 物体方向影）
// 独立新模块：dungeon.vue 只负责 create/update/clear 三处接入；
// 效果不满意可把 ENABLE_ATMOSPHERE 改为 false 整体回退（不影响任何现有逻辑）。
// 依赖通过 initAtmosphereFx 注入（getter 实时读主文件状态，与 terrainFx 同款模式）。
import { Container, Sprite, Texture, CanvasSource } from 'pixi.js';
import { attachShadow } from '../lighting.js';

let ctx = null;
export function initAtmosphereFx(deps) { ctx = deps; }

/** 🔧 总开关：false = 光柱/尘埃/投影全部关闭（一键回退） */
export const ENABLE_ATMOSPHERE = true;

// ========== 💡 光柱 / 体积光（Tiled light 对象加 beam 属性启用） ==========
// light 对象自定义属性：
//   beam       true（或数字=长度格）启用光柱（默认关闭，避免火把/篝火冒光柱）
//   beamColor  "#ffd98c"  光柱颜色（默认暖黄）
//   beamAngle  度，默认 35（光束向右下斜；0 = 垂直向下）
//   beamLen    格，默认 8（光束长度）
//   beamW      格，默认 2.4（光束底部宽度）
//   beamAlpha  默认 0.5（强度）
let beams = [];           // [{ s, phase, baseAlpha, sx, sy }]
let beamTex = null;
let beamTime = 0;

function createBeamTexture() {
  if (beamTex) return beamTex;
  const W = 128, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // 锥形光束：顶部窄（光源口）→ 底部宽，垂直渐变（上亮下淡）
  const topW = W * 0.1, botW = W * 0.92;
  g.beginPath();
  g.moveTo(W / 2 - topW / 2, 0);
  g.lineTo(W / 2 + topW / 2, 0);
  g.lineTo(W / 2 + botW / 2, H);
  g.lineTo(W / 2 - botW / 2, H);
  g.closePath();
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(255,224,150,0.55)');
  grad.addColorStop(1, 'rgba(255,224,150,0.04)');
  g.fillStyle = grad;
  g.fill();
  // 水平羽化：中间保留、两侧渐透明（避免生硬边缘）
  const grad2 = g.createLinearGradient(0, 0, W, 0);
  grad2.addColorStop(0, 'rgba(0,0,0,0)');
  grad2.addColorStop(0.22, 'rgba(0,0,0,0.62)');
  grad2.addColorStop(0.78, 'rgba(0,0,0,0.62)');
  grad2.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad2;
  g.fill();
  beamTex = new Texture({ source: new CanvasSource({ resource: c }) });
  return beamTex;
}

function createBeams() {
  const layer = ctx.curMapData?.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  // ⚠️ mapContainer 已 scale.set(scale)，内部坐标用未缩放瓦片像素（tileW/tileH），不可再乘 scale
  const tw = ctx.tileW, th = ctx.tileH;
  for (const o of layer?.objects || []) {
    if (String(o.name || '') !== 'light') continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    const beam = props.beam;
    if (beam == null || beam === false || beam === 'false' || beam === '') continue;
    const col = Math.floor(o.x / ctx.tileW), row = Math.floor(o.y / ctx.tileH);
    const len = Number.isFinite(Number(beam)) && Number(beam) > 1 ? Number(beam) : Number(props.beamLen) || 8;
    const w = Number(props.beamW) || 2.4;
    const alpha = Number(props.beamAlpha) || 0.5;
    const angle = (Number(props.beamAngle) || 35) * Math.PI / 180;
    const color = parseColor(props.beamColor, 0xffd98c);
    const s = new Sprite(createBeamTexture());
    s.blendMode = 'add';
    s.tint = color;
    s.anchor.set(0.5, 0);               // 顶部中心 = 光源口
    s.x = (col + 0.5) * tw;
    s.y = (row + 0.5) * th;
    s.rotation = angle;                 // 光束向斜下射
    s.scale.set((w * tw) / (128 * 0.92), (len * th) / 256);
    s.alpha = alpha;
    ctx.mapContainer.addChild(s);
    beams.push({ s, phase: Math.random() * 6.28, baseAlpha: alpha });
  }
}

// ========== 🫧 漂浮尘埃（全图稀疏散布，上飘 + 横向漂移 + 呼吸闪烁） ==========
let dust = [];
let dustTex = null;

function createDustTexture() {
  if (dustTex) return dustTex;
  const S = 16;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,244,200,0.9)');
  grad.addColorStop(1, 'rgba(255,244,200,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  dustTex = new Texture({ source: new CanvasSource({ resource: c }) });
  return dustTex;
}

function createDust() {
  const tw = ctx.tileW, th = ctx.tileH; // ⚠️ mapContainer 已缩放，内部用未缩放瓦片像素
  const W = ctx.mapW * tw, H = ctx.mapH * th;
  const count = Math.max(24, Math.min(90, Math.round((ctx.mapW * ctx.mapH) / 180)));
  for (let i = 0; i < count; i++) {
    const s = new Sprite(createDustTexture());
    s.blendMode = 'add';
    s.anchor.set(0.5);
    const size = (0.25 + Math.random() * 0.55) * tw; // 0.25~0.8 格
    s.scale.set(size / 16);
    s.x = Math.random() * W;
    s.y = Math.random() * H;
    s.alpha = 0.25 + Math.random() * 0.45;
    ctx.mapContainer.addChild(s);
    dust.push({
      s, x: s.x, y: s.y, size,
      speed: (0.35 + Math.random() * 0.7) * th,   // 上飘速度（格/秒）
      drift: (4 + Math.random() * 14) * (Math.random() < 0.5 ? -1 : 1), // 横向漂移幅度
      phase: Math.random() * 6.28,
      baseAlpha: s.alpha,
    });
  }
}

function updateDust(dt) {
  const fogDim = ctx.currentWeather === 'fog' || ctx.currentWeather === 'snow'; // 🌫️ 浓雾/暴雪遮蔽尘埃
  const tw = ctx.tileW, th = ctx.tileH;
  const W = ctx.mapW * tw, H = ctx.mapH * th;
  const t = performance.now() / 1000;
  for (const p of dust) {
    p.y -= p.speed * dt;
    if (p.y < -p.size) { p.y = H + Math.random() * th * 2; p.x = Math.random() * W; }
    p.x += Math.sin(t * 0.5 + p.phase) * p.drift * dt;
    if (p.x < -p.size) p.x = W + p.size;
    if (p.x > W + p.size) p.x = -p.size;
    p.s.x = p.x;
    p.s.y = p.y;
    p.s.alpha = (fogDim ? 0.06 : 1) * p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 1.3 + p.phase));
  }
}

// ========== 🏃 物体方向影（dungeon_objects 层 prop/tree/stone 等对象，随光源角度斜向投影） ==========
// 对象自定义属性：
//   angle  影倾斜角度（度，默认 35，光从左上来 → 影向右下）
//   pw/pd  影宽度/长度格（缺省按对象自身尺寸推算）
// 支持对象 name/type 含：prop、tree、stone、column、zhu、shishu、树、柱、石、岩
function isPropObject(o) {
  const n = String(o.name || '').toLowerCase();
  const t = String(o.type || '').toLowerCase();
  const keys = ['prop', 'tree', 'stone', 'column', 'zhu', 'shishu', 'shizhu', '树', '柱', '石', '岩', 'statue'];
  return keys.some(k => n === k || n.includes(k) || t === k || t.includes(k));
}

function createPropShadows() {
  const layer = ctx.curMapData?.layers?.find(l => l.type === 'objectgroup' && l.name === 'dungeon_objects');
  // ⚠️ mapContainer 已 scale.set(scale)，对象坐标/尺寸直接用 Tiled 像素（未缩放）
  for (const o of layer?.objects || []) {
    if (!isPropObject(o)) continue;
    if (!(o.width > 0) && !(o.height > 0)) continue;
    const props = {};
    for (const p of o.properties || []) props[p.name] = p.value;
    const angle = (Number(props.angle) || 35) * Math.PI / 180;
    const objW = o.width || ctx.tileW * 2;
    const objH = o.height || ctx.tileH * 3;
    const centerX = o.x + objW / 2;
    const bottomY = o.y + objH;
    // 影宽 = 物体宽（略收），影长 = 物体高（沿光方向拉伸）
    const sw = Math.max(6, objW * 0.85);
    const sl = Math.max(8, objH * 0.7);
    const sh = attachShadow(ctx.mapContainer, sw, sl);
    sh.rotation = angle;                                   // 影向光反方向倾斜
    sh.x = centerX + Math.sin(angle) * sl * 0.42;          // 向右下偏移
    sh.y = bottomY + Math.cos(angle) * sl * 0.42;
    sh.visible = true;
  }
}

// ========== 🛠️ 生命周期 ==========
// ⚡ 运行时开关：ENABLE_ATMOSPHERE 编译期总开关 && 非低性能模式（设置里「性能模式」可切）
export function createAtmosphereFx() {
  if (!ENABLE_ATMOSPHERE || ctx?.isPerfLow || !ctx?.mapContainer) return;
  clearAtmosphereFx();
  createBeams();
  createDust();
  createPropShadows();
}

export function updateAtmosphereFx(dt) {
  if (!ENABLE_ATMOSPHERE || ctx?.isPerfLow || !ctx?.mapContainer) return;
  beamTime += dt;
  const t = beamTime;
  for (const b of beams) {
    if (!b.s) continue;
    b.s.alpha = b.baseAlpha * (0.82 + 0.18 * Math.sin(t * 2.2 + b.phase)); // 轻微呼吸
  }
  updateDust(dt);
}

export function clearAtmosphereFx() {
  for (const b of beams) { try { b.s?.destroy(); } catch (e) { /* ignore */ } }
  for (const d of dust) { try { d.s?.destroy(); } catch (e) { /* ignore */ } }
  beams = [];
  dust = [];
}

// ========== 🔧 工具 ==========
function parseColor(v, fallback) {
  if (v == null || v === '') return fallback;
  let s = String(v).trim();
  if (s.startsWith('#')) s = '0x' + s.slice(1);
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}
