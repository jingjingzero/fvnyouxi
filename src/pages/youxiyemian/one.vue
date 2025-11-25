<!--
 * @作者: 冯星悦
 * @Date: 2025-04-16 20:10:43
 * @LastEditTime: 2025-07-28 17:40:14
-->
<!--
 * @作者: 冯星悦
 * @Date: 2025-04-16 20:10:43
 * @LastEditTime: 2025-05-13 14:54:41
-->
<template>
  <div>
    <div v-if="user.attributes.dangqianrenwu?.startsWith('结束')" class="bg-red py-2 px-4 text-white text-16px absolute top-2 right-2 rounded-1 font-bold iconfont2" @touchstart="nextDay">下一天</div>
    <div ref="flashElement" class="text-white flex w-full box-border px-6vw h-full animate__animated" v-show="user.attributes.duihuaBUkejian === 0" @touchstart="touchDown">
      <!-- 不断变黑的背景 -->
      <div class="bg-black absolute flex w-full h-full left-0 z-999" :style="{ opacity: user.attributes.bgOpacity, pointerEvents: 'none' }"></div>
      <!-- 选项 -->
      <div ref="optionsContainer" class="w-36vw z-3 h-20vh absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center gap-y-3 opacity-0 z-1" v-if="user.selectedOptionShow">
        <div
          v-for="(item, index) in user.selectedOption"
          :key="index"
          class="w-full py-2 px-4 rounded-xl text-white iconfont2 text-2vw bg-[#409EFF]/75 border-0.5 border-solid border-white text-center"
          :class="{
            'text-[#cccccc] bg-[#3a3a3a] cursor-not-allowed opacity-40 border-black!': item.isLocked,
          }"
          @click="selectTure(item, index)">
          {{ item.select }}
        </div>
      </div>
      <!-- 人物立绘 -->
      <div ref="dialogRef">
        <div v-show="user.fullBodyImages?.length > 0" class="absolute w-full h-full z-0.51 flex left-0 bottom-0 pointer-events-none">
          <div v-for="(item, index) in user.fullBodyImages" :key="item.id" class="relative">
            <div
              class="absolute z-1"
              :style="{
                left: item.x + 'vw',
                bottom: item.y + 35 + 'vh',
                width: item.daxiao + 40 + 'vh',
                transform: item.fanzhuan ? 'scaleX(-1)' : 'scaleX(1)',
                transition: 'left 0.5s ease-in-out',
              }">
              <img :ref="(el) => (imgRefs[index] = el)" :src="fullBodyImagesImg(item.img)" class="w-full object-contain" />
              <img
                v-show="item.isSpeaking"
                src="@/assets/icon/duihua.webp"
                class="absolute z-1 top-5 w-20vh"
                :style="{
                  left: item.isSpeaking === 2 && item.speakX !== undefined ? `${item.speakX}vw` : 'auto',
                  right: item.isSpeaking === 1 && item.speakX !== undefined ? `${item.speakX}vw` : '-5vw',
                  transform: item.isSpeaking === 2 ? 'scaleX(-1)' : 'scaleX(1)',
                }" />
            </div>
          </div>
        </div>
        <div class="flex w-100vw h-100vh absolute relative -ml-6vw pointer-events-none">
          <div
            v-for="item in user.animations"
            :key="item.src"
            class="absolute"
            :style="{
              left: item.juzhong1 ? '50%' : item.x1 - 1 + 'vw',
              top: item.juzhong1 ? '0' : 'auto',
              bottom: item.juzhong1 ? 'auto' : item.y - 35.5 + 'vh',
              transform: item.juzhong1 ? `translateX(-50%) scaleX(${item.fanzhuan ? -1 : 1})` : `scaleX(${item.fanzhuan ? -1 : 1})`,
              width: `min(${item.daxiao + 55}vh, 100vw)`, // ✅ 限制最大不超过100vw
              transition: 'left 0.5s ease-in-out',
              zIndex: item.z,
            }">
            <transition name="fade" appear>
              <video :poster="item.Imgsrc" preload="auto" :src="item.src" :ref="(el) => (videoRefs[item.id] = el)" autoplay muted loop playsinline webkit-playsinline class="pointer-events-none w-full h-full" />
            </transition>
            <img
              v-show="item.isSpeaking1"
              src="@/assets/icon/duihua.webp"
              class="absolute top-7 left-0 w-20vh z-10"
              :style="{
                left: item.isSpeaking1 === 2 && item.speakX1 !== undefined ? `${item.speakX1}vw` : '2vw',
                right: item.isSpeaking1 === 1 && item.speakX1 !== undefined ? `${item.speakX1}vw` : '-5vw',
                transform: item.isSpeaking1 === 2 ? 'scaleX(-1)' : 'scaleX(1)',
              }" />
          </div>
        </div>

        <div v-show="!user.textYincang && user.wupingShow !== 2">
          <img ref="waichu" v-show="user.attributes.waichu" src="@/assets/icon/waichu.webp" class="w-8 absolute right-2.5vw bottom-17vh object-contain" @click.stop="menu('行动')" />
          <img ref="xinxi" v-show="user.attributes.kucun" src="@/assets/icon/pingban.webp" class="w-8 absolute right-2.5vw bottom-2vh object-contain" @click.stop="menu('背包')" />
          <div v-show="!user.selectBoolean" class="h-5vh flex fixed bottom-26.5vh justify-between w-[calc(100%-14vw)] z-3" :class="{ 'justify-end!': !user.name || user.name === '' }" @touchstart.stop="">
            <div v-show="user.name && user.name !== ''" class="py-0.7vh text-white text-2vw bg-[rgba(0,0,0,0.6)] rounded-4 iconfont2 flex justify-center items-center min-w-16vw">{{ user.name }}</div>
            <div class="flex w-full justify-end gap-x-1.5vw z-2" v-if="!user.attributes.noCaidan">
              <div class="py-0.7vh text-white text-16px bg-[rgba(0,0,0,0.6)] px-15px iconfont2 flex justify-center items-center" v-for="item of info" :key="item" @click.stop="menu(item)" :class="{ 'bg-#409EFF!': item === '快进' && user.kuaijin }">
                {{ item }}
              </div>
            </div>
          </div>
          <!-- 对话框 -->
          <div v-show="user.wupingShow !== 2" class="z-3 bg-[rgba(0,0,0,0.6)] w-[calc(100%-14vw)] h-25vh fixed bottom-0 flex mb-1vh box-border gradient-border pt-2vh" :style="{ '--border-gradient': user.borderGradient }" @touchstart.stop="touch()">
            <div class="typewriter-text px-3vw overflow-y-auto" ref="typewriterContainer" :style="{ fontSize: user.textSize + 'px' }"></div>
          </div>
        </div>
      </div>

      <div v-if="user.wupingShow === 2" class="absolute left-0 z-99 w-full h-full bg-[rgba(0,0,0,0.6)]" @click.stop="user.wupingShow = 0">
        <Ipad />
      </div>
      <div v-else-if="user.wupingShow === 3" class="absolute left-0 z-99 w-full h-full bg-[rgba(0,0,0,0.6)]" @click.stop="">
        <Xingdong />
      </div>
      <div v-else-if="user.wupingShow === 4" class="absolute left-0 z-99 w-full h-full bg-[rgba(0,0,0,0.6)]" @click.stop="">
        <Buy />
      </div>
      <el-tour v-model="user.attributes.tishi01" :show-close="false">
        <el-tour-step v-if="user.attributes.tishi01 === 1" :target="xinxi" title="琳恩的平板" description="你可以使用平板进行一些操作。" />
        <el-tour-step v-else-if="user.attributes.tishi01 === 2" :target="waichu" title="外出" description="你可以点击这个去往别的地方。" />
        <template #indicators="{ current, total }">
          <span class="text-17px">{{ current + 1 }} / {{ total }}</span>
        </template>
      </el-tour>
      <el-dialog v-model="dialogTableVisible" width="500" class="flex justify-center flex-col" top="25vh">
        <div class="flex items-center gap-x-4 mt-5vh pb-1vh justify-center">
          <span>姓名：</span>
          <el-input v-model="myNameInput" style="width: 240px" placeholder="输入你的姓名" />
        </div>
        <template #footer>
          <div>
            <el-button type="primary" @click="tijiaoName(myNameInput)"> 确定 </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
    <div v-show="user.attributes.duihuaBUkejian === 1" class="absolute w-full h-full flex justify-center items-center" @click="riji">
      <div class="bg-black/70 w-52vw h-90vh rounded-1 text-white py-2.5vh px-2.5vw box-border relative">
        <h3 class="text-center tracking-wider">{{ user.attributes.rijiNeirong?.title }}</h3>
        <div class="typewriter-text overflow-y-auto text-white diary-font iconfont2 h-75vh" ref="typewriterContainer1"></div>
        <div class="absolute bottom-1vh right-1.5vw z-10" v-if="btnShow">
          <el-button type="primary" @click="nextRiji">{{ user.attributes.rijiNeirong?.btn }}</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, reactive, onMounted } from "vue";
