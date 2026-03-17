<template>
  <div class="fixed bottom-[0.8vh] left-1/2 -translate-x-1/2 w-[90vw] h-[23vh]">
    <div
      class="bg-black/50 text-white  px-2vw box-border flex flex-col h-full relative"
    >
        <el-divider style="margin:0 0" class="absolute -left-3.5vw w-50%!"/>
      <!-- 内容滚动区域 -->
      <div
        ref="contentContainer"
        class="flex-1 overflow-y-auto scroll-smooth whitespace-pre-wrap break-words mt-1.5vh"
        @click="next"
      >
        <div v-if="currentDialogue" class="flex items-start gap-3 mb-2">
          <!-- 头像 -->
          <div
            class="w-40vh h-50vh bottom-8vh absolute left-0 -z-1 rounded flex-shrink-0 text-xs"
          >
            <img
              :src="Img(currentDialogue.avatar)"
              class="w-full h-full object-cover pointer-events-none"
            />
          </div>

          <div class="flex-1 flex flex-col">
            <!-- 姓名 -->
            <div
              v-if="currentDialogue.name"
              class="font-bold text-[2.5vw] mb-1 absolute bottom-22vh iconfont2  -left-4vw px-2vw rounded-2 py-1vh"
            >
              {{ currentDialogue.name }}
            </div>

            <!-- 表情 + 文本 -->
            <div class="flex flex-col gap-1">
              <span v-html="displayedText" class="text-[2.1vw] iconfont2" ></span>
            </div>
          </div>
        </div>

        <!-- 分支选项 -->
        <div
          v-if="finished && currentDialogue.options"
          class="mt-2 flex flex-wrap gap-4"
        >
          <el-button
            v-for="(opt, i) in currentDialogue.options"
            size="small"
            :key="i"
            type="primary"

            @click.stop="chooseOption(i)"
            >{{ opt.text }}</el-button
          >
        </div>
      </div>

      <!-- 尾随箭头 -->
      <div
        v-if="finished && !currentDialogue.options"
        class="absolute bottom-2 right-[5%]"
      >
        <el-icon class="next-icon" color="white">
          <CaretBottom />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useCounterStore } from "@/store/counter";
const user = useCounterStore();
const state = ref({ affection: 4, flags: {} });
const Img = (src) => {
  return new URL(`../../assets/fullBody/zhujue/${src}.webp`, import.meta.url)
    .href;
};
// 每条 dialogue 就是一条独立对话，不用数组
const dialogues = [
  {
    id: "start",
    name: "林恩",
    avatar: "zhujue",
    face: "",
    text: "你好，欢迎来到游戏世界！你要做什么？",
    options: [
      { text: "探索地图", affection: 1, next: "explore" },
      { text: "休息一下", affection: 0, next: "rest" },
    ],
  },
  {
    id: "explore",
    name: "小明",
    avatar: "",
    face: "",
    text:
      state.value.affection > 0
        ? "你满怀热情地开始探索，伙伴对你很信任！"
        : "你开始探索，但伙伴看起来有些冷漠。",
    options: [
      { text: "继续探索", affection: 1, next: "find_item" },
      { text: "返回营地", affection: 0, next: "camp" },
    ],
  },
  {
    id: "rest",
    name: "小明",
    avatar: "",
    face: "",
    text: "你休息了一会儿，恢复了精神，但错过了一些机会。",
    options: [
      { text: "继续冒险", affection: 0, next: "explore" },
      { text: "静坐发呆", affection: 0, next: "idle" },
    ],
  },
  {
    id: "find_item",
    name: "小红",
    avatar: "",
    face: "",
    text: "你在地图上发现了珍贵的道具！",
    next: "lake_scene",
  },
  {
    id: "camp",
    name: "小红",
    avatar: "",
    face: "",
    text: "你回到营地，伙伴依然在等待你的决定。",
    next: "camp_talk",
  },
  {
    id: "idle",
    name: "小明",
    avatar: "",
    face: "",
    text: "你坐在原地发呆了一会儿，时间悄悄流逝。",
    next: "idle_scenery",
  },
  {
    id: "lake_scene",
    name: "小明",
    avatar: "",
    face: "",
    text: "你沿着小路走到湖边，湖水清澈见底，微风拂面。",
    next: "red_comment",
  },
  {
    id: "red_comment",
    name: "小红",
    avatar: "",
    face: "",
    text: "小红看着湖水，笑着说：“这里真美呀！”",
    next: "mysterious_sound",
  },
  {
    id: "mysterious_sound",
    name: "小明",
    avatar: "",
    face: "",
    text: "突然，树林里传来奇怪的声音，你立刻警觉起来。",
    next: "follow_sound",
  },
  {
    id: "follow_sound",
    name: "小红",
    avatar: "",
    face: "",
    text: "小红紧紧跟在你身后，你们决定去看看声音的来源。",
    next: "discover_item",
  },
  {
    id: "discover_item",
    name: "小明",
    avatar: "",
    face: "",
    text: "你们发现一件闪闪发光的物品，似乎很珍贵。",
    next: "red_happy",
  },
  {
    id: "red_happy",
    name: "小红",
    avatar: "",
    face: "",
    text: "小红高兴地拍手：“太好了！我们找到了宝物！”",
    next: "continue_adventure",
  },
  {
    id: "continue_adventure",
    name: "小明",
    avatar: "",
    face: "",
    text: "你们继续前进，期待新的冒险。",
    next: "evening_scene",
  },
  {
    id: "evening_scene",
    name: "小红",
    avatar: "",
    face: "",
    text: "夕阳慢慢落下，营地的轮廓显现出来。",
    next: "camp_fire",
  },
  {
    id: "camp_fire",
    name: "小明",
    avatar: "",
    face: "",
    text: "你们围坐在营火旁，感受一天冒险的疲惫和温暖。",
    end: true,
  },
];

