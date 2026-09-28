<template>
  <transition name="fade">
    <div v-if="visible" class="fixed inset-0 bg-black/75 flex items-center justify-center z-[999] ">
      <div
        class="bg-gradient-to-br from-[#1a1a2e] via-[#16213e]  to-[#0f3460] rounded-[2vh] w-[75vw] max-w-[90vw] max-h-[85vh] shadow-[0_2vh_6vh_rgba(0,0,0,0.6)] overflow-hidden flex flex-col animate-popup-in"
        :class="isVictory ? 'border-[0.3vh] border-[#fbbf24] shadow-[0_0_5vh_rgba(251,191,36,0.3)]' : 'border-[0.3vh] border-[#ef4444] shadow-[0_0_5vh_rgba(239,68,68,0.3)]'">

        <!-- 顶部标题区 -->
        <div
          class="py-[3vh] px-[4vh] pb-[2vh] flex justify-between items-center bg-gradient-to-r from-[rgba(251,191,36,0.15)] to-transparent border-b border-white/10"
          :class="{ 'from-[rgba(239,68,68,0.15)]': !isVictory }">
          <div class="flex items-center gap-[1.5vh]">
            <span class="text-[4vh]">{{ isVictory ? '🏆' : '💔' }}</span>
            <span class="text-[3.5vh] font-bold"
              :class="isVictory ? 'text-[#fbbf24] drop-shadow-[0_0_2vh_rgba(251,191,36,0.5)]' : 'text-[#ef4444] drop-shadow-[0_0_2vh_rgba(239,68,68,0.5)]'">
              {{ isVictory ? L('victory') : L('defeat') }}
            </span>
          </div>
          <div class="flex flex-col items-end gap-[0.5vh]">
            <span class="text-[1.6vh] text-[#94a3b8]">{{ L('timeUsed') }}</span>
            <span class="text-[2.5vh] font-bold text-[#e2e8f0]">{{ F('roundsFmt', { n: rounds }) }}</span>
          </div>
        </div>

        <!-- 内容区域：玩家经验 | 队友经验 | 掉落道具 -->
        <div class="grid gap-[3vh] p-[3vh] flex-1 overflow-hidden " :class="hasAlly ? 'grid-cols-3' : 'grid-cols-2'">
          <!-- 左侧：经验和等级 -->
          <div class="flex-1 flex flex-col">
            <div class="text-[2vh] text-[#94a3b8] mb-[2vh] font-semibold tracking-[0.1vh]">{{ L('playerExp') }}</div>

            <div class="flex items-center gap-[2vh] mb-[2vh] mx-1vw">
              <div
                class="w-[8vh] h-[4vh] rounded-2 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center shadow-[0_0_2vh_rgba(251,191,36,0.4)] flex-shrink-0"
                :class="{ 'level-bounce': levelBounceTrigger }">
                <span class="text-[2.7vh] font-bold text-white">Lv.{{ displayLevel }}</span>
              </div>
              <!-- 经验数字 + 进度条同一行水平排布 -->
              <div class="flex-1 flex items-center gap-[1.5vh] ">
                <div class="h-[1.5vh] bg-white/10 rounded-[1vh] overflow-hidden flex-1">
                  <div
                    class="h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-[1vh] shadow-[0_0_1vh_rgba(34,197,94,0.5)] relative overflow-hidden progress-shimmer"
                    :style="{ width: expPercent + '%', transition: 'width 0.1s linear' }"></div>
                </div>
                <span class="text-[2.3vh] text-[#e2e8f0] font-medium whitespace-nowrap">
                  <span :class="{ 'exp-glow': expGlowTrigger }">{{ displayExp }}</span>
                  <span class="text-[#64748b] text-[1.6vh]">/</span>
                  <span>{{ displayMaxExp }}</span>
                </span>
              </div>
            </div>

            <!-- 获得经验 -->
            <div v-if="isVictory"
              class="relative flex justify-between items-center py-[1.5vh] px-[2vh] mx-1vw bg-gradient-to-r from-[rgba(34,197,94,0.18)] to-[rgba(16,185,129,0.05)] rounded-[1vh] border border-[rgba(34,197,94,0.35)] mb-[2vh] overflow-hidden">
              <div class="absolute -left-[1.5vh] -top-[1.5vh] w-[5vh] h-[5vh] rounded-full bg-[#22c55e]/20 blur-[1.5vh] pointer-events-none"></div>
              <span class="text-[2vh] text-[#e2e8f0] font-medium relative">{{ L('expGainedLabel') }}</span>
              <span class="text-[3vh] font-bold text-[#4ade80] relative exp-gain-pop" style="text-shadow:0 0 1.5vh rgba(74,222,128,0.5)">+{{ expGained }}</span>
            </div>

            <!-- 获得金币 -->
            <div v-if="isVictory && goldGained > 0"
              class="relative flex justify-between items-center py-[1.5vh] px-[2vh] mx-1vw bg-gradient-to-r from-[rgba(251,191,36,0.18)] to-[rgba(245,158,11,0.05)] rounded-[1vh] border border-[rgba(251,191,36,0.35)] mb-[2vh] overflow-hidden">
              <div class="absolute -left-[1.5vh] -top-[1.5vh] w-[5vh] h-[5vh] rounded-full bg-[#fbbf24]/20 blur-[1.5vh] pointer-events-none"></div>
              <span class="text-[2vh] text-[#e2e8f0] font-medium relative">{{ L('goldGainedLabel') }}</span>
              <span class="text-[3vh] font-bold text-[#fbbf24] relative exp-gain-pop" style="text-shadow:0 0 1.5vh rgba(251,191,36,0.5)">+{{ goldGained }}</span>
            </div>


            <!-- 升级提示 -->
            <Transition name="level-up-fade">
              <div v-if="showLevelUpInfo" class="mt-auto pt-[2vh] border-t border-white/10 overflow-y-auto px-1vw">
                <div
                  class="flex items-center justify-center gap-[1vh] py-[1.5vh] bg-gradient-to-r from-[rgba(251,191,36,0.2)] to-[rgba(245,158,11,0.2)] rounded-[1vh] mb-[1.5vh] animate-level-up-glow">
        
                  <span class="text-[2.2vh] font-bold text-[#fbbf24]">{{ L('levelUpTitle') }}</span>
                </div>
                <div class="text-center text-[2.2vh] text-[#e2e8f0] mb-[1.5vh]">
                  Lv.{{ levelUpInfo.oldLevel }} → Lv.{{ levelUpInfo.newLevel }}
                </div>
                <div class="flex flex-col gap-[1vh]">
                  <div class="flex justify-between py-[0.8vh] px-[1.5vh] bg-white/5 rounded-[0.8vh]">
                    <span class="text-[2vh] text-[#94a3b8]">{{ L('attackPower') }}</span>
                    <span class="text-[2vh] text-[#22c55e] font-semibold">+ {{ levelAttackGain }}</span>
                  </div>
                  <div class="flex justify-between py-[0.8vh] px-[1.5vh] bg-white/5 rounded-[0.8vh]">
                    <span class="text-[2vh] text-[#94a3b8]">{{ L('freeAttrPointsLeft') }}</span>
                    <span class="text-[2vh] text-[#22c55e] font-semibold">+ {{ levelFreeAttrGain }}</span>
                  </div>

                </div>
              </div>
            </Transition>
          </div>

          <!-- 🐾 中栏：队友经验（仿玩家样式） -->
          <div v-if="hasAlly" class="flex flex-col min-w-0">
            <div class="text-[2vh] text-[#94a3b8] mb-[2vh] font-semibold tracking-[0.1vh]">{{ L('allyExp') }}</div>
            <div class="flex flex-col gap-[1.4vh] max-h-[52vh] overflow-y-auto pr-[0.5vh]">
              <div v-for="al in allyExpResults" :key="al.img"
                class="bg-[rgba(139,92,246,0.06)] rounded-[1vh] border border-[rgba(139,92,246,0.25)] p-[1.2vh]">
                <!-- 等级行：Lv徽章 + 名字 + 进度条 + 数字（仿玩家） -->
                <div class="flex items-center gap-[2vh]">
                  <div
                    class="w-[8vh] h-[4vh] rounded-2 bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center shadow-[0_0_2vh_rgba(139,92,246,0.4)] flex-shrink-0"
                    :class="{ 'level-bounce': al.leveledUp }">
                    <span class="text-[2.7vh] font-bold text-white">Lv.{{ al.level }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-[1vh] mb-[0.6vh]">
                      <span class="text-[2vh] font-bold text-[#f1f5f9] truncate">{{ tr(al.name) }}</span>
                    </div>
                    <div class="flex items-center gap-[1.5vh]">
                      <div class="h-[1.5vh] bg-white/10 rounded-[1vh] overflow-hidden flex-1">
                        <div class="h-full bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] rounded-[1vh] relative overflow-hidden progress-shimmer"
                          :style="{ width: allyAnimPct[al.img] + '%', transition: allyAnimLock[al.img] ? 'none' : 'width 0.9s cubic-bezier(.22,1,.36,1) 0.15s' }"></div>
                      </div>
                      <span class="text-[2.3vh] text-[#e2e8f0] font-medium whitespace-nowrap">
                        <span>{{ al.exp }}</span><span class="text-[#64748b] text-[1.6vh]">/</span><span>{{ al.maxExp }}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <!-- 获得经验卡（仿玩家，紫色版） -->
                <div
                  class="mt-[2vh] relative flex justify-between items-center px-[2vh] py-[1.5vh] bg-gradient-to-r from-[rgba(139,92,246,0.2)] to-[rgba(99,102,241,0.06)] rounded-[1vh] border border-[rgba(139,92,246,0.3)] overflow-hidden">
                  <div class="absolute -left-[1.5vh] -top-[1.5vh] w-[5vh] h-[5vh] rounded-full bg-[#a78bfa]/20 blur-[1.5vh] pointer-events-none"></div>
                  <span class="text-[2vh] text-[#e2e8f0] font-medium relative">{{ L('expGainedLabel') }}</span>
                  <span class="text-[3vh] font-bold text-[#c4b5fd] ally-exp-gain relative" style="text-shadow:0 0 1.5vh rgba(167,139,250,0.55)">+{{ al.expGain }}</span>
                </div>
                <!-- 等级提升（仿玩家升级提示） -->
                <Transition name="level-up-fade">
                  <div v-if="al.leveledUp" class="mt-[2vh] pt-[2vh] border-t border-white/10">
                    <div
                      class="flex items-center justify-center gap-[1vh] py-[1.5vh] bg-gradient-to-r from-[rgba(251,191,36,0.2)] to-[rgba(245,158,11,0.2)] rounded-[1vh] mb-[1.5vh] animate-level-up-glow">
      
                      <span class="text-[2.2vh] font-bold text-[#fbbf24]">{{ L('levelUpTitle') }}</span>
                    </div>
                    <div class="text-center text-[2.2vh] text-[#e2e8f0] mb-[1.5vh]">
                      Lv.{{ al.prevLevel }} → Lv.{{ al.level }}
                    </div>
                    <div class="flex flex-col gap-[1vh]">
                      <div class="flex justify-between py-[0.8vh] px-[1.5vh] bg-white/5 rounded-[0.8vh]">
                        <span class="text-[2vh] text-[#94a3b8]">攻击力</span>
                        <span class="text-[2vh] text-[#22c55e] font-semibold">+ {{ al.gains?.attack || 0 }}</span>
                      </div>
                      <div class="flex justify-between py-[0.8vh] px-[1.5vh] bg-white/5 rounded-[0.8vh]">
                        <span class="text-[2vh] text-[#94a3b8]">速度</span>
                        <span class="text-[2vh] text-[#22c55e] font-semibold">+ {{ al.gains?.speed || 0 }}</span>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <!-- 右侧：物品奖励 -->
          <div class="flex-1 flex flex-col">
            <div class="text-[2vh] text-[#94a3b8] mb-[2vh] font-semibold tracking-[0.1vh]">{{ L('battleRewards') }}</div>

            <div v-if="isVictory && itemRewards && itemRewards.length > 0" class="flex flex-col gap-[1.5vh]">
              <div v-for="item in itemRewards" :key="item.name"
                class="flex items-center gap-[1.5vh] p-[2vh] bg-[rgba(139,92,246,0.1)] rounded-[1.5vh] border border-[rgba(139,92,246,0.3)] transition-all hover:bg-[rgba(139,92,246,0.15)] hover:translate-x-[0.5vh]">
                <img :src="inventoryImg(item.img)" class="w-6vh h-6vh object-contain" />
                <div class="flex-1 min-w-0">
                  <div class="text-[2.6vh] iconfont2 text-[#e2e8f0] font-semibold mb-[0.5vh]">{{ tr(item.name) }}</div>
                </div>
                <div class="flex-shrink-0">
                  <span class="text-[3vh] font-bold text-[#a78bfa]">×{{ item.num }}</span>
                </div>
              </div>
            </div>

            <div v-else-if="!isVictory" class="flex-1 flex flex-col items-center justify-center gap-[1.5vh]">
              <div class="text-[6vh]">💪</div>
              <div class="text-[2.5vh] text-[#e2e8f0] font-semibold">{{ L('dontGiveUp') }}</div>
              <div class="text-[1.6vh] text-[#94a3b8]">{{ L('retryHint') }}</div>
            </div>

            <div v-else class="text-center text-[#64748b] text-[1.8vh] py-[4vh]">
              {{ L('noItemRewards') }}
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="px-[4vh] pb-[3.5vh] border-t border-white/10">
          <!-- 胜利：返回 + 背包（讨伐战已移除，所有战斗均为自定义/地牢战斗） -->
          <div v-if="isVictory && showAnimate" class="flex gap-[2vh] justify-center pt-[3vh]">
            <button
              class="py-[1.8vh] px-[8vh] text-[3vh] iconfont2 text-white border-none rounded-[1.2vh] cursor-pointer transition-all bg-gradient-to-br from-[#22c55e] to-[#16a34a] hover:-translate-y-[0.3vh] hover:shadow-[0_1vh_3vh_rgba(34,197,94,0.4)] active:translate-y-0"
              @click="handleLeave">
              {{ L('back') }}
            </button>
          </div>
          <!-- 失败：返回按钮 -->
          <div v-else-if="!isVictory" class="text-center pt-[3vh]">
            <button
              class="py-[1.8vh] px-[8vh] text-[3vh] iconfont2 text-white border-none rounded-[1.2vh] cursor-pointer transition-all bg-gradient-to-br from-[#ef4444] to-[#dc2626] hover:-translate-y-[0.3vh] hover:shadow-[0_1vh_3vh_rgba(239,68,68,0.4)] active:translate-y-0"
              @click="handleClose">
              {{ L('back') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { battleLog } from './logger.js'
import { ref, reactive, computed, watch, onUnmounted, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import emitter from "@/bus";
import { t, tr } from "@/i18n";
import { useCounterStore } from "@/store/counter";
import { LEVEL_UP_CFG } from "@/store/configs";
import { createDaojuSpine } from "./CardSpine";
import { ITEM_SKIN_MAP } from "../dungeon/config";
// 🌐 语言响应：语言切换后重渲染 + 词条读取
const langVersion = ref(0);
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++);
function L(key) { langVersion.value; return t(key); }
function F(key, vars) { let s = L(key); if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }
// 🎲 物品图解析：daojuall spine 皮肤名 → dataURL（window.__daojuImgMap 全局缓存，未生成则异步生成补上）
const skinUrls = ref({});
const skinCached = (skin) => {
  const g = (typeof window !== 'undefined' && window.__daojuImgMap) || {};
  if (g[skin]) return g[skin];
  return skinUrls.value[skin] || '';
};
async function ensureDaojuSkin(skin) {
  if (!skin || skinCached(skin)) return;
  try {
    const result = await createDaojuSpine(skin, 80, 80);
    if (result?.canvas) {
      const url = result.canvas.toDataURL();
      skinUrls.value[skin] = url;
      if (window.__daojuImgMap) window.__daojuImgMap[skin] = url;
      result.destroy?.();
    }
  } catch (e) { /* 皮肤加载失败静默，保持占位 */ }
}
const inventoryImg = (src) => {
  if (!src) return '';
  if (/^https?:\/\//.test(src) || src.startsWith('/') || src.startsWith('data:')) return src;
  const g = (typeof window !== 'undefined' && window.__daojuImgMap) || {};
  if (g[src]) return g[src];
  const cached = skinUrls.value[src];
  if (cached) return cached;
  ensureDaojuSkin(src); // 🔄 异步生成，生成后响应式补上
  return '';
};

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  isVictory: {
    type: Boolean,
    default: true
  },
  expGained: {
    default: 0,
  },
  goldGained: {
    type: Number,
    default: 0
  },
  itemRewards: {
    type: Array,
    default: () => []
  },
  levelUpInfo: {
    type: Object,
    default: null
  },
  // 🐾 携带队友经验结果（胜利结算展示）
  allyExpResults: {
    type: Array,
    default: () => []
  },
  rounds: {
    type: Number,
    default: 0
  },
  // 是否为自定义战斗（讨伐战已移除：胜利只显示「返回」）
  customBattle: {
    type: Boolean,
    default: false
  }
})

// 🎁 掉落物品皮肤图预生成（物品名 → ITEM_SKIN_MAP → daojuall 皮肤）
watch(() => props.itemRewards, (list) => {
  (list || []).forEach(it => {
    const skin = it.img || ITEM_SKIN_MAP[it.name] || it.name;
    ensureDaojuSkin(skin);
  });
}, { immediate: true, deep: true });
const emit = defineEmits(['close', 'leave'])

const user = useCounterStore()
const player = computed(() => user.pixi.player)

// ⚔️ 升级属性加成（与 store._performLevelUp 一致：每级 +attackPerLevel 攻击 +4 自由属性点，无其他成长）
const levelAttackGain = computed(() => {
  const lv = props.levelUpInfo?.leveledUp
    ? (props.levelUpInfo.newLevel - props.levelUpInfo.oldLevel)
    : 0
  return lv * (LEVEL_UP_CFG.player.attackPerLevel ?? 2)
})
const levelFreeAttrGain = computed(() => {
  const lv = props.levelUpInfo?.leveledUp
    ? (props.levelUpInfo.newLevel - props.levelUpInfo.oldLevel)
    : 0
  return lv * 4
})

// 🐾 是否有携带队友经验（决定三栏/两栏布局）
const hasAlly = computed(() => props.isVictory && Array.isArray(props.allyExpResults) && props.allyExpResults.length > 0)

// 🐾 队友经验条百分比
function allyExpPct(al) {
  if (!al || !al.maxExp) return 0
  return Math.max(0, Math.min(100, (al.exp / al.maxExp) * 100))
}

// 🐾 队友经验条动画：与玩家一致 —— 从加经验前比例 → 拉满 100%（升级时）→ 新等级重新蓄
const allyAnimPct = reactive({})
const allyAnimLock = reactive({}) // true 时禁用 transition（用于 100% → 0 的瞬移重置）
let _allyAnimTimer = null
watch(() => props.visible, (v) => {
  if (_allyAnimTimer) { clearTimeout(_allyAnimTimer); _allyAnimTimer = null }
  if (v) {
    const ups = []
    for (const al of props.allyExpResults) {
      allyAnimLock[al.img] = false
      allyAnimPct[al.img] = al.prevMaxExp ? Math.min(100, (al.prevExp / al.prevMaxExp) * 100) : 0
      if (al.leveledUp) ups.push(al)
    }
    _allyAnimTimer = setTimeout(() => {
      // 未升级：直接过渡到最终比例
      for (const al of props.allyExpResults) {
        if (!al.leveledUp) allyAnimPct[al.img] = al.maxExp ? Math.min(100, (al.exp / al.maxExp) * 100) : 0
      }
      // 升级：先从旧进度拉满 100%
      for (const al of ups) allyAnimPct[al.img] = 100
      // 拉满动画结束后：瞬移 0 → 新等级从 0 蓄到最终值
      _allyAnimTimer = setTimeout(() => {
        for (const al of ups) {
          allyAnimLock[al.img] = true
          allyAnimPct[al.img] = 0
        }
        requestAnimationFrame(() => {
          for (const al of ups) {
            allyAnimLock[al.img] = false
            allyAnimPct[al.img] = al.maxExp ? Math.min(100, (al.exp / al.maxExp) * 100) : 0
          }
        })
      }, 1000)
    }, 350)
  }
}, { immediate: true })
onUnmounted(() => { if (_allyAnimTimer) clearTimeout(_allyAnimTimer) })

// ========== 经验动画相关 ==========
const displayExp = ref(0)       // 当前显示的经验值
const displayLevel = ref(1)     // 当前显示的等级
const displayMaxExp = ref(100)  // 当前显示等级的最大经验

const levelBounceTrigger = ref(false)  // 等级弹跳动画触发器
const expGlowTrigger = ref(false)      // 经验高亮动画触发器
const showLevelUpInfo = ref(false)     // 是否显示升级信息（动画结束后才显示）

let expAnimationTimer = null    // 动画计时器
let startDelayTimer = null     // 延迟启动计时器
let failTimeout = null         // 战斗失败自动跳转计时器
const ANIMATION_DURATION = 1500 // 动画总时长（毫秒）

// 根据等级计算对应的最大经验值（与 store 中的升级公式保持一致）
function getMaxExpByLevel(targetLevel) {
  let maxExp = 50 // Lv.1 的初始 maxExp
  for (let i = 1; i < targetLevel; i++) {
    maxExp = Math.floor(25 + maxExp * 1.15)
  }
  return maxExp
}

// 监听等级变化，触发弹跳动画
watch(displayLevel, (newVal, oldVal) => {
  if (newVal > oldVal) {
    // 等级提升，触发弹跳动画
    levelBounceTrigger.value = false
    // 下一帧再设为 true，确保动画重新播放
    requestAnimationFrame(() => {
      levelBounceTrigger.value = true
    })
  }
})

// 监听经验变化，触发高亮动画（每隔一段时间触发一次，不要太频繁）
let lastExpGlowTime = 0
watch(displayExp, () => {
  const now = Date.now()
  if (now - lastExpGlowTime > 150) {
    lastExpGlowTime = now
    expGlowTrigger.value = false
    requestAnimationFrame(() => {
      expGlowTrigger.value = true
    })
  }
})

// 经验百分比（用显示值计算）
const expPercent = computed(() => {
  if (!displayMaxExp.value) return 0
  return Math.min(100, (displayExp.value / displayMaxExp.value) * 100)
})

// 开始经验动画
function startExpAnimation() {
  // 停止之前的动画
  stopExpAnimation()

  const finalLevel = player.value.Level
  const finalExp = player.value.exp
  const finalMaxExp = player.value.maxExp

  // 计算升级了几级
  const levelsGained = props.levelUpInfo?.leveledUp
    ? (props.levelUpInfo.newLevel - props.levelUpInfo.oldLevel)
    : 0

  // 初始值
  if (props.levelUpInfo?.leveledUp) {
    // 升级了，从旧等级的 0 经验开始（视觉效果更好）
    displayLevel.value = props.levelUpInfo.oldLevel
    displayExp.value = 0
    // 使用旧等级对应的 maxExp，动画过程中随等级提升逐步更新
    displayMaxExp.value = getMaxExpByLevel(props.levelUpInfo.oldLevel)
  } else {
    // 没升级，从加经验前的值开始
    displayLevel.value = finalLevel
    displayExp.value = Math.max(0, finalExp - props.expGained)
    displayMaxExp.value = finalMaxExp
  }

  // 计算总增长经验数（用于动画进度计算）
  // 简化处理：把多级经验换算成单级的百分比
  const startPercent = props.levelUpInfo?.leveledUp
    ? 0
    : Math.max(0, (finalExp - props.expGained) / finalMaxExp * 100)
  const endPercent = (finalExp / finalMaxExp) * 100
  const totalPercent = levelsGained * 100 + (endPercent - startPercent)

  if (totalPercent <= 0) {
    // 没有经验增长，直接显示最终值
    displayLevel.value = finalLevel
    displayExp.value = finalExp
    displayMaxExp.value = finalMaxExp
    return
  }

  const startTime = Date.now()

  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(1, elapsed / ANIMATION_DURATION)

    // 缓动函数：easeOutCubic，先快后慢
    const easedProgress = 1 - Math.pow(1 - progress, 3)

    // 当前增长的百分比
    const currentPercentGain = totalPercent * easedProgress

    // 计算当前等级和经验
    if (props.levelUpInfo?.leveledUp) {
      // 升级的情况
      let remainingPercent = currentPercentGain
      let currentLevel = props.levelUpInfo.oldLevel
      let currentExpPercent = 0

      // 计算经过了几级
      while (remainingPercent >= 100 && currentLevel < finalLevel) {
        currentLevel++
        remainingPercent -= 100
      }

      currentExpPercent = remainingPercent

      displayLevel.value = currentLevel
      // 根据当前等级动态更新 maxExp
      const currentMaxExp = getMaxExpByLevel(currentLevel)
      displayMaxExp.value = currentMaxExp
      displayExp.value = Math.floor((currentExpPercent / 100) * currentMaxExp)
    } else {
      // 没升级的情况
      const currentExp = Math.floor(
        Math.max(0, finalExp - props.expGained) + (props.expGained * easedProgress)
      )
      displayExp.value = Math.min(currentExp, finalExp)
    }

    if (progress < 1) {
      expAnimationTimer = requestAnimationFrame(animate)
    } else {
      // 动画结束，确保显示最终值
      displayLevel.value = finalLevel
      displayExp.value = finalExp
      displayMaxExp.value = finalMaxExp
      showAnimate.value = true
      // 如果升级了，延迟一点显示升级详情
      if (props.levelUpInfo?.leveledUp) {
        showLevelUpInfo.value = true
      }
      donghua()
    }
  }

  // 延迟一点开始，等弹窗入场动画差不多了再开始
  startDelayTimer = setTimeout(() => {
    expAnimationTimer = requestAnimationFrame(animate)
  }, 250)
}
// ===== 剧情战斗自动返回：根据战斗标记映射到后续剧情对话 =====
// flag: 剧情战斗标记；win: 胜利后的对话；lose: 失败后的对话（函数=动态解析，省略=同 win）
const STORY_BATTLE_ROUTES = [
  {
    flag: '初次遭遇魔物',
    win: 'jqZ30',
    // 失败分支：按成就「不可能的失败」的进度选择不同对话
    lose: () => {
      // 完全没有任何「不可能的失败」成就
      if (!user.hasAchievement('不可能的失败')) return 'sb01';
      // 有成就且进度为 1
      if (user.hasAchievement('不可能的失败', 1)) return 'sb10';
      // 有成就但进度不是 1（如进度 2）
      return 'sb25';
    },
  },
  { flag: '初次遭遇魔物1', win: 'jqZ100' },
  { flag: '和风息战斗1', win: 'jqZ240' },
  { flag: '和风息战斗2', win: 'fx20' },
  { flag: '和风息战斗3', win: 'dayo549' },
  { flag: 'Day5魔物潮1', win: 'dayo10' },
  { flag: 'Day5魔物潮2', win: 'dayo25' },
  { flag: 'Day5魔物潮3', win: 'dayo40' },
  { flag: 'Day5魔物潮4', win: 'dayo60' },
  { flag: 'Day5魔物潮7', win: 'dayo403' },
  { flag: 'Day5魔物潮8', win: 'dayo420' },
  // 🏰 幕10 深林城堡：晨曦线感应区暗影埋伏（必定落败）→ 战败自动触发被囚段（forest-deep.js）
  { flag: 'cdCastleFight', loadData: 'npc/forest-deep', win: 'cdFightWin', lose: 'cdJail01' },
  // 🏰 幕11 脱困：门口战暗影王（必定落败）→ 失败自动触发风息救场段（forest-deep.js）
  { flag: 'cdEscapeFight', loadData: 'npc/forest-deep', win: 'cdEsWin', lose: 'cdEs26' },
  // 🌊 云弥线：城堡暗影守卫埋伏（可胜）→ 胜 cdYAw1 收尾 / 负 cdYAFail1 退出可重试（forest-deep.js）
  { flag: 'cdYAmbushFight', loadData: 'npc/forest-deep', win: 'cdYAw1', lose: 'cdYAFail1' },
  // 🌊 云弥线：门口战暗影王（可胜）→ 胜 cdYCw1（里亚求情、暗影王退走）/ 负 cdYCFail1 退出可重试
  { flag: 'cdYKingFight', loadData: 'npc/forest-deep', win: 'cdYCw1', lose: 'cdYCFail1' },
  // ⚔️ 幕12 守城之夜：连续4波魔物潮（第4波为暗影王，被界木压制可战胜）
  //   任何一波失败 → 营地沦陷坏结局（cdSgFail）；全部胜利 → 暗影王退走（cdSgW4Win → cdSgEnd）
  { flag: 'cdSiege1', loadData: 'npc/forest-deep', win: 'cdSgW1Win', lose: 'cdSgFail' },
  { flag: 'cdSiege2', loadData: 'npc/forest-deep', win: 'cdSgW2Win', lose: 'cdSgFail' },
  { flag: 'cdSiege3', loadData: 'npc/forest-deep', win: 'cdSgW3Win', lose: 'cdSgFail' },
  { flag: 'cdSiege4', loadData: 'npc/forest-deep', win: 'cdSgW4Win', lose: 'cdSgFail' },
];

function donghua() {
  battleLog('胜利=', props.isVictory);

  // 找到当前完成的剧情战斗标记
  const route = STORY_BATTLE_ROUTES.find(r => user.isDialogueComplete(r.flag));
  if (!route) return;

  user.resetDialogueProgress(route.flag);
  // 触发离开事件，返回地图继续剧情
  emit('leave')

  // 解析要触发的对话：胜利用 win，失败优先用 lose（支持函数动态解析），省略则同 win
  const next = props.isVictory
    ? route.win
    : (typeof route.lose === 'function' ? route.lose() : (route.lose ?? route.win));

  emitter.emit("talkToNpc", {
    loadData: route.loadData || 'npc/jingling', // 🏰 剧情战斗路由可指定专属对话文件（如 forest-deep）
    name: next
  });
}
const showAnimate = ref(false)
// 停止动画
function stopExpAnimation() {
  if (startDelayTimer) {
    clearTimeout(startDelayTimer)
    startDelayTimer = null
  }
  if (expAnimationTimer) {
    cancelAnimationFrame(expAnimationTimer)
    expAnimationTimer = null
  }
  if (failTimeout) {
    clearTimeout(failTimeout)
    failTimeout = null
  }
}

// 监听弹窗显示，开始动画
watch(() => props.visible, (newVal) => {
  if (newVal) {
    showLevelUpInfo.value = false
    if (props.isVictory) {
      // 胜利：走经验动画
      displayLevel.value = player.value.Level
      displayExp.value = player.value.exp
      displayMaxExp.value = player.value.maxExp
      startExpAnimation()
    } else {
      // 战斗失败：不点击按钮，自动延时触发剧情
      failTimeout = setTimeout(() => {
        donghua()
      }, 500) // 弹窗显示1.5秒后自动跳转，时长你自己改
    }
  } else {
    stopExpAnimation()
    showLevelUpInfo.value = false
  }
})

// 组件销毁时清理
onUnmounted(() => {
  stopExpAnimation()
})


function handleClose() {
  emit('close')
}

function handleLeave() {
  emit('leave')
}
</script>

<style scoped>
/* 弹窗入场动画 */
@keyframes popupIn {
  from {
    transform: scale(0.7) translateY(3vh);
    opacity: 0;
  }

  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.animate-popup-in {
  animation: popupIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 等级变化弹跳动画 */
@keyframes levelBounce {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.2);
  }

  100% {
    transform: scale(1);
  }
}

.level-bounce {
  animation: levelBounce 0.4s ease-out;
}

/* 经验数字变化高亮效果 */
@keyframes expGlow {
  0% {
    text-shadow: 0 0 0 rgba(34, 197, 94, 0);
  }

  50% {
    text-shadow: 0 0 1vh rgba(34, 197, 94, 0.8);
  }

  100% {
    text-shadow: 0 0 0 rgba(34, 197, 94, 0);
  }
}

.exp-glow {
  animation: expGlow 0.3s ease-out;
}

/* 进度条流光效果 */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }

  100% {
    background-position: 200% 0;
  }
}

