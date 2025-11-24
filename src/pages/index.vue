<!--
 * @作者: 冯星悦
 * @Date: 2025-04-15 15:40:17
 * @LastEditTime: 2025-07-28 14:51:05
-->
<template>
  <div class="relative overflow-hidden" @touchstart="touchDown">
    <div class="absolute top-5vh left-5vw text-1.6vw z-5 text-black z-99999">
      {{user.attributes.Day }} 天
      <!-- {{ user.attributes.liaotian }} --- {{ user.textYincang }} --- {{ user.attributes.Day }}天 -->
      <!-- 状态: {{ user.youxi }} /{{ user.attributes.Day }}天 / {{ user.currentNodeKey }}/聊天{{ user.attributes.liaotian }} 好感度 {{ user.attributes?.Character?.[0]?.Affinity ?? 0 }}
      {{ user.text }} -->
      <!-- <div @click="Ceshi">测试</div> -->
    </div>
    <BlinkOverlay :visible="user.visible" />
    <!-- 背景图 -->
    <transition name="fade" appear>
      <div v-if="user.heipingWenzi !== ''" class="absolute top-0 w-full text-white text-4.5vw iconfont2 z-5 h-full flex items-center justify-center bg-[rgba(0,0,0,0.9)]">
        {{ user.heipingWenzi }}
      </div>
    </transition>
    <div v-if="user.attributes.Day > 0 && user.attributes.liaotian < 1" class="absolute left-0.5 border-2 px-1.5 py-0.5 bg-white/75 border-solid border-#409EFF top-0.5 z-1 text-16px flex gap-x-1 items-center">
      <img src="@/assets/icon/rili.png" class="w-20px h-20px" />
      <span class="iconfont2"
        >第<span class="text-16px mx-1">{{ user.attributes.Day }}</span
        >天</span
      >
    </div>
    <img v-show="user.youxi === 0" :src="user.backgroundImage" class="w-full h-full object-cover select-none absolute" @load="updateBoxPos" @click="handleClick" />
    <div ref="wrap" v-show="user.youxi !== 0 && user.menu !== 2" class="z-0 absolute w-full h-[100vh] overflow-hidden">
      <!-- 背景图 -->
      <template v-if="user.attributes.baise">
        <div class="bg-white w-full h-full"></div>
      </template>

        <img v-show="!user.attributes.baise" ref="bg" :src="user.backgroundImage" class="w-full h-full object-cover select-none" />
      <!-- 红框 -->
      <template v-if="user.attributes.bjIndex !== -1">
        <div
          v-for="(box, index) in user.attributes.bjWuping[user.attributes.bjIndex].boxes"
          :key="index"
          class="flex items-center justify-center absolute opacity-70 border-2 border-white rounded-md transition-all duration-300"
          :class="{
            'red-glow-border': box.liang,
          }"
          :style="{
            left: box.screenX + 'px',
            top: box.screenY + 'px',
            width: box.screenW + 'px',
            height: box.screenH + 'px',
            transform: 'translate(-50%, -50%)',
          }"
          @touchstart="wuping(box)">
          <el-icon v-if="box.show && box.name === '信号'" color="red" class="animate-float"><Bottom /></el-icon>
        </div>
      </template>
    </div>
    <img v-if="user.backgroundImage1" :src="backgroundImage1(user.backgroundImage1)" class="w-full h-full object-cover absolute z-40 top-0 left-0" />
    <!-- 烟雾遮罩层 -->
    <div ref="fog" class="absolute inset-0 bg-black opacity-0 pointer-events-none" />
    <template v-if="user.menu === 2">
      <Menu />
    </template>
    <template v-else-if="!user.selectBoolean">
      <qidong v-show="user.youxi <= 0" class="w-100vw h-100vh" />
      <!-- <youxiyemian @click.stop="" v-if="user.attributes.wujiemian && !user.attributes.liaotian" /> -->
      <div v-show="user.youxi > 0" class="w-100vw h-100vh">
        <youxiyemian @click.stop="" v-if="!user.attributes.liaotian" />
        <youxiyemian1 v-else />
      </div>
    </template>
    <!-- <template v-else>
      <searchIndex v-if="true" />
    </template> -->

    <el-image-viewer v-if="showPreview" :url-list="[localImage]" show-progress :initial-index="0" @close="showPreview = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from "vue";
import qidong from "@/components/qidong.vue";
import youxiyemian from "./youxiyemian/one.vue";
import youxiyemian1 from "./ceshi3.vue";
import Menu from "./menu.vue";
import emitter from "@/bus";
import { gsap } from "gsap";
import BlinkOverlay from "@/pages/zujian/BlinkOverlay.vue";
import { sleep, DuihuaPanduan } from "@/pages/zujian/utils.js";
import { useCounterStore } from "@/store/counter";
import { readSettings } from "./storage.js";
import { dialogueTree } from "@/juqing_wz/DH01.js";
import localImage from "@/assets/images/niao.webp";
import { ElMessageBox } from "element-plus";
import { ElMessText } from "@/pages/zujian/utils.js";
const user = useCounterStore();

