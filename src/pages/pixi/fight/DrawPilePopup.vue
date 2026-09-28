<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70"
      @click.self="close">
      <div class="relative w-[68vw] max-w-[860px] max-h-[80vh] rounded-2xl p-[1.6vh] flex flex-col"
        style="background:linear-gradient(180deg,#1b1b33,#12122a);border:1px solid rgba(255,255,255,0.16);box-shadow:0 0 4vh rgba(0,0,0,0.6);">
        <!-- 标题栏 -->
        <div class="flex items-center justify-between mb-[1.2vh] px-[0.5vw]">
          <span class="text-white text-[2.2vh] font-bold iconfont2">{{ L('drawPileTitle') }}</span>
          <button
            class="w-[3.6vh] h-[3.6vh] rounded-full bg-white/10 text-white text-[2vh] leading-none cursor-pointer hover:bg-white/20 active:scale-90 transition-all"
            @click="close">✕</button>
        </div>
        <!-- 卡牌列表 -->
        <div v-if="cards.length" class="overflow-y-auto pr-[0.4vw]"
          style="scrollbar-width:thin;max-height:calc(96px * 3 + 1.2vh * 2);">
          <div class="grid gap-[1.2vh] justify-items-center"
            style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr));">
            <div v-for="(c, idx) in cards" :key="c.id" class="flex flex-col items-center gap-[0.5vh]">
              <div class="draw-pile-card-spine relative rounded-lg overflow-hidden"
                style="width:64px;height:96px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);">
                <span class="absolute top-[2px] left-[4px] text-[14px] font-bold text-cyan-300 leading-none"
                  style="z-index:2;text-shadow:0 0 2px #000, 0 0 3px #000;">{{ c.cost }}</span>
                <!-- 🏷️ 卡牌名：与手牌一致，卡牌正上方、黑色、无遮罩（z-index 避免被 spine canvas 覆盖） -->
                <div v-if="c.name.length === 2"
                  class="absolute top-[2px] left-1/2 -translate-x-1/2 text-[12px] font-bold iconfont2 text-black whitespace-nowrap"
                  style="z-index:2;">{{ tr(c.name) }}</div>
                <div v-else-if="c.name.length === 3"
                  class="absolute top-[2px] left-1/2 -translate-x-1/2 text-[11px] font-bold iconfont2 text-black whitespace-nowrap"
                  style="z-index:2;">{{ tr(c.name) }}</div>
                <div v-else
                  class="absolute top-[2px] left-1/2 -translate-x-1/2 text-[10px] font-bold iconfont2 text-black whitespace-nowrap"
                  style="z-index:2;">{{ tr(c.name) }}</div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-white/60 text-[2vh] text-center py-[6vh] iconfont2">{{ L('drawPileEmpty') }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { t, tr } from '@/i18n'
import { createCardSpine } from './CardSpine'

const props = defineProps({
  cards: { type: Array, default: () => [] },
})
const emit = defineEmits(['close'])

function close() { emit('close') }

// 语言响应
const langVersion = ref(0)
function L(key) { langVersion.value; return t(key) }
watch(() => t.__version ?? 0, () => { langVersion.value++ })

const spineInsts = []
function destroySpines() {
  spineInsts.forEach(i => { try { i.destroy() } catch (e) {} })
  spineInsts.length = 0
}

function renderSpines() {
  destroySpines()
  nextTick(() => {
    const boxes = document.querySelectorAll('.draw-pile-card-spine')
    boxes.forEach((box, idx) => {
      const c = props.cards[idx]
      if (!c || !box) return
      ;(async () => {
        try {
          const inst = await createCardSpine(c.name, 64, 96)
          if (inst && box.isConnected) {
            const old = box.querySelector('canvas')
            if (old) old.remove()
            box.appendChild(inst.canvas)
            inst.render()
            spineInsts.push(inst)
          } else if (inst) {
            try { inst.destroy() } catch (e) {}
          }
        } catch (e) {
          console.warn('牌库弹窗 spine 渲染失败', e)
        }
      })()
    })
  })
}

// 打开即挂载 → 首次渲染
onMounted(() => renderSpines())
// 牌库变化（抽牌/洗牌）时刷新
watch(() => props.cards.map(c => c.id).join(','), () => renderSpines())

onBeforeUnmount(() => { destroySpines() })
</script>
