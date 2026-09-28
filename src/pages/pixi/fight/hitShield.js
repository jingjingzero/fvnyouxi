// ==============================================
// 🛡️ 受击前统一拦截层
// 所有对敌人造成伤害的入口（卡牌伤害 / 元素反应 / DOT / 天赋 AOE / 溢出伤害 / 秒杀）
// 在扣血前都必须经过这里，避免"免疫 / 减伤"类被动在各处漏写。
// 新增受击类被动时，只需在本文件的 hasSummonShield 旁再加一个判断函数，
// 并在 shouldBlockDamage 里汇总。
// ==============================================

/**
 * 暗影王「暗影庇佑」：有召唤物存活时本体免疫所有伤害（先清召唤物）。
 * 召唤物标记：_isSummon + 名字「暗影」，且 _sourceUid 指向召唤者 uid（兼容顶层/data 两种存储）。
 * @param {object} target 受击敌人
 * @param {Array} enemies 当前战斗全部敌人（含召唤物）
 */
export function hasSummonShield(target, enemies) {
  if (!target || !Array.isArray(enemies)) return false
  if (!(Array.isArray(target.passives) && target.passives.some(p => p && p.name === '暗影庇佑'))) return false
  return enemies.some(e => e && e.hp > 0 && e.uid !== target.uid && (
    e._sourceUid === target.uid ||
    e.data?._sourceUid === target.uid ||
    (e._isSummon && (e.name === '暗影' || e.data?.name === '暗影'))
  ))
}

/**
 * 受击前统一拦截：返回 { blocked, dmg }。
 * blocked=true 表示本次伤害被完全免疫（调用方扣血为 0 / 跳过）。
 * 后续新增受击类被动，在此汇总判断。
 * @param {object} target 受击敌人
 * @param {number} dmg 计算后的伤害
 * @param {Array} enemies 当前战斗全部敌人
 */
export function shouldBlockDamage(target, dmg, enemies) {
  if (hasSummonShield(target, enemies)) {
    return { blocked: true, dmg: 0 }
  }
  return { blocked: false, dmg }
}
