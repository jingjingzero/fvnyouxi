// ==============================================
// 🎯 统一 DOT（持续伤害）结算框架
// 所有「回合开始按 debuff 结算」的持续伤害都在这里注册，
// 战斗循环统一通过 getDotTick(d) 查询并调用，避免各模块各写一套跳伤循环。
// 新增持续伤害时：写一个 tick(unit, player, playerHand, name, du) 函数并在此注册即可。
// ==============================================
import { tickBleed } from './NewCards.js'
import { tickBurn, tickMiasma, tickPlayerPoison } from './SkillDamage.js'

const _byType = {} // debuff.type -> tick
const _byName = {} // debuff.name -> tick

/**
 * 注册一个 DOT 类型
 * @param {string} type debuff 的 type 字段
 * @param {string[]} names debuff 的 name 字段（兼容按名字匹配的旧 debuff）
 * @param {Function} tick 结算函数 tick(unit, player, playerHand, name, du)
 */
export function registerDot(type, names, tick) {
  if (type) _byType[type] = tick
  ;(names || []).forEach(n => { _byName[n] = tick })
}

/**
 * 查询某个 debuff 对应的 DOT 结算函数（按 type 优先，回退按 name）
 */
export function getDotTick(d) {
  if (!d) return null
  return _byType[d.type] || _byName[d.name] || null
}

// ===== 静态注册：通用持续伤害（回合开始结算） =====
// 🩸 流血：可叠加，行动时受到 (12+4*层数)% 攻击力伤害
registerDot('bleed', ['流血'], (target, player, playerHand, name, du) => tickBleed(target, player, du))
// 🔥 灼烧：回合开始触发火属性持续伤害
registerDot('burn', ['灼烧'], (target, player, playerHand, name, du) => tickBurn(target, player, du))
// ☠️ 瘴毒 / 毒雾：毒系持续伤害
registerDot('miasma', ['瘴毒', '毒雾'], (target, player, playerHand, name, du) => tickMiasma(target, player, playerHand, name, du))
// 🧪 玩家中毒（player_poison）：玩家回合开始统一结算（护盾优先、致死立即检查）
registerDot('player_poison', ['中毒'], (target, player, playerHand, name, du) => tickPlayerPoison(target, player, playerHand, name, du))
