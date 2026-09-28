// ==============================================
// 🆕 新增卡牌战斗逻辑
// 未来 / 毒发 / 号令 / 光佑 / 水愈 / 魔力暴动
// 水牢 / 风刃 / 龙卷风暴 / 风之庇佑 / 禁忌狂雷 / 焚焰
// ==============================================
import { battleLog } from './logger.js'
import { useCounterStore } from "@/store/counter";
import { chance, pickIndex } from './rng.js'
import { starVal } from './cardVal.js'
import { resolveTarget, pickNearestX, pickFarthestX } from './targetSelect.js'
import { calculateSkillDamage, calculateFinalDamage, applyDamageToPlayer } from './SkillDamage';
import { getEvolutionBuff } from './SkillEvolution';
import { getFightContainer, getPlayerScreenPos, getEnemySpinePos, applyHeal } from './battle';
import { getEffect, returnEffect, VH_CACHE, VW_CACHE, EFFECT_SCALE_BASE } from './animations/effectPool.js';
import { playProjectile } from './animations/index.js';
import { getEffectConfig } from './effectConfig.js';
import { upsertBuff, applyBuffSideEffects } from './buffCleanup.js';
import emitter from "@/bus";
import { t } from "@/i18n";
import gsap from 'gsap';

const user = useCounterStore();

// ==============================================
// 🛡️ 护盾：添加护盾（可叠加）
// ==============================================
export function addShield(player, shieldValue, label = '光佑') {
  if (!player || shieldValue <= 0) return;
  player.shield = Math.round((player.shield || 0) + shieldValue * 100) / 100;
  user.pixi.playerInstance?.showBuffText?.(t(label));
  battleLog(`🛡️ ${label}：获得 ${shieldValue} 点护盾（当前 ${player.shield}）`);
}

// ==============================================
// ✨ 光佑 - 获得护盾
//   （特效播放由 SkillLogic.useSkill 统一走 effectConfig 配置表）
// ==============================================
export function useSkillGuangyou(player, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.光佑;
  const star = card?.star ?? 1;
  const ratio = starVal(cfg, 'shieldRatio', star, 0.10);
  const shieldValue = Math.round(player.maxHp * ratio * 100) / 100;

  addShield(player, shieldValue, '光佑');
  return cfg.animDelay ?? 0;
}

// ==============================================
// 💧 水愈 - 立刻恢复 + 持续恢复
//   （特效播放由 SkillLogic.useSkill 统一走 effectConfig 配置表）
// ==============================================
export function useSkillShuiyu(player, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.水愈;
  const star = card?.star ?? 1;
  const healRatio = starVal(cfg, 'healRatio', star, 0.05);
  const dotHealRatio = starVal(cfg, 'dotHealRatio', star, 0.025);
  const delay = cfg.animDelay ?? 0;

  // ⏱️ 延迟 animDelay 毫秒后生效（回血 + 挂持续恢复 buff）
  setTimeout(() => {
    // 立刻恢复
    const healAmount = Math.round(player.maxHp * healRatio * 100) / 100;
    applyHeal(player, healAmount, 'heal');

    // 持续恢复 buff（3回合，不可叠加，可刷新）
    const isNewHeal = upsertBuff(player, { name: '水愈', type: 'heal_over_time', remaining: 3, healRatio: dotHealRatio }, {});
    user.pixi.playerInstance?.showBuffText?.(t('cardWaterHeal'));
    battleLog(`💧 水愈：立即恢复 ${healAmount}，3回合内每次行动恢复 ${dotHealRatio * 100}% 最大生命`);
  }, delay);

  return delay;
}

// ==============================================
// 🌀 风刃 - 对最近敌人造成3段风伤 + 流血
//   特效：三道风刃投射物（像子弹），从玩家依次飞向目标，每道命中结算一段伤害
//   数据来自 effectConfig（type: 'projectile'，effectName: 'Fengren'）
// ==============================================
export function useSkillFengren(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.风刃;
  const star = card?.star ?? 1;
  const hitCount = cfg.hitCount ?? 3;
  const buff = getEvolutionBuff(card);
  const fxCfg = getEffectConfig('风刃');

  // 🎯 选择最近的敌人（按 x 离玩家最近）
  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (!aliveEnemies.length) return 500;
  const px = player?.x ?? 0;
  const targetEnemy = pickNearestX(aliveEnemies, px);

  const container = getFightContainer() || worldContainer;
  const screenPos = getPlayerScreenPos();
  // 起点 = 玩家位置（支持 startOffsetX/startOffsetY 偏移）
  const start = {
    x: (screenPos ? screenPos.x : 0) + (fxCfg?.startOffsetX ?? 0) * VW_CACHE,
    y: (screenPos ? screenPos.y : 0) + (fxCfg?.startOffsetY ?? 0) * VH_CACHE,
  };
  const dur = fxCfg?.flyDuration ?? 0.3;

  // 每段伤害（命中时结算）
  const hitAt = (idx) => {
    if (!enemies.some(e => e.hp > 0)) return;
    const alive = enemies.filter(e => e.hp > 0);
    const ct = alive.find(e => e.uid === targetEnemy.uid) || alive[0];
    if (!ct) return;
    // 风伤：不触发元素反应
    calculateFinalDamage(baseDmg, ct, { ignoreArmor: buff.ignoreArmor, dmgType: 'wind', player: player, buff: buff, applyElement: false, enemies: [], skillName: '风刃' });
    // 风属性：每段-2%行动条
    ct.actionProgress -= (10000 * 2 / 100);
    // 50% 基础概率获得流血
    if (chance(user.luckProb(0.5))) {
      applyBleed(player, ct);
    }
  };

  // 🌪️ 三道风刃投射物（像子弹），每道 220ms 间隔，命中时结算对应段伤害
  for (let i = 0; i < hitCount; i++) {
    setTimeout(() => {
      const alive = enemies.filter(e => e.hp > 0);
      const ct = alive.find(e => e.uid === targetEnemy.uid) || alive[0];
      if (!ct) { hitAt(i); return; }
      // 🎵 每道风刃响一次音效（配置 sound/soundVolume 来自 EFFECT_CONFIG）
      if (fxCfg?.sound) user.playSoundEffect(fxCfg.sound, fxCfg.soundVolume ?? 1);
      // 🎯 终点用敌人 spine 实际渲染位置（屏幕坐标），fallback 数据坐标
      const spinePos = getEnemySpinePos(ct);
      const cex = spinePos ? spinePos.x : ct.x;
      const cey = spinePos ? spinePos.y : ct.y;
      // 🎯 horizontal: true → 水平飞行（终点 y = 起点 y，不斜着飞）
      const end = {
        x: cex + (fxCfg?.endOffsetX ?? 2) * VW_CACHE,
        y: fxCfg?.horizontal ? start.y : (cey * (fxCfg?.targetY ?? 0.9) + (fxCfg?.endOffsetY ?? 0) * VH_CACHE),
      };
      try {
        if (container) {
          playProjectile(container, start, end, {
            effectName: fxCfg?.effectName || 'Fengren',
            scale: (fxCfg?.scale ?? 0.2) * EFFECT_SCALE_BASE,
            duration: dur,
            animName: fxCfg?.animName ?? 'animation',
            rotationFromAngle: true,
            onHit: () => hitAt(i),
          });
          return;
        }
      } catch (e) { /* 无特效资源：兜底结算 */ }
      hitAt(i);
    }, i * 220);
  }
  return cfg.animDelay ?? 0;
}

