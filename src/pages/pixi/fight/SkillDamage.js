import { battleLog } from './logger.js'
import { getEvolutionBuff } from './SkillEvolution';
import { chance, pickIndex } from './rng.js'
import { starVal } from './cardVal.js'
import { createUnit } from './Unit.js'
import { BattleSystem, getFightContainer, getPlayerScreenPos, getEnemySpinePos } from './battle.js'
import { useCounterStore, LEVEL_UP_CFG } from "@/store/counter";
import { ITEM_DEFS } from "@/store/configs"; // 装备 fx 战斗效果参数
import { createSummon, getEffect, returnEffect } from "./SkillLogic"
import { VW_CACHE, VH_CACHE, EFFECT_SCALE_BASE } from './animations/effectPool.js'
import { playHitParticlesOnEnemy } from './hitParticles.js'
import { getEffectConfig, getSummonSound } from './effectConfig.js'
import { ColorMatrixFilter, Text } from 'pixi.js';
import { playAtPoint } from './animations/index.js';
import { hasSummonShield } from './hitShield.js';
import { upsertBuff, applyBuffSideEffects } from './buffCleanup.js';
import emitter from "@/bus";
import { t } from "@/i18n";
import gsap from 'gsap';
import {
  checkFrostWetCombo,
  checkWetBurnCombo,
  checkFrostBurnCombo,
  checkWetLightningCombo,
  checkFrostLightningCombo,
  checkBurnLightningCombo,
  applyFreeze,
  removeFreeze
} from './ElementReaction.js';
const user = useCounterStore();

// 👑 首领：场上每存在一个召唤物，玩家全属性 +perSummonPct%（动态刷新，先还原旧加成再按当前数量重算）
export function refreshLeaderBuff(player, allies) {
  if (!player || !Array.isArray(player.buffs)) return
  if (!user.hasTalent?.('leader_skill')) return // 👑 未激活「首领」天赋不生效
  const per = Number(user.getTalentEffect?.('leader_skill', 'perSummonPct') ?? 0) || 0
  // 1️⃣ 移除旧的「首领」buff（还原属性）
  const oldIdx = player.buffs.findIndex(b => b.name === '首领')
  if (oldIdx !== -1) {
    const b = player.buffs[oldIdx]
    player.attack -= b.atkUp || 0
    player.armor -= b.armorUp || 0
    player.luck -= b.luckUp || 0
    player.speed -= b.speedUp || 0
    if (b.hpUp && player.maxHp != null) {
      player.maxHp = Math.max(1, player.maxHp - b.hpUp)
      player.hp = Math.min(player.maxHp, player.hp)
    }
    player.buffs.splice(oldIdx, 1)
  }
  // 2️⃣ 统计场上存活召唤物（精灵/影分身；携带的同伴也算召唤物）
  const count = (allies || []).filter(a => (a.isWaterSpirit || a.isThunderSpirit || a.isIceSpirit || a.isFireSpirit || a.isShadowClone || a.isNpcAlly) && a.hp > 0 && !a._isDead).length
  if (!(per > 0) || count <= 0) return
  // 3️⃣ 施加新「首领」buff：全属性 +per%×count（基于当前基础属性）
  const mult = per * count / 100
  const b = {
    name: '首领',
    type: 'leader',
    remaining: 999,
    atkPct: Math.round(per * count * 100) / 100,
    atkUp: Math.round(((player.baseAttack ?? player.attack) || 0) * mult * 100) / 100,
    armorUp: Math.round(((player.baseArmor ?? player.armor) || 0) * mult * 100) / 100,
    luckUp: Math.round(((player.baseLuck ?? player.luck) || 0) * mult * 100) / 100,
    speedUp: Math.round(((player.baseSpeed ?? player.speed) || 0) * mult * 10) / 10,
    hpUp: Math.round(((player.baseMaxHp ?? player.maxHp) || 0) * mult * 100) / 100,
  }
  player.buffs.push(b)
  player.attack += b.atkUp
  player.armor += b.armorUp
  player.luck += b.luckUp
  player.speed += b.speedUp
  if (b.hpUp) {
    player.maxHp += b.hpUp
    player.hp = Math.min(player.maxHp, (player.hp ?? player.maxHp) + b.hpUp)
  }
}

// 👑 精灵王冠：场上同时存在水/冰/火/雷精灵时，玩家全属性 +25%（动态刷新，任意精灵退场即移除；再次集齐重新获得）
export function refreshCrownBuff(player, allies) {
  if (!player || !Array.isArray(player.buffs)) return
  // 1️⃣ 移除旧的「精灵王冠」buff（还原属性）
  const oldIdx = player.buffs.findIndex(b => b.name === '精灵王冠')
  if (oldIdx !== -1) {
    const b = player.buffs[oldIdx]
    player.attack -= b.atkUp || 0
    player.armor -= b.armorUp || 0
    player.luck -= b.luckUp || 0
    player.speed -= b.speedUp || 0
    if (b.hpUp && player.maxHp != null) {
      player.maxHp = Math.max(1, player.maxHp - b.hpUp)
      player.hp = Math.min(player.maxHp, player.hp)
    }
    player.buffs.splice(oldIdx, 1)
  }
  // 2️⃣ 未装备精灵王冠 → 不生效
  if (!(user.isItemEquipped?.('精灵王冠'))) return
  // 3️⃣ 四系精灵是否全部存活
  const hasWater = allies.some(a => a.isWaterSpirit && a.hp > 0 && !a._isDead)
  const hasThunder = allies.some(a => a.isThunderSpirit && a.hp > 0 && !a._isDead)
  const hasIce = allies.some(a => a.isIceSpirit && a.hp > 0 && !a._isDead)
  const hasFire = allies.some(a => a.isFireSpirit && a.hp > 0 && !a._isDead)
  if (!(hasWater && hasThunder && hasIce && hasFire)) return
  // 4️⃣ 施加新「精灵王冠」buff：全属性 +25%（基于当前基础属性）
  const mult = Number(ITEM_DEFS['精灵王冠']?.fx?.allAttrPct ?? 0.25)
  const b = {
    name: '精灵王冠',
    type: 'crown',
    remaining: 999,
    isPermanent: true,
    atkUp: Math.round(((player.baseAttack ?? player.attack) || 0) * mult * 100) / 100,
    armorUp: Math.round(((player.baseArmor ?? player.armor) || 0) * mult * 100) / 100,
    luckUp: Math.round(((player.baseLuck ?? player.luck) || 0) * mult * 100) / 100,
    speedUp: Math.round(((player.baseSpeed ?? player.speed) || 0) * mult * 10) / 10,
    hpUp: Math.round(((player.baseMaxHp ?? player.maxHp) || 0) * mult * 100) / 100,
  }
  player.buffs.push(b)
  player.attack += b.atkUp
  player.armor += b.armorUp
  player.luck += b.luckUp
  player.speed += b.speedUp
  if (b.hpUp) {
    player.maxHp += b.hpUp
    player.hp = Math.min(player.maxHp, (player.hp ?? player.maxHp) + b.hpUp)
  }
}

// 💖 交心：召唤物全属性增加（战斗中召唤的无人机/影分身，含三星开局自动召唤）
function applyHeartToHeart(unit, allies) {
  if (!unit) return;
  const hh = user.hasTalent?.('heart_to_heart') ? (Number(user.getTalentEffect?.('heart_to_heart', 'attrPct') ?? 0) || 0) : 0;
  const ld = user.hasTalent?.('leader_skill') ? (Number(user.getTalentEffect?.('leader_skill', 'attrPct') ?? 0) || 0) : 0;
  // 💖 魅力：分段线性递减加成召唤物/同伴全属性（0-50 每点0.30%，50-120 每点0.18%，120-250 每点0.10%，250+ 每点0.06%）
  const _charmVal = user.pixi?.player?.juese?.charm || 0;
  let _charmPct = 0;
  if (_charmVal > 0) {
    _charmPct += Math.min(_charmVal, 50) * 0.30;
    if (_charmVal > 50) _charmPct += Math.min(_charmVal - 50, 70) * 0.18;
    if (_charmVal > 120) _charmPct += Math.min(_charmVal - 120, 130) * 0.10;
    if (_charmVal > 250) _charmPct += (_charmVal - 250) * 0.06;
    _charmPct /= 100;
  }
  const hhPct = (hh + ld) / 100; // 交心/领袖：全属性（含护甲）
  const pct = hhPct + _charmPct; // 💖 魅力：不加护甲（精灵等召唤物不需要护甲）
  if (pct <= 0) { refreshLeaderBuff(unit.owner, allies); refreshCrownBuff(unit.owner, allies); return; }
  if (unit.maxHp > 0) {
    unit.maxHp = Math.round(unit.maxHp * (1 + pct));
    unit.hp = Math.min(unit.maxHp, Math.round((unit.hp ?? unit.maxHp) * (1 + pct)));
  }
  if (unit.attack != null) unit.attack = Math.round((unit.attack ?? 0) * (1 + pct));
  if (unit.armor != null) unit.armor = Math.round((unit.armor ?? 0) * (1 + hhPct)); // 护甲只吃交心/领袖
  if (unit.magicResist != null) unit.magicResist = Math.round((unit.magicResist ?? 0) * (1 + pct));
  if (unit.speed != null) {
    unit.speed = Math.round(unit.speed * (1 + pct) * 10) / 10;
    unit.baseSpeed = unit.speed;
  }
  if (unit.luck != null) unit.luck = Math.round((unit.luck ?? 0) * (1 + pct));
  // 👑 首领：召唤后立即刷新玩家全属性加成
  refreshLeaderBuff(unit.owner, allies);
  refreshCrownBuff(unit.owner, allies); // 👑 精灵王冠：召唤/强化精灵后刷新（四系齐全才生效）
}

// 🔥 天赋：天选之子 - 保底概率（未触发每次 +incProb，触发后重置；战斗初始化时由 battle.js 调用 resetLuckGodChosenPity 重置）
let _luckGodChosenProb = 0.2;
export function resetLuckGodChosenPity() {
  _luckGodChosenProb = Number(user.getTalentEffect?.('luck_god_chosen', 'prob') ?? 0.2);
}

// 全局中毒绿色闪屏滤镜（所有敌人共享）
const globalPoisonFilter = new ColorMatrixFilter();
// 绿色调：偏绿，亮度适中
globalPoisonFilter.tint(0x44ff44);
globalPoisonFilter.brightness(1.3);
globalPoisonFilter.contrast(1.1);

/**
 * 让敌人闪一下绿色（中毒效果）
 * @param {Object} enemy - 敌人对象
 */
export function flashPoison(enemy) {
  if (!enemy || !enemy.view) return;

  // 清除之前的定时器
  if (enemy.poisonTimer) {
    clearTimeout(enemy.poisonTimer);
  }

  // 添加绿色滤镜
  enemy.view.filters = [...(enemy.view.filters || []), globalPoisonFilter];

  // 100ms 后移除
  enemy.poisonTimer = setTimeout(() => {
    enemy.view.filters = enemy.view.filters?.filter(f => f !== globalPoisonFilter) || [];
    enemy.poisonTimer = null;
  }, 250);
}
// 统一计算技能基础伤害 原始伤害吃加成
// 🔥 保留2位小数精度，不向下取整，避免低攻击时伤害损失
export function calculateSkillDamage(skillName, player, card) {
  const cfg = user.pixi.player.CARD_DATA[skillName];
  const atk = Number(player.attack) || 0;
  // 🎯 攻击力倍率：按星级取（1/2/3星数组），兼容旧版单数值
  const ratio = starVal(cfg, 'atkRatio', card?.star ?? 1, 0);
  let dmg = (cfg.fixedDmg || 0) + Math.round(atk * ratio * 100) / 100;
  // 🎖 卡牌熟练度：flatDmg 每级 +固定伤害；percentDmg 每级伤害 ×(1+value%)（累乘，如 15% → Lv.1=1.15x / Lv.2≈1.32x）
  const msCfg = cfg.mastery;
  if (msCfg && msCfg.value > 0) {
    const msLv = user.getCardMasteryLevel?.(skillName) || 0;
    if (msLv > 0) {
      if (msCfg.type === 'flatDmg') dmg += msLv * Number(msCfg.value);
      else if (msCfg.type === 'percentDmg') dmg = dmg * Math.pow(1 + Number(msCfg.value) / 100, msLv);
    }
  }
  return dmg;
}

// ==============================================
// 全局统一工具函数（所有伤害共用，无重复代码）
// ==============================================

// 1. 计算最终护甲（所有减甲效果叠加）
export function getFinalArmor(target) {
  // 现在护甲已经直接在面板上加减完毕，直接返回最终护甲即可
  let armor = target.armor || 0;
  // 💥 碎甲弹：碎甲 debuff 减免一定比例护甲（持续N回合）
  if (target.debuffs?.length) {
    const shred = target.debuffs.find(d => d.type === 'armorShred' || d.name === '碎甲');
    if (shred?.armorShredPct) {
      armor = Math.max(0, armor * (1 - shred.armorShredPct));
    }
  }
  return armor;
}

// 🔥 元素伤害类型：吃魔抗减免（双抗体系，参考 LOL）
//    物理/无属性伤害 → 护甲；毒属性 = 真伤（无视双抗）；元素/元素反应 → 魔抗
const ELEMENT_DMG_TYPES = ['fire', 'electric', 'water', 'frost', 'wind', 'lightning', 'ice', 'magic'];

/**
 * 🧙 魔抗（魔法抗性）：减免元素伤害与元素反应伤害
 * 玩家来源：juese.baseMagicResist（基础 10，后续可随装备/天赋/突破成长）
 * 怪物来源：monsterConfigs 的 magicResist 字段（怪物重设计时统一配置）
 * 毒属性伤害是真伤，无视护甲与魔抗；物理/无属性伤害走护甲（getFinalArmor）
 */
export function getFinalMagicResist(target) {
  return target?.magicResist || 0;
}

/**
 * 🎯 单段伤害预测（普攻或技能单段，不含多段乘数；纯计算，不扣血 / 不发事件 / 无随机）
 * 完全复刻 battle.js enemyAttack → calculateFinalDamage 的「敌人打玩家」路径：
 *   基础 = 攻击力 × 倍率
 *   → × (1 + 敌人全体增伤 allDamageBonus)
 *   → × (1 + 玩家易伤 damageTaken)
 *   → × (1 - 护甲/(护甲+100))（护甲 = getFinalArmor(玩家)，含碎甲 debuff）
 *   → × (敌人最终增伤 executeDamageBonus - (1 - 玩家受伤减免 takenDamageReduce))
 *   → × (1 - 反弹状态受伤减免 reflect.dmgReduce，若有)
 *   → 保底 1 点
 * 真实伤害（isTrueDamage）无视护甲与所有减伤。
 * @param {object} enemy   敌人战斗单位（attack/allDamageBonus/executeDamageBonus/isTrueDamage）
 * @param {object} player  玩家战斗单位（armor/damageTaken/takenDamageReduce/buffs/debuffs）
 * @param {number} ratio   本次攻击倍率（普攻 attackMultiplier / 技能 damageRatio）
 * @returns {number} 单段伤害（保留 2 位小数）
 */
function predictSingleDamage(enemy, player, ratio, dmgType) {
  const baseDmg = (enemy.attack || 0) * ratio;
  // 真实伤害（isTrueDamage）与毒属性真伤：无视护甲 & 所有减伤，仅保底 1 点
  if (enemy.isTrueDamage || dmgType === 'poison') {
    return Math.max(1, Math.round(baseDmg * 100) / 100);
  }
  let perHit = baseDmg;
  // 敌人全体增伤
  perHit *= (1 + (enemy.allDamageBonus || 0));
  // 玩家易伤
  perHit *= (1 + (player.damageTaken || 0));
  // 🛡️ 双抗分流（统一减伤公式）：元素伤害吃魔抗，物理/无属性吃护甲
  const isElement = ELEMENT_DMG_TYPES.includes(dmgType);
  const resist = isElement ? getFinalMagicResist(player) : getFinalArmor(player);
  perHit *= (1 - (isElement ? computeMagicResistReduction(resist) : computeArmorReduction(resist)));
  // 🎯 最终增伤/减伤（与 calculateFinalDamage 共用 computeExecuteMult，口径强制一致）
  perHit *= computeExecuteMult(enemy, player);
  // 反弹状态受伤减免（二星 -5% / 三星 -10%）
  const reflectBuff = (player.buffs || []).find(b => b.type === 'reflect');
  if (reflectBuff?.dmgReduce) {
    perHit *= (1 - reflectBuff.dmgReduce);
  }
  return Math.max(1, Math.round(perHit * 100) / 100);
}

