<template>
  <div class="absolute z-2">
    <div>X轴:{{ user.ceshi1 }}</div>
    <!-- <div>Y轴:{{ user.ceshi2?.toFixed(0) }}</div>  -->
    <div>{{ zhenl }}</div>
    <!-- <div>玩家重力{{ user.ceshi3?.toFixed(0) }}</div> -->
  </div>
  <div ref="root" class="w-screen h-screen overflow-hidden relative">
    <!-- 摇杆挂载在这里 -->
    <div ref="joystickContainer" class="absolute left-9vw bottom-15vh w-[25vh] h-[25vh]"></div>
    <!-- 右侧跳跃按钮 -->
    <div class="absolute right-4vw bottom-12vh w-[15vh] h-[15vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-xl select-none active:scale-95" @touchend.prevent="onJumpUp">跳</div>
    <!-- <div class="absolute right-4vw bottom-50vh w-[15vh] h-[15vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-xl select-none active:scale-95" @touchend.prevent="ceshi5">测试</div> -->
    <!-- 右侧跳跃按钮 -->
    <div class="absolute right-4vw bottom-32vh w-[15vh] h-[15vh] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white text-xl select-none active:scale-95" @touchend.prevent="startCooldown">
      <canvas ref="canvas" class="absolute w-full h-full rounded-full z-1"></canvas>
      <!-- 技能按钮 -->
      <div ref="skillBtn" class="w-full h-full rounded-full bg-black/20 flex items-center justify-center text-white text-xl select-none active:scale-95 pointer-events-auto">
        <!-- 倒计时数字 -->
        <span ref="cdText" v-show="isCoolingDown" class="absolute text-white text-xl font-bold z-2"></span>
        <span v-show="!isCoolingDown"> 射击</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import nipplejs from "nipplejs";
import { Text } from "pixi.js";
import { createApp } from "./app";
import { loadAssets } from "./assets";
import { createController } from "./controller";
import { createScene } from "./scene";
import { createSpineBoy } from "./spineBoy";
import { useCounterStore } from "@/store/counter";
function ceshi5() {
  user.pixi.spineBoy.setDirection(1);
  return;
  if (!wurenji) {
    scene.scDrone();
    wurenji = true;
  } else {
    wurenji = false;
    scene.destroyDrone();
  }
  //相机视角
  // scene.camera.x+=100
  //  scene.camera.y+=50
  //玩家位置
  //scene.player.y += 10;
  //scene.player.x += 50;
}
const user = useCounterStore();
const root = ref(null);
const joystickContainer = ref(null);

