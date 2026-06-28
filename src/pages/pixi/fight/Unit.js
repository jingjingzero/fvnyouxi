import { reactive } from 'vue'

export function createUnit(options = {}) {
  const defaults = {
    name: "未知单位",
    hp: 100,
    maxHp: 100,
    mp: 0,
    maxMp: 0,
    attack: 0,
    armor: 0,
    baseSpeed: 100,
    speed: 100,
    luck: 0,
    camp: "player",
    buffs: [],
    debuffs: [],
    actionProgress: 0,
  }

  // ✅ 合并默认配置 + 你传入的所有自定义属性
  const unit = { ...defaults, ...options }

  return reactive(unit) // ✅ 直接返回合并后的对象！
}