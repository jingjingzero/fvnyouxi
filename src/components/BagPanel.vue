<template>
  <div class="bag-panel w-full h-full flex flex-col">
    <!-- 筛选标签 -->
    <div class="flex flex-wrap gap-x-1.5vh gap-y-1vh px-2vh py-2vh border-b border-#E4E7ED flex-shrink-0">
      <div v-for="tab in itemTabs" :key="tab.value"
        class="px-2vh py-0.8vh rounded-full cursor-pointer text-2.4vh font-medium transition-all flex-shrink-0"
        :class="itemTab === tab.value ? 'bg-gradient-to-r from-#409EFF to-#66B1FF text-white shadow-md' : 'bg-#F5F7FA text-#606266 hover:bg-#E4E7ED'"
        @click="itemTab = tab.value">
        {{ tab.label }}
        <span class="ml-0.5vh opacity-70">({{ getTabCount(tab.value) }})</span>
      </div>
    </div>

    <!-- 物品格子 -->
    <div class="grid grid-cols-6 md:grid-cols-8 gap-x-2vh gap-y-2vh px-2vh py-2vh overflow-y-auto flex-1 box-border content-start">
      <div v-for="(item, index) in filteredItems" :key="item.name + index + '-' + forceRender"
        class="relative w-full h-0 pt-[100%] rounded-lg overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5vh"
        :class="activeItem?.name === item.name && activeItemIndex === index ? 'ring-2 ring-#409EFF scale-105' : ''"
        @click="selectItem(item, index)">
        <!-- 背景 -->
        <div class="absolute inset-0 bg-gradient-to-br from-#F5F7FA to-#E4E7ED border border-#DCDFE6 rounded-lg"></div>
        <!-- 物品图片 -->
        <div class="absolute inset-1 flex items-center justify-center">
          <img :src="itemImg(item)" class="w-full h-full object-contain" :class="item.isCard ? 'scale-190' : ''" @error="onImgError($event, item)" />
        </div>
        <!-- 物品数量（右下角） -->
        <div class="absolute bottom-0.5vh right-0.8vh text-2vh font-bold z-10" v-if="item.num > 1"
          style="text-shadow: 0 0 2px #fff, 0 0 4px #fff, 0 1px 2px rgba(0,0,0,0.3); color: #303133;">
          {{ item.num }}
        </div>
        <!-- 品质边框 -->
        <div class="absolute inset-0 rounded-lg border-2 opacity-0 group-hover:opacity-100 transition-all"
          :style="{ borderColor: getItemQualityColor(item) }"></div>
      </div>
      <!-- 空格子占位 -->
      <div v-for="i in emptySlots" :key="'empty-' + i"
        class="relative w-full h-0 pt-[100%] rounded-lg border-2 border-dashed border-#E4E7ED opacity-50"></div>
    </div>

    <!-- 物品详情弹窗 -->
    <el-dialog v-model="itemDialogVisible" :title="tr(activeItem?.name) || L('itemDetail')" width="30vw" top="4vh"
      :close-on-click-modal="true" :show-close="true" custom-class="item-detail-dialog" @close="closeItemDetail">
      <template #header>
        <div class="flex items-center gap-x-2vh">
          <span class="text-2.5vh font-bold text-black">{{ tr(activeItem?.name) || L('itemDetail') }}</span>
        </div>
      </template>
      <div v-if="activeItem" class="flex flex-col gap-y-1.5vh">
        <!-- 物品头部 -->
        <div class="flex items-center gap-x-3vh pb-3vh border-b border-#409EFF/30">
          <div
            class="w-15vh h-15vh rounded-xl overflow-hidden border-2 shadow-lg flex-shrink-0 bg-gradient-to-br from-#F5F7FA to-#E4E7ED flex items-center justify-center"
            :style="{ borderColor: getItemQualityColor(activeItem) }">
            <img :src="itemImg(activeItem)" class="w-12vh h-12vh object-contain" :class="activeItem.isCard ? 'scale-210' : ''" />
          </div>
          <div class="flex flex-col gap-y-1vh flex-1">
            <div class="text-2vh text-#333">
              {{ L('qtyLabel') }} <span class="text-#E6A23C font-bold">{{ activeItem.num }}</span>
            </div>
            <div class="text-2vh font-medium text-black">{{ tr(getItemType(activeItem)) }}</div>
          </div>
        </div>
        <!-- 物品描述 -->
        <div>
          <div class="text-2.5vh font-bold text-black mb-1.5vh">{{ L('itemDescLabel') }}</div>
          <div class="text-2.7vh text-#333 leading-relaxed font-medium whitespace-pre-line">
            {{ getItemMiaoshu(activeItem) }}
          </div>
        </div>
        <!-- 操作按钮（interactive 完整模式 / allowUse 简化使用模式 时显示） -->
        <div v-if="interactive || allowUse" class="flex gap-x-2vh pt-1vh">
          <button v-if="interactive && (isFoodItem(activeItem) || user.isEdibleHpItem(activeItem.name))" @click="emit('eat-food', activeItem)"
            class="flex-1 py-2vh rounded-xl bg-gradient-to-r from-#67C23A to-#85CE6B text-white text-2.2vh font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
              {{ L('eatLabel') }}
          </button>
          <button v-if="interactive && isFoodItem(activeItem)" @click="emit('feed-ally', activeItem)"
            class="flex-1 py-2vh rounded-xl bg-gradient-to-r from-#E6A23C to-#F0C78A text-white text-2.2vh font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
            {{ L('feedLabel') }}
          </button>
          <button v-if="activeItem.shiyong && (interactive || allowUse)" @click="onUseItem(activeItem, activeItemIndex)"
            class="flex-1 py-2vh rounded-xl bg-gradient-to-r from-#409EFF to-#66B1FF text-white text-2.2vh font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer select-none!">
            {{ L('useLabel') }}
          </button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useCounterStore } from "@/store/counter";
