<template>
  <div
    class="tj-root relative flex flex-col w-full h-[95vh] overflow-hidden box-border p-[3vh_2.5vw_2.5vh] text-[#e8e4d8] bg-[radial-gradient(120%_90%_at_50%_0%,#1a2138_0%,#12172a_45%,#0c101f_100%)]">
    <!-- 顶部光晕 -->
    <div
      class="absolute -top-[18vh] left-1/2 -translate-x-1/2 w-[55vw] h-[30vh] pointer-events-none bg-[radial-gradient(closest-side,rgba(201,165,92,0.22),transparent_70%)]">
    </div>

    <!-- ===== 顶部标题栏 ===== -->
    <div class="relative flex flex-wrap items-center gap-[2vw] pb-[2vh] border-b border-[rgba(201,165,92,0.35)]">
      <div
        class="flex items-center gap-[0.8vw] text-[3.6vh] font-black tracking-[0.08em] whitespace-nowrap bg-gradient-to-b from-[#f8e7b0] via-[#d9b45c] to-[#a8813a] bg-clip-text text-transparent">
        {{ L('tjTitle') }}
      </div>
      <div class="text-[1.8vh] text-[#9aa3bd] whitespace-nowrap">{{ fmt('tjSubtitle', { n: catalog.length }) }}</div>
      <div class="relative ml-auto w-full mt-[1.2vh] sm:mt-0 sm:w-[20vw]">
        <input v-model="keyword"
          class="w-full h-[4.6vh] pl-[1.6vh] pr-[3.6vh] box-border rounded-full border border-[rgba(201,165,92,0.4)] bg-[rgba(10,14,26,0.6)] text-[#f0e6c8] text-[1.9vh] outline-none transition-all duration-200 focus:border-[#d9b45c] focus:shadow-[0_0_0_3px_rgba(217,180,92,0.18)] placeholder:text-[#6b7490]"
          :placeholder="L('tjSearchPlaceholder')" />
        <span v-if="keyword"
          class="absolute right-[1.2vw] top-1/2 -translate-y-1/2 text-[#7c859e] cursor-pointer text-[1.8vh] hover:text-[#f0e6c8]"
          @click="keyword = ''">✕</span>
      </div>
    </div>

    <!-- ===== 分类 tab ===== -->
    <div class="flex gap-[1vh] py-[1.8vh_1.4vh] overflow-x-auto flex-nowrap">
      <button v-for="t in tabs" :key="t.value"
        class="flex items-center gap-[0.7vh] px-[1.8vw] py-[1vh] rounded-full border border-[rgba(201,165,92,0.3)] bg-[rgba(18,23,42,0.6)] text-[#aab2c8] text-[2vh] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 hover:text-[#f0e6c8] hover:border-[rgba(217,180,92,0.6)]"
        :class="activeTab === t.value ? '!text-[#1a1206] !bg-gradient-to-b from-[#f6d98a] to-[#d9a94f] !border-[#e7c877] shadow-[0_0_16px_rgba(217,180,92,0.35)]' : ''"
        @click="activeTab = t.value">
        {{ L(t.label) }}<span
          class="text-[1.5vh] px-[0.9vh] py-[0.2vh] rounded-full bg-white/12"
          :class="activeTab === t.value ? '!bg-black/15' : ''">{{ tabCount(t.value) }}</span>
      </button>
    </div>

    <!-- ===== 卡片网格（可滚动） ===== -->
    <div class="tj-grid relative pt-3vh flex-1 min-h-0 grid content-start grid-cols-[repeat(auto-fill,minmax(12.5vw,1fr))] gap-[2vh_1.6vw] overflow-y-auto p-[0.6vh_0.4vw_2vh]">
      <div v-for="it in displayList" :key="it.name"
        class="flex flex-col items-center py-2vh gap-[0.7vh] px-[0.4vw] py-[1.8vh_1.4vh] rounded-[1.2vw] border border-[rgba(201,165,92,0.22)] bg-gradient-to-b from-[rgba(32,39,66,0.7)] to-[rgba(16,21,38,0.85)] cursor-pointer transition-all duration-200 hover:-translate-y-[0.5vh] hover:scale-105 hover:border-[rgba(217,180,92,0.7)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.5),0_0_14px_rgba(217,180,92,0.25)]"
        @click="openDetail(it)">
        <div
          class="w-[14vh] h-[14vh]  flex items-center justify-center  border  overflow-hidden"
          :style="{ borderColor: (it.color || '#c9a55c') + '66' }">
          <img v-if="itemDisplayImg(it)" :src="itemDisplayImg(it)" class="w-full h-full object-contain" alt="" />
          <span v-else class="w-full h-full flex items-center justify-center text-[3vh] font-black text-[#f0e6c8]"
            :style="{ background: (it.color || '#c9a55c') + '33' }">{{ it.name[0] }}</span>
        </div>
        <div class="text-[2.4vh] font-bold text-center leading-[1.2] max-w-full truncate"
          :style="{ color: it.color || '#f0e6c8' }">{{ tr(it.name) }}</div>
        <div class="text-[2vh] text-[#8790ab] px-[1vh] pt-[0.4vh] rounded-full bg-white/6">{{ typeName(it) }}</div>
      </div>
      <div v-if="!displayList.length" class="col-span-full text-center text-[#7c859e] text-[2.2vh] py-[6vh]">{{ L('tjNoMatch') }}</div>
    </div>

    <!-- ===== 详情弹层 ===== -->
    <div v-if="current" class="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(4,6,12,0.72)] backdrop-blur-[3px]"
      @click.self="current = null">
      <div class="tj-detail relative w-[58vw] max-h-[80%] rounded-[1.6vw] border border-[rgba(217,180,92,0.5)] bg-gradient-to-br from-[#1d2440] via-[#12172b] to-[#0d1120] shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(217,180,92,0.15)] overflow-hidden">
        <div
          class="absolute -top-[8vh] -right-[6vw] w-[26vw] h-[20vh] pointer-events-none bg-[radial-gradient(closest-side,rgba(217,180,92,0.2),transparent_70%)]">
        </div>
        <div
          class="absolute top-[1.4vh] right-[1.6vw] z-2 w-[4.4vh] h-[4.4vh] flex items-center justify-center rounded-full border border-[rgba(201,165,92,0.4)] bg-[rgba(10,14,26,0.6)] text-[#aab2c8] text-[2.2vh] cursor-pointer transition-all duration-200 hover:text-[#f0e6c8] hover:border-[#d9b45c] hover:bg-[rgba(30,36,64,0.8)]"
          @click="current = null">✕</div>
        <div class="flex gap-[2.4vw] p-[4vh_3vw]">
          <div
            class="flex-shrink-0 w-[20vh] h-[20vh] flex items-center justify-center rounded-[1.4vw] border-2 bg-[rgba(10,14,26,0.6)] shadow-[inset_0_0_30px_rgba(0,0,0,0.4)]"
            :style="{ borderColor: (current.color || '#c9a55c') + '88' }">
            <img v-if="itemDisplayImg(current)" :src="itemDisplayImg(current)" class="w-[88%] h-[88%] object-contain" alt="" />
            <span v-else class="text-[9vh] font-black text-[#f0e6c8]"
              :style="{ background: (current.color || '#c9a55c') + '33' }">{{ current.name[0] }}</span>
          </div>
          <div class="flex-1 flex flex-col gap-[1.2vh] min-w-0">
            <div class="text-[4vh] font-black tracking-[0.04em]"
              :style="{ color: current.color || '#f0e6c8' }">{{ tr(current.name) }}</div>
            <div class="flex items-center gap-[1vh]">
              <span class="text-[1.7vh] text-[#1a1206] font-bold px-[1.4vh] py-[0.4vh] rounded-full bg-gradient-to-b from-[#f6d98a] to-[#d9a94f]">{{ typeName(current) }}</span>
              <span v-if="ownNum(current.name) > 0" class="text-[1.7vh] text-[#9fe8a6] font-bold">{{ fmt('tjOwned', { n: ownNum(current.name) }) }}</span>
              <span v-else class="text-[1.7vh] text-[#7c859e] font-medium">{{ L('tjNotOwned') }}</span>
            </div>
            <div class="text-[2vh] leading-[1.7] text-[#cfd3e2] whitespace-pre-line px-[1.6vh] py-[1.4vh] rounded-[0.8vw] bg-white/5">{{ user.getItemDesc(current) || L('tjNoDesc') }}</div>
            <div class="mt-[0.6vh] px-[1.6vh] py-[1.4vh] rounded-[0.8vw] border border-[rgba(201,165,92,0.3)] bg-[rgba(217,180,92,0.07)]">
              <div class="text-[1.9vh] font-extrabold text-[#e7c877] mb-[0.8vh]">📌 {{ L('tjSources') }}</div>
              <div class="text-[1.9vh] leading-[1.65] text-[#e6dcc0]">{{ sourceOf(current) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch , onMounted } from 'vue'

import { useCounterStore } from "@/store/counter";
import { tr } from "@/i18n";
import { createDaojuSpine, createCardSpine } from '../fight/CardSpine'
import { t } from '@/i18n'

const user = useCounterStore()
const langVersion = ref(0)
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++)
function L(key) { langVersion.value; return t(key); }
function fmt(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// ==================== 分类 ====================
const tabs = [
  { label: 'tjTabAll', value: 'all' },
  { label: 'tjTabMaterial', value: 'material' },
  { label: 'tjTabFood', value: 'food' },
  { label: 'tjTabConsumable', value: 'consumable' },
  { label: 'tjTabItem', value: 'item' },
  { label: 'tjTabBreakthrough', value: 'breakthrough' },
  { label: 'tjTabSpecial', value: 'special' },
]
const activeTab = ref('all')
const keyword = ref('')
const current = ref(null)

function getItemTypeValue(item) {
  if (item.food || ['魔晶LV1'].includes(item.name)) return 'food'
  if (item.isGachaItem || item.isSpecial || ['魔力晶核', '灵力晶核', '金币'].includes(item.name)) return 'special'
  if (item.bType) return 'breakthrough'
  if (item.status === 'material') return 'material'
  if (item.shiyong) return 'consumable'
  if (item.isItem) return 'item'
  if (item.isCard) return 'currency'
  if (item.img === 'qiandaizi.webp') return 'currency'
  if (item.wuqi) return 'equipment'
  return 'material'
}
const TYPE_NAMES = {
  material: 'typeMaterial', food: 'typeFood', consumable: 'typeConsumable', item: 'typeItem',
  breakthrough: 'typeBreakthrough', special: 'typeSpecial', currency: 'typeCurrency', equipment: 'typeEquipment',
}
function typeName(item) { return L(TYPE_NAMES[getItemTypeValue(item)] || 'typeItem') }

// ==================== 数据 ====================
const catalog = computed(() => {
  const list = user.getAllItemCatalog() || []
  return list.filter(i => i && i.name && !/^测试/.test(i.name))
})
const displayList = computed(() => {
  const kw = keyword.value.trim()
  return catalog.value.filter(it => {
    if (activeTab.value !== 'all' && getItemTypeValue(it) !== activeTab.value) return false
    if (kw && !it.name.includes(kw)) return false
    return true
  })
})
function tabCount(v) {
  if (v === 'all') return catalog.value.length
  return catalog.value.filter(it => getItemTypeValue(it) === v).length
}

// ==================== 🖼️ 图片（daojuall spine 皮肤 → assets webp 兜底） ====================
const daojuImgMap = ref({})
const _loadingSkins = new Set()
const ASSETS_FALLBACK = new Set(['jinghe', 'jinbi', 'mojing', 'suipian', 'caoyao', 'shui', 'yaoshui_hp', 'yaoshui_hp_large', 'yaoshui_mp', 'heimi'])
const allSkins = computed(() => {
  const set = new Set()
  for (const it of catalog.value) if (it.img && !ASSETS_FALLBACK.has(it.img)) set.add(it.img)
  return [...set]
})
async function ensureSkin(skin) {
  if (!skin || daojuImgMap.value[skin]) return
  if (_loadingSkins.has(skin)) return
  _loadingSkins.add(skin)
  try {
    const pre = (typeof window !== 'undefined' && window.__daojuImgMap) || {}
    if (pre[skin]) { daojuImgMap.value[skin] = pre[skin]; return }
    const result = await createDaojuSpine(skin, 96, 96)
    if (result && result.canvas) {
      const url = result.canvas.toDataURL()
      daojuImgMap.value[skin] = url
      if (window.__daojuImgMap) window.__daojuImgMap[skin] = url
      result.destroy && result.destroy()
    }
  } catch (e) {
    // 皮肤不存在 → 走 assets webp 兜底
  } finally {
    _loadingSkins.delete(skin)
  }
}
// 🃏 卡牌图鉴图：卡牌用 kapai.skel 渲染卡面（daojuall 里没有精灵皮肤）
const cardImgMap = ref({})
async function ensureCardImg(name) {
  if (!name || cardImgMap.value[name]) return
  if (_loadingSkins.has('card:' + name)) return
  _loadingSkins.add('card:' + name)
  try {
    const pre = (typeof window !== 'undefined' && window.__cardImgMap) || {}
    if (pre[name]) { cardImgMap.value[name] = pre[name]; return }
    const result = await createCardSpine(name, 96, 96)
    if (result && result.canvas) {
      const url = result.canvas.toDataURL()
      cardImgMap.value[name] = url
      if (window.__cardImgMap) window.__cardImgMap[name] = url
      result.destroy && result.destroy()
    }
  } catch (e) {
    // 卡牌皮肤不存在 → 显示首字占位
  } finally {
    _loadingSkins.delete('card:' + name)
  }
}
async function loadAll() {
  for (const it of catalog.value) {
    if (it.isCard) await ensureCardImg(it.name)
    else await ensureSkin(it.img)
  }
}
watch(allSkins, loadAll, { immediate: true })
// 🖼️ 统一取图：卡牌优先卡面（kapai），道具走 daojuall / assets 兜底
function itemDisplayImg(it) {
  if (!it) return ''
  if (it.isCard) return cardImgMap.value[it.name] || ''
  return itemImg(it.img)
}

function assetUrl(src) {
  try { return new URL(`../../../assets/daoju/${src}.webp`, import.meta.url).href } catch (e) { return '' }
}
function itemImg(src) {
  if (!src) return ''
  if (daojuImgMap.value[src]) return daojuImgMap.value[src]
  if (ASSETS_FALLBACK.has(src)) return assetUrl(src)
  return ''
}

// ==================== 📌 获取途径 ====================
const ITEM_SOURCES = {
  '赤莓': 'srcChimei',
  '翠息草': 'srcCuixi',
  '风萤果': 'srcFengying',
  '魔力灵液': 'srcMoli',
  '怒之晶石': 'srcNuzhi',
  '暗之晶石': 'srcAnzhi',
  '雷之晶石': 'srcLeizhi',
  '幽冥花蕊': 'srcYouming',
  '月露草': 'srcYuelu',
  '忆尘晶': 'srcYichen',
  '恢复药剂': 'srcHuifu',
  '疾行药剂': 'srcJixing',
  '焚力永浆': 'srcFenli',
  '幽铠永浆': 'srcYoukai',
  '迅霆永浆': 'srcXunting',
  '启明灵剂': 'srcQiming',
  '盈悟灵浆': 'srcYingwu',
  '生命灵药': 'srcShengming',
  '魔力灵药': 'srcMoliLingyao',
  '魔晶LV1': 'srcMojing',
  '魔晶LV2': 'srcMojing',
  '魔晶LV3': 'srcMojing',
  '魔晶LV4': 'srcMojing',
  '魔晶LV5': 'srcMojing',
  '魔晶LV6': 'srcMojing',
  '魔晶LV7': 'srcMojing',
  '突破神石': 'srcTuposhen',
  '秘纹水晶': 'srcMiwen',
  '幸运草': 'srcXingyun',
  '灵力晶核': 'srcLingli',
  '魔力晶核': 'srcMoliHe',
  '金币': 'srcJinbi',
  '白朔的灵晶': 'srcBaishuo',
}
function sourceOf(it) { return it.source || L(ITEM_SOURCES[it.name] || 'srcUnknown') }

// ==================== 持有数 ====================
function ownNum(name) {
  const it = user.inventory.find(i => i.name === name)
  return it ? (it.num || 0) : 0
}
function openDetail(it) { current.value = it }

</script>

<style scoped>
/* 详情弹层入场动画 */
.tj-detail {
  animation: tjPop 0.22s ease-out;
}
@keyframes tjPop {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 卡片区滚动条美化 */
.tj-grid::-webkit-scrollbar { width: 8px; }
.tj-grid::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.04); border-radius: 8px; }
.tj-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(217, 180, 92, 0.5), rgba(168, 129, 58, 0.5));
  border-radius: 8px;
}
.tj-grid::-webkit-scrollbar-thumb:hover { background: rgba(217, 180, 92, 0.7); }
.tj-grid { scrollbar-width: thin; scrollbar-color: rgba(217, 180, 92, 0.5) rgba(255, 255, 255, 0.04); }
</style>
