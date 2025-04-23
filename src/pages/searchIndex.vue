<!--
 * @作者: 冯星悦
 * @Date: 2025-04-16 20:10:43
 * @LastEditTime: 2025-04-22 17:07:13
-->
<template>
  <div class="image-container" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" @mouseup="touchDown">
    <!-- 可拖动的图片 -->
    <div v-show="!showText" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(0,0,0,0.5)] z-3 text-white py-2vh px-2vw text-2vw iconfont2">用点击探索周围环境</div>
    <img
      ref="imgRef"
      :src="imgUrl"
      alt="可拖动图片"
      class="draggable-image"
      @load="onImageLoad"
      :style="{
        transform: `translate(${translate.x}px, ${translate.y}px)`,
      }" />
    <!-- 遍历渲染多个标注点 -->
    <div
      v-for="(marker, index) in markerScreenPositions"
      :key="index"
      class="marker flex items-center justify-center"
      @click="dianji(marker, index)"
      :style="{
        left: `${marker.x}px`,
        top: `${marker.y}px`,
        width: `${marker.size}px`, // 使用动态大小
        height: `${marker.size}px`, // 使用动态大小
      }">
      <div class="w-full h-full bg-red opacity-40 rounded-50%"></div>
      <img v-if="marker.img" :src="getImageUrl(marker.img)" alt="标注图片" class="w-100% h-100% object-cover opacity-100 rounded-50%" />
    </div>
    <div v-show="showText" class="absolute z-50 left-0 top-0 w-full h-full">
      <youxiyemian />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import textData from "@/store/textData.json";
import youxiyemian from "./youxiyemian/one.vue";
import { useCounterStore } from "@/store/counter"; // pinia库
import emitter from "@/bus"; // 引入传值组件
import { ElMessage } from "element-plus";
import { sleep, searchAll } from "@/pages/zujian/utils.js";
const flashAnimate = ref(null); // 用来引用闪烁的元素
const showText = ref(false);
const user = useCounterStore();
let jiyu = false; //是否还有话
let indexNum;
function dianji(item, index) {
  if (showText.value) {
    return;
  }
  console.log("你点击了目标区域", item);
  showText.value = true;
  user.text_boolean = true;
  user.text = item.content[user.selecttextNum].text;
  if (item.content.length > user.selecttextNum) {
    jiyu = item.content;
    showData();
    indexNum = index;
  } else {
    endText();
  }
}
// 继续对话
async function touchDown() {
  if (!showText.value || !jiyu || user.text_boolean) {
    return;
  }
  // 中间出现图片
  user.selecttextNum++;
  user.text_boolean = true;
  showData();
  user.text = jiyu[user.selecttextNum]?.text;
  console.log("jiyu=", jiyu);
  // 对话结束
  if (jiyu[user.selecttextNum] === undefined) {
    user.selecttextNum = 0;
    jiyu = false;
    if (textJixu) {
      textJixu = false;
      showText.value = false;
      if (textEnd === 2) {
        markerScreenPositions.value.splice(user.selectIndexNum, 1);
        user.searchContent.splice(user.selectIndexNum, 1);
        user.selectBoolean = false;
        setTimeout(() => {
          emitter.emit("text_num");
        }, 150);
      } else if (textEnd) {
        markerScreenPositions.value.splice(user.selectIndexNum, 1);
        user.searchContent.splice(user.selectIndexNum, 1);
      }
    } else {
      endText();
    }
  }
}
//
function endText() {
  user.selecttextNum = 0;
  if (markerScreenPositions.value[indexNum].again === 1) {
    markerScreenPositions.value.splice(indexNum, 1);
    user.searchContent.splice(indexNum, 1);
    showText.value = false;
  } else if (markerScreenPositions.value[indexNum].again >= 2) {
    const again = markerScreenPositions.value[indexNum].again;
    const index = textData.selectList.findIndex((item) => item.uid === again);
    user.selectedOption = textData.selectList[index].selectContent;
    user.selectedOptionShow = true;
    user.selectIndexNum = indexNum;
    setTimeout(() => {
      user.selectedOptionAble = true;
    }, 400);
  }
}

// 图片路径和引用
const imgUrl = ref(new URL("@/assets/image/muwu.png", import.meta.url).href);
const imgRef = ref(null);

// 记录图片位置的状态
const translate = ref({ x: 0, y: 0 });
let lastTouch = { x: 0, y: 0 };

