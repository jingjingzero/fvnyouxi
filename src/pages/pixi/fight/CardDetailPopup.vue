<template>
    <!-- 主弹窗 -->
    <div v-if="visible" class="fixed inset-0 z-22222 flex items-center justify-center bg-black/80" @click.self="close">
        <div class="w-[90%] max-w-[700px] rounded-lg border-2 border-gray-600 bg-gray-900 h-80vh p-5 text-white">
            <el-segmented v-model="value" :options="options" size="default" class="mb-5vh" />
            <template v-if="value === '卡牌'">
                <div class="space-y-5">
                    <!-- 当前手牌 -->
                    <div>
                        <h3 class="text-lg font-semibold mb-2">{{ L('currentHand') }}</h3>
                        <div class="flex flex-wrap gap-2">
                            <div v-for="c in handCards" :key="c.id"
                                class="rounded-md bg-gray-800 px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 transition-colors"
                                @click="openCardInfo(c)">
                                {{ tr(c.name) }}
                            </div>
                        </div>
                    </div>

                
                </div>
            </template>
            <template v-else-if="value === '友军信息'">
                <FriendInfo :player="player" :allies="allies" />
            </template>

            <template v-else-if="value === '敌人信息'">
                <EnemyInfo :enemies="enemies" />
            </template>
        </div>
    </div>
    <!-- 卡牌详情弹窗 -->
    <el-dialog v-model="showInfo" :title="L('cardDetailTitle')" width="600px" top="5vh" :z-index="33333" class="h-90vh! bg-[#f5f7fa]!">
        <div v-if="currentCard" class="text-black flex gap-5 mt-3vh">

            <!-- 左侧：卡牌容器（130×198，和你要的大小一致） -->
            <div class="w-[130px] h-[198px] relative rounded-lg overflow-hidden ">
                <!-- Spine 动画底层 -->
                <div ref="spineContainer" class="absolute inset-0"></div>

                <!-- 👇 1:1 复刻你的卡牌UI 绝对定位 -->
                <div class="absolute inset-0 pointer-events-none z-10">
                    <!-- 卡牌名称 -->
                    <div class="mt-[7px] absolute text-[18px] iconfont2 w-full text-center" :style="{
                        color: currentCard.color,
                        textShadow: '0 0 2px #000, 0 0 4px #000, 0 1px 2px rgba(0,0,0,0.5)'
                    }">
                        {{ tr(currentCard.name) }}
                    </div>

                    <!-- 灵力消耗（左上角） -->
                    <div class="absolute top-[8px] left-[10px] text-[18px] font-bold text-blue-500">
                        {{ getCardCostAtStar(currentCard) }}
                    </div>

                </div>
            </div>

            <!-- 右侧：属性 -->
            <div class="flex-1">
                <!-- 卡牌详细说明 -->
                <div class="text-sm font-bold  ">{{ L('cardIntro') }}</div>
                <div class="text-12px bg-gray-100 p-2.5 rounded mb-4 leading-relaxed iconfont2 text-#333 whitespace-pre-line" v-html="getCardDynamicDesc(currentCard, getCardStar(currentCard))"></div>

                <!-- 星级信息 -->
                <div>
                    <div class="text-sm font-bold mb-2">{{ L('starRarity') }}</div>
                    <div class="flex flex-wrap gap-1 items-center">
                        <span class="text-lg text-yellow-400">⭐ {{ currentCard.star || 1 }} {{ L('starUnit') }}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                            :style="{ background: rarityColor(getCardRarity(currentCard)) + '22', color: rarityColor(getCardRarity(currentCard)) }">
                            {{ rarityName(getCardRarity(currentCard)) }}
                        </span>
                        <span class="text-xs text-gray-500">{{ F('shardGainFmt', { n: getCardGoldValue(currentCard) }) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits, onUnmounted, nextTick, watch } from 'vue'
import { createCardSpine } from './CardSpine'
import { useCounterStore } from "@/store/counter";
import { t, tr } from "@/i18n";
import { CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import FriendInfo from './FriendInfo.vue'
import EnemyInfo from './EnemyInfo.vue'
const user = useCounterStore();
// 🌐 语言响应：语言切换后重渲染 + 词条读取
const langVersion = ref(0);
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++);
function L(key) { langVersion.value; return t(key); }
function F(key, vars) { let s = L(key); if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }
const value = ref('卡牌')
const options = computed(() => [
  { label: L('tabCards'), value: '卡牌' },
  { label: L('tabAllies'), value: '友军信息' },
  { label: L('tabEnemies'), value: '敌人信息' },
])

const props = defineProps({
  visible: Boolean,
  handCards: Array,
  player: Object,
  allies: Array,
  enemies: Array
})
const emit = defineEmits(['update:visible'])
const close = () => emit('update:visible', false)

const allCards = Object.keys(user.pixi.player.CARD_DATA).map(name => ({
  name,
  ...user.pixi.player.CARD_DATA[name]
}))

const showInfo = ref(false)
const currentCard = ref(null)
const spineContainer = ref(null)
let spineInst = null

// 获取卡牌某星级的消耗（兼容数组，按当前星级取值）
function getCardCostAtStar(card) {
  const name = card?.name;
  const cfg = name ? user.pixi.player.CARD_DATA[name] : null;
  const star = card?.star || cfg?.star || 1;
  if (cfg && Array.isArray(cfg.cost)) return cfg.cost[star - 1] ?? cfg.cost[0] ?? 0;
  if (cfg && typeof cfg.cost === 'number') return cfg.cost;
  return card?.cost ?? 0;
}
// 获取卡牌某星级的冷却（兼容数组，按当前星级取值）
function getCardCooldownAtStar(card) {
  const name = card?.name;
  const cfg = name ? user.pixi.player.CARD_DATA[name] : null;
  const star = card?.star || cfg?.star || 1;
  if (cfg && Array.isArray(cfg.maxCooldown)) return cfg.maxCooldown[star - 1] ?? cfg.maxCooldown[0] ?? 0;
  if (cfg && typeof cfg.maxCooldown === 'number') return cfg.maxCooldown;
  return card?.maxCooldown ?? 0;
}

// 获取卡牌当前星级
function getCardStar(item) {
  const cardData = item?.name ? user.pixi.player.CARD_DATA[item.name] : null;
  if (cardData?.star) return cardData.star;
  return item?.star || 1;
}
// 📖 统一描述来源：直接读取 CARD_DATA 配置的 desc（与 dladmin 卡牌编辑、图鉴弹窗完全一致）
// ⭐ 并按星级填充 "X/Y/Z%" 三档数值为当前星级实际值，以金色加粗标注（例：1星显示"60%"）
function starSpecificDesc(desc, star) {
  if (!desc) return ''
  const idx = Math.max(1, Math.min(3, star || 1)) - 1
  // 📐 1️⃣ 条件句裁剪：二星起/三星生效的效果，当前星级未达到则整句删除（1星不显示未解锁效果；2星只显示二星档；3星替换为三星档数值并保留独有补充）
  const segs = desc.split(/([；。])/)
  let text = ''
  for (let k = 0; k < segs.length; k += 2) {
    const seg = segs[k], sep = segs[k + 1] || ''
    if (!seg) { text += sep; continue }
    if (/(二星|三星)/.test(seg)) {
      if (idx === 0) { text = text.replace(/；$/, '。'); continue } // 1星：效果未解锁，整句删除（前导分号改句号收尾）
      const isThreeOnly = /^(三星时|三星)/.test(seg.trim())
      let body = seg.trim().replace(/^(二星起|二星|三星时|三星)/, '')
      const m = body.match(/^(.*?)，三星(.*)$/)
      if (m) {
        if (idx === 1) {
          body = m[1] // 2星：只显示二星档
        } else {
          // 3星：二星档数值替换为三星档数值，保留三星独有补充（如"且…"、"（…）"）
          const v2 = (m[2].match(/[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/) || [''])[0]
          body = v2 ? m[1].replace(/[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/, v2) : m[1]
          const rest2 = m[2].replace(/^[^，]+?[-+]?\d+(?:\.\d+)?(?:%| 点| 灵力| 张| 回合)?/, '').trim()
          if (/^[且并（(]/.test(rest2)) body = `${body}${/^[（(]/.test(rest2) ? '' : '，'}${rest2}`
        }
      }
      if (isThreeOnly && idx === 1) { text = text.replace(/；$/, '。'); continue } // 三星专属：2星删除（前导分号改句号收尾）
      text += body + sep
    } else {
      text += seg + sep
    }
  }
  // 🎨 2️⃣ 剩余文本先做 HTML 转义防注入，再把星级变动的数值用金色加粗标注（百分比 / 次数 / 灵力三档均支持）
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc(text).replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(%)?/g, (m, a, b, c, pct) => '<span style="color:#ffb400;font-weight:600">' + [a, b, c][idx] + (pct || '') + '</span>')
}
function getCardDynamicDesc(card, star) {
  const name = card?.name;
  const starNum = star || getCardStar(card) || 1;
  const cfg = name ? user.pixi.player.CARD_DATA[name] : null;
  if (!cfg) return starSpecificDesc(card?.desc || '', starNum);
  return starSpecificDesc(cfg.desc || '', starNum);
}
// 统一销毁spine实例（封装复用）
async function destroySpineInstance() {
  if (!spineInst) return
  try {
    await spineInst.destroy()
  } catch (e) {
    console.warn('弹窗spine销毁捕获异常', e)
  }
  spineInst = null
  if (spineContainer.value) spineContainer.value.innerHTML = ''
}

async function openCardInfo(card) {
  const real = user.pixi.player.CARD_DATA[card.name]
  // 🎯 合并时 cost/maxCooldown 用按当前星级取好的数值（避免数组覆盖为 [3,2,2] 等）
  currentCard.value = {
    ...card,
    ...real,
    cost: getCardCostAtStar(card),
    maxCooldown: getCardCooldownAtStar(card),
  }
  showInfo.value = true
  await nextTick()

  await destroySpineInstance()

  if (spineContainer.value) {
    spineInst = await createCardSpine(card.name, 130, 198)
    if (spineInst && spineContainer.value) {
      spineContainer.value.innerHTML = ''
      spineContainer.value.appendChild(spineInst.canvas)
      await nextTick()
      // ✅ 用正确的 render 方法
      spineInst.render()
    }
  }
}

// 稀有度名称与颜色
const RARITY_NAMES = {
  common: 'rarityCommon',
  excellent: 'rarityExcellent',
  rare: 'rarityRare',
  epic: 'rarityEpic',
  legendary: 'rarityLegendary',
};
const RARITY_COLORS = {
  common: '#909399',
  excellent: '#409EFF',
  rare: '#8B5CF6',
  epic: '#E6A23C',
  legendary: '#F56C6C',
};
function rarityName(r) { return L(RARITY_NAMES[r] || 'rarityCommon'); }
function rarityColor(r) { return RARITY_COLORS[r] || '#909399'; }

function getCardRarity(card) {
  return card?.rarity || user.pixi.player.CARD_DATA?.[card?.name]?.rarity || 'common';
}

// 🪙 分解可得金币（稀有度默认 + 指定卡牌 decomposeGold 覆盖）
function getCardGoldValue(card) {
  const r = getCardRarity(card);
  const map = { common: 5, excellent: 15, rare: 30, epic: 60, legendary: 120 };
  let base = map[r] || 5;
  if (user.pixi.player.CARD_DATA?.[card?.name]?.decomposeGold != null) base = Number(user.pixi.player.CARD_DATA[card.name].decomposeGold);
  return base;
}

// 监听弹窗外层关闭，自动销毁spine
watch(() => props.visible, async (newVal) => {
  if (!newVal) {
    await destroySpineInstance()
    showInfo.value = false
    currentCard.value = null
  }
})

// 暴露方法给父组件调用
defineExpose({
  openCardInfo
})


</script>
