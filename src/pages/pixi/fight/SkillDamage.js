import { getEvolutionBuff } from './SkillEvolution';
import { createUnit } from './Unit.js'
import { BattleSystem } from './battle.js'
import { useCounterStore } from "@/store/counter";
import { createSummon, getEffect, returnEffect } from "./SkillLogic"
const user = useCounterStore();
// 统一计算技能基础伤害 原始伤害吃加成
export function calculateSkillDamage(skillName, player, card) {
  const cfg = user.pixi.player.CARD_DATA[skillName];
  const atk = Number(player.attack) || 0;
  let dmg = cfg.fixedDmg + Math.floor(atk * cfg.atkRatio);

  if (card?.name === '激光' && card.activeEvos.includes('超频释放')) {
    dmg = Math.floor(dmg * 1.4);
  }

  return dmg;
}

// ==============================================
// 全局统一工具函数（所有伤害共用，无重复代码）
// ==============================================

// 1. 计算最终护甲（所有减甲效果叠加）
export function getFinalArmor(target) {
  // 现在护甲已经直接在面板上加减完毕，直接返回最终护甲即可
  return target.armor || 0;
}

// 2. 统一计算最终伤害 + 暴击（已整合）
export function calculateFinalDamage(rawDmg, target, ignoreArmorPercent = 0, dmgType, player, buff, npcList = user.pixi.npcInstance) {
  // ========== 原有伤害计算逻辑 完全不变 ==========
  const physicalBoost = player?.physicalBoost || 0;
  const armorPenBoost = player?.armorPenBoost || 0;
  const taken = target.damageTaken || 0;
  let finalDmg = rawDmg;

  if (dmgType === "physical") {
    finalDmg *= (1 + physicalBoost + taken);
    ignoreArmorPercent += armorPenBoost;
  } else {
    finalDmg *= (1 + taken);
  }

  let armor = getFinalArmor(target);
  armor *= (1 - ignoreArmorPercent);
  armor = Math.max(0, armor);
  finalDmg *= (1 - armor / (armor + 100));

  let isCrit = false;
  if (buff) {
    const baseCrit = buff.critRate ?? 0;
    const critMul = buff.critMul ?? 1.5;
    const luck = player.luck ?? 0;
    const luckRate = 1 + luck / (120 + luck);
    const finalCritRate = baseCrit * luckRate;
    isCrit = Math.random() < finalCritRate;
    if (isCrit) finalDmg = Math.floor(finalDmg * critMul);
  }

  finalDmg = Math.max(1, Math.floor(finalDmg));

  // ✅ 新增：内部自动调用takeDamage，外部不用再写
  const targetNpc = npcList.find(item => item.data.data.name === target.name);
  targetNpc?.takeDamage(finalDmg, {
    type: dmgType,
    isCritical: isCrit
  }, player.baseAttack);

  // ❌ 必须删掉这行！避免和takeDamage重复扣血
  target.hp = Math.max(0, target.hp - finalDmg);
  BattleSystem.checkBattleEnd()
  return { dmg: finalDmg, crit: isCrit };
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
      buff.ignoreArmor,
      card.dmgType,
      player,
      buff // 传入buff
    );

    console.log('【射击】', finalDmg, crit ? '🔥暴击' : '');
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
    buff.ignoreArmor,
    card.dmgType,
    player,
    buff
  );

  console.log('【额外攻击】', finalDmg, crit ? '🔥暴击' : '');
}
// ==============================================
// 激光
// ==============================================
export function useSkillLaser(player, enemies, baseDmg, card) {
  const buff = getEvolutionBuff(card);
  let hasRefund = false;

  enemies.filter(e => e.hp > 0).forEach(enemy => {
    const { dmg: finalDmg, crit } = calculateFinalDamage(
      baseDmg,
      enemy,
      buff.ignoreArmor,
      card.dmgType,
      player,
      buff
    );

    const preHp = enemy.hp;
    console.log('【激光】', finalDmg, crit ? '🔥暴击' : '');

    if (!hasRefund && card.activeEvos.includes('击杀返还') && preHp > 0 && enemy.hp <= 0) {
      player.mp = Math.min(player.mp + 2, player.maxMp);
      hasRefund = true;
      console.log('✅ 击杀返还 +2');
    }
  });
}

