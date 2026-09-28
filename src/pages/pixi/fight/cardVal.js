// ==============================================
// ⭐ 卡牌星级取值统一（卡牌数值读取收敛）
//    技能卡配置按星级数组配置（如 speedBoostPct: [0.2, 0.25, 0.3]），
//    旧版单数值兼容。统一走 starVal 取值：
//      - 数组：取 star 档（越界回退第 1 档），再空值回退默认
//      - 非数组：直接返回，空值回退默认
//    与旧模板 `Array.isArray(v) ? v[star-1] ?? v[0] ?? def : v ?? def` 完全等价
// ==============================================

/** 卡牌星级取值 */
export function starVal(cfg, key, star, def) {
  const v = cfg?.[key]
  if (Array.isArray(v)) return v[star - 1] ?? v[0] ?? def
  return v ?? def
}
