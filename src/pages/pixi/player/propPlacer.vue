<template>
  <div v-if="propPlacerState.visible"
    class="fixed top-[4vh] right-[2vw] z-[120] w-[38vw] max-w-[560px] select-none! text-[#e0e0e0] rounded-2xl border border-white/15 bg-gradient-to-b from-[#141430]/95 to-[#1e1b4b]/95 backdrop-blur-md shadow-2xl overflow-hidden">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between px-[2vh] py-[1.5vh] border-b border-white/10 bg-black/30">
      <div class="flex items-center gap-[1.2vh]">
        <span class="text-[2.6vh]">🧸</span>
        <span class="text-[2.4vh] font-bold iconfont2 text-[#fbbf24]">{{ L('ppTitle') }}</span>
      </div>
      <button @click="closePropPlacer"
        class="w-[4vh] h-[4vh] rounded-full flex items-center justify-center text-[2vh] text-white/50 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
        ✕
      </button>
    </div>

    <!-- 道具选择（未解锁的不显示） -->
    <div class="px-[2vh] py-[1.5vh] border-b border-white/10">
      <div class="text-[1.8vh] text-white/50 mb-[1vh]">
        {{ L('ppHint') }}
        <span v-if="lockedCount > 0" class="text-[#fbbf24]/80 ml-[1vh]">🔒 {{ fmt('ppLockedCount', { n: lockedCount }) }}</span>
      </div>
      <div v-if="unlockedProps.length === 0" class="text-[1.6vh] text-white/30 text-center py-[2vh]">
        {{ L('ppNoProps') }}
      </div>
      <template v-else>
        <!-- 筛选 -->
        <div class="flex items-center gap-[0.8vh] mb-[1vh]">
          <button v-for="f in filterOptions" :key="f.value" @click="propFilter = f.value"
            class="px-[1.2vh] py-[0.4vh] rounded-full text-[1.4vh] font-medium border transition-all cursor-pointer"
            :class="propFilter === f.value
              ? 'bg-[#fbbf24]/25 text-[#fbbf24] border-[#fbbf24]/60'
              : 'bg-white/5 text-white/50 border-white/15 hover:text-white hover:border-white/30'">
            {{ L(f.label) }}
          </button>
        </div>
        <!-- 四行四列，超出滚动 -->
        <div v-if="filteredProps.length === 0" class="text-[1.6vh] text-white/30 text-center py-[2vh]">
          {{ L('ppNoPropsInCat') }}
        </div>
        <div v-else class="grid grid-cols-4 gap-[1vh] max-h-[44vh] overflow-y-auto jx-scroll pr-[0.5vh]">
          <div v-for="def in filteredProps" :key="def.key"
          class="relative flex flex-col items-center gap-[0.5vh] px-[0.6vh] py-[1vh] rounded-xl border transition-all duration-200"
          :class="propPlacerState.armed?.key === def.key
            ? 'border-[#fbbf24]/70 bg-[#fbbf24]/15 scale-[1.03] shadow-[0_0_1.5vh_rgba(251,191,36,0.3)]'
            : propAffordable(def)
              ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25 cursor-pointer'
              : 'border-white/5 bg-white/[0.02] opacity-45 cursor-not-allowed'"
          @click="propAffordable(def) && armProp(propPlacerState.armed?.key === def.key ? null : def)">
          <span class="text-[3vh]">🧸</span>
          <span class="text-[1.4vh] text-center leading-tight">{{ def.label }}</span>
          <!-- 可碰撞 / 纯视觉标记 -->
          <span v-if="def.collidable"
            class="px-[0.8vh] py-[0.2vh] rounded-full text-[1.2vh] font-medium bg-[#f56c6c]/15 text-[#f56c6c] border border-[#f56c6c]/30">
            🧱 {{ L('ppCollidable') }}
          </span>
          <span v-else class="text-[1.2vh] text-white/30">{{ L('ppVisual') }}</span>
          <!-- 材料消耗 -->
          <span v-if="costList(def).length > 0"
            class="px-[0.8vh] py-[0.2vh] rounded-full text-[1.2vh] font-medium bg-[#67c23a]/15 text-[#67c23a] border border-[#67c23a]/30">
            🎒 {{ costText(def) }}
          </span>
          <!-- 材料不足标记 -->
          <span v-if="costList(def).length > 0 && !propAffordable(def)"
            class="absolute top-[0.4vh] left-[0.4vh] px-[0.8vh] py-[0.2vh] rounded-full text-[1.2vh] font-bold bg-[#f56c6c]/85 text-white">
            {{ L('ppNoMaterial') }}
          </span>
        </div>
        </div>
      </template>
    </div>


    <!-- 已放置列表 -->
    <div class="px-[2vh] py-[1.5vh] max-h-[30vh] overflow-y-auto jx-scroll">
      <div class="flex items-center justify-between mb-[1vh]">
        <span class="text-[1.8vh] text-white/50">{{ fmt('ppPlacedCount', { n: currentMapProps.length }) }}</span>
        <button v-if="currentMapProps.length > 0" @click="reclaimAllProps"
          class="px-[1.5vh] py-[0.5vh] rounded-full text-[1.5vh] font-medium bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/40 hover:bg-[#fbbf24]/25 transition-all cursor-pointer">
          🎒 {{ L('ppReclaimAll') }}
        </button>
      </div>
      <div v-if="currentMapProps.length === 0" class="text-[1.6vh] text-white/30 text-center py-[2vh]">
        {{ L('ppNoPlaced') }}
      </div>
      <div v-else class="flex flex-col gap-[0.8vh]">
        <div v-for="p in currentMapProps" :key="p.id"
          class="flex items-center gap-[1vh] px-[1.2vh] py-[0.8vh] rounded-lg bg-white/5 border border-white/10">
          <span class="text-[2vh]">🧸</span>
          <div class="flex-1 min-w-0">
            <div class="text-[1.8vh] font-medium truncate">{{ p.label }}</div>
            <div class="text-[1.4vh] text-white/40">({{ p.x }}, {{ p.y }})</div>
          </div>
          <button @click="reclaimProp(p.id)"
            class="w-[3.4vh] h-[3.4vh] rounded-full flex items-center justify-center text-[1.6vh] text-white/40 hover:bg-[#fbbf24]/25 hover:text-[#fbbf24] transition-all cursor-pointer">
            🎒
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCounterStore } from '@/store/counter'
import { SPINE_PROP_DEFS } from './spineProps.js'
import { t } from '@/i18n'
import {
  propPlacerState,
  isPropUnlocked,
  propAffordable,
  propCostList,
  propCostText,
  closePropPlacer,
  armProp,
  disarmProp,
  reclaimProp,
  reclaimAllProps,
} from './propPlacerStore.js'

