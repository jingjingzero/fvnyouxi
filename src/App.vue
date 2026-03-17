<!--
 * @作者: 冯星悦
 * @Date: 2024-05-20 09:50:23
 * @LastEditTime: 2025-05-16 17:03:49
-->

<template>
  <LandscapeOnly>
    <router-view />
  </LandscapeOnly>
</template>

<script setup>
import { ref, onMounted } from "vue";
import LandscapeOnly from "./zujian/LandscapeOnly.vue";

const videos = import.meta.glob("@/assets/lihui/*.webm", { eager: true });
const videos2 = import.meta.glob("@/assets/donghua/*.webm", { eager: true });
const icons = import.meta.glob("@/assets/icon/*.{png,webp}", { eager: true });
const bgImg = import.meta.glob("@/assets/images/*.{webp}", { eager: true });
const teshu = import.meta.glob("@/assets/teshu/*.{webp}", { eager: true });

// 合并资源对象
const allAssets = { ...videos, ...videos2, ...icons, ...bgImg,...teshu };

onMounted(async () => {
  // 2️⃣ 获取所有 URL 并过滤 undefined
  const urls = Object.values(allAssets)
    .map((mod) => mod?.default)
    .filter(Boolean);

  console.log(`🧩 需要预加载的资源数量: ${urls.length}`);

  const start = performance.now();

  // 3️⃣ 并行加载所有资源
  await Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve, reject) => {
          if (url.endsWith(".webm")) {
            const video = document.createElement("video");
            video.src = url;
            video.preload = "auto";
            video.oncanplaythrough = resolve;
            video.onerror = reject;
          } else {
            const img = new Image();
            img.src = url;
            img.onload = resolve;
            img.onerror = reject;
          }
        })
    )
  );

  const end = performance.now();
  console.log(`✅ 所有资源加载完成，用时 ${((end - start) / 1000).toFixed(2)} 秒`);
});
</script>

<style>
* {
  padding: 0;
  margin: 0;
  user-select: none;
  font-family: Arial !important;
}
.aspect-ratio-16-9 {
  position: relative;
  background-color: #f0f0f0;
}
.aspect-ratio-16-9 video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
img {
  -webkit-touch-callout: none; /* iOS 禁止弹出菜单 */
  -webkit-user-select: none; /* 禁止选择 */
  -ms-touch-action: none; /* Windows 禁止拖动 */
  touch-action: none; /* 禁止在任何触摸设备上拖动 */
  -webkit-user-drag: none; /* 禁止在 Webkit 浏览器中拖动 */
}
.el-message__icon {
  display: none !important;
}
</style>
