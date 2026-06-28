import {
  calculateSkillDamage, useSkillMiasma, useDrone, useSkillShadowClone, useSkillReflect,
  useWeaponBoost, useInsight, usePoisonMist, calculateFinalDamage, useSkillSpiritGather
} from './SkillDamage';
import { getEvolutionBuff } from './SkillEvolution';
import gsap from "gsap";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
// ==============================================
// 🔥 新增：Spine特效对象池（全局复用，不创建不销毁）
// ==============================================
const EFFECT_CONFIG = {
  bullet: { skeleton: 'texiaozidan_skel', atlas: 'texiaozidan_atlas' },
  laser: { skeleton: 'jiguang_skel', atlas: 'jiguang_atlas' },
  juling: { skeleton: 'juling_skel', atlas: 'juling_atlas' },
  // ✅ 无人机召唤物配置（改成你实际的Spine文件名）
  summon_drone: { skeleton: 'drone_skel', atlas: 'drone_atlas' },
  fenshen: { skeleton: 'linen_skel', atlas: 'linen_atlas' },
  dongcha: { skeleton: 'dongcha_skel', atlas: 'dongcha_atlas' },
};

// 对象池
const effectPool = {
  bullet: [],
  laser: [],
  juling: [],
  summon_drone: [],
  fenshen: [],
  dongcha: []
};


/**
 * 从对象池获取特效（优先复用，没有再创建）
 * @param {'bullet'|'laser'} type 特效类型
 */
export function getEffect(type) {
  // 优先从池子里拿复用的
  let effect = effectPool[type].pop();
  // 池子空了就创建新的
  if (!effect) {
    effect = new Spine({
      skeleton: EFFECT_CONFIG[type].skeleton,
      atlas: EFFECT_CONFIG[type].atlas
    });
  }
  // ✅ 重置特效状态（每次复用都清掉上一次的状态）
  effect.scale.set(1);
  effect.rotation = 0;
  effect.alpha = 1;
  effect.visible = true;
  effect.renderable = true;
  return effect;
}

/**
 * 归还特效到对象池（动画结束后调用）
 * @param {'bullet'|'laser'} type 特效类型
 * @param {Spine} effect 特效实例
 */
export function returnEffect(type, effect) {
  // 从父容器移除
  if (effect.parent) {
    effect.parent.removeChild(effect);
  }
  // 停止所有动画
  effect.state.clearTracks();
  // 放回对象池
  effectPool[type].push(effect);
}
// 原有技能逻辑（修改特效创建/回收逻辑）
export function useSkill(skillName, player, enemies, allies, battle, card = null, playerHand, user) {
  const cfg = user.pixi.player.CARD_DATA[skillName];
  if (!cfg) return 300;

  const baseDmg = calculateSkillDamage(skillName, player, card);
  
  if (skillName === '射击') {
    spineX1X2(player, enemies, baseDmg, card, { n1: "texiaozidan_skel", n2: "texiaozidan_atlas" }, user)
  }
  else if (skillName === '激光') {
    useSkillLaser(player, enemies, baseDmg, card, user);
  } else if (skillName === "瘴气") {
    useSkillMiasma(player, enemies, card, battle)
  } else if (skillName === "无人机") {
    useDrone(player, allies, card, battle, user)
  } else if (skillName === "影分身") {
    useSkillShadowClone(player, allies, enemies, battle, card)
  } else if (skillName === "聚灵") {
    const options = {
      effectName: 'juling',
      container: user.pixi.app,
      x: player.x,
      y: player.y + 9 * VH,
      scale: 1.6,
      animationName: 'animation',
      loop: false
    }
    playSpineEffect(options)
    useSkillSpiritGather(player, allies, card)
  } else if (skillName === "反弹") {
    useSkillReflect(player, card)
  } else if (skillName === "武器强化") {
    useWeaponBoost(player, card, playerHand)
  } else if (skillName === "洞察") {
    const options = {
      effectName: 'dongcha',
      container: user.pixi.app,
      x: player.x + 52*VW,
      y: player.y -3*VH ,
      scale: 0.4,
      animationName: 'animation',
      loop: false
    }
    playSpineEffect(options)
    useInsight(player, enemies, card)
  } else if (skillName === "毒雾") {
    usePoisonMist(player, enemies, card)
  }

  return cfg.animDelay;
}

