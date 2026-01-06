<template>
  <div ref="root" class="game-root"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { createApp } from "./game/app";
import { loadAssets } from "./game/assets";
import { createController } from "./game/controller";
import { createScene } from "./game/scene";
import { createSpineBoy } from "./game/spineBoy";

const root = ref(null);
let app;
let scene;
let spineBoy;
let controller;
let sceneX = 0;

onMounted(async () => {
  app = await createApp(root.value);
  await loadAssets();

  controller = createController();

  scene = createScene(app.screen.width, app.screen.height);
  spineBoy = createSpineBoy();

  /* ===== Spine 初始状态 ===== */

  spineBoy.spine.scale.set(scene.scale * 0.32);
  spineBoy.playSpawn();

  // ❗重要：scene.view 先加
  app.stage.addChild(scene.view);

  // ❗Spine 作为“视觉层”，直接加到 stage
  app.stage.addChild(spineBoy.view);

  app.ticker.add(() => {
    /* ===== 状态 ===== */
    spineBoy.state.walk = controller.keys.left.pressed || controller.keys.right.pressed;
    spineBoy.state.run = spineBoy.state.walk && (controller.keys.left.doubleTap || controller.keys.right.doubleTap);
    spineBoy.state.hover = controller.keys.down.pressed;
    spineBoy.state.jump = controller.keys.space.pressed;

    if (spineBoy.state.walk) {
      if (controller.keys.left.pressed) spineBoy.setDirection(-1);
      else if (controller.keys.right.pressed) spineBoy.setDirection(1);
    }

    spineBoy.update();

    /* ===== 移动速度 ===== */
    let speed = 8; // 基础速度
    if (spineBoy.state.hover) speed = 10;
    else if (spineBoy.state.run) speed = 9;

    /* ===== 核心：移动人物，限制在安全区 ===== */
    if (spineBoy.state.walk) {
      const dx = speed * spineBoy.direction;
      scene.movePlayer(dx);
    }

    /* ===== Spine 跟随 scene.player ===== */
   spineBoy.view.x = (scene.player.x + scene.camera.x) * scene.scale;
    spineBoy.view.y = scene.player.y * scene.scale;
  });
});
onBeforeUnmount(() => {
  app?.destroy(true);
});
</script>

<style scoped>
.game-root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
