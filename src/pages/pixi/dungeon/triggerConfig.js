// ⚡ 感应器（trigger）触发行为配置表：tiled 的 trigger 对象只摆感应区矩形 + 填 triggerId，
//    触发后执行什么（弹窗/对话/埋击敌人）在这里统一配置，改行为不用动地图
//    triggerId 就是 tiled 里 trigger 对象的 triggerId 属性值（没填则用对象名）
export const TRIGGER_CONFIG = {
  // 示例（按你的实际需求替换/新增）：
  // 弹窗提示：
  // 'jiguan_1': { message: '你踩到了机关，地面微微震动…', title: '📜 提示' },
  //
  // 埋击敌人（对象层方式：单独对象层放 enemy，触碰后整层出现并追击）：
  // 'maifu_1': { ambushLayer: 'dungeon_ambush' },
  //
  // 埋击敌人（JSON 数组方式：直接指定位置+怪物配置）：
  // 'guaiwu_1': {
  //   spawnEnemies: [
  //     { col: 5, row: 8, spine: 'dilaoQ', aggroRadius: 6, enemies: [{ name: '魔化猫', monsterType: 'guaiwu2', count: 1 }] },
  //   ],
  // },
  //
  // 触发对话（dialogRoute 为条件路由，可省略直接 dialogName）：
  // 'jieshao_1': { dialogLoadData: 'jieshao_1', dialogName: '晨曦' },
};

// 兜底默认值（triggerId 没在 TRIGGER_CONFIG 配置时使用；tiled 里配的旧字段仍生效）
export const TRIGGER_DEFAULT = {
  message: null,
  title: '📜 提示',
  dialogLoadData: null,
  dialogName: null,
  dialogRoute: [],
  ambushLayer: null,
  spawnEnemies: [],
};