// ==============================================
// 瘴气（完美版：直接减面板护甲，记录值，基于基础护甲）
// ==============================================
export function useSkillMiasma(player, enemies, card) {
  const cfg = user.pixi.player.CARD_DATA.瘴气;
  const hasWeak = card.activeEvos.includes('虚弱');

  if (card.activeEvos.includes('熟能生巧')) {
    card.miasmaCount = (card.miasmaCount || 0) + 1;
    if (card.miasmaCount === 3 && !card.costCut) {
      card.cost = Math.max(0, card.cost - 1);
      card.costCut = true;
    }
  }

  enemies.filter(e => e.hp > 0).forEach(en => {
    // 初始化敌人全局毒易伤（第一次上毒时确保有值）
    if (en.poisonTaken === undefined) en.poisonTaken = 0;

    const baseDot = cfg.fixedDmg + Math.floor(player.attack * cfg.atkRatio);
    const exist = en.debuffs.find(b => b.name === '瘴毒');

    if (exist) {
      exist.remaining = 3;
      exist.stack += 1;
    } else {
      const reduceArmor = hasWeak ? Math.floor(en.baseArmor * 0.15) : 0;

      en.debuffs.push({
        name: '瘴毒',
        type: 'poison',
        damage: baseDot,
        dmgType: cfg.dmgType,
        remaining: 3,
        stack: 0,
        reduceArmor: reduceArmor,
        poisonTaken: hasWeak ? 0.12 : 0, // 毒易伤
      });

      // 减护甲 + 加全局毒易伤
      if (reduceArmor > 0) {
        en.armor -= reduceArmor;

      }
      if (hasWeak) {
        en.poisonTaken += 0.12;
      }
    }

    const curr = en.debuffs.find(b => b.name === '瘴毒');
    let finalDmg = baseDot * (1 + curr.stack * 0.5);
    curr.damage = Math.floor(finalDmg);
  });
}

// ==============================================
// 敌人死亡 → 瘴气CD-1
// ==============================================
export function onEnemyDeathForMiasma(playerHand) {
  const card = playerHand.find(c => c.name === "瘴气");
  if (card && card.activeEvos.includes("死亡返还")) {
    card.cooldown = Math.max(0, card.cooldown - 1);
  }
}


// ==============================================
// 🚁 召唤无人机
// ==============================================
export function useDrone(player, allies, card, battle, user) {
  const cfg = user.pixi.player.CARD_DATA.无人机;
  const evos = card.activeEvos;

  // 基础属性
  // let baseSpeed = 60;
  let baseSpeed = 200;
  let maxAttacks = 3;
  let dmgBoost = 1;

  // ========== 进化 ==========
  // 超强续航：攻击次数 +2
  if (evos.includes("超强续航")) maxAttacks += 2;


  // 系统升级：速度 +40%、伤害 +20%
  if (evos.includes("系统升级")) {
    baseSpeed *= 1.4;
    dmgBoost = 1.2;
  }

  // ========== 创建无人机 ==========
  const drone = createUnit({
    name: '无人机',
    hp: 1,
    maxHp: 1,
    baseSpeed: baseSpeed,
    camp: 'player',
    isDrone: true,
    owner: player,
    remainingAttacks: maxAttacks,
    dmgBoost: dmgBoost,
    _isDead: false, //新增死亡标记
    _inAction: false,//新增行动锁
    summonId: null
  })
  drone.actionProgress = 0
  drone.speed = drone.baseSpeed
  // 加入友军
  allies.push(drone);
  // 机群效应（拉条 50%）
  if (evos.includes('机群效应')) {
    allies.forEach(a => {
      if (a.isDrone && a !== drone) {
        battle.advance(a, 50); // <-- 你可以直接用你自己的拉条！
      }
    });
  }
  const summonData = createSummon('drone', player, user);
  drone.summonId = summonData.id; // 战斗单元和Spine一一绑定
  console.log("✅ 召唤无人机，剩余攻击：", maxAttacks);
  return cfg.animDelay;
}