// 单颗子弹播放函数（改用对象池）
export function playSpineProjectile(
  container,
  start,
  end,
  animName,
  duration,
  scale = 1,
  onHit
) {
  // ✅ 从对象池拿子弹，不再反复new
  const projectile = getEffect('bullet');

  projectile.scale.set(scale);
  projectile.x = start.x;
  projectile.y = start.y;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  projectile.rotation = Math.atan2(dy, dx);

  projectile.state.setAnimation(0, animName, true);
  container.addChild(projectile);

  gsap.to(projectile, {
    x: end.x,
    y: end.y,
    duration,
    ease: "none",
    onComplete: () => {
      if (!projectile) return;
      // ✅ 动画结束归还到对象池，不销毁
      returnEffect('bullet', projectile);
      onHit?.();
    }
  });

  return projectile;
}

// 多发连射逻辑
function spineX1X2(player, enemies, baseDmg, card, data, user) {
  const cfg = user.pixi.player.CARD_DATA['射击'];
  const buff = getEvolutionBuff(card);
  let hitCount = cfg.hitCount || 1;
  const fireInterval = 100; // 发射间隔
  const flyDuration = 0.3;  // 单颗子弹飞行时长

  // 卡牌进化效果（保留原有逻辑不变）
  if (card.name === '射击') {
    if (card.activeEvos.includes('快速换弹') && !card._fastReloadOriginal) {
      card._fastReloadOriginal = {
        cost: card.cost,
        limitPerTurn: card.limitPerTurn,
        triggered: false
      };
    }
    for (const eff of card.activeEvos) {
      switch (eff) {
        case '弹夹升级':
          hitCount += 2;
          break;
        case '快速换弹':
          if (!card._fastReloadOriginal.triggered) {
            card.limitPerTurn += 1;
            card._fastReloadOriginal.triggered = true;
          }
          if (card.cost === 0 && card.usedCount === 1) {
            card.cost++;
          }
          break;
      }
    }
  }

  const worldContainer = user.pixi.app;
  const startPos = { x: player.x + 5 * VW, y: player.y * 0.9 };

  // 发射前找初始目标，仅用于确定子弹初始飞行终点
  const initialTarget = enemies.find(e => e.hp > 0);
  if (!initialTarget) return 300;
  const endPos = { x: initialTarget.x - 3 * VW, y: initialTarget.y * 0.9 };

  // 循环发射子弹
  for (let i = 0; i < hitCount; i++) {
    setTimeout(() => {
      // 发射前预检：全场敌人都死了就取消后续子弹
      const hasAlive = enemies.some(e => e.hp > 0);
      if (!hasAlive) return;

      playSpineProjectile(
        worldContainer,
        startPos,
        endPos,
        "idle",
        flyDuration,
        0.2,
        () => {
          // ✅ 命中瞬间重新查找所有存活敌人，自动转移目标
          const aliveEnemies = enemies.filter(e => e.hp > 0);
          if (aliveEnemies.length === 0) return;

          // 优先打初始目标，已死亡则选第一个存活敌人
          const currentTarget = aliveEnemies.find(e => e.name === initialTarget.name) || aliveEnemies[0];

          // 计算最终伤害
          const { dmg: finalDmg, crit } = calculateFinalDamage(
            baseDmg,
            currentTarget,
            buff.ignoreArmor,
            card.dmgType,
            player,
            buff
          );
        }
      );
    }, i * fireInterval);
  }

  const totalDuration = (hitCount - 1) * fireInterval + flyDuration * 1000 + 200;
  return totalDuration;
}