/**
 * 🎯 预测敌人【普攻】对玩家造成的总伤害（多段普攻 attackHits>1 返回总伤害：段数 × 单段）
 */
export function predictEnemyAttackDamage(enemy, player) {
  if (!enemy || !player) return 0;
  const hits = Math.max(1, enemy.attackHits ?? 1);
  const ratio = enemy.attackMultiplier ?? 0.1;
  const perHit = predictSingleDamage(enemy, player, ratio, enemy.attackDmgType);
  return Math.round(perHit * hits * 100) / 100;
}

/**
 * 🎯 敌人技能选择（唯一入口：实际战斗 / 预测 UI 共用，规则强制一致）
 *    规则顺序：冷却 → 召唤数量条件 → 毒爆层数条件
 *    mode='actual' ：当前冷却直接判断（battle.js enemyUseSkill 用）
 *    mode='predict'：模拟下一次行动【回合开始】冷却 -1 后再判断（战斗 UI 预测下一步用）
 * @param {object} enemyUnit 敌人战斗单位（skills/skillCds）
 * @param {object} ctx { mode='actual', aliveCount=0（场上存活敌人数，召唤类判断）, playerPoisonStacks=0（玩家中毒层数，毒爆判断） }
 * @returns {object|null} 会使用的技能；无则 null
 */
export function selectEnemySkill(enemyUnit, ctx = {}) {
  const { mode = 'actual', aliveCount = 0, playerPoisonStacks = 0 } = ctx
  if (!Array.isArray(enemyUnit?.skills) || !enemyUnit.skills.length) return null
  const cds = enemyUnit.skillCds || enemyUnit.skills.map(() => 0)
  for (let i = 0; i < enemyUnit.skills.length; i++) {
    const skill = enemyUnit.skills[i]
    // ⏱️ 预测模式：模拟敌人下一次行动回合开始的冷却结算（-1）后再判断（冷却 1 的技能下次会变成 0 可用）
    const cd = mode === 'predict' ? Math.max(0, (cds[i] || 0) - 1) : (cds[i] || 0)
    if (cd > 0) continue // 冷却中
    // 召唤类技能：仅当场上敌人总数 < minTotalForUse 时才使用
    if (skill.type === 'summon') {
      const minTotal = skill.minTotalForUse ?? 4
      const maxTotal = skill.maxTotal ?? 5
      if ((aliveCount ?? 0) >= minTotal || (aliveCount ?? 0) >= maxTotal) continue
    }
    // 🧪 毒爆（毒系怪）：玩家身上已有 ≥ minStacks 层中毒才使用
    if (skill.type === 'poisonDetonate') {
      if ((playerPoisonStacks ?? 0) < (skill.minStacks ?? 2)) continue
    }
    return skill
  }
  return null
}

/**
 * 🎯 预测敌人【下一次行动（回合开始冷却-1后）】会使用的技能（无则 null）
 *    收敛：内部走 selectEnemySkill（与 battle.js getEnemyUsableSkill 同一套规则，
 *    含毒爆 ≥minStacks 条件；预测模式模拟冷却 -1）
 */
function getPredictUsableSkill(enemy, aliveCount, player) {
  const pb = (player?.debuffs || []).find(d => d.type === 'player_poison')
  return selectEnemySkill(enemy, {
    mode: 'predict',
    aliveCount: aliveCount ?? 0,
    playerPoisonStacks: pb?.stacks || 0,
  })
}

/**
 * 🎯 预测敌人【下一次行动（回合开始冷却-1后）】对玩家造成的伤害（纯计算，无随机）：
 *   模拟敌人下一次行动回合开始的技能冷却结算（skillCds 各 -1），提前一回合反映技能是否可用：
 *   - 有可用技能：
 *     · 非伤害型（buffSelf 狂怒 / summon 召唤 / healAllies 治愈 / electro_field 电磁场）
 *       → 施放回合不攻击，返回 null（UI 不显示伤害数字）
 *     · multiHit_wind 龙卷风暴 → 段数 × 单段（damageRatio）
 *     · 其他伤害型技能（singleDamage_*）→ 单段（skill.damageRatio ?? 普攻倍率）
 *   - 无可用技能 → 普攻（含多段 attackHits）
 * @param {object} enemy      敌人战斗单位（attack/skills/skillCds/attackHits/...）
 * @param {object} player     玩家战斗单位
 * @param {number} aliveCount 场上当前存活敌人数量（召唤类技能判断用，可不传）
 * @returns {number|null} 预测总伤害；敌人下一次不攻击时返回 null
 */
export function predictEnemyNextDamage(enemy, player, aliveCount) {
  if (!enemy || !player) return null;
  const skill = getPredictUsableSkill(enemy, aliveCount, player);
  if (skill) {
    // 🚫 非伤害型技能：施放回合不攻击（狂怒/召唤/治愈/电磁场）
    if (skill.type === 'buffSelf' || skill.type === 'summon' || skill.type === 'healAllies' || skill.type === 'electro_field') {
      return null;
    }
    // 🌪️ 多段技能（龙卷风暴/回旋斩击/猫咪史莱姆等）：段数 × 单段
    if (skill.hitCount && skill.hitCount > 1) {
      const hits = Math.max(1, skill.hitCount);
      const perRatio = skill.damageRatio ?? 0.35;
      const perHit = predictSingleDamage(enemy, player, perRatio, enemy.attackDmgType ?? 'null');
      return Math.round(perHit * hits * 100) / 100;
    }
    // 🧪 毒爆（毒系怪）：实际流程 = 先给玩家施加 1 层中毒 → 引爆「施毒后层数 × ratio」攻击力毒伤
    //    （毒走真伤路径：不吃护甲/魔抗减免，护盾吸收；与 battle.js poisonDetonate 分支完全一致）
    if (skill.type === 'poisonDetonate') {
      const curStacks = (player.debuffs || []).find(d => d.type === 'player_poison')?.stacks || 0;
      const boomRatio = skill.ratio ?? 0.35;
      const boomDmg = Math.max(1, Math.round(enemy.attack * boomRatio * (curStacks + 1) * 100) / 100);
      return boomDmg;
    }
    // ⚔️ 其他伤害型技能：单段，倍率 = skill.damageRatio ?? 普攻倍率（与 enemyAttack 完全一致）
    //    属性跟随敌人 attackDmgType（如凋零魔兽 ice 吃魔抗）
    const ratio = skill.damageRatio ?? enemy.attackMultiplier ?? 0.1;
    const perHit = predictSingleDamage(enemy, player, ratio, enemy.attackDmgType);
    return Math.round(perHit * 100) / 100;
  }
  // 🗡️ 无技能 → 普攻（含多段 attackHits）
  return predictEnemyAttackDamage(enemy, player);
}

/**
 * 🎯 预测敌人【下一次行动】的类型（伤害 / 增益 / 治疗 / 召唤 / 电磁场 / 给玩家减益）
 *    伤害型返回 { type:'damage', dmg }；非伤害型返回 { type, skill }；无法行动/无目标返回 null
 *    ⚠️ 给玩家施加减益的技能（skill.applyDebuff 或 type='debuffPlayer'）→ type:'debuff'，
 *       便于战斗 UI 在敌人头顶显示"即将施加减益"提示（扩展点：新怪配这类技能自动生效）
 */
export function predictEnemyNextAction(enemy, player, aliveCount) {
  if (!enemy || !player) return null;
  const skill = getPredictUsableSkill(enemy, aliveCount, player);
  if (skill) {
    // 🔺 增益自己（狂怒 / 风灵加速等）
    if (skill.type === 'buffSelf' || skill.type === 'windSpeedUp') return { type: 'buff', skill };
    // 💚 治疗队友
    if (skill.type === 'healAllies') return { type: 'heal', skill };
    // 👾 召唤
    if (skill.type === 'summon') return { type: 'summon', skill };
    // ⚡ 电磁场
    if (skill.type === 'electro_field') return { type: 'field', skill };
    // 🔻 给玩家施加 debuff（扩展点）
    if (skill.applyDebuff || skill.type === 'debuffPlayer') return { type: 'debuff', skill };
    // ⚔️ 其余 → 伤害（复用 predictEnemyNextDamage：多段/毒爆/单段；非伤害已在上方拦截）
    const dmg = predictEnemyNextDamage(enemy, player, aliveCount);
    if (dmg == null) return null;
    // 🎨 预测伤害属性（用于数字着色/详情弹层）：多段风 / 毒爆毒 / 其余跟随敌人攻击属性
    let dmgType = enemy.attackDmgType ?? 'null';
    if (skill.type === 'multiHit_wind') dmgType = 'wind';
    else if (skill.type === 'poisonDetonate') dmgType = 'poison';
    return { type: 'damage', dmg, source: 'skill', dmgType, skill };
  }
  // 🗡️ 无技能 → 普攻
  const atk = predictEnemyAttackDamage(enemy, player);
  return { type: 'damage', dmg: atk, source: 'attack', dmgType: enemy.attackDmgType ?? 'null' };
}

// 2. 统一计算最终伤害 + 暴击（已整合）
// 🔥 全程保留2位小数精度，最终扣血时保证至少1点
// 🎆 技能命中粒子自定义配置
// 键：技能名，值：playHitParticlesOnEnemy 的 options 参数
const SKILL_PARTICLE_CONFIG = {
  射击: { spread: 'around', scale: 0.9, count: 40, duration: 0.7, range: 0.5 },
  激光: { spread: 'around', scale: 1.2, count: 100, duration: 0.5, range: 0.5 },
  水弹: { spread: 'around', scale: 0.8, count: 60, duration: 1, range: 0.65 },
  火球: { spread: 'around', scale: 0.6, count: 100, duration: 1, range: 1 },
  雷击: { spread: 'around', scale: 0.7, count: 100, duration: 0.5, range: 0.8 },
  冰箭: { spread: 'cone', scale: 0.8, count: 100, duration: 1.5, offsetX: -4, range: 1 },
}

// 🚫 DOT 持续伤害（敌人回合开始结算）不触发命中粒子
const DOT_SKILLS = new Set(['灼烧', '瘴毒', '毒雾', '流血'])

// ==============================================
// 🛡️ 统一减伤公式（护甲/魔抗曲线收敛的唯一入口）
//    所有伤害路径的减伤都调这里，以后调曲线只改这一个函数
// ==============================================
export function computeArmorReduction(armor) {
  return armor / (armor + 100)
}
export function computeMagicResistReduction(magicResist) {
  return magicResist / (magicResist + 100)
}

// 🎯 最终增伤/减伤乘数（玩家侧/敌人侧统一口径的唯一入口）：
//    攻击者最终增伤 executeDamageBonus − (1 − 受击者最终减伤 takenDamageReduce)
//    takenDamageReduce 语义：1 = 无减伤；向死而生 -0.3 → 0.7 = 减伤30%；突破被动减伤 0.1 → 0.9 = 减伤10%
export function computeExecuteMult(attacker, target) {
  return (attacker?.executeDamageBonus || 0) - (1 - (target?.takenDamageReduce || 0))
}