// 影分身
export function useSkillShadowClone(player, allies, enemies, battle, card) {
  const evos = card.activeEvos;

  let hpRatio = 0.25;
  let atkRatio = 0.5;
  if (evos.includes("生命提升")) hpRatio = 0.4;
  if (evos.includes("强力分裂")) atkRatio = 0.7;

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
    speedUpAction: evos.includes("协同作战")
  });

  clone.actionProgress = 0;
  allies.push(clone);

  // ✅ 创建影分身Spine
  const cloneSpine = getEffect('fenshen');

  const cloneScale = user.pixi.playerInstance.scale * 1;
  cloneSpine.scale.set(cloneScale);

  // 全黑剪影
  cloneSpine.alpha = 1;
  cloneSpine.tint = 0x000000;
  console.log('player=', user.pixi.playerInstance.view.x);

  // ✅ 位置也用主角的位置为基准
  cloneSpine.x = user.pixi.playerInstance.view.x + 6 * VW;
  cloneSpine.y = user.pixi.playerInstance.view.y;
  cloneSpine.zIndex = user.pixi.playerInstance.view.zIndex - 1;
  cloneSpine.state.setAnimation(0, 'idle', true);

  user.pixi.app.addChild(cloneSpine);

  clone.spineInstance = cloneSpine;
  clone.onDeactivate = () => {
    returnEffect('fenshen', cloneSpine);
  };

  console.log("👥 影分身召唤成功！缩放比例：", cloneScale);
  return 300;
}

// 聚灵
export function useSkillSpiritGather(player, allies, card) {
  const evos = card?.activeEvos ?? [];

  let recover = 2;
  if (evos.includes("效果强化")) recover += 1;

  player.mp = Math.min(player.mp + recover, player.maxMp);
  user.pixi.playerInstance?.takeHeal(recover, 'mp');
  if (evos.includes("汲灵秘术")) {
    // ✅ 全部基于【基础属性】计算，不会无限叠加
    const atkUp = Math.floor(player.baseAttack * 0.1);
    const armorUp = Math.floor(player.baseArmor * 0.1);
    const speedUp = Math.floor(player.baseSpeed * 0.1);
    const luckUp = Math.floor(player.baseLuck * 0.1);

    player.buffs.push({
      name: "汲灵秘术",
      type: "allStats",
      remaining: 1,
      atkUp,
      armorUp,
      speedUp,
      luckUp
    });
    user.pixi.playerInstance?.showBuffText('汲灵秘术');
    // 加到【最终属性】上
    player.attack += atkUp;
    player.armor += armorUp;
    player.speed += speedUp;
    player.luck += luckUp;
  }

  if (evos.includes("灵力分享")) {
    allies.forEach(a => {
      if (a.hp > 0) {
        a.actionProgress = Math.min(a.actionProgress + 2500, 10000);
      }
    });
  }

  return 500;
}

// 反弹（最终安全版：不可叠加 + 刷新时间）
export function useSkillReflect(player, card) {
  const evos = card?.activeEvos ?? [];

  // 先检查：身上已有反弹 → 只刷新时间，不重复加护甲
  const oldReflect = player.buffs.find(b => b.type === "reflect");
  if (oldReflect) {
    // 刷新持续时间
    let duration = 2;
    if (evos.includes("状态延长")) duration += 1;
    oldReflect.remaining = duration;
    return 600;
  }

  // 没有buff，才正常生成
  let duration = 2;
  if (evos.includes("状态延长")) duration += 1;

  let armorPercent = 30;
  let reflectBase = 0.5;
  let reflectArmor = 1.4;

  if (evos.includes("效果强化")) {
    reflectBase = 0.7;
    reflectArmor = 1.8;
  }
  if (evos.includes("全副武装")) {
    armorPercent += 20;
  }

  // 只基于【基础护甲】加一次
  const addArmor = Math.floor(player.baseArmor * armorPercent / 100);
  player.armor += addArmor;

  player.buffs.push({
    name: "反弹",
    type: "reflect",
    skin: "Reflect",
    color: "#f59e0b",
    remaining: duration,
    addArmor,
    reflectBase,
    reflectArmor,
  });

  return 600;
}