const displayedText = ref("");
const finished = ref(false);
const currentDialogue = ref(dialogues[0]);

let charIndex = 0,
  acc = 0,
  lastTime = 0,
  rafId = null;
const cps = 30,
  interval = 1000 / cps;
const pauseMap = {
  "，": 150,
  ",": 150,
  "。": 325,
  ".": 325,
  "！": 325,
  "!": 325,
  "？": 325,
  "?": 325,
};
const contentContainer = ref(null);

function typeStep(now) {
  if (!lastTime) lastTime = now;
  const delta = now - lastTime;
  lastTime = now;
  acc += delta;

  if (!currentDialogue.value) return;

  const text = currentDialogue.value.text || "";

  while (acc >= interval && charIndex < text.length) {
    const ch = text[charIndex++];
    displayedText.value += ch === "\n" ? "<br>" : ch;
    acc -= interval + (pauseMap[ch] || 0);
  }

  nextTick(() => {
    if (contentContainer.value)
      contentContainer.value.scrollTop = contentContainer.value.scrollHeight;
  });

  if (charIndex < text.length) {
    rafId = requestAnimationFrame(typeStep);
  } else {
    finished.value = true;
  }
}

// 开始对话
function startDialogue(id) {
  const dlg = dialogues.find((d) => d.id === id);
  if (!dlg) return;
  currentDialogue.value = dlg;
  displayedText.value = "";
  charIndex = 0;
  acc = 0;
  lastTime = 0;
  finished.value = false;
  rafId = requestAnimationFrame(typeStep);
}

// 点击跳过或下一段
function next() {
  if (!currentDialogue.value) return;

  // 如果打字机还没完成，直接显示完整文本
  if (!finished.value) {
    displayedText.value = currentDialogue.value.text;
    finished.value = true;
    if (rafId) cancelAnimationFrame(rafId);
    nextTick(() => {
      if (contentContainer.value)
        contentContainer.value.scrollTop = contentContainer.value.scrollHeight;
    });
    return;
  }

  // 如果对话标记为结束
  if (currentDialogue.value.end) {
    console.log("你好"); // 这里就是检测到 end:true 执行的逻辑
    user.pixi.duihua = false;
    return;
  }

  // 如果有 next 字段，跳到下一条对话
  if (currentDialogue.value.next) {
    startDialogue(currentDialogue.value.next);
  }
}

// 选择选项
function chooseOption(i) {
  const opt = currentDialogue.value.options[i];
  state.value.affection += opt.affection || 0;
  if (opt.next) startDialogue(opt.next);
}

// 光标闪烁
const showCursor = ref(true);
setInterval(() => (showCursor.value = !showCursor.value), 500);

onMounted(() => startDialogue("start"));
onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.animate-blink {
  animation: blink 1s step-start infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.next-icon {
  color: white !important;
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

.scroll-smooth {
  scroll-behavior: smooth;
}
</style>
