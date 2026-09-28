// 🎁 宝箱（对象层 chest）配置表：tiled 的 chest 对象只摆位置 + 填 id（唯一标识，供 push_target 引用），
//    奖励与解锁条件（items/needItem/respawn/showOnStart）在这里统一配置，改奖励不用动地图
//    宝箱 id 就是 tiled 里 chest 对象的 id 属性值（没填用 tiled 对象 id）
export const CHEST_CONFIG = {
  // 示例（muban.tmj chest_01 原值搬移）：
  'chest_01': {
    items: [
      { itemId: '魔晶', num: 5 },
      { itemId: '金币', num: 100 },
      { itemId: '草药', num: 3 },
      { itemId: '灵力晶核', num: 2 },
    ],
  },
  // 💎 演示宝箱（dungeon.tmj chest_demo / chest_demo2 / chest_demo3，id 已在 tiled 改唯一）
  'chest_demo': {
    items: [
      { itemId: '魔晶LV1', num: 5 },
      { itemId: '金币', num: 100 },
      { itemId: '灵力晶核', num: 3 },
    ],
    needItem: '灵力晶核', // 🔑 需要灵力晶核才能打开（消耗 1 个）
    needItemNum: 1,
    showOnStart: true, // 🚩 初始直接显示
  },
  'chest_demo2': {
    items: [
      { itemId: '魔晶LV1', num: 2 },
      { itemId: '金币', num: 50 },
      { itemId: '灵力晶核', num: 1 },
    ],
    showOnStart: true,
  },
  'chest_demo3': {
    items: [
      { itemId: '魔晶LV1', num: 2 },
      { itemId: '金币', num: 50 },
      { itemId: '灵力晶核', num: 1 },
    ],
    showOnStart: true,
  },
};

// 兜底默认值（宝箱 id 没在 CHEST_CONFIG 配置时使用；tiled 里配的旧字段仍生效）
export const CHEST_DEFAULT = {
  items: [],
  needItem: '',
  needItemNum: 1,
  respawn: false,
  showOnStart: false,
};
