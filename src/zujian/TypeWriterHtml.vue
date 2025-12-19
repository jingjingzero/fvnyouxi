<template>
  <div class="relative" @click.stop="skip">
    <div ref="el" class="iconfont2 type-writer"></div>

    <!-- ⭐ 打印完成后显示的 Element Plus 图标 -->
    <div v-if="finished" class="w-94% flex justify-end mt-2">
      <el-icon class="next-icon">
        <CaretBottom />
      </el-icon>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import emitter from "@/bus";
import { useCounterStore } from "@/store/counter";

const user = useCounterStore();

const props = defineProps({
  content: {
    type: [Array, String],
    default: () => [],
  },
  speed: {
    type: Number,
    default: 30, // 每秒字符数（越小越慢）
  },
});

const el = ref(null);

let rafId = null;
let lastTime = 0;
let acc = 0;
let index = 0;
let chars = [];
const finished = ref(false);

let arrowEl = null; // 尾随箭头
let arrText = [];
let textIndex = 0;

/* ================= 工具 ================= */

function clear() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function removeArrow() {
  if (arrowEl) {
    arrowEl.remove();
    arrowEl = null;
  }
}

/* ================= 点击 ================= */

function skip() {
  if (!el.value) return;

  // 已经打印完 → 下一段
  if (finished.value) {
    textIndex++;
    if (textIndex < arrText.length) {
      start(arrText[textIndex]);
    } else {
      user.attributes.HPxushi = undefined;
      user.attributes.textJuxu = false;
      emitter.emit("touchGongo");
    }
  }
  // 还在打印 → 直接补全文字 + 出箭头
  else {
    clear();
    chars.forEach((c) => (c.style.opacity = 1));
    finished.value = true;
  }
}

/* ================= 核心 ================= */

function start(html) {
  if (!el.value) return;

  clear();
  removeArrow();

  finished.value = false;
  index = 0;
  acc = 0;
  chars = [];

  // 写入 HTML
  el.value.innerHTML = html;

  // 拆文本节点 → 单字符 span
  (function walk(node) {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3 && c.textContent) {
        const frag = document.createDocumentFragment();
        [...c.textContent].forEach((ch) => {
          const span = document.createElement("span");
          span.textContent = ch;
          span.style.opacity = 0;
          span.style.transition = "opacity 0.3s linear";
          frag.appendChild(span);
          chars.push(span);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) {
        walk(c);
      }
    });
  })(el.value);

  if (!chars.length) {
    finished.value = true;
    return;
  }

  lastTime = performance.now();
  const interval = 1000 / props.speed;

  function step(now) {
    const delta = now - lastTime;
    lastTime = now;
    acc += delta;

    if (acc >= interval && index < chars.length) {
      const span = chars[index++];
      span.style.opacity = 1;
      acc -= interval;

      const pause = pauseMap[span.textContent];
      if (pause) acc = -pause;
    }

    if (index < chars.length) {
      rafId = requestAnimationFrame(step);
    } else {
      finished.value = true;
      clear();
    }
  }

  rafId = requestAnimationFrame(step);
}

/* ================= 标点停顿 ================= */

const pauseMap = {
  "，": 120,
  ",": 120,
  "。": 260,
  ".": 260,
  "！": 300,
  "!": 300,
  "？": 300,
  "?": 300,
  "…": 420,
};

/* ================= 生命周期 ================= */

onMounted(async () => {
  await nextTick();
  arrText = Array.isArray(props.content) ? props.content : [props.content];
  if (arrText.length) start(arrText[0]);
});

watch(
  () => props.content,
  (v) => {
    arrText = Array.isArray(v) ? v : [v];
    textIndex = 0;
    if (arrText.length) start(arrText[0]);
  }
);

onBeforeUnmount(clear);
</script>

<style scoped>
.type-writer span {
  display: inline-block;
  white-space: pre;
}
.next-icon {
  opacity: 0.85;
  animation: arrow-float 1.2s ease-in-out infinite;
}

@keyframes arrow-float {
  0% {
    transform: translateY(0);
    opacity: 0.3;
  }
  50% {
    transform: translateY(6px);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 0.3;
  }
}
</style>
