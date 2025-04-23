<!--
 * @作者: 冯星悦
 * @Date: 2025-04-16 20:10:43
 * @LastEditTime: 2025-04-23 17:19:24
-->
<template>
  <div ref="flashElement" class="text-white flex w-full box-border px-6vw h-full animate__animated">
    <transition name="fade">
      <div v-if="user.cg_imgboolean" class="absolute top-0 w-[calc(100%-12vw)] z-5 h-full flex items-center justify-center bg-[rgba(0,0,0,0.6)]">
        <img :src="user.cg_img" class="object-contain max-h-full" />
      </div>
    </transition>
    <!-- 选项 -->
    <div ref="optionsContainer" class="w-50 h-20vh absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center gap-y-3 opacity-0">
      <div v-for="(item, index) in user.selectedOption" :key="index" class="w-full py-2 px-4 rounded-xl text-white iconfont2 text-2vw bg-[#409EFF]/75 border-0.5 border-solid border-white text-center" @click="selectTure(item, index)">
        {{ item.select }}
      </div>
    </div>
    <div ref="dialogRef">
      <!-- 人物立绘 -->
      <div v-if="user.fullBodyImages?.length > 0" class="absolute w-full h-full z-0.51 flex left-0 bottom-0" @click="touch()">
        <div v-for="item in user.fullBodyImages" :key="item.id">
          <img :src="fullBodyImagesImg(item.img)" class="absolute object-contain w-45vw max-w-78vh" :style="{ left: item.x + 'vw', bottom: item.y + 'vh' }" />
        </div>
      </div>
      <img v-show="!user.selectBoolean && user.wupingShow >= 1" src="@/assets/icon/beibao.png" class="w-5vw absolute right-5vw bottom-35vh rounded-100%" @click.stop="menu('背包')" />
      <div v-show="!user.selectBoolean" class="h-5vh flex fixed bottom-26.5vh justify-between w-[calc(100%-12vw)]" :class="{'justify-end!':!user.name||user.name===''}" @click="touch">
        <div v-show="user.name&&user.name!==''" class="py-0.7vh text-white text-2vw bg-[rgba(0,0,0,0.6)] rounded-4 iconfont2 flex justify-center items-center min-w-16vw">{{ user.name }}</div>
        <div class="flex w-45% justify-end gap-x-1.5vw z-2">
          <div class="py-0.7vh text-white text-2vw bg-[rgba(0,0,0,0.6)] px-2vw iconfont2 flex justify-center items-center" v-for="item of info" :key="item" @click.stop="menu(item)" :class="{ 'bg-#409EFF!': item === '快进' && user.kuaijin }">
            {{ item }}
          </div>
        </div>
      </div>
      <div v-show="user.wupingShow !== 2" class="bg-[rgba(0,0,0,0.6)] w-[calc(100%-12vw)] h-25vh fixed bottom-0 flex mb-1vh box-border gradient-border pt-2vh" :style="{ '--border-gradient': user.borderGradient }" @click="touch()">
        <div class="h-full flex min-w-13vw">
          <img ref="imgRef" v-show="user.face_img" :src="user.face_img" class="w-full h-full object-contain" />
        </div>
        <!-- 文字 -->
        <div class="typewriter-text px-2vw text-2vw" ref="typewriterContainer"></div>
      </div>
    </div>
    <div v-if="user.wupingShow === 2" class="absolute left-0 z-99 w-full h-full bg-[rgba(0,0,0,0.6)]" @click.stop="">
      <Beibao />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, reactive, computed, onMounted } from "vue";
import { useCounterStore } from "@/store/counter"; // pinia库
import { readSettings } from "../storage.js";
import emitter from "@/bus"; // 引入传值组件
import { gsap } from "gsap";
import Beibao from "./beibao1.vue";
import { sleep } from "@/pages/zujian/utils.js";
const user = useCounterStore();
const dialogRef = ref(null); //淡入淡出对话框
const info = reactive(["回退", "存档", "快进", "菜单"]);
const ceshi = ref([
  {
    id: 1,
    show: true,
    img: "monster/redCat1.png",
    x: 0, // x 坐标
    y: 15, // y 坐标
  },
  {
    id: 2,
    show: true,
    img: "monster/redCat1.png",
    x: 45, // x 坐标
    y: 15, // y 坐标
  },
]);
onMounted(() => {
  flashTrigger();
});