// ==============================================
// 🌪️ 龙卷风暴 - 全体多段风伤 + 流血
// ==============================================
export function useSkillLongjuan(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA?.龙卷风暴 || {};
  const star = card?.star ?? 1;
  const hitCount = starVal(cfg, 'hitCount', star, 5);
  const buff = getEvolutionBuff(card);

  for (let i = 0; i < hitCount; i++) {
    setTimeout(() => {
      const alive = enemies.filter(e => e.hp > 0);
      if (!alive.length) return;
      alive.forEach(en => {
        calculateFinalDamage(baseDmg, en, { ignoreArmor: buff.ignoreArmor, dmgType: 'wind', player: player, buff: buff, applyElement: false, enemies: [], skillName: '龙卷风暴' });
        // 风属性：每段-2%行动条
        en.actionProgress -= (10000 * 2 / 100);
        // 50% 基础概率获得流血
        if (chance(user.luckProb(0.5))) {
          applyBleed(player, en);
        }
      });
    }, i * 180);
  }
  return cfg.animDelay ?? 0;
}

// ==============================================
// 🩸 流血系统：可叠加，敌人行动时受到 (12+4*层数) 攻击力伤害
// ==============================================
export function applyBleed(player, target) {
  if (!target || target.hp <= 0) return;
  const exist = target.debuffs.find(b => b.name === '流血');
  if (exist) {
    exist.stack = Math.min(5, (exist.stack || 1) + 1);
    exist.remaining = 2;
  } else {
    target.debuffs.push({
      name: '流血',
      type: 'bleed',
      remaining: 2,
      stack: 1,
      // 🎯 记录施加者攻击力：玩家被流血时（风息等敌人施加）用它结算伤害
      //    （玩家流血给敌人时 player 是玩家、target 是敌人 → 用 player.attack 结算；
      //     敌人流血给玩家时 player 是敌人（施加者）、target 是玩家 → 用 player.attack 结算）
      sourceAtk: player?.attack ?? 0,
    });
    emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('bleed') });
  }
}

// 回合开始时结算流血伤害
export function tickBleed(enemy, player, du) {
  if (!enemy || enemy.hp <= 0) return;
  const stack = du.stack || 1;
  // 🩸 伤害基数：优先用施加者攻击力（sourceAtk，敌人给玩家流血时用敌人攻击），
  //    没有则用传入 player 的攻击力（玩家给敌人流血时 player 就是玩家）
  const atk = du.sourceAtk || player?.attack || 0;
  // 流血伤害 = (12 + 4*层数)% 攻击力
  const rawDmg = Math.round(atk * (12 + 4 * stack) / 100 * 100) / 100;
  // 🎯 玩家被流血：直接扣玩家血 + 走玩家受伤飘字（takeDamage），不走敌人伤害结算
  //    （玩家身上有流血 debuff，target=player，需用玩家受伤飘字显示红色数字）
  if (enemy.camp === 'player' || enemy.name === '主角') {
    const playerInst = (typeof window !== 'undefined' && user?.pixi?.playerInstance) || null;
    const backupHp = enemy.hp;
    // 🩸 玩家被流血：统一走 applyDamageToPlayer（原行为：直接扣血不吃护盾；飘字保留在下方 takeDamage）
    applyDamageToPlayer(enemy, rawDmg, {
      dmgType: 'wind',
      sourceAtk: atk,
      useShield: false, // 原行为：流血直接扣血不吃护盾
      checkEnd: false,  // 原行为：不立即检查战斗结束
      showDamageText: false, // 飘字走下方 takeDamage（保留原实现）
    });
    try {
      playerInst?.takeDamage?.(rawDmg, { type: 'wind', isCritical: false }, atk);
      if (playerInst) playerInst.data.data.hp = backupHp;
    } catch (e) { /* ignore */ }
    battleLog(`🩸 玩家流血伤害：${rawDmg}（${stack}层）`);
    user.pixi.playerInstance?.showBuffText?.(t('bleed'));
    return;
  }
  // 敌人被流血：元素伤害（风），吃智慧元素伤害加成、不吃元素精通（非'元素反应'来源）、不吃力量物理加成、不暴击，真实伤害忽略护甲；isDot=true 不触发受击被动
  calculateFinalDamage(rawDmg, enemy, { ignoreArmor: 1, dmgType: 'wind', player: player, buff: null, applyElement: true, enemies: [], skillName: '流血', dualResist: false, isDot: true });
  battleLog(`🩸 流血伤害：${rawDmg}（${stack}层）`);
}

