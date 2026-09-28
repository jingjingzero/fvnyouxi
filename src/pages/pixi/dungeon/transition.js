// 🎬 过场过渡系统：进入地牢 / 进入战斗 / 死亡 三种场景切换的滤镜过渡动画
//   用法：
//     import { initTransition, playSceneTransition } from './dungeon/transition.js';
//     initTransition(app);                                     // app 初始化后调用一次
//     playSceneTransition('enterBattle', { onDone: () => {...} });  // 播放过渡，播完回调
//   三种类型视觉（纯滤镜 + 图形，无粒子）：
//     enterDungeon —— 异界之门开启：黑幕渐隐 + 电影黑边 + 金色传送光轮扩散 + 冷色调
//     enterBattle  —— 血色战意：红黑脉冲 + 开场红闪 + 三层冲击波环 + 震屏 + 边缘红光
//     death        —— 灵魂消逝：灰度冷色 + 暗幕渐深 + 顶部黑幕下压至全黑（收尾完整）
//   ⚠️ 兼容性注意：滤镜全部用 .matrix 数组直写（pixi v8 已验证）；每帧绘制 try-catch，
//      并带兜底定时器保证 onDone 一定触发（杜绝卡死）。
//   过渡是独立渲染层 + 独立 ticker 回调，完全不阻塞任何数据加载与游戏逻辑。
import { Container, Graphics, ColorMatrixFilter, Text } from 'pixi.js';

let app = null;
let layer = null;        // 全屏过渡容器（app.stage 最上层）
let overlay = null;      // 全屏遮罩（黑/红/灰）
let glow = null;         // 光圈/冲击波
let colorFilter = null;  // 全屏色调/灰度滤镜
let active = null;       // 当前播放 { type, t, dur }
let onDone = null;       // 过渡完成回调
let textLabel = null;    // 居中提示文字（如“进入战斗”）
let tickerFn = null;
let fallbackTimer = null;

const DUR = { enterDungeon: 1.3, enterBattle: 1.1, death: 1.2 };

// 直接写矩阵：按 amount(0~1) 向目标色偏色（amount=0 不变）
function applyTint(f, color, amount) {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  const t = Math.max(0, Math.min(1, amount));
  f.matrix = [
    1 + (r - 1) * t, 0, 0, 0, 0,
    0, 1 + (g - 1) * t, 0, 0, 0,
    0, 0, 1 + (b - 1) * t, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

// 直接写矩阵：按 gray(0~1) 灰度化（gray=1 全灰度）
function applyGray(f, gray) {
  const s = Math.max(0, Math.min(1, gray));
  const lr = 0.299, lg = 0.587, lb = 0.114;
  f.matrix = [
    lr * s + (1 - s), lg * s, lb * s, 0, 0,
    lr * s, lg * s + (1 - s), lb * s, 0, 0,
    lr * s, lg * s, lb * s + (1 - s), 0, 0,
    0, 0, 0, 1, 0,
  ];
}

export function initTransition(pApp) {
  if (!pApp) return;
  app = pApp;
  layer = new Container();
  layer.label = 'sceneTransitionLayer';
  // 不设 eventMode，避免拦截点击交互（过渡层只负责视觉）
  app.stage.addChild(layer);
  overlay = new Graphics();
  overlay.label = 'transitionOverlay';
  layer.addChild(overlay);
  glow = new Graphics();
  glow.label = 'transitionGlow';
  layer.addChild(glow);
  colorFilter = new ColorMatrixFilter();
  colorFilter.matrix = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
  ];
  layer.filters = [colorFilter];
  layer.visible = false;
  // 🎬 居中提示文字：内容与配色由 playSceneTransition 按类型设置（enterBattle=鲜红 / enterDungeon=金黄+黑描边）
  textLabel = new Text({
    text: '进入战斗',
    style: {
      fontFamily: 'Arial Black, "Microsoft YaHei", SimHei, sans-serif',
      fontSize: Math.round((window.innerHeight || 600) * 0.1),
      fontWeight: 'bold',
      fill: '#ffd700',
      stroke: { color: '#000000', width: 10 },
      dropShadow: true,
      dropShadowColor: '#5a4a00',
      dropShadowAlpha: 0.8,
      dropShadowBlur: 12,
      dropShadowDistance: 0,
    },
  });
  textLabel.anchor.set(0.5, 0.5);
  textLabel.visible = false;
  layer.addChild(textLabel);
}

// 🎨 按过渡类型设置居中文字配色（enterDungeon=金黄+黑色描边；enterBattle=鲜红+暗红描边）
function applyTextStyle(type) {
  if (!textLabel) return;
  const st = textLabel.style;
  if (type === 'enterDungeon') {
    st.fill = '#ffd700';
    st.stroke = { color: '#000000', width: 10 };
    st.dropShadowColor = '#5a4a00';
  } else if (type === 'enterBattle') {
    st.fill = '#ff1e1e';
    st.stroke = { color: '#2a0000', width: 8 };
    st.dropShadowColor = '#ff0000';
  }
}

export function playSceneTransition(type, opts = {}) {
  if (!layer || !app) return;
  if (active) finishTransition(false); // 若上一个还在播，直接结束不回调
  const dur = opts.duration || DUR[type] || 0.9;
  active = { type, t: 0, dur };
  onDone = opts.onDone || null;
  // 🎬 设置居中提示文字：内容（可传 opts.title，缺省按类型）+ 配色按类型
  textLabel.text = (opts.title !== undefined && opts.title !== null && String(opts.title).trim())
    ? String(opts.title)
    : (type === 'enterBattle' ? '进入战斗' : (type === 'enterDungeon' ? '地牢' : ''));
  applyTextStyle(type);
  // ⬆️ 把过渡层重新 addChild 到 stage 末尾 = 最顶层，确保不被地图/迷雾/头像等后建子节点遮挡
  app.stage.addChild(layer);
  layer.visible = true;
  layer.x = 0; layer.y = 0;
  if (!tickerFn) {
    tickerFn = () => updateTransition();
    app.ticker.add(tickerFn);
  }
  // ⏱️ 兜底：即使某帧绘制异常，也保证过渡一定结束并触发 onDone（防卡死）
  //    额外 +400ms 为动画播完后的结束保持时长
  if (fallbackTimer) clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => { if (active) finishTransition(true); }, Math.ceil(dur * 1000) + 400 + 500);
  // eslint-disable-next-line no-console
  console.log('[过渡] 开始', type, 'dur=', dur);
}

