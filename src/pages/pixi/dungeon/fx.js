/**
 * 地牢玩家受击特效模块：冻伤/雷击/烫伤 的抖动 + 颜色滤镜 + 透明度淡入淡出 + 头顶飘字
 * 从 dungeon.vue 拆出。特效内部状态（抖动/滤镜/飘字池）内聚在本模块，主文件无需再维护。
 *
 * 依赖通过 initFx(env) 注入（getter 实时读取）：
 *  - getApp()                  Pixi Application
 *  - getPlayerSprite()         玩家 spine 对象
 *  - getTileW() / getScale()   瓦片宽 / 缩放（计算字号与抖动幅度）
 *  - getMapOffsetX() / getMapOffsetY()  地图偏移
 *  - getPPixelX() / getPPixelY()        玩家像素坐标（中心）
 *  - getPlayerHeadOff()        头像底部偏移 { x, y }
 */

import { Text, ColorMatrixFilter } from 'pixi.js';

let getApp = () => null;
let getPlayerSprite = () => null;
let getTileW = () => 32;
let getScale = () => 1;
let getMapOffsetX = () => 0;
let getMapOffsetY = () => 0;
let getPPixelX = () => 0;
let getPPixelY = () => 0;
let getPlayerHeadOff = () => ({ x: 0, y: 0 });

// 🎬 玩家头像受击特效内部状态
let playerShakeTimer = 0;     // 头像抖动剩余时间（秒）
let playerShakeAmp = 0;       // 抖动幅度（像素）
let playerShakeSeed = 0;      // 抖动相位种子（随机抖动更自然）
let playerShakeTotal = 0;     // 抖动总时长（用于衰减归一化）
let playerFxTimer = 0;        // 透明度特效剩余时间（秒）
let playerFxTotal = 0;        // 透明度特效总时长（用于淡入淡出归一化）
let playerFxKind = null;      // 当前特效类型 'frost'（冻伤）| 'lightning'（雷击）
let playerFxFilter = null;    // 颜色滤镜（冻伤淡蓝 / 电击淡红）
let floatTexts = [];          // 头顶飘字数组 [{ text, alpha, vy, life }]（Text 对象复用池）

/** 注入特效依赖 */
export function initFx(env) {
  if (typeof env.getApp === 'function') getApp = env.getApp;
  if (typeof env.getPlayerSprite === 'function') getPlayerSprite = env.getPlayerSprite;
  if (typeof env.getTileW === 'function') getTileW = env.getTileW;
  if (typeof env.getScale === 'function') getScale = env.getScale;
  if (typeof env.getMapOffsetX === 'function') getMapOffsetX = env.getMapOffsetX;
  if (typeof env.getMapOffsetY === 'function') getMapOffsetY = env.getMapOffsetY;
  if (typeof env.getPPixelX === 'function') getPPixelX = env.getPPixelX;
  if (typeof env.getPPixelY === 'function') getPPixelY = env.getPPixelY;
  if (typeof env.getPlayerHeadOff === 'function') getPlayerHeadOff = env.getPlayerHeadOff;
}