// ==============================================
// ⚡ 禁忌狂雷 - 随机闪电多段，每段伤害递增5%
// ==============================================
export function useSkillJinji(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.禁忌狂雷;
  const star = card?.star ?? 1;
  const hitCount = starVal(cfg, 'hitCount', star, 8);
  const buff = getEvolutionBuff(card);
  // 🎬 每段特效数据来自配置表（effectName/缩放/偏移）
  const effCfg = getEffectConfig('禁忌狂雷') || {};

  const container = getFightContainer() || worldContainer;
  for (let i = 0; i < hitCount; i++) {
    setTimeout(() => {
      const alive = enemies.filter(e => e.hp > 0);
      if (!alive.length) return;
      const randomTarget = alive[pickIndex(alive.length)];
      // 🎵 每落下一道雷电响一次音效（配置 sound/soundVolume 来自 EFFECT_CONFIG）
      if (effCfg.sound) user.playSoundEffect(effCfg.sound, effCfg.soundVolume ?? 1);
      // 播放闪电特效（数据来自配置表）
      try {
        if (container && randomTarget.x !== undefined) {
          // 🎯 用敌人 spine 实际渲染位置（屏幕坐标）作为基准，fallback 数据坐标
          const spinePos = getEnemySpinePos(randomTarget);
          const ex = spinePos ? spinePos.x : randomTarget.x;
          const ey = spinePos ? spinePos.y : randomTarget.y;
          const eff = getEffect(effCfg.effectName || 'dianji');
          if (eff) {
            eff.scale.set((effCfg.scale ?? 1) * EFFECT_SCALE_BASE);
            eff.x = ex + (effCfg.offsetX ?? 0) * VW_CACHE;
            eff.y = ey * (effCfg.targetY ?? 1);
            eff.zIndex = effCfg.zIndex ?? 100;
            eff.state.setAnimation(0, effCfg.animName ?? 'animation', false);
            container.addChild(eff);
            if (container.sortChildren) container.sortChildren();
            eff.state.addListener({
              complete: () => { try { returnEffect(effCfg.effectName || 'dianji', eff); } catch (e) { } }
            });
          }
        }
      } catch (e) { /* 无特效跳过 */ }

      // 伤害递增 5%
      const dmg = Math.round(baseDmg * (1 + 0.05 * i) * 100) / 100;
      calculateFinalDamage(dmg, randomTarget, { ignoreArmor: buff.ignoreArmor, dmgType: 'lightning', player: player, buff: buff, applyElement: true, enemies: [], skillName: '禁忌狂雷' });
    }, i * (effCfg.hitCountOffsetMs ?? 180));
  }
  return cfg.animDelay ?? 0;
}

// ==============================================
// 💥 焚焰 - 火伤，击杀刷新冷却，三星击杀返还1魔力
// ==============================================
export function useSkillFenyan(player, enemies, baseDmg, card, worldContainer, target = null) {
  const cfg = user.pixi.player.CARD_DATA.焚焰;
  const star = card?.star ?? 1;
  const buff = getEvolutionBuff(card);

  const targetEnemy = resolveTarget(target, enemies);
  if (!targetEnemy) return 500;

  // 播放火球特效（复用 huoqiu + 爆炸）
  const screenPos = getPlayerScreenPos();
  const container = getFightContainer() || worldContainer;
  const startX = screenPos ? screenPos.x : 0;
  const startY = screenPos ? screenPos.y : 0;

  const preHp = targetEnemy.hp;
  const { dmg } = calculateFinalDamage(baseDmg, targetEnemy, { ignoreArmor: buff.ignoreArmor, dmgType: 'fire', player: player, buff: buff, applyElement: true, enemies: [], skillName: '焚焰' });
  battleLog('【焚焰】', targetEnemy.name, dmg);

  // 击杀刷新冷却（标记，由 index.vue 处理冷却设置）
  if (targetEnemy.hp <= 0 && preHp > 0) {
    card._killResetCooldown = true;
    // 三星：返还1魔力
    if (star >= 3) {
      player.mp = Math.min((player.mp || 0) + 1, player.maxMp);
      user.pixi.playerInstance?.showBuffText?.(t('cardBlazeManaReturn'));
      battleLog('💥 焚焰三星：击杀返还 1 魔力');
    }
    battleLog('💥 焚焰：击杀目标，刷新冷却！');
  }
  return cfg.animDelay ?? 0;
}

// ==============================================
// 💧 水牢 - 全体水伤 + 行动条降低
//   ⏱️ 伤害按 cfg.animDelay 延迟结算（如 animDelay: 3000 = 3 秒后出伤），
//      与 battle.js 的回合流程等待同步（useCard 返回 animDelay）
// ==============================================
export function useSkillShuilao(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.水牢;
  const star = card?.star ?? 1;
  const pushbackPct = starVal(cfg, 'pushbackPct', star, 50);
  const buff = getEvolutionBuff(card);
  const delay = cfg.animDelay ?? 0;

  // ⏱️ 延迟 animDelay 毫秒后结算伤害 + 行动条降低
  setTimeout(() => {
    enemies.filter(e => e.hp > 0).forEach(en => {
      calculateFinalDamage(baseDmg, en, { ignoreArmor: buff.ignoreArmor, dmgType: 'water', player: player, buff: buff, applyElement: true, enemies: [], skillName: '水牢' });
      en.actionProgress -= (10000 * pushbackPct / 100);
    });
    battleLog(`💧 水牢：全体行动条 -${pushbackPct}%`);
  }, delay);

  return delay;
}

