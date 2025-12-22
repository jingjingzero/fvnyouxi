<template>
  <!-- 正常横屏内容 -->
  <div v-show="isLandscape" class="w-100vw h-100vh">    <router-view /></div>

  <!-- 竖屏遮罩 -->
  <div v-show="!isLandscape" class="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black text-white text-center">
    <div class="text-22px font-bold mb-4">请横屏体验</div>

    <el-button  type="primary" class="mt-6 px-6 py-3 rounded bg-white text-black font-bold active:scale-95 transition" @click="forceLandscape">点击切换横屏</el-button>

    <div class="text-12px opacity-60 mt-4">若无反应，请手动旋转手机</div>
  </div>
</template>


<script setup>
import { ref } from 'vue'

const isLandscape = ref(false)

function checkOrientation() {
  isLandscape.value = window.innerWidth > window.innerHeight
}

async function forceLandscape() {
  try {
    // 必须由用户点击触发
    await screen.orientation.lock('landscape')
    checkOrientation()
  } catch (e) {
    console.warn('浏览器不支持强制横屏', e)
    alert('当前浏览器不支持自动横屏，请手动旋转手机')
  }
}

window.addEventListener('resize', checkOrientation)
checkOrientation()

</script>
<style scoped>
@media screen and (orientation: portrait) {
  .landscape-only {
    display: none;
  }
  .rotate-tip {
    display: flex;
  }
}

/* 横屏 */
@media screen and (orientation: landscape) {
  .landscape-only {
    display: block;
  }
  .rotate-tip {
    display: none;
  }
}
</style>
