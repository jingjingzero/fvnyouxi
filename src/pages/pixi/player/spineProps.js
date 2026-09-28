/**
 * 🧸 Spine 道具配置表（占位示例，后期替换成你自己的 Spine 资源）
 *
 * 字段说明：
 * - key:         唯一标识（面板/存档用）
 * - label:       面板显示名
 * - skeleton:    Spine 骨骼资源名（对应 Assets 里注册的骨架，
 *                如 'monster1' → monster1_skel + monster1_atlas）
 * - skin:        可选皮肤名（不填用默认皮肤）
 * - height:      显示高度（VH 单位，1 = 屏幕高度 1%）
 * - radius:      放置碰撞半径（VH 单位，用于「不与 NPC/物件重叠」检测）
 * - collidable:  是否可碰撞（true = 放置后有实体刚体，玩家会被挡住；false = 纯视觉）
 * - unlockFlag:  解锁标记（对话标记，读档后自动更新）：不写=默认解锁；写了需 setDialogueFlag 解锁
 * - cost:        放置消耗的背包材料（材料不足不可放置）：
 *                 单个：{ name: '魔晶', num: 2 }
 *                 多种：[{ name: '魔晶', num: 2 }, { name: '草药', num: 1 }]
 *                 不写 = 免费放置
 * - questionMark: 道具头顶的浮动问号（可配置）：
 *     show:    是否显示（true/false）
 *     wuxian:  点击次数（0 = 点击一次永久消失；N = 可点 N 次，再点才永久消失）
 *     scale:   问号大小倍率（默认 1）
 *     offsetY: 问号相对道具头顶的垂直偏移（VH，正值更高，默认 0）
 *     onClick: 点击回调 (mark, ctx) => {}，ctx = { propId, def, x, y }
 *     说明：问号被「永久消失」后记录到存档（qmConsumed），读档不会重新生成；
 *           道具本身读档始终恢复；问号配置改代码后读档自动按最新配置重新生成。
 *
 * 【替换方法】把 skeleton 改成你的资源名即可；要新增道具在这里加一条。
 */

import { ElMessText } from "@/pages/zujian/utils.js";

/**
 * 🗺️ 允许放置道具的地图白名单（只有这些地图能打开放置器并放置道具）
 * 目前只有 desert_01；以后新地图可放置 → 把地图 id 加进这个数组即可：
 *   例如：export const PROP_PLACE_MAPS = ['desert_01', 'one01', 'huli_01'];
 * 道具按放置时的地图归属（placed.mapId），面板只显示当前地图的已放置道具，
 * 切到其他地图时该地图的道具才显示；读档时只恢复当前地图的道具。
 */
export const PROP_PLACE_MAPS = ['desert_01'];

export const SPINE_PROP_DEFS = [
  // ===== 默认解锁（不写 unlockFlag 即可直接使用）=====
  { key: 'prop_monster1',   label: '魔物·暗影狼',  skeleton: 'monster1',   height: 10,  radius: 1.2, collidable: false },
  { key: 'prop_guaiwu2',    label: '魔物·魔化猫',  skeleton: 'guaiwu2',    height: 2.5, radius: 1.2, collidable: false },
  { key: 'prop_guaiwu3',    label: '魔物·三号',    skeleton: 'guaiwu3',    height: 2.5, radius: 1.2, collidable: false },
  { key: 'prop_jinglingQ',  label: '精灵球·Q版',   skeleton: 'jinglingQ',  height: 2.0, radius: 1.0, collidable: false },
  { key: 'prop_two219',     label: '伙伴·two219',  skeleton: 'two219',     height: 2.2, radius: 1.0, collidable: false },
  { key: 'prop_bluefive',   label: '伙伴·bluefive', skeleton: 'bluefive',  height: 2.2, radius: 1.0, collidable: false },
  {
    key: 'prop_jiguang', label: '激光柱', skeleton: 'jiguang', height: 20, radius: 0.8, collidable: true,
    cost: { name: '魔晶LV1', num: 2 }, // 放置消耗 2 个魔晶LV1
    questionMark: {
      show: true,
      wuxian: 0, // 点击一次永久消失
      onClick: (mark, ctx) => { ElMessText('这是一根激光柱！', 'info') },
    },
  },
  {
    key: 'prop_changjing1', label: '场景装饰·一', skeleton: 'changjing1', height: 3.0, radius: 1.0, collidable: false,
    cost: { name: '灵力晶核', num: 1 }, // 放置消耗 1 个灵力晶核
  },

  // ===== 需要解锁（unlockFlag = 对话标记；用 user.setDialogueFlag('xxx') 解锁，读档后自动更新）=====
  { key: 'prop_monsterElite', label: '魔物·精英',   skeleton: 'guaiwu2',   height: 3.4, radius: 1.5, collidable: true },
  {
    key: 'prop_statue', label: '石像', skeleton: 'changjing2', height: 4.0, radius: 1.6, collidable: true, unlockFlag: 'prop_statue_unlocked',
    cost: [{ name: '魔晶LV1', num: 3 }, { name: '灵力晶核', num: 2 }], // 多种材料
    questionMark: {
      show: true,
      wuxian: 2, // 可点 2 次，第 3 次永久消失
      scale: 1.2,
      onClick: (mark, ctx) => { ElMessText('石像散发着古老的气息……', 'info') },
    },
  },
  { key: 'prop_altar',        label: '祭坛',        skeleton: 'changjing1', height: 3.2, radius: 1.3, collidable: true,  unlockFlag: 'prop_altar_unlocked' },
];