export function calculateFinalDamage(rawDmg, target, opts = {}) {
  // 🎯 options 对象传参（避免 11 个位置参数漏传/错位）：
  //    { ignoreArmor=0, dmgType='null', player=null, buff=null, applyElement=true,
  //      enemies=[], skillName='', dualResist=false, isDot=false }
  // ⚠️ 用 let 解构：ignoreArmorPercent 在函数体内会被 +=（护甲穿透），const 会抛 Assignment to constant variable
  let {
    ignoreArmor: ignoreArmorPercent = 0,
    dmgType = 'null',
    player = null,
    buff = null,
    applyElement = true,
    enemies = [],
    skillName = '',
    dualResist = false,
    isDot = false,
  } = opts;
  // ========== 原有伤害计算逻辑 完全不变 ==========
  const armorPenBoost = player?.armorPenBoost || 0;
  let taken = target.damageTaken || 0; //敌人易伤
  let playerBonus = 0;//增伤
  let finalDmg = rawDmg;
  let zengshang = 0;// 临时增伤
  let reactMasteryMult = 0;// ✨ 元素反应精通倍率（收敛乘区，非玩家时保持 0）
  // 🎯 玩家本体判定：camp==='player' 且非 NPC 队友（不能按名字判断，玩家可自定义名字）
  const playerBoolen = player?.camp === 'player' && !player?.isNpcAlly
  // 🎯 是否「玩家直接攻击」（供受击被动判断，如雷鸟女皇受击飞翔）：
  //    - 必须是主角本人出手（排除 NPC 队友：isNpcAlly）
  //    - 且不是持续伤害（瘴毒/毒雾/灼烧/流血）、召唤物（无人机/影分身）、
  //      元素反应、天赋/被动追加（尖刺防御/反弹/护盾反击/厄运/溢灵）等间接来源
  const NON_PLAYER_DIRECT_SOURCES = new Set([
    '瘴毒', '毒雾', '灼烧', '流血',          // DOT 持续伤害
    '无人机', '影分身', '火精灵',                // 召唤物
    '元素反应', '衍生反应',                   // 元素反应
    '尖刺防御', '尖刺攻击', '反弹', '反弹伤害', '护盾反击', '厄运', '溢灵', // 天赋/被动
  ])
  const isPlayerDirectAttack = playerBoolen
    && !player?.isNpcAlly
    && !NON_PLAYER_DIRECT_SOURCES.has(skillName)
  if (playerBoolen) {
    playerBonus += player?.finalDamageBoost || 0; // 💎 突破被动：最终伤害提升
    // 🔥 火精灵存在：玩家的火属性伤害提升 25%（含火精灵自身火伤）
    if (dmgType === 'fire' && player?._fireSpiritBoost) {
      playerBonus += 0.25;
    }
    // ⚡ 雷精灵存在：玩家的雷属性伤害提升 15%（含雷精灵自身雷伤）
    if (dmgType === 'lightning' && player?._thunderSpiritBoost) {
      playerBonus += 0.15;
    }
    // 💧 水精灵存在：玩家的水元素伤害提升 15%（含水精灵自身水伤）
    if (dmgType === 'water' && player?._waterSpiritBoost) {
      playerBonus += 0.15;
    }
    // ❄️ 冰精灵存在：玩家的冰元素伤害提升 15%（含冰精灵自身冰伤）
    if (dmgType === 'ice' && player?._iceSpiritBoost) {
      playerBonus += 0.15;
    }
    if (dmgType === "physical") {
      playerBonus += target.physDamageTaken || 0; //额外敌人物理增伤
      playerBonus += player?.physicalBoost || 0;//玩家物理伤害加成
      // 💪 力量物理增伤：换算基数由 computeUnitAttrs 预计算（initBattleAttrs 写入 physBonusBase），÷当前攻击保持"自适应当前攻击"语义
      playerBonus += (player?.physBonusBase ?? ((player?.strength || 0) * (LEVEL_UP_CFG.attrRates?.strengthPhysDmg ?? 1.5))) / Math.max(1, Number(player?.attack) || 1);
      ignoreArmorPercent += armorPenBoost;
    } else if (skillName === '元素反应') {
      playerBonus += player?.elementReactionDamageBonus || 0;//元素反应增伤
      // ✨ 元素精通：提供收敛倍率乘区 = 上限 × 精通/(精通+200)（含智慧派生；与攻击力解耦，永不溢出）
      //    精通由 computeUnitAttrs 预计算（initBattleAttrs 写入 mastery），未走统一入口时兜底原公式
      const mastery = player?.mastery ?? ((player?.elementMastery || 0) + (player?.intelligence || 0) * (LEVEL_UP_CFG.attrRates?.intelligenceMastery ?? 0.2));
      const masteryCap = (LEVEL_UP_CFG.attrRates?.elementMasteryReactDmg ?? 1);
      reactMasteryMult = masteryCap * mastery / (mastery + 200);
      ignoreArmorPercent += (player.elementIgnoreArmorRate ?? 0);
      // ========== 新增天赋：元素残留 ==========
      if (user.hasTalent('element_residual')) {
        // 查找已有元素残留debuff
        let residual = target.debuffs.find(d => d.name.includes('元素残留'));
        const lv = user.getTalentLevel('element_residual') || 1;
        const perStack = (Number(user.getTalentEffect?.('element_residual', 'reactBonus') ?? 0.03) + Number(user.getTalentEffect?.('element_residual', 'reactBonusPerLv') ?? 0.005) * (lv - 1));

        // 没有才新建，永远只一个
        if (!residual) {
          residual = {
            name: '元素残留',
            stack: 0,
            isPermanent: true
          };
          target.debuffs.push(residual);
        }

        // 先用【当前旧层数】结算本次伤害
        target.elementResidualDebuff = residual.stack * perStack;
        playerBonus += target.elementResidualDebuff;

        // 打完伤害再叠层
        residual.stack += 1;
        // 实时更新buff显示文字层数
        residual.name = `元素残留 ${residual.stack}层`;
      }
      if (user.hasTalent('element_fission') && !target.fissionLock) {
        target.fissionLock = true;
        // 等反应结算完毕、残留元素固定后，再加新元素
        setTimeout(() => {
          const allElement = ['湿润', '霜冻', '灼烧', '电流'];
          const addCount = Number(user.getTalentEffect?.('element_fission', 'addStatus') ?? 1) || 1;
          let added = 0;
          for (let k = 0; k < addCount; k++) {
            const canAdd = allElement.filter(ele => !target.debuffs.some(d => d.name === ele));
            if (canAdd.length === 0) break;
            const randomEle = canAdd[pickIndex(canAdd.length)];
            const remainRound = randomEle === '灼烧' ? 2 : 999;

            target.debuffs.push({
              name: randomEle,
              type: randomEle === '湿润' ? 'wet' :
                randomEle === '霜冻' ? 'frost' :
                  randomEle === '灼烧' ? 'burn' : 'lightning',
              remaining: remainRound,
              fromFission: true // 💥 裂变标记：此元素参与的任意反应总伤害 -50%（在 ElementReaction.js 结算）
            });

            emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: randomEle });
            battleLog('💥元素裂变追加元素：', randomEle);
            added++;
          }

          if (added > 0) {
            // ===== 现在检测反应：残留元素 + 新元素 = 正常触发 =====
            let triggered = false
            if (!triggered) triggered = checkFrostWetCombo(player, target)
            if (!triggered) triggered = checkWetBurnCombo(player, target)
            if (!triggered) triggered = checkFrostBurnCombo(player, target)
            if (!triggered) triggered = checkWetLightningCombo(player, target, enemies)
            if (!triggered) triggered = checkFrostLightningCombo(player, target)
            if (!triggered) triggered = checkBurnLightningCombo(player, target, enemies)
          }
        }, 0);

        target.fissionLock = false;
      }
    }
  }
  playerBonus += (player?.allDamageBonus || 0)
  finalDmg *= (1 + playerBonus);
  if (reactMasteryMult > 0) finalDmg *= (1 + reactMasteryMult);
  finalDmg *= (1 + taken);

  // 🎯 敌人物理抗性被动（巨型眼瞳「魔能体」）：减免物理伤害
  if (target.camp === 'enemy' && target._physResist && dmgType === 'physical') {
    const pr = target._physResist
    if (pr.physDamageReduce) {
      finalDmg *= (1 - pr.physDamageReduce)
    }
  }

  // 🔥 保存折前伤害（余伤蔓延天赋需要原始值重新计算护甲）
  const preArmorDmg = Math.round(finalDmg * 100) / 100;
  // 🛡️ 双抗分流（参考 LOL）：元素伤害/元素反应吃魔抗；物理/无属性吃护甲；毒属性 = 真伤，无视双抗
  if (dualResist) {
    // 🛡️ 双抗同时减免（尖刺类反伤伤害）：护甲 + 魔抗都生效
    let armor = getFinalArmor(target);
    armor *= (1 - ignoreArmorPercent);
    armor = Math.max(0, armor);
    let magicResist = getFinalMagicResist(target);
    magicResist *= (1 - ignoreArmorPercent);
    magicResist = Math.max(0, magicResist);
    finalDmg *= (1 - computeArmorReduction(armor)) * (1 - computeMagicResistReduction(magicResist));
    finalDmg = Math.round(finalDmg * 100) / 100;
  } else if (dmgType === 'poison') {
    // 💀 真伤：直接跳过抗性减免
    finalDmg = Math.round(finalDmg * 100) / 100;
  } else if (ELEMENT_DMG_TYPES.includes(dmgType)) {
    // 🧙 魔抗减免（元素 + 元素反应）
    let magicResist = getFinalMagicResist(target);
    magicResist *= (1 - ignoreArmorPercent);
    magicResist = Math.max(0, magicResist);
    finalDmg *= (1 - computeMagicResistReduction(magicResist));
  } else {
    // 🛡️ 护甲减免（物理 / 无属性 / 其他）
    let armor = getFinalArmor(target);
    armor *= (1 - ignoreArmorPercent);
    armor = Math.max(0, armor);
    finalDmg *= (1 - computeArmorReduction(armor));
  }
  let isCrit = false;
  // 🎯 暴击机制已移除：暴击率/暴击伤害不再参与伤害结算（幸运不再提供暴击，属性点也不再加暴击）
  // 💥 致命一击天赋：每回合使用的第一张物理牌伤害 +25%（回合开始由 battle.js 重置计数）
  if (dmgType === 'physical' && playerBoolen && user.hasTalent('critical_strike') && !player?._physCardUsedThisTurn) {
    finalDmg = Math.round(finalDmg * 1.25 * 100) / 100;
    player._physCardUsedThisTurn = 1;
    battleLog(`[天赋] 致命一击：本回合第一张物理牌伤害 +25%`);
  }
  if (playerBoolen) {
    // 🧠 智慧元素增伤：换算基数由 computeUnitAttrs 预计算（initBattleAttrs 写入 eleBonusBase），÷当前攻击保持原语义
    if (ELEMENT_DMG_TYPES.includes(dmgType)) {
      zengshang += (player?.eleBonusBase ?? ((player?.intelligence || 0) * (LEVEL_UP_CFG.attrRates?.intelligenceEleDmg ?? 1.5))) / Math.max(1, Number(player?.attack) || 1);
    }
    // ====================== 残血收割天赋增伤（已改为独立乘区，见下方物理独立乘区） ======================
    if (user.hasTalent('shield_damage_up')) {
      if (player.shield > 0) {
        const lv = user.getTalentLevel('shield_damage_up');
        const rate = (Number(user.getTalentEffect?.('shield_damage_up', 'dmgBonus') ?? 0.15) + Number(user.getTalentEffect?.('shield_damage_up', 'dmgBonusPerLv') ?? 0.05) * (lv - 1));
        zengshang += rate;
      }
    }
    // 🔥 天赋：天选之子 - 造成伤害概率提升50%（幸运收敛 + 未触发保底递增，触发后重置）
    if (user.hasTalent('luck_god_chosen')) {
      const luck = player.luck ?? 0;
      // 和厄运天赋完全同款幸运概率公式（基础概率用累积保底值）
      const finalProb = Math.min(0.99, user.luckProb(_luckGodChosenProb));
      if (chance(finalProb)) {
        zengshang += Number(user.getTalentEffect?.('luck_god_chosen', 'mult') ?? 0.5);
        _luckGodChosenProb = Number(user.getTalentEffect?.('luck_god_chosen', 'prob') ?? 0.2); // 触发后重置
      } else {
        _luckGodChosenProb = Math.min(0.99, _luckGodChosenProb + Number(user.getTalentEffect?.('luck_god_chosen', 'incProb') ?? 0.02));
      }
    }
    // 🎆 敌人受到伤害时自动触发命中粒子特效（仅主角直接伤害触发）
    //    effectConfig 里配 noHitParticles: true 可取消（如毒刺有自己的命中动画，不想再叠粒子）
    //    🚫 DOT 持续伤害（灼烧/瘴毒/毒雾/流血，敌人回合开始结算）不触发命中粒子
    const fxCfg = getEffectConfig?.(skillName);
    if (!fxCfg?.noHitParticles && !DOT_SKILLS.has(skillName)) {
      const particleElement = dmgType === 'lightning' ? 'electric' : dmgType;
      const particleOptions = SKILL_PARTICLE_CONFIG[skillName];
      if (particleOptions) {
        playHitParticlesOnEnemy(target, particleElement, particleOptions);
      } else {
        playHitParticlesOnEnemy(target, particleElement);
      }
    }
  } else {
    if (user.hasTalent('luck_god_chosen')) {
      const luck = player.luck ?? 0;
      // 受击减伤共用同一个保底运势：触发后同样重置
      const finalProb = Math.min(0.99, user.luckProb(_luckGodChosenProb));

      if (chance(finalProb)) {
        zengshang -= Number(user.getTalentEffect?.('luck_god_chosen', 'dmgReduce') ?? 0.5);
        _luckGodChosenProb = Number(user.getTalentEffect?.('luck_god_chosen', 'prob') ?? 0.2); // 触发后重置
      } else {
        _luckGodChosenProb = Math.min(0.99, _luckGodChosenProb + Number(user.getTalentEffect?.('luck_god_chosen', 'incProb') ?? 0.02));
      }
    }
  }
  finalDmg *= (computeExecuteMult(player, target) + zengshang)
  // 🔪 天赋：残血收割 - 最终物理伤害提升（独立乘区，仅物理伤害，不与增伤池相加）
  if (playerBoolen && user.hasTalent('execute') && dmgType === 'physical') {
    const hpPercent = target.hp / target.maxHp
    if (hpPercent <= player.executeHpThreshold) {
      finalDmg *= (1 + (player.executeZengshang ?? 0))
      emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffResidualHarvest') });
    }
  }
  // ⚔️ 天赋：先攻 - 造成物理伤害提升（独立乘区，仅物理，持续1回合）
  if (playerBoolen && (player?.physDmgBonus || 0) > 0 && dmgType === 'physical') {
    finalDmg *= (1 + player.physDmgBonus)
  }
  // 🔥 天赋：元素增伤 - 独立乘区（火/电/水/冰/风元素伤害最终单独乘算，不与增伤池叠加）
  if (playerBoolen && user.hasTalent('element_damage_up') && ELEMENT_DMG_TYPES.includes(dmgType)) {
    const lv = user.getTalentLevel('element_damage_up') || 1;
    const eleMult = (Number(user.getTalentEffect?.('element_damage_up', 'eleBonus') ?? 0.15) + Number(user.getTalentEffect?.('element_damage_up', 'eleBonusPerLv') ?? 0.05) * (lv - 1));
    finalDmg *= (1 + eleMult);
  }
  // 🧤 装备：幽暗手套 - 攻击牌增伤（独立乘区，fx.boostPct，dladmin 装备编辑可改）
  if (playerBoolen && player._gloveBoostCard) {
    finalDmg *= (1 + Number(ITEM_DEFS['幽暗手套']?.fx?.boostPct ?? 0.2));
  }
  // 🧣 装备：怒焰斗篷 - 火属性伤害 +%（fx.fireDmgPct，dladmin 装备编辑可改）
  if (playerBoolen && dmgType === 'fire' && user.isItemEquipped?.('怒焰斗篷')) {
    finalDmg *= (1 + Number(ITEM_DEFS['怒焰斗篷']?.fx?.fireDmgPct ?? 0.35));
  }
  // 🎖️ 装备：雷电勋章 - 雷属性伤害 +(basePct + speedScale%速度)%（独立乘区，fx，dladmin 装备编辑可改）
  if (playerBoolen && dmgType === 'lightning' && user.isItemEquipped?.('雷电勋章')) {
    const medalFx = ITEM_DEFS['雷电勋章']?.fx || {};
    const gloveSpeed = Number(player.speed || 0);
    finalDmg *= (1 + (Number(medalFx.basePct ?? 0.15) + gloveSpeed * Number(medalFx.speedScale ?? 0.15)));
  }
  // 💥 元素裂变溯源减半在 ElementReaction.js 的 combo 触发处处理（参与元素含裂变标记 → 伤害 -50%）
  // 🔥 保留2位小数，不向下取整，保证最小1点伤害
  finalDmg = Math.round(finalDmg * 100) / 100;
  // 🛡️ 受击前拦截用的实时敌人列表（调用方常传空数组，优先读战斗实时列表）
  const liveEnemies = (typeof window !== 'undefined' && window.__getFightEnemies)
    ? window.__getFightEnemies() : (enemies || []);
  if (playerBoolen) {
    // 🐦 飞翔状态：无法受到伤害（雷鸟/雷鸟女皇）
    if (target._flying) {
      // 伤害归0，但仍播元素特效（不扣血）
      emitter.emit('enemyDamage', {
        enemyName: target.name,
        enemyUid: target.uid,
        damage: 0,
        type: dmgType,
        isCritical: isCrit,
      });
      return { dmg: 0, crit: isCrit };
    }
    // 👑 统一受击前拦截（暗影王「暗影庇佑」：有召唤物存活时本体免疫所有伤害，先清召唤物）
    if (hasSummonShield(target, liveEnemies)) {
      emitter.emit('enemyDamage', {
        enemyName: target.name,
        enemyUid: target.uid,
        damage: 0,
        type: dmgType,
        isCritical: isCrit,
      });
      return { dmg: 0, crit: isCrit };
    }
    // 🛡️ 统一伤害落地（扣血/余伤蔓延/夺命烙印/受击被动/死亡检查/飘字震动 全部收敛在 applyDamageToTarget）
    const actualDmg = Math.max(1, finalDmg);
    applyDamageToTarget(target, actualDmg, {
      player, dmgType, isCritical: isCrit, skillName,
      enemies: liveEnemies, triggerPassives: !isDot,
      isPlayerDirect: isPlayerDirectAttack,
    });
  } else {
    // 🧙 携带的 NPC 队友攻击：正常扣除敌人血量（仅目标是敌人时）
    // 不影响影分身/无人机等原有行为（它们走各自逻辑）
    if (player?.isNpcAlly && target.camp === 'enemy') {
      // 🛡️ 统一拦截：暗影王有召唤物存活时 NPC 队友攻击同样免疫
      if (hasSummonShield(target, liveEnemies)) return;
      applyDamageToTarget(target, Math.max(1, finalDmg), {
        player, dmgType, isCritical: isCrit, skillName,
        enemies: liveEnemies, triggerPassives: !isDot,
        isPlayerDirect: false,
      });
    }
  }

  // ========== 元素属性自动施加debuff（仅技能直接伤害触发，DOT不触发）==========
  if (applyElement && player && target.hp > 0 && skillName !== '元素反应') {
    applyElementDebuff(dmgType, player, target, enemies);
  }

  return { dmg: finalDmg, crit: isCrit };
}