const VH = window.innerHeight / 100;
const VW = window.innerWidth / 100;
//激光
function useSkillLaser(player, enemies, baseDmg, card, user) {
  const buff = getEvolutionBuff(card);
  const DAMAGE_DELAY = 50;//延迟结算毫秒

  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) return 800;

  const worldContainer = user.pixi.app;
  let hasRefund = false;

  // 🎯 只改这里：用新模板把特效和延时伤害包起来
  playSkillWithDamage({
    effectConfig: {
      effectName: 'laser',
      container: worldContainer,
      x: player.x + 5.5 * VW,
      y: player.y * 0.9,
      scale: 0.45,
      animationName: 'animation',
      loop: false
    },
    damageDelay: DAMAGE_DELAY,
    damageLogic: () => {
      // ✅ 你原来 setTimeout 里的代码原封不动搬进来
      aliveEnemies.forEach(enemy => {
        if (enemy.hp <= 0) return;
        const preHp = enemy.hp;

        const { dmg: finalDmg, crit } = calculateFinalDamage(
          baseDmg, enemy, buff.ignoreArmor, card.dmgType, player, buff
        );
        console.log('【激光】命中', enemy.name, finalDmg, crit ? '🔥暴击' : '');
        if (!hasRefund && card.activeEvos?.includes('击杀返还') && preHp > 0 && enemy.hp <= 0) {
          player.mp = Math.min(player.mp + 2, player.maxMp);
          hasRefund = true;
          console.log('✅ 激光击杀返还 +2 灵力');
        }
      });
    }
  });

  return 800;
}
function playSpineEffect(options) {
  console.log('options=', options);

  const {
    effectName,
    container,
    x,
    y,
    scale = 1,
    animationName = 'animation',
    loop = false,
    onComplete,
    onStart
  } = options;

  // 从对象池获取特效
  const effect = getEffect(effectName);

  // 基础属性设置
  effect.scale.set(scale);
  effect.x = x;
  effect.y = y;
  effect.zIndex = 100;
  // 添加到容器
  container.addChild(effect);

  // 播放动画
  effect.state.setAnimation(0, animationName, loop);

  // 开始回调
  onStart?.();

  // 动画完成监听：归还对象池 + 执行回调
  effect.state.addListener({
    complete: () => {
      returnEffect(effectName, effect);
      onComplete?.();
    }
  });

  return effect;
}
function playSkillWithDamage(options) {
  const { effectConfig, damageDelay, damageLogic } = options;

  // 1. 立即播放特效
  playSpineEffect(effectConfig);

  // 2. 延时结算伤害
  if (damageDelay > 0) {
    setTimeout(damageLogic, damageDelay);
  } else {
    damageLogic();
  }
}

// 无人机配置
const SUMMON_CONFIG = {
  drone: {
    effectName: 'summon_drone',
    baseOffsetX: 5 * VW,    // 玩家左侧基础偏移
    baseOffsetY: -30 * VH,
    spacingX: 6 * VW,       // 召唤物之间的间距
    spacingY: 5 * VH,
    maxPerRow: 3,           // 每行最多3个
    scale: 0.3,
    maxCount: 6,            // 最大召唤数量
    maxTurns: 3,            // 存活3回合
    fireOffsetX: 30,        // 开火点偏移
    fireOffsetY: -8,
    // ✅ 改为纯上下浮动参数
    floatRange: 8,          // 上下浮动的总范围（像素，越大浮动幅度越大）
    floatDuration: 2        // 上下浮动一个周期的时间（秒，越大越慢）
  }
};

const activeSummons = {
  drone: []
};

export function getFirePointPosition(summonInstance) {
  const config = SUMMON_CONFIG.drone;
  return {
    x: summonInstance.x + config.fireOffsetX,
    y: summonInstance.y + config.fireOffsetY
  };
}

function calculateSummonPosition(summonType, player) {
  const config = SUMMON_CONFIG[summonType];
  const count = activeSummons[summonType].length;
  const row = Math.floor(count / config.maxPerRow);
  const col = count % config.maxPerRow;

  return {
    x: player.x + config.baseOffsetX - (col * config.spacingX),
    y: player.y + config.baseOffsetY + (row * config.spacingY)
  };
}

