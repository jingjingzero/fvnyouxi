<template>
  <div class="fixed inset-0 z-9999 pointer-events-none overflow-hidden" v-if="visible">
    <!-- 黑幕 -->
    <div class="fixed inset-0 z-9999 pointer-events-none overflow-hidden" v-if="visible === 1">
      <div ref="fogRef" class="absolute inset-0 bg-black opacity-100 z-10"></div>
    </div>

    <!-- 上下眼皮 -->
    <div v-else-if="visible === 2">
      <div ref="topRef" class="absolute top-0 w-full h-1/2 bg-black z-2"></div>
      <div ref="bottomRef" class="absolute bottom-0 w-full h-1/2 bg-black z-2"></div>
    </div>
    <video ref="video" poster="@/assets/lihuiImg/heiping.webp" :src="jueseDonghua" v-if="visible === 3 && jueseDonghua" class="transition-video" muted playsinline webkit-playsinline />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { gsap } from "gsap";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();
const jueseDonghua = ref(""); // 空字符串初始
const video = ref(null);

const props = defineProps({
  visible: {
    type: Number,
    default: 0,
  },
});

const topRef = ref(null);
const bottomRef = ref(null);
const fogRef = ref(null);

// 封装：安全使用 gsap.set
function safeGsapSet(targets, props) {
  const elements = Array.isArray(targets) ? targets.filter(Boolean) : [targets].filter(Boolean);
  if (elements.length) gsap.set(elements, props);
}

// 封装：安全使用 gsap.to，支持 timeline 添加
function safeGsapTo(timeline, targets, props, position) {
  const elements = Array.isArray(targets) ? targets.filter(Boolean) : [targets].filter(Boolean);
  if (elements.length) {
    timeline.to(elements, props, position);
  }
}

// 监听 visible 变化
watch(
  () => props.visible,
  async (newVisible) => {
    await nextTick(); // 等待 DOM 渲染
    console.log("newVisible=", newVisible);

    if (newVisible === 2) {
      await blink(); // 眼皮特效
      setTimeout(() => {
        user.visible = false;
      }, 1000);
    } else if (newVisible === 1) {
      await fadeFog(); // 黑幕渐变特效
    } else if (newVisible === 3) {
      await playVideo(); // 黑幕渐变特效
    }
  }
);
// 过渡 webm 动画（淡入 → 播放 → 淡出）
const playVideo = async () => {
  console.log("触发过渡动画");

  jueseDonghua.value = new URL(
    "@/assets/donghua/guodudonghua.webm",
    import.meta.url
  ).href;

  user.attributes.textJuxu = true;

  await nextTick();

  const v = video.value;
  if (!v) return;

  // 初始化
  v.currentTime = 0;
  v.playbackRate = 1;

  // 👉 强制初始透明
  gsap.set(v, { opacity: 0 });

  // 👉 淡入
  gsap.to(v, {
    opacity: 1,
    duration: 0.5,
    ease: "power2.out",
  });

  v.play();

  const fadeTime = 0.2;      // 淡出时长
  const videoTime = 1.75;    // webm 总时长（秒）

  // 👉 快结束前淡出
  gsap.to(v, {
    opacity: 0,
    duration: fadeTime,
    ease: "power2.inOut",
    delay: videoTime - fadeTime,
    onStart: () => {
      user.attributes.wujiemian = true;
    },
  });

  // 👉 播放结束
  v.onended = () => {
    setTimeout(() => {
      user.attributes.textJuxu = false;
      user.visible = false;
    }, fadeTime * 1000);
  };
};
// 眼皮动画
async function blink() {
  await nextTick();

  // 初始化位置
  gsap.set([topRef.value, bottomRef.value], { yPercent: (i) => (i === 0 ? -100 : 100) });

  const tl = gsap.timeline();

  // 黑幕渐变显示
  tl.to(fogRef.value, { opacity: 0.5, duration: 0.2, ease: "power2.out" });

  // 上下眼皮一起合上
  tl.to(
    [topRef.value, bottomRef.value],
    {
      yPercent: 0,
      duration: 0.25,
      ease: "power2.inOut",
    },
    0
  );

  // 停留一下再打开
  tl.to({}, { duration: 0.15 });

  // 上下眼皮一起打开
  tl.to([topRef.value, bottomRef.value], {
    yPercent: (i) => (i === 0 ? -100 : 100),
    duration: 0.3,
    ease: "power2.inOut",
  });

  // 黑幕渐变消失
  tl.to(fogRef.value, { opacity: 0, duration: 0.3, ease: "power2.inOut" }, "-=0.2");
}

// 黑幕渐隐动画
async function fadeFog() {
  await nextTick();
  gsap.set(fogRef.value, { opacity: 1 }); // 初始黑幕完全不透明

  gsap.to(fogRef.value, {
    opacity: 0, // 渐隐至完全透明
    duration: 2.4, // 渐变持续时长
    ease: "power2.out", // 动画效果
    onComplete: () => {
      user.visible = false;
    },
  });
}
</script>


<style scoped>
.transition-video {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  object-fit: cover;

  opacity: 0;
  transition: opacity 0.5s ease;
  z-index: 5;
  pointer-events: none;
}
</style>