<template>
  <div class="w-full h-screen bg-white flex items-center justify-center overflow-hidden relative">
    <div class="relative">
      <!-- 拖尾火焰粒子 -->
      <div
        v-for="i in 8"
        :key="i"
        class="tail"
        :style="getTailStyle(i)"
      />
      <!-- 红色小球 -->
      <div class="ball animate-move-x text-white flex items-center justify-center">
        321
      </div>
    </div>
  </div>
</template>

<script setup>
const getTailStyle = (i) => {
  const delay = i * 0.1
  const scale = 1 - i * 0.1
  const blur = i * 2
  return {
    animationDelay: `${delay}s`,
    transform: `scale(${scale})`,
    filter: `blur(${blur}px)`,
    zIndex: -i,
  }
}
</script>

<style scoped>
.ball {
  @apply w-10 h-10 bg-red-500 rounded-full absolute;
  animation: move-x 3s ease-in-out infinite;
}

/* 拖尾火焰 */
.tail {
  @apply w-10 h-10 bg-red-400 rounded-full absolute;
  animation: move-x 3s ease-in-out infinite;
  opacity: 0.4;
  pointer-events: none;
}

/* 左右来回飘摇动画 */
@keyframes move-x {
  0% {
    transform: translateX(-200px) translateY(0) rotate(0deg);
  }
  25% {
    transform: translateX(-100px) translateY(-5px) rotate(-3deg);
  }
  50% {
    transform: translateX(200px) translateY(0) rotate(0deg);
  }
  75% {
    transform: translateX(100px) translateY(6px) rotate(3deg);
  }
  100% {
    transform: translateX(-200px) translateY(0) rotate(0deg);
  }
}
</style>