export function createSummon(summonType, player, user) {
  const config = SUMMON_CONFIG[summonType];

  if (activeSummons[summonType].length >= config.maxCount) {
    console.log(`[召唤物] ${summonType}已达上限${config.maxCount}`);
    return null;
  }

  const position = calculateSummonPosition(summonType, player);
  const summon = getEffect(config.effectName);

  summon.scale.set(config.scale * 0.5); // 入场初始缩小
  summon.alpha = 0; // 入场初始透明
  summon.x = position.x;
  summon.y = position.y;
  summon.zIndex = 999;
  summon.pivot.set(0.5, 0.5);
  summon.rotation = 0; // 固定不旋转

  summon.state.setAnimation(0, 'animation', true);
  user.pixi.app.addChild(summon);

  // 入场动画：0.3秒淡入放大
  gsap.to(summon, {
    alpha: 1,
    scale: config.scale,
    duration: 0.3,
    ease: "back.out(1.5)"
  });

  const baseY = position.y;
  const randomPhase = Math.random(); // 随机初始相位，多个无人机浮动不同步

  // ✅ 改为纯上下浮动动画，无圆周、无旋转
  const floatTl = gsap.timeline({ repeat: -1 });
  // 不要在to()里写progress！
  floatTl.to(summon, {
    y: baseY + config.floatRange,
    duration: config.floatDuration / 2,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
  });
  floatTl.progress(randomPhase);

  const summonData = {
    id: Date.now() + Math.random(),
    type: summonType,
    instance: summon,
    x: position.x,
    y: position.y,
    baseX: position.x,
    baseY: baseY,
    remainingTurns: config.maxTurns,
    animTimeline: floatTl // 统一存浮动动画timeline
  };

  activeSummons[summonType].push(summonData);
  console.log(`[召唤物] 创建${summonType}，当前数量: ${activeSummons[summonType].length}`);
  return summonData;
}

export function onSummonTurnEnd(player) {
  Object.keys(activeSummons).forEach(type => {
    activeSummons[type] = activeSummons[type].filter(summon => {
      summon.remainingTurns--;
      if (summon.remainingTurns <= 0) {
        // ✅ 统一销毁浮动动画，修复原来的变量名不一致问题
        summon.animTimeline?.kill();
        returnEffect(SUMMON_CONFIG[type].effectName, summon.instance);
        console.log(`[召唤物] ${type}回合到期销毁`);
        return false;
      }
      return true;
    });
    refreshSummonPositions(type, player);
  });
}

export function removeSummon(summonType, summonId, player) {
  const index = activeSummons[summonType].findIndex(s => s.id === summonId);
  if (index >= 0) {
    const summon = activeSummons[summonType][index];
    summon.animTimeline?.kill(); // 统一销毁动画
    returnEffect(SUMMON_CONFIG[summonType].effectName, summon.instance);
    activeSummons[summonType].splice(index, 1);
    refreshSummonPositions(summonType, player);
  }
}

export function getAllSummons(summonType) {
  return [...activeSummons[summonType]];
}

export function getSummonInstance(summonType, summonId) {
  return activeSummons[summonType].find(s => s.id === summonId)?.instance;
}

export function clearAllSummons() {
  Object.keys(activeSummons).forEach(type => {
    [...activeSummons[type]].forEach(summon => {
      summon.animTimeline?.kill(); // 统一销毁动画
      returnEffect(SUMMON_CONFIG[type].effectName, summon.instance);
    });
    activeSummons[type] = [];
  });
  console.log('[召唤物] 已清空所有召唤物');
}

function refreshSummonPositions(summonType, player) {
  const config = SUMMON_CONFIG[summonType];
  activeSummons[summonType].forEach((summon, index) => {
    const row = Math.floor(index / config.maxPerRow);
    const col = index % config.maxPerRow;

    const newX = player.x + config.baseOffsetX - (col * config.spacingX);
    const newBaseY = player.y + config.baseOffsetY + (row * config.spacingY);

    summon.x = newX;
    summon.y = newBaseY;
    summon.baseY = newBaseY;

    // 平滑移动到新位置，同时更新浮动的基准Y
    gsap.to(summon.instance, {
      x: newX,
      y: newBaseY,
      duration: 0.3,
      ease: "power2.out",
      onComplete: () => {
        // 重新设置浮动动画的基准Y
        summon.animTimeline.vars.y = newBaseY + config.floatRange;
      }
    });
  });
}