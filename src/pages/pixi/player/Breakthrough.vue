<template>
  <div
    class="w-full h-75vh flex flex-col bg-gradient-to-br from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e] text-[#e0e0e0] overflow-hidden rounded-[1vh] relative ">
    <!-- 主区域 -->
    <div class="relative z-10 flex-1 flex overflow-hidden min-h-0">
      <!-- 左侧：可投入道具（只显示突破相关道具） -->
      <div class="w-[38%] border-r border-white/10 flex flex-col overflow-hidden min-h-0 bg-black/10">
        <div class="text-[2.2vh] text-[#e0e0e0]/50 px-[2vh] py-[1.5vh] tracking-wider flex-shrink-0 border-b border-white/10 flex items-center justify-between">
          <span>💠 {{ L('btInvestItems') }}</span>
          <span class="text-[1.6vh] text-[#e0e0e0]/40">{{ L('btDragHint') }}</span>
        </div>
        <div v-if="availableItems.length > 0" class="flex-1 overflow-y-auto npc-scrollbar grid grid-cols-3 gap-[1.5vh] p-[2vh] content-start">
          <div v-for="item in availableItems" :key="item.name"
            class="relative rounded-xl bg-white/5 border border-white/10 p-[1.5vh] cursor-pointer transition-all hover:bg-white/10 text-center touch-none select-none"
            :class="[
              item.bType === 'crystal' ? 'hover:border-[#fbbf24]/40' : 'hover:border-[#22c55e]/40',
              isInPot(item.name) ? 'ring-2 ring-[#fbbf24]' : ''
            ]"
            @pointerdown="onPointerDown(item, $event)">
            <div class="w-[6vh] h-[6vh] mx-auto rounded-lg bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden mb-[0.8vh]"
              :style="item.bType === 'crystal' ? { borderColor: crystalColor(item) } : {}">
              <img v-if="itemImg(itemSkin(item))" :src="itemImg(itemSkin(item))" class="w-full h-full object-contain" />
              <span v-else class="text-[2.5vh]">💎</span>
            </div>
            <div class="text-[1.9vh] font-medium text-white truncate">{{ tr(item.name) }}</div>
            <div class="text-[1.6vh] text-[#e0e0e0]/40 mt-[0.3vh]">×{{ item.num }}</div>
            <div class="text-[1.5vh] mt-[0.4vh] font-bold" :class="item.bType === 'crystal' ? 'text-[#fbbf24]' : 'text-[#22c55e]'">
              {{ item.bType === 'crystal' ? fmt('btQuality', { n: item.bCrystal }) : `×${(1 + boosterBonusOf(item.name)).toFixed(2)}` }}
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex flex-col items-center justify-center text-[2.2vh] text-[#e0e0e0]/40 gap-[1vh]">
          <span>{{ L('btNoItems') }}</span>
          <span class="text-[1.7vh] text-[#e0e0e0]/25">{{ L('btItemKinds') }}</span>
        </div>
      </div>

      <!-- 右侧：突破台 -->
      <div class="flex-1 flex flex-col items-center justify-center p-[3vh] relative min-h-0 overflow-y-auto npc-scrollbar">
        <!-- 阶段说明 -->
        <div v-if="nextCfg" class="text-[1.9vh] text-[#e0e0e0]/50 mb-[1.5vh] text-center leading-relaxed">
          {{ fmt('btStageLabel', { n: nextCfg.stage }) }} <span class="text-[#fbbf24] font-bold">{{ Math.round(nextCfg.baseRate * 100) }}%</span>
        </div>

        <!-- 4 个投入槽（槽0=魔晶，槽1-3=特殊材料） -->
        <div class="flex items-center gap-[1.5vh] mb-[1vh]">
          <div v-for="(slot, idx) in potSlots" :key="idx"
            class="w-[10vh] h-[10vh] rounded-xl bg-black/40 border-2 border-dashed flex items-center justify-center transition-all cursor-pointer overflow-hidden relative"
            :class="slot
              ? (idx === 0 ? 'border-[#fbbf24]/60 bg-[#fbbf24]/10' : 'border-[#22c55e]/60 bg-[#22c55e]/10')
              : 'border-white/20 hover:border-[#fbbf24]/40'"
            :ref="el => potSlotEls[idx] = el"
            @click="removeFromPotClick(idx)">
            <template v-if="slot">
              <img v-if="itemImg(itemSkin(slot))" :src="itemImg(itemSkin(slot))" class="w-full h-full object-contain" />
              <span v-else class="text-[3vh]">💎</span>
              <span class="absolute bottom-[0.4vh] left-1/2 -translate-x-1/2 text-[1.4vh] font-bold whitespace-nowrap"
                :class="idx === 0 ? 'text-[#fbbf24]' : 'text-[#22c55e]'">
                {{ idx === 0 ? fmt('btQuality', { n: slot.bCrystal }) : `×${(1 + boosterBonusOf(slot.name)).toFixed(2)}` }}
              </span>
            </template>
            <div v-else class="text-center text-white/20">
              <div class="text-[2.2vh]">+</div>
              <div class="text-[1.3vh]">{{ idx === 0 ? L('btCrystalSlot') : L('btMatSlot') }}</div>
            </div>
          </div>
        </div>
        <div class="text-[1.6vh] text-[#e0e0e0]/30 mb-[2vh]">
          {{ L('btDragDesc') }}
        </div>

        <!-- 预览区 -->
        <template v-if="preview">
          <div class="w-[52vh] rounded-2xl bg-white/5 border border-white/10 p-[2vh] mb-[1.5vh]">
            <div class="flex items-center justify-between mb-[1vh]">
              <span class="text-[2.2vh] font-bold text-[#fbbf24]">{{ L('btPreview') }}</span>
              <span class="text-[1.9vh] font-bold" :class="preview.rate >= 0.6 ? 'text-[#22c55e]' : preview.rate >= 0.4 ? 'text-[#fbbf24]' : 'text-[#ef4444]'">
                {{ fmt('btSuccessRate', { n: Math.round(preview.rate * 100) }) }}
              </span>
            </div>
            <!-- 成功率进度条 -->
            <div class="w-full h-[2vh] rounded-full bg-white/10 border border-white/10 overflow-hidden mb-[1.5vh]">
              <div class="h-full rounded-full transition-all duration-300"
                :class="preview.rate >= 0.6 ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a]' : preview.rate >= 0.4 ? 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]' : 'bg-gradient-to-r from-[#ef4444] to-[#dc2626]'"
                :style="{ width: (preview.rate * 100) + '%' }"></div>
            </div>
            <div class="text-[1.6vh] text-[#e0e0e0]/40 mb-[1vh]">
              {{ fmt('btBase', { n: Math.round(nextCfg.baseRate * 100) }) }} <span class="text-white/20">-</span>
              {{ L('btQualityPenalty') }} <span class="text-[#ef4444]">{{ Math.round((BREAKTHROUGH_QUALITY_PENALTY[preview.quality] || 0) * 100) }}%</span>
              <span v-if="preview.compensate > 0" class="text-[#22c55e]">{{ fmt('btCompensate', { n: preview.compensate }) }}</span>
              <span v-if="boosterNames.length > 0" class="text-[#22c55e]">{{ L('btMaterials') }} {{ boosterMultText }}</span>
            </div>
            <!-- 属性提升 -->
            <div class="flex flex-wrap gap-[1vh] mb-[1vh]">
              <span class="text-[1.8vh] px-[1.2vh] py-[0.4vh] rounded-lg bg-white/5 border border-white/10 text-[#fbbf24]">{{ fmt('btAttrHp', { n: preview.attr.maxHp }) }}</span>
              <span class="text-[1.8vh] px-[1.2vh] py-[0.4vh] rounded-lg bg-white/5 border border-white/10 text-[#ef4444]">{{ fmt('btAttrAtk', { n: preview.attr.attack }) }}</span>
              <span class="text-[1.8vh] px-[1.2vh] py-[0.4vh] rounded-lg bg-white/5 border border-white/10 text-[#409EFF]">{{ fmt('btAttrArmor', { n: preview.attr.armor }) }}</span>
              <span class="text-[1.8vh] px-[1.2vh] py-[0.4vh] rounded-lg bg-white/5 border border-white/10 text-[#5cc0ff]">{{ fmt('btAttrSpeed', { n: preview.attr.speed }) }}</span>
              <span class="text-[1.8vh] px-[1.2vh] py-[0.4vh] rounded-lg bg-white/5 border border-white/10 text-[#a78bfa]">{{ fmt('btAttrTalent', { n: preview.talent }) }}</span>
            </div>
            <!-- 品质奖励说明 -->
            <div class="text-[1.6vh] text-[#e0e0e0]/40 mb-[1vh]">{{ fmt('btQualityMult', { n: nextCfg.qualityBonus[preview.quality] || 1 }) }}</div>
            <!-- 随机被动（品质3+） -->
            <div v-if="preview.quality >= 3" class="rounded-lg bg-[#a78bfa]/10 border border-[#a78bfa]/30 p-[1.2vh]">
              <div class="text-[1.7vh] font-bold text-[#a78bfa] mb-[0.5vh]">🎲 {{ L('btPassiveUnlock') }}</div>
              <div v-if="preview.passive" class="text-[1.8vh] text-[#e0e0e0]">
                <span class="text-[#fbbf24] font-bold">{{ tr(preview.passive.name) }}</span> — {{ tr(preview.passive.desc) }}
              </div>
            </div>
          </div>

          <!-- 溢出经验提示 -->
          <div v-if="user.pixi?.player?.overflowExp > 0" class="text-[1.7vh] text-[#fbbf24]/80 mb-[1.5vh]">
            💡 {{ fmt('btOverflowExp', { n: user.pixi.player.overflowExp }) }}
          </div>

          <!-- 确认突破 -->
          <el-button type="warning" size="large" round
            class="!h-[7vh] !px-[6vh] !text-[2.8vh] !font-bold shadow-lg"
            :disabled="!potSlots[0]" @click="doBreakthrough">
            💎 {{ L('btStart') }}
          </el-button>
        </template>

        <!-- 未投入魔晶时的提示 -->
        <template v-else>
          <div class="text-[2.2vh] text-[#e0e0e0]/40 text-center mb-[2vh]">
            {{ nextCfg ? L('btNeedCrystal') : L('btAllDone') }}
          </div>
          <!-- 已解锁被动展示 -->
          <div v-if="user.pixi?.player?.breakthroughPassives?.length" class="w-[52vh] rounded-2xl bg-white/5 border border-white/10 p-[2vh]">
            <div class="text-[2vh] font-bold text-[#a78bfa] mb-[1vh]">🎲 {{ L('btUnlockedPassives') }}</div>
            <div v-for="p in user.pixi.player.breakthroughPassives" :key="p.id + p.fromStage"
              class="flex items-center gap-[1vh] text-[1.9vh] mb-[0.8vh] last:mb-0">
              <span class="text-[#fbbf24] font-bold">{{ tr(p.name) }}</span>
              <span class="text-[#e0e0e0]/60">{{ tr(p.desc) }}</span>
            </div>
          </div>
        </template>

        <!-- 已完成的突破记录 -->
        <div v-if="user.pixi?.player?.breakthroughLog?.length" class="mt-[2vh] w-[52vh] rounded-2xl bg-black/20 border border-white/5 p-[2vh]">
          <div class="text-[1.8vh] font-bold text-[#e0e0e0]/60 mb-[1vh]">📜 {{ L('btLog') }}</div>
          <div v-for="(lg, idx) in user.pixi.player.breakthroughLog" :key="idx" class="text-[1.7vh] text-[#e0e0e0]/50 mb-[0.5vh] last:mb-0">
            {{ fmt('btLogLine', { s: lg.stage, lv: lg.level, q: lg.quality, t: lg.talent, attr: logAttrText(lg) }) }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 🖱️ 拖拽幽灵（跟随指针） -->
  <teleport to="body">
    <div v-if="dragItem" class="fixed z-[99999] pointer-events-none select-none"
      :style="{ left: (dragX - 40) + 'px', top: (dragY - 40) + 'px', width: '80px', height: '80px' }">
      <div class="w-full h-full rounded-xl bg-black/75 border-2 border-[#fbbf24]/60 flex items-center justify-center overflow-hidden shadow-2xl">
        <img v-if="itemImg(dragItem.img)" :src="itemImg(dragItem.img)" class="w-full h-full object-contain" />
        <span v-else class="text-[4vh]">💎</span>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed , onMounted, watch } from 'vue'

import { useCounterStore } from "@/store/counter";
import { BREAKTHROUGH_QUALITY_PENALTY } from "@/store/configs";
import { ElMessText } from "@/pages/zujian/utils.js";
import { tr } from "@/i18n";
import { createDaojuSpine } from "../fight/CardSpine"; // 🖼️ daojuall spine 皮肤渲染（与背包/合成工坊同一套链路）
import { ITEM_SKIN_MAP } from "../dungeon/config"; // 🎨 物品名 → daojuall 皮肤名回退
import { t } from '@/i18n';

const user = useCounterStore();
const langVersion = ref(0)
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++)
function L(key) { langVersion.value; return t(key); }
function fmt(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
const emit = defineEmits(['breakthrough']);

// 特殊材料成功率加成：按当前突破阶段从 store 查表（如幸运草一破 15% / 二破 10%）
function boosterBonusOf(name) {
  if (!user.getBoosterBonus) return 0;
  return user.getBoosterBonus(name, nextCfg?.value?.stage);
}

// ==================== 状态 ====================
// 4 个投入槽：槽0 = 魔晶（只能一种品质），槽1-3 = 特殊材料（每格 1 个）
const potSlots = ref([null, null, null, null]);

// ==================== 计算属性 ====================
const nextCfg = computed(() => user.getNextBreakthroughCfg());

// 可投入道具：只显示突破相关道具（bType），且数量 > 0；魔力晶核是抽卡资源，不参与突破
const availableItems = computed(() => {
  return (user.inventory || []).filter(i => i.bType && i.num > 0 && i.name !== '魔力晶核');
});

// ==================== 🖼️ 图片（daojuall spine 皮肤 → assets webp 兜底） ====================
const daojuImgMap = ref({})
const _loadingSkins = new Set()
const ASSETS_FALLBACK = new Set(['jinghe', 'jinbi', 'mojing', 'suipian', 'caoyao', 'shui', 'yaoshui_hp', 'yaoshui_hp_large', 'yaoshui_mp', 'heimi'])
// 🎨 道具皮肤名：显式 img 优先，缺失时按物品名回退 ITEM_SKIN_MAP
function itemSkin(item) {
  if (!item) return ''
  return (item.img && String(item.img).trim()) || ITEM_SKIN_MAP[item.name] || ''
}
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
function assetUrl(src) {
  try { return new URL(`../../../assets/daoju/${src}.webp`, import.meta.url).href } catch (e) { return '' }
}
function itemImg(src) {
  if (!src) return ''
  if (daojuImgMap.value[src]) return daojuImgMap.value[src]
  if (ASSETS_FALLBACK.has(src)) return assetUrl(src)
  return ''
}
// 可投入道具变化时批量渲染皮肤图
watch(() => availableItems.value.map(i => itemSkin(i)).filter(Boolean).join(','), (list) => {
  for (const sk of new Set(list.split(',').filter(Boolean))) ensureSkin(sk)
}, { immediate: true })

const boosterNames = computed(() => potSlots.value.slice(1).filter(s => s).map(s => s.name));
// 材料成功率乘法叠加系数（每个材料 ×(1+加成)，如 ×1.10 ×1.15）
const boosterMult = computed(() => boosterNames.value.reduce((m, n) => m * (1 + boosterBonusOf(n)), 1));
const boosterMultText = computed(() => boosterNames.value.map(n => '×' + (1 + boosterBonusOf(n)).toFixed(2)).join(' '));

const preview = computed(() => {
  if (!potSlots.value[0]) return null;
  return user.calcBreakthroughPreview(potSlots.value[0].name, boosterNames.value);
});

// ==================== 方法 ====================
function crystalColor(item) {
  const map = { 1: '#8B5CF6', 2: '#409EFF', 3: '#F56C6C', 4: '#a78bfa' };
  return map[item.bCrystal] || '#fbbf24';
}
// 魔晶品质已无吸收上限，任何品质都可投入
function isInPot(name) {
  return potSlots.value.some(s => s && s.name === name);
}
// 🖱️ 拖拽放入（Pointer Events：兼容鼠标 + 触摸）
const dragItem = ref(null);
const dragX = ref(0);
const dragY = ref(0);
const potSlotEls = ref([]);
const suppressClick = ref(false);

function onPointerDown(item, e) {
  dragItem.value = item;
  dragX.value = e.clientX;
  dragY.value = e.clientY;
  if (e.preventDefault) e.preventDefault();
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}
function onPointerMove(e) {
  if (!dragItem.value) return;
  dragX.value = e.clientX;
  dragY.value = e.clientY;
}
function onPointerUp(e) {
  if (!dragItem.value) return;
  // 判断落点是否在某个槽位内
  let targetIdx = -1;
  const els = potSlotEls.value || [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      targetIdx = i;
      break;
    }
  }
  if (targetIdx >= 0) {
    addToPot(dragItem.value);
    suppressClick.value = true; // 忽略拖放后触发的槽位点击（避免刚放入就被移除）
  }
  cleanupDrag();
}
function cleanupDrag() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  dragItem.value = null;
}
function removeFromPotClick(idx) {
  if (suppressClick.value) { suppressClick.value = false; return; }
  removeFromPot(idx);
}
function addToPot(item) {
  if (item.bType === 'crystal') {
    potSlots.value[0] = item;
  } else {
    // 特殊材料：每格 1 个，不可重复
    if (isInPot(item.name)) {
      ElMessText(fmt('btDupItem', { n: item.name }), 'warning');
      return;
    }
    const idx = potSlots.value.findIndex((s, i) => i > 0 && s === null);
    if (idx === -1) { ElMessText(L('btSlotsFull'), 'warning'); return; }
    potSlots.value[idx] = item;
  }
}
function removeFromPot(idx) {
  potSlots.value[idx] = null;
}
function doBreakthrough() {
  if (!potSlots.value[0]) return;
  const res = user.tryBreakthrough(potSlots.value[0].name, boosterNames.value);
  if (res.ok) {
    potSlots.value = [null, null, null, null];
    let msg = `🎉 ${res.msg}`;
    if (res.passive) msg += '\n' + fmt('btPassiveUnlocked', { n: res.passive.name, d: res.passive.desc });
    if (res.overflowApplied > 0) msg += '\n' + fmt('btOverflowApplied', { n: res.overflowApplied });
    ElMessText(msg, 'success');
    emit('breakthrough', res);
  } else if (res.fail) {
    potSlots.value = [null, null, null, null];
    ElMessText(`😵 ${res.msg}`, 'error');
  } else {
    ElMessText(res.msg || L('btFail'), 'warning');
  }
}
function logAttrText(lg) {
  const parts = [];
  if (lg.attr?.maxHp) parts.push(fmt('btLogHp', { n: lg.attr.maxHp }));
  if (lg.attr?.attack) parts.push(fmt('btLogAtk', { n: lg.attr.attack }));
  if (lg.attr?.armor) parts.push(fmt('btLogArmor', { n: lg.attr.armor }));
  if (lg.attr?.speed) parts.push(fmt('btLogSpeed', { n: lg.attr.speed }));
  return parts.join(' / ');
}

</script>
