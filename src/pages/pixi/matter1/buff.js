// 颜色配置：普通/暴击两档，支持扩展更多属性
export const DAMAGE_COLOR_MAP = Object.freeze({
  physical: { normal: '#ff9500', critical: '#ff6b00' }, // 物理橙
  poison: { normal: '#bf5af2', critical: '#9d32d9' },   // 毒紫
  normal: { normal: '#ffffff', critical: '#ffffff' },   // 无属性白
  'null': { normal: '#ffffff', critical: '#ffffff' },
  // ✅ 新增恢复类配色
  heal: { normal: '#00ff66', critical: '#00cc44' },     // 回血：亮绿
  mp: { normal: '#00ccff', critical: '#0099ff' }        // 回灵力：天蓝色
});
// 新增：Buff名称颜色映射配置
export const BUFF_COLOR_MAP = {
  // ✅ 全部用中文做key
  '看透': { color: '#FFD700' },
  '弱点': { color: '#FF4500' },
  '弱点+1': { color: '#FF4500' },
  '汲灵秘术': { color: '#00CED1' },
  '乘胜追击': { color: '#00CED1' },
  '武器强化': { color: '#00CED1' },
  '减益': { color: '#FF6347' },
  '瘴毒': { color: '#7CFC00' },
};