// 武器强化
export function useWeaponBoost(player, card, playerHand) {
  const cfg = user.pixi.player.CARD_DATA.武器强化;

  // 初始化玩家层数（第一次用）
  if (player.weaponBoostStack === undefined) {
    player.weaponBoostStack = 0;
  }

  // ============== 进化：首发增幅 ==============
  let boostPercent = 0.2; // 每层 +20%
  const firstBoost = card.activeEvos.includes("首发增幅");
  if (firstBoost && player.weaponBoostStack === 0) {
    boostPercent = 0.4; // 第一次 +40%（100%增强）
  }
  if (player.physicalBoost === undefined) {
    player.physicalBoost = 0
  }
  if (player.armorPenBoost === undefined) {
    player.armorPenBoost = 0
  }
  // ============== 进化：穿甲 ==============
  const hasArmorPen = card.activeEvos.includes("穿甲");

  // ============== 进化：负荷提升 ==============
  const hasLoadBoost = card.activeEvos.includes("负荷提升");

  // ✅【修复】根据是否有负荷提升，设置正确的最大层数
  const maxStack = hasLoadBoost ? 5 : 3;
  console.log('maxStack=', maxStack);

  // 叠加一层
  player.weaponBoostStack += 1;
  player.physicalBoost += boostPercent;
  // 穿甲：每层 +5% 物理穿透
  if (hasArmorPen) {
    player.armorPenBoost += 0.05;
  }

  // ✅【修复】叠满 3 层 → 冷却减 1（无论是否有负荷提升都生效）
  if (hasLoadBoost && player.weaponBoostStack == 3) {
    card.maxCooldown--
  }

  // ✅【修复】达到最大层数 → 禁用卡牌
  if (player.weaponBoostStack >= maxStack) {
    console.log("⚠️ 武器强化已达最大层数！");
    card.disabledLevel++;
    return cfg.animDelay;
  }

  // ============== 进化：重置 ==============
  const hasReset = card.activeEvos.includes("重置");
  if (hasReset) {
    // 找到射击卡牌
    const shootCard = playerHand.find(c => c.name === "射击");

    if (shootCard) {
      shootCard.usedCount--; // 免费再用一次
      if (shootCard.cost > 0) {
        shootCard.cost = 0
      }
    }
  }

  console.log(
    `⚔️ 武器强化叠加 ${player.weaponBoostStack} 层！物理伤害 +${(player.physicalBoost * 100).toFixed(0)}%`
  );

  return cfg.animDelay;
}
//洞察
export function useInsight(player, enemies, card) {
  const cfg = user.pixi.player.CARD_DATA.洞察;
  const hasEffectUp = card.activeEvos.includes('效果增强');
  const hasUnstable = card.activeEvos.includes('不安');
  const hasSeeThrough = card.activeEvos.includes('看透');

  enemies.filter(e => e.hp > 0).forEach(en => {
    en.damageTaken = en.damageTaken || 0;
    const targetNpc = user.pixi.npcInstance.find(item => item.data.data.name === en.name);
    // 查找弱点 debuff
    let weakness = en.debuffs.find(d => d.name === '弱点');
    if (!weakness) {
      // 首次：添加永久 debuff
      weakness = {
        name: '弱点',
        stack: 0,
        isPermanent: true
      };
      en.debuffs.push(weakness);
      targetNpc.showBuffText('弱点');
    } else {
      targetNpc.showBuffText('弱点+1');
    }

    // 层数 +1
    weakness.stack += 1;

    // 增伤
    const add = hasEffectUp ? 0.09 : 0.06;
    en.damageTaken += add;
    if (weakness.stack === 1) {
      en.damageTaken += hasEffectUp ? 0.15 : 0.10;
    }

    // 不安：行动条-40%
    if (hasUnstable) {
      en.actionProgress = Math.max(0, en.actionProgress - 4000);
    }

    // 看透：永久减甲
    if (hasSeeThrough) {
      const exist = en.debuffs.find(b => b.name === '看透');
      if (!exist) {
        const armorReduction = Math.floor(en.baseArmor * 0.2);
        en.debuffs.push({
          name: '看透',
          type: 'armor_down',
          armorReduction,
          isPermanent: true
        });
        en.armor -= armorReduction;
        targetNpc.showBuffText('看透');
      }
    }
  });
}
// 毒雾（永久领域技能）
export function usePoisonMist(player, enemies, card) {
  // 标记已开启
  player.poisonMistActive = true;

  const hasEvoStrong = card.activeEvos.includes("效果增强");
  const hasEvoSlow = card.activeEvos.includes("窒息");
  const hasEvoSpread = card.activeEvos.includes("扩散");
  card.disabledLevel++;
  // 对所有敌人释放永久效果
  enemies.filter(e => e.hp > 0).forEach(en => {
    // 1. 永久破甲 20%
    const armorReduction = Math.floor(en.baseArmor * 0.2);
    en.debuffs.push({
      name: "毒雾",
      type: "poison",
      isPermanent: true,
      // 伤害配置存在这！！！
      baseDmg: hasEvoStrong ? 55 : 40,
      ratio: hasEvoStrong ? 0.55 : 0.4,
      hasEvoSpread: hasEvoSpread
    });
    en.armor -= armorReduction;
    // 2. 永久毒素易伤 25%
    en.poisonTaken = (en.poisonTaken || 0) + 0.3;
    // 3. 进化 - 窒息：减速 20%（永久）
    if (hasEvoSlow) {
      const speedDebuff = Math.floor(en.baseSpeed * 0.18);
      en.debuffs.push({
        name: "窒息",
        type: "slow",
        speedDebuff,
        isPermanent: true
      });
      en.speed -= speedDebuff;
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

    const realDmg = Math.floor(du.damage * (1 + finalBoost));

    enemy.hp = Math.max(0, enemy.hp - realDmg);
    console.log(`🧪 瘴毒伤害：${du.damage} → 最终：${realDmg} (毒易伤+${(totalBoost * 100).toFixed(0)}% + 紊乱+${(disorderBoost * 100).toFixed(0)}%)`);

  } else if (name === '毒雾') { // 统一用毒雾领域更严谨
    const baseDmg = du.baseDmg;
    const ratio = du.ratio;
    const rawDmg = baseDmg + Math.floor(player.attack * ratio);
    const totalBoost = enemy.poisonTaken || 0;
    const realDmg = Math.floor(rawDmg * (1 + totalBoost));

    enemy.hp = Math.max(0, enemy.hp - realDmg);
    console.log(`☠️ 毒雾领域伤害：${rawDmg} → 最终：${realDmg}`);
  } else if (name === '扩散') {
    // ============================
    // ✅ 扩散毒伤（统一走这里）
    // ============================
    const base = 20;
    const ratio = 0.15;
    const rawDmg = base + Math.floor(player.attack * ratio);

    // 吃毒易伤
    const totalBoost = enemy.poisonTaken || 0;
    const realDmg = Math.floor(rawDmg * (1 + totalBoost));

    enemy.hp = Math.max(0, enemy.hp - realDmg);
    console.log(`☣️ 扩散毒伤：${rawDmg} → 最终：${realDmg}`);
  }

  // 死亡结算
  if (enemy.hp <= 0) {
    BattleSystem.checkBattleEnd(playerHand);
  }
}
