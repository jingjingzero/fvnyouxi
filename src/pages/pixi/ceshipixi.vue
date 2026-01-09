<template>
  <div class="absolute z-2">
    <div>X轴:{{ user.ceshi1 }}</div>
    <div>Y轴:{{ user.ceshi2?.toFixed(0) }}</div>
    <div>{{ user.ceshi3 }}</div>
  </div>
  <div ref="root" class="w-screen h-screen overflow-hidden relative">
    <!-- 摇杆挂载在这里 -->
    <div ref="joystickContainer" class="absolute left-5vw bottom-8vh w-[25vh] h-[25vh]"></div>
    <!-- 右侧跳跃按钮 -->
    <div class="absolute right-4vw bottom-10vh w-[15vh] h-[15vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-xl select-none active:scale-95" @touchend.prevent="onJumpUp">跳</div>
    <!-- 右侧跳跃按钮 -->
    <div class="absolute right-4vw bottom-30vh w-[15vh] h-[15vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-xl select-none active:scale-95" @touchend.prevent="ceshi5">测试</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import nipplejs from "nipplejs";
import { createApp } from "./app";
import { loadAssets } from "./assets";
import { createController } from "./controller";
import { createScene } from "./scene";
import { createSpineBoy } from "./spineBoy";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();
const root = ref(null);
const joystickContainer = ref(null);

let app, scene, spineBoy, controller;
function ceshi5() {
  console.log("ces");
  //相机视角
  //scene.camera.x+=100
  //玩家位置
   //scene.player.y += 10;
  //  scene.player.x += 50;
}
//跳跃
function onJumpUp() {
  if (!user.pixi.stop) {
    controller.keys.space.pressed = true;
  }
}
onMounted(async () => {
  app = await createApp(root.value);
  await loadAssets();

  scene = createScene(app.screen.width, app.screen.height);
  // // 创建控制器时，把 joystickContainer 传进去
  controller = createController({
    joystickZone: joystickContainer.value, // 传入摇杆容器
    playerSprite: scene.player, // 传入玩家图形
    engine: scene.engine,
    world: scene.world,
    player: scene.player,
  });

  spineBoy = createSpineBoy();
  spineBoy.spine.scale.set(scene.scale * 0.32);
  spineBoy.playSpawn();
  app.stage.addChild(scene.view);
  app.stage.addChild(spineBoy.view);
  console.log("spineBoy=", spineBoy);
  console.log("controller=", controller);
  console.log("scene=", scene);
  //初始化
  spineBoy.vy = 0;
  //地面高度
  scene.groundY = scene.player.y;
  // 默认每秒执行 ~60 次（一帧一次）
  app.ticker.add(() => {
    // 1. 计算“是否在走路”状态
    // 只要当前帧中：左键 或 右键 处于按下状态
    // 就认为角色正在行走
    spineBoy.state.walk = controller.keys.left.pressed || controller.keys.right.pressed;
    // 2. 设置角色朝向（左右）
    // 只有在走路状态下才需要更新朝向
    if (spineBoy.state.walk) {
      // 如果按的是左键 → 朝左（-1）
      // 否则就是右键 → 朝右（+1）
      spineBoy.setDirection(controller.keys.left.pressed ? -1 : 1);

      const speed = spineBoy.state.walk ? 8 : 0;
      scene.movePlayer(speed * spineBoy.direction);
    }

    // 3. 跳跃（只触发一次）
    if (controller.keys.space.pressed && spineBoy.state.onGround) {
      spineBoy.state.onGround = false;
      spineBoy.vy = -25;
    } else {
      controller.keys.space.pressed = false;
    }
    // 4. 垂直方向（重力 & 落地）
    if (!spineBoy.state.onGround) {
      spineBoy.vy += 1.2;
      scene.player.y += spineBoy.vy;
      const groundY = scene.groundY ?? scene.player.y;
      // 落地检测（只触发一次）
      if (scene.player.y >= groundY) {
        scene.player.y = groundY;
        spineBoy.vy = 0;
        spineBoy.state.onGround = true;
      }
    }

    spineBoy.update();

    // 6. 同步 Pixi 视图坐标
    // 将“逻辑坐标 / 世界坐标”
    // 转换为“屏幕坐标”
    //
    // camera.x：摄像机偏移
    // scale：屏幕缩放比例
    spineBoy.view.x = (scene.player.x + scene.camera.x) * scene.scale;
    spineBoy.view.y = scene.player.y * scene.scale;
    user.ceshi3 = spineBoy.view.y;
    user.ceshi1 = scene.player.x;
    user.ceshi2 = scene.player.y;
  });
});
onBeforeUnmount(() => {
  app?.destroy(true);
});
</script>
