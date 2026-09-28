// ==============================================
// 🎯 战斗目标选择统一入口
//    技能卡选目标的三类模式收敛：
//      - resolveTarget  指定目标存活则用，否则第一个存活敌人兜底
//      - pickNearestX   按 x 离玩家最近（护前排）
//      - pickFarthestX  按 x 离玩家最远（打后排）
//    与各技能原内联逻辑逐字等价，行为零变化
// ==============================================

/** 指定目标存活则用，否则第一个存活敌人兜底 */
export function resolveTarget(target, enemies) {
  return target?.hp > 0 ? target : enemies.find(e => e.hp > 0)
}

/** 按 x 离玩家最近 */
export function pickNearestX(enemies, px) {
  return enemies.reduce((a, b) => Math.abs(a.x - px) <= Math.abs(b.x - px) ? a : b)
}

/** 按 x 离玩家最远 */
export function pickFarthestX(enemies, px) {
  return enemies.reduce((a, b) => Math.abs(b.x - px) >= Math.abs(a.x - px) ? b : a)
}