// ==============================================
// 🛡️ 统一伤害落地：所有对敌人造成伤害的入口都必须走这里
// 负责：扣血 → 余伤蔓延记录 → 夺命烙印累计/秒杀 → 受击被动 → 死亡检查 → 伤害飘字/震动
// 参数 ctx：{ player, dmgType='null', isCritical=false, skillName='', enemies=[],
//            triggerPassives=true（受击狂暴/飞翔等）, isPlayerDirect=false（雷鸟女皇 flyOnHit 用）,
//            trackOverflow=true, trackMark=true, checkBattleEnd=true, emitDamage=true }
// ==============================================
export function applyDamageToTarget(target, dmg, ctx = {}) {
  if (!target || !(dmg > 0)) return 0
  const {
    player = null,
    dmgType = 'null',
    isCritical = false,
    skillName = '',
    enemies = [],
    triggerPassives = true,
    isPlayerDirect = false,
    trackOverflow = true,
    trackMark = true,
    checkBattleEnd = true,
    emitDamage = true,
  } = ctx

  // 👑 二阶段变身无敌（ruchang 入场动画期间免疫所有伤害，无浮动文字）
  if (target.camp === 'enemy' && target._phase2Invincible) {
    // 💯 变身期间仍给反馈：头顶飘出本次伤害数字 + 「无敌」buff 文字（血不变、不播受击动画）
    return 0
  }

  // 🌫️ 凋零之盾（凋零魔兽）：伤害先扣护盾，破盾后标记（battle.js 行动条循环结算 +50%）
  if (target.camp === 'enemy' && target._witherShield > 0) {
    const absorbed = Math.min(target._witherShield, dmg)
    target._witherShield = Math.round((target._witherShield - absorbed) * 100) / 100
    dmg = Math.max(0, dmg - absorbed)
    if (target._witherShield <= 0) {
      target._witherShield = 0
      target._witherShieldBroken = true
      // 🔥 破盾即时结算：通知 battle.js 立即提升行动条（不依赖行动条循环时序）
      emitter.emit('witherShieldBroken', { enemy: target })
    }
  }

  const preHp = target.hp

  // 🚫 王权不再共享生命：三只属性相同但血量独立，伤害只扣自己
  target.hp = Math.max(0, target.hp - dmg)

  // ========== 余伤蔓延天赋：记录溢出伤害 ==========
  if (trackOverflow && user.hasTalent('kill_spread_damage') && target.hp <= 0) {
    const overflow = Math.max(0, dmg - preHp)
    if (overflow > 0) {
      target._spreadOverflow = Math.round(overflow * 100) / 100
    }
  }

  // ========== 夺命烙印天赋：只记录物理/无属性伤害的15%并检测秒杀 ==========
  if (trackMark && user.hasTalent('death_mark_stack') && (dmgType === 'physical' || dmgType === 'null')) {
    if (target._deathMarkAccum === undefined) target._deathMarkAccum = 0
    target._deathMarkAccum = Math.round((target._deathMarkAccum + dmg * 0.15) * 100) / 100
    if (target._deathMarkAccum > 0 && target.hp > 0 && target.hp <= target._deathMarkAccum) {
      target.hp = 0
    }
  }

  // ========== 💪 致命保命被动（猫咪史莱姆）：首次受到致命伤害后保留1点生命值 ==========
  if (target.camp === 'enemy' && Array.isArray(target.passives)) {
    const deathResistP = target.passives.find(p => p.type === 'deathResist')
    if (deathResistP && !target._deathResistUsed && target.hp <= 0) {
      target.hp = 1
      target._deathResistUsed = true
      emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: '猫有二命' })
    }
  }

  // ========== 受击被动（目标是被攻击的存活敌人） ==========
  if (triggerPassives && target.camp === 'enemy' && target.hp > 0 && Array.isArray(target.passives) && target.passives.length) {
    // —— 魔化猫被动「受击狂暴」：受伤提升10%行动条 + 5%攻击力 ——
    const rageOnHit = target.passives.find(p => p.type === 'rageOnHit')
    if (rageOnHit) {
      const stacks = (target._rageStacks || 0) + 1
      const maxStack = rageOnHit.maxStack ?? 10
      target._rageStacks = Math.min(stacks, maxStack)
      if (target.actionProgress !== undefined) {
        target.actionProgress += (rageOnHit.actionBarBoost ?? 0.08) * 10000
      }
      if (target.baseAttack) {
        const atkUp = target.baseAttack * (rageOnHit.attackBoost ?? 0.02)
        target.attack = Math.round((target.attack + atkUp) * 100) / 100
      }
    }
    // —— 雷鸟被动「濒死飞翔」：生命<50%时飞翔无法受伤，仅一次 ——
    const flyOnLowHp = target.passives.find(p => p.type === 'flyOnLowHp')
    if (flyOnLowHp && !target._lowHpFlyTriggered) {
      const hpRate = target.hp / target.maxHp
      if (hpRate < (flyOnLowHp.hpThreshold ?? 0.5)) {
        target._lowHpFlyTriggered = true
        target._flying = true
        try { user.playSoundEffect('music/jineng/feixing.mp3'); } catch (e) { /* 忽略 */ }
        emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffNearDeathFly') })
        emitter.emit('enemyFly', { enemyUid: target.uid, flying: true })
      }
    }
    // —— 兽型史莱姆1 被动「再生」：受到伤害后恢复 12% 已损失生命值 ——
    const regenOnHit = target.passives.find(p => p.type === 'regen')
    if (regenOnHit && target.hp > 0 && target.hp < target.maxHp) {
      const lost = target.maxHp - target.hp
      const heal = Math.max(1, Math.round(lost * (regenOnHit.pct ?? 0.12) * 100) / 100)
      target.hp = Math.min(target.maxHp, target.hp + heal)
      emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: `+${heal} 再生` })
    }
    // —— 雷鸟女皇被动「受击飞翔」：被【玩家直接攻击】后飞翔无法受伤至回合开始，每回合一次 ——
    const flyOnHit = target.passives.find(p => p.type === 'flyOnHit')
    if (flyOnHit && isPlayerDirect && !target._hitFlyTriggeredThisTurn) {
      target._hitFlyTriggeredThisTurn = true
      target._flying = true
      try { user.playSoundEffect('music/jineng/feixing.mp3'); } catch (e) { /* 忽略 */ }
      emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffFly') })
      emitter.emit('enemyFly', { enemyUid: target.uid, flying: true })
      // ⚡ 雷鸟女皇被动反击：触发飞翔时立刻对玩家造成 counterDmgRatio 攻击力的电属性伤害，
      //    特效复用普攻雷电特效（leiji，在玩家位置播放）
      const cRatio = flyOnHit.counterDmgRatio ?? 0
      if (cRatio > 0 && player) {
        const srcAtk = target.attack || target.baseAttack || 0
        const cDmg = Math.max(1, Math.round(srcAtk * cRatio))
        try {
          const appContainer = getFightContainer()
          const pPos = getPlayerScreenPos()
          if (appContainer && pPos) {
            playAtPoint(appContainer, pPos.x, pPos.y, {
              effectName: flyOnHit.counterEffectName || 'leiji',
              scale: (flyOnHit.counterEffectScale ?? 3) * EFFECT_SCALE_BASE,
              zIndex: 100,
            })
          }
          user.playSoundEffect?.(flyOnHit.counterSound || 'enemy_leiniaonvhuang_attack')
        } catch (e) { /* 忽略 */ }
        applyDamageToPlayer(player, cDmg, {
          dmgType: flyOnHit.counterDmgType || 'lightning',
          sourceAtk: srcAtk,
          useShield: true,
          checkEnd: false,
          showDamageText: true,
        })
      }
    }
  }

  // ========== 死亡检查（战斗结束 / 掉落 / 死亡被动等统一入口） ==========
  if (checkBattleEnd && typeof BattleSystem?.checkBattleEnd === 'function') {
    try { BattleSystem.checkBattleEnd() }
    catch (e) { console.error('[战斗结算] checkBattleEnd 异常（可能导致战斗无法结束）:', e) }
  }

  // ========== 伤害飘字 + 屏幕震动 ==========
  if (emitDamage) {
    emitter.emit('enemyDamage', {
      enemyName: target.name,
      enemyUid: target.uid,
      damage: Math.max(1, dmg),
      type: dmgType,
      isCritical,
    });
    emitter.emit('screenShake', { intensity: isCritical ? 8 : 5, duration: 0.12 });
  }

  return dmg
}

// ==============================================
// 🛡️ 统一玩家受伤落地：护盾吸收 → 扣血 → 保命 → 受伤飘字 → 死亡检查
//    与 applyDamageToTarget（敌人侧）对称，所有玩家扣血都必须走这里
// 参数 ctx：{
//   dmgType='physical'（飘字颜色用）, sourceAtk=0（飘字伤害来源攻击力）,
//   useShield=true（护盾优先吸收；流血等原行为不吃护盾的可关）,
//   onAbsorbed=null（每次护盾吸收后回调 (absorbed, remaining)，盾反/能量转换等天赋响应）,
//   onShieldBroken=null（护盾归零后回调 ()，返回 true 表示抵消剩余伤害，如天赋「抵消」）,
//   onLethal=null（扣血后 hp<=0 回调 ()，返回 true 表示保命成功，如西亚祝福）,
//   checkEnd=false（是否立即触发战斗结束检查；DOT/技能原行为 true）,
//   showDamageText=true（是否 takeDamage 飘字；enemyAttack 已在外部飘全额可关）,
// }
// 返回 { absorbed, actualDmg }：护盾吸收量、实际扣血量
// ==============================================
export function applyDamageToPlayer(player, dmg, ctx = {}) {
  if (!player || !(dmg > 0)) return { absorbed: 0, actualDmg: 0 }
  const {
    dmgType = 'physical',
    sourceAtk = 0,
    useShield = true,
    onAbsorbed = null,
    onShieldBroken = null,
    onLethal = null,
    checkEnd = false,
    showDamageText = true,
  } = ctx

  let remaining = Math.max(0, dmg)
  let absorbed = 0

  // 🛡️ 护盾优先吸收
  if (useShield && player.shield > 0 && remaining > 0) {
    const ab = Math.min(player.shield, remaining)
    player.shield -= ab
    remaining -= ab
    absorbed = ab
    onAbsorbed?.(absorbed, remaining)
    // 护盾归零 → 天赋「抵消」可把剩余伤害清零
    if (player.shield <= 0 && onShieldBroken?.() === true) {
      remaining = 0
    }
  }

  // 💚 扣血
  const beforeHp = player.hp
  player.hp = Math.max(0, (player.hp ?? 0) - remaining)

  // ❤️ 保命钩子（西亚祝福等，回调内自行修改 hp）
  if (player.hp <= 0 && onLethal?.() === true) {
    // 保命成功
  }

  // 🔢 受伤飘字（takeDamage 内部会误扣 store 血量 → 恢复，战斗内扣血统一以 player.hp 结算）
  if (showDamageText) {
    const pi = (typeof window !== 'undefined' && user?.pixi?.playerInstance) || null
    try {
      pi?.takeDamage?.(remaining, { type: dmgType, isCritical: false }, sourceAtk)
      if (user?.pixi?.player?.juese) user.pixi.player.juese.hp = beforeHp
    } catch (e) { /* ignore */ }
  }

  // 💀 死亡检查（原行为：毒跳伤/毒爆立即检查；敌人攻击由行动结束统一检查）
  if (checkEnd && player.hp <= 0 && typeof BattleSystem?.checkBattleEnd === 'function') {
    try { BattleSystem.checkBattleEnd() }
    catch (e) { console.error('[战斗结算] 玩家死亡检查异常（可能导致战斗无法结束）:', e) }
  }

  return { absorbed, actualDmg: remaining }
}

// ==============================================
// 🧪 玩家中毒发作（玩家回合开始由 dotSystem 统一 DOT 循环结算）
//    层进伤害：层1 = poisonRatio（50%）攻击力，每多 1 层 +50% 基础（即 +25 个百分点）
//    护盾优先吸收、致死立即检查战斗结束；毒 DOT 不触发盾反/能量转换等受击天赋
// ==============================================
export function tickPlayerPoison(target, player, playerHand, name, du) {
  const pb = (target?.debuffs || []).find(d => d.type === 'player_poison') || du
  if (!pb || pb.stacks <= 0) return
  const ratio = pb.poisonRatio * (1 + 0.5 * ((pb.stacks || 1) - 1))
  const dmg = Math.max(1, Math.round(pb.attack * ratio * 100) / 100)
  applyDamageToPlayer(target, dmg, {
    dmgType: 'poison',
    sourceAtk: pb.attack,
    useShield: true,
    checkEnd: true, // 原行为：中毒致死立即检查
    showDamageText: true,
  })
  try { emitter.emit('playerPoison', { stacks: pb.stacks, remaining: pb.remaining }) } catch (e) { /* ignore */ }
  battleLog(`🧪 ${target.name} 中毒发作：${dmg} 伤害（层数 ${pb.stacks}）`)
}

// ==============================================
// 通用：根据伤害类型自动施加对应元素debuff并检测反应
// ==============================================
function applyElementDebuff(dmgType, player, target, enemies = []) {
  if (!target || target.hp <= 0) return;

  switch (dmgType) {
    case 'water': {
      // ===== 水属性：施加湿润（去重刷新：存在刷新 2 回合，新建 999 待反应消耗）=====
      const isNewWet = upsertBuff(target, { name: '湿润', type: 'wet', remaining: 999 }, { isDebuff: true, refreshRemaining: 2 });
      // 检测反应：湿润 + 霜冻 = 冻结
      const frozen = checkFrostWetCombo(player, target);
      // 检测反应：湿润 + 灼烧 = 蒸发
      const vaporized = checkWetBurnCombo(player, target);
      // 检测反应：湿润 + 电流 = 感电（敌人可能已有电流）
      const electrified = checkWetLightningCombo(player, target, enemies);
      // 没触发反应才显示湿润文字
      if (isNewWet && !frozen && !vaporized && !electrified) {
        emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffWet') });
      }
      break;
    }

    case 'ice': {
      // ===== 冰属性：施加霜冻（去重刷新：存在刷新 2 回合，新建 999 + 扣速）=====
      const speedDebuff = Math.floor((target.baseSpeed || target.speed) * 0.1);
      const isNewFrost = upsertBuff(target, { name: '霜冻', type: 'frost', remaining: 999, speedDebuff }, { isDebuff: true, refreshRemaining: 2 });
      if (isNewFrost) {
        target.speed = Math.max(1, target.speed - speedDebuff);
      }
      // 检测反应：霜冻 + 湿润 = 冻结
      const frozen = checkFrostWetCombo(player, target);
      // 检测反应：霜冻 + 灼烧 = 融化
      const melted = checkFrostBurnCombo(player, target);
      // 检测反应：霜冻 + 电流 = 超导（敌人可能已有电流）
      const superconducted = checkFrostLightningCombo(player, target);
      // 没触发反应才显示霜冻文字
      if (isNewFrost && !frozen && !melted && !superconducted) {
        emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffFrost') });
      }
      break;
    }

    case 'fire': {
      // ===== 火属性：施加灼烧（去重刷新：存在刷新 2 回合，新建带伤害值）=====
      const burnDmg = Math.round(player.attack * 0.16 * 100) / 100;
      const isNewBurn = upsertBuff(target, { name: '灼烧', type: 'burn', remaining: 2, damage: burnDmg }, { isDebuff: true, refreshRemaining: 2 });
      // 检测反应：湿润 + 灼烧 = 蒸发
      const vaporized = checkWetBurnCombo(player, target);
      // 检测反应：霜冻 + 灼烧 = 融化
      const melted = checkFrostBurnCombo(player, target);
      // 检测反应：灼烧 + 电流 = 爆燃（敌人可能已有电流）
      const overloaded = checkBurnLightningCombo(player, target, enemies);
      // 没触发反应才显示灼烧文字
      if (isNewBurn && !vaporized && !melted && !overloaded) {
        emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffBurn') });
      }
      break;
    }

    case 'lightning': {
      // ===== 雷属性：施加电流（去重刷新：存在刷新 2 回合，新建 999 待反应消耗）=====
      const isNewShock = upsertBuff(target, { name: '电流', type: 'lightning', remaining: 999 }, { isDebuff: true, refreshRemaining: 2 });
      // 检测反应：湿润 + 电流 = 感电
      const electrified = checkWetLightningCombo(player, target, enemies);
      // 检测反应：霜冻 + 电流 = 超导
      const superconducted = checkFrostLightningCombo(player, target);
      // 检测反应：灼烧 + 电流 = 爆燃
      const overloaded = checkBurnLightningCombo(player, target, enemies);
      // 没触发反应才显示电流文字
      if (isNewShock && !electrified && !superconducted && !overloaded) {
        emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffElectro') });
      }
      break;
    }
  }
}

// ==============================================
// 射击
// ==============================================
export function useSkillShooting(player, enemies, baseDmg, card) {
  const cfg = user.pixi.player.CARD_DATA.射击;
  const buff = getEvolutionBuff(card);
  const target = enemies.find(e => e.hp > 0);
  if (!target) return;

  let i = 0;
  function hit() {
    if (i >= cfg.hitCount || target.hp <= 0) return;
    // 现在直接返回 { dmg, crit }
    const { dmg: finalDmg, crit } = calculateFinalDamage(
      baseDmg,
      target,
      { ignoreArmor: buff.ignoreArmor, dmgType: card.dmgType, player, buff, applyElement: true, enemies: [], skillName: card.name }
    );

    battleLog('【射击】', finalDmg, crit ? '🔥暴击' : '');
    i++;
    setTimeout(hit, 150);
  }
  hit();
}
// ==============================================
// 额外攻击
// ==============================================
export function triggerExtraAttack(card, player, enemies, buff) {
  const target = enemies.find(e => e.hp > 0);
  if (!target) return;

  const rawDmg = calculateSkillDamage(card.name, player, card);
  const { dmg: finalDmg, crit } = calculateFinalDamage(
    rawDmg,
    target,
    { ignoreArmor: buff.ignoreArmor, dmgType: card.dmgType, player, buff, applyElement: true, enemies: [], skillName: card.name }
  );

  battleLog('【额外攻击】', finalDmg, crit ? '🔥暴击' : '');
}
// ==============================================
// 激光
// ==============================================
export function useSkillLaser(player, enemies, baseDmg, card) {
  const buff = getEvolutionBuff(card);

  enemies.filter(e => e.hp > 0).forEach(enemy => {
    const { dmg: finalDmg, crit } = calculateFinalDamage(
      baseDmg,
      enemy,
      { ignoreArmor: buff.ignoreArmor, dmgType: card.dmgType, player, buff, applyElement: true, enemies: [], skillName: card.name }
    );

    battleLog('【激光】', finalDmg, crit ? '🔥暴击' : '');
  });
}

