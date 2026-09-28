/**
 * 技能动画逻辑
 *
 * 整合所有技能动画播放和伤害结算逻辑。
 * 动画播放统一委托给 animations/ 模块管理：
 *   - playProjectile   → 形式一：从点A飞到点B
 *   - playAtPoint       → 形式二：在目标位置直接播放
 *   - playReflectBuff / playPoisonMist → 持续性特效
 *   - createSummon      → 召唤物（无人机、影分身）
 *
 * 保留原有导出接口以保持外部兼容性。
 */

import { battleLog } from './logger.js'
import { ITEM_DEFS } from '@/store/configs'; // 装备 fx 战斗效果参数
import {
  calculateSkillDamage, useSkillMiasma, useSkillShadowClone, useSkillWaterSpirit, useSkillThunderSpirit, useSkillIceSpirit, useSkillFireSpirit, useSkillReflect,
  useWeaponBoost, useInsight, usePoisonMist, calculateFinalDamage, useSkillSpiritGather,
  applyIceArrowDamage, applyWaterBubbleDamage, applyLightningDamage
} from './SkillDamage';
import {
  useSkillGuangyou, useSkillShuiyu, useSkillFengren, useSkillLongjuan, useSkillJinji,
  useSkillFenyan, useSkillShuilao, useSkillDufa, useSkillHaoling, useSkillWeilai,
  useSkillMoliBaodong, useSkillFengZhiBiyou, applyBleed, tickBleed,
  useSkillHuixuanFengren, useSkillJuji, useSkillSuijiadan, useSkillDuci,
  useSkillLiuhuo, useSkillBinghan, useSkillLiansuoShandian
} from './NewCards.js';
import { getEvolutionBuff } from './SkillEvolution';
import { chance } from './rng.js'
import { getFightContainer, getPlayerScreenPos, getEnemyContainer, getEnemySpinePos, applyHeal, BattleSystem } from './battle';
import { useCounterStore, ATTACK_CARDS } from "@/store/counter";
import gsap from 'gsap';

// ==============================================
// 🔥 玩家特效定位：用玩家世界坐标（activePlayer.body.position）换算成屏幕坐标，
//    没有 activePlayer 则回退到屏幕坐标（getPlayerScreenPos）
//    换算公式与 matter.vue 一致：屏幕 = 半屏 + (世界 - 镜头) * 缩放
//    ⚠️ 主世界玩家在 matter.vue 用 user.pixi.playerInstance 暴露（含 body）
// ==============================================
const _store = useCounterStore();
function getPlayerPos() {
  const ap = _store.pixi?.playerInstance; // 主世界玩家（含 body）
  if (ap?.body?.position) {
    // 从 window 读取主世界镜头/缩放（由 matter.vue 暴露）
    const vp = window.__worldViewport;
    const cam = window.__worldCameraTarget;
    const wx = ap.body.position.x;
    const wy = ap.body.position.y;
    const vpScale = vp?.scale?.x ?? 1;
    const camX = cam?.position?.x;
    const camY = cam?.position?.y;
    if (camX !== undefined && camY !== undefined) {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      return {
        x: halfW + (wx - camX) * vpScale,
        y: halfH + (wy - camY) * vpScale,
      };
    }
    return { x: wx, y: wy };
  }
  return getPlayerScreenPos();
}

