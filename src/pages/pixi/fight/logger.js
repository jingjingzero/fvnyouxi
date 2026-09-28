// ==============================================
// 📢 战斗日志统一入口（战斗日志统一）
//    战斗模块所有 console.log 收敛走 battleLog，
//    setBattleLog(false) 一键关闭全部战斗日志（正式包 / 低端机省性能）
//    错误类 console.error / 警告 console.warn 保持原样，不受开关影响
// ==============================================

let _enabled = true

/** 开关战斗日志（正式包可传 false 关闭） */
export function setBattleLog(enabled) {
  _enabled = !!enabled
}

/** 战斗日志：禁用时零输出 */
export function battleLog(...args) {
  if (_enabled) console.log(...args)
}