const langVersion = ref(0)
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++)
function L(key) { langVersion.value; return t(key); }
function fmt(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// 已解锁的道具（未解锁的不显示）
const unlockedProps = computed(() => SPINE_PROP_DEFS.filter(def => isPropUnlocked(def)))
const lockedCount = computed(() => SPINE_PROP_DEFS.length - unlockedProps.value.length)

// 🔍 道具筛选：all=全部 / collidable=可碰撞 / visual=纯视觉
const propFilter = ref('all')
const filterOptions = [
  { value: 'all', label: 'ppFilterAll' },
  { value: 'collidable', label: 'ppFilterCollidable' },
  { value: 'visual', label: 'ppFilterVisual' },
]
const filteredProps = computed(() => {
  if (propFilter.value === 'all') return unlockedProps.value
  const wantCollidable = propFilter.value === 'collidable'
  return unlockedProps.value.filter(def => !!def.collidable === wantCollidable)
})

// 模板辅助（材料消耗展示）
const costList = (def) => propCostList(def)
const costText = (def) => propCostText(def)

// 🗺️ 已放置列表：只显示「当前地图」的道具（其他地图的道具切过去才显示）
const user = useCounterStore()
const currentMapProps = computed(() => {
  const cur = user.pixi.currentMapId
  return propPlacerState.placed.filter(p => (p.mapId || 'desert_01') === cur)
})

// Esc：取消放置 → 再按关闭面板
function onKeydown(e) {
  if (!propPlacerState.visible) return
  if (e.key === 'Escape') {
    if (propPlacerState.armed) disarmProp()
    else closePropPlacer()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.jx-scroll::-webkit-scrollbar {
  width: 0.6vh;
}
.jx-scroll::-webkit-scrollbar-thumb {
  background: rgba(251, 191, 36, 0.35);
  border-radius: 1vh;
}
.jx-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