// ==============================================
// 🎯 公共：投射物「从左到右水平发射」的起点/终点
// 起点 = 玩家位置；终点 = (目标x + 往右偏移, 玩家y) —— 保证水平飞行
// 特殊情况（如某个技能起点/终点想特殊改）通过 opts 覆盖：
//   - xOffsetVW      终点 x 往右靠的偏移（vw，默认 2）
//   - startXOffsetVW 起点 x 微偏（vw，默认 1）
//   - endYOffsetVH   终点 y 额外偏移（vh，默认 0，水平用 0）
// 📋 统一支持 effectConfig 写法（第三个参数 cfg，优先于 opts）：
//   startOffsetX / startOffsetY / endOffsetX / endOffsetY / endTargetY
//   配置了 endTargetY 或 endOffsetY → 终点改用目标 y 基准（否则保持水平发射的旧行为）
// 🎯 终点基准用敌人 spine 实际渲染位置（getEnemySpinePos，屏幕坐标），
//    直接用 enemy.x/y（逻辑站位坐标）会导致投射物/命中动画偏移
// ==============================================
function calcProjectilePoints(targetEnemy, opts = {}, cfg = null) {
  const screenPos = getPlayerPos();
  // 🎯 终点基准 = 敌人 spine 实际渲染位置（屏幕坐标），fallback 敌人数据坐标
  const spinePos = getEnemySpinePos(targetEnemy);
  const tx = spinePos ? spinePos.x : (targetEnemy?.x ?? 0);
  const ty = spinePos ? spinePos.y : (targetEnemy?.y ?? 0);
  if (!screenPos) {
    return { startPos: { x: 0, y: 0 }, endPos: { x: tx, y: ty * 0.9 } };
  }
  const sx = (cfg?.startOffsetX ?? opts.startXOffsetVW ?? 1) * VW_CACHE;
  const sy = (cfg?.startOffsetY ?? 0) * VH_CACHE;
  const ex = (cfg?.endOffsetX ?? opts.xOffsetVW ?? 2) * VW_CACHE;
  const ey = (cfg?.endOffsetY ?? opts.endYOffsetVH ?? 0) * VH_CACHE;
  // 配置了 endTargetY / endOffsetY → 终点用目标 y 基准；否则保持水平（玩家 y，旧行为）
  const useTargetY = cfg?.endTargetY != null || cfg?.endOffsetY != null;
  const endY = useTargetY
    ? ty * (cfg?.endTargetY ?? 0.9) + ey
    : screenPos.y + ey;
  return {
    startPos: { x: screenPos.x + sx, y: screenPos.y + sy },
    endPos: { x: tx + ex, y: endY },
  };
}

// ==============================================
// 🎯 公共：给自己加 buff 的技能，在玩家脚底释放特效
// ⚠️ 已迁移到 effectConfig.js 配置表 + playCardEffect.js 统一播放器
//    （见 useSkill 主调度中 聚灵/武器强化/光佑/水愈/魔力暴动/风之庇佑）
// ==============================================

// ==============================================
// 🔥 从 animations 模块导入
// ==============================================
import {
  getEffect,
  returnEffect,
  prewarmEffectPool as prewarmPool,
  initCache,
  VH_CACHE, VW_CACHE, VH, VW, EFFECT_SCALE_BASE,
  playProjectile,
  playAtPoint,
  playReflectBuff as animPlayReflectBuff,
  removeReflectBuff as animRemoveReflectBuff,
  playPoisonMist as animPlayPoisonMist,
  removePoisonMist as animRemovePoisonMist,
  createSummon as animCreateSummon,
  clearAllSummons,
  getAllSummons,
  getSummonInstance,
  getFirePointPosition,
  removeSummon,
  onSummonTurnEnd,
  clearBattleSummons,
} from './animations/index.js';
import { playCardEffect, removeFieldFx, getCenterEnemy } from './playCardEffect.js';
import { getEffectConfig } from './effectConfig.js';

// ==============================================
// 🔥 缓存配置
// ==============================================
let CARD_DATA_CACHE = null;

/**
 * 初始化缓存（战斗开始时调用一次）
 */
export function initSkillCache(user) {
  CARD_DATA_CACHE = user.pixi.player.CARD_DATA;
  initCache(user);
}

function getCardConfig(skillName) {
  return CARD_DATA_CACHE?.[skillName];
}

// ==============================================
// 🔥 重新导出 animations 模块部分接口（外部兼容）
// ==============================================
export {
  getEffect, returnEffect,
  prewarmPool as prewarmEffectPool,
  clearAllSummons, getAllSummons,
  getSummonInstance, getFirePointPosition,
  removeSummon, onSummonTurnEnd, clearBattleSummons
};