.progress-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: inherit;
}

/* 升级提示淡入动画 */
.level-up-fade-enter-active {
  animation: levelUpFadeIn 1s ease-out;
}

@keyframes levelUpFadeIn {
  0% {
    opacity: 0;
    transform: translateY(2vh);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 等级提升标题发光动画 */
@keyframes levelUpGlow {

  0%,
  100% {
    box-shadow: 0 0 1vh rgba(251, 191, 36, 0.3);
  }

  50% {
    box-shadow: 0 0 2vh rgba(251, 191, 36, 0.6);
  }
}

.animate-level-up-glow {
  animation: levelUpGlow 1.5s ease-in-out infinite;
}

/* ===== 🐾 队友经验条动画 ===== */
/* 进度条流光 */
@keyframes allyBarShimmer {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
}
.ally-bar-shimmer {
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 50%, transparent 100%);
  width: 45%;
  animation: allyBarShimmer 1.5s ease-in-out infinite;
}
/* 经验数字弹出 */
@keyframes allyExpGainPop {
  0% { opacity: 0; transform: translateY(1.2vh) scale(0.5); }
  60% { opacity: 1; transform: translateY(-0.3vh) scale(1.15); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.ally-exp-gain {
  animation: allyExpGainPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s backwards;
  text-shadow: 0 0 1.4vh rgba(167, 139, 250, 0.65);
}
/* 升级头像弹跳 */
@keyframes allyAvatarBounce {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-0.9vh) scale(1.08); }
  60% { transform: translateY(0) scale(0.96); }
}
.ally-avatar-bounce {
  animation: allyAvatarBounce 0.7s ease-in-out;
}
/* 升级卡片呼吸光晕 */
@keyframes allyLevelUpGlow {
  0%, 100% { box-shadow: 0 0 0 rgba(251, 191, 36, 0); }
  50% { box-shadow: 0 0 1.8vh rgba(251, 191, 36, 0.45); }
}
.ally-level-up-card {
  animation: allyLevelUpGlow 1.8s ease-in-out infinite;
}
/* 玩家获得经验数字弹出 */
@keyframes expGainPop {
  0% { opacity: 0; transform: translateY(0.8vh) scale(0.6); }
  60% { opacity: 1; transform: translateY(-0.2vh) scale(1.12); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.exp-gain-pop {
  animation: expGainPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s backwards;
}
</style>