// 💬 玩家头顶飘字（小字号、贴头像不飘高、淡入淡出）
export function spawnFloatText(textStr, color) {
  const app = getApp();
  const playerSprite = getPlayerSprite();
  if (!app || !playerSprite) return;
  let t = floatTexts.find(x => !x.active);
  if (!t) {
    const pixiText = new Text({
      text: textStr,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: Math.max(12, Math.round(getTileW() * getScale() * 0.4)), // 小字号
        fontWeight: 'bold',
        fill: color || 0xff3333,
        stroke: { color: 0x000000, width: 2 },
      },
      resolution: 2,
    });
    pixiText.anchor.set(0.5, 0.5); // 中心锚点 → 贴近头像头顶
    pixiText.visible = false;
    app.stage.addChild(pixiText);
    t = { pixiText, active: false, vy: 0, life: 0, alpha: 1 };
    floatTexts.push(t);
  }
  t.pixiText.text = textStr;
  // 🎨 复用 Text 时同步更新填充色（否则会沿用上一次飘字的颜色，如岩浆红色）
  t.pixiText.style.fill = color || 0xff3333;
  t.active = true;
  t.life = 1.0;              // 显示 1 秒
  t.vy = -getTileW() * getScale() * 0.35; // 上浮速度（很小，y 轴只移动一点点）
  t.pixiText.visible = true;
  // 定位到玩家头顶很近处（屏幕坐标，贴近头像不飘高）
  t.pixiText.x = getMapOffsetX() + getPPixelX();
  t.pixiText.y = getMapOffsetY() + getPPixelY() - getTileW() * getScale() * 0.55;
  t.pixiText.alpha = 0;
  t.pixiText.scale.set(1);
}

// 触发玩家头像特效：短促抖动 + 颜色滤镜 + 透明度淡入淡出 + 头顶飘字
// kind: 'frost'（冻伤，淡蓝色滤镜）| 'lightning'（雷击，淡红色滤镜）| 'burn'（烫伤，橙红色滤镜）
export function triggerPlayerFx(kind) {
  const app = getApp();
  const playerSprite = getPlayerSprite();
  if (!app || !playerSprite) return;
  // 抖动参数（短促）：电击/烫伤抖得更狠
  const strong = kind === 'lightning' || kind === 'burn';
  playerShakeTotal = strong ? 0.30 : 0.22;
  playerShakeTimer = playerShakeTotal;
  playerShakeSeed = Math.random() * 10;
  playerShakeAmp = strong ? getTileW() * getScale() * 0.22 : getTileW() * getScale() * 0.14;
  // 透明度特效（短促淡入淡出）
  playerFxKind = kind;
  playerFxTotal = strong ? 0.35 : 0.45; // 特效总时长（秒）
  playerFxTimer = playerFxTotal;
  // 颜色滤镜：冻伤=淡蓝，电击=淡红，烫伤=橙红（柔和色调叠加在头像上）
  if (!playerFxFilter) playerFxFilter = new ColorMatrixFilter();
  if (kind === 'frost') {
    // ❄️ 淡蓝色滤镜：冷蓝调（结冰感），强度适中
    playerFxFilter.matrix = [
      0.8, 0.1, 0.2, 0, 0.08,   // R 略降
      0.1, 0.9, 0.3, 0, 0.10,   // G 持平
      0.2, 0.3, 1.1, 0, 0.18,   // B 增强（淡蓝）
      0,   0,   0,   1, 0,
    ];
  } else if (kind === 'burn') {
    // 🔥 橙红色滤镜：偏红暖调（灼烧感），强度适中
    playerFxFilter.matrix = [
      1.2, 0.25, 0.05, 0, 0.18, // R 增强（红）
      0.15, 0.9, 0.05, 0, 0.08, // G 略降
      0.05, 0.1, 0.8,  0, 0.02, // B 明显降（偏橙红）
      0,    0,   0,    1, 0,
    ];
  } else {
    // ⚡ 淡红色滤镜：偏红暖调（电击感），强度适中
    playerFxFilter.matrix = [
      1.15, 0.2, 0.1, 0, 0.20,  // R 增强（淡红）
      0.1, 0.85, 0.1, 0, 0.05,  // G 略降
      0.1, 0.1, 0.85, 0, 0.05,  // B 略降
      0,   0,   0,   1, 0,
    ];
  }
  playerSprite.filters = [playerFxFilter];
  // 从全亮开始，更新时做淡入淡出脉冲
  playerSprite.alpha = 1;
}