// ==============================================
// 瘴气（指定敌人释放：直接减面板护甲，记录值，基于基础护甲）
// ==============================================
export function useSkillMiasma(player, enemies, card, battle, target = null) {
  const cfg = user.pixi.player.CARD_DATA.瘴气;
  const star = card?.star ?? 1;
  // 瘴气星级：35/42/49% 毒素伤害
  const atkRatio = starVal(cfg, 'atkRatio', star, 0.35);

  // 🎯 指定敌人释放：优先用拖拽指定的目标，否则选第一个存活敌人
  const targetEnemies = (target?.hp > 0 ? [target] : enemies.filter(e => e.hp > 0).slice(0, 1));

  targetEnemies.forEach(en => {
    // 初始化敌人全局毒易伤（第一次上毒时确保有值）
    if (en.poisonTaken === undefined) en.poisonTaken = 0;

    // 通知pixi层播放中毒闪绿效果
    emitter.emit('enemyPoisonFlash', { enemyName: en.name, enemyUid: en.uid });

    const baseDot = cfg.fixedDmg + Math.round(player.attack * atkRatio * 100) / 100;
    const exist = en.debuffs.find(b => b.name === '瘴毒');

    if (exist) {
      exist.remaining = 3;
      exist.stack += 1;
    } else {
      // 查找弱点 debuff
      en.debuffs.push({
        name: '瘴毒',
        type: 'poison',
        damage: baseDot,
        dmgType: cfg.dmgType,
        remaining: 3,
        stack: 0,
        reduceArmor: 0,
        poisonTaken: 0, // 毒易伤
      });
      // 发送事件给战斗场景pixi层显示buff文字
      emitter.emit('enemyBuff', { enemyName: en.name, enemyUid: en.uid, buffName: t('buffMiasma') });
    }

    const curr = en.debuffs.find(b => b.name === '瘴毒');
    let finalDmg = baseDot * (1 + curr.stack * 0.5);
    curr.damage = Math.round(finalDmg * 100) / 100;

    // ✅ 播放瘴气 spine 动画（锚定敌人 spine 实际渲染位置，正好在敌人脚下）
    try {
      const zhangqiEffect = getEffect('zhangqi');
      if (zhangqiEffect) {
        if (en) {
          // 🎯 敌人位置用 spine 实际渲染坐标（屏幕坐标），fallback 数据坐标
          //    （⚠️ 直接用 en.x/en.y（逻辑站位坐标）会导致特效偏移，不在敌人身上）
          const spinePos = getEnemySpinePos(en);
          const ex = spinePos ? spinePos.x : en.x;
          const ey = spinePos ? spinePos.y : en.y;
          // 🎬 位置/大小可配置（effectConfig 的「瘴气」项：scale/targetY/offsetX/offsetY/zIndex）
          const effCfg = getEffectConfig('瘴气') || {};
          zhangqiEffect.scale.set((effCfg.scale ?? 1) * EFFECT_SCALE_BASE);
          zhangqiEffect.x = ex + (effCfg.offsetX ?? 0) * VW_CACHE;
          zhangqiEffect.y = ey * (effCfg.targetY ?? 1) + (effCfg.offsetY ?? 0) * VH_CACHE;
          zhangqiEffect.zIndex = effCfg.zIndex ?? 100;
          // 播放动画（不循环，播完回收）
          zhangqiEffect.state.setAnimation(0, effCfg.animName ?? 'animation', false);
          // 动画结束后回收（使用 _hasCompleteListener 防重复注册）
          if (!zhangqiEffect._hasCompleteListener) {
            zhangqiEffect.state.addListener({
              complete: () => {
                if (zhangqiEffect._completeListeners?.length) {
                  zhangqiEffect._completeListeners.forEach(fn => fn());
                  zhangqiEffect._completeListeners.length = 0;
                }
              }
            });
            zhangqiEffect._hasCompleteListener = true;
            zhangqiEffect._completeListeners = [];
          }
          // 加入本次回收回调
          zhangqiEffect._completeListeners.push(() => {
            returnEffect('zhangqi', zhangqiEffect);
          });
          // 添加到特效层（确保在敌人上方）
          const effectContainer = getFightContainer();
          if (effectContainer) {
            effectContainer.addChild(zhangqiEffect);
            effectContainer.sortChildren();
          } else {
            user.pixi.app.addChild(zhangqiEffect);
          }
        } else {
          // 没找到敌人，回收特效
          returnEffect('zhangqi', zhangqiEffect);
        }
      }
    } catch (e) {
      // 没有找到 zhangqi 特效，不执行
      console.warn('⚠️ 未找到 zhangqi 特效，跳过播放');
    }
  });
}

// ==============================================
// 敌人死亡 → 瘴气CD-1（已移除：原进化"死亡返还"）
// ==============================================
export function onEnemyDeathForMiasma(playerHand) {
  const card = playerHand.find(c => c.name === "瘴气");
  if (card && card.activeEvos?.includes("死亡返还")) {
    card.cooldown = Math.max(0, card.cooldown - 1);
  }
}


// ==============================================

// ==============================================
// 🌊 水精灵：召唤持续3回合的友方水精灵（shuituanzi spine：idle 待机 / attack 攻击）
//   星级：速度 60/70/80%（speedRatio）、攻击 80/85/90%（atkRatio）、行动治疗 70/80/90% 攻击力（healRatio）
//   存在时玩家的水元素伤害提升 15%（水伤光环）
//   未退场再次召唤：刷新持续回合 + 体型+8% + 行动条+25% + 攻击力+15% + 速度+8%（可叠加）
// ==============================================
export function useSkillWaterSpirit(player, allies, card, battle, user) {
  const cfg = user.pixi.player.CARD_DATA.水精灵;
  if (!cfg) return 300;
  const star = card?.star ?? 1;

  const SPEED_RATIO = starVal(cfg, 'speedRatio', star, 0.6);
  const ATK_RATIO = starVal(cfg, 'atkRatio', star, 0.8);
  const HEAL_RATIO = starVal(cfg, 'healRatio', star, 0.7);
  const DURATION = (cfg.summonDuration ?? 3) + (user.hasTalent?.('tong_xin') ? 1 : 0); // 🤝 同心：召唤物持续时间+1回合
  const SPINE_SCALE = cfg.spineScale ?? 0.5;

  // ✅ 已有存活水精灵 → 刷新持续回合 + 强化（体型/行动条/攻击/速度）
  const existing = allies.find(a => a.isWaterSpirit && a.hp > 0);
  if (existing) {
    existing.spiritTurns = DURATION;
    if (existing.turnText) {
      existing.turnText.text = String(DURATION); // 🔢 刷新剩余回合数
      // 📍 强化弹跳后重新贴到 spine 右上角
      try {
        const b = existing.spineInstance?.getBounds?.();
        if (b && b.width > 0) {
          existing.turnText.x = b.x + b.width;
          existing.turnText.y = b.y;
        }
      } catch (e) { /* ignore */ }
    }
    existing.spiritBuffStacks = (existing.spiritBuffStacks || 0) + 1;
    // 🎈 体型 +8%：弹弹弹弹性变大动画（过冲→回落→稳定），保持水平翻转（x 负 y 正）
    if (existing.spineInstance) {
      const sp = existing.spineInstance;
      const curX = sp.scale.x || SPINE_SCALE;
      const curY = sp.scale.y || SPINE_SCALE;
      const newX = curX * 1.08;
      const newY = curY * 1.08;
      gsap.killTweensOf(sp.scale);
      gsap.timeline()
        .to(sp.scale, { x: newX * 1.18, y: newY * 1.18, duration: 0.16, ease: 'power2.out' })
        .to(sp.scale, { x: newX * 0.95, y: newY * 0.95, duration: 0.1, ease: 'power2.in' })
        .to(sp.scale, { x: newX * 1.06, y: newY * 1.06, duration: 0.08, ease: 'power2.out' })
        .to(sp.scale, { x: newX, y: newY, duration: 0.08, ease: 'power2.out' });
    }
    // 行动条 +25%（ACTION_MAX = 10000）
    existing.actionProgress = Math.min(10000, (existing.actionProgress || 0) + 2500);
    // 攻击力 +15%、速度 +8%（再次召唤：按玩家当前属性刷新快照 + 强化倍率）
    existing.atkRatio = (existing.atkRatio ?? ATK_RATIO) * 1.15;
    existing._atkSnapshot = Math.round(player.attack * 100) / 100;
    existing.speed = Math.round(player.baseSpeed * SPEED_RATIO * (1 + 0.08 * (existing.spiritBuffStacks || 1)) * 10) / 10; // 强化速度累加：1次×1.08、2次×1.16…
    player._waterSpiritBoost = true; // 💧 水精灵存在：水伤光环
    // 💧 玩家水伤提升 buff（water_dmg_up 皮肤图标，持续到水精灵全部离场；deep watch 自动刷新图标）
    const wb1 = (player.buffs = player.buffs || []).find(b => b.name === '水灵祝福')
    if (wb1) wb1.remaining = 999
    else player.buffs.push({ name: '水灵祝福', type: 'waterBoost', remaining: 999 })
    battleLog(`🌊 水精灵强化：刷新${DURATION}回合，体型+8%（弹跳）、攻击力+15%、速度+8%、行动条+25%（第${existing.spiritBuffStacks}次）`);
    const summonSfx = getSummonSound('水精灵', 'summon');
    if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);
    return cfg.animDelay || 300;
  }

  // 🔒 数量上限保护（位置排布足够，但避免无限堆叠）
  const aliveSpirits = allies.filter(a => a.isWaterSpirit && a.hp > 0).length;
  if (aliveSpirits >= 8) {
    battleLog('🌊 水精灵已达数量上限（8）');
    return 300;
  }

  // ========== 创建水精灵 ==========
  const spirit = createUnit({
    name: '水精灵',
    hp: 1,
    maxHp: 1,
    baseSpeed: Math.round(player.baseSpeed * SPEED_RATIO * 10) / 10,
    attack: Math.round(player.attack * ATK_RATIO * 100) / 100, // 💧 拥有玩家 80/85/90% 攻击力
    _atkSnapshot: Math.round(player.attack * 100) / 100, // 📸 召唤时玩家攻击快照（后续玩家提升不影响本只）
    camp: 'player',
    isWaterSpirit: true,
    owner: player,
    spiritTurns: DURATION,
    atkRatio: ATK_RATIO,
    healRatio: HEAL_RATIO,
    speedUpAction: false,
    _isDead: false,
    _inAction: false,
  });
  spirit.actionProgress = 0;
  spirit.speed = spirit.baseSpeed;
  allies.push(spirit);
  applyHeartToHeart(spirit, allies); // 💖 交心：召唤物全属性增加
  player._waterSpiritBoost = true; // 💧 水精灵存在：水伤光环
  // 💧 玩家水伤提升 buff（water_dmg_up 皮肤图标，持续到水精灵全部离场；deep watch 自动刷新图标）
  const wb2 = (player.buffs = player.buffs || []).find(b => b.name === '水灵祝福')
  if (wb2) wb2.remaining = 999
  else player.buffs.push({ name: '水灵祝福', type: 'waterBoost', remaining: 999 })

  // ✅ 创建水精灵 Spine（shuituanzi：idle 待机 / attack 攻击）
  const spiritSpine = getEffect('shuituanzi');
  spiritSpine.scale.set(-SPINE_SCALE, SPINE_SCALE); // 水平翻转
  spiritSpine.state.timeScale = 0.45; // 🐢 播放速度 0.4（水精灵）
  spiritSpine.alpha = 1;
  spiritSpine.zIndex = 50;
  spiritSpine.pivot.set(0.5, 0.5);
  // 🎬 召唤：先播 ruchang（一次性），播完自动切 idle 循环
  const anims = spiritSpine.skeleton?.data?.animations || [];
  const idleAnim = anims.some(a => a.name === 'idle') ? 'idle' : (anims.find(a => a.name !== 'attack' && a.name !== 'ruchang' && a.name !== 'tuichang')?.name || anims[0]?.name);
  if (anims.some(a => a.name === 'ruchang')) {
    spiritSpine.state.setAnimation(0, 'ruchang', false);
    if (idleAnim) spiritSpine.state.addAnimation(0, idleAnim, true, 0);
  } else if (idleAnim) {
    spiritSpine.state.setAnimation(0, idleAnim, true);
  }

  // ✅ 位置：玩家前方（右侧），多个精灵按行列排开不重叠
  const screenPos = getPlayerScreenPos();
  const baseX = screenPos ? screenPos.x : (user.pixi.playerInstance?.view?.x ?? 0);
  const baseY = screenPos ? screenPos.y : (user.pixi.playerInstance?.view?.y ?? 0);
  const idx = allies.filter(a => (a.isWaterSpirit || a.isThunderSpirit || a.isIceSpirit || a.isFireSpirit) && a.hp > 0).length - 1; // 含刚 push 的自己（水/雷/冰精灵统一排布不重叠）
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  spiritSpine.x = baseX - 10 * VW_CACHE + col * 10 * VW_CACHE;
  spiritSpine.y = baseY - 26 * VH_CACHE + row * 6 * VH_CACHE;

  const effectContainer = getFightContainer();
  if (effectContainer) {
    effectContainer.addChild(spiritSpine);
    effectContainer.sortChildren();
  } else {
    user.pixi.app.addChild(spiritSpine);
  }
  spirit.spineInstance = spiritSpine;

  // 🔢 右上角显示剩余回合数
  const turnText = new Text({
    text: `${DURATION}`,
    style: {
      fill: 0xffcc00,
      fontSize: Math.max(10, Math.min(26, Math.round(VH_CACHE * 1.6))),
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
      fontFamily: 'Arial Black',
      resolution: window.devicePixelRatio || 2,
    }
  });
  turnText.anchor.set(1, 0); // 右上角锚点
  // 📍 紧贴 spine 右上角（骨骼更新后按实际边界对齐）
  const alignTurnText = () => {
    try {
      const b = spiritSpine.getBounds();
      if (b && (b.width > 0 || b.height > 0)) {
        turnText.x = b.x + b.width - 0.5 * VW_CACHE; // 右上角贴边
        turnText.y = b.y - 0.5 * VH_CACHE;
      }
    } catch (e) { /* ignore */ }
  };
  alignTurnText();
  setTimeout(alignTurnText, 60); // spine 首帧骨骼更新后再对齐
  turnText.zIndex = 120;
  (effectContainer || user.pixi.app).addChild(turnText);
  spirit.turnText = turnText;

  spirit.onDeactivate = () => {
    // 🔢 移除回合数 Text
    if (spirit.turnText) {
      const tc = getFightContainer();
      if (tc && spirit.turnText.parent) tc.removeChild(spirit.turnText);
      spirit.turnText.destroy?.();
      spirit.turnText = null;
    }
    if (spirit.spineInstance) {
      returnEffect('shuituanzi', spirit.spineInstance);
      spirit.spineInstance = null;
    }
  };

  // 🎵 召唤音效（EFFECT_CONFIG 水精灵 未配置则静默）
  const summonSfx = getSummonSound('水精灵', 'summon');
  if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);
  battleLog(`🌊 召唤水精灵：速度${spirit.speed}，攻击${spirit.attack}，行动治疗${Math.round(HEAL_RATIO * 100)}%攻击力，持续${DURATION}回合`);
  return cfg.animDelay || 300;
}