import { useCounterStore } from "@/store/counter"; // pinia库
import emitter from "@/bus"; // 引入传值组件
import { gsap } from "gsap";
import Ipad from "./ipadVue.vue";
import Xingdong from "./xingdong.vue";
import Buy from "./Buy.vue";
import { ElMessText } from "@/pages/zujian/utils.js";
import { setStorage, readSettings } from "../storage.js";
import { ElMessageBox } from "element-plus";
import { dialogueTree } from "@/juqing_wz/DH01.js";
import yemian1 from "../ceshi3.vue";
const user = useCounterStore();
const dialogTableVisible = ref(false);
const myNameInput = ref("");
const waichu = ref(null);
const xinxi = ref(null);
const dialogRef = ref(null); //淡入淡出对话框
const info = reactive(["隐藏", "读档", "存档", "快进", "菜单"]);
onMounted(() => {
  fullBodyVideos();
  flashTrigger();
  rijiText();
  if (user.text) {
    typewriterEffect(user.text);
  }
  if (user.selectedOptionShow) {
    optionXuanx(true);
  }
});
//点击屏幕
function touchDown() {
  emitter.emit("touchGongo");
}
//下一天
function nextDay() {
  user.playSound("clickS", false, user.volume * 0.5);
  if (user.attributes.dangqianrenwu === "结束1") {
    user.attributes.dangqianrenwu = "";
    user.attributes.Day++;
    console.log("user.attributes.DateYear", user.attributes.DateYear);
    user.attributes.DateYear = new Date(user.attributes.DateYear);
    user.attributes.DateYear.setDate(user.attributes.DateYear.getDate() + 1);
    user.attributes.shiyan = undefined;
    user.attributes.weishi = undefined;
    user.attributes.duihua = undefined;
    user.attributes.anwei = undefined;
    emitter.emit("text_num");
  }
}
// 立绘图片
const fullBodyImagesImg = (src) => {
  return new URL(`../../assets/fullBody/${src}`, import.meta.url).href;
};
const typewriterContainer = ref(null);
const typewriterContainer1 = ref(null);
// 存储每个图片的ref
const imgRefs = ref([]);