let app, scene, spineBoy, controller;
let wurenji = false;
const zhenl = ref(0);
//跳跃
function onJumpUp() {
  if (!user.pixi.stop) {
    controller.keys.space.pressed = true;
  }
}
let skillInterval1;
let skillInterval2;
onMounted(async () => {
  app = await createApp(root.value);
  await loadAssets();
  //技能CD
  const c = canvas.value;
  c.width = c.clientWidth;
  c.height = c.clientHeight;
  ctx = c.getContext("2d");

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
  spineBoy.label = "主角";
  user.pixi.spineBoy = spineBoy;
  spineBoy.spine.scale.set(scene.scale * 0.32);
  spineBoy.playSpawn();
  app.stage.addChild(scene.view);
  app.stage.addChild(spineBoy.view);
  // console.log("spineBoy=", spineBoy);
  // console.log("controller=", controller);
  // console.log("scene=", scene);
  //初始化
  spineBoy.vy = 0;
  //地面高度
  scene.groundY = 720;
  //无人机生成
  scene.scDrone();
  wurenji = true;
  //初始化子弹池
  scene.initBulletPool();
  // 默认每秒执行 ~60 次（一帧一次）
  let aiTimer = 0; // 无人机更新（15Hz）
  let npcTimer = 0; // NPC朝向玩家（0.75秒）
  let droneAttackTimer = 0; //无人机攻击
  let fpsTimer = 0; // FPS显示
  const npcs = scene.npcs.map((npc) => npc.char);
  user.pixi.characters = [spineBoy, ...npcs]; //动画数组
  app.ticker.add(() => {
    const deltaMS = app.ticker.deltaMS;

    // ================= FPS 显示（低频） =================
    fpsTimer += deltaMS;
    if (fpsTimer >= 500) {
      zhenl.value = `FPS: ${Math.round(app.ticker.FPS)}`;
      fpsTimer = 0;
    }
    // ================= 技能更新（60Hz） =================
    scene.updateBullets(deltaMS); // 每帧更新
    // ================= 无人机更新（15Hz） =================
    aiTimer += deltaMS;
    if (wurenji) {
      if (aiTimer >= 66) {
        // 每66ms执行一次
        scene.updateDrone(); // 无人机移动/AI
      }
      droneAttackTimer += deltaMS;
      if (droneAttackTimer >= 3000) {
        // 3000ms = 3秒
        scene.updateDroneAttack();
        droneAttackTimer = 0;
      }
    }
    // ================= NPC朝向玩家（0.75秒） =================
    npcTimer += deltaMS;
    if (npcTimer >= 750) {
      // 750ms
      scene.updateNPCFacingPlayer();
      npcTimer = 0;
    }

    // ================= 输入状态 =================
    const left = controller.keys.left.pressed;
    const right = controller.keys.right.pressed;
    const walk = left || right;

    if (spineBoy.state.walk !== walk) {
      spineBoy.state.walk = walk;
    }

    // ================= Y 轴（重力 / 跳跃必须每帧） =================
    const yResult = scene.movePlayerY(scene.groundY, spineBoy.state.onGround, spineBoy.vy);
    spineBoy.vy = yResult.vy;
    spineBoy.state.onGround = yResult.onGround;

    // ================= X 轴（只有走路才算） =================
    if (walk) {
      const dir = left ? -1 : 1;
      if (spineBoy.direction !== dir) spineBoy.setDirection(dir);
      scene.movePlayerX(8 * spineBoy.direction, spineBoy.state.onGround, spineBoy.vy);
    }

    // ================= 跳跃（一次性） =================
    if (controller.keys.space.pressed && spineBoy.state.onGround) {
      spineBoy.state.onGround = false;
      spineBoy.vy = -27;
      // scene.wall.tilePosition.y += 50;
    }
    controller.keys.space.pressed = false;

    // ================= 相机 & 背景（合并计算） =================

    // ================= Spine 更新（最后） =================
    if (aiTimer >= 66) {
      // 每66ms执行一次
      scene.updateCharacters(user.pixi.characters);
      aiTimer = 0;
    }
    // const py = scene.player.y;
    // // 相机
    // const camY = (720 - py) * 0.5;
    // // 背景视差
    // const bgY = camY; // 等价写法（你当前公式就是这个）
    // scene.camera.y = camY;
    // scene.wall.tilePosition.y = bgY;
    // scene.floor.y = bgY;
    // // 角色视图
    // const scale = scene.scale;
    // spineBoy.view.x = (scene.player.x + scene.camera.x) * scale;
    // spineBoy.view.y = (py + camY) * scale;
    // user.ceshi1 = scene.player.x;
  });
});
onBeforeUnmount(() => {
  app?.destroy(true);
});
//技能CD
const canvas = ref(null);
const skillBtn = ref(null);
const cdText = ref(null);

let ctx = null;
let animationFrameId = null;
const isCoolingDown = ref(false);
const cdDuration = 1; // CD秒数
let elapsed = 0;

//倒计时扇形
function drawCooldown(ratio) {
  const c = canvas.value;
  const radius = c.width / 2;
  ctx.clearRect(0, 0, c.width, c.height);

  if (ratio >= 1) return;

  // 绘制半透明扇形覆盖
  ctx.beginPath();
  ctx.moveTo(radius, radius);
  ctx.arc(radius, radius, radius, -Math.PI / 2, -Math.PI / 2 + ratio * 2 * Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();
}
//点击技能
function startCooldown() {
  if (isCoolingDown.value) return;
  isCoolingDown.value = true;
  elapsed = 0;
  skillBtn.value.classList.add("pointer-events-none");
  const direction = spineBoy.direction;
  scene.fireBullet({
    sourceX: scene.player.x,
    sourceY: scene.player.y,
    target: scene.findNearestNPC(scene.player.x, scene.player.y),
    speed: 30,
    setPlayerDir: true,
    direction,
  });
  spineBoy.state.shoot = true;
  function animate() {
    elapsed += 1 / 60;
    const ratio = Math.min(elapsed / cdDuration, 1);

    drawCooldown(ratio);

    // 更新数字倒计时
    cdText.value.textContent = Math.ceil(cdDuration * (1 - ratio));

    if (ratio < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      // CD结束
      cdText.value.textContent = "";
      ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
      skillBtn.value.classList.remove("pointer-events-none");
      isCoolingDown.value = false;
    }
  }

  animate();
}
</script>
