<template>
    <div
        class="w-full h-90vh flex flex-col bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-[#e0e0e0] overflow-hidden rounded-[1vh] relative">
        <!-- 背景装饰光晕 -->
        <div class="absolute -top-[10vh] -right-[10vh] w-[40vh] h-[40vh] rounded-full bg-[#f59e0b]/15 blur-[8vh] pointer-events-none">
        </div>
        <div class="absolute -bottom-[10vh] -left-[10vh] w-[35vh] h-[35vh] rounded-full bg-[#22c55e]/10 blur-[8vh] pointer-events-none">
        </div>

        <!-- 顶部标题栏 + 金钱 -->
        <div
            class="relative z-10 flex justify-between items-center px-[3vh] py-[2vh] border-b border-white/10 bg-black/20 backdrop-blur-sm">
            <h2 class="m-0 text-[3.6vh] font-bold bg-gradient-to-r from-[#f59e0b] to-[#22c55e] bg-clip-text text-transparent flex items-center gap-[1vh]">
                <span class="text-[3vh]">🏪</span> {{ L('shopTitle') }}
            </h2>
            <div class="flex items-center gap-[2vh]">
                <span class="text-[2.2vh] text-[#e0e0e0]/60">{{ L('shopSubtitle') }}</span>
                <!-- 💎 好感度折扣提示（仅地牢商人商店有折扣时显示） -->
                <div v-if="merchantDiscount() < 1" class="flex items-center gap-[1vh] px-[2vh] py-[1vh] rounded-full bg-[#22c55e]/15 border border-[#22c55e]/40">
                    <span class="text-[2.2vh] font-bold text-[#22c55e]">{{ hasBigDiscount() ? fmt('shopBigDiscountLabel', { n: Math.round(merchantDiscount() * 10) }) : fmt('shopDiscountLabel', { n: Math.round(merchantDiscount() * 10) }) }}</span>
                </div>
                <div class="flex items-center gap-[1vh] px-[2vh] py-[1vh] rounded-full bg-[#f59e0b]/15 border border-[#fbbf24]/30">
                    <img src="@/assets/daoju/jinbi.webp" class="w-[3vh] h-[3vh] object-contain" />
                    <span class="text-[2.6vh] font-bold text-[#fbbf24]">{{ user.getShopMoney() }}</span>
                </div>
            </div>
        </div>

        <div class="relative z-10 flex-1 flex overflow-hidden min-h-0">
            <!-- ========== 左侧：背包（可出售） ========== -->
            <div class="w-[42%] border-r border-white/10 flex flex-col overflow-hidden min-h-0">
                <div class="text-[2.2vh] text-[#e0e0e0]/50 px-[2vh] py-[1.5vh] tracking-wider flex-shrink-0 border-b border-white/10">
                    🎒 {{ L('shopMyBag') }}</div>
                <!-- 出售提示 -->
                <div class="px-[2vh] py-[1vh] text-[1.8vh] text-[#f59e0b]/80 bg-[#f59e0b]/5 border-b border-white/10 flex-shrink-0">
                    💡 {{ L('shopSellHint') }}
                </div>
                <div class="flex-1 overflow-y-auto p-[2vh] npc-scrollbar">
                    <div v-if="sellableItems.length === 0"
                        class="flex flex-col items-center justify-center py-[8vh] text-[#e0e0e0]/40">
                        <div class="text-[5vh] mb-[1vh]">📦</div>
                        <div class="text-[2vh]">{{ L('shopNoSell') }}</div>
                    </div>
                    <div v-else class="grid grid-cols-3 gap-[1vh]">
                        <div v-for="item in sellableItems" :key="item.name"
                            class="relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 border"
                            :class="selectedSell?.name === item.name ? 'border-[#f59e0b]/70 bg-[#f59e0b]/10 scale-[1.03]' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25'"
                            @click="selectSell(item)">
                            <!-- 图片 -->
                            <div class="aspect-square flex items-center justify-center p-[0.6vh]">
                                <img v-if="daojuImgMap[item.img]" :src="daojuImgMap[item.img]"
                                    class="w-[80%] h-[80%] object-contain" />
                                <img v-else :src="inventoryImg(item.img)"
                                    class="w-[80%] h-[80%] object-contain" />
                            </div>
                            <!-- 数量 -->
                            <div class="absolute top-[0.4vh] right-[0.6vh] text-[1.6vh] font-bold text-white bg-black/60 rounded-full px-[0.8vh] py-[0.15vh]">
                                ×{{ item.num }}
                            </div>
                            <!-- 名称 -->
                            <div class="px-[0.8vh] py-[0.6vh] text-center text-[2vh] truncate bg-black/40"
                                :style="itemNameStyle(item)">
                                {{ tr(item.name) }}
                            </div>
                            <!-- 售价 -->
                            <div class="px-[0.8vh] py-[0.4vh] text-center text-[2vh] font-bold text-[#fbbf24] bg-[#f59e0b]/10">
                                {{ fmt('shopPrice', { n: getSellPrice(item) }) }} 
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 出售操作栏 -->
                <div v-if="selectedSell"
                    class="flex-shrink-0 border-t border-white/10 p-[2vh] bg-black/20 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-[1.5vh]">
                        <span class="text-[2.2vh] font-bold text-[#fbbf24]">{{ fmt('shopSellTitle', { n: selectedSell.name }) }}</span>
                        <span class="text-[2vh] text-[#e0e0e0]/70">{{ fmt('shopUnitPrice', { n: getSellPrice(selectedSell) }) }} </span>
                    </div>
                    <div class="flex items-center gap-[2vh]">
                        <div class="flex items-center gap-[1vh] flex-1">
                            <button @click="changeSellCount(-1)"
                                class="w-[5vh] h-[5vh] rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-black text-[2.8vh] font-bold shadow-[0_0_1vh_rgba(251,191,36,0.35)] hover:brightness-110 active:scale-90 transition-all cursor-pointer flex items-center justify-center leading-none">−</button>
                            <span class="w-[9vh] text-center text-[3vh] font-bold text-[#fbbf24]">{{ sellCount }}</span>
                            <button @click="changeSellCount(1)"
                                class="w-[5vh] h-[5vh] rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-black text-[2.8vh] font-bold shadow-[0_0_1vh_rgba(251,191,36,0.35)] hover:brightness-110 active:scale-90 transition-all cursor-pointer flex items-center justify-center leading-none">+</button>
                            <!-- 🆕 最大数量：一键选满 -->
                            <button @click="sellCount = selectedSell.num"
                                class="px-[1.5vh] h-[4.5vh] rounded-full bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#fbbf24] text-[1.8vh] font-bold transition-all cursor-pointer border border-[#fbbf24]/30">
                                {{ fmt('shopMax', { n: selectedSell.num }) }}
                            </button>
                        </div>
                        <div class="text-[2vh] text-[#e0e0e0]/70">
                            {{ L('shopGet') }} <span class="text-[#fbbf24] font-bold">{{ sellCount * getSellPrice(selectedSell) }}</span> 
                        </div>
                        <button @click="confirmSell"
                            class="px-[3vh] py-[1.2vh] rounded-xl text-[2.2vh] font-bold bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-black hover:brightness-110 transition-all cursor-pointer">
                            {{ L('shopSellBtn') }}                        </button>
                    </div>
                </div>
            </div>

            <!-- ========== 右侧：商店物品（可购买） ========== -->
            <div class="flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="text-[2.2vh] text-[#e0e0e0]/50 px-[2vh] py-[1.5vh] tracking-wider flex-shrink-0 border-b border-white/10">
                    🛒 {{ L('shopGoods') }}</div>
                <!-- 筛选标签 -->
                <div class="flex gap-[1vh] px-[2vh] py-[1.2vh] border-b border-white/10 flex-shrink-0 flex-wrap">
                    <div v-for="tab in shopTabs" :key="tab.value"
                        class="px-[2vh] py-[0.8vh] rounded-full cursor-pointer text-[1.9vh] font-medium transition-all"
                        :class="shopTab === tab.value ? 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-black shadow-md' : 'bg-white/5 text-[#e0e0e0]/70 hover:bg-white/10'"
                        @click="shopTab = tab.value">
                        {{ L(tab.label) }}
                        <span class="ml-[0.5vh] opacity-70">({{ getTabCount(tab.value) }})</span>
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-[2vh] npc-scrollbar">
                    <div v-if="filteredShopItems.length === 0"
                        class="flex flex-col items-center justify-center py-[8vh] text-[#e0e0e0]/40">
                        <div class="text-[5vh] mb-[1vh]">🛒</div>
                        <div class="text-[2vh]">{{ L('shopNoGoods') }}</div>
                    </div>
                    <div v-else class="grid grid-cols-4 gap-[1vh]">
                        <div v-for="item in filteredShopItems" :key="item.id"
                            class="rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 border relative"
                            :class="[
                                selectedBuy?.id === item.id ? 'border-[#22c55e]/70 bg-[#22c55e]/10 scale-[1.03]' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25',
                                getRemaining(item) <= 0 ? 'opacity-40 grayscale' : ''
                            ]"
                            @click="getRemaining(item) > 0 && selectBuy(item)">
                            <!-- 图片 -->
                            <div class="aspect-square flex items-center justify-center p-[0.6vh]">
                                <img v-if="daojuImgMap[item.img]" :src="daojuImgMap[item.img]"
                                    class="w-[80%] h-[80%] object-contain" />
                                <img v-else :src="inventoryImg(item.img)"
                                    class="w-[80%] h-[80%] object-contain" />
                            </div>
                            <!-- 限购/无限标记 -->
                            <div class="absolute top-[0.4vh] right-[0.6vh] text-[1.4vh] font-bold rounded-full px-[0.8vh] py-[0.15vh]"
                                :class="item.limit < 0 ? 'bg-[#22c55e]/80 text-white' : 'bg-[#f59e0b]/90 text-black'">
                                {{ item.limit < 0 ? L('shopInfinite') : fmt('shopLimited', { n: getRemaining(item) }) }}
                            </div>
                            <!-- 名称 -->
                            <div class="px-[0.8vh] py-[0.6vh] text-center text-[2vh] truncate bg-black/40"
                                :style="itemNameStyle(item)">
                                {{ tr(item.name) }}
                            </div>
                            <!-- 价格 -->
                            <div class="px-[0.8vh] py-[0.4vh] text-center text-[2vh] font-bold text-[#fbbf24] bg-[#f59e0b]/10">
                                {{ fmt('shopPrice', { n: getPrice(item) }) }} 
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 购买操作栏 -->
                <div v-if="selectedBuy && getRemaining(selectedBuy) > 0"
                    class="flex-shrink-0 border-t border-white/10 p-[2vh] bg-black/20 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-[1vh]">
                        <span class="text-[2.2vh] font-bold" :style="itemNameStyle(selectedBuy)">{{ fmt('shopBuyTitle', { n: selectedBuy.name }) }}</span>
                        <span class="text-[2vh] text-[#e0e0e0]/70">{{ user.getItemDesc(selectedBuy) }}</span>
                    </div>
                    <div class="flex items-center gap-[2vh]">
                        <div class="flex items-center gap-[1vh] flex-1">
                            <button @click="changeBuyCount(-1)"
                                class="w-[5vh] h-[5vh] rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] text-black text-[2.8vh] font-bold shadow-[0_0_1vh_rgba(74,222,128,0.35)] hover:brightness-110 active:scale-90 transition-all cursor-pointer flex items-center justify-center leading-none">−</button>
                            <span class="w-[9vh] text-center text-[3vh] font-bold text-[#4ade80]">{{ buyCount }}</span>
                            <button @click="changeBuyCount(1)"
                                class="w-[5vh] h-[5vh] rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] text-black text-[2.8vh] font-bold shadow-[0_0_1vh_rgba(74,222,128,0.35)] hover:brightness-110 active:scale-90 transition-all cursor-pointer flex items-center justify-center leading-none">+</button>
                            <!-- 🆕 一次 +10 -->
                            <button @click="changeBuyCount(10)"
                                class="px-[1.5vh] h-[4.5vh] rounded-full bg-[#22c55e]/20 hover:bg-[#22c55e]/30 text-[#4ade80] text-[1.8vh] font-bold transition-all cursor-pointer border border-[#4ade80]/30">
                                +10
                            </button>
                        </div>
                        <div class="text-[2vh] text-[#e0e0e0]/70">
                            {{ L('shopCost') }} <span class="text-[#fbbf24] font-bold">{{ buyCount * getPrice(selectedBuy) }}</span> 
                        </div>
                        <button @click="confirmBuy"
                            :disabled="user.getShopMoney() < buyCount * getPrice(selectedBuy)"
                            class="px-[3vh] py-[1.2vh] rounded-xl text-[2.2vh] font-bold bg-gradient-to-r from-[#22c55e] to-[#4ade80] text-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            {{ L('shopBuyBtn') }}                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch , onMounted } from 'vue'

