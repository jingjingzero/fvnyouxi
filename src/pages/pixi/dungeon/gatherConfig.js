// ⛏️ 采集点配置表：tiled 的 gather 对象只摆位置 + 填 gatherId（采集点标识），
//    采集产出在这里统一配置（物品/数量/进度时长/惊扰范围），方便调平衡，改掉落不用动地图
//    gatherId 就是 tiled 里 gather 对象的 gatherId 属性值（没填则用对象名）
export const GATHER_CONFIG = {
  // 示例（按你的游戏实际物品名替换）：
  // 'huocao':   { itemId: 'huocao',   num: 2, duration: 3, alertRadius: 5, title: '⛏️ 采集火草', img: '' },
  // 'hongguo':  { itemId: 'hongguo',  num: 1, duration: 2, alertRadius: 4, title: '⛏️ 采摘莓果', img: '' },
  // 'kuangshi': { itemId: 'kuangshi', num: 1, duration: 4, alertRadius: 6, title: '⛏️ 挖掘矿石', img: '' },
};

// 兜底默认值（tiled 里 gatherId 没在 GATHER_CONFIG 配置时使用）
export const GATHER_DEFAULT = {
  itemId: '',            // 道具名（背包配置表里的 name）
  num: 1,                // 获得数量
  duration: 3,           // 采集进度时长（秒）
  alertRadius: 5,        // 采集惊扰周围怪物范围（格）
  title: '⛏️ 采集',
  img: '',               // 采集点贴图 URL（可选，不填显示发光绿点）
};
