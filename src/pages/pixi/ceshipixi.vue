<template>
  <div class="absolute z-2">
    <div>{{ user.ceshi1 }}</div>
      <div>{{ user.ceshi2 }}</div>
        <div>{{ user.ceshi3 }}</div>
  </div>
<div ref="root" class="w-screen h-screen overflow-hidden relative">
  <!-- 摇杆挂载在这里 -->
  <div ref="joystickContainer" class="absolute left-[100px] bottom-[100px] w-[150px] h-[150px]"></div>
</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import nipplejs from "nipplejs";
import { createApp } from "./game/app";
import { loadAssets } from "./game/assets";
import { createController } from "./game/controller";
import { createScene } from "./game/scene";
import { createSpineBoy } from "./game/spineBoy";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();
const root = ref(null);
const joystickContainer = ref(null);

let app, scene, spineBoy, controller;

onMounted(async () => {
  app = await createApp(root.value);
  user.ceshi1 = "通过1"
  await loadAssets();

  // 创建控制器时，把 joystickContainer 传进去
  controller = createController({ joystickZone: joystickContainer.value });

  scene = createScene(app.screen.width, app.screen.height);
  spineBoy = createSpineBoy();

  spineBoy.spine.scale.set(scene.scale * 0.32);
  spineBoy.playSpawn();

  app.stage.addChild(scene.view);
  app.stage.addChild(spineBoy.view);

  app.ticker.add(() => {
    spineBoy.state.walk =
      controller.keys.left.pressed || controller.keys.right.pressed;

    if (spineBoy.state.walk) {
      spineBoy.setDirection(
        controller.keys.left.pressed ? -1 : 1
      );
    }

    spineBoy.update();

    const speed = spineBoy.state.walk ? 8 : 0;

    if (spineBoy.state.walk) {
      scene.movePlayer(speed * spineBoy.direction);
    }

    spineBoy.view.x = (scene.player.x + scene.camera.x) * scene.scale;
    spineBoy.view.y = scene.player.y * scene.scale;
  });
});
onBeforeUnmount(() => {
  app?.destroy(true);
});
</script>
