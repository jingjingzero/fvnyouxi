<template>
    <!-- 主弹窗 -->
    <div v-if="visible" class="fixed inset-0 z-9999 flex items-center justify-center bg-black/80" @click.self="close">
        <div class="w-[90%] max-w-[700px] rounded-lg border-2 border-gray-600 bg-gray-900 h-80vh p-5 text-white">
            <el-segmented v-model="value" :options="options" size="default" class="mb-5vh" />
            <template v-if="value === '卡牌'">
                <div class="space-y-5">
                    <!-- 当前手牌 -->
                    <div>
                        <h3 class="text-lg font-semibold mb-2">当前手牌</h3>
                        <div class="flex flex-wrap gap-2">
                            <div v-for="c in handCards" :key="c.id"
                                class="rounded-md bg-gray-800 px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 transition-colors"
                                @click="openCardInfo(c)">
                                {{ c.name }}
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
    <el-dialog v-model="showInfo" title="卡牌详情" width="600px" top="5vh" :z-index="9999" class="h-90vh! bg-[#f5f7fa]!">
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
                        {{ currentCard.name }}
                    </div>

                    <!-- 灵力消耗（左上角） -->
                    <div class="absolute top-[8px] left-[10px] text-[18px] font-bold text-blue-500">
                        {{ currentCard.cost }}
                    </div>

                </div>
            </div>

            <!-- 右侧：属性 -->
            <div class="flex-1">
                <!-- 卡牌详细说明 -->
                <div class="text-sm font-bold  ">卡牌介绍</div>
                <div class="text-12px bg-gray-100 p-2.5 rounded mb-4 leading-relaxed iconfont2 text-#333">
                    {{ currentCard.desc || '暂无描述' }}
                </div>

                <!-- 进化效果 -->
                <div>
                    <div class="text-sm font-bold mb-2">进化效果</div>
                    <div class="flex flex-wrap gap-1">
                        <el-popover v-for="(evo, idx) in currentCard.evoOptions" :key="idx" placement="bottom"
                            width="220" trigger="click" :teleported="false" effect="dark">
                            <div class="text-white text-12px">{{ getEvoDescription(evo) }}</div>

                            <template #reference>
                                <div class="relative">
                                    <el-button size="small" class="px-2 py-1 text-xs h-auto rounded-full" :class="isEvolved(currentCard, evo)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-200'">
                                        {{ evo }}
                                    </el-button>

                                    <el-icon
                                        class="absolute top--1.7 right-2.1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-xs">
                                        <CircleCheckFilled v-if="isEvolved(currentCard, evo)" color="#67C23A" />
                                        <CircleCloseFilled v-else color="#909399" />
                                    </el-icon>
                                </div>
                            </template>
                        </el-popover>
                    </div>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits, onUnmounted, nextTick, watch } from 'vue'
import { createCardSpine } from './CardSpine'
import { useCounterStore } from "@/store/counter";
import { CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import FriendInfo from './FriendInfo.vue'
import EnemyInfo from './EnemyInfo.vue'
const user = useCounterStore();
const value = ref('卡牌')
const options = ['卡牌', '友军信息', '敌人信息']

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
  currentCard.value = { ...card, ...real }
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

function getEvoDescription(evoName) {
  return currentCard.value?.evoDesc?.[evoName] || "暂无效果描述"
}

function isEvolved(card, evoName) {
  if (!card?.activeEvos) return false
  return card.activeEvos.includes(evoName)
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
