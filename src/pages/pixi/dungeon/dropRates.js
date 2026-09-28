/**
 * 🎁 敌人掉落表（主世界 + 地牢统一使用）
 * 规则：每个敌人独立查自己的表，从上到下依次检测，命中即停（每张表最多掉 1 种）
 * 眷顾天赋（blessing）：掉落概率 +25%（与夜晚 +100%、幸运收敛加成 luckDrop%×L/(L+100) 全部相加，不乘算）
 * 注：SHADOW_DROP_BLESSING_MULT 为历史遗留常量，实际掉落未使用（两处判定均为加法池）
 */
export const SHADOW_DROP_BLESSING_MULT = 1.25;

export const ENEMY_DROP_RATES = {
  // 暗影（战斗 spine=monster1）
  monster1: [
    { item: "怒之晶石", base: 0.15 },
    { item: "魔力晶核", base: 0.05 },
    { item: "魔晶LV3", base: 0.01 },
    { item: "魔晶LV2", base: 0.025 },
    { item: "魔晶LV1", base: 0.1 },
  ],
  // 魔化猫（战斗 spine=guaiwu2）
  guaiwu2: [
    { item: "怒之晶石", base: 0.15 },
    { item: "魔力晶核", base: 0.1 },
    { item: "魔晶LV3", base: 0.02 },
    { item: "魔晶LV2", base: 0.05 },
    { item: "魔晶LV1", base: 0.25 },
  ],
  // duwuguai（战斗 spine=duwuguai）
  duwuguai: [
    { item: "怒之晶石", base: 0.2 },
    { item: "魔力晶核", base: 0.08 },
    { item: "魔晶LV3", base: 0.015 },
    { item: "魔晶LV2", base: 0.05 },
    { item: "魔晶LV1", base: 0.15 },
  ],
  // 雷鸟（战斗 spine=guaiwu3）
  guaiwu3: [
    { item: "雷之晶石", base: 0.15 },
    { item: "魔力晶核", base: 0.15 },
    { item: "魔晶LV4", base: 0.02 },
    { item: "魔晶LV3", base: 0.04 },
    { item: "魔晶LV2", base: 0.1 },
    { item: "魔晶LV1", base: 0.5 },
  ],
  // 暗影王（战斗 spine=anyingwang）
  anyingwang: [
    { item: "暗之晶石", base: 0.5 },
    { item: "魔晶LV4", base: 0.12 },
    { item: "魔晶LV3", base: 0.25 },
    { item: "魔力晶核", base: 0.1 },
    { item: "魔晶LV2", base: 0.4 },
    { item: "魔晶LV1", base: 0.6 },
  ],
  // 巨型眼瞳（战斗 spine=jutong）
  jutong: [
    { item: "忆尘晶", base: 0.5 },
    { item: "魔晶LV4", base: 0.1 },
    { item: "魔晶LV3", base: 0.2 },
    { item: "魔力晶核", base: 0.08 },
    { item: "魔晶LV2", base: 0.35 },
    { item: "魔晶LV1", base: 0.55 },
  ],
  // 雷鸟女皇（战斗 spine=nvhuang）
  nvhuang: [
    { item: "雷之晶石", base: 0.6 },
    { item: "魔晶LV5", base: 0.06 },
    { item: "魔晶LV4", base: 0.15 },
    { item: "魔晶LV3", base: 0.3 },
    { item: "魔力晶核", base: 0.12 },
    { item: "魔晶LV2", base: 0.45 },
  ],
  // 风息（战斗 spine=fengxi）
  fengxi: [
    { item: "雷之晶石", base: 0.5 },
    { item: "魔晶LV5", base: 0.05 },
    { item: "魔晶LV4", base: 0.12 },
    { item: "魔晶LV3", base: 0.25 },
    { item: "魔力晶核", base: 0.1 },
    { item: "魔晶LV2", base: 0.4 },
  ],
};
