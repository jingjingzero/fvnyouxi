<template>
  <div
    class="w-full h-90vh flex flex-col relative overflow-hidden rounded-[1vh] select-none! text-[#e0e0e0] bg-gradient-to-br from-[#141430] via-[#182044] to-[#0d2547]">
    <!-- ==================== 背景装饰层 ==================== -->
    <div class="absolute inset-0 pointer-events-none">
      <img src="@/assets/image/beijing.webp" draggable="false"
        class="w-full h-full object-cover opacity-[0.08] mix-blend-screen" />
      <div class="absolute inset-0 bg-gradient-to-b from-[#141430]/60 via-transparent to-[#0d2547]/85"></div>
      <div class="absolute -top-[8vh] -right-[8vh] w-[42vh] h-[42vh] rounded-full bg-[#fbbf24]/10 blur-[9vh]"></div>
      <div class="absolute -bottom-[10vh] -left-[8vh] w-[38vh] h-[38vh] rounded-full bg-[#f59e0b]/10 blur-[9vh]"></div>
      <div
        class="absolute top-1/4 left-1/2 w-[55vh] h-[55vh] -translate-x-1/2 rounded-full bg-[#a855f7]/5 blur-[12vh]">
      </div>
    </div>

    <!-- ==================== 顶部标题栏 ==================== -->
    <div
      class="relative z-10 flex justify-between items-center px-[3vh] py-[1.8vh] border-b border-white/10 bg-black/25 backdrop-blur-md flex-shrink-0">
      <div class="flex items-center gap-[1.8vh]">
        <div
          class="w-[5.6vh] h-[5.6vh] rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center text-[3vh] shadow-[0_0_2.5vh_rgba(251,191,36,0.45)]">
          🏆
        </div>
        <div>
          <h2
            class="m-0 text-[3.4vh] font-bold iconfont2 bg-gradient-to-r from-[#fbbf24] via-[#fde68a] to-[#f59e0b] bg-clip-text text-transparent leading-none">
            {{ L('achTitle') }}</h2>
          <div class="text-[1.7vh] text-white/45 mt-[0.6vh] tracking-wider">{{ L('achSubtitle') }}</div>
        </div>
      </div>
    </div>

    <!-- ==================== 成就列表（复用公共成就面板 theme=dark） ==================== -->
    <AchievementPanel theme="dark" show-reset class="relative z-10 flex-1 min-h-0 px-[3vh]" />
  </div>
</template>

<script setup>
import AchievementPanel from "@/components/AchievementPanel.vue";
import { ref } from 'vue'
import { t } from '@/i18n';
const langVersion = ref(0)
window.addEventListener('fvnyouxi-lang-changed', () => langVersion.value++)
function L(key) { langVersion.value; return t(key); }
</script>

<style scoped>
</style>
