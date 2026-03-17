<template>
  <div class="absolute z-100 text-white">你好</div>
  <canvas ref="canvas"> </canvas>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Matter from "matter-js";
import { loadAssets } from "./assets";
const canvas = ref(null);
  const { Engine, Render, World, Bodies, Body, Runner, Events } = Matter;

onMounted(async() => {
  await loadAssets();
  const engine = Engine.create();
  const world = engine.world;

  const width = 800;
  const height = 600;

  // ====== 渲染器 ======
  const render = Render.create({
    canvas: canvas.value,
    engine: engine,
    options: {
      width,
      height,
      wireframes: true,
      background: "#f0f0f0",
    },
  });
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  // ====== 地面 ======
  const ground = Bodies.rectangle(width / 2, height - 30, width, 60, {
    isStatic: true,
  });
  World.add(world, ground);

  // ====== 可推动方块 ======
  const box1 = Bodies.rectangle(400, 300, 80, 120, {

    density: 50, //质量

    collisionFilter: {
      group: 0, // 同一组 → 不碰撞 / 负值 → 永不碰撞
      category: 0x0001, // 物体类别
      mask: 0xffffffff, // 可以碰撞的类别掩码
    },
  });
  // const box2 = Bodies.rectangle(500, 300, 100, 100, { restitution: 0.1, friction: 0.3, inertia: Infinity });
  World.add(world, [box1]);

  // ====== 玩家胶囊 ======
  const playerH = 80;
  const playerW = 40;
  const radius = playerW / 2;

  const mainRect = Bodies.rectangle(400, 200, playerW, playerH - 2 * radius, {
    friction: 0.1,
    frictionAir: 0.02,
    inertia: Infinity, // 不旋转
  });
  const topCircle = Bodies.circle(400, 200 - (playerH / 2 - radius), radius, {
    inertia: Infinity,
  });
  const bottomCircle = Bodies.circle(
    400,
    200 + (playerH / 2 - radius),
    radius,
    { inertia: Infinity }
  );

  const player = Body.create({
    parts: [mainRect, topCircle, bottomCircle],
    friction: 0.1,
    frictionAir: 0.1,
    density: 0.002,
    restitution: 0,
    inertia: Infinity, // 不旋转
  });
  World.add(world, player);

  // ====== 键盘控制 ======
  const keys = { left: false, right: false, up: false };
  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
    if (e.code === "Space") keys.up = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
    if (e.code === "Space") keys.up = false;
  });

  // ====== 检测是否在地面 ======
  let isOnGround = false;
  Events.on(engine, "collisionStart", (event) => {
    event.pairs.forEach((pair) => {
      if (pair.bodyA === player || pair.bodyB === player) {
        // 简单判断Y方向速度接近0
        if (player.velocity.y >= -1 && player.velocity.y <= 1)
          isOnGround = true;
      }
    });
  });
  Events.on(engine, "collisionEnd", (event) => {
    event.pairs.forEach((pair) => {
      if (pair.bodyA === player || pair.bodyB === player) {
        isOnGround = false;
      }
    });
  });

  // ====== 游戏循环 ======
  const moveForce = 0.01; // 推动力（可以调）

  Events.on(engine, "beforeUpdate", () => {
    // 左右移动（用力推）
    if (keys.left) {
      Body.applyForce(player, player.position, { x: -moveForce, y: 0 });
    }
    if (keys.right) {
      Body.applyForce(player, player.position, { x: moveForce, y: 0 });
    }

    // 跳跃（只能在地面）
    if (keys.up) {
      Body.applyForce(player, player.position, { x: 0, y: -0.03 });
      keys.up = false;
      isOnGround = false;
    }

    // 保持角色直立
    Body.setAngle(player, 0);
    Body.setAngularVelocity(player, 0);
  });
});
</script>

<style>
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
