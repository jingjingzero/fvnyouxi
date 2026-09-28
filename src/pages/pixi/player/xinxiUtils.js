// 🧰 物品分类/品质/食物判断工具（从 xinxi.vue 抽出，纯函数、无组件依赖）
// ⚠️ 修改后 dladmin「物品编辑」可联动；模板与 xinxi.vue 共享
export function getItemTypeValue(item) {
  if (item.food || ['魔晶LV1'].includes(item.name)) return 'food'; // 🍎 食物类（兼容旧存档按名称识别）
  if (item.isGachaItem || item.isSpecial || ['魔力晶核', '灵力晶核', '金币'].includes(item.name)) return 'special'; // 🎰 特殊分类（抽卡资源 / 金币）
  if (item.status === 'material') return 'material'; // 🧱 材料类绝对优先（即使可食用/带 isItem 也保持材料分类）
  if (item.isItem && item.buffs) return 'item'; // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (item.shiyong) return 'consumable'; // 🧪 消耗品（药水等）
  if (item.isItem) return 'item';
  if (item.isCard) return 'currency';
  if (item.img === 'qiandaizi.webp') return 'currency';
  if (item.wuqi) return 'equipment';
  return 'material';
}

export function getItemType(item) {
  if (item.isGachaItem || item.isSpecial || ['魔力晶核', '灵力晶核', '金币'].includes(item.name)) return '特殊'; // 🎰 特殊分类（抽卡资源 / 金币）
  if (item.status === 'material') return '材料'; // 🧱 材料类绝对优先（即使可食用/带 isItem 也保持材料分类）
  if (item.isItem && item.buffs) return '道具'; // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (item.shiyong) return '消耗品'; // 🧪 消耗品（药水等）
  if (item.isItem) return '道具';
  if (item.isCard) return '卡牌';
  if (item.img === 'qiandaizi.webp') return '货币';
  if (item.wuqi) return '装备';
  return '材料';
}

export function getItemQualityColor(item) {
  if (item.name === '魔力晶核') return '#F56C6C'; // 红色 - 魔力晶核
  if (item.isItem) return item.color || '#E6A23C'; // 橙色 - 道具
  if (item.isCard) return item.color || '#409EFF';
  if (item.isGachaItem) return '#8B5CF6'; // 紫色 - 抽卡道具
  if (item.img === 'qiandaizi.webp') return '#E6A23C'; // 金色 - 货币
  if (item.wuqi) return '#F56C6C'; // 红色 - 装备
  if (item.shiyong) return '#67C23A'; // 绿色 - 消耗品
  return '#909399'; // 灰色 - 材料
}

export function isFoodItem(item) {
  return !!item && (item.food || ['魔晶LV1'].includes(item.name));
}