import { ElMessage } from 'element-plus'
import { useCounterStore } from '@/store/counter'
import { createDaojuSpine } from '../fight/CardSpine'
import { t, tr } from '@/i18n'

const user = useCounterStore();
const langVersion = ref(0)
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++)
function L(key) { langVersion.value; return t(key); }
function fmt(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

// ===== 图片映射（与 xinxi.vue 一致） =====
const inventoryImg = (src) => {
    return new URL(`../../../assets/daoju/${src}.webp`, import.meta.url).href;
};
// Spine 道具图（daojuall 骨骼渲染，复用全局缓存 + 主动渲染）
let _daojuImgCache = {};
try {
    const raw = sessionStorage.getItem('xinxi_img_cache_v2');
    if (raw) {
        const data = JSON.parse(raw);
        if (data.daojuCache) _daojuImgCache = data.daojuCache;
    }
} catch (e) { }
if (typeof window !== 'undefined' && window.__daojuImgMap) {
    _daojuImgCache = { ...window.__daojuImgMap, ..._daojuImgCache };
}
const daojuImgMap = ref({ ..._daojuImgCache });
if (typeof window !== 'undefined') window.__daojuImgMap = daojuImgMap.value;

// ===== 商店数据 =====
const shopItems = computed(() => user.getShopItems());

// 🖼️ 商品皮肤主动渲染（未命中全局缓存才生成）
const _loadingSkins = new Set();
const shopSkins = computed(() => {
    const set = new Set();
    for (const it of shopItems.value) if (it.img) set.add(it.img);
    return [...set];
});
async function ensureSkin(skin) {
    if (!skin || daojuImgMap.value[skin]) return;
    if (_loadingSkins.has(skin)) return;
    _loadingSkins.add(skin);
    try {
        const pre = (typeof window !== 'undefined' && window.__daojuImgMap) || {};
        if (pre[skin]) { daojuImgMap.value[skin] = pre[skin]; return; }
        const result = await createDaojuSpine(skin, 80, 80);
        if (result && result.canvas) {
            const url = result.canvas.toDataURL();
            daojuImgMap.value[skin] = url;
            if (window.__daojuImgMap) window.__daojuImgMap[skin] = url;
            result.destroy && result.destroy();
        }
    } catch (e) { /* 皮肤不存在 → 走 assets webp 兜底 */ } finally {
        _loadingSkins.delete(skin);
    }
}
async function loadShopSkins() { for (const s of shopSkins.value) await ensureSkin(s); }
watch(shopSkins, loadShopSkins, { immediate: true });

// ===== 背包可出售物品（材料可出售；卡牌/装备/货币/消耗品/道具不可出售） =====
const sellableItems = computed(() => {
    return user.inventory.filter(item => {
        if (item.num <= 0) return false;
        if (item.isCard) return false;        // 卡牌不可出售
        if (item.wuqi) return false;          // 装备不可出售
        if (item.isItem) return false;        // 道具不可出售
        if (item.shiyong) return false;       // 消耗品不可出售
        if (item.status === 'currency' || ['金币', '灵力晶核', '魔力晶核', '魔晶LV1'].includes(item.name)) return false; // 货币不可出售
        return true;                          // 材料可出售
    });
});

// 🖼️ 左侧背包（可出售材料）皮肤主动渲染：与右侧商品共用 ensureSkin 链路
const bagSkins = computed(() => {
    const set = new Set();
    for (const it of sellableItems.value) if (it.img) set.add(it.img);
    return [...set];
});
watch(bagSkins, () => { for (const s of bagSkins.value) ensureSkin(s); }, { immediate: true });

// 道具名样式：绑定物品自身颜色 + 纯 text-shadow 描边（不侵入文字内部，颜色始终可见）
function itemNameStyle(item) {
    let color = item.color;
    if (!color && item.name) {
        // 物品自身没带 color 时，从背包里同名物品补一个
        const found = user.inventory.find(x => x.name === item.name && x.color);
        if (found) color = found.color;
    }
    color = color || '#ffffff';
    return {
        color,
        textShadow:
            '0.6px 0 0 rgba(0,0,0,0.9), -0.6px 0 0 rgba(0,0,0,0.9), ' +
            '0 0.6px 0 rgba(0,0,0,0.9), 0 -0.6px 0 rgba(0,0,0,0.9), ' +
            '0.4px 0.4px 0 rgba(0,0,0,0.8), -0.4px -0.4px 0 rgba(0,0,0,0.8)',
    };
}

// 出售物品单价
function getSellPrice(item) {
    return user.getSellPrice(item);
}

// ===== 出售状态 =====
const selectedSell = ref(null);
const sellCount = ref(1);

function selectSell(item) {
    if (selectedSell.value?.name === item.name) {
        selectedSell.value = null;
        sellCount.value = 1;
    } else {
        selectedSell.value = item;
        sellCount.value = 1;
    }
}
function changeSellCount(delta) {
    if (!selectedSell.value) return;
    const max = selectedSell.value.num;
    sellCount.value = Math.min(max, Math.max(1, sellCount.value + delta));
}
function confirmSell() {
    if (!selectedSell.value) return;
    const result = user.sellItem(selectedSell.value.name, sellCount.value);
    showMessage(result.ok ? 'success' : 'warning', result.msg);
    if (result.ok) {
        // 💰 地牢商人场景：记录卖出时间，返回 sr10 对话时显示「卖了」文本
        if (user.getDialogueFlag?.('shangrenShopOpenedAt')) {
            user.setDialogueFlag('shangrenSoldAt', Date.now());
        }
        // 刷新选中物品（可能已卖完）
        const updated = user.inventory.find(i => i.name === selectedSell.value.name);
        if (!updated || updated.num <= 0) {
            selectedSell.value = null;
            sellCount.value = 1;
        } else {
            selectedSell.value = updated;
            sellCount.value = 1;
        }
    }
}

// ===== 购买状态 =====
const shopTab = ref('all');
const selectedBuy = ref(null);
const buyCount = ref(1);

const shopTabs = [
    { label: 'shopTabAll', value: 'all' },
    { label: 'shopTabInfinite', value: 'infinite' },
    { label: 'shopTabLimited', value: 'limited' },
];

// 各筛选标签的商品数量
function getTabCount(value) {
    if (value === 'all') return shopItems.value.length;
    if (value === 'infinite') return shopItems.value.filter(i => i.limit < 0).length;
    if (value === 'limited') return shopItems.value.filter(i => i.limit >= 0).length;
    return 0;
}

// 剩余可购数量
function getRemaining(item) {
    if (item.limit < 0) return Infinity;
    return Math.max(0, item.limit - (item.soldNum ?? 0));
}

// 🏪 商人折扣：好感度折扣（>=100 打6折，>=50 打8折）叠乘 大客户折扣（累计消费>=100 打一折），仅地牢商人商店打开时生效
function merchantDiscount() {
    if (!user.getDialogueFlag?.('shangrenShopOpenedAt')) return 1;
    const favor = user.getDialogueFlag?.('shangrenFavor') || 0;
    let discount = 1;
    if (favor >= 100) discount = 0.6;
    else if (favor >= 50) discount = 0.8;
    // 💎 大客户优惠：累计消费达到 100 金币后打一折（折扣减 0.1），与好感度折扣加算叠加（如 0.6-0.1=0.5）
    if ((Number(user.getDialogueFlag?.('shangrenTotalSpent')) || 0) >= 100) {
        discount = Math.max(0, discount - 0.1);
    }
    return discount;
}
// 🏪 是否已享大客户折扣（累计消费>=100）
function hasBigDiscount() {
    return (Number(user.getDialogueFlag?.('shangrenTotalSpent')) || 0) >= 100;
}
function getPrice(item) {
    let p = Math.floor((item.price ?? 0) * merchantDiscount());
    // 💖 优待：购买商品时价格降低（默认 -20%）
    if (user.hasTalent?.('kind_favor')) {
      p = Math.floor(p * (1 - (user.getTalentEffect?.('kind_favor', 'buyPct') ?? 20) / 100));
    }
    return p;
}

const filteredShopItems = computed(() => {
    return shopItems.value.filter(item => {
        if (shopTab.value === 'infinite') return item.limit < 0;
        if (shopTab.value === 'limited') return item.limit >= 0;
        return true;
    });
});

function selectBuy(item) {
    if (selectedBuy.value?.id === item.id) {
        selectedBuy.value = null;
        buyCount.value = 1;
    } else {
        selectedBuy.value = item;
        buyCount.value = 1;
    }
}
function changeBuyCount(delta) {
    if (!selectedBuy.value) return;
    const remaining = getRemaining(selectedBuy.value);
    buyCount.value = Math.min(remaining, Math.max(1, buyCount.value + delta));
}
function confirmBuy() {
    if (!selectedBuy.value) return;
    const result = user.buyShopItem(selectedBuy.value.id, buyCount.value);
    showMessage(result.ok ? 'success' : 'warning', result.msg);
    if (result.ok) {
        // 💰 地牢商人场景（打开过 shangren 商店）：记录购买时间，返回 sr10 对话时显示「买了」文本
        if (user.getDialogueFlag?.('shangrenShopOpenedAt')) {
            user.setDialogueFlag('shangrenBoughtAt', Date.now());
            // 💰 累计消费：累加本次花费到永久累计金额（跨地牢/读档保留）
            const before = Number(user.getDialogueFlag?.('shangrenTotalSpent')) || 0;
            const after = before + (result.totalCost || 0);
            user.setDialogueFlag('shangrenTotalSpent', after);
            // 💰 累计消费首次达到 100 金币 → 触发大客户特殊对话（只触发一次）
            if (before < 100 && after >= 100) {
                user.setDialogueFlag('shangrenBigBuyAt', Date.now());
            }
        }
        // 已售罄则取消选中
        if (getRemaining(selectedBuy.value) <= 0) {
            selectedBuy.value = null;
        }
        buyCount.value = 1;
    }
}

// ===== 消息提示（使用 element-plus 命令式 API） =====
function showMessage(type, msg) {
    if (!msg) return;
    if (type === 'success') {
        ElMessage.success(msg);
    } else if (type === 'warning') {
        ElMessage.warning(msg);
    } else {
        ElMessage.info(msg);
    }
}

</script>

<style scoped>
.npc-scrollbar::-webkit-scrollbar {
    width: 10px;
}
.npc-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 5px;
}
.npc-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 5px;
}
.npc-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.7);
}
</style>
