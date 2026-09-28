<template>
  <div v-show="on" class="lowhp-fx" :style="{ opacity: dispOpacity }"></div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

// ❤️ 低血量屏幕警示：HP<30% 时全屏红色径向脉冲（心跳闪红）+ WebAudio 合成心跳音
// 地牢与战斗共用；血量越低闪得越快、越红
const props = defineProps({
  hp: { type: Number, default: 100 },
  maxHp: { type: Number, default: 100 },
})

const on = ref(false)
const dispOpacity = ref(0)
let beatAccum = 0
let lastPhase = null
let _ctx = null

const ratio = computed(() => (props.maxHp > 0 ? (props.hp || 0) / props.maxHp : 1))
const low = computed(() => ratio.value < 0.30 && (props.hp || 0) > 0)

watch(low, (v) => {
  on.value = v
  if (!v) { dispOpacity.value = 0; beatAccum = 0; lastPhase = null; }
}, { immediate: true }) // ⚡ immediate：残血直接进入（战斗/地牢）时立即显示，不依赖血量跨过阈值

// 💓 WebAudio 合成心跳（低频正弦双脉冲 lub-dub，无需音频素材）
function thump(at) {
  try {
    const c = _ctx
    const o = c.createOscillator(), g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(58, at)
    o.frequency.exponentialRampToValueAtTime(40, at + 0.13)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(0.5, at + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.15)
    o.connect(g); g.connect(c.destination)
    o.start(at); o.stop(at + 0.17)
  } catch (e) { /* ignore */ }
}
function playBeat() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    if (!_ctx) _ctx = new AC()
    if (_ctx.state === 'suspended') { try { _ctx.resume() } catch (e) { } }
    const t0 = _ctx.currentTime
    thump(t0); thump(t0 + 0.18) // lub-dub
  } catch (e) { /* ignore */ }
}

// ⏱️ 心跳循环：50ms 步进驱动透明度脉动 + 心跳音（血量越低越快越明显）
const tick = setInterval(() => {
  if (!low.value) { beatAccum = 0; lastPhase = null; return }
  const beatInterval = 0.85 + ratio.value * 1.1 // 🐢 减缓：30% 血约 1.18s/拍，濒死 0.85s/拍
  beatAccum += 0.05
  const phase = (beatAccum % beatInterval) / beatInterval
  const pulse = Math.pow(Math.max(0, Math.sin(phase * Math.PI * 2)), 1.5)
  // 血量越低越红：30% 血约 0.18~0.5，濒死 0.25~0.9
  dispOpacity.value = 0.18 + pulse * 0.62 * (1 - ratio.value * 0.75)
  if (lastPhase !== null && phase < lastPhase) playBeat()
  lastPhase = phase
}, 50)

onUnmounted(() => {
  clearInterval(tick)
  if (_ctx) { try { _ctx.close() } catch (e) { } _ctx = null }
})
</script>

<style scoped>
.lowhp-fx {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
  /* 全屏红色径向：中心基本透明不挡视野，向四周渐强，边缘最红 */
  background: radial-gradient(ellipse at center,
      rgba(255, 30, 30, 0) 0%,
      rgba(255, 20, 20, 0.04) 28%,
      rgba(220, 15, 15, 0.42) 62%,
      rgba(190, 8, 8, 0.8) 88%,
      rgba(150, 4, 4, 0.95) 100%);
}
</style>