// ==============================================
// ☣️ 毒发 - 造成毒伤 + 立即触发中毒，三星不减少中毒回合
//   （特效播放由 SkillLogic.useSkill 统一走 effectConfig 配置表）
// ==============================================
export function useSkillDufa(player, enemies, baseDmg, card, worldContainer, target = null) {
  const cfg = user.pixi.player.CARD_DATA.毒发;
  const star = card?.star ?? 1;
  const dotRatio = starVal(cfg, 'dotRatio', star, 0.70);
  const keepPoisonTurns = cfg.starEffects?.[3]?.keepPoisonTurns ?? false;
  const buff = getEvolutionBuff(card);

  const targetEnemy = resolveTarget(target, enemies);
  if (!targetEnemy) return null;

  // 🎯 不立即结算伤害：返回回调，由定点特效（Dufa 的 animation1 爆炸动画）播放完后触发，
  //    避免「爆炸动画还没播，敌人就扣血」的错位
  return () => {
    if (targetEnemy.hp <= 0) return;

    // 毒属性伤害
    calculateFinalDamage(baseDmg, targetEnemy, { ignoreArmor: buff.ignoreArmor, dmgType: 'poison', player: player, buff: buff, applyElement: true, enemies: [], skillName: '毒发' });

    // 立即触发所有中毒效果
    const poisonDebuffs = targetEnemy.debuffs.filter(d => d.type === 'poison' || d.name === '瘴毒' || d.name === '毒雾');
    poisonDebuffs.forEach(du => {
      // 💥 取该中毒效果当前一跳的基础伤害（按比例触发）：
      //    瘴毒 → du.damage；毒雾 → baseDmg + 攻击×ratio
      //    ⚠️ 毒雾 debuff 没有 damage 字段，直接读 du.damage 会算出 NaN 伤害（bug）
      const dotDmg = Number.isFinite(du.damage)
        ? du.damage
        : ((du.baseDmg ?? 0) + (player.attack ?? 0) * (du.ratio ?? 0));
      const rawDmg = Math.round(dotDmg * dotRatio * 100) / 100;
      // 🛡️ 兜底：算不出数值就不触发该段，绝不让 NaN 伤害进结算
      if (!Number.isFinite(rawDmg) || rawDmg <= 0) return;
      calculateFinalDamage(rawDmg, targetEnemy, { ignoreArmor: 1, dmgType: 'poison', player: player, buff: null, applyElement: true, enemies: [], skillName: '毒发' });
      // 降低1回合中毒buff（三星不减少；毒雾是永久 debuff，没有 remaining 字段，天然跳过）
      if (!keepPoisonTurns && du.remaining !== undefined) {
        du.remaining = Math.max(0, du.remaining - 1);
      }
    });

    battleLog(`☣️ 毒发：触发 ${poisonDebuffs.length} 个中毒效果（${dotRatio * 100}%伤害）`);
  };
}

// ==============================================
// 📢 号令 - 友方行动条提升 + 攻击力提升
// ==============================================
export function useSkillHaoling(player, allies, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.号令;
  const star = card?.star ?? 1;
  const actionBoost = starVal(cfg, 'allyActionBoost', star, 0.40);
  const atkBoost = starVal(cfg, 'allyAtkBoost', star, 0.15);

  allies.filter(a => a.hp > 0 && a.name !== '主角' && a.name !== player.name).forEach(ally => {
    // 行动条提升（可超上限吗？行动条降低可至负数，提升保持上限保护）
    ally.actionProgress = Math.min(ally.actionProgress + 10000 * actionBoost, 10000);
    // 攻击力提升（叠加，直到战斗结束）
    if (ally._haolingAtkBoost === undefined) ally._haolingAtkBoost = 0;
    const atkUp = Math.floor(ally.baseAttack * atkBoost);
    if (!ally._haolingAtkApplied) {
      ally._haolingAtkApplied = 0;
    }
    ally.attack += atkUp;
    ally._haolingAtkApplied = (ally._haolingAtkApplied || 0) + atkUp;
    ally._haolingAtkBoost = (ally._haolingAtkBoost || 0) + atkBoost;
    // 显示buff文字
    emitter.emit('allyBuff', { allyName: ally.name, buffName: t('cardCommand') });
  });

  battleLog(`📢 号令：友方行动条 +${actionBoost * 100}%，攻击力 +${atkBoost * 100}%`);
  return cfg.animDelay ?? 0;
}

// ==============================================
// 🕐 未来 - 回合结束后额外获得一个回合
// ==============================================
export function useSkillWeilai(player, enemies, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.未来;
  const star = card?.star ?? 1;

  // 标记：本回合结束后额外获得一回合
  player._extraTurnPending = true;
  // 星级效果：二星使用后敌人行动条-15%，三星-30%
  const starEff = cfg.starEffects?.[Math.min(3, Math.max(2, star))];
  if (starEff?.enemyPushbackPct) {
    const pct = starEff.enemyPushbackPct;
    if (enemies && enemies.length) {
      enemies.filter(e => e.hp > 0).forEach(en => {
        en.actionProgress -= (10000 * pct / 100);
      });
    }
  }

  user.pixi.playerInstance?.showBuffText?.(t('buffFuture'));
  battleLog('🕐 未来：回合结束后额外获得一个回合');
  return cfg.animDelay ?? 0;
}

