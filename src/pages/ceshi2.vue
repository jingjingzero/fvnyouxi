<template>
  <div ref="wrap" v-show="user.youxi !== 0 && user.menu !== 2" class="relative w-full h-[100vh] overflow-hidden bg-black">
    <!-- 背景图 -->
    <img ref="bg" src="@/assets/images/shiyanshi.webp" class="w-full h-full object-cover select-none" @load="updateAllBoxes" @click="handleClick" />

    <!-- 多个红框 -->
    <div
      v-for="(box, index) in boxes"
      :key="index"
      class="absolute bg-red-500 opacity-70 border-2 border-white rounded-md transition-all duration-300"
      :style="{
        left: box.screenX + 'px',
        top: box.screenY + 'px',
        width: box.screenW + 'px',
        height: box.screenH + 'px',
        transform: 'translate(-50%, -50%)',
      }"></div>
   
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";

const user = {
  youxi: 1,
  menu: 1,
  backgroundImage: "@/assets/images/fangjian.webp",
};

const wrap = ref(null);
const bg = ref(null);

// ✅ 每个红框都可以独立宽高（比例值 0~1）
const boxes = ref([
  { x: 0.42, y: 0.65, width: 0.1, height: 0.08 },
  { x: 0.6, y: 0.4, width: 0.07, height: 0.05 },
]);

// 计算 object-cover 后图片的实际显示参数
function getImageRenderInfo() {
  const wrapRect = wrap.value.getBoundingClientRect();
  const img = bg.value;
  if (!img.naturalWidth || !img.naturalHeight) return null;

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const wrapRatio = wrapRect.width / wrapRect.height;

  let renderW,
    renderH,
    offsetX = 0,
    offsetY = 0;

  if (imgRatio > wrapRatio) {
    renderH = wrapRect.height;
    renderW = renderH * imgRatio;
    offsetX = (renderW - wrapRect.width) / 2;
  } else {
    renderW = wrapRect.width;
    renderH = renderW / imgRatio;
    offsetY = (renderH - wrapRect.height) / 2;
  }

  return { renderW, renderH, offsetX, offsetY, wrapRect };
}

// 更新红框位置与大小
function updateAllBoxes() {
  const info = getImageRenderInfo();
  if (!info) return;

  boxes.value.forEach((b) => {
    b.screenX = b.x * info.renderW - info.offsetX;
    b.screenY = b.y * info.renderH - info.offsetY;
    b.screenW = b.width * info.renderW;
    b.screenH = b.height * info.renderH;
  });
}

// 点击添加新红框（支持独立宽高）
function handleClick(e) {
  const info = getImageRenderInfo();
  if (!info) return;

  const clickX = e.clientX - info.wrapRect.left;
  const clickY = e.clientY - info.wrapRect.top;

  const imgX = (clickX + info.offsetX) / info.renderW;
  const imgY = (clickY + info.offsetY) / info.renderH;

  boxes.value.push({
    x: imgX,
    y: imgY,
    width: 0.08,
    height: 0.08,
  });

  console.log(`🟥 新框: x=${imgX.toFixed(3)}, y=${imgY.toFixed(3)}`);
  nextTick(updateAllBoxes);
}

onMounted(() => {
  updateAllBoxes();
  window.addEventListener("resize", updateAllBoxes);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateAllBoxes);
});
</script>
