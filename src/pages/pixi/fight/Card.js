// card.js
import { reactive } from 'vue'
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();
export function createCard(name) {
  const config = user.pixi.player.CARD_DATA[name] || {}

  return reactive({
    id: Math.random(),
    name,
    // x 坐标使用 slotX 返回的相对值，默认是像素，可用 vw 转换
    dragging: false,
    offsetX: 0,
    offsetY: 0,
    maxCooldown: config.maxCooldown || 0,//卡牌的冷却
    cooldown: config.initialCooldown ?? 0,//战斗后进入冷却
    cost: config.cost ?? 0, //所需消耗灵力
    limitPerTurn: config.limitPerTurn ?? 0, // 👈 加
    usedCount: 0, // 本回合已用次数 👈 加
    activeEvos: config.defaultEvos || [],
    dmgType: config.dmgType || 'physical'
  })
}