// ==============================================
// ⚡ 魔力暴动 - 刷新所有卡牌冷却 + 获得魔力（可突破上限）
// ==============================================
export function useSkillMoliBaodong(player, card, playerHand, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.魔力暴动;
  const star = card?.star ?? 1;
  const manaGain = starVal(cfg, 'manaGain', star, 4);

  // 刷新所有卡牌冷却
  if (playerHand && playerHand.length) {
    playerHand.forEach(c => {
      c.cooldown = 0;
    });
  }
  // 获得魔力（可突破上限）
  player.mp = (player.mp || 0) + manaGain;
  user.pixi.playerInstance?.takeHeal?.(manaGain, 'mp');
  user.pixi.playerInstance?.showBuffText?.(t('cardManaSurge'));
  battleLog(`⚡ 魔力暴动：刷新全部冷却，获得 ${manaGain} 点魔力（当前 ${player.mp}）`);
  return cfg.animDelay ?? 0;
}

// ==============================================
// 🌬️ 风之庇佑 - 提升速度 + 射击变风属性
// ==============================================
export function useSkillFengZhiBiyou(player, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.风之庇佑;
  const star = card?.star ?? 1;
  const speedBoostPct = starVal(cfg, 'speedBoostPct', star, 0.25);
  const shootBoostPct = starVal(cfg, 'shootBoostPct', star, 0.04);

  // 速度提升3回合（重复触发刷新持续时间）
  const speedUp = Math.floor(player.baseSpeed * speedBoostPct);
  const windBuff = { name: '风之庇佑', type: 'speed_buff', remaining: 3, speedUp };
  const isNewWind = upsertBuff(player, windBuff, {});
  if (isNewWind) {
    applyBuffSideEffects(player, windBuff);
  }

  // 射击变风属性：记录射击风属性状态（持续到战斗结束或 buff 结束）
  player._shootIsWind = true;
  player._shootWindBoostPct = shootBoostPct;

  user.pixi.playerInstance?.showBuffText?.(t('cardWindBlessing'));
  battleLog(`🌬️ 风之庇佑：速度 +${speedBoostPct * 100}%，射击变为风属性（+${shootBoostPct * 100}%攻击力/发）`);
  return cfg.animDelay ?? 0;
}

// ==============================================
// 🌀 回旋风刃 - 对所有敌人来回攻击2次，每命中1名敌人伤害降低15%，风刃回旋后衰减重置
//   特效：走 effectConfig 配置表（type: 'roundTrip'，Fengren1）
//         —— 从玩家出发 → 飞到【最远的敌人身后】→ 再返回玩家
//   伤害与特效同步：由 playCardEffect 的 onHit（去程到达最远敌人）/ onBack（返程回到玩家）回调驱动，
//                  不会出现"特效先到、伤害慢半拍"的错位。
// ==============================================
export function useSkillHuixuanFengren(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.回旋风刃;
  const star = card?.star ?? 1;
  const falloffPct = cfg.falloffPct ?? 0.15;
  const buff = getEvolutionBuff(card);

  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (!aliveEnemies.length) return null;

  // 敌人按 x 从左到右排列
  const order = [...aliveEnemies].sort((a, b) => a.x - b.x);

  // 结算命中伤害：falloff 为该段落的衰减系数
  const hitEnemy = (en, falloff) => {
    if (en.hp <= 0) return;
    const dmg = Math.round(baseDmg * falloff * 100) / 100;
    calculateFinalDamage(dmg, en, { ignoreArmor: buff.ignoreArmor, dmgType: 'wind', player: player, buff: buff, applyElement: false, enemies: [], skillName: '回旋风刃' });
    en.actionProgress -= (10000 * 2 / 100);
  };

  // 命中全体（reverse=true 反向）：去程按顺序衰减、返程反向衰减重置
  const hitAll = (reverse) => {
    const list = reverse ? [...order].reverse() : order;
    list.forEach((en, idx) => hitEnemy(en, Math.pow(1 - falloffPct, idx)));
  };

  // 🎬 特效（roundTrip）的命中时机由 playCardEffect 的 onHit / onBack 驱动，返回给 SkillLogic
  return { onHit: () => hitAll(false), onBack: () => hitAll(true) };
}

