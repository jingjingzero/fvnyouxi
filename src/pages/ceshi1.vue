<template>
  <div class="sprite" :style="style" @click="playLoop(true)">
    2×2 动画
  </div>

  <div class="sprite" :style="style1" @click="playLoop1(true)">
    3×3 动画
  </div>
</template>

<script setup>
import sprite from "@/assets/pixi/one.webp";
import sprite2 from "@/assets/pixi/zidan.webp";
import { useSpriteAnimation } from "@/pages/useSpriteAnimation";

/* ========= 第一张：2 × 2（保持原本行为） ========= */
const { style, playLoop } = useSpriteAnimation({
  sprite,
  imgW: 1000,
  imgH: 1000,
  gapX: 100,
  gapY: 100,
  nCols: 2,
  nRows: 2,
  frames: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
  frameTimes: [0.5, 1.5, 2],

  // 👇 不传 widthVh / aspectRatio
  // → 默认 50vh × 50vh（正方形）
});

/* ========= 第二张：3 × 3（vh + 宽高比） ========= */
const { style: style1, playLoop: playLoop1 } = useSpriteAnimation({
  sprite: sprite2,

  imgW: 200,   // 单帧宽
  imgH: 100,   // 单帧高
  gapX: 20,
  gapY: 20,
  nCols: 3,
  nRows: 3,

  widthVh: 30, // 👈 宽 = 30vh
  // 宽高比 = 200 : 100 = 2 : 1
  // 高 = 30 / 2 = 15vh
  // 👇 不写也行，会自动用 imgW / imgH
  // aspectRatio: 2,

  frameTime: 0.15,
});
</script>

<style scoped>
.sprite {
  user-select: none;
  image-rendering: auto;
}
</style>
