<template>
  <div ref="root" class="game-root"></div>
  <div ref="joystickContainer" class="joystick-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { createApp } from "./game/app";
import { loadAssets } from "./game/assets";
import { createScene } from "./game/scene";
import { createSpineBoy } from "./game/spineBoy";
import { createController } from "./game/controller";

const root = ref(null);
const joystickContainer = ref(null);

let app, scene, spineBoy, controller;

onMounted(async () => {
  app = await createApp(root.value);
  await loadAssets();

  // 初始化控制器，传入摇杆容器
  controller = createController(joystickContainer.value);

  scene = createScene(app.screen.width, app.screen.height);
  spineBoy = createSpineBoy();

  // Spine 初始状态
  spineBoy.spine.scale.set(scene.scale * 0.32);
  spineBoy.playSpawn();

  app.stage.addChild(scene.view);
  app.stage.addChild(spineBoy.view);

  // 游戏主循环
  app.ticker.add(() => {
    const keys = controller.keys;

    spineBoy.state.walk = keys.left.pressed || keys.right.pressed;
    spineBoy.state.run = spineBoy.state.walk && (keys.left.doubleTap || keys.right.doubleTap);
    spineBoy.state.hover = keys.down.pressed;
    spineBoy.state.jump = keys.space.pressed;

    if (spineBoy.state.walk) {
      spineBoy.setDirection(keys.left.pressed ? -1 : 1);
    }

    spineBoy.update();

    let speed = 8;
    if (spineBoy.state.hover) speed = 10;
    else if (spineBoy.state.run) speed = 9;

    if (spineBoy.state.walk) {
      const dx = speed * spineBoy.direction;
      scene.movePlayer(dx);
    }

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
  position: relative;
}

.joystick-container {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 150px;
  height: 150px;
  touch-action: none;
}
</style>
