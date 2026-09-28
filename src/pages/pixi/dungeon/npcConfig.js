// 🧑 NPC 对话/行为配置表：tiled 的 npc 对象只摆位置 + 填 npcId（唯一标识），
//    对话与行为（dialogLoadData/dialogName/dialogRoute/needTask/merchant）在这里统一配置，
//    改对话不用动地图；展示属性（spine 动画/缩放/逃跑等）仍在 tiled 配置
//    npcId 就是 tiled 里 npc 对象的 npcId 属性值（没填用 tiled 对象 id）
export const NPC_CONFIG = {
  // 🧑 莫奇（商人）：dungeon.tmj npcId=shangren1
  'shangren1': {
    dialogLoadData: 'npc/shangren1',
    dialogRoute: [
      { ifNotCompleted: 'xm01', name: 'xm01' }, // 首遇（初见）未完成 → 播 xm01
      { ifNotCompleted: 'sr01', name: 'sr01' }, // 二次遇见未完成 → 播 sr01
      { name: 'sr100' },                          // 都完成 → 买卖菜单（sr100 自动流转 sr10）
    ],
  },
  // 🧑 里亚（任务门禁）：dungeon.tmj npcId=liya / dungeon2.tmj npcId=liya2
  'liya': {
    dialogLoadData: 'npc/liya',
    dialogRoute: [{ name: 'ly01' }],
    needTask: 'find_liya', // 🔒 未接到 find_liya 任务不可对话
  },
  'liya2': {
    dialogLoadData: 'npc/liya',
    dialogRoute: [{ name: 'ly01' }],
    needTask: 'find_liya',
  },
  // 🧑 黑米（逃跑型，dungeon.tmj npcId=heimifu）
  'heimifu': {
    dialogLoadData: 'npc/shangren1',
    dialogRoute: [
      { ifNotCompleted: 'sr01', name: 'sr01' },
      { name: 'sr10' },
    ],
  },
  // 🧑 主角对话（dungeon2.tmj npcId=juese_hl，spine=dilaoQ 的头像 NPC）
  'juese_hl': {
    dialogRoute: [
      { ifNotCompleted: 'hl01', name: 'hl01' },
      { ifNotCompleted: 'hl50', name: 'hl50' },
      { name: 'hl51' },
    ],
  },
};

// 兜底默认值（npcId 没在 NPC_CONFIG 配置时使用；tiled 里配的旧对话字段仍生效）
export const NPC_DEFAULT = {
  dialogLoadData: null,
  dialogName: null,
  dialogRoute: [],
  needTask: null,
  merchant: false,
};
