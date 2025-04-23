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
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { gsap } from "gsap";

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

    if (newVisible === 2) {
      await blink();  // 眼皮特效
    } else if (newVisible === 1) {
      await fadeFog();  // 黑幕渐变特效
    }
  }
);

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
  gsap.set(fogRef.value, { opacity: 1 });  // 初始黑幕完全不透明

  gsap.to(fogRef.value, {
    opacity: 0,  // 渐隐至完全透明
    duration: 1.5,  // 渐变持续时长
    ease: 'power2.out',  // 动画效果
  });
}
</script>
