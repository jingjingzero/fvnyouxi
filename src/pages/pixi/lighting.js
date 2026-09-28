/**
 * 轻量光照 / 软影工具（PixiJS v8）
 * 影子：单层半透明椭圆（无同心圈）；光照：canvas 径向渐变纹理（淡淡的渐变黄圈，无白边/无圈层）。
 * 光照纹理走 canvas → CanvasSource（Pixi v8 同步可用）；运行期仅更新位置/缩放/透明度。
 */
import { CanvasSource, Graphics, Sprite, Texture } from 'pixi.js';

// ============ 🕳️ 软阴影（单层椭圆，无圈） ============
function drawShadowShape(g, w, h) {
  g.ellipse(0, 0, w, h).fill({ color: 0x000000, alpha: 0.28 });
}

/** 给 parent 挂一个软影（Graphics，默认隐藏由 updateShadow 控制） */
export function attachShadow(parent, w = 40, h = 12) {
  const g = new Graphics();
  drawShadowShape(g, w, h);
  g._sw = w; g._sh = h;
  g.visible = false;
  if (parent) parent.addChild(g);
  return g;
}

/** 每帧同步软影位置/大小（尺寸变化才重建图形，位置/透明度零开销） */
export function updateShadow(sh, x, y, w, h) {
  if (!sh) return;
  sh.visible = true;
  sh.x = x;
  sh.y = y;
  if (sh._sw !== w || sh._sh !== h) {
    sh._sw = w; sh._sh = h;
    sh.clear();
    drawShadowShape(sh, w, h);
  }
}

export function hideShadow(sh) {
  if (sh) sh.visible = false;
}

// ============ 💡 点光源（淡黄径向渐变纹理，additive 混合） ============
const LIGHT_SIZE = 256;
const _lightTexCache = new Map();
/** 生成淡黄径向渐变纹理（中心黄 → 边缘透明），按 innerRatio 缓存 */
export function getLightTexture(innerRatio = 1) {
  let t = _lightTexCache.get(innerRatio);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = LIGHT_SIZE; c.height = LIGHT_SIZE;
  const ctx = c.getContext('2d');
  const cx = LIGHT_SIZE / 2, cy = LIGHT_SIZE / 2;
  const outer = LIGHT_SIZE / 2 - 2;
  const ratio = Math.max(0.05, Math.min(1, Number(innerRatio) || 1));
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, outer);
  g.addColorStop(0, 'rgba(255, 214, 90, 0.85)');       // 中心淡黄
  g.addColorStop(ratio >= 0.99 ? 0.55 : ratio * 0.5, 'rgba(255, 214, 90, 0.35)');
  g.addColorStop(1, 'rgba(255, 214, 90, 0)');          // 边缘透明
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LIGHT_SIZE, LIGHT_SIZE);
  // ⚡ CanvasSource 同步可用：避免 Image 异步未加载完 → 空纹理（光源不渲染 / texImage2D 警告）
  t = new Texture({ source: new CanvasSource({ resource: c }) });
  _lightTexCache.set(innerRatio, t);
  return t;
}

/** 创建光源（additive Sprite + 黄色 tint，默认隐藏由 updateLight 控制） */
export function attachLight(parent, radius = 100, color = 0xffd98c) {
  const s = new Sprite(getLightTexture());
  s.blendMode = 'add';
  s.tint = color;
  s.anchor.set(0.5);
  s.scale.set(Math.max(2, radius * 2) / LIGHT_SIZE);
  s.visible = false;
  if (parent) parent.addChild(s);
  return s;
}

/** 每帧同步光源位置/半径/强度（仅更新位置/缩放/透明度，无重建） */
export function updateLight(lt, x, y, radius, alpha) {
  if (!lt) return;
  lt.x = x;
  lt.y = y;
  lt.alpha = alpha;
  lt.visible = alpha > 0.02;
  lt.scale.set(Math.max(2, radius * 2) / LIGHT_SIZE);
}

// ============ 🌀 迷雾圆形柔边压暗纹理（normal 混合用） ============
// 中心透明（不遮挡可见区）→ innerRatio 处开始渐变 → 边缘黑 0.92（把可见区边缘的格子阶梯压成圆形柔边）
const _edgeTexCache = new Map();
export function getEdgeDarkTexture(innerRatio = 0.55) {
  let t = _edgeTexCache.get(innerRatio);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = LIGHT_SIZE; c.height = LIGHT_SIZE;
  const ctx = c.getContext('2d');
  const cx = LIGHT_SIZE / 2, cy = LIGHT_SIZE / 2;
  const outer = LIGHT_SIZE / 2 - 2;
  const ratio = Math.max(0.1, Math.min(1, Number(innerRatio) || 0.55));
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, outer);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(ratio, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LIGHT_SIZE, LIGHT_SIZE);
  t = new Texture({ source: new CanvasSource({ resource: c }) });
  _edgeTexCache.set(innerRatio, t);
  return t;
}
