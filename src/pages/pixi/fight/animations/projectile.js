/**
 * 投射物动画 —— 形式一：从点A飞到点B
 * 
 * 适用技能：射击、冰箭、火球等
 * 
 * 使用方式：
 *   playProjectile(container, startPos, endPos, {
 *     effectName: 'huoqiu',
 *     scale: 0.25,
 *     duration: 0.35,
 *     rotationFromAngle: true,
 *     onHit: () => { /* 命中回调 *\/ }
 *   })
 */
import gsap from 'gsap';
import { getEffect, returnEffect, VW_CACHE, VH_CACHE } from './effectPool.js';

/**
 * 🎯 安全播放动画：校验动画名在骨骼中存在，不存在则回退到骨骼第一个动画，
 *    防止 "Animation not found: xxx" 崩溃（如 bullet 资源已无 idle 动画）
 * @param {import('pixi.js').Spine} spine
 * @param {string} name 期望的动画名
 * @param {boolean} loop 是否循环
 */
function setAnimSafe(spine, name, loop) {
  const anims = spine.skeleton?.data?.animations || [];
  const safeName = anims.some(a => a.name === name) ? name : (anims[0]?.name || name);
  spine.state.setAnimation(0, safeName, loop);
}

/**
 * 播放投射物动画（从起点飞到终点）
 * @param {import('pixi.js').Container} container 父容器
 * @param {{x:number, y:number}} start 起点坐标
 * @param {{x:number, y:number}} end 终点坐标
 * @param {Object} options 配置
 * @param {string} options.effectName 特效类型（effectPool 中注册的 key）
 * @param {number} [options.scale=1] 缩放
 * @param {number} [options.duration=0.3] 飞行时长（秒）
 * @param {string} [options.animName='animation'] Spine 动画名
 * @param {number} [options.timeScale=1] 动画播放速度
 * @param {boolean} [options.rotationFromAngle=true] 是否根据飞行方向自动旋转
 * @param {number} [options.zIndex=100] 层级
 * @param {Function} [options.onHit] 命中回调
 * @param {Function} [options.onHitAnimComplete] 命中动画播放完毕回调（用于冰箭这种命中后切动画的）
 * @param {string} [options.hitAnimName] 命中后播放的动画名（如冰箭的 'animation1'）
 * @param {boolean} [options.hitAnimLoop=false] 命中动画是否循环
 * @param {number|null} [options.hitAnimX=null] 命中动画绝对锚点 x（屏幕坐标，默认=敌人实际位置；
 *   不传时回退到飞行终点 end.x）。🎯 命中动画默认就锚定在敌人身上，不再自带偏移
 * @param {number|null} [options.hitAnimY=null] 命中动画绝对锚点 y（屏幕坐标，默认=敌人实际位置；
 *   不传时回退到飞行终点 end.y）
 *  * @param {number} [options.hitAnimDelay=0] 命中动画开始播放后，延迟多少毫秒触发 onHit（伤害）
 *    （🎯 伤害触发时机 = 第二段动画「开始播放」时 + 该延时；0 = 开始播放立即结算）
 * @param {boolean} [options.createExplosion=false] 是否在终点生成爆炸特效
 * @param {string} [options.explosionEffectName='baozha'] 爆炸特效类型
 * @returns {{ projectile: *, gsapTween: gsap.core.Tween }} 动画对象，可用 .gsapTween.kill() 取消
 */
