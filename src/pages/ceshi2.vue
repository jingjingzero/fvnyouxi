<template>
  <div ref="canvasRef" class="absolute"></div>
  <div class="bg-red h-100vh flex  ">123</div>


</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Application, Assets } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

const canvasRef = ref(null);

let app;
let spine;

onMounted(async () => {
  // 1️⃣ 创建 Pixi 应用
  app = new Application();

await app.init({
  width: window.innerWidth *0.95,
  height: window.innerHeight*0.98,
  backgroundAlpha: 0,   // ⭐ 关键
  antialias: true
});

  canvasRef.value.appendChild(app.canvas);

  // 2️⃣ 加载 Spine 资源
  await Assets.load([
    "/pixi/mao.skel",
    "/pixi/mao.atlas"
  ]);

  // 3️⃣ 创建 Spine
  spine = Spine.from({
    skeleton:  "/pixi/mao.skel",
    atlas:"/pixi/mao.atlas",
  });

  // 4️⃣ 设置位置
  spine.position.set(
    app.screen.width / 2,
    app.screen.height / 2
  );

  spine.scale.set(0.5);

  // 5️⃣ 播放动画
  spine.state.setAnimation(0, "idle", true);

  app.stage.addChild(spine);
});

onBeforeUnmount(() => {
  if (app) {
    app.destroy(true);
  }
});
</script>

<style scoped>
canvas {
  display: block; /* 去除inline间隙 */
}
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>