// ==============================================
// ⚡ 雷精灵：召唤持续3回合的友方雷精灵（leituanzi spine：idle 待机 / attack 攻击 / ruchang 入场）
//   星级：速度 60/70/80%（speedRatio），行动时玩家行动条 +20/25/30%（actionGainRatio）、
//         攻击力 +15/20/25%（atkBuffRatio，永久累加、不衰减）
//   未退场再次召唤：刷新持续回合 + 体型+8% + 行动条+25% + 速度+8% + 玩家增益效果+15%（加法叠加）
// ==============================================
export function useSkillThunderSpirit(player, allies, card, battle, user) {
  const cfg = user.pixi.player.CARD_DATA.雷精灵;
  if (!cfg) return 300;
  const star = card?.star ?? 1;

  const SPEED_RATIO = starVal(cfg, 'speedRatio', star, 0.6);
  const ACTION_GAIN_RATIO = starVal(cfg, 'actionGainRatio', star, 0.16);
  const ATK_BUFF_RATIO = starVal(cfg, 'atkBuffRatio', star, 0.09);
  const DURATION = (cfg.summonDuration ?? 3) + (user.hasTalent?.('tong_xin') ? 1 : 0); // 🤝 同心：召唤物持续时间+1回合
  const SPINE_SCALE = cfg.spineScale ?? 0.5;

  // ✅ 已有存活雷精灵 → 刷新持续回合 + 强化（体型/行动条/速度/玩家增益效果）
  const existing = allies.find(a => a.isThunderSpirit && a.hp > 0);
  if (existing) {
    existing.spiritTurns = DURATION;
    if (existing.turnText) {
      existing.turnText.text = String(DURATION); // 🔢 刷新剩余回合数
      try {
        const b = existing.spineInstance?.getBounds?.();
        if (b && b.width > 0) {
          existing.turnText.x = b.x + b.width +0.3* VW_CACHE
          existing.turnText.y = b.y-0.3* VH_CACHE;
        }
      } catch (err) { /* ignore */ }
    }
    existing.spiritBuffStacks = (existing.spiritBuffStacks || 0) + 1;
    // 🎈 体型 +8%：弹弹弹弹性变大动画（过冲→回落→稳定），保持水平翻转（x 负 y 正）
    if (existing.spineInstance) {
      const sp = existing.spineInstance;
      const curX = sp.scale.x || SPINE_SCALE;
      const curY = sp.scale.y || SPINE_SCALE;
      const newX = curX * 1.08;
      const newY = curY * 1.08;
      gsap.killTweensOf(sp.scale);
      gsap.timeline()
        .to(sp.scale, { x: newX * 1.18, y: newY * 1.18, duration: 0.16, ease: 'power2.out' })
        .to(sp.scale, { x: newX * 0.95, y: newY * 0.95, duration: 0.1, ease: 'power2.in' })
        .to(sp.scale, { x: newX * 1.06, y: newY * 1.06, duration: 0.08, ease: 'power2.out' })
        .to(sp.scale, { x: newX, y: newY, duration: 0.08, ease: 'power2.out' });
    }
    // 行动条 +25%（ACTION_MAX = 10000）
    existing.actionProgress = Math.min(10000, (existing.actionProgress || 0) + 2500);
    // 速度 +8%（再次召唤：按玩家当前基础攻击/速度刷新）
    existing.speed = Math.round(player.baseSpeed * SPEED_RATIO * (1 + 0.08 * (existing.spiritBuffStacks || 1)) * 10) / 10; // 强化速度累加：1次×1.08、2次×1.16…
    existing._atkSnapshot = Math.round(player.baseAttack * 100) / 100;
    // 为玩家施加的增益效果 +8%
    existing.buffPower = 1 + 0.15 * (existing.spiritBuffStacks || 0); // 增益效果+15%加法叠加：1次×1.15、2次×1.30、3次×1.45…（作用于雷精灵行动时提供的攻击力）
    player._thunderSpiritBoost = true; // ⚡ 雷精灵存在：雷伤光环
    // ⚡ 玩家雷伤提升 buff（thunder_dmg_up 皮肤图标，持续到雷精灵全部离场；deep watch 自动刷新图标）
    const tb1 = (player.buffs = player.buffs || []).find(b => b.name === '雷灵祝福')
    if (tb1) tb1.remaining = 999
    else player.buffs.push({ name: '雷灵祝福', type: 'thunderBoost', remaining: 999 })
    battleLog(`⚡ 雷精灵强化：刷新${DURATION}回合，体型+8%（弹跳）、行动条+25%、速度+8%、增益效果+15%（第${existing.spiritBuffStacks}次）`);
    const summonSfx = getSummonSound('雷精灵', 'summon');
    if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);
    return cfg.animDelay || 300;
  }

  // 🔒 数量上限保护（位置排布足够，但避免无限堆叠）
  const aliveSpirits = allies.filter(a => a.isThunderSpirit && a.hp > 0).length;
  if (aliveSpirits >= 8) {
    battleLog('⚡ 雷精灵已达数量上限（8）');
    return 300;
  }

  // ========== 创建雷精灵 ==========
  const spirit = createUnit({
    name: '雷精灵',
    hp: 1,
    maxHp: 1,
    baseSpeed: Math.round(player.baseSpeed * SPEED_RATIO * 10) / 10,
    attack: 0,
    _atkSnapshot: Math.round(player.baseAttack * 100) / 100, // 📸 召唤时玩家基础攻击快照（后续提升不影响本只）
    camp: 'player',
    isThunderSpirit: true,
    owner: player,
    spiritTurns: DURATION,
    actionGainRatio: ACTION_GAIN_RATIO,
    atkBuffRatio: ATK_BUFF_RATIO,
    buffPower: 1,
    speedUpAction: false,
    _isDead: false,
    _inAction: false,
  });
  spirit.actionProgress = 0;
  spirit.speed = spirit.baseSpeed;
  allies.push(spirit);
  applyHeartToHeart(spirit, allies); // 💖 交心：召唤物全属性增加
  player._thunderSpiritBoost = true; // ⚡ 雷精灵存在：雷伤光环
  // ⚡ 玩家雷伤提升 buff（elec_dmg_up 皮肤图标，持续到雷精灵全部离场；deep watch 自动刷新图标）
  const tb2 = (player.buffs = player.buffs || []).find(b => b.name === '雷灵祝福')
  if (tb2) tb2.remaining = 999
  else player.buffs.push({ name: '雷灵祝福', type: 'thunderBoost', remaining: 999 })

  // ✅ 创建雷精灵 Spine（leituanzi：idle 待机 / attack 攻击 / ruchang 入场）
  const spiritSpine = getEffect('leituanzi');
  spiritSpine.scale.set(-SPINE_SCALE, SPINE_SCALE); // 水平翻转
  spiritSpine.state.timeScale = 0.55; // 🐢 播放速度 0.65
  spiritSpine.alpha = 1;
  spiritSpine.zIndex = 50;
  spiritSpine.pivot.set(0.5, 0.5);
  // 🎬 召唤：先播 ruchang（一次性），播完自动切 idle 循环
  const anims = spiritSpine.skeleton?.data?.animations || [];
  const idleAnim = anims.some(a => a.name === 'idle') ? 'idle' : (anims.find(a => a.name !== 'attack' && a.name !== 'ruchang' && a.name !== 'tuichang')?.name || anims[0]?.name);
  if (anims.some(a => a.name === 'ruchang')) {
    spiritSpine.state.setAnimation(0, 'ruchang', false);
    if (idleAnim) spiritSpine.state.addAnimation(0, idleAnim, true, 0);
  } else if (idleAnim) {
    spiritSpine.state.setAnimation(0, idleAnim, true);
  }

  // ✅ 位置：玩家前方（右侧），多个精灵按行列排开不重叠
  const screenPos = getPlayerScreenPos();
  const baseX = screenPos ? screenPos.x : (user.pixi.playerInstance?.view?.x ?? 0);
  const baseY = screenPos ? screenPos.y : (user.pixi.playerInstance?.view?.y ?? 0);
  const idx = allies.filter(a => (a.isWaterSpirit || a.isThunderSpirit || a.isIceSpirit || a.isFireSpirit) && a.hp > 0).length - 1; // 含刚 push 的自己（水/雷/冰精灵统一排布不重叠）
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  spiritSpine.x = baseX - 10 * VW_CACHE + col * 10 * VW_CACHE;
  spiritSpine.y = baseY - 26 * VH_CACHE + row * 6 * VH_CACHE;

  const effectContainer = getFightContainer();
  if (effectContainer) {
    effectContainer.addChild(spiritSpine);
    effectContainer.sortChildren();
  } else {
    user.pixi.app.addChild(spiritSpine);
  }
  spirit.spineInstance = spiritSpine;

  // 🔢 右上角显示剩余回合数
  const turnText = new Text({
    text: `${DURATION}`,
    style: {
      fill: 0xffcc00,
      fontSize: Math.max(10, Math.min(26, Math.round(VH_CACHE * 1.6))),
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
      fontFamily: 'Arial Black',
      resolution: window.devicePixelRatio || 2,
    }
  });
  turnText.anchor.set(1, 0); // 右上角锚点
  // 📍 紧贴 spine 右上角（骨骼更新后按实际边界对齐）
  //    ⚡ 注意：leituanzi 骨骼首帧未更新时 getBounds 会返回错误边界导致数字错位，
  //      所以先强制更新到当前动画首帧再取边界，并多次对齐（骨骼/动画加载完成后会收敛到右上角）
  const alignTurnText = () => {
    try {
      spiritSpine.state?.update?.(0);                 // 应用当前动画首帧 pose
      spiritSpine.skeleton?.updateWorldTransform?.(); // 刷新骨骼世界矩阵
      const b = spiritSpine.getBounds();
      if (b && (b.width > 0 || b.height > 0)) {
        turnText.x = b.x + b.width + 0.8 * VW_CACHE; // 右上角外侧（更右）
        turnText.y = b.y - 1.4 * VH_CACHE; // 更往上
      }
    } catch (err) { /* ignore */ }
  };
  alignTurnText();
  setTimeout(alignTurnText, 60);   // spine 首帧骨骼更新后再对齐
  setTimeout(alignTurnText, 200);  // 动画加载完成后对齐
  setTimeout(alignTurnText, 500);  // 兜底对齐
  turnText.zIndex = 120;
  (effectContainer || user.pixi.app).addChild(turnText);
  spirit.turnText = turnText;

  spirit.onDeactivate = () => {
    // 🔢 移除回合数 Text
    if (spirit.turnText) {
      const tc = getFightContainer();
      if (tc && spirit.turnText.parent) tc.removeChild(spirit.turnText);
      spirit.turnText.destroy?.();
      spirit.turnText = null;
    }
    if (spirit.spineInstance) {
      returnEffect('leituanzi', spirit.spineInstance);
      spirit.spineInstance = null;
    }
  };

  // 🎵 召唤音效（EFFECT_CONFIG 雷精灵 未配置则静默）
  const summonSfx = getSummonSound('雷精灵', 'summon');
  if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);
  battleLog(`⚡ 召唤雷精灵：速度${spirit.speed}，行动条+${Math.round(ACTION_GAIN_RATIO * 100)}%，攻击力+${Math.round(ATK_BUFF_RATIO * 100)}%，持续${DURATION}回合`);
  return cfg.animDelay || 300;
}

// ==============================================
// ❄️ 冰精灵：召唤持续3回合的友方冰精灵（bingjingling spine：idle 待机 / attack 攻击 / ruchang 入场）
//   星级：速度 70/85/100%（speedRatio）
//   行动时：抽 1 张牌并使其灵力-1（单卡最多降 1 费）；强化时立即额外抽 1 张（不降费）
//   未退场再次召唤：刷新持续回合 + 体型+8% + 行动条+25% + 速度+8% + 额外抽牌+1（可叠加）
// ==============================================
export function useSkillIceSpirit(player, allies, card, battle, user) {
  const cfg = user.pixi.player.CARD_DATA.冰精灵;
  if (!cfg) return 300;
  const star = card?.star ?? 1;

  const SPEED_RATIO = starVal(cfg, 'speedRatio', star, 0.6);
  const DURATION = (cfg.summonDuration ?? 3) + (user.hasTalent?.('tong_xin') ? 1 : 0); // 🤝 同心：召唤物持续时间+1回合
  const SPINE_SCALE = cfg.spineScale ?? 0.5;

  // ✅ 已有存活冰精灵 → 刷新持续回合 + 强化（体型/行动条/速度/额外抽牌）
  const existing = allies.find(a => a.isIceSpirit && a.hp > 0);
  if (existing) {
    existing.spiritTurns = DURATION;
    if (existing.turnText) {
      existing.turnText.text = String(DURATION); // 🔢 刷新剩余回合数
      try {
        const b = existing.spineInstance?.getBounds?.();
        if (b && b.width > 0) {
          existing.turnText.x = b.x + b.width - 0.6 * VW_CACHE;
          existing.turnText.y = b.y + 0.1 * VH_CACHE;
        }
      } catch (err) { /* ignore */ }
    }
    existing.spiritBuffStacks = (existing.spiritBuffStacks || 0) + 1;
    // 🎈 体型 +8%：弹弹弹弹性变大动画（过冲→回落→稳定），保持水平翻转（x 负 y 正）
    if (existing.spineInstance) {
      const sp = existing.spineInstance;
      const curX = sp.scale.x || SPINE_SCALE;
      const curY = sp.scale.y || SPINE_SCALE;
      const newX = curX * 1.08;
      const newY = curY * 1.08;
      gsap.killTweensOf(sp.scale);
      gsap.timeline()
        .to(sp.scale, { x: newX * 1.18, y: newY * 1.18, duration: 0.16, ease: 'power2.out' })
        .to(sp.scale, { x: newX * 0.95, y: newY * 0.95, duration: 0.1, ease: 'power2.in' })
        .to(sp.scale, { x: newX * 1.06, y: newY * 1.06, duration: 0.08, ease: 'power2.out' })
        .to(sp.scale, { x: newX, y: newY, duration: 0.08, ease: 'power2.out' });
    }
    // 行动条 +25%（ACTION_MAX = 10000）
    existing.actionProgress = Math.min(10000, (existing.actionProgress || 0) + 2500);
    // 速度 +8%（再次召唤：按玩家当前速度刷新）
    existing.speed = Math.round(player.baseSpeed * SPEED_RATIO * (1 + 0.08 * (existing.spiritBuffStacks || 1)) * 10) / 10; // 强化速度累加：1次×1.08、2次×1.16…
    player._iceSpiritBoost = true; // ❄️ 冰精灵存在：冰伤光环
    // ❄️ 玩家冰伤提升 buff（ice_dmg_up 皮肤图标，持续到冰精灵全部离场；deep watch 自动刷新图标）
    const ib1 = (player.buffs = player.buffs || []).find(b => b.name === '冰灵祝福')
    if (ib1) ib1.remaining = 999
    else player.buffs.push({ name: '冰灵祝福', type: 'iceBoost', remaining: 999 })
    // 🃏 重复召唤奖励：立即额外抽 1 张牌（召唤瞬间触发，不影响行动抽牌）
    emitter.emit('iceSpiritSummonDraw')
    battleLog(`❄️ 冰精灵强化：刷新${DURATION}回合，体型+8%（弹跳）、行动条+25%、速度+8%，并立即额外抽 1 张牌（第${existing.spiritBuffStacks}次）`);
    const summonSfx = getSummonSound('冰精灵', 'summon');
    if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);
    return cfg.animDelay || 300;
  }

  // 🔒 数量上限保护（位置排布足够，但避免无限堆叠）
  const aliveSpirits = allies.filter(a => a.isIceSpirit && a.hp > 0).length;
  if (aliveSpirits >= 8) {
    battleLog('❄️ 冰精灵已达数量上限（8）');
    return 300;
  }

  // ========== 创建冰精灵 ==========
  const spirit = createUnit({
    name: '冰精灵',
    hp: 1,
    maxHp: 1,
    baseSpeed: Math.round(player.baseSpeed * SPEED_RATIO * 10) / 10,
    attack: 0,
    camp: 'player',
    isIceSpirit: true,
    owner: player,
    spiritTurns: DURATION,
    speedUpAction: false,
    _isDead: false,
    _inAction: false,
  });
  spirit.actionProgress = 0;
  spirit.speed = spirit.baseSpeed;
  allies.push(spirit);
  applyHeartToHeart(spirit, allies); // 💖 交心：召唤物全属性增加
  player._iceSpiritBoost = true; // ❄️ 冰精灵存在：冰伤光环
  // ❄️ 玩家冰伤提升 buff（ice_dmg_up 皮肤图标，持续到冰精灵全部离场；deep watch 自动刷新图标）
  const ib2 = (player.buffs = player.buffs || []).find(b => b.name === '冰灵祝福')
  if (ib2) ib2.remaining = 999
  else player.buffs.push({ name: '冰灵祝福', type: 'iceBoost', remaining: 999 })

  // ✅ 创建冰精灵 Spine（bingjingling：idle 待机 / attack 攻击 / ruchang 入场）
  const spiritSpine = getEffect('bingjingling');
  spiritSpine.scale.set(-SPINE_SCALE, SPINE_SCALE); // 水平翻转
  spiritSpine.state.timeScale = 0.6; // 🐢 播放速度 0.8（冰精灵）
  spiritSpine.alpha = 1;
  spiritSpine.zIndex = 50;
  spiritSpine.pivot.set(0.5, 0.5);
  // 🎬 召唤：先播 ruchang（一次性），播完自动切 idle 循环
  const anims = spiritSpine.skeleton?.data?.animations || [];
  const idleAnim = anims.some(a => a.name === 'idle') ? 'idle' : (anims.find(a => a.name !== 'attack' && a.name !== 'ruchang' && a.name !== 'tuichang')?.name || anims[0]?.name);
  if (anims.some(a => a.name === 'ruchang')) {
    spiritSpine.state.setAnimation(0, 'ruchang', false);
    if (idleAnim) spiritSpine.state.addAnimation(0, idleAnim, true, 0);
  } else if (idleAnim) {
    spiritSpine.state.setAnimation(0, idleAnim, true);
  }

  // ✅ 位置：玩家前方（右侧），水/雷/冰精灵统一排布不重叠
  const screenPos = getPlayerScreenPos();
  const baseX = screenPos ? screenPos.x : (user.pixi.playerInstance?.view?.x ?? 0);
  const baseY = screenPos ? screenPos.y : (user.pixi.playerInstance?.view?.y ?? 0);
  const idx = allies.filter(a => (a.isWaterSpirit || a.isThunderSpirit || a.isIceSpirit || a.isFireSpirit) && a.hp > 0).length - 1; // 含刚 push 的自己
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  spiritSpine.x = baseX - 10 * VW_CACHE + col * 10 * VW_CACHE; // 与水/雷精灵统一起始偏移，间隔一致
  spiritSpine.y = baseY - 26 * VH_CACHE + row * 6 * VH_CACHE;

  const effectContainer = getFightContainer();
  if (effectContainer) {
    effectContainer.addChild(spiritSpine);
    effectContainer.sortChildren();
  } else {
    user.pixi.app.addChild(spiritSpine);
  }
  spirit.spineInstance = spiritSpine;

  // 🔢 右上角显示剩余回合数（先强制骨骼更新再取边界，多次对齐）
  const turnText = new Text({
    text: `${DURATION}`,
    style: {
      fill: 0xffcc00,
      fontSize: Math.max(10, Math.min(26, Math.round(VH_CACHE * 1.6))),
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
      fontFamily: 'Arial Black',
      resolution: window.devicePixelRatio || 2,
    }
  });
  turnText.anchor.set(1, 0); // 右上角锚点
  const alignTurnText = () => {
    try {
      spiritSpine.state?.update?.(0);
      spiritSpine.skeleton?.updateWorldTransform?.();
      const b = spiritSpine.getBounds();
      if (b && (b.width > 0 || b.height > 0)) {
        turnText.x = b.x + b.width - 0.6 * VW_CACHE; // 右上角内侧（更左）
        turnText.y = b.y + 0.1 * VH_CACHE; // 更往下
      }
    } catch (err) { /* ignore */ }
  };
  alignTurnText();
  setTimeout(alignTurnText, 60);
  setTimeout(alignTurnText, 200);
  setTimeout(alignTurnText, 500);
  turnText.zIndex = 120;
  (effectContainer || user.pixi.app).addChild(turnText);
  spirit.turnText = turnText;

  spirit.onDeactivate = () => {
    // 🔢 移除回合数 Text
    if (spirit.turnText) {
      const tc = getFightContainer();
      if (tc && spirit.turnText.parent) tc.removeChild(spirit.turnText);
      spirit.turnText.destroy?.();
      spirit.turnText = null;
    }
    if (spirit.spineInstance) {
      returnEffect('bingjingling', spirit.spineInstance);
      spirit.spineInstance = null;
    }
  };

  const summonSfx = getSummonSound('冰精灵', 'summon');
  if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);
  battleLog(`❄️ 召唤冰精灵：速度${spirit.speed}，行动抽1张牌（灵力-1）+随机1张灵力-1，持续${DURATION}回合`);
  return cfg.animDelay || 300;
}