// ==============================================
// 🎯 狙击 - 对最远敌人造成物理伤害，对方生命>90% 时伤害额外+25%
// ==============================================
export function useSkillJuji(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.狙击;
  const star = card?.star ?? 1;
  const highHpBoostPct = cfg.highHpBoostPct ?? 0.25;
  const highHpThreshold = cfg.highHpThreshold ?? 0.90;
  const buff = getEvolutionBuff(card);

  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (!aliveEnemies.length) return cfg.animDelay ?? 0;
  // 最远的敌人：按 x 离玩家最远（x 越大越靠右 = 越远）
  const px = player?.x ?? 0;
  const targetEnemy = pickFarthestX(aliveEnemies, px);

  // 播放狙击特效（数据来自配置表：animName juji / scale 2 / flyDuration，不要写死 'idle'）
  const effCfg = getEffectConfig('狙击') || {};
  const screenPos = getPlayerScreenPos();
  const container = getFightContainer() || worldContainer;
  const startX = screenPos ? screenPos.x : 0;
  const startY = screenPos ? screenPos.y : 0;

  // 结算伤害（独立于特效：即使特效加载失败也必定造成伤害）
  const dealDamage = () => {
    if (targetEnemy.hp <= 0) return;
    // 高血量增伤判定
    const hpRate = targetEnemy.hp / targetEnemy.maxHp;
    const boost = hpRate > highHpThreshold ? (1 + highHpBoostPct) : 1;
    const dmg = Math.round(baseDmg * boost * 100) / 100;
    calculateFinalDamage(dmg, targetEnemy, { ignoreArmor: buff.ignoreArmor, dmgType: 'physical', player: player, buff: buff, applyElement: true, enemies: [], skillName: '狙击' });
    battleLog(`🎯 狙击：命中 ${targetEnemy.name}，${boost > 1 ? '高血增伤+25% ' : ''}伤害 ${dmg}`);
  };

  try {
    if (container && targetEnemy.x !== undefined) {
      // 🎵 发射音效（配置 sound/soundVolume 来自 EFFECT_CONFIG）
      if (effCfg.sound) user.playSoundEffect(effCfg.sound, effCfg.soundVolume ?? 1);
      const eff = getEffect(effCfg.effectName || 'bullet');
      if (eff) {
        eff.scale.set((effCfg.scale ?? 0.6) * EFFECT_SCALE_BASE);
        eff.x = startX + 3 * VW_CACHE;
        eff.y = startY;
        eff.zIndex = 100;
        eff.state.setAnimation(0, effCfg.animName ?? 'idle', true);
        container.addChild(eff);
        if (container.sortChildren) container.sortChildren();
        // 🎯 水平飞行：终点 y = 玩家自身高度（不斜着飞）；
        //    终点 x = 敌人 spine 实际渲染位置（fallback 数据坐标），保证子弹真正飞到最远敌人身上
        const spinePos = getEnemySpinePos(targetEnemy);
        const endX = (spinePos ? spinePos.x : targetEnemy.x) + (effCfg.endOffsetX ?? 2) * VW_CACHE;
        // 飞行到目标
        const tween = gsap.to(eff, {
          x: endX, y: startY,
          duration: effCfg.flyDuration ?? 0.3, ease: 'none',
          onComplete: () => {
            try { returnEffect(effCfg.effectName || 'bullet', eff); } catch (e) { }
            dealDamage();
          }
        });
        eff._gsapTween = tween;
      } else {
        // 无特效资源：直接结算伤害
        dealDamage();
      }
    } else {
      // 无容器/无目标位置：直接结算伤害
      dealDamage();
    }
  } catch (e) {
    // 特效异常：兜底结算伤害
    dealDamage();
  }

  return cfg.animDelay ?? 0;
}

// ==============================================
// 💥 碎甲弹 - 对最近敌人造成物理伤害，击碎敌人25%护甲持续2回合（重复刷新）
// ==============================================
export function useSkillSuijiadan(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.碎甲弹;
  const star = card?.star ?? 1;
  const armorShredPct = cfg.armorShredPct ?? 0.25;
  const armorShredDuration = cfg.armorShredDuration ?? 2;
  const buff = getEvolutionBuff(card);

  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (!aliveEnemies.length) return cfg.animDelay ?? 0;
  // 最近的敌人：按 x 离玩家最近
  const px = player?.x ?? 0;
  const targetEnemy = pickNearestX(aliveEnemies, px);

  // 🎬 播放碎甲弹投射物特效（数据来自配置表：animName suijia / scale / flyDuration）
  const effCfg = getEffectConfig('碎甲弹') || {};
  try {
    if (targetEnemy.x !== undefined) {
      // 🎵 发射音效（配置 sound/soundVolume 来自 EFFECT_CONFIG）
      if (effCfg.sound) user.playSoundEffect(effCfg.sound, effCfg.soundVolume ?? 1);
      const screenPos = getPlayerScreenPos();
      const startX = screenPos ? screenPos.x : 0;
      const startY = screenPos ? screenPos.y : 0;
      const eff = getEffect(effCfg.effectName || 'bullet');
      if (eff) {
        eff.scale.set((effCfg.scale ?? 0.6) * EFFECT_SCALE_BASE);
        eff.x = startX + 3 * VW_CACHE;
        eff.y = startY;
        eff.zIndex = 100;
        eff.state.setAnimation(0, effCfg.animName ?? 'idle', true);
        const c2 = getFightContainer() || worldContainer;
        c2.addChild(eff);
        if (c2.sortChildren) c2.sortChildren();
        // 🎯 水平飞行：终点 y = 玩家高度；终点 x = 敌人 spine 实际渲染位置
        const spinePos = getEnemySpinePos(targetEnemy);
        const endX = (spinePos ? spinePos.x : targetEnemy.x) + (effCfg.endOffsetX ?? 2) * VW_CACHE;
        const tween = gsap.to(eff, {
          x: endX, y: startY,
          duration: effCfg.flyDuration ?? 0.3, ease: 'none',
          onComplete: () => { try { returnEffect(effCfg.effectName || 'bullet', eff); } catch (e) { } }
        });
        eff._gsapTween = tween;
      }
    }
  } catch (e) { /* 无特效资源跳过 */ }

  // 物理伤害
  calculateFinalDamage(baseDmg, targetEnemy, { ignoreArmor: buff.ignoreArmor, dmgType: 'physical', player: player, buff: buff, applyElement: true, enemies: [], skillName: '碎甲弹' });

  // 击碎护甲 debuff（25% 护甲，持续2回合，重复触发刷新持续时间；新建才显示文字）
  if (targetEnemy.hp > 0) {
    const isNewShred = upsertBuff(targetEnemy, { name: '碎甲', type: 'armorShred', remaining: armorShredDuration, armorShredPct }, { isDebuff: true, refreshRemaining: armorShredDuration });
    if (isNewShred) {
      emitter.emit('enemyBuff', { enemyName: targetEnemy.name, enemyUid: targetEnemy.uid, buffName: t('buffArmorShred') });
    }
    battleLog(`💥 碎甲弹：击碎 ${targetEnemy.name} ${armorShredPct * 100}% 护甲，持续 ${armorShredDuration} 回合`);
  }
  return cfg.animDelay ?? 0;
}

