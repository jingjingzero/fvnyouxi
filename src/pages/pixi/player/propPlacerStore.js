/**
 * 🧸 道具放置器 —— 共享状态
 * matter.vue（负责创建/销毁 Spine 视图 + 地图点击）与 propPlacer.vue（面板 UI）共用此模块，
 * 两边共享响应式状态，无需跨组件事件。
 */

import { reactive } from 'vue';
import { useCounterStore } from "@/store/counter";
import { SPINE_PROP_DEFS, PROP_PLACE_MAPS } from './spineProps.js';
import { ElMessText } from "@/pages/zujian/utils.js";

export const propPlacerState = reactive({
  visible: false, // 面板开关
  armed: null,    // 当前选中的道具 def（null = 未选择）
  placed: [],     // 已放置的道具元信息 [{ id, key, label, skeleton, x, y, collidable }]
  message: '',    // 状态提示（选择/放置成功/校验失败等）
});

/**
 * 道具是否已解锁（没解锁的不显示）
 * - 配置里没写 unlockFlag → 默认解锁
 * - 写了 unlockFlag → 读对话标记（存档持久化，读档后自动更新）
 */
export function isPropUnlocked(def) {
  if (!def || !def.unlockFlag) return true;
  return !!useCounterStore().getDialogueFlag(def.unlockFlag);
}

/** 道具的放置材料消耗列表（归一化为数组；无消耗返回 []） */
export function propCostList(def) {
  if (!def?.cost) return [];
  return Array.isArray(def.cost) ? def.cost : [def.cost];
}

/** 背包材料是否足够放置该道具 */
export function propAffordable(def) {
  const user = useCounterStore();
  return propCostList(def).every(c => user.getInventoryItemNum(c.name) >= (c.num ?? 1));
}

/** 消耗放置材料（已校验过足够才调用；成功返回 true） */
export function consumePropCost(def) {
  const user = useCounterStore();
  return propCostList(def).every(c => user.consumeInventoryItem(c.name, c.num ?? 1));
}

/** 材料不足提示文案，如「魔晶×2、草药×1」 */
export function propCostText(def) {
  return propCostList(def).map(c => `${c.name}×${c.num ?? 1}`).join('、');
}

/** 道具所属地图（旧存档无 mapId 的项，迁移归唯一可放置地图 desert_01） */
export function propMapId(p) {
  return p?.mapId || 'desert_01';
}

export function openPropPlacer() {
  // 🗺️ 地图白名单：只有允许的地图能打开放置器（目前仅 desert_01）
  const cur = useCounterStore().pixi.currentMapId;
  if (!PROP_PLACE_MAPS.includes(cur)) {
    ElMessText(`当前地图不能放置道具（目前仅 ${PROP_PLACE_MAPS.join('、')} 可放置）`, 'warning');
    return;
  }
  disarmProp(); // 打开面板时取消正在进行的放置
  propPlacerState.visible = true;
}

export function closePropPlacer() {
  propPlacerState.visible = false;
  disarmProp();
}

export function armProp(def) {
  propPlacerState.armed = def;
  propPlacerState.message = def
    ? `已选择「${def.label}」，点击地图放置（←→/拖动调整位置，Esc 取消）`
    : '';
  // 🧸 放置时关闭弹出框，用透明预览在地面上调整
  if (def) propPlacerState.visible = false;
}

export function disarmProp() {
  propPlacerState.armed = null;
  propPlacerState.message = '';
}

/** 把材料返还给背包（按道具配置 cost；无消耗则跳过） */
function refundMaterials(costs) {
  const user = useCounterStore();
  for (const c of costs) {
    user.addItemToInventory({ name: c.name, num: c.num ?? 1 });
  }
}

/**
 * 🎒 收回单个道具：返还放置时消耗的材料 + 移除
 * （视图/刚体/问号由 matter.vue 的 placed watch 自动销毁）
 */
export function reclaimProp(id) {
  const idx = propPlacerState.placed.findIndex(p => p.id === id);
  if (idx === -1) return;
  const p = propPlacerState.placed[idx];
  const def = SPINE_PROP_DEFS.find(d => d.key === p.key);
  const costs = propCostList(def);
  refundMaterials(costs);
  propPlacerState.placed.splice(idx, 1);
  const refundText = costs.map(c => `${c.name}×${c.num ?? 1}`).join('、');
  propPlacerState.message = refundText
    ? `🎒 已收回「${p.label}」，返还材料：${refundText}`
    : `🧸 已收回「${p.label}」`;
}

/**
 * 🎒 收回全部道具：只收回「当前地图」的道具（其他地图的道具切过去再收回），
 * 汇总返还所有放置时消耗的材料 + 清空
 */
export function reclaimAllProps() {
  const cur = propMapId({ mapId: useCounterStore().pixi.currentMapId });
  const items = propPlacerState.placed.filter(p => propMapId(p) === cur);
  const n = items.length;
  if (n === 0) return;
  const refundMap = new Map();
  for (const p of items) {
    const def = SPINE_PROP_DEFS.find(d => d.key === p.key);
    for (const c of propCostList(def)) {
      refundMap.set(c.name, (refundMap.get(c.name) ?? 0) + (c.num ?? 1));
    }
  }
  refundMaterials([...refundMap].map(([name, num]) => ({ name, num })));
  // 只移除当前地图的道具（其他地图保留，切过去仍显示）
  const kept = propPlacerState.placed.filter(p => propMapId(p) !== cur);
  propPlacerState.placed.length = 0;
  propPlacerState.placed.push(...kept);
  const refundText = [...refundMap].map(([name, num]) => `${name}×${num}`).join('、');
  propPlacerState.message = refundText
    ? `🎒 已收回 ${n} 个道具，返还材料：${refundText}`
    : `🧸 已收回 ${n} 个道具`;
}