// 存储容器和图片的实际尺寸
const containerSize = { width: 0, height: 0 };
const imageSize = { width: 0, height: 0 };

// 标注点的相对位置数组（每个元素是一个位置对象）
const markerRatioPositions = [
  { x: 0.3, y: 0.4 },
  { x: 0.7, y: 0.8 },
  { x: 0.5, y: 0.5 },
];

// 动态的标注点大小
const markerSize = ref(20); // 标注点的大小，可以动态调整

// 存储多个标注点的位置
const markerScreenPositions = ref([]);

// 限制拖动范围
function clamp(val, min, max) {
  return Math.max(min, Math.min(val, max));
}

// 计算并更新所有标注点的屏幕位置
function updateMarkerPosition() {
  const offsetX = translate.value.x;
  const offsetY = translate.value.y;
  // 遍历所有标注点的位置数组
  markerScreenPositions.value = user.searchContent.map((position) => {
    const posX = imageSize.width * position.x + offsetX;
    const posY = imageSize.height * position.y + offsetY;
    return { x: posX, y: posY, size: position.size, content: position.content, again: position.again, img: position.img, NoJixu: position.NoJixu };
  });
}

// 图片加载完成后，获取图片的原始尺寸并计算初始位置
function onImageLoad() {
  const container = document.querySelector(".image-container");
  const img = imgRef.value;

  // 获取容器尺寸
  containerSize.width = container.clientWidth;
  containerSize.height = container.clientHeight;

  // 获取图片的原始尺寸
  imageSize.width = img.naturalWidth;
  imageSize.height = img.naturalHeight;

  // 初始化图片位置：居中
  translate.value = {
    x: (containerSize.width - imageSize.width) / 2,
    y: (containerSize.height - imageSize.height) / 2,
  };

  // 更新标注点的位置
  updateMarkerPosition();
}

// 触摸开始，记录初始触摸位置
function onTouchStart(e) {
  const touch = e.touches[0];
  lastTouch = { x: touch.clientX, y: touch.clientY };
}

// 触摸移动，更新图片的位置
function onTouchMove(e) {
  e.preventDefault(); // 防止页面滚动
  const touch = e.touches[0];
  const dx = touch.clientX - lastTouch.x;
  const dy = touch.clientY - lastTouch.y;

  // 更新图片位置
  const newX = translate.value.x + dx;
  const newY = translate.value.y + dy;

  const minX = containerSize.width - imageSize.width;
  const minY = containerSize.height - imageSize.height;
  const maxX = 0;
  const maxY = 0;

  // 限制图片拖动范围
  translate.value.x = clamp(newX, minX, maxX);
  translate.value.y = clamp(newY, minY, maxY);

  // 更新标注点的位置
  updateMarkerPosition();

  // 更新触摸位置
  lastTouch = { x: touch.clientX, y: touch.clientY };
}

function onTouchEnd() {
  // 可选：松手后处理逻辑
}
onMounted(() => {
  inventoryTure();
});
let textJixu = false; //是否继续对话
let textEnd = false; //对话完成后是否删除
let cgImg = false; //是否出现cg图
let NoJixu = 2;
// 干预物品是否可选择
function inventoryTure() {
  emitter.off("inventoryTure");
  emitter.on("inventoryTure", (item) => {
    console.log("item=", item);
    if (item.text.length > 0) {
      textJixu = true;
      textEnd = item.textEnd;
      user.text_boolean = true;
      user.text = item.text[0].text;
      jiyu = item.text;
      indexNum = 0;
      showData();
    } else {
      showText.value = false;
    }
  });
}
// 图片路径引用
const getImageUrl = (filename) => {
  return new URL(`../assets/wuping/${filename}`, import.meta.url).href;
};
//文字展示图片
async function showData() {
  await searchAll(jiyu[user.selecttextNum]);
}
</script>

<style scoped>
.image-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background-color: black;
  touch-action: none; /* 禁止默认滑动 */
}

.draggable-image {
  position: absolute;
  object-fit: none; /* 图片不缩放不裁剪 */
  user-select: none;
  touch-action: none;
}

.marker {
  border-radius: 50%;
  position: absolute;
  transform: translate(-50%, -50%); /* 居中对齐标注点 */
  pointer-events: auto; /* 确保点击区域有效 */
  z-index: 10;
}
</style>