// ==============================================
// ☠️ 毒刺 - 对指定敌人造成毒伤，目标身上每有一种毒素则提升40%伤害
//   （特效播放由 SkillLogic.useSkill 统一走 effectConfig 配置表）
// ==============================================
export function useSkillDuci(player, enemies, baseDmg, card, worldContainer, target = null) {
  const cfg = user.pixi.player.CARD_DATA.毒刺;
  const star = card?.star ?? 1;
  const poisonBoostPct = cfg.poisonBoostPct ?? 0.40;
  const buff = getEvolutionBuff(card);

  const targetEnemy = resolveTarget(target, enemies);
  if (!targetEnemy) return null;

  // 统计目标身上的毒素种类数（中毒类 debuff：type=poison 或 名字含毒）
  const poisonDebuffs = targetEnemy.debuffs.filter(d =>
    d.type === 'poison' || d.name === '瘴毒' || d.name === '毒雾' || d.name?.includes('毒')
  );
  const poisonCount = poisonDebuffs.length;
  const boost = 1 + poisonBoostPct * poisonCount;
  const dmg = Math.round(baseDmg * boost * 100) / 100;

  // 🎯 不立即结算伤害：返回回调，由投射物命中动画（hitAnimName）播放完后触发，
  //    避免「特效还没命中/爆炸动画没播，敌人就扣血」的错位
  return () => {
    if (targetEnemy.hp <= 0) return;
    calculateFinalDamage(dmg, targetEnemy, { ignoreArmor: buff.ignoreArmor, dmgType: 'poison', player: player, buff: buff, applyElement: true, enemies: [], skillName: '毒刺' });
    battleLog(`☠️ 毒刺：命中 ${targetEnemy.name}，${poisonCount} 种毒素，伤害提升 ${poisonBoostPct * poisonCount * 100}%`);
  };
}

// ==============================================
// 🔥 流火 - 随机攻击敌人4次，攻击带灼烧的敌人伤害提升20%
//   🎯 每次从玩家自身位置发射投射物，随机飞向一个存活敌人；
//      命中（到达敌人）后立即回收特效（不配 hitAnimName → playProjectile 命中即回收）
//      特效数据全部来自 effectConfig 的「流火」项（flyDuration/scale/偏移等，改配置即可）
// ==============================================
export function useSkillLiuhuo(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.流火;
  const star = card?.star ?? 1;
  const hitCount = cfg.hitCount ?? 4;
  const burnBoostPct = cfg.burnBoostPct ?? 0.20;
  const buff = getEvolutionBuff(card);
  // 🎬 每段特效数据来自配置表
  const effCfg = getEffectConfig('流火') || {};

  const container = getFightContainer() || worldContainer;
  // 🎯 每次发射起点 = 玩家自身位置（屏幕坐标），支持配置 startOffsetX/startOffsetY 微调
  const screenPos = getPlayerScreenPos();
  const start = {
    x: (screenPos ? screenPos.x : 0) + (effCfg.startOffsetX ?? 0) * VW_CACHE,
    y: (screenPos ? screenPos.y : 0) + (effCfg.startOffsetY ?? 0) * VH_CACHE,
  };

  for (let i = 0; i < hitCount; i++) {
    setTimeout(() => {
      const alive = enemies.filter(e => e.hp > 0);
      if (!alive.length) return;
      const randomTarget = alive[pickIndex(alive.length)];

      // 🎵 每次攻击响一次音效（配置 sound/soundVolume 来自 EFFECT_CONFIG；4 次攻击 = 4 响）
      if (effCfg.sound) user.playSoundEffect(effCfg.sound, effCfg.soundVolume ?? 1);

      // 🎯 发射投射物飞向随机敌人；命中后立即回收特效
      try {
        if (container && randomTarget.x !== undefined) {
          // 终点 = 敌人 spine 实际渲染位置（屏幕坐标），fallback 数据坐标
          const spinePos = getEnemySpinePos(randomTarget);
          const ex = spinePos ? spinePos.x : randomTarget.x;
          const ey = spinePos ? spinePos.y : randomTarget.y;
          const end = {
            x: ex + (effCfg.endOffsetX ?? 0) * VW_CACHE,
            y: ey * (effCfg.targetY ?? 0.9) + (effCfg.endOffsetY ?? 0) * VH_CACHE,
          };
          playProjectile(container, start, end, {
            effectName: effCfg.effectName || 'liuhuo',
            scale: (effCfg.scale ?? 0.8) * EFFECT_SCALE_BASE,
            duration: effCfg.flyDuration ?? 0.3,
            animName: effCfg.animName ?? 'animation',
            rotationFromAngle: effCfg.rotationFromAngle ?? true,
            // 🎯 不配 hitAnimName → playProjectile 命中（到达终点）后立即回收特效
          });
        }
      } catch (e) { /* 无特效资源跳过 */ }

      // 带灼烧的敌人伤害提升 20%
      const hasBurn = randomTarget.debuffs.some(d => d.name === '灼烧' || d.type === 'burn');
      const boost = hasBurn ? (1 + burnBoostPct) : 1;
      const dmg = Math.round(baseDmg * boost * 100) / 100;
      calculateFinalDamage(dmg, randomTarget, { ignoreArmor: buff.ignoreArmor, dmgType: 'fire', player: player, buff: buff, applyElement: true, enemies: [], skillName: '流火' });
      battleLog(`🔥 流火 第${i + 1}次：命中 ${randomTarget.name}${hasBurn ? '（灼烧+20%）' : ''}，伤害 ${dmg}`);
    }, i * (effCfg.hitCountOffsetMs ?? 180));
  }
  return cfg.animDelay ?? 0;
}