// ==============================================
// 🔥 火精灵：召唤持续3回合的友方火精灵（huojingling spine：idle 待机 / attack 攻击 / ruchang 入场）
//   星级：速度 60/65/70%（speedRatio）、攻击 80/85/90%（atkRatio）、行动火伤 90/100/110% 攻击力（actionDmgRatio）
//   存在时玩家的火属性伤害提升 25%（calculateFinalDamage 光环，_fireSpiritBoost 标记）
//   未退场再次召唤：刷新持续回合 + 体型+8% + 攻击力+20% + 速度+10%（可叠加）
// ==============================================
export function useSkillFireSpirit(player, allies, card, battle, user) {
  const cfg = user.pixi.player.CARD_DATA.火精灵;
  if (!cfg) return 300;
  const star = card?.star ?? 1;

  const SPEED_RATIO = starVal(cfg, 'speedRatio', star, 0.6);
  const ATK_RATIO = starVal(cfg, 'atkRatio', star, 0.8);
  const ACTION_DMG_RATIO = starVal(cfg, 'actionDmgRatio', star, 0.9);
  const DURATION = (cfg.summonDuration ?? 3) + (user.hasTalent?.('tong_xin') ? 1 : 0); // 🤝 同心：召唤物持续时间+1回合
  const SPINE_SCALE = cfg.spineScale ?? 0.5;

  // ✅ 已有存活火精灵 → 刷新持续回合 + 强化（体型/攻击/速度）
  const existing = allies.find(a => a.isFireSpirit && a.hp > 0);
  if (existing) {
    existing.spiritTurns = DURATION;
    if (existing.turnText) {
      existing.turnText.text = String(DURATION); // 🔢 刷新剩余回合数
      try {
        const sp = existing.spineInstance;
        if (sp) {
          existing.turnText.x = sp.x + 3.5 * VW_CACHE;
          existing.turnText.y = sp.y - 9.0 * VH_CACHE;
        }
      } catch (err) { /* ignore */ }
    }
    existing.spiritBuffStacks = (existing.spiritBuffStacks || 0) + 1;
    // 🎈 体型 +8%：弹弹弹弹性变大动画（过冲→回落→稳定），保持水平翻转（x 负 y 正）
    if (existing.spineInstance) {
      const sp = existing.spineInstance;
      const curX = sp.scale.x || SPINE_SCALE;
      const curY = sp.scale.y || SPINE_SCALE;
      const newX = curX * 1.08;
      const newY = curY * 1.08;
      gsap.killTweensOf(sp.scale);
      gsap.timeline()
        .to(sp.scale, { x: newX * 1.18, y: newY * 1.18, duration: 0.16, ease: 'power2.out' })
        .to(sp.scale, { x: newX * 0.95, y: newY * 0.95, duration: 0.1, ease: 'power2.in' })
        .to(sp.scale, { x: newX * 1.06, y: newY * 1.06, duration: 0.08, ease: 'power2.out' })
        .to(sp.scale, { x: newX, y: newY, duration: 0.08, ease: 'power2.out' });
    }
    // 攻击力 +20%、速度 +10%
    existing.atkRatio = (existing.atkRatio ?? ATK_RATIO) * 1.2;
    existing.attack = Math.round((player?.attack || 0) * existing.atkRatio * 100) / 100; // 🍡 攻击同步玩家攻击力×强化档位
    existing.speed = Math.round((existing.speed ?? player.baseSpeed * SPEED_RATIO) * 1.1 * 10) / 10;
    player._fireSpiritBoost = true; // 🔥 火精灵存在：火伤光环
    // 🔥 玩家火伤提升 buff（fire_dmg_up 皮肤图标，持续到火精灵全部离场；deep watch 自动刷新图标）
    const fb1 = (player.buffs = player.buffs || []).find(b => b.name === '火灵祝福')
    if (fb1) fb1.remaining = 999
    else player.buffs.push({ name: '火灵祝福', type: 'fireBoost', remaining: 999 })
    battleLog(`🔥 火精灵强化：刷新${DURATION}回合，体型+8%（弹跳）、攻击力+20%、速度+10%（第${existing.spiritBuffStacks}次）`);
    const summonSfx = getSummonSound('火精灵', 'summon');
    if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);
    return cfg.animDelay || 300;
  }

  // 🔒 数量上限保护（位置排布足够，但避免无限堆叠）
  const aliveSpirits = allies.filter(a => a.isFireSpirit && a.hp > 0).length;
  if (aliveSpirits >= 8) {
    battleLog('🔥 火精灵已达数量上限（8）');
    return 300;
  }

  // ========== 创建火精灵 ==========
  const spirit = createUnit({
    name: '火精灵',
    hp: 1,
    maxHp: 1,
    baseSpeed: Math.round(player.baseSpeed * SPEED_RATIO * 10) / 10,
    attack: Math.round(player.attack * ATK_RATIO * 100) / 100, // 🔥 拥有玩家 80/85/90% 攻击力
    camp: 'player',
    isFireSpirit: true,
    owner: player,
    spiritTurns: DURATION,
    atkRatio: ATK_RATIO,
    actionDmgRatio: ACTION_DMG_RATIO,
    speedUpAction: false,
    _isDead: false,
    _inAction: false,
  });
  spirit.actionProgress = 0;
  spirit.speed = spirit.baseSpeed;
  allies.push(spirit);
  applyHeartToHeart(spirit, allies); // 💖 交心：召唤物全属性增加
  player._fireSpiritBoost = true; // 🔥 火精灵存在：火伤光环
  // 🔥 玩家火伤提升 buff（fire_dmg_up 皮肤图标，持续到火精灵全部离场；deep watch 自动刷新图标）
  const fb2 = (player.buffs = player.buffs || []).find(b => b.name === '火灵祝福')
  if (fb2) fb2.remaining = 999
  else player.buffs.push({ name: '火灵祝福', type: 'fireBoost', remaining: 999 })

  // ✅ 创建火精灵 Spine（huojingling：idle 待机 / attack 攻击 / ruchang 入场）
  const spiritSpine = getEffect('huojingling');
  spiritSpine.scale.set(-SPINE_SCALE, SPINE_SCALE); // 水平翻转
  spiritSpine.state.timeScale = 0.5; // 🐢 播放速度 0.4（火精灵）
  spiritSpine.alpha = 1;
  spiritSpine.zIndex = 50;
  spiritSpine.pivot.set(0.5, 0.5);
  // 🎬 召唤：先播 ruchang（一次性），播完自动切 idle 循环
  const anims = spiritSpine.skeleton?.data?.animations || [];
  const idleAnim = anims.some(a => a.name === 'idle') ? 'idle' : (anims.find(a => a.name !== 'attack' && a.name !== 'ruchang' && a.name !== 'tuichang')?.name || anims[0]?.name);
  if (anims.some(a => a.name === 'ruchang')) {
    spiritSpine.state.setAnimation(0, 'ruchang', false);
    if (idleAnim) spiritSpine.state.addAnimation(0, idleAnim, true, 0);
  } else if (idleAnim) {
    spiritSpine.state.setAnimation(0, idleAnim, true);
  }

  // ✅ 位置：玩家前方（右侧），水/雷/冰/火精灵统一排布不重叠
  const screenPos = getPlayerScreenPos();
  const baseX = screenPos ? screenPos.x : (user.pixi.playerInstance?.view?.x ?? 0);
  const baseY = screenPos ? screenPos.y : (user.pixi.playerInstance?.view?.y ?? 0);
  const idx = allies.filter(a => (a.isWaterSpirit || a.isThunderSpirit || a.isIceSpirit || a.isFireSpirit) && a.hp > 0).length - 1; // 含刚 push 的自己
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  spiritSpine.x = baseX - 10 * VW_CACHE + col * 10 * VW_CACHE;
  spiritSpine.y = baseY - 26 * VH_CACHE + row * 6 * VH_CACHE;

  const effectContainer = getFightContainer();
  if (effectContainer) {
    effectContainer.addChild(spiritSpine);
    effectContainer.sortChildren();
  } else {
    user.pixi.app.addChild(spiritSpine);
  }
  spirit.spineInstance = spiritSpine;

  // 🔢 右上角显示剩余回合数（先强制骨骼更新再取边界，多次对齐）
  const turnText = new Text({
    text: `${DURATION}`,
    style: {
      fill: 0xffcc00,
      fontSize: Math.max(10, Math.min(26, Math.round(VH_CACHE * 1.6))),
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
      fontFamily: 'Arial Black',
      resolution: window.devicePixelRatio || 2,
    }
  });
  turnText.anchor.set(1, 1); // 右下角锚点 → 文本整体在 (x,y) 左上方，即精灵右上角
  // 📍 火精灵骨骼 getBounds 会包含远处不可见的火焰附件，导致倒计时被顶到很远；
  //    改为直接基于 spine 中心位置固定贴在精灵右上角，不依赖骨骼边界
  const alignTurnText = () => {
    // 🔥 火精灵：数字固定在精灵右上角（骨骼中心为基准，右移 3.5vw、上移 9vh）
    turnText.x = spiritSpine.x + 3.5 * VW_CACHE; // 精灵右边缘
    turnText.y = spiritSpine.y - 9.0 * VH_CACHE; // 可视顶部上方
  };
  alignTurnText();
  setTimeout(alignTurnText, 60);
  setTimeout(alignTurnText, 200);
  setTimeout(alignTurnText, 500);
  turnText.zIndex = 120;
  (effectContainer || user.pixi.app).addChild(turnText);
  spirit.turnText = turnText;

  spirit.onDeactivate = () => {
    // 🔢 移除回合数 Text
    if (spirit.turnText) {
      const tc = getFightContainer();
      if (tc && spirit.turnText.parent) tc.removeChild(spirit.turnText);
      spirit.turnText.destroy?.();
      spirit.turnText = null;
    }
    if (spirit.spineInstance) {
      returnEffect('huojingling', spirit.spineInstance);
      spirit.spineInstance = null;
    }
  };

  const summonSfx = getSummonSound('火精灵', 'summon');
  if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);
  battleLog(`🔥 召唤火精灵：速度${spirit.speed}，攻击${spirit.attack}，行动火伤${Math.round(ACTION_DMG_RATIO * 100)}%攻击力，持续${DURATION}回合`);
  return cfg.animDelay || 300;
}

// 影分身
//   星级：生命 25/29/33%，属性 50/55/60%
//         三星开局自动召唤（自动召唤逻辑在 battle.js 开战处理）
export function useSkillShadowClone(player, allies, enemies, battle, card) {
  const cfg = user.pixi.player.CARD_DATA.影分身;
  const star = card?.star ?? 1;

  let hpRatio = starVal(cfg, 'cloneHpRatio', star, 0.25);
  let atkRatio = starVal(cfg, 'cloneAtkRatio', star, 0.5);

  const hasClone = allies.some(a => a.name === "影分身" && a.hp > 0);
  if (hasClone) return;

  const clone = createUnit({
    name: "影分身",
    hp: Math.floor(player.maxHp * hpRatio),
    maxHp: Math.floor(player.maxHp * hpRatio),
    baseSpeed: Math.floor(player.baseSpeed * atkRatio),
    speed: Math.floor(player.baseSpeed * atkRatio),
    attack: Math.floor(player.attack * atkRatio),
    armor: player.armor,
    luck: Math.floor(player.luck * atkRatio),
    camp: "player",
    isShadowClone: true,
    owner: player,
    takeDmgRatio: 0.5,
    speedUpAction: false
  });

  clone.actionProgress = 0;
  allies.push(clone);
  applyHeartToHeart(clone, allies); // 💖 交心：召唤物全属性增加（含三星开局自动召唤）

  // ✅ 创建影分身Spine
  const cloneSpine = getEffect('fenshen');

  const cloneScale = user.pixi.playerInstance.scale * 1;
  cloneSpine.scale.set(cloneScale);

  // 全黑剪影
  cloneSpine.alpha = 1;
  cloneSpine.tint = 0x000000;

  // ✅ 用战斗容器坐标系的玩家屏幕位置（和敌人、子弹同坐标系）
  const screenPos = getPlayerScreenPos();
  const baseX = screenPos ? screenPos.x : user.pixi.playerInstance.view.x;
  const baseY = screenPos ? screenPos.y : user.pixi.playerInstance.view.y;

  // 位置：角色前方（右侧）
  cloneSpine.x = baseX + 6 * VW;
  cloneSpine.y = baseY;
  cloneSpine.zIndex = 50; // 在特效层中层
  // 🎬 影分身待机：优先 fight 循环动画（战斗中标准待机）；没有 fight 则 idle，再没有取第一个动画
  const cloneAnims = cloneSpine.skeleton?.data?.animations || [];
  const cloneFightAnim = cloneAnims.some(a => a.name === 'fight') ? 'fight'
    : (cloneAnims.some(a => a.name === 'idle') ? 'idle'
      : (cloneAnims.find(a => a.name !== 'attack')?.name || cloneAnims[0]?.name));
  if (cloneFightAnim) {
    cloneSpine.state.setAnimation(0, cloneFightAnim, true);
  } else {
    cloneSpine.state.setAnimation(0, 'idle', true); // 兜底（原逻辑）
  }

  // 添加到特效层
  const effectContainer = getFightContainer();
  if (effectContainer) {
    effectContainer.addChild(cloneSpine);
    effectContainer.sortChildren();
  } else {
    user.pixi.app.addChild(cloneSpine);
  }

  clone.spineInstance = cloneSpine;
  clone.onDeactivate = () => {
    returnEffect('fenshen', cloneSpine);
  };

  // 🎵 召唤音效（配置 EFFECT_CONFIG 影分身 的 summonSound）
  const summonSfx = getSummonSound('影分身', 'summon');
  if (summonSfx) user.playSoundEffect(summonSfx.sound, summonSfx.volume);

  battleLog("👥 影分身召唤成功！缩放比例：", cloneScale);
  return 300;
}

