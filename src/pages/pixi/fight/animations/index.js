/**
 * 技能动画播放模块
 * 
 * 统一封装所有技能动画的播放形式，供外部使用。
 * 目前支持两种播放形式：
 * 
 * 1. playProjectile  — 投射物从点A飞到点B（如射击、冰箭、火球）
 * 2. playAtPoint     — 在目标位置直接播放特效（如雷击、瘴气、聚灵）
 * 
 * 所有函数返回动画对象，外部可通过 .kill() 取消动画。
 */

export { getEffect, returnEffect, prewarmEffectPool, initCache, getVHCache, getVWCache, VH_CACHE, VW_CACHE, VH, VW, EFFECT_SCALE_BASE } from './effectPool.js';
export { playProjectile } from './projectile.js';
export { playAtPoint } from './atPoint.js';
export { playReflectBuff, removeReflectBuff, playPoisonMist, removePoisonMist } from './persistent.js';
export { createSummon, clearAllSummons, getAllSummons, getSummonInstance, getFirePointPosition, removeSummon, onSummonTurnEnd, clearBattleSummons } from './summon.js';