// 立绘图片
const fullBodyImagesImg = (src) => {
  return new URL(`../../assets/fullBody/${src}`, import.meta.url).href;
};
const typewriterContainer = ref(null);

// 文字打字效果（支持 HTML 标签）
function typewriterEffect(htmlText) {
  const container = typewriterContainer.value;
  if (!container) return;

  container.innerHTML = "";

  // 用 DOMParser 解析 HTML 字符串成 DOM 树
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlText}</div>`, "text/html");
  const parsedNodes = Array.from(doc.body.firstChild.childNodes);

  const spans = [];

  // 递归遍历每个节点，拆成 span 加入容器
  const appendNode = (node, parent) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split("").forEach((char) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.opacity = "0";
        parent.appendChild(span);
        spans.push(span);
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const wrapper = document.createElement(node.tagName);
      // 复制属性（class, style等）
      for (let attr of node.attributes) {
        wrapper.setAttribute(attr.name, attr.value);
      }
      parent.appendChild(wrapper);
      node.childNodes.forEach((child) => appendNode(child, wrapper));
    }
  };

  parsedNodes.forEach((node) => appendNode(node, container));

  // 开始动画
  nextTick(() => {
    const speed = 2 - (user.text_speed / 100) * 2;
    const staggerDelay = speed * 0.5;

    gsap.to(spans, {
      opacity: 1,
      duration: speed,
      stagger: staggerDelay,
      ease: "power1.inOut",
      onComplete: () => {
        if (user.cg_imgboolean) return;
        if (user.kuaijin) {
          user.text_boolean = false;
          emitter.emit("touchGongo");
          return;
        }
        setTimeout(() => {
          user.text_boolean = false;
        }, 150);
      },
    });
  });
}

// 监听文字变化
watch(
  () => user.text,
  (newVal) => {
    if (!newVal) return;
    newVal = newVal.trim();
    user.addMessage(user.name, newVal);
    typewriterEffect(newVal);
  }
);
//监听头像
const imgRef = ref(null);
watch(
  () => user.face_img,
  async (newVal) => {
    if (!imgRef.value || !newVal) return;

    await gsap.to(imgRef.value, {
      opacity: 0,
      filter: "blur(10px)",
      duration: 0.25,
      ease: "power2.out",
    });

    requestAnimationFrame(() => {
      gsap.fromTo(
        imgRef.value,
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.35,
          ease: "power2.out",
        }
      );
    });
  }
);
const flashElement = ref(null); // 用来引用闪烁的元素
// 点击菜单栏
async function menu(item) {
  if (user.kuaijin) {
    clearInterval(user.kuaijin);
    const settings = await readSettings();
    user.text_speed = settings.text_speed;
    user.kuaijin = false;
  }
  if (item === "存档") {
    user.menuSelect = 1;
    user.menu = 2;
    user.menuText = user.youxi;
    user.youxi--;
    user.text = "";
  } else if (item === "菜单") {
    user.menu = 2;
    user.menuText = user.youxi;
    user.youxi--;
    user.text = "";
  } else if (item === "快进") {
    if (user.kuaijin) {
      return;
    }
    user.text_speed = 99.6;
    user.kuaijin = setInterval(() => {
      emitter.emit("touchGongo");
    }, 250);
    // const element = flashElement.value;
    // element.classList.add(`animate__wobble`); // 添加新的闪烁动画
    // await sleep(1000);
    // element.classList.remove(`animate__wobble`); // 移除旧的闪烁动画
  } else if (item === "回退") {
    const data = user.huituiData;
    user.selectedOptionShow=false
    user.name = data.name;
    user.youxi = (user.selectedOptionShow ? data.youxi - 1 : data.youxi) - 1;
    user.inventory = data.inventory; //我的物品
    user.attributes = data.attributes; //我的属性
    user.skillData = data.skillData; //我的技能点
    user.chapterNumber = data.chapterNumber;
    user.textData = data.textData; //读取文本内容
    setTimeout(() => {
      user.bg_img = data.bg_img;
      user.face_img = data.face_img;
      user.fullBodyImages = data.fullBodyImages;
      user.selectBoolean = data.selectBoolean;
      user.cg_imgboolean = data.cg_imgboolean;
      emitter.emit("text_num");
      user.backgroundImage = new URL(`../../assets/images/${data.bg_img}`, import.meta.url).href;
    }, 150);
  } else if (item === "背包") {
    user.wupingShow = 2;
  }
}

//弹出框弹出选项
const optionsContainer = ref(null);

watch(
  () => user.selectedOptionShow,
  (visible) => {
    nextTick(() => {
      const el = optionsContainer.value;
      if (!el) return;

      if (visible) {
        // 显示选项（淡入 + 激活点击）
        gsap.to(el, {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
          onStart: () => {
            el.style.pointerEvents = "auto";
          },
        });
      } else {
        // 隐藏选项（淡出 + 禁用点击）
        gsap.to(el, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            el.style.pointerEvents = "none";
          },
        });
      }
    });
  }
);

async function touch() {
  console.log("user.kuaijin=", user.kuaijin);
  if (user.kuaijin) {
    clearInterval(user.kuaijin);
    const settings = await readSettings();
    user.text_speed = settings.text_speed;
    user.kuaijin = false;
    return;
  }
  emitter.emit("touchGongo");
}
// 文本边框渐变色
// 动态生成渐变类名
const gradientClass = computed(() => {
  return `gradient-${user.gradientType}`;
});
// 选项选择
function selectTure(item, index) {
  if (!user.selectedOptionAble || (user.text_boolean && !user.selectBoolean)) {
    return;
  }
  console.log("item=", item);
  if (user.selectBoolean) {
    if (item.vid) {
      //取消关键物品，然后可以离开
      const index1 = user.searchContent.findIndex((obj) => obj.vid === item.vid);
      user.searchContent[index1].require = undefined;
      item.vid = undefined;
    }
    if (item.reward.length > 0) {
      if (item.reward[0]?.status) {
        user.attributes.status.push(item.reward[0].status);
      }
      if (item.reward[0].name === "离开") {
        const allUndefined = user.searchContent.every((item) => item.require === undefined);
        // 是否可以离开，是否有物品未被探查
        if (allUndefined) {
          emitter.emit("inventoryTure", { indexNum: -1, text: item.content, textEnd: item.textEnd });
        } else {
          emitter.emit("inventoryTure", { indexNum: -1, text: [{ text: "还有重要物品没探查,再观察下吧" }], textEnd: false });
        }
      } else if (item.reward[0].name === "放下") {
        emitter.emit("inventoryTure", { indexNum: -1, text: item.content, textEnd: item.textEnd });
      } else {
        for (let i = 0; i < item.reward.length; i++) {
          user.addItemToInventory(item.reward[i]);
        }
        emitter.emit("inventoryTure", { indexNum: -1, text: item.content, textEnd: item.textEnd });
        console.log("我的物品", user.inventory);
      }
      user.selectedOptionShow = false;
    } else {
      user.selectedOptionShow = false;
      emitter.emit("inventoryTure", { indexNum: -1, text: item.content, textEnd: item.textEnd });
    }
  } else {
    const hasNum = item.reward.some((obj) => "num" in obj);
    if (hasNum) {
      for (let i = 0; i < item.reward.length; i++) {
        user.addItemToInventory(item.reward[i]);
      }
      emitter.emit("inventoryTure", { indexNum: -1, text: item.content, textEnd: item.textEnd });
      console.log("我的物品", user.inventory);
    }
    // 游戏进度改变
    console.log("item.reward[0].youxi=", item.reward[0]);
    if (item.reward[0].youxi >= 0) {
      user.selectedOptionShow = false; //显示选项
      user.selectedOption = []; //显示内容
      if (item.reward[0]?.status) {
        user.attributes.status.push(item.reward[0].status);
      }
      if (item.reward[0].chapterNumber !== undefined) {
        user.youxi = item.reward[0].youxi;
        user.chapterNumber = item.reward[0].chapterNumber;
        emitter.emit("text_num", item.reward[0].Text);
        return;
      }
      user.youxi += item.reward[0].youxi;
      emitter.emit("text_num", item.reward[0].Text);
    }
  }
  user.selectedOptionAble = false;
}
function flashTrigger() {
  emitter.off("flashTrigger");
  emitter.on("flashTrigger", async (anim) => {
    console.log("flashTrigger changed:", anim);

    if (!anim) return;
    const element = flashElement.value;
    if (!element) return;
    element.classList.add(`animate__${anim}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    element.classList.remove(`animate__${anim}`);
  });
}
</script>

<style scoped>
.typewriter-text {
  white-space: normal; /* 允许换行 */
  word-wrap: break-word; /* 超出容器时自动换行 */
  display: inline-block;
  font-size: 2vw;
  width: 100%; /* 让文本容器宽度占满可用空间 */
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