// ==============================================
// ❄️ 冰寒 - 指定敌人：速度降低30/40/50%持续2回合，若敌人被冻结则额外造成冰属性伤害
// ==============================================
export function useSkillBinghan(player, enemies, baseDmg, card, worldContainer, target = null) {
  const cfg = user.pixi.player.CARD_DATA.冰寒;
  const star = card?.star ?? 1;
  const slowPct = starVal(cfg, 'slowPct', star, 0.30);
  const slowDuration = cfg.slowDuration ?? 2;
  const buff = getEvolutionBuff(card);

  // 🎯 指定敌人释放（needTarget 卡）：优先用拖拽指定的目标，否则选第一个存活敌人兜底
  const targetEnemy = resolveTarget(target, enemies);
  if (!targetEnemy) return cfg.animDelay ?? 0;

  // 速度降低 debuff（持续2回合，重复触发刷新；新建才扣速 + 显示文字）
  const speedDebuff = Math.floor((targetEnemy.baseSpeed || targetEnemy.speed || 100) * slowPct);
  const icyBuff = { name: '冰寒', type: 'slow', remaining: slowDuration, speedDebuff };
  const isNewIcy = upsertBuff(targetEnemy, icyBuff, { isDebuff: true, refreshRemaining: slowDuration });
  if (isNewIcy) {
    applyBuffSideEffects(targetEnemy, icyBuff);
    emitter.emit('enemyBuff', { enemyName: targetEnemy.name, enemyUid: targetEnemy.uid, buffName: t('buffIcyChill') });
  }

  // 若敌人被冻结则额外造成冰属性伤害
  const isFrozen = targetEnemy.debuffs.some(d => d.name === '冻结' || d.type === 'freeze');
  if (isFrozen) {
    const dmg = Math.round(baseDmg * 100) / 100; // baseDmg 已是攻击力倍率后的伤害
    calculateFinalDamage(dmg, targetEnemy, { ignoreArmor: buff.ignoreArmor, dmgType: 'ice', player: player, buff: buff, applyElement: true, enemies: [], skillName: '冰寒' });
    battleLog(`❄️ 冰寒：${targetEnemy.name} 被冻结，额外造成 ${dmg} 冰属性伤害`);
  }

  battleLog(`❄️ 冰寒：${targetEnemy.name} 速度 -${Math.round(slowPct * 100)}%，持续 ${slowDuration} 回合`);
  return cfg.animDelay ?? 0;
}

// ==============================================
// ⚡ 连锁闪电 - 对最近敌人造成电伤，之后电链额外随机弹射1次（不回弹主目标）
// ==============================================
export function useSkillLiansuoShandian(player, enemies, baseDmg, card, worldContainer) {
  const cfg = user.pixi.player.CARD_DATA.连锁闪电;
  const star = card?.star ?? 1;
  const chainCount = cfg.chainCount ?? 1;
  const buff = getEvolutionBuff(card);
  // 🎬 每段特效数据来自配置表
  const effCfg = getEffectConfig('连锁闪电') || {};

  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (!aliveEnemies.length) return cfg.animDelay ?? 0;
  // 最近的敌人作为主目标
  const px = player?.x ?? 0;
  const mainTarget = aliveEnemies.reduce((a, b) =>
    Math.abs(a.x - px) <= Math.abs(b.x - px) ? a : b
  );

  const container = getFightContainer() || worldContainer;
  // 播放电击特效（数据来自配置表）
  const playThunder = (enemy) => {
    // 🎵 每次电击响一次音效（主目标 + 每次电链弹射都触发；配置 sound/soundVolume 来自 EFFECT_CONFIG）
    if (effCfg.sound) user.playSoundEffect(effCfg.sound, effCfg.soundVolume ?? 1);
    try {
      if (container && enemy.x !== undefined) {
        // 🎯 用敌人 spine 实际渲染位置（屏幕坐标）作为基准，fallback 数据坐标
        const spinePos = getEnemySpinePos(enemy);
        const ex = spinePos ? spinePos.x : enemy.x;
        const ey = spinePos ? spinePos.y : enemy.y;
        const eff = getEffect(effCfg.effectName || 'dianji');
        if (eff) {
          eff.scale.set((effCfg.scale ?? 1) * EFFECT_SCALE_BASE);
          eff.x = ex + (effCfg.offsetX ?? 0) * VW_CACHE;
          eff.y = ey * (effCfg.targetY ?? 1);
          eff.zIndex = effCfg.zIndex ?? 100;
          eff.state.setAnimation(0, effCfg.animName ?? 'animation', false);
          container.addChild(eff);
          if (container.sortChildren) container.sortChildren();
          eff.state.addListener({
            complete: () => { try { returnEffect(effCfg.effectName || 'dianji', eff); } catch (e) { } }
          });
        }
      }
    } catch (e) { /* 无特效跳过 */ }
  };

  // 主目标伤害
  playThunder(mainTarget);
  calculateFinalDamage(baseDmg, mainTarget, { ignoreArmor: buff.ignoreArmor, dmgType: 'lightning', player: player, buff: buff, applyElement: true, enemies: [], skillName: '连锁闪电' });
  battleLog(`⚡ 连锁闪电：主目标 ${mainTarget.name} 伤害 ${baseDmg}`);

  // 电链弹射（不回弹至本次主目标，已死亡的目标除外）
  let prevTargetUid = mainTarget.uid;
  for (let i = 0; i < chainCount; i++) {
    setTimeout(() => {
      const alive = enemies.filter(e => e.hp > 0 && e.uid !== prevTargetUid);
      if (!alive.length) return;
      const chainTarget = alive[pickIndex(alive.length)];
      prevTargetUid = chainTarget.uid;
      playThunder(chainTarget);
      calculateFinalDamage(baseDmg, chainTarget, { ignoreArmor: buff.ignoreArmor, dmgType: 'lightning', player: player, buff: buff, applyElement: true, enemies: [], skillName: '连锁闪电' });
      battleLog(`⚡ 连锁闪电 弹射：命中 ${chainTarget.name} 伤害 ${baseDmg}`);
    }, (i + 1) * 200);
  }
  return cfg.animDelay ?? 0;
}
