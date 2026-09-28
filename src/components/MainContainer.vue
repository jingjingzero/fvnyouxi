<template>
  <div class="fixed z-9999 left-0 w-full h-full flex items-center justify-center pointer-events-none">
    <transition name="msg-fade">
      <div v-if="visible && messages.length > 0" class="flex flex-col items-center gap-1.5vh pointer-events-auto">
        <div
          v-for="(msg, idx) in displayList"
          :key="idx"
          class="px-4vh py-2vh rounded-xl shadow-lg backdrop-blur-sm text-2.5vh font-bold whitespace-nowrap transition-all duration-200"
          :class="msgClass(msg.type)"
          :style="msgStyle(msg)"
          :id="'el-message-' + idx"
        >
          <span v-if="msg.icon" class="mr-1.5vh">{{ msg.icon }}</span>
          {{ msg.text }}
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const visible = ref(false)
const messages = ref([])
const zIndex = ref(10000)

const displayList = computed(() => messages.value.slice(0, 3))

const typeMap = {
  success: { bg: 'bg-#67C23A/90', icon: '✅' },
  warning: { bg: 'bg-#E6A23C/90', icon: '⚠️' },
  error:   { bg: 'bg-#F56C6C/90', icon: '❌' },
  info:    { bg: 'bg-#409EFF/90', icon: 'ℹ️' },
}

function msgClass(type) {
  return typeMap[type]?.bg || typeMap.info.bg
}

function msgStyle(msg) {
  const z = zIndex.value
  return { zIndex: z, color: '#fff' }
}

function show(text, type = 'info', duration = 2500) {
  const icon = typeMap[type]?.icon || ''
  const id = Date.now() + Math.random()
  messages.value.push({ text, type, icon, id })
  visible.value = true
  setTimeout(() => {
    const idx = messages.value.findIndex(m => m.id === id)
    if (idx > -1) messages.value.splice(idx, 1)
    if (messages.value.length === 0) visible.value = false
  }, duration)
}

function closeAll() {
  messages.value = []
  visible.value = false
}

defineExpose({ show, closeAll })
</script>

<style scoped>
.msg-fade-enter-active { animation: msgIn 0.25s ease-out; }
.msg-fade-leave-active { animation: msgOut 0.2s ease-in; }
@keyframes msgIn  { from { opacity:0; transform:translateY(-2vh) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes msgOut { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(0.9); } }
</style>
