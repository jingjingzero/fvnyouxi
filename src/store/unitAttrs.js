// 🧮 属性结算统一入口（computeUnitAttrs）
// 面板/战斗/自由属性点共用：调 balance 只改 LEVEL_UP_CFG.attrRates 一处，各处同时生效。
// 依赖：仅 LEVEL_UP_CFG（configs.js），无 store / pages 依赖（可安全被 counter-store 与战斗模块引用）。
import { LEVEL_UP_CFG } from './configs.js';

/**
 * 计算角色最终战斗属性（纯函数，不修改入参）
 * @param {object} unit 角色/战斗单位（juese / 战斗 player / NPC 队友）
 * @returns {{
 *   attack:number, armor:number, magicResist:number, speed:number, luck:number,
 *   maxHp:number|undefined, physBonusBase:number, eleBonusBase:number,
 *   mastery:number, strength:number, intelligence:number
 * }}
 * - attack/armor/magicResist/speed/luck：基础值（技能倍率基准；天赋/道具加成由战斗侧叠加）
 * - maxHp：派生最大生命 = baseMaxHp + strength × strengthHp（单位无 baseMaxHp/maxHp 时返回 undefined，不覆盖）
 * - physBonusBase：力量物理增伤基数（伤害时 ÷ 当前攻击 = 比例增伤，语义与旧公式一致）
 * - eleBonusBase：智慧元素增伤基数（同上）
 * - mastery：元素精通（含智慧派生 intelligence × intelligenceMastery，元素反应倍率用）
 */
export function computeUnitAttrs(unit) {
  const r = LEVEL_UP_CFG.attrRates || {};
  const strength = unit?.strength || 0;
  const intelligence = unit?.intelligence || 0;
  const hasMaxHp = unit?.baseMaxHp != null || unit?.maxHp != null;
  const maxHp = hasMaxHp
    ? Math.floor((unit?.baseMaxHp ?? unit?.maxHp ?? 100) + strength * (r.strengthHp ?? 2))
    : undefined;
  return {
    attack: unit?.baseAttack ?? 0,
    armor: unit?.baseArmor ?? 0,
    magicResist: unit?.baseMagicResist ?? 10,
    speed: unit?.baseSpeed ?? 0,
    luck: unit?.baseLuck ?? 0,
    maxHp,
    // 💪 力量：每点物理增伤基数 = strengthPhysDmg（旧公式 strength×rate/attack 的分子，保留"按当前攻击自适应"语义）
    physBonusBase: strength * (r.strengthPhysDmg ?? 1.5),
    // 🧠 智慧：每点元素增伤基数 = intelligenceEleDmg
    eleBonusBase: intelligence * (r.intelligenceEleDmg ?? 1.5),
    // 🧠 智慧 → 元素精通（元素反应倍率）
    mastery: (unit?.elementMastery || 0) + intelligence * (r.intelligenceMastery ?? 0.2),
    // 🎯 暴击机制已移除：暴击率/暴击伤害属性不再结算
    strength,
    intelligence,
  };
}
