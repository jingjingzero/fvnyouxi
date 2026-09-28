import { battleLog } from './logger.js'
import { calculateFinalDamage } from './SkillDamage.js';
import { upsertBuff } from './buffCleanup.js';
import { chance } from './rng.js'
import emitter from "@/bus";
import { t } from "@/i18n";
import { useCounterStore, LEVEL_UP_CFG } from "@/store/counter";
const user = useCounterStore();
// 🧪 元素反应固定伤害参数（dladmin 升级编辑可配置）：基础值 + 每级成长 ×（等级-1）
const ER = LEVEL_UP_CFG?.elementReaction || {};
// 📈 反应固定伤害：不吃攻击力倍率，随玩家等级线性成长；mult 为裂变等额外倍率（伤害在此一次性取整）
function erDmg(player, base, perLv, mult = 1) {
  const lv = player?.Level ?? user.pixi?.player?.Level ?? 1;
  return Math.floor((base + (perLv ?? 0) * Math.max(0, lv - 1)) * mult);
}

// 💥 元素裂变溯源：参与反应的两个元素若任一来自裂变（fromFission 标记），该反应总伤害 -50%
//    必须在移除 debuff 之前调用（伤害结算先于元素移除）
function fissionMult(target, nameA, nameB) {
  const hasFission = target.debuffs.some(d => (d.name === nameA || d.name === nameB) && d.fromFission);
  return hasFission ? 0.5 : 1;
}
// ==============================================
// 通用：霜冻 + 湿润 组合反应检测（冻结）
// 双buff同时存在则立刻结算：额外伤害 + 概率冻结 + 移除双buff
// ==============================================
export function checkFrostWetCombo(player, target) {
  if (!target || target.hp <= 0) return false;

  const hasFrost = target.debuffs.some(d => d.name === '霜冻');
  const hasWet = target.debuffs.some(d => d.name === '湿润');
  if (!hasFrost || !hasWet) return false;

  // 1. 固定伤害（基础值 + 每级成长，随玩家等级成长；数值可配置；裂变元素参与则 -50%）
  const comboDmg = erDmg(player, ER.freezeBase ?? 137, ER.freezePerLv ?? 3, fissionMult(target, '霜冻', '湿润'));
  calculateFinalDamage(comboDmg, target, { ignoreArmor: 0, dmgType: 'ice', player: player, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
  battleLog('❄️💧 冻结反应触发：额外伤害', comboDmg);

  // 2. 35%基础概率冻结，吃幸运（概率可配置：LEVEL_UP_CFG.elementReaction.freezeChance）
  const baseChance = ER.freezeChance ?? 0.35;
  const luck = player.luck ?? 0;
  // 🍀 幸运冻结概率（统一幸运入口 luckProb）：基础概率 × (1+幸运转化率)，上限 100%
  const finalChance = user.luckProb(baseChance);

  if (chance(finalChance)) {
    applyFreeze(target);
    battleLog('🥶 冰湿反应冻结成功');
  }

  // 3. 恢复霜冻减少的速度
  const frostDebuff = target.debuffs.find(d => d.name === '霜冻');
  if (frostDebuff) {
    target.speed += frostDebuff.speedDebuff || 0;
  }

  // 4. 移除霜冻和湿润两个buff
  target.debuffs = target.debuffs.filter(d => d.name !== '霜冻' && d.name !== '湿润');
  onElementReactionTrigger(player, target);
  return true;
}

// ==============================================
// 通用：湿润 + 灼烧 组合反应（蒸发）
// 双buff同时存在则立刻结算：95%攻击力火属性伤害 + 移除双buff
// ==============================================
export function checkWetBurnCombo(player, target) {
  if (!target || target.hp <= 0) return false;

  const hasWet = target.debuffs.some(d => d.name === '湿润');
  const hasBurn = target.debuffs.some(d => d.name === '灼烧');
  if (!hasWet || !hasBurn) return false;

  // 1. 固定伤害（基础值 + 每级成长，随玩家等级成长；数值可配置；裂变元素参与则 -50%）
  const comboDmg = erDmg(player, ER.vaporizeBase ?? 237, ER.vaporizePerLv ?? 4, fissionMult(target, '湿润', '灼烧'));
  calculateFinalDamage(comboDmg, target, { ignoreArmor: 0, dmgType: 'fire', player: player, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
  battleLog('💧🔥 蒸发反应触发：额外伤害', comboDmg);

  // 2. 显示反应名称
  emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('eleVaporize') });

  // 3. 移除湿润和灼烧两个buff
  target.debuffs = target.debuffs.filter(d => d.name !== '湿润' && d.name !== '灼烧');
  onElementReactionTrigger(player, target);
  return true;
}

// ==============================================
// 通用：霜冻 + 灼烧 组合反应（融化）
// 双buff同时存在则立刻结算：65%攻击力火属性伤害 + 降低10%当前护甲 + 移除双buff
// ==============================================
export function checkFrostBurnCombo(player, target) {
  if (!target || target.hp <= 0) return false;

  const hasFrost = target.debuffs.some(d => d.name === '霜冻');
  const hasBurn = target.debuffs.some(d => d.name === '灼烧');
  if (!hasFrost || !hasBurn) return false;

  // 1. 固定伤害（基础值 + 每级成长，随玩家等级成长；无视护甲，反应伤害不重复挂debuff）（数值可配置；裂变元素参与则 -50%）
  const comboDmg = erDmg(player, ER.meltBase ?? 162, ER.meltPerLv ?? 3, fissionMult(target, '霜冻', '灼烧'));
  calculateFinalDamage(comboDmg, target, { ignoreArmor: 0, dmgType: 'fire', player: player, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
  battleLog('❄️🔥 融化反应触发：额外伤害', comboDmg);

  // 2. 降低敌人当前10%护甲（比例可配置）
  const armorReduce = Math.floor(target.armor * (ER.meltArmorReduce ?? 0.1));
  target.armor = Math.max(0, target.armor - armorReduce);
  battleLog('🧊 融化：护甲 -', armorReduce);

  // 3. 恢复霜冻减少的速度
  const frostDebuff = target.debuffs.find(d => d.name === '霜冻');
  if (frostDebuff) {
    target.speed += frostDebuff.speedDebuff || 0;
  }

  // 4. 显示反应名称
  emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('eleMelt') });

  // 5. 移除霜冻和灼烧两个buff
  target.debuffs = target.debuffs.filter(d => d.name !== '霜冻' && d.name !== '灼烧');
  onElementReactionTrigger(player, target);
  return true;
}

// ==============================================
// 通用：湿润 + 电流 = 感电反应
// 对所有带有湿润效果的敌人造成65%电属性伤害并降低12%行动条
// 之后移除所有敌人的湿润及电流效果
// ==============================================
export function checkWetLightningCombo(player, target, enemies = []) {
  if (!target || target.hp <= 0) return false;

  const hasWet = target.debuffs.some(d => d.name === '湿润');
  const hasShock = target.debuffs.some(d => d.name === '电流');
  if (!hasWet || !hasShock) return false;

  // 1. 对所有带有湿润效果的敌人造成固定伤害（基础值 + 每级成长，随玩家等级成长；数值可配置；裂变元素参与则 -50%）
  const comboDmg = erDmg(player, ER.electrochargeBase ?? 162, ER.electrochargePerLv ?? 3);
  const allCandidates = [target, ...enemies];
  const wetEnemies = allCandidates.filter(e => e.hp > 0 && e.debuffs.some(d => d.name === '湿润'));
  // 主目标电流若来自裂变，整场感电都减半
  const shockFromFission = target.debuffs.some(d => d.name === '电流' && d.fromFission);

  wetEnemies.forEach(enemy => {
    const wetFromFission = enemy.debuffs.some(d => d.name === '湿润' && d.fromFission);
    const comboMult = (shockFromFission || wetFromFission) ? 0.5 : 1;
    calculateFinalDamage(comboDmg * comboMult, enemy, { ignoreArmor: 0, dmgType: 'lightning', player: player, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
    // 降低12%行动条（比例可配置：ER.electrochargeActionDrop，🆕 允许减成负数叠加）
    enemy.actionProgress -= Math.floor((ER.electrochargeActionDrop ?? 0.12) * 10000);
    battleLog('💧⚡ 感电反应：', enemy.name, '伤害', comboDmg, '行动条 -12%');
    onElementReactionTrigger(player, enemy);
  });

  // 2. 显示反应名称（主目标）
  emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('eleElectroCharged') });

  // 3. 移除所有目标湿润+电流效果
  allCandidates.forEach(enemy => {
    enemy.debuffs = enemy.debuffs.filter(d => d.name !== '湿润');
  });
  target.debuffs = target.debuffs.filter(d => d.name !== '电流');

  return true;
}

// ==============================================
// 通用：霜冻 + 电流 = 超导反应
// 对目标造成50%攻击力电属性伤害并使敌人受到物理伤害提升25%持续一回合
// ==============================================
export function checkFrostLightningCombo(player, target) {
  if (!target || target.hp <= 0) return false;

  const hasFrost = target.debuffs.some(d => d.name === '霜冻');
  const hasShock = target.debuffs.some(d => d.name === '电流');
  if (!hasFrost || !hasShock) return false;

  // 1. 固定伤害（基础值 + 每级成长，随玩家等级成长；数值可配置；裂变元素参与则 -50%）
  const comboDmg = erDmg(player, ER.superconductBase ?? 125, ER.superconductPerLv ?? 3, fissionMult(target, '霜冻', '电流'));
  calculateFinalDamage(comboDmg, target, { ignoreArmor: 0, dmgType: 'lightning', player: player, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
  battleLog('❄️⚡ 超导反应触发：额外伤害', comboDmg);

  // 2. 物理伤害提升25%持续一回合（比例可配置）——upsertBuff：存在刷新，新建才叠加物理受伤
  if (upsertBuff(target, {
    name: '超导易伤',
    type: 'physVuln',
    remaining: 1,
    physTakenUp: ER.superconductPhysUp ?? 0.25
  }, { isDebuff: true })) {
    target.physDamageTaken += (ER.superconductPhysUp ?? 0.25);
  }

  // 3. 恢复霜冻减少的速度
  const frostDebuff = target.debuffs.find(d => d.name === '霜冻');
  if (frostDebuff) {
    target.speed += frostDebuff.speedDebuff || 0;
  }

  // 4. 显示反应名称
  emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('eleSuperconduct') });

  // 5. 移除霜冻和电流两个buff
  target.debuffs = target.debuffs.filter(d => d.name !== '霜冻' && d.name !== '电流');
  onElementReactionTrigger(player, target);
  return true;
}

// ==============================================
// 通用：灼烧 + 电流 = 爆燃反应
// 对目标及周围的敌人造成40%攻击力火属性伤害，保留灼烧效果
// ==============================================
export function checkBurnLightningCombo(player, target, enemies = []) {
  if (!target || target.hp <= 0) return false;

  const hasBurn = target.debuffs.some(d => d.name === '灼烧');
  const hasShock = target.debuffs.some(d => d.name === '电流');
  if (!hasBurn || !hasShock) return false;

  // 1. 固定伤害（基础值 + 每级成长，随玩家等级成长；数值可配置；裂变元素参与则 -50%，主目标与溅射同值）
  const comboDmg = erDmg(player, ER.overloadBase ?? 100, ER.overloadPerLv ?? 2, fissionMult(target, '灼烧', '电流'));

  // 对主目标造成伤害
  calculateFinalDamage(comboDmg, target, { ignoreArmor: 0, dmgType: 'fire', player: player, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
  battleLog('🔥⚡ 爆燃反应：主目标', target.name, '伤害', comboDmg);

  // 对周围敌人造成溅射伤害（左右相邻）
  if (enemies.length > 0) {
    const targetIdx = enemies.findIndex(e => e.uid === target.uid);
    const splashIndices = [targetIdx - 1, targetIdx + 1];

    splashIndices.forEach(idx => {
      if (idx < 0 || idx >= enemies.length) return;
      const splashTarget = enemies[idx];
      if (!splashTarget || splashTarget.hp <= 0) return;
      calculateFinalDamage(comboDmg, splashTarget, { ignoreArmor: 0, dmgType: 'fire', player: player, buff: null, applyElement: false, enemies: [], skillName: '元素反应' });
      onElementReactionTrigger(player, splashTarget);
      battleLog('🔥⚡ 爆燃溅射：', splashTarget.name, '伤害', comboDmg);
    });
  }

  // 2. 显示反应名称
  emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('eleDeflagration') });

  // 3. 只移除电流buff，保留灼烧效果
  target.debuffs = target.debuffs.filter(d => d.name !== '电流');
  return true;
}

// ==============================================
// 通用：给敌人施加冻结（发事件通知渲染层播放动画）
// ==============================================
export function applyFreeze(target) {
  if (!target) return;

  // 已经冻结就不重复加（upsertBuff 去重：返回 false = 已存在，不重复触发动画/事件）
  const isNewFreeze = upsertBuff(target, {
    name: '冻结',
    type: 'freeze',
    remaining: 1,
    skipAction: true
  }, { isDebuff: true });
  if (!isNewFreeze) return;
  emitter.emit('enemyBuff', { enemyName: target.name, enemyUid: target.uid, buffName: t('eleFreeze') });
  // 通知渲染层播放冻结动画
  emitter.emit('enemyFreeze', { enemyUid: target.uid });
}

// ==============================================
// 通用：移除敌人冻结（发事件通知渲染层恢复动画）
// ==============================================
export function removeFreeze(target) {
  if (!target) return;
  // 通知渲染层移除冻结动画、恢复spine播放
  emitter.emit('enemyUnfreeze', { enemyUid: target.uid });
}

//造成元素反应
function onElementReactionTrigger(player, target) {
  // （旧衍生反应伤害已移除：紊乱天赋改为进入战斗获得智慧%精通，见 battle.js）
}