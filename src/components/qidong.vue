<!--
 * @作者: 冯星悦
 * @Date: 2025-04-15 15:55:21
 * @LastEditTime: 2025-04-23 11:01:33
-->
<template>
  <!-- animate__animated animate__wobble -->
  <div class="flex w-full h-100vh">
    <div class="z-1 flex-1 w-100vw h-100vh mx-6vw flex">
      <div class="w-50% flex flex-col text-white iconfont2 pt-25vh h-full box-border gap-y-2">
        <span v-for="(item, index) of info" :key="index">
          <span class="" @click="enter(index)">{{ item }}</span>
        </span>
      </div>
      <div class="w-50% h-full text-white font-bold iconfont2 text-4vw flex justify-end">
        <div class="mt-10vh gradient-text">兽与月与残光</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useCounterStore } from "@/store/counter"; //pinia库
import emitter from "@/bus"; //引入传值组件
import router from "@/router"; //引入路由
const user = useCounterStore();
const info = reactive(["开始游戏", "读取游戏", "旅途", "设置", "关于"]);
const flashElement = ref(null); // 用来引用闪烁的元素
function enter(index) {
  if (index === 0) {
    user.resetUser();
    user.stopAllSounds();
  } else if (index === 1) {
    user.menu = 2;
    user.text = "";
    user.menuSelect = 2;
  } else if (index === 3) {
    user.menu = 2;
    user.text = "";
    user.menuSelect = 3;
  } else if (index === 4) {
    router.push({ name: "ceshi" });
  }

  // 动态添加动画类
  // const element = flashElement.value;
  // element.classList.remove("animate__wobble"); // 移除旧的闪烁动画
  // void element.offsetWidth; // 强制重排以重新触发动画
  // element.classList.add("animate__wobble"); // 添加新的闪烁动画
}
onMounted(() => {

  if (user.youxi <= 0) {
    user.backgroundImage = new URL("@/assets/images/jiemian0.png", import.meta.url).href;
    user.bg_img = user.backgroundImage;
  }
});
</script>

<style scoped>
.gradient-text {
  background: linear-gradient(to right, #f56c6c, #409eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