// 每帧更新玩家特效（短促抖动 + 透明度淡入淡出 + 飘字上浮）
export function updatePlayerFx(dt) {
  const playerSprite = getPlayerSprite();
  const tileW = getTileW(), scale = getScale();
  const mapOffsetX = getMapOffsetX(), mapOffsetY = getMapOffsetY();
  const pPixelX = getPPixelX(), pPixelY = getPPixelY();
  const playerHeadOff = getPlayerHeadOff();
  // 头像抖动：基础位置 + 随机偏移（短促衰减）
  if (playerSprite) {
    if (playerShakeTimer > 0) {
      playerShakeTimer -= dt;
      playerShakeSeed += dt * 45; // 抖动频率
      const decay = playerShakeTotal > 0 ? Math.max(0, playerShakeTimer / playerShakeTotal) : 0;
      const amp = playerShakeAmp * decay;
      playerSprite.x = mapOffsetX + pPixelX - playerHeadOff.x + Math.sin(playerShakeSeed * 8.5) * amp;
      playerSprite.y = mapOffsetY + pPixelY - playerHeadOff.y + Math.cos(playerShakeSeed * 6.7) * amp;
    } else {
      // 抖动结束，恢复基准位置
      playerSprite.x = mapOffsetX + pPixelX - playerHeadOff.x;
      playerSprite.y = mapOffsetY + pPixelY - playerHeadOff.y;
    }
    // 透明度淡入淡出：受击瞬间变透明（闪一下），随后快速淡出恢复全亮
    if (playerFxTimer > 0) {
      playerFxTimer -= dt;
      const progress = playerFxTotal > 0 ? 1 - playerFxTimer / playerFxTotal : 1; // 0→1
      if (progress < 0.25) {
        // 前 25%：快速淡入（变透明，闪一下）
        playerSprite.alpha = Math.max(0.15, 1 - progress / 0.25 * 0.85);
      } else if (progress < 0.6) {
        // 中段：保持较低透明度（受击滞留）
        playerSprite.alpha = 0.15 + (progress - 0.25) / 0.35 * 0.3;
      } else {
        // 后段：淡出恢复全亮
        playerSprite.alpha = Math.min(1, 0.45 + (progress - 0.6) / 0.4 * 0.55);
      }
      if (playerFxTimer <= 0) {
        playerSprite.alpha = 1;
        playerFxKind = null;
        // 特效结束：清除颜色滤镜
        if (playerFxFilter) {
          playerSprite.filters = [];
          playerFxFilter.reset();
        }
      }
    }
  }
  // 飘字：淡入淡出 + 轻微上浮（y 轴只移动一点点）
  for (const t of floatTexts) {
    if (!t.active) continue;
    t.life -= dt;
    t.pixiText.y += t.vy * dt;
    if (t.life <= 0) {
      t.active = false;
      t.pixiText.visible = false;
    } else {
      // 淡入淡出：前 30% 淡入到全亮，后 40% 淡出到消失
      const total = 1.0;
      const elapsed = total - t.life;
      let alpha = 1;
      if (elapsed < total * 0.3) {
        alpha = elapsed / (total * 0.3);        // 淡入
      } else if (t.life < total * 0.4) {
        alpha = t.life / (total * 0.4);         // 淡出
      }
      t.pixiText.alpha = alpha;
    }
  }
}

// 清理玩家特效（卸载时）
export function clearPlayerFx() {
  const app = getApp();
  const playerSprite = getPlayerSprite();
  playerShakeTimer = 0;
  playerShakeTotal = 0;
  playerFxTimer = 0;
  playerFxTotal = 0;
  playerFxKind = null;
  if (playerFxFilter) {
    try { playerFxFilter.destroy(); } catch (e) {}
    playerFxFilter = null;
  }
  if (playerSprite) {
    playerSprite.filters = [];
    playerSprite.alpha = 1; // 恢复全亮
  }
  for (const t of floatTexts) {
    if (t.pixiText) {
      try { app.stage.removeChild(t.pixiText); } catch (e) {}
    }
  }
  floatTexts = [];
}
