/**
 * 定点特效动画 —— 形式二：在目标位置直接播放特效
 * 
 * 适用技能：雷击、瘴气、聚灵、武器强化、洞察、水弹等
 * 
 * 使用方式：
 *   playAtPoint(container, x, y, {
 *     effectName: 'dianji',
 *     scale: 1,
 *     animationName: 'animation',
 *     onComplete: () => { /* 动画结束回调 *\/ }
 *   })
 */
import { getEffect, returnEffect } from './effectPool.js';

/**
 * 在指定位置播放 Spine 特效（自带对象池管理）
 * @param {import('pixi.js').Container} container 父容器
 * @param {number} x X坐标
 * @param {number} y Y坐标
 * @param {Object} options 配置
 * @param {string} options.effectName 特效类型
 * @param {number} [options.scale=1] 缩放
 * @param {boolean} [options.flipX=false] 水平翻转
 * @param {number} [options.zIndex=100] 层级
 * @param {string} [options.animationName='animation'] 动画名
 * @param {boolean} [options.loop=false] 是否循环
 * @param {number} [options.timeScale=1] 动画播放速度
 * @param {Function} [options.onComplete] 动画结束回调（非循环时触发）
 * @param {Function} [options.onStart] 动画开始回调
 * @returns {import('@esotericsoftware/spine-pixi-v8').Spine} Spine 实例
 */
export function playAtPoint(container, x, y, options = {}) {
  const {
    effectName,
    scale = 1,
    flipX = false,
    zIndex = 100,
    animationName = 'animation',
    loop = false,
    timeScale = 1,
    onComplete,
    onStart,
  } = options;

  // 从对象池获取特效
  const effect = getEffect(effectName);

  // 基础属性设置
  effect.scale.set(flipX ? -scale : scale, scale);
  effect.x = x;
  effect.y = y;
  effect.zIndex = zIndex;

  // 添加到容器
  container.addChild(effect);
  if (container.sortableChildren || container.sortChildren) {
    container.sortChildren();
  }

  // 确保完成监听器存在
  if (!effect._hasCompleteListener) {
    effect.state.addListener({
      complete: () => {
        if (effect._completeListeners?.length) {
          effect._completeListeners.forEach((fn) => {
            try { fn(); } catch (e) { console.error(e); }
          });
          effect._completeListeners.length = 0;
        }
      }
    });
    effect._hasCompleteListener = true;
  }

  // 添加本次的完成回调
  if (onComplete) {
    effect._completeListeners.push(onComplete);
  }

  // 播放动画
  effect.state.timeScale = timeScale;
  effect.state.setAnimation(0, animationName, loop);

  // 开始回调
  onStart?.();

  // 非循环动画，结束后自动归还到对象池
  if (!loop) {
    effect._completeListeners.push(() => {
      returnEffect(effectName, effect);
    });
  }

  return effect;
}

/**
 * 延迟执行回调（用于"播放特效 → 延时结算伤害"模式）
 * @param {number} delay 延迟毫秒数
 * @param {Function} callback 回调函数
 * @returns {number} setTimeout 返回值，可用 clearTimeout 取消
 */
export function delayAction(delay, callback) {
  return setTimeout(callback, delay);
}
