<template>
  <transition name="fade">
    <div v-if="visible" class="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999]">
      <div
        class="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-[2vh] w-[60vw] max-w-[90vw] max-h-[85vh] shadow-[0_2vh_6vh_rgba(0,0,0,0.6)] overflow-hidden flex flex-col animate-popup-in"
        :class="isVictory ? 'border-[0.3vh] border-[#fbbf24] shadow-[0_0_5vh_rgba(251,191,36,0.3)]' : 'border-[0.3vh] border-[#ef4444] shadow-[0_0_5vh_rgba(239,68,68,0.3)]'">

        <!-- 顶部标题区 -->
        <div
          class="py-[3vh] px-[4vh] pb-[2vh] flex justify-between items-center bg-gradient-to-r from-[rgba(251,191,36,0.15)] to-transparent border-b border-white/10"
          :class="{ 'from-[rgba(239,68,68,0.15)]': !isVictory }">
          <div class="flex items-center gap-[1.5vh]">
            <span class="text-[4vh]">{{ isVictory ? '🏆' : '💔' }}</span>
            <span class="text-[3.5vh] font-bold"
              :class="isVictory ? 'text-[#fbbf24] drop-shadow-[0_0_2vh_rgba(251,191,36,0.5)]' : 'text-[#ef4444] drop-shadow-[0_0_2vh_rgba(239,68,68,0.5)]'">
              {{ isVictory ? '战斗胜利' : '战斗失败' }}
            </span>
          </div>
          <div class="flex flex-col items-end gap-[0.5vh]">
            <span class="text-[1.6vh] text-[#94a3b8]">用时</span>
            <span class="text-[2.5vh] font-bold text-[#e2e8f0]">{{ rounds }} 回合</span>
          </div>
        </div>

        <!-- 内容区域：左右布局 -->
        <div class="flex gap-[3vh] p-[3vh] p-x-[4vh] flex-1 overflow-hidden">
          <!-- 左侧：经验和等级 -->
          <div class="flex-1 flex flex-col">
            <div class="text-[2vh] text-[#94a3b8] mb-[2vh] font-semibold tracking-[0.1vh]">等级进度</div>

            <div class="flex items-center gap-[2vh] mb-[2vh]">
              <div
                class="w-[8vh] h-[8vh] rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center shadow-[0_0_2vh_rgba(251,191,36,0.4)] flex-shrink-0"
                :class="{ 'level-bounce': levelBounceTrigger }">
                <span class="text-[2.7vh] font-bold text-white">Lv.{{ displayLevel }}</span>
              </div>
              <div class="flex-1">
                <div class="flex justify-end items-baseline gap-[0.5vh] mb-[1vh] text-[2vh] text-[#e2e8f0] font-medium">
                  <span :class="{ 'exp-glow': expGlowTrigger }">{{ displayExp }}</span>
                  <span class="text-[#64748b] text-[1.6vh]">/</span>
                  <span>{{ displayMaxExp }}</span>
                </div>
                <div class="h-[1.5vh] bg-white/10 rounded-[1vh] overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-[1vh] shadow-[0_0_1vh_rgba(34,197,94,0.5)] relative overflow-hidden progress-shimmer"
                    :style="{ width: expPercent + '%', transition: 'width 0.1s linear' }"></div>
                </div>
              </div>
            </div>

            <!-- 获得经验 -->
            <div v-if="isVictory"
              class="flex justify-between items-center py-[1.5vh] px-[2vh] bg-[rgba(34,197,94,0.1)] rounded-[1vh] border border-[rgba(34,197,94,0.3)] mb-[2vh]">
              <span class="text-[2vh] text-white">获得经验</span>
              <span class="text-[2.5vh] font-bold text-[#22c55e]">+{{ expGained }}</span>
            </div>

            <!-- 升级提示 -->
            <Transition name="level-up-fade">
              <div v-if="showLevelUpInfo" class="mt-auto pt-[2vh] border-t border-white/10">
                <div
                  class="flex items-center justify-center gap-[1vh] py-[1.5vh] bg-gradient-to-r from-[rgba(251,191,36,0.2)] to-[rgba(245,158,11,0.2)] rounded-[1vh] mb-[1.5vh] animate-level-up-glow">
                  <span class="text-[2.5vh]">⬆️</span>
                  <span class="text-[2.2vh] font-bold text-[#fbbf24]">等级提升！</span>
                </div>
                <div class="text-center text-[2.2vh] text-[#e2e8f0] mb-[1.5vh]">
                  Lv.{{ levelUpInfo.oldLevel }} → Lv.{{ levelUpInfo.newLevel }}
                </div>
                <div class="flex flex-col gap-[1vh]">
                  <div class="flex justify-between py-[0.8vh] px-[1.5vh] bg-white/5 rounded-[0.8vh]">
                    <span class="text-[2vh] text-[#94a3b8]">最大生命</span>
                    <span class="text-[2vh] text-[#22c55e] font-semibold">+ 16</span>
                  </div>
                  <div class="flex justify-between py-[0.8vh] px-[1.5vh] bg-white/5 rounded-[0.8vh]">
                    <span class="text-[2vh] text-[#94a3b8]">攻击力</span>
                    <span class="text-[2vh] text-[#22c55e] font-semibold">+ 5</span>
                  </div>
                  <div class="flex justify-between py-[0.8vh] px-[1.5vh] bg-white/5 rounded-[0.8vh]">
                    <span class="text-[2vh] text-[#94a3b8]">护甲</span>
                    <span class="text-[2vh] text-[#22c55e] font-semibold">+ 3</span>
                  </div>

                </div>
              </div>
            </Transition>
          </div>

          <!-- 右侧：物品奖励 -->
          <div class="flex-1 flex flex-col">
            <div class="text-[2vh] text-[#94a3b8] mb-[2vh] font-semibold tracking-[0.1vh]">战斗奖励</div>

            <div v-if="isVictory && itemRewards && itemRewards.length > 0" class="flex flex-col gap-[1.5vh]">
              <div v-for="item in itemRewards" :key="item.name"
                class="flex items-center gap-[1.5vh] p-[2vh] bg-[rgba(139,92,246,0.1)] rounded-[1.5vh] border border-[rgba(139,92,246,0.3)] transition-all hover:bg-[rgba(139,92,246,0.15)] hover:translate-x-[0.5vh]">
                <img :src="inventoryImg(item.img)" class="w-7vh h-7vh object-contain" />
                <div class="flex-1 min-w-0">
                  <div class="text-[3vh] iconfont2 text-[#e2e8f0] font-semibold mb-[0.5vh]">{{ item.name }}</div>
                </div>
                <div class="flex-shrink-0">
                  <span class="text-[3vh] font-bold text-[#a78bfa]">×{{ item.num }}</span>
                </div>
              </div>
            </div>

            <div v-else-if="!isVictory" class="flex-1 flex flex-col items-center justify-center gap-[1.5vh]">
              <div class="text-[6vh]">💪</div>
              <div class="text-[2.5vh] text-[#e2e8f0] font-semibold">不要气馁</div>
              <div class="text-[1.6vh] text-[#94a3b8]">提升等级或调整策略后再来挑战</div>
            </div>

            <div v-else class="text-center text-[#64748b] text-[1.8vh] py-[4vh]">
              暂无物品奖励
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class=" px-[4vh] pb-[3.5vh] text-center border-t border-white/10">
          <button
            class="py-[1.8vh] px-[8vh] text-[3vh] iconfont2 text-white border-none rounded-[1.2vh] cursor-pointer transition-all"
            v-if="showAnimate || !isVictory"
            :class="isVictory
              ? 'bg-gradient-to-br from-[#fbbf24] to-[#f59e0b]  hover:-translate-y-[0.3vh] hover:shadow-[0_1vh_3vh_rgba(251,191,36,0.4)] active:translate-y-0'
              : 'bg-gradient-to-br from-[#ef4444] to-[#dc2626]  hover:-translate-y-[0.3vh] hover:shadow-[0_1vh_3vh_rgba(239,68,68,0.4)] active:translate-y-0'"
            @click="handleClose">
            {{ isVictory ? '确认' : '返回' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { useCounterStore } from "@/store/counter";
const inventoryImg = (src) => {
  return new URL(`../../../assets/daoju/${src}.webp`, import.meta.url).href;
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
  rounds: {
    type: Number,
    default: 0
  }
})
const emit = defineEmits(['close'])

const user = useCounterStore()
const player = computed(() => user.pixi.player)

// ========== 经验动画相关 ==========
const displayExp = ref(0)       // 当前显示的经验值
const displayLevel = ref(1)     // 当前显示的等级
const displayMaxExp = ref(100)  // 当前显示等级的最大经验

const levelBounceTrigger = ref(false)  // 等级弹跳动画触发器
const expGlowTrigger = ref(false)      // 经验高亮动画触发器
const showLevelUpInfo = ref(false)     // 是否显示升级信息（动画结束后才显示）

let expAnimationTimer = null    // 动画计时器
const ANIMATION_DURATION = 1500 // 动画总时长（毫秒）

// 根据等级计算对应的最大经验值（与 store 中的升级公式保持一致）
function getMaxExpByLevel(targetLevel) {
  let maxExp = 50 // Lv.1 的初始 maxExp
  for (let i = 1; i < targetLevel; i++) {
    maxExp = Math.floor(50 + maxExp * 1.15)
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
    }
  }

  // 延迟一点开始，等弹窗入场动画差不多了再开始
  setTimeout(() => {
    expAnimationTimer = requestAnimationFrame(animate)
  }, 250)
}
const showAnimate = ref(false)
// 停止动画
function stopExpAnimation() {
  if (expAnimationTimer) {
    cancelAnimationFrame(expAnimationTimer)
    expAnimationTimer = null
  }
}

// 监听弹窗显示，开始动画
watch(() => props.visible, (newVal) => {
  if (newVal && props.isVictory) {
    // 重置显示值
    displayLevel.value = player.value.Level
    displayExp.value = player.value.exp
    displayMaxExp.value = player.value.maxExp
    showLevelUpInfo.value = false  // 重置升级信息显示

    // 开始动画
    startExpAnimation()
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
</style>