//测试图片
const showPreview = ref(false);
const wrap = ref(null);
const bg = ref(null);
function updateAllBoxes() {
  emitter.off("updateAllBoxes");
  emitter.on("updateAllBoxes", () => {
    if (user.attributes.bjIndex === -1) {
      return;
    }
    const info = getImageRenderInfo();
    if (!info) return;
    user.attributes.bjWuping[user.attributes.bjIndex].boxes.forEach((b) => {
      b.screenX = b.x * info.renderW - info.offsetX;
      b.screenY = b.y * info.renderH - info.offsetY;
      b.screenW = b.width * info.renderW;
      b.screenH = b.height * info.renderH;
    });
  });
}
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
//点击图片物品
function wuping(box) {
  user.playSound("clickS", false, user.volume * 0.5);
  if (box.tip !== undefined) {
    user.text = box.tip;
  }
  console.log("box.name=", box.name);
  if (box.name === "小鸟") {
    showPreview.value = true;
  } else if (box.name === "电脑") {
    if (!user.attributes.dangqianrenwu.startsWith("电脑")) {
      return;
    }
    if (user.attributes.dangqianrenwu === "电脑") {
      ElMessageBox.confirm(
        "是否开始今日的工作？", // 提示内容
        "提示", // 标题
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
          closeOnClickModal: false, // 点击遮罩不关闭
          closeOnPressEscape: true,
        }
      )
        .then(() => {
          // if (user.attributes.Day === 2) {
          //   ElMessText(`游戏进度到此为止，敬请等候。`);
          //   return;
          // }
          user.attributes.bjWuping[0].boxes[6].show = false;
          user.attributes.bjWuping[0].boxes[1].liang = false;
          user.attributes.dangqianrenwu = "";
          user.textJuxu = false;
          emitter.emit("text_num");
        })
        .catch(() => {});
    }
  } else if (box.name === "房门") {
    if (!user.attributes.dangqianrenwu.startsWith("房门")) {
      return;
    }
    console.log("真");
    user.attributes.bjWuping[0].boxes[7].show = false;
    user.attributes.bjWuping[0].boxes[2].liang = false;
    if (user.attributes.Day !== 0) {
      user.youxi = 1;
    }
    if (user.attributes.Day === 1) {
      if (user.attributes.Character[0].Affinity === 0) {
        user.currentNodeKey = "start052";
      } else {
        user.currentNodeKey = "start051";
      }
    } else if (user.attributes.Day === 2) {
      user.currentNodeKey = "twoDay_01";
    } else if (user.attributes.Day === 3) {
      user.currentNodeKey = "threeDay_01";
    }
    user.attributes.bjIndex = -1;
    user.attributes.textJuxu = false;
    user.attributes.dangqianrenwu = "";
    emitter.emit("text_num");
  }
}
function onResize() {
  emitter.emit("updateAllBoxes");
}
onMounted(async () => {
  if (user.youxi === 0) {
    user.playSound("jiemian", true);
  }
  text_num();
  touchGongo();
  updateAllBoxes();
  window.addEventListener("resize", onResize);
  const settings = await readSettings();
  user.text_speed = settings.text_speed;
  user.volume = settings.volume;
  user.textSize = settings.textSize;
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});
// 背景特效图
// const backgroundImage1 = (src) => {
//   return new URL(`../assets/image/${src}.webp`, import.meta.url).href;
// };

let clickGoole = false;
async function touchDown() {
  if (user.kuaijin) {
    clearInterval(user.kuaijin);
    const settings = await readSettings();
    user.text_speed = settings.text_speed;
    user.kuaijin = false;
  } else if (user.textYincang && user.textYincang !== 2) {
    user.textYincang = false;
    textYin = true;
  }else if(user.textYincang!==2 && user.attributes.liaotian !==1){
  emitter.emit("touchGongo");
  }
}
let textYin = false;
function touchGongo() {
  emitter.off("touchGongo");
  emitter.on("touchGongo", async () => {
    if (clickGoole) {
      return;
    }
    clickGoole = true;
    setTimeout(() => {
      if (user.text_boolean || user.selectBoolean || user.menu || user.attributes.textJuxu || user.wupingShow >= 2 || user.selectedOptionShow) {
        clickGoole = false;
        return;
      } else if (textYin) {
        textYin = false;
        clickGoole = false;
        return;
      }
      if (user.attributes.liaotian === 3) {
        clickGoole = false;
        return;
      }
      if (user.attributes.liaotian > 0) {
        emitter.emit("text_num1");
      } else {
        emitter.emit("text_num");
      }
      clickGoole = false;
    }, 150);
  });
}
function text_num() {
  emitter.off("text_num");
  emitter.on("text_num", async (item) => {
    user.text_boolean = true;
    const content = dialogueTree[user.currentNodeKey];
    await DuihuaPanduan(content.content[user.youxi]);
  });
}

// 背景图片切换动画
const fog = ref(null);
// 监听 backgroundImage 的变化
watch(
  () => user.backgroundImage,
  async () => {
    await fogTransition();
  }
);

// 过渡动画
function fogTransition() {
  return new Promise((resolve) => {
    gsap.to(fog.value, {
      opacity: 0.5, // 烟雾遮罩显示
      filter: "blur(10px)", // 加入模糊效果
      duration: 0.3,
      onComplete: () => {
        gsap.to(fog.value, {
          opacity: 0,
          filter: "blur(0px)", // 恢复清晰
          duration: 0.5,
          delay: 0.1,
          onComplete: resolve,
        });
      },
    });
  });
}
</script>

<style scoped>
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(10px); /* 上下移动距离，可调 */
  }
}

.animate-float {
  animation: float 1.5s ease-in-out infinite;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