// ==============================================
// 🔥 技能主调度
// ==============================================
export function useSkill(skillName, player, enemies, allies, battle, card = null, playerHand, user, target = null) {
  const cfg = getCardConfig(skillName);
  if (!cfg) return 300;

  const baseDmg = calculateSkillDamage(skillName, player, card);
  const appContainer = getFightContainer() || user.pixi.app;

  // 🧤 装备：幽暗手套 - 使用攻击牌时消耗 fx.hpCostPct 当前生命（视为受击，触发受击效果），本张攻击牌增伤 fx.boostPct（dladmin 装备编辑可改）
  player._gloveBoostCard = false; // 先清除上一张牌的残留标记（多段伤害均在本张牌结算内完成）
  if (ATTACK_CARDS.includes(skillName) && user.isItemEquipped?.('幽暗手套') && player.hp > 0) {
    const gloveFx = ITEM_DEFS['幽暗手套']?.fx || {};
    const gloveHurt = Math.floor(player.hp * Number(gloveFx.hpCostPct ?? 0.04));
    if (gloveHurt > 0) {
      // 走完整受击流程：扣护盾→扣血→西亚保命→反伤/受击被动全部触发
      BattleSystem.enemyAttack({ name: '幽暗手套', attack: gloveHurt, attackMultiplier: 1, isTrueDamage: true }, () => { });
    }
    player._gloveBoostCard = true;
    user.pixi.playerInstance?.showBuffText?.('幽暗手套');
  }

  if (skillName === '射击') {
    spineX1X2(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '激光') {
    // 🎬 特效播放数据来自配置表（播放方式/特效名/大小/偏移）
    playCardEffect({ skillName, container: appContainer, player, enemies, target });
    useSkillLaser(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '瘴气') {
    useSkillMiasma(player, enemies, card, battle, target);
  } else if (skillName === '水精灵') {
    useSkillWaterSpirit(player, allies, card, battle, user);
  } else if (skillName === '雷精灵') {
    useSkillThunderSpirit(player, allies, card, battle, user);
  } else if (skillName === '冰精灵') {
    useSkillIceSpirit(player, allies, card, battle, user);
  } else if (skillName === '火精灵') {
    useSkillFireSpirit(player, allies, card, battle, user);
  } else if (skillName === '影分身') {
    useSkillShadowClone(player, allies, enemies, battle, card);
  } else if (skillName === '聚灵') {
    // 🎬 玩家脚底 buff 特效（配置表：特效名 juling / 缩放 4.5 / 偏移 15vh）
    playCardEffect({ skillName, container: appContainer, player });
    useSkillSpiritGather(player, allies, card);
  } else if (skillName === '反弹') {
    // 🎬 反弹为持续 buff：播放循环特效并挂到玩家身上（随 buff 结束移除），数据来自配置表
    playReflectBuff(player, appContainer);
    useSkillReflect(player, card);
  } else if (skillName === '武器强化') {
    // 🎬 玩家脚底 buff 特效（配置表：wuqiqianghua / 缩放 1.6 / 偏移 15vh）
    playCardEffect({ skillName, container: appContainer, player });
    useWeaponBoost(player, card, playerHand);
  } else if (skillName === '洞察') {
    // 🎬 洞察特效：在目标敌人脚下播放（配置表：dongcha / 缩放 1.5 / y*0.9）
    playCardEffect({ skillName, container: appContainer, player, enemies, target });
    useInsight(player, enemies, card, target);
  } else if (skillName === '毒雾') {
    // 🎬 毒雾领域：全体敌人中心循环播放（配置表：duwu / 缩放 1.5 / 慢速）
    playCardEffect({ skillName, container: appContainer, player, enemies, persistent: true });
    usePoisonMist(player, enemies, card);
  } else if (skillName === '冰箭') {
    useSkillIceArrow(player, enemies, baseDmg, card, appContainer, target);
  } else if (skillName === '水弹') {
    useSkillWaterBubble(player, enemies, baseDmg, card, appContainer, user);
  } else if (skillName === '火球') {
    useSkillFireball(player, enemies, baseDmg, card, appContainer, target);
  } else if (skillName === '雷击') {
    // 🎬 雷击特效：目标脚下定点播放（配置表：dianji / y*0.9）
    playCardEffect({ skillName, container: appContainer, player, enemies, target });
    useSkillLightning(player, enemies, baseDmg, card, appContainer, target);
  } else if (skillName === '光佑') {
    // 🎬 玩家脚底 buff 特效（配置表：fantan / 缩放 1 / 偏移 5vh）
    playCardEffect({ skillName, container: appContainer, player });
    useSkillGuangyou(player, card, appContainer);
  } else if (skillName === '水愈') {
    // 🎬 玩家脚底 buff 特效（配置表：shuipao / 缩放 0.8 / 偏移 5vh）
    playCardEffect({ skillName, container: appContainer, player });
    useSkillShuiyu(player, card, appContainer);
  } else if (skillName === '风刃') {
    useSkillFengren(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '龙卷风暴') {
    playCardEffect({ skillName, container: appContainer, player, enemies, target });
    useSkillLongjuan(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '禁忌狂雷') {
    useSkillJinji(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '焚焰') {
    // 🎬 从玩家发射火球投射物（配置表：huoqiu 投射物）
    playCardEffect({ skillName, container: appContainer, player, enemies, target });
    useSkillFenyan(player, enemies, baseDmg, card, appContainer, target);
  } else if (skillName === '水牢') {
       playCardEffect({ skillName, container: appContainer, player, enemies, target });
    useSkillShuilao(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '毒发') {
    // 🎬 定点特效（Dufa 的 animation1 爆炸动画）；伤害由 onHit（动画播放完）触发，避免「动画没播就扣血」
    const dufaHit = useSkillDufa(player, enemies, baseDmg, card, appContainer, target);
    const effResult = playCardEffect({
      skillName, container: appContainer, player, enemies, target,
      onHit: dufaHit,
    });
    // 特效不可用（无敌人/资源失败）→ 立即兜底结算伤害，保证技能必出伤
    if (!effResult && dufaHit) dufaHit();
  } else if (skillName === '号令') {
       playCardEffect({ skillName, container: appContainer, player });
    useSkillHaoling(player, allies, card, appContainer);
  } else if (skillName === '未来') {
        playCardEffect({ skillName, container: appContainer, player });
    useSkillWeilai(player, enemies, card, appContainer);
  } else if (skillName === '魔力暴动') {
    // 🎬 玩家脚底 buff 特效（配置表：juling / 缩放 4.5 / 偏移 15vh）
    playCardEffect({ skillName, container: appContainer, player });
    useSkillMoliBaodong(player, card, playerHand, appContainer);
  } else if (skillName === '风之庇佑') {
    // 🎬 玩家脚底 buff 特效（配置表：wuqiqianghua / 缩放 1.6 / 偏移 15vh）
    playCardEffect({ skillName, container: appContainer, player });
    useSkillFengZhiBiyou(player, card, appContainer);
  } else if (skillName === '回旋风刃') {
    // 🎬 往返特效（配置表 type: 'roundTrip'：玩家 → 最远敌人身后 → 返回）
    // 伤害与特效同步：由 onHit（去程到达）/ onBack（返程回到）回调驱动
    const cbs = useSkillHuixuanFengren(player, enemies, baseDmg, card, appContainer);
    const effResult = playCardEffect({
      skillName, container: appContainer, player, enemies,
      onHit: cbs?.onHit, onBack: cbs?.onBack,
    });
    // 特效不可用（无敌人/资源失败）：立即兜底结算两段伤害，保证技能必出伤
    if (!effResult && cbs) {
      cbs.onHit?.();
      cbs.onBack?.();
    }
  } else if (skillName === '狙击') {
    // 🎯 狙击：单发子弹飞向最远敌人（useSkillJuji 内部自己播放子弹特效 + 结算伤害）
    //    ⚠️ 不要在这里再调 playCardEffect，否则会同时发射两颗子弹
    useSkillJuji(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '碎甲弹') {
      playCardEffect({ skillName, container: appContainer, player, enemies, target });
    useSkillSuijiadan(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '毒刺') {
    // 🎬 毒刺投射物 + 命中动画；伤害由 onHit（命中动画播放完）触发，避免「动画没播就扣血」
    const duciHit = useSkillDuci(player, enemies, baseDmg, card, appContainer, target);
    const effResult = playCardEffect({
      skillName, container: appContainer, player, enemies, target,
      onHit: duciHit,
    });
    // 特效不可用（无敌人/资源失败）→ 立即兜底结算伤害，保证技能必出伤
    if (!effResult && duciHit) duciHit();
  } else if (skillName === '流火') {
    // 🎯 流火：4 段投射物由 useSkillLiuhuo 自己播放（每段响一次音效），
    //    ⚠️ 不要在这里再调 playCardEffect，否则会多发一颗子弹（4+1=5 颗）
    useSkillLiuhuo(player, enemies, baseDmg, card, appContainer);
  } else if (skillName === '冰寒') {
       playCardEffect({ skillName, container: appContainer, player, enemies, target });
    useSkillBinghan(player, enemies, baseDmg, card, appContainer, target);
  } else if (skillName === '连锁闪电') {
    useSkillLiansuoShandian(player, enemies, baseDmg, card, appContainer);
  }

  return cfg.animDelay;
}

// ==============================================
// 🔥 投射物动画（保留旧接口兼容 battle.js）
// ==============================================
export function playSpineProjectile(container, start, end, animName, duration, scale = 1, onHit) {
  playProjectile(container, start, end, {
    effectName: 'bullet', scale, duration, animName,
    rotationFromAngle: true, zIndex: 100, onHit,
  });
}

// ==============================================
// 🔥 定点特效（保留旧接口兼容）
// ==============================================
export function playSpineEffect(options) {
  const { effectName, container, x, y, scale = 1, flipX = false, zIndex = 100, animationName = 'animation', loop = false, onComplete, onStart } = options;
  return playAtPoint(container, x, y, { effectName, scale, flipX, zIndex, animationName, loop, onComplete, onStart });
}

// ==============================================
// 🔥 反弹 Buff（保留旧接口）
// ==============================================
export function playReflectBuff(player, container) {
  if (player.reflectBuffSpine) return;
  const screenPos = getPlayerPos();
  animPlayReflectBuff(player, container, screenPos.x + 1 * VW_CACHE, screenPos.y - 10 * VH_CACHE);
}

export function removeReflectBuff(player) {
  animRemoveReflectBuff(player);
}

// ==============================================
// 🔥 毒雾领域（保留旧接口）
// ==============================================
export function playPoisonMist(player, enemies, container) {
  let centerX = window.innerWidth / 2;
  let centerY = window.innerHeight / 2;
  if (enemies?.length) {
    const alive = enemies.filter(e => e.hp > 0);
    if (alive.length) {
      centerX = alive.reduce((s, e) => s + e.x, 0) / alive.length;
      centerY = alive.reduce((s, e) => s + e.y, 0) / alive.length;
    }
  }
  const mistContainer = getEnemyContainer() || container;
  animPlayPoisonMist(mistContainer, centerX, centerY + 15 * VH_CACHE);
}

export { animRemovePoisonMist as removePoisonMist, removeFieldFx };

// 🔥 透传导出：battle.js 火精灵火球等直接使用（自定义 effectName 投射物）
export { playProjectile };

// ==============================================
// 🔥 召唤物（保留旧接口）
// ==============================================
export function createSummon(summonType, player, user) {
  return animCreateSummon(summonType, player, user, getFightContainer());
}

// ==============================================
// 射击 - 多发连射
// ==============================================
function spineX1X2(player, enemies, baseDmg, card, worldContainer) {
  const cfg = getCardConfig('射击');
  const buff = getEvolutionBuff(card);
  let hitCount = cfg.hitCount || 1;
  const fireInterval = 100;
  // 🎬 特效参数来自配置表（animName: sheji / scale / flyDuration），不要写死 'idle'
  const fxCfg = getEffectConfig('射击') || {};
  const flyDuration = fxCfg.flyDuration ?? 0.3;
  const bulletScale = (fxCfg.scale ?? 0.2) * EFFECT_SCALE_BASE;

  const initialTarget = enemies.find(e => e.hp > 0);
  if (!initialTarget) return;
  const initialTargetUid = initialTarget.uid;
  // 🎯 水平发射（公共函数）：起点=玩家，终点=(敌人x+2vw, 玩家y)；支持 effectConfig 偏移写法
  const { startPos, endPos } = calcProjectilePoints(initialTarget, {}, fxCfg);
  const bulletContainer = getFightContainer() || worldContainer;

  for (let i = 0; i < hitCount; i++) {
    setTimeout(() => {
      if (!enemies.some(e => e.hp > 0)) return;
      // 🎵 每发子弹响一次音效（配置 sound/soundVolume 来自 EFFECT_CONFIG；多段技能响多次）
      if (fxCfg.sound) {
        _store.playSoundEffect(fxCfg.sound, fxCfg.soundVolume ?? 1);
      }
      playSpineProjectile(bulletContainer, startPos, endPos, fxCfg.animName ?? 'idle', flyDuration, bulletScale, () => {
        const alive = enemies.filter(e => e.hp > 0);
        if (!alive.length) return;
        const ct = alive.find(e => e.uid === initialTargetUid) || alive[0];
        // 🌬️ 风之庇佑：射击变风属性，且每发倍率提升
        let shootDmgType = card.dmgType;
        let shootDmg = baseDmg;
        let applyElem = true;
        if (player._shootIsWind) {
          shootDmgType = 'wind';
          shootDmg = Math.round(baseDmg * (1 + (player._shootWindBoostPct || 0)) * 100) / 100;
          applyElem = false; // 风属性不触发元素反应
          // 风属性每段 -2% 行动条 + 50% 概率流血
          ct.actionProgress -= (10000 * 2 / 100);
          if (chance(_store.luckProb(0.5))) applyBleed(player, ct);
        }
        calculateFinalDamage(shootDmg, ct, { ignoreArmor: buff.ignoreArmor, dmgType: shootDmgType, player: player, buff: buff, applyElement: applyElem, enemies: [], skillName: card.name });
      });
    }, i * fireInterval);
  }
}

// ==============================================
// 激光
// ==============================================
function useSkillLaser(player, enemies, baseDmg, card, worldContainer) {
  const buff = getEvolutionBuff(card);
  const DAMAGE_DELAY = 50;
  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (!aliveEnemies.length) return 800;

  // 🎬 激光特效已由 SkillLogic.useSkill 统一走 effectConfig 配置表播放
  setTimeout(() => {
    aliveEnemies.forEach(enemy => {
      if (enemy.hp <= 0) return;
      const { dmg, crit } = calculateFinalDamage(baseDmg, enemy, { ignoreArmor: buff.ignoreArmor, dmgType: card.dmgType, player: player, buff: buff, applyElement: true, enemies: [], skillName: card.name });
      battleLog('【激光】命中', enemy.name, dmg, crit ? '🔥暴击' : '');
    });
  }, DAMAGE_DELAY);

  return 800;
}

// ==============================================
// 冰箭 - 投射物 + 命中切换动画（命中动画名由 effectConfig 的 hitAnimName 配置，如 'animation1'）
// ==============================================
function useSkillIceArrow(player, enemies, baseDmg, card, worldContainer, target = null) {
  const buff = getEvolutionBuff(card);
  const targetEnemy = target?.hp > 0 ? target : enemies.find(e => e.hp > 0);
  if (!targetEnemy) return 500;

  // 🎯 水平发射（公共函数）：起点=玩家，终点=(敌人x+2vw, 玩家y)；支持 effectConfig 偏移写法
  const { startPos, endPos } = calcProjectilePoints(targetEnemy, {}, getEffectConfig('冰箭'));
  const fxCfg = getEffectConfig('冰箭') || {};
  const flyDuration = fxCfg.flyDuration ?? 0.35;
  const container = getFightContainer() || worldContainer;

  // 🎯 命中动画锚点 = 敌人 spine 实际渲染位置（屏幕坐标），保证碎裂正好在敌人身上
  //    （不想要敌人身上就留空，回退到飞行终点）
  const hitAnchor = getEnemySpinePos(targetEnemy);

  // 🧊 统一走 playProjectile：命中后自动播放 hitAnimName（配置表指定），播放完自动回池
  const { projectile, gsapTween: iceTween } = playProjectile(container, startPos, endPos, {
    effectName: 'bingjian',
    scale: fxCfg.scale ?? 1,
    duration: flyDuration,
    animName: fxCfg.animName ?? 'animation',
    rotationFromAngle: true,
    hitAnimName: fxCfg.hitAnimName ?? null,   // 🧊 命中后播放自定义动画（如 'animation1' 爆炸/碎裂）
    hitAnimLoop: fxCfg.hitAnimLoop ?? false,
    hitAnimScale: fxCfg.hitAnimScale != null ? fxCfg.hitAnimScale * EFFECT_SCALE_BASE : null, // 🎯 命中动画独立缩放
    hitAnimX: hitAnchor ? hitAnchor.x : null, // 🎯 命中动画锚点 x（敌人实际位置，屏幕坐标）
    hitAnimY: hitAnchor ? hitAnchor.y : null, // 🎯 命中动画锚点 y（敌人实际位置，屏幕坐标）
    hitAnimOffsetX: fxCfg.hitAnimOffsetX ?? 0, // 🎯 命中动画独立水平偏移（vw，不配 = 0 无偏移）
    hitAnimOffsetY: fxCfg.hitAnimOffsetY ?? 0, // 🎯 命中动画独立垂直偏移（vh，不配 = 0 无偏移）
    onHit: () => applyIceArrowDamage(player, targetEnemy, baseDmg, card, buff),
  });
  // 在 projectile 上挂载引用，供外部 kill
  if (projectile) projectile._gsapTween = iceTween;

  return Math.floor(flyDuration * 1000) + 300;
}
// ==============================================
// 水弹 - 投射物飞行 + 终点爆炸切换动画
// ==============================================
function useSkillWaterBubble(player, enemies, baseDmg, card, worldContainer, user) {
  const buff = getEvolutionBuff(card);
  const cfg = getCardConfig('水弹');
  const delay = cfg?.animDelay ?? 0;
  const fxCfg = getEffectConfig('水弹') || {};
  // 🎯 aoeCenter 联动：飞到「最中心的存活敌人」处才停止（而不是第一个敌人）；
  //    没有 aoeCenter 时保持原逻辑 = 第一个存活敌人
  const targetEnemy = fxCfg.aoeCenter ? getCenterEnemy(enemies) : (enemies.find(e => e.hp > 0) || null);
  if (!targetEnemy) return delay;

  // 🎯 水平发射（公共函数）：起点=玩家（x 无偏移），终点=(敌人x+2vw, 玩家y)；支持 effectConfig 偏移写法
  const { startPos, endPos } = calcProjectilePoints(targetEnemy, { startXOffsetVW: 0 }, getEffectConfig('水弹'));
  const flyDuration = 0.5;
  const container = getFightContainer() || worldContainer;

  // 从对象池获取水泡实例，播放飞行循环动画
  const projectile = getEffect('shuipao');
  projectile.scale.set(0.5);
  projectile.x = startPos.x;
  projectile.y = startPos.y;
  projectile.rotation = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
  projectile.state.setAnimation(0, 'animation', true);
  // 动画播放速度：>1 变快，<1 变慢（例如 0.6 = 慢速，1.5 = 快速，1 = 正常）
  projectile.state.timeScale = 3;
  projectile.zIndex = 100;
  container.addChild(projectile);
  if (container.sortChildren) container.sortChildren();

  // 飞行到目标位置后直接消失（不切换动画）
  const bubbleTween = gsap.to(projectile, {
    x: endPos.x, y: endPos.y,
    duration: flyDuration, ease: 'none',
    onComplete: () => {
      try {
        if (!projectile?.state) return;
        // 到达终点，直接回收水泡让其消失
        returnEffect('shuipao', projectile);
        // 命中所有存活敌人
        enemies.filter(e => e.hp > 0).forEach(enemy => {
          applyWaterBubbleDamage(player, enemy, baseDmg, card, buff);
        });
      } catch (e) {
        returnEffect('shuipao', projectile);
      }
    },
  });
  // 在 projectile 上挂载引用，供外部 kill
  projectile._gsapTween = bubbleTween;

  return Math.floor(flyDuration * 1000) + delay;
}

// ==============================================
// 火球 - 投射物 + 终点爆炸
// ==============================================
function useSkillFireball(player, enemies, baseDmg, card, worldContainer, target = null) {
  const buff = getEvolutionBuff(card);
  const cfg = getCardConfig('火球');
  const FLY_DURATION = 0.35;

  // 🎯 火球星级效果：溅射倍率
  //    基础溅射 50% 主目标伤害；二星溅射+15% → 65%；三星溅射+25% → 75% 且主目标伤害=75%基础
  const star = card?.star ?? 1;
  const starEff = cfg?.starEffects?.[Math.min(3, Math.max(2, star))] || {};
  const splashBoost = starEff.splashBoost || 0;
  const splashRatio = starEff.splashRatio || 0.5; // 三星时 0.75
  const mainTargetRatio = star >= 3 ? 0.75 : 1; // 三星：主目标伤害为75%

  const mainTarget = target?.hp > 0 ? target : enemies.find(e => e.hp > 0);
  if (!mainTarget) return 500;

  // 🎯 水平发射（公共函数）：起点=玩家，终点=(敌人x+2vw, 玩家y)；支持 effectConfig 偏移写法
  const { startPos, endPos } = calcProjectilePoints(mainTarget, {}, getEffectConfig('火球'));
  const bulletContainer = getFightContainer() || worldContainer;

  playProjectile(bulletContainer, startPos, endPos, {
    effectName: 'huoqiu', scale: 0.1, duration: FLY_DURATION,
    rotationFromAngle: true,
    createExplosion: true, explosionEffectName: 'baozha',
    onHit: () => {
      const alive = enemies.filter(e => e.hp > 0);
      if (!alive.length) return;
      const mainIdx = alive.findIndex(e => e.uid === mainTarget.uid);
      if (mainIdx === -1) return;

      const mainDmg = Math.round(baseDmg * mainTargetRatio * 100) / 100;
      const { dmg: finalMainDmg } = calculateFinalDamage(mainDmg, mainTarget, { ignoreArmor: buff.ignoreArmor, dmgType: 'fire', player: player, buff: buff, applyElement: true, enemies: [], skillName: '火球' });
      battleLog('【火球】主目标命中', mainTarget.name, finalMainDmg);

      // 溅射：基础50% + 星级加成
      const splashDmg = Math.round(baseDmg * splashRatio * 100) / 100;
      const boostedSplashDmg = Math.round(splashDmg * (1 + splashBoost) * 100) / 100;
      [mainIdx - 1, mainIdx + 1].forEach(idx => {
        if (idx < 0 || idx >= alive.length) return;
        const { dmg } = calculateFinalDamage(boostedSplashDmg, alive[idx], { ignoreArmor: buff.ignoreArmor, dmgType: 'fire', player: player, buff: buff, applyElement: true, enemies: [], skillName: '火球' });
        battleLog('【火球】溅射', alive[idx].name, dmg);
      });
    },
  });

  return FLY_DURATION * 1000 + 200;
}

// ==============================================
// 雷击 - 目标位置直接播放特效
// ==============================================
function useSkillLightning(player, enemies, baseDmg, card, worldContainer, target = null) {
  const buff = getEvolutionBuff(card);
  const cfg = getCardConfig('雷击');
  const delay = cfg?.animDelay ?? 0;

  const targetEnemy = target?.hp > 0 ? target : enemies.find(e => e.hp > 0);
  if (!targetEnemy) return 500;

  // 🎬 雷击特效已由 SkillLogic.useSkill 统一走 effectConfig 配置表播放
  setTimeout(() => applyLightningDamage(player, targetEnemy, baseDmg, card, buff, enemies), delay);
  return delay;
}
