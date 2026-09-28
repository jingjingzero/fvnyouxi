/**
 * 召唤物管理
 * 
 * 管理影分身等召唤物的创建、定位、动画和销毁
 */
import { battleLog } from '../logger.js'
import gsap from 'gsap';
import { getEffect, returnEffect, VH, VW } from './effectPool.js';
import { getPlayerScreenPos } from '../battle.js';

// 召唤物配置
const SUMMON_CONFIG = {
  drone: {
    effectName: 'summon_drone',
    baseOffsetX: 3 * VW,    // 玩家左侧基础偏移（百分比）
    baseOffsetY: -40 * VH,
    spacingX: 6 * VW,       // 召唤物之间的间距
    spacingY: 5 * VH,
    maxPerRow: 3,
    scale: 0.3,
    maxCount: 6,
    maxTurns: 3,
    fireOffsetX: 30,
    fireOffsetY: -8,
    floatRange: 8,
    floatDuration: 2,
  },
};

const activeSummons = {
  drone: [],
};

/**
 * 获取召唤物开火点位置
 */
export function getFirePointPosition(summonInstance) {
  const config = SUMMON_CONFIG.drone;
  return {
    x: summonInstance.x + config.fireOffsetX,
    y: summonInstance.y + config.fireOffsetY,
  };
}

/**
 * 计算召唤物位置
 */
function calculateSummonPosition(summonType) {
  const config = SUMMON_CONFIG[summonType];
  const count = activeSummons[summonType].length;
  const row = Math.floor(count / config.maxPerRow);
  const col = count % config.maxPerRow;

  const screenPos = getPlayerScreenPos();
  const baseX = screenPos ? screenPos.x : 0;
  const baseY = screenPos ? screenPos.y : 0;

  return {
    x: baseX + config.baseOffsetX - col * config.spacingX,
    y: baseY + config.baseOffsetY + row * config.spacingY,
  };
}

/**
 * 创建召唤物
 * @param {string} summonType - 召唤物类型
 * @param {Object} player - 玩家对象
 * @param {Object} user - Pinia store
 * @param {import('pixi.js').Container} [container] - 可选，特效容器（不传则用 getFightContainer）
 */
export function createSummon(summonType, player, user, container) {
  const config = SUMMON_CONFIG[summonType];
  if (activeSummons[summonType].length >= config.maxCount) {
    battleLog(`[召唤物] ${summonType}已达上限${config.maxCount}`);
    return null;
  }

  const position = calculateSummonPosition(summonType);
  const summon = getEffect(config.effectName);

  summon.scale.set(config.scale * 0.5);
  summon.alpha = 0;
  summon.x = position.x;
  summon.y = position.y;
  summon.zIndex = 999;
  summon.pivot.set(0.5, 0.5);
  summon.rotation = 0;

  summon.state.setAnimation(0, 'animation', true);

  // 添加到特效层
  const effectContainer = container || getFightContainer();
  if (effectContainer) {
    effectContainer.addChild(summon);
    effectContainer.sortChildren();
  } else {
    user.pixi.app.addChild(summon);
  }

  // 入场动画：0.3秒淡入放大
  gsap.to(summon, {
    alpha: 1,
    scale: config.scale,
    duration: 0.3,
    ease: 'back.out(1.5)',
  });

  const baseY = position.y;
  const randomPhase = Math.random();

  // 纯上下浮动动画
  const floatTl = gsap.timeline({ repeat: -1 });
  floatTl.to(summon, {
    y: baseY + config.floatRange,
    duration: config.floatDuration / 2,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
  floatTl.progress(randomPhase);

  const summonData = {
    id: Date.now() + Math.random(),
    type: summonType,
    instance: summon,
    x: position.x,
    y: position.y,
    baseX: position.x,
    baseY,
    remainingTurns: config.maxTurns,
    animTimeline: floatTl,
  };

  activeSummons[summonType].push(summonData);
  return summonData;
}

/**
 * 刷新召唤物位置（其他召唤物被移除时调整）
 */
function refreshSummonPositions(summonType) {
  const config = SUMMON_CONFIG[summonType];
  const screenPos = getPlayerScreenPos();
  const baseX = screenPos ? screenPos.x : 0;
  const baseY = screenPos ? screenPos.y : 0;

  activeSummons[summonType].forEach((summon, index) => {
    const row = Math.floor(index / config.maxPerRow);
    const col = index % config.maxPerRow;

    const newX = baseX + config.baseOffsetX - col * config.spacingX;
    const newBaseY = baseY + config.baseOffsetY + row * config.spacingY;

    summon.x = newX;
    summon.y = newBaseY;
    summon.baseY = newBaseY;

    gsap.to(summon.instance, {
      x: newX,
      y: newBaseY,
      duration: 0.3,
      ease: 'power2.out',
    });
  });
}

/**
 * 移除指定召唤物
 */
export function removeSummon(summonType, summonId) {
  const index = activeSummons[summonType].findIndex((s) => s.id === summonId);
  if (index >= 0) {
    const summon = activeSummons[summonType][index];
    summon.animTimeline?.kill();
    returnEffect(SUMMON_CONFIG[summonType].effectName, summon.instance);
    activeSummons[summonType].splice(index, 1);
    refreshSummonPositions(summonType);
  }
}

/**
 * 获取所有召唤物
 */
export function getAllSummons(summonType) {
  return [...activeSummons[summonType]];
}

/**
 * 获取指定召唤物实例
 */
export function getSummonInstance(summonType, summonId) {
  return activeSummons[summonType].find((s) => s.id === summonId)?.instance;
}

/**
 * 清空所有召唤物
 */
export function clearAllSummons() {
  Object.keys(activeSummons).forEach((type) => {
    [...activeSummons[type]].forEach((summon) => {
      summon.animTimeline?.kill();
      returnEffect(SUMMON_CONFIG[type].effectName, summon.instance);
    });
    activeSummons[type] = [];
  });
}

/**
 * 清空所有战斗相关召唤物和状态
 */
export function clearBattleSummons(allies) {
  clearAllSummons();
  if (allies && Array.isArray(allies)) {
    for (let i = allies.length - 1; i >= 0; i--) {
      const unit = allies[i];
      if (unit.isWaterSpirit) {
        if (unit.spineInstance) {
          returnEffect('shuituanzi', unit.spineInstance);
          unit.spineInstance = null;
        }
        if (unit.onDeactivate) unit.onDeactivate();
        allies.splice(i, 1);
        continue;
      }
      if (unit.isShadowClone) {
        if (unit.spineInstance) {
          returnEffect('fenshen', unit.spineInstance);
          unit.spineInstance = null;
        }
        if (unit.onDeactivate) unit.onDeactivate();
        allies.splice(i, 1);
        continue;
      }
    }
  }
}

/**
 * 召唤物回合结束处理
 */
export function onSummonTurnEnd() {
  Object.keys(activeSummons).forEach((type) => {
    activeSummons[type] = activeSummons[type].filter((summon) => {
      summon.remainingTurns--;
      if (summon.remainingTurns <= 0) {
        summon.animTimeline?.kill();
        returnEffect(SUMMON_CONFIG[type].effectName, summon.instance);
        return false;
      }
      return true;
    });
    refreshSummonPositions(type);
  });
}
