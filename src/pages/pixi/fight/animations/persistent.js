/**
 * 持续性特效管理
 * 
 * 管理需要持续播放、不会被自动回收的特效：
 * - 反弹 Buff（循环播放，随 Buff 结束移除）
 * - 毒雾领域（无限循环，战斗结束移除）
 * - 冻结特效（覆盖在敌人上方）
 */
import { getEffect, returnEffect } from './effectPool.js';

// 全局存储毒雾动画实例（领域技能，全局唯一）
let poisonMistSpine = null;

// ==============================================
// 反弹 Buff 持续动画
// ==============================================

/**
 * 播放反弹 Buff 持续动画
 * @param {Object} player - 玩家对象
 * @param {import('pixi.js').Container} container - 容器
 * @param {number} x - 播放位置 X
 * @param {number} y - 播放位置 Y
 */
export function playReflectBuff(player, container, x, y) {
  if (player.reflectBuffSpine) return;
  const effect = getEffect('fantan');
  effect.x = x;
  effect.y = y;
  effect.scale.set(0.35);
  effect.zIndex = 100;
  effect.state.setAnimation(0, 'animation', true);
  container.addChild(effect);
  if (container.sortChildren) container.sortChildren();
  player.reflectBuffSpine = effect;
}

/**
 * 移除反弹 Buff 动画
 * @param {Object} player
 */
export function removeReflectBuff(player) {
  if (player.reflectBuffSpine) {
    returnEffect('fantan', player.reflectBuffSpine);
    player.reflectBuffSpine = null;
  }
}

// ==============================================
// 毒雾领域持续动画
// ==============================================

/**
 * 播放毒雾领域动画
 * @param {import('pixi.js').Container} container
 * @param {number} centerX
 * @param {number} centerY
 */
export function playPoisonMist(container, centerX, centerY) {
  if (poisonMistSpine) return;
  const effect = getEffect('duwu');
  effect.x = centerX;
  effect.y = centerY;
  effect.zIndex = -1;
  effect.scale.set(1.5);
  effect.state.timeScale = 0.6;
  effect.state.setAnimation(0, 'animation', true);
  container.addChild(effect);
  if (container.sortChildren) container.sortChildren();
  poisonMistSpine = effect;
}

/**
 * 移除毒雾领域动画
 */
export function removePoisonMist() {
  if (poisonMistSpine) {
    returnEffect('duwu', poisonMistSpine);
    poisonMistSpine = null;
  }
}

/**
 * 获取毒雾领域实例（供外部检查）
 */
export function getPoisonMistSpine() {
  return poisonMistSpine;
}
