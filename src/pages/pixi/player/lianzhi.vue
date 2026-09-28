<template>
  <div
    class="w-full h-90vh flex flex-col bg-gradient-to-br from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e] text-[#e0e0e0] overflow-hidden rounded-[1vh] relative">
    <!-- 背景装饰光晕 -->
    <div class="absolute -top-[10vh] -right-[10vh] w-[40vh] h-[40vh] rounded-full bg-[#f59e0b]/15 blur-[8vh] pointer-events-none"></div>
    <div class="absolute -bottom-[10vh] -left-[10vh] w-[35vh] h-[35vh] rounded-full bg-[#22c55e]/10 blur-[8vh] pointer-events-none"></div>

    <!-- 顶部标题栏 -->
    <div
      class="relative z-10 flex justify-between items-center px-[3vh] py-[2vh] border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <h2
        class="m-0 text-[3.6vh] font-bold bg-gradient-to-r from-[#f59e0b] to-[#ef4444] bg-clip-text text-transparent flex items-center gap-[1vh]">
        <span class="text-[3vh]">🏺</span> {{ L('lzWorkshop') }}
      </h2>
      <!-- 右上角：炼制等级（点击查看熟练度/等级效果）+ 配方入口 -->
      <div class="flex items-center gap-[1.5vh]">
        <el-popover
          placement="bottom"
          :width="380"
          trigger="click"
          popper-class="lz-lv-pop"
        >
          <template #reference>
            <span class="text-[2vh] font-bold text-[#fbbf24]/90 cursor-pointer transition-all hover:brightness-125">⚗️ {{ fmt('lzLevelLabel', { n: user.getLianzhiLevel() }) }}</span>
          </template>
          <div class="py-1vh">
            <div class="text-2.2vh font-bold text-[#b45309] mb-1.2vh">⚗️ {{ fmt('lzLevelLabel', { n: user.getLianzhiLevel() }) }}</div>
            <div class="text-1.8vh text-black mb-1.5vh">{{ L('lzCurEffect') }} <span class="text-[#16a34a] font-bold">{{ failReductionPct() }}%</span></div>
            <div class="text-1.8vh text-gray-600 mb-1vh">{{ L('lzLvProgress') }}</div>
            <div class="flex items-center gap-1.5vh mb-1vh">
              <div class="flex-1 h-2.2vh bg-#e5e7eb rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] transition-all duration-500" :style="{ width: lvProgressPct() + '%' }"></div>
              </div>
              <span class="text-1.8vh text-gray-600 whitespace-nowrap">{{ lvCurProficiency() }} / 100</span>
            </div>
            <div class="text-1.7vh text-gray-500" v-html="fmt('lzNeedLine', { n: lvNeedToNext(), t: user.getTotalLianzhiProficiency() })"></div>
          </div>
        </el-popover>
        <span class="text-[2vh] text-[#e0e0e0]/50">{{ L('lzUnlockedRecipes') }}</span>
        <el-badge :value="unlockedRecipes.length" :hidden="unlockedRecipes.length === 0" class="lz-badge">
          <el-button type="warning" round class="!h-[5vh] !px-[2.5vh] !text-[2.2vh] !font-bold"
            @click="recipePanelVisible = !recipePanelVisible">
            📜 {{ L('lzRecipes') }}
          </el-button>
        </el-badge>
      </div>
    </div>

    <!-- 配方面板（右上角弹出，显示已解锁配方，可一键炼制多个） -->
    <transition name="el-fade-in">
      <div v-if="recipePanelVisible"
        class="absolute top-[8vh] right-[2vh] z-20 w-[38vw] max-h-[60vh] overflow-y-auto npc-scrollbar rounded-2xl bg-black/85 border border-[#fbbf24]/30 backdrop-blur-md shadow-2xl p-[2.5vh]">
        <div class="flex items-center justify-between mb-[2vh]">
          <span class="text-[2.6vh] font-bold text-[#fbbf24]">📜 {{ L('lzUnlockedRecipes') }}</span>
          <span class="text-[1.6vh] text-[#e0e0e0]/40">{{ L('lzRecipePanelHint') }}</span>
        </div>
        <template v-if="unlockedRecipes.length > 0">
          <div v-for="r in unlockedRecipes" :key="r.id"
            class="mb-[1.5vh] rounded-xl bg-white/5 border border-white/10 p-[1.8vh]">
            <div class="flex items-center gap-[1.5vh] mb-[1vh]">
              <div class="w-[5.5vh] h-[5.5vh] rounded-lg bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img v-if="itemImg(r.icon)" :src="itemImg(r.icon)" class="w-full h-full object-contain" />
                <span v-else class="text-[2.5vh]">⚗️</span>
              </div>
              <div class="flex-1">
                <div class="text-[2.4vh] font-bold" :style="{ color: r.color }">{{ tr(r.name) }}</div>
                <div class="text-[1.6vh] text-[#e0e0e0]/50 mt-[0.3vh]">{{ tr(r.desc) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-[1vh] flex-wrap mb-[1.2vh]">
              <span class="text-[1.6vh] text-[#e0e0e0]/50">{{ L('lzMaterialsLabel') }}</span>
              <span v-for="(m, idx) in r.materials" :key="idx"
                class="text-[1.6vh] px-[1vh] py-[0.3vh] rounded bg-white/10 border border-white/10"
                :class="materialCount(m.name) >= 1 ? 'text-[#22c55e]' : 'text-[#ef4444]'">
                {{ tr(m.name) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[1.6vh] text-[#e0e0e0]/40">{{ fmt('lzNeedMaterials', { n: r.materials.length, p: user.getRecipeProficiency(r.id) }) }}</span>
              <span class="text-[1.6vh] font-bold" :class="failRatePct(r) > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'">{{ fmt('lzFailRate', { n: failRatePct(r) }) }}</span>
              <div class="flex items-center gap-[1vh]">
                <el-button size="small" round class="!text-[1.8vh] !font-bold"
                  :disabled="!canOneKeyCraft(r) || crafting" @click="craftOnce(r)"><template v-if="crafting">⏳ {{ L('lzCrafting') }}…</template><template v-else>⚒️ {{ L('lzCraftOne') }}</template></el-button>
                <el-button size="small" round type="warning" class="!text-[1.8vh] !font-bold"
                  :disabled="!canOneKeyCraft(r) || crafting" @click="oneKeyCraft(r)"><template v-if="crafting">⏳ {{ L('lzCrafting') }}…</template><template v-else>⚒️ {{ fmt('lzCraftBatch', { n: oneKeyMax(r) }) }}</template></el-button>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="text-center text-[2.2vh] text-[#e0e0e0]/40 py-[4vh]">
          {{ L('lzNoRecipe') }}<br />
          <span class="text-[1.8vh]">{{ L('lzNoRecipeHint') }}</span>
        </div>
      </div>
    </transition>

    <!-- 主区域 -->
    <div class="relative z-10 flex-1 flex overflow-hidden min-h-0">
      <!-- 左侧：材料背包（只显示材料） -->
      <div class="w-[42%] border-r border-white/10 flex flex-col overflow-hidden min-h-0 bg-black/10">
        <div class="text-[2.2vh] text-[#e0e0e0]/50 px-[2vh] py-[1.5vh] tracking-wider flex-shrink-0 border-b border-white/10 flex items-center justify-between">
          <span>🎒 {{ L('lzMaterialBag') }}</span>
          <span class="text-[1.6vh] text-[#e0e0e0]/40">{{ L('lzClickToAdd') }}</span>
        </div>
        <div v-if="materialItems.length > 0"
          class="flex-1 overflow-y-auto npc-scrollbar grid grid-cols-3 gap-[1.5vh] p-[2vh] content-start">
          <div v-for="item in materialItems" :key="item.name"
            class="relative rounded-xl bg-white/5 border border-white/10 p-[1.5vh] cursor-pointer transition-all hover:bg-white/10 hover:border-[#fbbf24]/40 text-center"
            :class="potMaterials.filter(m => m.name === item.name).length > 0 ? 'ring-2 ring-[#fbbf24]' : ''"
            @click="addToPot(item)">
            <div class="w-[6vh] h-[6vh] mx-auto rounded-lg bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden mb-[0.8vh]">
              <img v-if="itemImg(item.img)" :src="itemImg(item.img)" class="w-full h-full object-contain" />
              <span v-else class="text-[2.5vh]">{{ item.name.charAt(0) }}</span>
            </div>
            <div class="text-[1.9vh] font-medium text-white truncate">{{ tr(item.name) }}</div>
            <div class="text-[1.6vh] text-[#e0e0e0]/40">×{{ item.num }}</div>
            <!-- 已放入大锅的数量角标 -->
            <div v-if="inPotCount(item.name) > 0"
              class="absolute top-[0.5vh] right-[0.5vh] w-[3vh] h-[3vh] rounded-full bg-[#f59e0b] text-black text-[1.6vh] font-bold flex items-center justify-center">
              {{ inPotCount(item.name) }}
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-[2.2vh] text-[#e0e0e0]/40">
          {{ L('lzNoMaterial') }}
        </div>
      </div>

      <!-- 右侧：大锅 + 炼制 -->
      <div class="flex-1 flex flex-col items-center justify-center p-[3vh] relative">
        <!-- 大锅 -->
        <div class="relative w-[34vh] h-[28vh]">
          <!-- 锅身 -->
          <div class="absolute inset-0 rounded-[50%_50%_40%_40%_/60%_60%_20%_20%] bg-gradient-to-b from-[#2d2d3a] to-[#1a1a2e] border-[0.8vh] border-[#f59e0b]/60 shadow-[0_0_4vh_rgba(245,158,11,0.3)] flex items-end justify-center pb-[4vh]">
            <!-- 4 个材料槽位（放在锅里） -->
            <div class="grid grid-cols-2 gap-[1.5vh]">
              <div v-for="(slot, idx) in potSlots" :key="idx"
                class="w-[9vh] h-[9vh] rounded-xl bg-black/40 border-2 border-dashed flex items-center justify-center transition-all cursor-pointer overflow-hidden"
                :class="slot ? 'border-[#fbbf24]/60 bg-[#fbbf24]/10' : 'border-white/20 hover:border-[#fbbf24]/40'"
                @click="removeFromPot(idx)">
                <template v-if="slot">
                  <img v-if="itemImg(slot.img)" :src="itemImg(slot.img)" class="w-full h-full object-contain" />
                  <span v-else class="text-[3vh]">{{ slot.name.charAt(0) }}</span>
                </template>
                <span v-else class="text-[2vh] text-white/20">+</span>
              </div>
            </div>
          </div>
          <!-- 锅盖装饰 -->
          <div class="absolute -top-[2.5vh] left-1/2 -translate-x-1/2 w-[14vh] h-[4vh] rounded-full bg-gradient-to-r from-[#3a3a4a] to-[#24242f] border-[0.4vh] border-[#f59e0b]/40"></div>
          <!-- 冒泡动画（有材料时） -->
          <div v-if="potMaterials.length > 0" class="absolute -top-[6vh] left-1/2 -translate-x-1/2 flex gap-[1vh]">
            <span class="bubble w-[1.5vh] h-[1.5vh] rounded-full bg-[#f59e0b]/50" style="animation-delay:0s"></span>
            <span class="bubble w-[2vh] h-[2vh] rounded-full bg-[#f59e0b]/60" style="animation-delay:0.3s"></span>
            <span class="bubble w-[1.2vh] h-[1.2vh] rounded-full bg-[#ef4444]/50" style="animation-delay:0.6s"></span>
          </div>
        </div>

        <!-- 已放入的材料提示 -->
        <div class="mt-[2vh] text-[2vh] text-[#e0e0e0]/50">
          {{ potMaterials.length > 0 ? fmt('lzInPot', { n: potMaterials.length }) : L('lzPotHint') }}
        </div>

        <!-- 炼制按钮 -->
        <el-button type="danger" size="large" round
          class="!h-[7vh] !px-[6vh] !text-[2.8vh] !font-bold mt-[2vh] shadow-lg"
          :disabled="potMaterials.length < 2 || crafting" @click="doLianzhi">
          <template v-if="crafting">⏳ {{ L('lzCraftingMain') }}…</template>
          <template v-else>🔥 {{ L('lzStart') }}</template>
        </el-button>

        <!-- ⏳ 炼制进度条：走完才真正消耗材料产出 -->
        <div v-if="crafting" class="mt-[2vh] w-[34vh] flex flex-col gap-[1vh]">
          <div class="w-full h-[2.4vh] rounded-full bg-white/10 border border-[#fbbf24]/40 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#ef4444] transition-all duration-100"
              :style="{ width: craftProgress + '%' }"></div>
          </div>
          <div class="text-center text-[1.9vh] text-[#e0e0e0]/80 font-medium">
            ⏳ {{ fmt('lzProgress', { n: Math.round(craftProgress), s: Math.ceil(craftLeftSec) }) }}
          </div>
        </div>

        <!-- 提示：炼制失败材料会消失 -->
        <div class="mt-[1.5vh] text-[1.6vh] text-[#e0e0e0]/30 text-center leading-relaxed">
          {{ L('lzTip1') }}<br />
          {{ L('lzTip2') }}<br />
          {{ L('lzTip3') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch , onMounted } from 'vue'

import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
import { tr } from "@/i18n";
import { createDaojuSpine } from "../fight/CardSpine";
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
const emit = defineEmits(['crafting-change']); // 炼制中状态上报（宿主据此锁定弹窗关闭）

// ==================== 状态 ====================
// 大锅里的材料槽（最多 4 个，每个槽存 { name, img } 或 null）
const potSlots = ref([null, null, null, null]);
// 配方面板显隐
const recipePanelVisible = ref(false);

// ==================== 计算属性 ====================
// 背包中只显示材料（status === 'material'，排除货币/消耗品/道具/卡牌）
const materialItems = computed(() => {
  return (user.inventory || []).filter(item =>
    (item.status === 'material') && item.num > 0
  );
});

// 大锅里已放入的材料（非空槽）
const potMaterials = computed(() => {
  return potSlots.value.filter(s => s !== null);
});

// 已解锁配方列表（从 store 读取）
const unlockedRecipes = computed(() => {
  return user.getLianzhiRecipes().filter(r => user.isLianzhiRecipeUnlocked(r.id));
});

// ==================== 方法 ====================
// 🖼️ 物品图标：daojuall spine 皮肤图（与合成工坊/背包同一套渲染链路）
const daojuImgMap = ref({});          // skin名 → dataURL 图片
const _loadingSkins = new Set();      // 防并发重复加载同一皮肤

// 收集全部需要渲染的皮肤：配方 icon + 材料背包道具 img + 大锅槽 img
const allSkins = computed(() => {
  const set = new Set();
  for (const r of unlockedRecipes.value) if (r.icon) set.add(r.icon);
  for (const it of materialItems.value) if (it.img) set.add(it.img);
  for (const sl of potSlots.value) if (sl && sl.img) set.add(sl.img);
  return [...set];
});

// 渲染单个皮肤（复用 window.__daojuImgMap 全局缓存，未命中再生成）
async function ensureSkin(skin) {
  if (!skin || daojuImgMap.value[skin]) return;
  if (_loadingSkins.has(skin)) return;
  _loadingSkins.add(skin);
  try {
    const pre = (typeof window !== 'undefined' && window.__daojuImgMap) || {};
    if (pre[skin]) { daojuImgMap.value[skin] = pre[skin]; return; }
    // ⚠️ createDaojuSpine 返回 { canvas, destroy }，需 toDataURL() 转成图片 URL
    const result = await createDaojuSpine(skin, 80, 80);
    if (result && result.canvas) {
      const url = result.canvas.toDataURL();
      daojuImgMap.value[skin] = url;
      if (window.__daojuImgMap) window.__daojuImgMap[skin] = url;
      result.destroy && result.destroy();
    }
  } catch (e) {
    console.warn('炼制 spine 皮肤加载失败:', skin, e);
  } finally {
    _loadingSkins.delete(skin);
  }
}
async function loadDaojuImgs() {
  for (const skin of allSkins.value) await ensureSkin(skin);
}
// 材料背包 / 大锅 / 配方变化时自动补加载缺失皮肤
watch(allSkins, loadDaojuImgs, { immediate: true });

// 物品图标（spine 皮肤图，未加载完成时返回空 → 显示兜底字符）
function itemImg(src) {
  return (src && daojuImgMap.value[src]) || '';
}

// 配方实际失败率（炼制等级减免后）
function failRatePct(recipe) {
  const base = recipe.failRate || 0;
  const real = Math.max(0, base - user.getLianzhiFailReduction());
  return Math.round(real * 100);
}
// 炼制等级失败率减免（百分比）
function failReductionPct() {
  return Math.round(user.getLianzhiFailReduction() * 100)
}
// 本级内熟练度进度（0-99，每级 100 点）
function lvCurProficiency() {
  return user.getTotalLianzhiProficiency() % 100
}
// 进度条百分比（0-100）
function lvProgressPct() {
  return Math.min(100, user.getTotalLianzhiProficiency() % 100)
}
// 距下一级还需多少熟练度
function lvNeedToNext() {
  return 100 - (user.getTotalLianzhiProficiency() % 100)
}

// 某材料在背包中的数量
function materialCount(name) {
  const item = user.inventory.find(i => i.name === name)
  return item ? item.num : 0
}

// 某材料已放入大锅的数量
function inPotCount(name) {
  return potMaterials.value.filter(m => m.name === name).length
}

// 点击材料放入大锅（找空槽；同名材料可放多个）
function addToPot(item) {
  if (crafting.value) return // 炼制中不可操作材料
  const idx = potSlots.value.findIndex(s => s === null)
  if (idx === -1) {
    ElMessText(L('lzPotMax4'), 'warning')
    return
  }
  potSlots.value[idx] = { name: item.name, img: item.img }
}

// 点击槽位移除材料
function removeFromPot(idx) {
  if (crafting.value) return // 炼制中不可操作材料
  if (potSlots.value[idx]) {
    potSlots.value[idx] = null
  }
}

// ==================== ⏳ 炼制进度（每次 LIANZHI_TIME 秒） ====================
const LIANZHI_TIME = 2; // ⏱️ 每次炼制耗时（秒）
const crafting = ref(false);     // 是否炼制中
const craftProgress = ref(0);    // 炼制进度 0~100
const craftLeftSec = ref(0);     // 剩余秒数
let craftTimer = null;

function stopCraftTimer() {
  if (craftTimer) { clearInterval(craftTimer); craftTimer = null; }
  if (crafting.value) {
    crafting.value = false;
    emit('crafting-change', false);
  }
}

/** 启动炼制进度：totalSec 秒后执行 onDone */
function startCraft(totalSec, onDone) {
  stopCraftTimer();
  crafting.value = true;
  emit('crafting-change', true);
  craftProgress.value = 0;
  craftLeftSec.value = totalSec;
  const start = performance.now();
  craftTimer = setInterval(() => {
    const el = (performance.now() - start) / 1000;
    craftProgress.value = Math.min(100, (el / totalSec) * 100);
    craftLeftSec.value = Math.max(0, totalSec - el);
    if (el >= totalSec) {
      stopCraftTimer();
      crafting.value = false;
      craftProgress.value = 100;
      if (onDone) onDone();
    }
  }, 50);
}

// 执行炼制（⏳ 先走进度条，完成后才真正匹配/消耗材料）
function doLianzhi() {
  const names = potMaterials.value.map(m => m.name)
  if (names.length < 2) {
    ElMessText(L('lzNeedMin2'), 'warning')
    return
  }
  if (crafting.value) return
  ElMessText(L('lzStartWait'), 'info')
  startCraft(LIANZHI_TIME, () => {
    const result = user.tryLianzhi(names)
    // 清空大锅（材料已消耗）
    potSlots.value = [null, null, null, null]
    if (result.ok) {
      ElMessText(result.msg || L('lzSuccess'), 'success')
      if (result.unlocked) {
        ElMessText(fmt('lzUnlockRecipe', { n: result.recipe.name }), 'success')
      }
    } else {
      ElMessText(result.msg || L('lzFail'), 'error')
    }
  })
}

// ==================== 一键炼制（配方面板） ====================
// 某配方材料是否能支撑炼制（每种材料至少 1 个）
function canOneKeyCraft(recipe) {
  // 材料可能重复（同名多个），统计每个名称需要的数量
  const need = {}
  recipe.materials.forEach(m => { need[m.name] = (need[m.name] || 0) + 1 })
  return Object.entries(need).every(([name, num]) => materialCount(name) >= num)
}

// 单个炼制：按配方材料炼制 1 次（每次消耗一组材料，⏳ 走进度条）
function craftOnce(recipe) {
  if (crafting.value) return
  if (!canOneKeyCraft(recipe)) {
    ElMessText(L('lzNoMaterials'), 'warning')
    return
  }
  const matNames = recipe.materials.map(m => m.name)
  ElMessText(fmt('lzStartRecipe', { n: recipe.name }), 'info')
  startCraft(LIANZHI_TIME, () => {
    const result = user.tryLianzhi(matNames)
    if (result.ok) {
      ElMessText(result.msg || L('lzSuccess'), 'success')
      if (!user.isLianzhiRecipeUnlocked(recipe.id)) {
        // 理论上一键炼制前配方必已解锁（只对已解锁配方显示），兜底解锁
        user.unlockLianzhiRecipe(recipe.id)
      }
    } else {
      ElMessText(result.msg || L('lzFail'), 'error')
    }
  })
}

// 某配方最多可一键炼制数量（取材料能支撑的最小值，同名材料按整除）
function oneKeyMax(recipe) {
  const need = {}
  recipe.materials.forEach(m => { need[m.name] = (need[m.name] || 0) + 1 })
  let max = Infinity
  for (const [name, num] of Object.entries(need)) {
    max = Math.min(max, Math.floor(materialCount(name) / num))
  }
  // 🔢 一键炼制上限 10 个（材料更多也只批量 10 个）
  return isFinite(max) ? Math.min(10, max) : 0
}

// 一键炼制：按配方材料自动填充大锅并炼制（支持批量，⏳ 总耗时 = 件数 × 单次耗时）
function oneKeyCraft(recipe) {
  if (crafting.value) return
  const batch = oneKeyMax(recipe)
  if (batch <= 0) {
    ElMessText(L('lzNoMaterials'), 'warning')
    return
  }
  ElMessText(fmt('lzStartBatch', { n: recipe.name, b: batch }), 'info')
  startCraft(batch * LIANZHI_TIME, () => {
    // 批量炼制：循环 batch 次（每次消耗一组材料）
    let success = 0
    for (let i = 0; i < batch; i++) {
      const matNames = recipe.materials.map(m => m.name)
      const result = user.tryLianzhi(matNames)
      if (result.ok) success++
    }
    if (success > 0) {
      ElMessText(fmt('lzBatchSuccess', { n: success }), 'success')
      if (!user.isLianzhiRecipeUnlocked(recipe.id)) {
        // 理论上一键炼制前配方必已解锁（只对已解锁配方显示），兜底解锁
        user.unlockLianzhiRecipe(recipe.id)
      }
    } else {
      ElMessText(L('lzFail'), 'error')
    }
  })
}

// 组件卸载时清理炼制计时器
onBeforeUnmount(() => {
  stopCraftTimer()
})

</script>

<style scoped>
.npc-scrollbar::-webkit-scrollbar {
  width: 1vh;
}

.npc-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.4);
  border-radius: 1vh;
}

/* 大锅冒泡动画 */
.bubble {
  animation: lz-bubble 1.2s ease-in-out infinite;
  transform: translateY(0);
}

@keyframes lz-bubble {
  0% { transform: translateY(0) scale(0.8); opacity: 0.4; }
  50% { transform: translateY(-2vh) scale(1); opacity: 0.9; }
  100% { transform: translateY(-4vh) scale(0.6); opacity: 0; }
}

/* 配方角标 */
.lz-badge :deep(.el-badge__content) {
  font-size: 1.4vh;
  height: 2.6vh;
  line-height: 2.6vh;
  padding: 0 0.8vh;
}
</style>