// 监听图片路径的变化
watch(
  () => user.fullBodyImages.map((image) => ({ img: image.img, x: image.x })), // 监听每个图片的路径
  (newImages, oldImages) => {
    // 比较路径的变化
    newImages.forEach((newPath, index) => {
      const oldPath = oldImages[index];
      if (newPath.img !== oldPath?.img) {
        nextTick(() => {
          const imgElement = imgRefs.value[index];
          if (imgElement) {
            // 触发动画效果
            gsap.to(imgElement, {
              opacity: 0,
              filter: "blur(10px)",
              duration: 0,
              ease: "power2.out",
              onComplete: () => {
                // 动画完成后切换路径，恢复动画
                imgElement.src = fullBodyImagesImg(user.fullBodyImages[index].img);
                gsap.fromTo(
                  imgElement,
                  { opacity: 0, filter: "blur(10px)" },
                  {
                    opacity: 1,
                    filter: "blur(0px)",
                    duration: 0.75,
                    ease: "power2.out",
                  }
                );
              },
            });
          }
        });
      }
    });
  },
  { deep: true }
); // 文字打字效果（支持 HTML 标签）

function typewriterEffect(htmlText) {
  const container = typewriterContainer.value;
  if (!container) return;
  container.innerHTML = "";

  // 用 DOMParser 解析 HTML 字符串成 DOM 树
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlText}</div>`, "text/html");
  const parsedNodes = Array.from(doc.body.firstChild.childNodes);

  const spans = [];

  // 递归遍历节点并拆成 span
  const appendNode = (node, parent) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // 将文本中的“琳恩”替换为“林恩”
      const text = node.textContent.replace(/琳恩/g, user.zhujue01.name);
      text.split("").forEach((char) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.opacity = "0";
        parent.appendChild(span);
        spans.push(span);
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const wrapper = document.createElement(node.tagName);
      // 复制属性
      for (let attr of node.attributes) {
        wrapper.setAttribute(attr.name, attr.value);
      }
      parent.appendChild(wrapper);
      node.childNodes.forEach((child) => appendNode(child, wrapper));
    }
  };

  parsedNodes.forEach((node) => appendNode(node, container));

  // 动画
  nextTick(() => {
    const speed = 2 - (user.text_speed / 100) * 2;
    const staggerDelay = speed * 0.5;

    gsap.to(spans, {
      opacity: 1,
      duration: speed,
      stagger: staggerDelay,
      ease: "power1.inOut",
      onComplete: () => {
        container.scrollTop = container.scrollHeight;

        // 动画完成后逻辑
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

function renderTemplate(template, data) {
  return template.replace(
    /{{(.*?)}}/g,
    (_, key) =>
      key
        .trim()
        .split(".")
        .reduce((acc, cur) => acc?.[cur], data) || ""
  );
}
// 监听文字变化
watch(
  () => user.text,
  (newVal) => {
    if (!newVal) return;
    newVal = newVal.trim();
    const rendered = renderTemplate(newVal, user); // 替换变量
    user.addMessage(user.name, rendered);
    typewriterEffect(rendered);
  }
);

const videoRefs = {}; // 用对象存，不用数组
//监听立绘视频
function fullBodyVideos() {
  emitter.off("fullBodyVideos");
  emitter.on("fullBodyVideos", async (item) => {
    await nextTick(); // 等待 DOM 渲染
    console.log("item=", item);
    item.forEach(async (item1) => {
      console.log("item1=", item1);
      const index = user.animations.findIndex((image) => image.id === item1.id);
      if (index !== -1 && item1.show === undefined) {
        user.animations[index].isSpeaking1 = item1.isSpeaking;
        if (item1.x) {
          user.animations[index].x1 = item1.x;
        }
        return;
      }
      item1.src = new URL(`../../assets/lihui/${item1.img}.webm`, import.meta.url).href;
      item1.x1 = item1.x;
      item1.show1 = item1.show;
      item1.juzhong1 = item1.juzhong;
      item1.Imgsrc = new URL(`../../assets/lihuiImg/${item1.img}.webp`, import.meta.url).href;
      if (!item1.show1) {
        // 🔴 删除逻辑
        if (index !== -1) {
          const videoEl = videoRefs[item1.id];
          if (videoEl) {
            videoEl.pause();
            videoEl.src = ""; // 释放内存（可选）
          }
          user.animations.splice(index, 1);
          delete videoRefs[item1.id];
        }
        return;
      }
      if (item1.show1 === true) {
        console.log("触发显示", item1);
        console.log("index=", index);
        if (index === -1) {
          // 🟢 新增
          user.animations.push(item1);
        } else {
          // 🟡 更新
          console.log("item1.x=", item1.x);
          if (item1.x !== undefined) {
            console.log("触发x");
            user.animations[index].x1 = item1.x;
            user.animations[index].juzhong1 = false;
            if (item1.img) {
              user.animations[index].src = item1.src;
              user.animations[index].Imgsrc = item1.Imgsrc;
            }
          } else if (item1.img) {
            user.animations[index].src = item1.src;
            user.animations[index].Imgsrc = item1.Imgsrc;
          }
        }
      }
    });
  });
}
const flashElement = ref(null); // 用来引用闪烁的元素
// 点击菜单栏
async function menu(item) {
  user.playSound("clickS", false, user.volume * 0.5);
  if (user.attributes.tishi01) {
    return;
  }
  if (user.kuaijin) {
    clearInterval(user.kuaijin);
    const settings = await readSettings();
    user.text_speed = settings.text_speed;
    user.kuaijin = false;
  }
  if (item === "存档") {
    await ElMessageBox.confirm("确定要覆盖存档吗?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      showClose: false, // 不显示右上角的关闭按钮
    })
      .then(async () => {
        // 点击确定后的逻辑
        user.cundang(1);
      })
      .catch(() => {});
    return;
  } else if (item === "读档") {
    await ElMessageBox.confirm("确定要读取存档吗?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      showClose: false, // 不显示右上角的关闭按钮
    })
      .then(async () => {
        // 点击确定后的逻辑
        user.cundang(2);
      })
      .catch(() => {});
    return;
  } else if (item === "菜单") {
    user.menu = 2;
    user.menuText = user.youxi;
  } else if (item === "快进") {
    if (user.kuaijin) {
      return;
    }
    user.text_speed = 99.8;
    user.kuaijin = setInterval(() => {
      emitter.emit("touchGongo");
    }, 250);
  } else if (item === "背包") {
    user.wupingShow = 2;
  } else if (item === "行动") {
    user.wupingShow = 3;
  } else if (item === "隐藏") {
    user.textYincang = true;
  }
}

//弹出框弹出选项
const optionsContainer = ref(null);

watch(
  () => user.selectedOptionShow,
  (visible) => {
    nextTick(() => {
      optionXuanx(visible);
    });
  }
);

function optionXuanx(visible) {
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
}

async function touch() {
  if (user.kuaijin) {
    clearInterval(user.kuaijin);
    const settings = await readSettings();
    user.text_speed = settings.text_speed;
    user.kuaijin = false;
    return;
  } else if (user.wupingShow >= 2) {
    return;
  }
  emitter.emit("touchGongo");
}

// 选项选择
async function selectTure(item, index) {
  console.log("item=", item);
  if (!user.selectedOptionAble) {
    return;
  } else if (item.isLocked) {
    ElMessText(item.tips);
    return;
  } else if (item.xiayitian) {
    user.newDay();
  } else if (item.quming) {
    dialogTableVisible.value = true;
    myNameInput.value = "";
    return;
  }
  user.selectedOptionAble = false;
  user.selectedOptionShow = false;
  if (item.jiaoyi !== undefined) {
    user.wupingShow = 4;
    return;
  }
  if (item.currentNodeKey !== undefined) {
    user.currentNodeKey = item.currentNodeKey;
    user.youxi = 1;
    if (item.selected) {
      user.attributes.selectselected.push(item.currentNodeKey);
    } else {
      user.attributes.selectStatus.push(item.currentNodeKey);
    }
  }
  let index1;
  if (item.name !== undefined) {
    index1 = user.attributes.Character.findIndex((item1) => item1.name === item.name);
  }
  if (item.Affinity !== undefined) {
    user.attributes.Character[index1].Affinity += item.Affinity;
  }
  if (item.callName !== undefined) {
    user.attributes.Character[index].callName = item.callName;
  }
  emitter.emit("touchGongo");
  if (item.Day !== undefined) {
    user.youxi01 = 0;
  }
  user.attributes.DH02Cur = user.currentNodeKey;
  user.attributes.liaotianNodeKey = item.Day;
}
function tijiaoName(item) {
  const name = String(item).trim();
  if (name == "白白") {
    ElMessText("换个名字吧");
    return;
  }
  dialogTableVisible.value = false;
  user.selectedOptionAble = false;
  user.selectedOptionShow = false;
  user.attributes.textJuxu = false;
  user.attributes.myName = name;
  emitter.emit("touchGongo");
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
let wenziKejixu = false;
const btnShow = ref(false);
// 打印机效果
function typewriterEffect1(content, speed = 80) {
  if (!content) {
    btnShow.value = true;
    return;
  }

  let index = 0;
  let container = typewriterContainer1.value;

  const paragraph = document.createElement("p");
  paragraph.style.textIndent = "1.5em";
  paragraph.style.margin = "5px 0";
  container.appendChild(paragraph);

  const timer = setInterval(() => {
    if (content[index] === "<") {
      // 如果遇到标签，找到 ">"，一次性拼接
      const closeIndex = content.indexOf(">", index);
      if (closeIndex !== -1) {
        paragraph.innerHTML += content.slice(index, closeIndex + 1);
        index = closeIndex + 1;
      }
    } else {
      // 普通字符
      paragraph.innerHTML += content[index];
      index++;
    }

    if (index >= content.length) {
      clearInterval(timer);
      setTimeout(() => {
        wenziKejixu = true;
        console.log("文字打印完毕，wenziKejixu =", wenziKejixu);
      }, 150);
    }

    container.scrollTop = container.scrollHeight;
  }, speed);
}
function rijiText() {
  emitter.off("rijiText");
  emitter.on("rijiText", () => {
    btnShow.value = false;
    typewriterContainer1.value.innerHTML = "";
    if (user.attributes.rijiNeirong.lishiText !== undefined) {
      user.attributes.rijiNeirong.lishiText.forEach((item) => {
        const p = document.createElement("p");
        p.style.textIndent = "1.5em"; // 首行缩进 2 字
        p.style.margin = "5px 0"; // 段落间距
        p.textContent = item; // 设置文字
        typewriterContainer1.value.appendChild(p);
      });
    }
    typewriterEffect1(user.attributes.rijiNeirong.text[user.attributes.rijiNeirong.num], 20);
    console.log("user.attributes.rijiNeirong1 =", user.attributes.rijiNeirong);
  });
}
function riji() {
  if (!wenziKejixu) {
    return;
  }
  console.log("触发日记");

  wenziKejixu = false;
  user.attributes.rijiNeirong.num++;
  typewriterEffect1(user.attributes.rijiNeirong.text[user.attributes.rijiNeirong.num], 20);
}
//下一段文字
function nextRiji() {
  user.attributes.duihuaBUkejian = 0;
  user.text_boolean = false;
  emitter.emit("text_num");
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
/* 动画类名 */
.image-transition-enter-active,
.image-transition-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.image-transition-enter,
.image-transition-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
.diary-font {
  line-height: 1.4;
  font-size: 19px;
  letter-spacing: 0.5px;
}
</style>
