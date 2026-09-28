// counter.js 入口（API 兼容：import { useCounterStore } from "@/store/counter"）
import { useCounterStore } from "./counter-store";

// 事件监听（动态加载自身，保持原行为）
if (typeof window !== 'undefined') {
  window.addEventListener('dladmin:talent-config-changed', async () => {
    try {
      const pinia = window.__pinia
      if (!pinia) return
      const { useCounterStore } = await import('/src/store/counter.js')
      useCounterStore(pinia).refreshTalentConfig?.()
    } catch (e) {
      console.error('[天赋热刷新] 失败', e)
    }
  })
  window.addEventListener('dladmin:tasks-config-changed', async () => {
    try {
      const pinia = window.__pinia
      if (!pinia) return
      const { useCounterStore } = await import('/src/store/counter.js')
      const st = useCounterStore(pinia)
      if (st.allTasks) delete st.allTasks._tplVer
      st.syncTasksFromDefs?.()
    } catch (e) {
      console.error('[任务热刷新] 失败', e)
    }
  })
}

export { useCounterStore };
export { DUNGEON_KEYS } from "./counter-store";

export { ATTACK_CARDS, LEVEL_UP_CFG, DEFAULT_CARD_DATA } from "./configs";
export { ITEM_DEFS, DEFAULT_inventory, DEFAULT_SHOP_ITEMS, DEFAULT_SELL_PRICES, LIANZHI_RECIPES, CRAFT_RECIPES, LIANZHI_LEVEL_CFG } from "./configs";
export { buildAllySkillDesc, buildAllyPassiveDesc, buildAllySkillDesc as fmtAllySkill, buildAllyPassiveDesc as fmtAllyPassive } from "./counter-utils";