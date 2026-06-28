<!--
 * @作者: 冯星悦
 * @Date: 2025-04-15 15:40:17
 * @LastEditTime: 2025-07-28 14:51:05
-->
<template>
  <div class="relative overflow-hidden">
    <template v-if="user.menu === 2">
      <Menu />
    </template>
    <template v-else-if="!user.selectBoolean">
      <qidong v-show="user.youxi <= 0" class="w-100vw h-100vh" />
    </template>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import qidong from "@/components/qidong.vue";
import Menu from "./menu.vue";
import { useCounterStore } from "@/store/counter";
import { readSettings } from "./storage.js";
const user = useCounterStore();


onMounted(async () => {
  if (user.youxi === 0) {
    // user.playSound("jiemian", true);
  }
  const settings = await readSettings();
  user.text_speed = settings.text_speed;
  user.volume = settings.volume;
  user.textSize = settings.textSize;
});
</script>

<style scoped>
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(10px); /* 上下移动距离，可调 */
  }
}

.animate-float {
  animation: float 1.5s ease-in-out infinite;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
