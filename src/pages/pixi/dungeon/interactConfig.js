// 🖐️ 互动点（interact）触发内容配置表：tiled 的 interact 对象（interact / interact_door 等前缀均可）只摆位置 + 填 interactId，
//    互动内容（类型/标题/文案/所需物品/解锁行为）在这里统一配置，改内容不用动地图
//    interactId 就是 tiled 里互动对象的 interactId 属性值（没填用对象名，再没填用 tiled 对象 id）
export const INTERACT_CONFIG = {
  // 🚪 互动大门（muban.tmj interact_door）：需要铜钥匙解锁，解锁后联动封印层消失
  'interact_door': {
    type: 'unlock',
    title: '古老的大门',
    content: '这是一扇刻满符文的古老大门，需要一把铜钥匙才能打开。',
    requireItem: '铜钥匙', // 🔑 背包里有才可解锁，解锁后消耗 1 个
    unlockMessage: '✨ 大门缓缓打开，露出了后面的通道！',
    failMessage: '❌ 大门纹丝不动，你需要一把铜钥匙。',
    buttonText: '开门',
    sealId: 'interact_door', // 🔐 解锁后隐藏并解封 seal_interact_door 层
  },
  // 📜 墙壁铭文（muban.tmj interact_inscription）：纯查看
  'interact_inscription': {
    type: 'inspect',
    title: '墙壁上的铭文',
    content: '「昔日勇者在此留下足迹，地牢深处隐藏着无尽的宝藏与危险。\n记住：携带足够的钥匙，方能打开前进的道路。」',
    buttonText: '查看',
  },
  // 示例（按你的实际需求替换/新增）：
  // 需要物品解锁的门（配 sealId 联动封印层，解锁后门消失）：
  // 'door_1': {
  //   type: 'unlock',
  //   requireItem: '铜钥匙',                 // 解锁需要的物品名（背包里有才可解锁）
  //   unlockMessage: '钥匙插入锁孔，大门缓缓打开…',
  //   failMessage: '门锁得死死的，好像需要什么钥匙…',
  //   sealId: 'door1',                       // 解锁后隐藏并解封的 seal 图层 id（对应 seal_door1 层）
  //   buttonText: '🔓 开门',
  // },
  // 纯查看（弹窗显示标题+内容）：
  // 'paizi_1': {
  //   type: 'inspect',
  //   title: '📜 石碑',
  //   content: '上面刻着古老的文字：……',
  //   buttonText: '📜 查看',
  // },
  // 自定义弹窗（同 inspect，点击后弹 title+content）：
  // 'jiguan_1': {
  //   type: 'custom',
  //   title: '⚙️ 神秘机关',
  //   content: '一个精巧的机关，似乎还缺了点什么…',
  // },
};

// 兜底默认值（interactId 没在 INTERACT_CONFIG 配置时使用；tiled 里配的旧字段仍生效）
export const INTERACT_DEFAULT = {
  type: 'inspect',
  title: '',
  content: '',
  requireItem: '',
  unlockMessage: '',
  failMessage: '',
  buttonText: '',
  sealId: '',
};
