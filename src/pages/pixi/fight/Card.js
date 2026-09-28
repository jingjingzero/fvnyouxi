// card.js
import { reactive } from 'vue'
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();
export function createCard(name) {
  const config = user.pixi.player.CARD_DATA[name] || {}

  // 🎯 星级：支持 config.star（持久化），默认 1
  const star = Math.min(3, Math.max(1, config.star || 1));

  return reactive({
    id: Math.random(),
    name,
    // x 坐标使用 slotX 返回的相对值，默认是像素，可用 vw 转换
    dragging: false,
    offsetX: 0,
    offsetY: 0,
    needTarget: config.needTarget || false, // 是否需要指定敌人释放
    // ⭐ 星级/稀有度（替代进化）
    star: star,
    rarity: config.rarity || 'common',
    // 冷却：支持按星级数组（maxCooldown 为数组时取当前星级的）
    maxCooldown: Array.isArray(config.maxCooldown) ? (config.maxCooldown[star - 1] ?? config.maxCooldown[0] ?? 0) : (config.maxCooldown || 0),
    cooldown: Array.isArray(config.initialCooldown)
      ? (config.initialCooldown[star - 1] ?? 0)
      : (config.initialCooldown ?? 0), // 战斗后进入冷却
    cost: Array.isArray(config.cost) ? (config.cost[star - 1] ?? config.cost[0] ?? 0) : (config.cost ?? 0), // 所需消耗灵力
    limitPerTurn: config.limitPerTurn ?? 0, // 👈 加
    usedCount: 0, // 本回合已用次数 👈 加
    dmgType: config.dmgType || 'physical'
  })
}

// 🎯 获取卡牌当前星级的 atkRatio（攻击力倍率）
export function getCardAtkRatio(name, star) {
  const cfg = user.pixi.player.CARD_DATA[name] || {};
  if (Array.isArray(cfg.atkRatio)) {
    return cfg.atkRatio[Math.min(2, Math.max(0, (star || 1) - 1))] ?? cfg.atkRatio[0] ?? 0;
  }
  return cfg.atkRatio || 0;
}

// 🎯 获取卡牌当前星级的星级特殊效果
export function getCardStarEffect(name, star) {
  const cfg = user.pixi.player.CARD_DATA[name] || {};
  return cfg.starEffects?.[Math.min(3, Math.max(2, star || 1))] || null;
}

// 🎯 获取卡牌稀有度对应碎片数（分解）
export function getCardShardValue(rarity) {
  const map = { common: 1, excellent: 3, rare: 6, epic: 12, legendary: 24 };
  return map[rarity] || 1;
}

// 🎯 获取卡牌合成所需碎片数
export function getCardCraftCost(rarity) {
  const map = { common: 8, excellent: 12, rare: 17 };
  return map[rarity] || null; // 稀有以上不能合成
}