// 聚灵
//   星级：回蓝 2/2/3，攻击提升 15/20/25%
//         二星开局冷却-1，三星-2（开战逻辑处理）
export function useSkillSpiritGather(player, allies, card) {
  const cfg = user.pixi.player.CARD_DATA.聚灵;
  const star = card?.star ?? 1;

  let recover = starVal(cfg, 'manaRecover', star, 2);

  player.mp = Math.min(player.mp + recover, player.maxMp);
  user.pixi.playerInstance?.takeHeal(recover, 'mp');

  // 攻击力提升：15/20/25%
  const atkBoost = starVal(cfg, 'atkBoostPct', star, 0.15);
  const atkUp = Math.floor(player.baseAttack * atkBoost);

  player.buffs.push({
    name: "聚灵",
    type: "allStats",
    remaining: 1,
    atkUp,
    atkPct: atkBoost * 100,
    armorUp: 0,
    speedUp: 0,
    luckUp: 0
  });
  user.pixi.playerInstance?.showBuffText(t('cardGatherMana'));
  // 加到【最终属性】上
  applyBuffSideEffects(player, { type: 'allStats', atkUp, armorUp: 0, speedUp: 0, luckUp: 0 });

  return 500;
}

// 反弹（最终安全版：不可叠加 + 刷新时间）
//   星级：护甲 20/25/30%，反弹 45/50/55%折前伤害+120/140/160%护甲
//         二星受伤-5%，三星受伤-10%
export function useSkillReflect(player, card) {
  const cfg = user.pixi.player.CARD_DATA.反弹;
  const star = card?.star ?? 1;

  // 先检查：身上已有反弹 → 只刷新时间，不重复加护甲
  const oldReflect = player.buffs.find(b => b.type === "reflect");
  if (oldReflect) {
    // 刷新持续时间
    oldReflect.remaining = 2;
    return 600;
  }

  // 没有buff，才正常生成
  let duration = 2;
  const armorPercent = starVal(cfg, 'reflectArmorPct', star, 0.20);
  const reflectBase = starVal(cfg, 'reflectBase', star, 0.45);
  const reflectArmor = starVal(cfg, 'reflectArmor', star, 1.2);
  // 星级受伤减免
  const starEff = cfg.starEffects?.[Math.min(3, Math.max(1, star))];
  const dmgReduce = starEff?.dmgReduce ?? 0;

  // 只基于【基础护甲】加一次
  const addArmor = Math.floor(player.baseArmor * armorPercent);
  applyBuffSideEffects(player, { type: 'reflect', addArmor });

  player.buffs.push({
    name: "反弹",
    type: "reflect",
    skin: "Reflect",
    color: "#f59e0b",
    remaining: duration,
    addArmor,
    reflectBase,
    reflectArmor,
    dmgReduce,
  });

  return 600;
}

// 武器强化
//   星级：物理伤害提升 15/20/25%，最多强化3次
export function useWeaponBoost(player, card, playerHand) {
  const cfg = user.pixi.player.CARD_DATA.武器强化;
  const star = card?.star ?? 1;

  // 初始化玩家层数（第一次用）
  if (player.weaponBoostStack === undefined) {
    player.weaponBoostStack = 0;
  }

  // 每层物理伤害加成（按星级）
  let boostPercent = starVal(cfg, 'atkRatio', star, 0.15);
  if (player.physicalBoost === undefined) {
    player.physicalBoost = 0
  }

  // 最大强化次数固定为 3 次
  const maxStack = 3;
  user.pixi.playerInstance?.showBuffText(t('cardWeaponEnhance'));
  // 叠加一层
  player.weaponBoostStack += 1;
  player.physicalBoost += boostPercent;

  // 达到最大层数 → 禁用卡牌
  if (player.weaponBoostStack >= maxStack) {
    battleLog("⚠️ 武器强化已达最大层数！");
    card.disabledLevel++;
    return cfg.animDelay;
  }

  battleLog(
    `⚔️ 武器强化叠加 ${player.weaponBoostStack} 层！物理伤害 +${(player.physicalBoost * 100).toFixed(0)}%`
  );

  return cfg.animDelay;
}
//洞察
//   星级：弱点易伤 (15/20/25 + 6/8/10*层数)%
export function useInsight(player, enemies, card, target = null) {
  const cfg = user.pixi.player.CARD_DATA.洞察;
  const star = card?.star ?? 1;

  // 基础易伤 + 每层易伤（按星级）
  const baseAdd = starVal(cfg, 'weaknessBase', star, 0.15);
  const perStackAdd = starVal(cfg, 'weaknessPerStack', star, 0.06);

  // 🎯 指定敌人释放：优先用拖拽指定的目标，否则选第一个存活敌人
  const targetEnemies = (target?.hp > 0 ? [target] : enemies.filter(e => e.hp > 0).slice(0, 1));

  targetEnemies.forEach(en => {
    // 查找弱点 debuff
    let weakness = en.debuffs.find(d => d.name === '弱点');
    if (!weakness) {
      // 首次：添加永久 debuff
      weakness = {
        name: '弱点',
        stack: 0,
        isPermanent: true,
        baseAdd,
        perStackAdd,
      };
      en.debuffs.push(weakness);
      emitter.emit('enemyBuff', { enemyName: en.name, enemyUid: en.uid, buffName: t('buffWeakness') });
    } else {
      emitter.emit('enemyBuff', { enemyName: en.name, enemyUid: en.uid, buffName: t('buffWeaknessUp') });
    }

    // 层数 +1
    weakness.stack += 1;

    // 增伤：基础易伤 + 每层易伤
    const totalAdd = baseAdd + perStackAdd * weakness.stack;
    // 记录当前总易伤（不累加，直接按公式计算）
    weakness.totalAdd = totalAdd;
    // 更新敌人易伤（用旧层数计算差额）
    en.damageTaken += baseAdd + perStackAdd * weakness.stack - (weakness.prevTotalAdd || 0);
    weakness.prevTotalAdd = baseAdd + perStackAdd * weakness.stack;
  });
}
// 毒雾（永久领域技能）
//   星级：毒素易伤 30/40/50%，每回合 60/80/100% 毒素伤害
//         二星敌人攻击-10%，三星-15%
export function usePoisonMist(player, enemies, card) {
  const cfg = user.pixi.player.CARD_DATA.毒雾;
  const star = card?.star ?? 1;

  // 标记已开启
  player.poisonMistActive = true;

  // 星级：毒素易伤 + 每回合毒素伤害倍率
  const poisonTakenBoost = starVal(cfg, 'poisonTakenBoost', star, 0.30);
  const poisonDotRatio = starVal(cfg, 'poisonDotRatio', star, 0.60);
  // 星级：敌人攻击降低
  const starEff = cfg.starEffects?.[Math.min(3, Math.max(2, star))];
  const enemyAtkReduce = starEff?.enemyAtkReduce ?? 0;

  card.disabledLevel++;
  // 对所有敌人释放永久效果
  enemies.filter(e => e.hp > 0).forEach(en => {
    // 通知pixi层播放中毒闪绿效果
    emitter.emit('enemyPoisonFlash', { enemyName: en.name, enemyUid: en.uid });

    // 1. 永久破甲 20%
    const armorReduction = Math.floor((en.baseArmor || en.armor || 0) * 0.2);
    en.debuffs.push({
      name: "毒雾",
      type: "poison",
      isPermanent: true,
      baseDmg: 0,
      ratio: poisonDotRatio,
    });
    en.armor -= armorReduction;
    // 2. 永久毒素易伤
    en.poisonTaken = (en.poisonTaken || 0) + poisonTakenBoost;

    // 3. 星级效果：敌人攻击力降低（永久）
    if (enemyAtkReduce > 0 && !en._poisonMistAtkReduced) {
      const atkReduce = Math.floor((en.baseAttack || en.attack || 0) * enemyAtkReduce);
      en.debuffs.push({
        name: "毒雾压制",
        type: "atk_down",
        atkReduce,
        isPermanent: true
      });
      en.attack = Math.max(1, en.attack - atkReduce);
      en._poisonMistAtkReduced = true;
      emitter.emit('enemyBuff', { enemyName: en.name, enemyUid: en.uid, buffName: t('buffMistSuppress') });
    }
  });

  return 1000;
}

// 【统一毒素伤害结算】
export function tickMiasma(enemy, player, playerHand, name, du) {
  if (name === '瘴毒') {
    const totalBoost = enemy.poisonTaken || 0;

    // ============================
    // ✅ 毒素紊乱：每有1个poison类型debuff → 增伤10%
    // ============================
    const poisonCount = enemy.debuffs.filter(d => d.type === 'poison').length;
    const disorderBoost = poisonCount * 0.12; // 10% per poison
    // 最终增伤 = 毒易伤 + 毒素紊乱
    const finalBoost = totalBoost + disorderBoost;

    const rawDmg = Math.round(du.damage * (1 + finalBoost) * 100) / 100;

    // ✅ 统一用 calculateFinalDamage 结算（真实伤害，忽略100%护甲，不暴击；isDot=true 不触发受击被动）
    calculateFinalDamage(rawDmg, enemy, { ignoreArmor: 1, dmgType: 'poison', player: player, buff: null, applyElement: true, enemies: [], skillName: '瘴毒', dualResist: false, isDot: true });

    battleLog(`🧪 瘴毒伤害：${du.damage} → 最终：${rawDmg} (毒易伤+${(totalBoost * 100).toFixed(0)}% + 紊乱+${(disorderBoost * 100).toFixed(0)}%)`);

  } else if (name === '毒雾') { // 统一用毒雾领域更严谨
    const baseDmg = du.baseDmg;
    const ratio = du.ratio;
    const rawDmg = baseDmg + Math.round(player.attack * ratio * 100) / 100;
    const totalBoost = enemy.poisonTaken || 0;
    const finalDmg = Math.round(rawDmg * (1 + totalBoost) * 100) / 100;

    // ✅ 统一用 calculateFinalDamage 结算（真实伤害，忽略100%护甲，不暴击；isDot=true 不触发受击被动）
    calculateFinalDamage(finalDmg, enemy, { ignoreArmor: 1, dmgType: 'poison', player: player, buff: null, applyElement: true, enemies: [], skillName: '毒雾', dualResist: false, isDot: true });

    battleLog(`☠️ 毒雾领域伤害：${rawDmg} → 最终：${finalDmg}`);
  }
}

// ==============================================
// 冰箭：伤害 + 星级效果（霜冻由属性机制自动施加）
//   星级：150/180/210% 冰伤害
//         二星击碎目标12%当前护甲，三星击碎16%
// ==============================================
export function applyIceArrowDamage(player, target, baseDmg, card, buff) {
  if (!target || target.hp <= 0) return;

  const cfg = user.pixi.player.CARD_DATA.冰箭;
  const star = card?.star ?? 1;
  const starEff = cfg.starEffects?.[Math.min(3, Math.max(2, star))];
  const armorBreakPct = starEff?.armorBreakPct ?? 0;

  let dmg = baseDmg;

  // 计算最终伤害（冰属性自动施加霜冻）
  const { dmg: finalDmg, crit } = calculateFinalDamage(dmg, target, { ignoreArmor: buff?.ignoreArmor || 0, dmgType: 'ice', player: player, buff: buff, applyElement: true, enemies: [], skillName: '冰箭' });
  battleLog('【冰箭】命中', target.name, finalDmg, crit ? '🔥暴击' : '');

  // ===== 星级：击碎当前护甲（二星12%，三星16%）=====
  if (armorBreakPct > 0) {
    const armorBreak = Math.floor(target.armor * armorBreakPct * 100) / 100;
    target.armor = Math.max(0, target.armor - armorBreak);
    battleLog(`🧊 碎甲：击碎${armorBreak}点护甲（${armorBreakPct * 100}%）`);
  }
}



// ==============================================
// 水弹：伤害 + 星级效果（湿润由属性机制自动施加）
//   星级：90/110/130% 水伤害
//         二星迟滞移速-10%，三星-20%（不可叠加）
// ==============================================
export function applyWaterBubbleDamage(player, target, baseDmg, card, buff) {
  if (!target || target.hp <= 0) return;

  const cfg = user.pixi.player.CARD_DATA.水弹;
  const star = card?.star ?? 1;
  const starEff = cfg.starEffects?.[Math.min(3, Math.max(2, star))];
  const slowPct = starEff?.slowPct ?? 0;

  let dmg = baseDmg;

  // 计算最终伤害（水属性自动施加湿润）
  const { dmg: finalDmg, crit } = calculateFinalDamage(dmg, target, { ignoreArmor: buff?.ignoreArmor || 0, dmgType: 'water', player: player, buff: buff, applyElement: true, enemies: [], skillName: '水弹' });
  battleLog('【水弹】命中', target.name, finalDmg, crit ? '💧暴击' : '');

  // ===== 星级：迟滞（移速降低，不可叠加，刷新持续时间）=====
  if (slowPct > 0) {
    const speedDebuff = Math.floor((target.baseSpeed || target.speed) * slowPct);
    const isNewSlow = upsertBuff(target, { name: '迟滞', type: 'slow', remaining: 2, speedDebuff }, { isDebuff: true, refreshRemaining: 2 });
    if (isNewSlow) {
      target.speed = Math.max(1, target.speed - speedDebuff);
      emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffSlow') });
      battleLog(`💧 迟滞：移动速度 -${slowPct * 100}%`);
    }
  }
}

// ==============================================
// ==============================================
// 雷击：伤害 + 电流debuff + 进化效果
// ==============================================
export function applyLightningDamage(player, target, baseDmg, card, buff, enemies = []) {
  if (!target || target.hp <= 0) return;

  const cfg = user.pixi.player.CARD_DATA.雷击;
  const star = card?.star ?? 1;
  const starEff = cfg.starEffects?.[Math.min(3, Math.max(2, star))];
  const pushbackPct = starEff?.pushbackPct ?? 0;

  let dmg = baseDmg;

  // 计算主目标最终伤害（雷属性自动施加电流）
  const { dmg: finalDmg, crit } = calculateFinalDamage(
    dmg, target, { ignoreArmor: buff?.ignoreArmor || 0, dmgType: 'lightning', player, buff, applyElement: true, enemies, skillName: '雷击' }
  );
  battleLog('【雷击】命中', target.name, finalDmg, crit ? '⚡暴击' : '');

  // ===== 星级：行动条降低（一星-10%，二星-15%，三星-20%，可至负数）=====
  if (pushbackPct > 0) {
    target.actionProgress -= (10000 * pushbackPct / 100);
    battleLog(`⚡ 雷击：行动条 -${pushbackPct}%`);
  }
}

// ==============================================
// 灼烧 debuff：火属性持续伤害，不叠加，重复触发刷新回合
// ==============================================

/**
 * 施加灼烧 debuff
 * - 持续 2 回合
 * - 无法叠加，重复触发刷新回合数
 * - 敌人行动时受到 16% 攻击力的火属性伤害
 */
export function applyBurn(player, target) {
  if (!target || target.hp <= 0) return;

  const existBurn = target.debuffs.find(b => b.name === '灼烧');
  let isNewBurn = false;

  if (existBurn) {
    // 已存在则刷新回合数（不叠加）
    existBurn.remaining = 2;
    battleLog('🔥 灼烧刷新：剩余 2 回合');
  } else {
    const burnDmg = Math.round(player.attack * 0.16 * 100) / 100;
    target.debuffs.push({
      name: '灼烧',
      type: 'burn',
      remaining: 2,
      damage: burnDmg
    });
    isNewBurn = true;
    battleLog('🔥 施加灼烧效果');
  }

  // ===== 施加灼烧后立即检测元素反应 =====
  // 湿润 + 灼烧 = 蒸发
  const vaporized = checkWetBurnCombo(player, target);
  // 霜冻 + 灼烧 = 融化
  const melted = checkFrostBurnCombo(player, target);

  // 只有没触发任何反应时，才显示灼烧文字
  if (isNewBurn && !vaporized && !melted) {
    emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('buffBurn') });
  }
}

/**
 * 回合开始：结算灼烧伤害
 */
export function tickBurn(enemy, player, du) {
  const rawDmg = du.damage || 0;
  // 灼烧为火属性伤害，正常计算护甲（不无视护甲），DOT不重复挂灼烧；isDot=true 不触发受击被动
  calculateFinalDamage(rawDmg, enemy, { ignoreArmor: 0, dmgType: 'fire', player: player, buff: null, applyElement: false, enemies: [], skillName: '灼烧', dualResist: false, isDot: true });
  battleLog(`🔥 灼烧伤害：${rawDmg}`);
}
