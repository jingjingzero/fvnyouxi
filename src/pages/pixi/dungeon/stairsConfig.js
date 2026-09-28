// 🏰 楼梯（stairs）配置表：tiled 的 stairs 对象只摆位置，去向/消耗/下楼后对话在这里统一配置
//    key = 地牢层数（currentLevel）；没配的层用默认
//    ⚠️ 分支路线（routes）已改为 dungeon.vue 内 generateNextRoutes 动态生成：
//       4 类事件（战斗/强敌/首领/事件）平衡随机、无限层、只显示下一层，这里不再配置 routes
export const STAIRS_CONFIG = {
  // 示例（muban.tmj stairs 原值搬移）：
  1: {
    targetLevel: 2,                              // 到下一层的层数（无分支弹窗时的兜底去向）
    cost: 1,                                     // 🪫 进入下一层消耗的精力值（0=不消耗）
    dialogLoadData: 'npc/jingling',              // 💬 下楼后触发的对话数据路径（可选）
    dialogRoute: [                               // 💬 对话条件路由（可选）
      { ifNotCompleted: 'hl01', name: 'hl01' },
      { name: 'hl51' },
    ],
  },
};

// 兜底默认值（该层没在 STAIRS_CONFIG 配置时使用；tiled 里配的旧字段仍生效）
export const STAIRS_DEFAULT = {
  targetLevel: 2,
  cost: 0,
  dialogLoadData: null,
  dialogRoute: [],
};
