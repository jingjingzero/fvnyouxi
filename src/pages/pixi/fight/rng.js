// ==============================================
// 🎲 战斗随机数统一入口（概率/随机统一）
//    战斗内所有概率判定 / 随机选择统一走这里：
//      - random()    均匀 [0,1)，默认等价 Math.random()（行为与旧战斗完全一致）
//      - chance(p)   概率判定，等价 Math.random() < p
//      - pickIndex(n) 随机下标，等价 Math.floor(Math.random() * n)
//    调试 / 测试时可 setBattleSeed(seed) 固定随机序列，复现一场战斗
//    视觉随机（粒子动画）与唯一 id 生成不在此列，保持原样
// ==============================================

let _seed = null

/** 设置固定种子（传 null 恢复真随机） */
export function setBattleSeed(seed) {
  _seed = seed === null || seed === undefined ? null : ((seed | 0) || 1)
}

/** 均匀随机数 [0,1)：默认真随机；有种子时用 mulberry32 确定性序列 */
export function random() {
  if (_seed === null) return Math.random()
  let t = (_seed += 0x6D2B79F5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** 概率判定：有 p 概率返回 true */
export function chance(p) {
  return random() < p
}

/** 随机下标：返回 [0, n) 均匀整数 */
export function pickIndex(n) {
  return Math.floor(random() * n)
}
