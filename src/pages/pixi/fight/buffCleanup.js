// ==============================================
// 🧹 buff / debuff 到期清理注册表（onTurnStart 统一查表调用）
//
// 新增 buff / debuff 时：只需在这里按 type / name 注册清理函数，
// 不用再改战斗主循环（避免「加新 buff 忘清理 → 属性残留」）。
//
// ⚠️ type 与 name 匹配【可叠加】：如「风之庇佑」type=speed_buff（先恢复速度）
//    同时 name=风之庇佑（再恢复射击属性），两个清理都会执行，与原 if 链等价。
//
// 清理函数签名：cleaner(target, buff, player, helpers)
//   helpers = { talentFx, removeReflectBuff, removeFreeze, returnEffect }
//   （由 battle.js 注入，避免本模块依赖战斗闭包 / 循环 import）
// ==============================================

/**
 * 🧹 buff/debuff 施加去重刷新（收敛散落的 find → 刷新/新建 逻辑）
 *   存在同名 → 刷新 remaining（默认 buff.remaining，可用 opts.refreshRemaining 覆盖）→ 返回 false
 *   不存在 → push buff → 返回 true（新建，可用于「仅新建时显示文字 / 触发副作用」）
 * @param {object} unit  战斗单位（buffs / debuffs）
 * @param {object} buff  buff 对象（name/type/remaining/自定义字段）
 * @param {object} opts  { isDebuff=false（true 写入 debuffs）, refreshRemaining（刷新值，缺省用 buff.remaining） }
 * @returns {boolean} true=新建，false=刷新已有
 */
export function upsertBuff(unit, buff, opts = {}) {
  const { isDebuff = false, refreshRemaining } = opts
  const list = isDebuff ? (unit.debuffs = unit.debuffs ?? []) : (unit.buffs = unit.buffs ?? [])
  const exist = list.find(b => b.name === buff.name)
  if (exist) {
    exist.remaining = refreshRemaining !== undefined ? refreshRemaining : buff.remaining
    return false
  }
  list.push(buff)
  return true
}

// 🎯 buff 属性副作用【施加侧】注册表（与下方 BUFF_TYPE_CLEANUP 清理侧对称配对）
//    施加 buff 时用 applyBuffSideEffects(target, buff) 立即应用属性加成，
//    到期由 BUFF_TYPE_CLEANUP 恢复，形成「施加 / 移除」一对；
//    新 buff 只需在两侧各注册一条，不用改调用点
export const BUFF_TYPE_APPLY = {
  speed_buff: (target, b) => {
    if (target.speed !== undefined) target.speed += b.speedUp || 0
  },
  allStats: (target, b) => {
    target.attack += b.atkUp || 0
    target.armor += b.armorUp || 0
    target.luck += b.luckUp || 0
    target.speed += b.speedUp || 0
  },
  slow: (target, b) => {
    if (target.speed !== undefined) target.speed = Math.max(1, target.speed - (b.speedDebuff || 0))
  },
  reflect: (target, b) => {
    target.armor += b.addArmor || 0
  },
}

/** 施加 buff 属性副作用（无副作用注册时静默跳过） */
export function applyBuffSideEffects(target, buff) {
  const fn = BUFF_TYPE_APPLY[buff?.type]
  if (fn) fn(target, buff)
}

export const BUFF_TYPE_CLEANUP = {
  allStats: (target, b) => {
    target.attack -= b.atkUp
    target.armor -= b.armorUp
    target.luck -= b.luckUp
    target.speed -= b.speedUp
  },
  reflect: (target, b, player, helpers) => {
    target.armor -= b.addArmor
    // 移除反弹 buff 动画
    helpers.removeReflectBuff(target)
  },
  speed_buff: (target, b) => {
    // 乘胜追击加速 / 风之庇佑加速：恢复速度
    target.speed -= b.speedUp
  },
  enemy_rage: (target, b, player, helpers) => {
    // 🐈 敌人狂怒结束：恢复基础攻击/速度 + 回收自身循环特效（狂怒特效）
    if (target.baseAttack) target.attack = Math.round(target.baseAttack * 100) / 100
    if (target.baseSpeed) target.speed = Math.round(target.baseSpeed * 100) / 100
    if (target._rageFx) {
      try { helpers.returnEffect(target._rageFx._fxType || 'Fenyan', target._rageFx) } catch (e) { /* ignore */ }
      target._rageFx = null
    }
  },
}

export const BUFF_NAME_CLEANUP = {
  '风之庇佑': (target, b, player) => {
    // 🌬️ 风之庇佑结束：射击恢复物理属性（仅玩家身上生效）
    if (target !== player) return
    target._shootIsWind = false
    target._shootWindBoostPct = 0
  },
  '先攻': (target, b, player, helpers) => {
    const atkBonus = Math.trunc(player.baseAttack * helpers.talentFx('battle_start_attack_buff', 'atkPct', 0.4) * 100) / 100
    player.attack -= atkBonus
    player._atkUpDetails = (player._atkUpDetails || []).filter(d => d.name !== '先攻')
    player.physDmgBonus = Math.max(0, (player.physDmgBonus || 0) - helpers.talentFx('battle_start_attack_buff', 'dmgBonus', 0.4))
  },
}

export const DEBUFF_NAME_CLEANUP = {
  '瘴毒': (target, d) => {
    target.armor += d.reduceArmor
    target.poisonTaken -= d.poisonTaken
  },
  '霜冻': (target, d) => { target.speed += d.speedDebuff || 0 },
  '冰寒': (target, d) => { target.speed += d.speedDebuff || 0 },
  '缠绕': (target, d) => { target.speed += d.speedDebuff || 0 },
  '粘液减速': (target, d) => { target.speed += (d.speedDebuff || 0) * (d.stacks || 1) },
  '冻结': (target, d, player, helpers) => { helpers.removeFreeze(target) },
}