function updateTransition() {
  if (!active) return;
  const a = active;
  // 进度（用真实时间戳累计，避免帧率差异）
  const now = performance.now();
  if (a.lastT === undefined) a.lastT = now;
  a.t += (now - a.lastT) / 1000;
  a.lastT = now;
  const p = Math.min(1, a.t / a.dur);
  let w = 0, h = 0, c = 0, cy = 0;
  try {
    w = app.screen.width || window.innerWidth;
    h = app.screen.height || window.innerHeight;
    c = w / 2; cy = h / 2;
    const g = glow, o = overlay;
    g.clear();
    textLabel.visible = false; // 默认隐藏，仅 enterBattle / enterDungeon 显示
    o.clear();
    colorFilter.matrix = [
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0,
    ];

    if (a.type === 'enterDungeon') {
      // 🌌 异界之门开启
      // 黑幕渐隐
      const dark = Math.max(0, 0.95 * (1 - p));
      o.rect(0, 0, w, h).fill({ color: 0x05060a, alpha: dark });
      // 🎞️ 电影黑边：从 18% 高 → 0（开场收拢感）
      const bh = Math.max(0, h * 0.18 * (1 - p));
      o.rect(0, 0, w, bh).fill({ color: 0x000000, alpha: 1 });
      o.rect(0, h - bh, w, bh).fill({ color: 0x000000, alpha: 1 });
      // ✨ 金色传送光轮：从中心小圆向外扩散（魔法门开启）
      const rr = Math.max(w, h) * (0.03 + p * 0.45);
      const ga = Math.max(0, 1 - p);
      g.circle(c, cy, rr);
      g.stroke({ width: 6, color: 0xffd700, alpha: ga * 0.9 });
      g.circle(c, cy, rr * 0.78);
      g.stroke({ width: 3, color: 0xfff3c4, alpha: ga * 0.7 });
      g.circle(c, cy, rr * 0.5);
      g.fill({ color: 0xfff8d8, alpha: ga * 0.14 });
      // 冷色调
      applyTint(colorFilter, 0x8090ff, 0.22 * (1 - p));
    } else if (a.type === 'enterBattle') {
      // 🔥 血色战意
      // 红黑脉冲遮罩
      const dark = Math.sin(p * Math.PI) * 0.9;
      o.rect(0, 0, w, h).fill({ color: 0x2a0505, alpha: dark });
      // 开场红闪（一瞬全屏红）
      const flash = Math.max(0, 0.5 * (1 - Math.abs(p - 0.07) / 0.07));
      if (flash > 0) o.rect(0, 0, w, h).fill({ color: 0xff0000, alpha: flash });
      // 三层冲击波环（依次从中心扩散）
      const base = Math.max(w, h);
      for (let i = 0; i < 3; i++) {
        const k = i / 3;
        const pr = Math.min(1, Math.max(0, (p - k * 0.16) / (1 - k * 0.16)));
        const rr = base * 0.08 + pr * base * 0.72;
        const ga = Math.max(0, 0.9 * (1 - pr)) * (1 - k * 0.25);
        const col = i === 0 ? 0xff3333 : (i === 1 ? 0xff6600 : 0xffaa33);
        g.circle(c, cy, rr);
        g.stroke({ width: 7 - i * 2, color: col, alpha: ga });
      }
      // 边缘红光 vignette
      g.rect(0, 0, w, h);
      g.stroke({ width: base * 0.2, color: 0xff0000, alpha: 0.3 * dark });
      // 红褐色调
      applyTint(colorFilter, 0xff3030, 0.42 * dark);
    } else {
      // 💀 灵魂消逝（收尾完整：最终全黑）
      // 灰度渐深
      applyGray(colorFilter, Math.min(1, p * 1.1));
      // 暗幕渐深到接近全黑
      o.rect(0, 0, w, h).fill({ color: 0x000000, alpha: Math.min(0.92, p * 0.95) });
      // 顶部黑幕下压，最终覆盖全屏
      const bh = Math.min(h, p * h);
      o.rect(0, 0, w, bh).fill({ color: 0x000000, alpha: 1 });
      // 中心残余冷光收拢熄灭
      const inner = Math.max(0, 1 - p * 1.25);
      if (inner > 0) {
        o.circle(c, cy, Math.min(w, h) * 0.5 * inner);
        o.fill({ color: 0x8899bb, alpha: 0.12 * inner });
      }
    }

    // 🎬 居中提示文字：enterBattle（鲜红）/ enterDungeon（金黄黑描边）共用颤抖渐缓 + 淡出
    if (a.type === 'enterBattle' || a.type === 'enterDungeon') {
      textLabel.visible = true;
      const shAmp = 26 * (1 - p);              // 振幅：开场最大 → 渐缓归 0
      const wob = Math.sin(p * 46);            // 高频振荡（急促颤抖感）
      textLabel.x = c + wob * shAmp * 0.9 + (Math.random() - 0.5) * shAmp * 0.7;
      textLabel.y = cy + wob * shAmp * 0.35 + (Math.random() - 0.5) * shAmp * 0.5;
      const pulse = 1 + 0.16 * (1 - p) * Math.sin(p * 34);
      textLabel.scale.set(pulse);
      // 瞬闪出现后逐渐变透明（appear 快速显现，fadeOut 随后线性淡出）
      const appear = Math.min(1, p * 10);
      const fadeOut = Math.max(0, 1 - Math.max(0, p - 0.25) / 0.75);
      textLabel.alpha = Math.min(appear, fadeOut);
    }

    // 💥 战斗过渡：屏幕震动（振幅递减）
    if (a.type === 'enterBattle') {
      const shake = Math.max(0, 14 * (1 - p));
      layer.x = (Math.random() - 0.5) * shake;
      layer.y = (Math.random() - 0.5) * shake;
    } else {
      layer.x = 0; layer.y = 0;
    }
  } catch (err) {
    // 单帧绘制异常不影响过渡进度与结束（已用兜底定时器保证 onDone 必达）
    // eslint-disable-next-line no-console
    if (window.__DUNGEON_TRANSITION_DEBUG__) console.warn('[transition]', err);
  }
  // ⏸️ 结束保持：动画播放完（p=1）后停留最终画面 0.4s 再真正结束并触发 onDone
  if (p >= 1) {
    if (a.holdStart === undefined) a.holdStart = performance.now();
    else if (performance.now() - a.holdStart >= 400) finishTransition(true);
  }
}

function finishTransition(complete) {
  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
  if (tickerFn) { try { app.ticker.remove(tickerFn); } catch (e) { /* ignore */ } tickerFn = null; }
  if (active) {
    const done = onDone;
    // eslint-disable-next-line no-console
    console.log('[过渡] 结束', active.type, 'complete=', complete, '有回调=', !!done);
    active = null; onDone = null;
    layer.visible = false;
    layer.x = 0; layer.y = 0;
    if (complete && typeof done === 'function') {
      try { done(); } catch (e) { /* ignore */ }
    }
  }
}

// 🧹 组件销毁时清理（onBeforeUnmount 调用）
export function destroyTransition() {
  finishTransition(false);
  if (app && layer) {
    try { app.stage.removeChild(layer); } catch (e) { /* ignore */ }
    try { layer.destroy({ children: true }); } catch (e) { /* ignore */ }
  }
  app = null; layer = null; overlay = null; glow = null; colorFilter = null; textLabel = null;
}