export function playProjectile(container, start, end, options = {}) {
  const {
    effectName,
    scale = 1,
    duration = 0.3,
    animName = 'animation',
    timeScale = 1,
    rotationFromAngle = true,
    zIndex = 100,
    onHit,
    onHitAnimComplete,
    hitAnimName,
    hitAnimLoop = false,
    hitAnimScale = null,  // 🎯 命中动画独立缩放（null = 沿用飞行 scale）
    hitAnimX = null,      // 🎯 命中动画绝对锚点 x（屏幕坐标；不传 = 回退飞行终点 end.x）
    hitAnimY = null,      // 🎯 命中动画绝对锚点 y（屏幕坐标；不传 = 回退飞行终点 end.y）
    hitAnimOffsetX = 0, // 🎯 命中动画独立水平偏移（vw，正=右，叠加在锚点上）
    hitAnimOffsetY = 0, // 🎯 命中动画独立垂直偏移（vh，正=下，叠加在锚点上）
    hitAnimDelay = 0,   // ⏱️ 第二段动画开始播放后，延迟多少毫秒触发 onHit（伤害）
    createExplosion = false,
    explosionEffectName = 'baozha',
  } = options;

  // 从对象池获取特效
  const projectile = getEffect(effectName);
  projectile.scale.set(scale);
  projectile.x = start.x;
  projectile.y = start.y;
  projectile.zIndex = zIndex;

  // 根据飞行方向自动旋转
  if (rotationFromAngle) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    projectile.rotation = Math.atan2(dy, dx);
  }

  // 播放飞行动画（🎯 动画名安全校验，防止资源缺名报错）
  projectile.state.timeScale = timeScale;
  setAnimSafe(projectile, animName, true);
  container.addChild(projectile);
  if (container.sortChildren) container.sortChildren();

  // 飞行动画
  const tween = gsap.to(projectile, {
    x: end.x,
    y: end.y,
    duration,
    ease: 'none',
    onComplete: () => {
      try {
        if (!projectile || !projectile.state) return;

        // 如果配置了命中动画（如冰箭的 animation1）
        if (hitAnimName) {
          // 🎯 命中动画独立缩放（hitAnimScale 不配则沿用飞行 scale）
          if (hitAnimScale != null) projectile.scale.set(hitAnimScale);
          // 🎯 命中动画位置：默认锚定调用方传入的敌人实际位置（hitAnimX/Y，屏幕坐标），
          //    不传时回退到飞行终点；只有配置了 hitAnimOffsetX/Y 才额外偏移（默认 0 = 无偏移）
          projectile.x = (hitAnimX ?? end.x) + hitAnimOffsetX * VW_CACHE;
          projectile.y = (hitAnimY ?? end.y) + hitAnimOffsetY * VH_CACHE;
          setAnimSafe(projectile, hitAnimName, hitAnimLoop);
          // 🎯 伤害触发时机：第二段动画「开始播放」时结算（+ hitAnimDelay 延时），
          //    而不是等动画播完（配置 hitAnimDelay 可延迟出伤）
          if (onHit) {
            if (hitAnimDelay > 0) {
              setTimeout(() => { try { onHit(); } catch (e) { /* 忽略 */ } }, hitAnimDelay);
            } else {
              try { onHit(); } catch (e) { /* 忽略 */ }
            }
          }
          // 命中动画结束后回收
          addCompleteListener(projectile, () => {
            returnEffect(effectName, projectile);
            onHitAnimComplete?.();
          });
        } else {
          // 没有命中动画，立即回调 + 回收
          onHit?.();
          returnEffect(effectName, projectile);
          onHitAnimComplete?.();
        }

        // 生成爆炸特效
        if (createExplosion) {
          spawnExplosion(container, { x: end.x, y: end.y }, explosionEffectName);
        }
      } catch (e) {
        returnEffect(effectName, projectile);
      }
    },
  });

  return { projectile, gsapTween: tween };
}

/**
 * 在指定位置生成爆炸特效
 */
function spawnExplosion(container, pos, explosionEffectName) {
  const boom = getEffect(explosionEffectName);
  boom.x = pos.x;
  boom.y = pos.y;
  boom.scale.set(0.5);
  boom.zIndex = 101;
  container.addChild(boom);
  if (container.sortChildren) container.sortChildren();

  boom.state.setAnimation(0, 'animation', false);

  // 确保完成监听器存在
  if (!boom._hasCompleteListener) {
    boom.state.addListener({
      complete: () => {
        if (boom._completeListeners?.length) {
          boom._completeListeners.forEach((fn) => {
            try { fn(); } catch (err) { console.error(err); }
          });
          boom._completeListeners.length = 0;
        }
      }
    });
    boom._hasCompleteListener = true;
  }

  // 爆炸结束回收
  boom._completeListeners.push(() => {
    try { returnEffect(explosionEffectName, boom); } catch (e) {}
  });
}

/**
 * 统一添加完成监听器到 Spine
 */
function addCompleteListener(spine, fn) {
  if (!spine._hasCompleteListener) {
    spine.state.addListener({
      complete: () => {
        if (spine._completeListeners?.length) {
          spine._completeListeners.forEach((cb) => {
            try { cb(); } catch (err) { console.error(err); }
          });
          spine._completeListeners.length = 0;
        }
      }
    });
    spine._hasCompleteListener = true;
  }
  spine._completeListeners.push(fn);
}
