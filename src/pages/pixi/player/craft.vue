<template>
    <div class="w-full h-full">
    <div
        class="w-full h-90vh flex flex-col bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-[#e0e0e0] overflow-hidden rounded-[1vh] relative">
        <!-- 背景装饰光晕 -->
        <div
            class="absolute -top-[10vh] -right-[10vh] w-[40vh] h-[40vh] rounded-full bg-[#f59e0b]/15 blur-[8vh] pointer-events-none">
        </div>
        <div
            class="absolute -bottom-[10vh] -left-[10vh] w-[35vh] h-[35vh] rounded-full bg-[#22c55e]/10 blur-[8vh] pointer-events-none">
        </div>

        <!-- 顶部标题栏 -->
        <div
            class="relative z-10 flex justify-between items-center px-[3vh] py-[2vh] border-b border-white/10 bg-black/20 backdrop-blur-sm">
            <h2
                class="m-0 text-[3.6vh] font-bold bg-gradient-to-r from-[#f59e0b] to-[#22c55e] bg-clip-text text-transparent flex items-center gap-[1vh]">
                <span class="text-[3vh]">⚗️</span> {{ L('craftWorkshop') }}
            </h2>
            <span class="text-[2.2vh] text-[#e0e0e0]/60">{{ L('craftSubtitle') }}</span>
        </div>

        <div class="relative z-10 flex-1 flex overflow-hidden min-h-0">
            <!-- 左侧：全部可合成图纸（无分类） -->
            <div class="w-[34%] border-r border-white/10 flex flex-col overflow-hidden min-h-0">
                <div
                    class="text-[2.2vh] text-[#e0e0e0]/50 px-[2vh] py-[1.5vh] tracking-wider flex-shrink-0 border-b border-white/10">
                    📜 {{ fmt('craftAllRecipes', { n: RECIPES.length }) }}</div>
                <div class="flex-1 overflow-y-auto npc-scrollbar p-[1.5vh]">
                    <div v-for="r in RECIPES" :key="r.id"
                        class="flex items-center gap-[1.2vh] px-[1.2vh] py-[1.2vh] rounded-xl cursor-pointer transition-all border mb-[0.8vh]"
                        :class="selectedRecipe && selectedRecipe.id === r.id
                            ? 'bg-[#f59e0b]/25 border-[#fbbf24]/50'
                            : 'hover:bg-white/10 border-white/10'"
                        @click="selectedRecipe = r">
                        <div
                            class="w-[6.5vh] h-[6.5vh] rounded-lg bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img v-if="r.output.img && itemImg(r.output.img)" :src="itemImg(r.output.img)"
                                class="w-full h-full object-contain" />
                            <span v-else class="text-[2.5vh]">📜</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-[2.2vh] font-medium text-white truncate">{{ tr(r.name) }}</div>
                            <div class="text-[1.6vh] text-[#e0e0e0]/45">{{ fmt('craftOutputLine', { n: r.output.num || 1, m: r.materials.length }) }}</div>
                        </div>
                        <span v-if="canCraft(r)" class="text-[1.5vh] text-[#22c55e] flex-shrink-0">✓</span>
                    </div>
                </div>
            </div>

            <!-- 右侧：选中图纸详情 + 制作 -->
            <div class="flex-1 overflow-y-auto p-[3vh] npc-scrollbar">
                <template v-if="selectedRecipe">
                    <!-- 图纸详情卡片 -->
                    <div class="rounded-2xl bg-white/5 border border-white/10 p-[3vh] mb-[3vh]">
                        <div class="flex items-center gap-[3vh]">
                            <!-- 产出大图标 -->
                            <div
                                class="w-[14vh] h-[14vh] rounded-2xl bg-white/10 border border-[#fbbf24]/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_2vh_rgba(251,191,36,0.2)]">
                                <img v-if="selectedRecipe.output.img" :src="itemImg(selectedRecipe.output.img)"
                                    class="w-full h-full object-contain" />
                                <span v-else class="text-[5vh]">📦</span>
                            </div>
                            <div class="flex-1">
                                <div class="text-[3.5vh] font-bold text-white mb-[1vh]">{{ tr(selectedRecipe.name) }}</div>
                                <div class="text-[2vh] text-[#d0d0d0] leading-relaxed mb-[1.5vh]">{{ selectedRecipe.desc
                                }}</div>
                                <!-- 产出信息 -->
                                <div class="flex items-center gap-[1vh]">
                                    <span class="text-[1.8vh] text-[#e0e0e0]/50">{{ L('craftOutputLabel') }}</span>
                                    <span class="text-[2.2vh] font-semibold text-[#fbbf24]">{{
                                        selectedRecipe.output.name }}</span>
                                    <span class="text-[1.8vh] text-[#e0e0e0]/60">×{{ selectedRecipe.output.num || 1
                                    }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 材料需求 -->
                    <div class="mb-[3vh]">
                        <div class="text-[2.4vh] font-semibold text-white mb-[2vh]">{{ L('craftMaterialsNeeded') }}</div>
                        <div class="flex flex-col gap-[1.2vh]">
                            <div v-for="mat in selectedRecipe.materials" :key="mat.name"
                                class="flex items-center justify-between px-[2vh] py-[1.5vh] rounded-xl cursor-pointer transition-all hover:brightness-110 hover:border-[#fbbf24]/30"
                                :class="hasEnough(mat) ? 'bg-[#22c55e]/5 border border-[#22c55e]/20' : 'bg-[#ef4444]/5 border border-[#ef4444]/25'"
                                :title="L('craftMatSourceTitle')" @click="openMatSource(mat)">
                                <div class="flex items-center gap-[1.5vh]">
                                    <div
                                        class="w-[5vh] h-[5vh] rounded-lg bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden">
                                        <img v-if="matImg(mat)" :src="matImg(mat)"
                                            class="w-full h-full object-contain" />
                                        <span v-else class="text-[2vh]">🧪</span>
                                    </div>
                                    <div>
                                        <div class="text-[2.2vh] text-white font-medium">{{ tr(mat.name) }}</div>
                                        <div class="text-[1.5vh] text-[#e0e0e0]/40">{{ fmt('craftNeedCount', { n: mat.num }) }}</div>
                                    </div>
                                </div>
                                <!-- 持有数量 -->
                                <div class="text-[2.2vh] font-bold"
                                    :class="hasEnough(mat) ? 'text-[#22c55e]' : 'text-[#ef4444]'">
                                    {{ materialCount(mat.name) }} / {{ mat.num }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 制作操作 -->
                    <div
                        class="rounded-2xl bg-gradient-to-r from-[#f59e0b]/10 to-[#22c55e]/10 border border-[#fbbf24]/25 p-[2.5vh]">
                        <div class="flex items-center justify-between mb-[1.5vh]">
                            <span class="text-[2.6vh] font-semibold text-white">{{ L('craftCountLabel') }}</span>
                            <div class="flex items-center gap-[1.5vh]">
                                <el-button size="small" circle class="!w-[4.5vh] !h-[4.5vh] !text-[2.5vh] !font-bold"
                                    :disabled="craftCount <= 1 || crafting" @click="craftCount--">−</el-button>
                                <span class="text-[2.8vh] font-bold text-[#fbbf24] w-[6vh] text-center">{{ craftCount
                                }}</span>
                                <el-button size="small" circle class="!w-[4.5vh] !h-[4.5vh] !text-[2.5vh] !font-bold"
                                    :disabled="craftCount >= maxCraftable || crafting" @click="craftCount++">＋</el-button>
                            </div>
                        </div>
                        <div class="flex items-center gap-[2vh]">
                            <!-- 可制作上限 -->
                            <span class="text-[1.8vh] text-[#e0e0e0]/50">{{ L('craftMaxHint') }} <span class="text-[#22c55e] font-bold">{{
                                maxCraftable }}</span> {{ fmt('craftPerSec', { n: selectedRecipe.craftTime || DEFAULT_CRAFT_TIME }) }}</span>
                            <el-button type="success" size="large" round
                                class="!h-[6vh] !px-[4vh] !text-[2.4vh] !font-bold flex-1" :disabled="maxCraftable <= 0 || crafting" @click="doCraft">
                                <template v-if="crafting">⏳ {{ L('craftCrafting') }}…</template>
                                <template v-else>{{ fmt('craftMakeCount', { n: craftCount }) }}</template>
                            </el-button>
                        </div>
                        <!-- ⏳ 制作进度条：走完才真正消耗材料产出 -->
                        <div v-if="crafting" class="mt-[2vh] flex flex-col gap-[1vh]">
                            <div class="w-full h-[2.4vh] rounded-full bg-white/10 border border-[#fbbf24]/40 overflow-hidden">
                                <div class="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#22c55e] transition-all duration-100"
                                    :style="{ width: craftProgress + '%' }"></div>
                            </div>
                            <div class="text-center text-[1.9vh] text-[#e0e0e0]/80 font-medium">
                                ⏳ {{ fmt('craftProgress', { n: Math.round(craftProgress), s: Math.ceil(craftLeftSec) }) }}
                            </div>
                        </div>
                    </div>
                </template>

                <!-- 未选择 -->
                <div v-else class="flex flex-col items-center justify-center h-full text-[#e0e0e0]/40">
                    <div class="text-[8vh] mb-[2vh]">📜</div>
                    <div class="text-[2.6vh]">{{ L('craftSelectHint') }}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- 🧭 材料获取路径弹窗（点击材料行弹出） -->
    <el-dialog v-model="matSourceVisible" :title="''" width="30vw" append-to-body
        class="mat-source-dialog" :close-on-click-modal="true" :show-close="true">
        <div v-if="currentMat" class="mat-src-body">
            <div class="flex items-center gap-[2vh] mb-[2.5vh]">
                <div
                    class="w-[9vh] h-[9vh] rounded-xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img v-if="matImg(currentMat)" :src="matImg(currentMat)"
                        class="w-full h-full object-contain" />
                    <span v-else class="text-[3.5vh]">🧪</span>
                </div>
                <div>
                    <div class="text-[3vh] font-bold text-white">{{ tr(currentMat.name) }}</div>
                    <div class="text-[1.8vh] text-[#e0e0e0]/50 mt-[0.5vh]">{{ L('craftSourcePath') }}</div>
                </div>
            </div>
            <div
                class="text-[2.2vh] text-[#fbbf24]/95 leading-relaxed border-t border-white/10 pt-[2vh] whitespace-pre-line">
                {{ matSource(currentMat.name) }}
            </div>
        </div>
    </el-dialog>
    </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'

import { useCounterStore } from "@/store/counter";
import { ElMessText } from "@/pages/zujian/utils.js";
import { tr } from "@/i18n";
import { createDaojuSpine } from "../fight/CardSpine";
import { ITEM_SKIN_MAP } from "../dungeon/config"; // 🎨 物品名 → daojuall 皮肤名（材料 img 缺失时按名称回退）
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

// ==================== 合成配方（图纸） ====================
// 图纸配置统一放在 store 的 CRAFT_RECIPES 常量里（与炼制图鉴同一套同步机制）：
//   - 后续新增/删除/修改图纸只需改 store/counter.js 的 CRAFT_RECIPES，读档自动生效
//   - 这里通过 user.getCraftRecipes() 读取（天然始终是最新配置）
// 每个配方：
//   id: 唯一标识
//   name: 图纸名
//   category: 大类（如 药水/符咒/装备）
//   subcategory: 小类（如 生命恢复/灵力恢复）
//   desc: 说明
//   materials: [{ name, num, img }] 所需材料
//   output: { name, num, img, miaoshu, isItem, shiyong, Hp, ... } 产出道具
// ⚠️ 产出道具的字段与背包 inventory 一致（isItem/shiyong/Hp 等），合成后通过 addItemToInventory 加入
const RECIPES = user.getCraftRecipes();

const selectedRecipe = ref(null);
const craftCount = ref(1);

// ==================== 🖼️ 全部图纸（无分类）+ daojuall spine 物品图 ====================
// 左侧直接展示全部可合成配方；物品图用 daojuall 骨骼皮肤（复用背包同一套渲染链路）
const daojuImgMap = ref({});
// 收集全部需要渲染的皮肤（产出 + 材料）
const allSkins = computed(() => {
    const set = new Set();
    for (const r of RECIPES) {
        if (r.output?.img) set.add(r.output.img);
        for (const m of (r.materials || [])) { const sk = matSkin(m); if (sk) set.add(sk); }
    }
    return [...set];
});
// 批量渲染 spine 皮肤图（复用背包的 window.__daojuImgMap / sessionStorage 缓存）
async function loadDaojuImgs() {
    const pre = (typeof window !== 'undefined' && window.__daojuImgMap) || {};
    for (const skin of allSkins.value) {
        if (daojuImgMap.value[skin]) continue;
        if (pre[skin]) { daojuImgMap.value[skin] = pre[skin]; continue; }
        try {
            // ⚠️ createDaojuSpine 返回 { canvas, destroy }，需 toDataURL() 转成图片 URL
            const result = await createDaojuSpine(skin, 80, 80);
            if (result?.canvas) {
                const url = result.canvas.toDataURL();
                daojuImgMap.value[skin] = url;
                if (window.__daojuImgMap) window.__daojuImgMap[skin] = url;
                result.destroy?.();
            }
        } catch (e) { console.warn('合成图纸 spine 加载失败:', skin, e); }
    }
}
onMounted(loadDaojuImgs);

// 初始默认选中第一个配方
if (RECIPES.length > 0) {
    selectedRecipe.value = RECIPES[0];
}

// 物品图标（daojuall spine 皮肤图，未加载完成时返回空 → 显示 📜 兜底）
// 🎨 材料皮肤名：显式 img 优先，缺失时按物品名回退 ITEM_SKIN_MAP（保证材料图可渲染）
function matSkin(m) {
    return (m && m.img && String(m.img).trim()) || (m && ITEM_SKIN_MAP[m.name]) || ''
}
// 🎨 材料图 URL（皮肤名 → 已渲染的 daojuall 图；找不到返回空 → 显示兜底）
function matImg(m) {
    const sk = matSkin(m)
    return sk ? itemImg(sk) : ''
}
function itemImg(src) {
    return daojuImgMap.value[src] || ''
}

// 背包中某材料数量
function materialCount(name) {
    const item = user.inventory.find(i => i.name === name)
    return item ? item.num : 0
}

// 某材料是否足够
function hasEnough(mat) {
    return materialCount(mat.name) >= mat.num
}

// 当前图纸是否可制作（所有材料足够）
function canCraft(recipe) {
    return recipe.materials.every(mat => hasEnough(mat))
}

// 最多可批量制作数量（取材料能支撑的最小值）
const maxCraftable = computed(() => {
    if (!selectedRecipe.value) return 0
    let max = Infinity
    for (const mat of selectedRecipe.value.materials) {
        max = Math.min(max, Math.floor(materialCount(mat.name) / mat.num))
    }
    return isFinite(max) ? max : 0
})

// 🧭 材料获取路径（点击材料行弹窗展示；文案可按需在此维护）
const MATERIAL_SOURCES = {
    '赤莓': 'srcChimei',
    '翠息草': 'srcCuixi',
    '风萤果': 'srcFengying',
    '魔力灵液': 'srcMoli',
    '怒之晶石': 'srcNuzhi',
    '暗之晶石': 'srcAnzhi',
    '雷之晶石': 'srcLeizhi',
};
const matSourceVisible = ref(false);
const currentMat = ref(null);
function matSource(name) {
    return L(MATERIAL_SOURCES[name] || 'srcUnknown');
}
function openMatSource(mat) {
    currentMat.value = mat;
    matSourceVisible.value = true;
}

// ==================== ⏳ 制作进度（每件 CRAFT_TIME_PER_ITEM 秒） ====================
const DEFAULT_CRAFT_TIME = 2; // ⏱️ 默认每件制作耗时（秒），配方可配置 craftTime 覆盖
const crafting = ref(false);     // 是否制作中
const craftProgress = ref(0);    // 制作进度 0~100
const craftLeftSec = ref(0);     // 剩余秒数
let craftTimer = null;

function stopCraftTimer() {
    if (craftTimer) { clearInterval(craftTimer); craftTimer = null; }
}

/** 启动制作进度：totalSec 秒后执行 onDone */
function startCraft(totalSec, onDone) {
    stopCraftTimer();
    crafting.value = true;
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

// 执行制作（⏳ 先走进度条，完成后才真正消耗材料产出）
function doCraft() {
    const recipe = selectedRecipe.value
    if (!recipe || crafting.value) return
    const count = Math.min(craftCount.value, maxCraftable.value)
    if (count <= 0) {
        ElMessText(L('craftNoMaterials'), "warning")
        return
    }
    const perSec = recipe.craftTime || DEFAULT_CRAFT_TIME
    const totalSec = count * perSec
    ElMessText(fmt('craftStartMsg', { n: recipe.output.name, c: count }), "info")
    startCraft(totalSec, () => {
        const result = user.craftItem(recipe, count)
        if (result.ok) {
            ElMessText(fmt('craftSuccessMsg', { n: recipe.output.name, c: count }), "success")
        } else {
            ElMessText(result.msg || L('craftFail'), "warning")
        }
    })
}

// 组件卸载时清理制作计时器
onBeforeUnmount(() => {
    stopCraftTimer()
})

</script>

<style scoped>
*{
    font-family: "钉钉进步体 Regular2";
}
.npc-scrollbar::-webkit-scrollbar {
    width: 1vh;
}

.npc-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(245, 158, 11, 0.4);
    border-radius: 1vh;
}

/* ===== el-collapse 深色主题（配合手风琴折叠） ===== */
.craft-collapse {
    --el-collapse-border-color: transparent;
    --el-collapse-header-height: 6vh;
    background: transparent;
    border: none;
}

.craft-collapse :deep(.el-collapse-item) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 0;
}

.craft-collapse :deep(.el-collapse-item__header) {
    height: 6vh;
    line-height: 6vh;
    background: transparent;
    border: none;
    color: #e0e0e0;
    padding: 0 2vh;
    transition: background 0.2s;
}

.craft-collapse :deep(.el-collapse-item__header:hover) {
    background: rgba(255, 255, 255, 0.05);
}

.craft-collapse :deep(.el-collapse-item__header.is-active) {
    color: #fbbf24;
}

.craft-collapse :deep(.el-collapse-item__arrow) {
    font-size: 2.4vh;
    color: rgba(224, 224, 224, 0.5);
}

.craft-collapse :deep(.el-collapse-item__header.is-active .el-collapse-item__arrow) {
    color: #fbbf24;
}

.craft-collapse :deep(.el-collapse-item__wrap) {
    background: rgba(255, 255, 255, 0.03);
    border: none;
}

.craft-collapse :deep(.el-collapse-item__content) {
    padding: 1.2vh 1.5vh 1.5vh;
    color: #e0e0e0;
}

.npc-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

/* ===== 材料获取路径弹窗（深色主题） ===== */
.mat-source-dialog :deep(.el-dialog) {
    background: linear-gradient(160deg, #1e1b4b, #0f172a);
    border: 1px solid rgba(251, 191, 36, 0.35);
    border-radius: 1.6vh;
    box-shadow: 0 0 4vh rgba(245, 158, 11, 0.18);
    padding: 2.5vh;
}
.mat-source-dialog :deep(.el-dialog__header) {
    padding: 0;
}
.mat-source-dialog :deep(.el-dialog__headerbtn) {
    top: 1.5vh;
    right: 1.5vh;
    color: rgba(255, 255, 255, 0.55);
    font-size: 2.6vh;
}
.mat-source-dialog :deep(.el-dialog__headerbtn:hover) {
    color: #fbbf24;
}
.mat-source-dialog :deep(.el-dialog__body) {
    padding: 0;
    color: #e0e0e0;
}
</style>

<style>
/* ===== 材料获取路径弹窗：teleport 到 body，须用全局样式强制深色背景（scoped :deep 无效） ===== */
.mat-source-dialog {
  --el-dialog-bg-color: #17152e;
  --el-dialog-border-radius: 1.6vh;
}
.mat-source-dialog .el-dialog {
  background: linear-gradient(160deg, #1e1b4b, #0f172a) !important;
  border: 1px solid rgba(251, 191, 36, 0.4) !important;
  border-radius: 1.6vh !important;
  box-shadow: 0 0 4vh rgba(245, 158, 11, 0.18) !important;
}
.mat-source-dialog .el-dialog__header {
  padding: 0;
}
.mat-source-dialog .el-dialog__headerbtn {
  top: 1.5vh;
  right: 1.5vh;
  color: rgba(255, 255, 255, 0.6) !important;
  font-size: 2.6vh;
}
.mat-source-dialog .el-dialog__headerbtn:hover {
  color: #fbbf24 !important;
}
.mat-source-dialog .el-dialog__body {
  padding: 0;
  color: #e0e0e0 !important;
}
</style>