import { tr, t as i18nT } from "@/i18n";

// 🌐 语言切换刷新
const langVersion = ref(0);
function L(key) { langVersion.value; return i18nT(key); }
window.addEventListener("fvnyouxi-lang-changed", () => langVersion.value++);

const props = defineProps({
  // 是否显示操作按钮（食用/喂食/使用），xinxi.vue 传 true，地牢传 false
  interactive: { type: Boolean, default: false },
  // 地牢简化模式：interactive=false 时也显示「使用」按钮（恢复药剂等消耗品），宿主需监听 use-item
  allowUse: { type: Boolean, default: false },
  // 外部详情模式：为 true 时不显示内置详情弹窗，只 emit select-item，由父组件处理详情
  externalDetail: { type: Boolean, default: false },
  // Spine 渲染的道具图片 map（key=item.img，value=dataURL），xinxi.vue 传入
  daojuImgMap: { type: Object, default: () => ({}) },
  // Spine 渲染的卡牌图片 map（key=item.name，value=dataURL），xinxi.vue 传入
  cardImgMap: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['eat-food', 'feed-ally', 'use-item', 'select-item']);

const user = useCounterStore();

// 🔄 强制刷新：cardImgMap/daojuImgMap 异步更新后触发重新渲染（Spine 图片加载完后显示）
const forceRender = ref(0);
watch(() => props.cardImgMap, () => { forceRender.value++; }, { deep: true });
watch(() => props.daojuImgMap, () => { forceRender.value++; }, { deep: true });

// 📦 默认物品图片映射（物品名 → assets/daoju/ 下的 key），物品缺少 img 字段时按名称查找
const DEFAULT_ITEM_IMG = {
  '魔力晶核': 'molijinghe',
'灵力晶核': 'jinghe', '金币': 'jinbi',
};

// ========== 筛选标签 ==========
const itemTabs = computed(() => [
  { label: L('itemTabAll'), value: 'all' },
  { label: L('itemTabFood'), value: 'food' },
  { label: L('itemTabMaterial'), value: 'material' },
  { label: L('itemTabConsumable'), value: 'consumable' },
  { label: L('itemTabCurrency'), value: 'currency' },
  { label: L('itemTabItem'), value: 'item' },
  { label: L('itemTabSpecial'), value: 'special' },
  { label: L('itemTabBreakthrough'), value: 'breakthrough' },
]);
const itemTab = ref('all');

// ========== 选中物品 ==========
const activeItem = ref(null);
const activeItemIndex = ref(-1);
const itemDialogVisible = ref(false);

function selectItem(item, index) {
  activeItem.value = item;
  activeItemIndex.value = index;
  if (props.externalDetail) {
    // 外部详情模式：只 emit，由父组件打开自己的详情弹窗
    emit('select-item', { item, index });
    return;
  }
  itemDialogVisible.value = true;
}
function closeItemDetail() {
  itemDialogVisible.value = false;
  setTimeout(() => {
    activeItem.value = null;
    activeItemIndex.value = -1;
  }, 200);
}

// 使用物品：通知宿主处理，物品用完自动关闭详情（支持连续使用）
function onUseItem(item, index) {
  emit('use-item', item, index);
  // 宿主可能已从背包移除该物品（splice）或数量扣到 0 → 关闭详情
  const updated = user.inventory.find(i => i.name === item.name && i === item);
  if (!updated || updated.num <= 0) {
    closeItemDetail();
  }
}
defineExpose({ closeItemDetail });

// ========== 物品图片 ==========
const inventoryImg = (src) => {
  if (!src) return '';
  const s = String(src);
  if (s.startsWith('http') || s.startsWith('/') || s.startsWith('data:')) return s;
  // 处理带扩展名的情况（如 'qiandaizi.webp'），去掉扩展名后再加 .webp
  const name = s.replace(/\.(webp|png|jpg|jpeg|gif)$/i, '');
  try {
    return new URL(`../assets/daoju/${name}.webp`, import.meta.url).href;
  } catch (e) { return ''; }
};
function itemImg(item) {
  if (!item) return '';
  // img 字段为空时按名称查找默认图片
  const imgKey = item.img || DEFAULT_ITEM_IMG[item.name] || '';
  // 优先用 Spine 渲染的图片（xinxi.vue 传入的 daojuImgMap / cardImgMap）
  if (!item.isCard && props.daojuImgMap && props.daojuImgMap[imgKey]) {
    return props.daojuImgMap[imgKey];
  }
  if (item.isCard && props.cardImgMap && props.cardImgMap[item.name]) {
    return props.cardImgMap[item.name];
  }
  // fallback：普通 webp 图片
  return inventoryImg(imgKey);
}
function onImgError(e, item) {
  // 图片加载失败时显示首字母（通过 CSS 背景色）
  e.target.style.display = 'none';
}

// ========== 物品类型/品质/描述 ==========
function getItemTypeValue(item) {
  if (item.food || ['魔晶LV1'].includes(item.name)) return 'food';
  if (item.isGachaItem || item.isSpecial || ['魔力晶核', '灵力晶核', '金币'].includes(item.name)) return 'special';
  if (item.bType) return 'breakthrough';
  if (item.status === 'material') return 'material';
  if (item.isItem && item.buffs) return 'item'; // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (item.shiyong) return 'consumable';
  if (item.isItem) return 'item';
  if (item.isCard) return 'currency';
  if (item.img === 'qiandaizi.webp') return 'currency';
  if (item.wuqi) return 'equipment';
  return 'material';
}
function getItemType(item) {
  if (item.isGachaItem || item.isSpecial || ['魔力晶核', '灵力晶核', '金币'].includes(item.name)) return '特殊';
  if (item.bType) return '突破';
  if (item.status === 'material') return '材料';
  if (item.isItem && item.buffs) return '道具'; // 🧰 可装备道具（佩戴加成）优先于消耗品
  if (item.shiyong) return '消耗品';
  if (item.isItem) return '道具';
  if (item.isCard) return '卡牌';
  if (item.img === 'qiandaizi.webp') return '货币';
  if (item.wuqi) return '装备';
  return '材料';
}
function getItemQualityColor(item) {
  if (item.name === '魔力晶核') return '#F56C6C';
  if (item.isItem) return item.color || '#E6A23C';
  if (item.isCard) return item.color || '#409EFF';
  if (item.isGachaItem) return '#8B5CF6';
  if (item.img === 'qiandaizi.webp') return '#E6A23C';
  if (item.wuqi) return '#F56C6C';
  if (item.shiyong) return '#67C23A';
  return '#909399';
}
// ⭐ 按星级填充卡牌描述：先裁剪"二星/三星"条件句，再把 "X/Y/Z%" 三档替换为当前星级实际值（金色加粗标注）
function starSpecificDesc(desc, star) {
  if (!desc) return ''
  const idx = Math.max(1, Math.min(3, star || 1)) - 1
  const segs = desc.split(/([；。])/)
  let text = ''
  for (let k = 0; k < segs.length; k += 2) {
    const seg = segs[k], sep = segs[k + 1] || ''
    if (!seg) { text += sep; continue }
    if (/(二星|三星)/.test(seg)) {
      if (idx === 0) { text = text.replace(/；$/, '。'); continue }
      const isThreeOnly = /^(三星时|三星)/.test(seg.trim())
      let body = seg.trim().replace(/^(二星起|二星|三星时|三星)/, '')
      const m = body.match(/^(.*?)，三星(.*)$/)
      if (m) {
        if (idx === 1) {
          body = m[1]
        } else {
          const v2 = (m[2].match(/[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/) || [''])[0]
          body = v2 ? m[1].replace(/[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/, v2) : m[1]
          const rest2 = m[2].replace(/^[^，]+?[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/, '').trim()
          if (/^[且并（(]/.test(rest2)) body = `${body}${/^[（(]/.test(rest2) ? '' : '，'}${rest2}`
        }
      }
      if (isThreeOnly && idx === 1) { text = text.replace(/；$/, '。'); continue }
      text += body + sep
    } else {
      text += seg + sep
    }
  }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc(text).replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(%)?/g, (m, a, b, c, pct) => '<span style="color:#ffb400;font-weight:600">' + [a, b, c][idx] + (pct || '') + '</span>')
}
function getItemMiaoshu(item) {
  if (item.name === '黑米的灵晶') {
    const killCount = user.pixi?.player?.equippedItemKillCounts?.['黑米的灵晶'] || 0;
    const bonusAtk = (killCount * 0.2).toFixed(1);
    const tpl = tr('已消灭 {killCount} 只魔物，进入战斗后额外获得 {bonusAtk} 攻击力。')
      .replace('{killCount}', String(killCount))
      .replace('{bonusAtk}', bonusAtk);
    return `${tr('黑米死后凝聚的半魔化灵晶，消灭魔物可以提升攻击力。')}\n${tr('基础：提升10点攻击力')}\n${tpl}`;
  }
  // 🎴 卡牌：多段伤害追加总倍率（段数 × 单段倍率，按当前星级），直观展示整卡总伤害
  const cardCfg = item.isCard ? (user.pixi?.player?.CARD_DATA?.[item.name] || null) : null;
  if (cardCfg) {
    const star = Math.min(3, Math.max(1, item.star || 1));
    const hits = Array.isArray(cardCfg.hitCount) ? (cardCfg.hitCount[star - 1] ?? cardCfg.hitCount[0] ?? 1) : (cardCfg.hitCount ?? 1);
    const atk = Array.isArray(cardCfg.atkRatio) ? (cardCfg.atkRatio[star - 1] ?? cardCfg.atkRatio[0] ?? 0) : (cardCfg.atkRatio ?? 0);
    const base = starSpecificDesc(cardCfg.desc, star) || '';
    if (hits > 1 && atk > 0) return `${base} (${tr('总倍率')} ${Math.round(atk * hits * 100)}%)`;
    return base;
  }
  // 🆕 统一走 store 动态描述（魔晶经验实时绑定 FEEDABLE_ITEMS）
  return user.getItemDesc(item) || tr('暂无介绍');
}
function isFoodItem(item) {
  return !!item && (item.food || ['魔晶LV1'].includes(item.name));
}

// ========== 筛选/计数 ==========
function getTabCount(tab) {
  const inv = (user.inventory || []).filter(item => item.num > 0);
  if (tab === 'all') return inv.length;
  return inv.filter(item => getItemTypeValue(item) === tab).length;
}
const filteredItems = computed(() => {
  const inv = (user.inventory || []).filter(item => item.num > 0);
  if (itemTab.value === 'all') return inv;
  return inv.filter(item => getItemTypeValue(item) === itemTab.value);
});
const emptySlots = computed(() => {
  const minSlots = 50;
  const count = filteredItems.value.length;
  return Math.max(0, minSlots - count);
});
</script>

<style scoped>
.bag-panel {
  background: #fff;
  border-radius: 1vh;
}
</style>
