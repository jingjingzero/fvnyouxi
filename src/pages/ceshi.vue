<!--
 * @作者: 冯星悦
 * @Date: 2025-04-16 21:42:29
 * @LastEditTime: 2025-04-22 09:54:01
-->
<template>
  <div class="flex w-full h-full flex-col">
    <img class="absolute w-full h-full object-cover -z-2 opacity-90" src="@/assets/images/senlin2.jpg" />
    <div class="flex">
      <!-- 左边行动条 -->
      <div class="bg-red w-15px rounded-2xl box-border ml-2vw text-1.5vw h-60vh mt-4vh text-white">
        <div class="absolute transition-transform duration-300 ease-linear" v-for="(item, index) of ArrList" :key="index" :style="{ transform: `translateY(${Math.floor(item.progress) * 0.53}vh)` }">
          <img :src="getImageUrl(item.face)" class="w-25px ml-22px" />
        </div>
      </div>
      <!-- 敌人框 -->
      <div class="flex flex-1 h-65vh ml-15vw box-border pt-4vh mr-3vw">
        <div class="flex w-full justify-around">
          <div class="" v-for="(item, index) of diren" :key="index">
            <el-popover class="box-item" placement="left" trigger="click" :disabled="selectDiren" :hide-after="50" :auto-close="3000">
              <template #reference>
                <img :ref="(el) => (imageRefs[index] = el)" :style="getPieceStyle(index)" :src="getRenwuUrl(item.img)" class="w-23vw animate__animated" @click="logImagePosition(index)" :class="['img-piece', `img-piece-${index}`, { 'shadow-[0_0_10px_4px_rgba(255,0,0,0.7)]': selectDiren }]" />
              </template>
              <div class="flex flex-wrap gap-y-1vh text-2vw">
                <div class="w-100% text-center font-bold">等级 {{ item.level }}</div>
                <div class="w-50%">力量 {{ item.strength }}</div>
                <div class="w-50%">速度 {{ item.speed }}</div>
                <div class="w-50%">魔力 {{ item.mana }}</div>
                <div class="w-50%">减伤 {{ item.damageReduction }}%</div>
              </div>
            </el-popover>
            <!-- 飘血数字 -->
            <TransitionGroup name="float" tag="div" class="absolute text-white top-13vh ml-22vw">
              <div v-for="hit in hitNumbers[index] || []" :key="hit.id" class="text-red-500 font-bold text-lg animate-fade-out-up pointer-events-none" :class="['font-bold text-lg animate-fade-out-up pointer-events-none', hit.value > 0 ? 'text-green-500' : 'text-red-500']">
                {{ hit.value > 0 ? "+" + hit.value : hit.value }}
              </div>
            </TransitionGroup>
            <div class="absolute ml-18vw -z-1 flex items-center top-4vh text-1.1vw border-1 border-solid border-#F56C6C bg-[rgba(0,0,0,0.6)] text-white px-1vw py-1vh">Hp <el-progress :percentage="Math.floor((item.currentHp / item.maxHp) * 100)" style="z-index: 5" striped striped-flow status="exception" /> {{ item.currentHp }}/{{ item.maxHp }}</div>
          </div>
        </div>
      </div>
    </div>
    <!-- <div @click="startTimer">回合开始</div> -->
    <div class="flex h-40vh">
      <div v-show="myren" class="mt-11vh flex text-white text-1.1vw ml-1vw">
        <img ref="myImgFace" :src="getImageUrl(myren.face)" class="h-18vh object-contain" />
        <TransitionGroup name="float" tag="div" class="absolute text-white top-80vh ml-20vw">
          <div v-for="hit in hitNumbersMy[0] || []" :key="hit.id" class="text-red-500 font-bold text-lg animate-fade-out-up pointer-events-none" :class="['font-bold text-lg animate-fade-out-up pointer-events-none', hit.value > 0 ? 'text-green-500' : 'text-red-500']">
            {{ hit.value > 0 ? "+" + hit.value : hit.value }}
          </div>
        </TransitionGroup>
        <TransitionGroup name="float" tag="div" class="absolute text-white top-88vh ml-20vw">
          <div v-for="hit in hitEndurance[0] || []" :key="hit.id" class="text-#409EFF font-bold text-lg animate-fade-out-up pointer-events-none">
            {{ hit.value > 0 ? "+" + hit.value : hit.value }}
          </div>
        </TransitionGroup>
        <div class="flex flex-col my-4vh">
          <div class="h-3vh flex"><span>生命</span> <el-progress :percentage="Math.floor((myren.currentHp / myren.maxHp) * 100)" style="z-index: 5" striped striped-flow status="exception" /></div>
          <div class="flex justify-end mr-1vw">{{ myren.currentHp }}/{{ myren.maxHp }}</div>
          <div class="h-3vh flex mt-1.5vh"><span>耐力</span> <el-progress :percentage="Math.floor((myren.endurance / 100) * 100)" style="z-index: 5" striped striped-flow /></div>
          <div class="flex justify-end mr-1vw">{{ myren.endurance }}/100</div>
        </div>
      </div>
      <div class="flex-1 text-white flex justify-center" v-show="!selectDiren && actionPeople">
        <div v-show="!skillShow">
          <div class="flex gap-x-10vw mr-5vw">
            <div v-for="(item, index) of attack" class="bg-[rgba(0,0,0,0.6)] px-2vw py-0.5vh border border-solid border-#409EFF rounded-1 text-2.5vw" :key="item.type" @click="actionType(item, index)">
              {{ item.type }}
            </div>
          </div>
        </div>
        <div v-show="skillShow" class="flex bg-[rgba(0,0,0,0.6)] flex-1 px-4vw box-border gap-x-3vw">
          <div class="flex flex-col w-45% overflow-y-auto">
            <div class="bg-gradient-to-r from-indigo-400 to-cyan-300 font-semibold text-transparent bg-clip-text mb-2vh">魔法</div>
            <div v-for="(item, index) of skillList[0]" :key="index" @click="Sfskill(item, 0)" class="gap-y-0.5vh flex flex-col border border-solid border-#409EFF py-1vh px-2vw rounded-1">
              <div class="flex justify-between text-2vw">
                <span>{{ item.name }}</span>
                <span class="text-#337ECC">{{ item.endurance }} 耐力</span>
              </div>
              <span class="text-1.3vw text-white">{{ item.description }}</span>
            </div>
          </div>
          <div class="flex flex-col w-45% overflow-y-auto">
            <div class="bg-gradient-to-r bg-gradient-to-r from-orange-500 to-red-400 text-transparent bg-clip-text mb-2vh">物理</div>
            <div v-for="(item, index) of skillList[1]" :key="index" @click="Sfskill(item, 1)" class="gap-y-0.5vh flex flex-col border border-solid border-#409EFF py-1vh px-2vw rounded-1">
              <div class="flex justify-between text-2vw">
                <span>{{ item.name }}</span>
                <span class="text-#337ECC">{{ item.endurance }} 耐力</span>
              </div>
              <span class="text-1.3vw text-white">{{ item.description }}</span>
            </div>
          </div>
          <el-icon class="mt-2vh" size="24" @click="skillShow = false"><CircleCloseFilled /></el-icon>
        </div>
      </div>
    </div>
    <div v-if="selectDiren && !effectVisible" class="absolute left-1/2 top-70% -translate-x-1/2 -translate-y-1/2 text-white text-1.5vw">
      <span class="bg-[rgba(0,0,0,0.6)] px-4 py-2vh rounded shadow-lg">点击攻击的敌人</span>
      <span class="bg-[rgba(0,0,0,0.6)] px-4 py-2vh rounded shadow-lg ml-4vw" @click="selectDiren = false">撤回</span>
    </div>
    <!-- 文字描述 -->
    <div class="w-60vw h-22vh absolute bottom-2vh left-55% -translate-x-1/2 box-border pt-2vh px-2vw text-white bg-[rgba(0,0,0,0.6)] typewriter-text">
      <!-- 文字 -->
      <div class="typewriter-text text-2vw" ref="typewriterContainer"></div>
    </div>
    <img ref="effectRef" v-show="effectVisible" class="absolute w-30 h-20vh pointer-events-none z-10" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from "vue";
import { cloneDeep } from "lodash-es";
import { gsap } from "gsap";
import { sleep } from "@/pages/zujian/utils.js";
import { useCounterStore } from "@/store/counter";
import emitter from "@/bus";
import fireballImg from "@/assets/logo/huoqiu.png";
import explosionImg from "@/assets/logo/huiqiubaozha.png";
import zhua from "@/assets/logo/zhua.png";
import { ElMessage } from "element-plus";
const user = useCounterStore();
const myImgFace = ref(null); //我的头像
const effectRef = ref(null); //特效内容
const effectVisible = ref(false); //特效是否显示
const ArrList = ref([]); //人物列表
const diren = ref([]); //敌人列表
const myren = ref(false); //我
const skillShow = ref(false); //技能显示
const skillList = ref([]); //技能列表
const actionPeople = ref(false); //谁的回合
const attack = ref([{ type: "爪击" }, { type: "技能" }, { type: "逃跑" }]);
// 用于存储所有图片的 DOM 引用
const imageRefs = ref([]);
const selectDiren = ref(false); //选择目标
let jineng;
// 点击对应图片，获取它的位置
const logImagePosition = (index) => {
  if (!selectDiren.value) return;
  const imgEl = imageRefs.value[index];
  if (imgEl) {
    if (myren.value.endurance - jineng.endurance < 0) {
      ElMessage("耐力不足");
      return;
    }
    myren.value.endurance -= jineng.endurance;
    const rect = imgEl.getBoundingClientRect();
    // 👉 中心点的像素坐标
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // 👉 转换为 vw/vh 单位
    const centerXvw = (centerX / window.innerWidth) * 100;
    const centerYvh = (centerY / window.innerHeight) * 100;
    const index2 = ArrList.value.findIndex((item1) => item1.name === myren.value.name); //自己在全部元素的索引
    shoot({ x: centerXvw, y: centerYvh }, imgEl, index, index2, { diren: diren.value[index].name, wo: myren.value.name });
  }
};
onMounted(() => {
  for (let i = 0; i < user.fight.length; i++) {
    ArrList.value.push({ ...user.fight[i], progress: 0, type: true, id: i });
    ArrList.value[i].name = user.fight[i].name + i;
  }
  diren.value = cloneDeep(ArrList.value);
  let filteredAttributes = Object.fromEntries(Object.entries(user.attributes).filter(([key]) => !["knowledge", "quanshenImg", "status", "expRequired", "exp"].includes(key)));
  filteredAttributes = {
    ...filteredAttributes,
    name: user.name,
    face: "kongju.png",
    skill: user.skillData.list,
    progress: 0,
  };
  myren.value = filteredAttributes;
  skillList.value[0] = filteredAttributes.skill.filter((item) => item.type === "魔法");
  skillList.value[1] = filteredAttributes.skill.filter((item) => item.type === "物理");
  ArrList.value.push(filteredAttributes);
  console.log(" ArrList.value=", ArrList.value);
  startTimer();
});
//图片路径拼接
const getImageUrl = (name) => {
  return new URL(`../assets/people/wo/biaoqing/${name}`, import.meta.url).href;
};
const getRenwuUrl = (name) => {
  return new URL(`../assets/fullBody/${name}`, import.meta.url).href;
};
// 文字
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
    user.addMessage(user.name, newVal);
    typewriterEffect(newVal);
  }
);
//做出行动
function actionType(item, index) {
  if (index === 0) {
    const index1 = ArrList.value.findIndex((item1) => item1.name === myren.value.name);
    selectDiren.value = true;
    jineng = {
      type: item.type,
      index: index1,
      endurance: 10,
      shanghai: myren.value.strength,
    };
  } else if (index === 1) {
    skillShow.value = true;
  } else if (index === 2) {
    //逃跑
    ElMessage({
      message: "无法逃跑",
      duration: 1000, // 1 秒自动关闭，单位是毫秒
    });
  }
}
//使用技能
function Sfskill(item, index) {
  if (index === 0) {
    //魔法
    const index1 = ArrList.value.findIndex((item1) => item1.name === myren.value.name);
    selectDiren.value = true;
    jineng = {
      type: item.name,
      index: index1,
      endurance: item.endurance,
      shanghai: item.beishu * myren.value.mana,
    };
  } else {
  }
}
// 开始比赛函数
const pausedUnitIndex = ref(null);

const getSpeedGain = (speed) => {
  // 你可以调整这个算法来控制速度的影响程度
  return Math.pow(speed, 0.7);
};

let timer;
// 启动定时器，推进所有单位的进度
const startTimer = () => {
  if (timer !== undefined) {
    return;
  }
  timer = setInterval(() => {
    if (pausedUnitIndex.value !== null) return;
    for (let i = 0; i < ArrList.value.length; i++) {
      const unit = ArrList.value[i];
      unit.progress += getSpeedGain(unit.speed);

      if (unit.progress >= 100) {
        unit.progress = 100;
        pausedUnitIndex.value = i;
        clearInterval(timer); // 停止定时器
        timer = undefined;
        if (unit.type) {
          actionPeople.value = false;
          direnhuihe(unit); //敌人攻击
        } else {
          myren.value = unit;
          actionPeople.value = true;
          myren.value.endurance += 25;
          showEndurance(0, 25);
          if (myren.value.endurance > 100) {
            myren.value.endurance = 100;
          }
        }
      }
    }
  }, 100);
};

// 点击回合后清零当前角色进度
const resetProgress = (index) => {
  ArrList.value[index].progress = 0;
  pausedUnitIndex.value = null;
};

// 每个角色一个数组存数字
const hitNumbers = ref({});
const hitNumbersMy = ref({});
const hitEndurance = ref({});
// 添加飘血数字函数
const showDamage = (index, value) => {
  if (!hitNumbers.value[index]) {
    hitNumbers.value[index] = [];
  }
  const id = Date.now() + Math.random();
  hitNumbers.value[index].push({ id, value });

  // 动画结束后移除
  setTimeout(() => {
    hitNumbers.value[index] = hitNumbers.value[index].filter((item) => item.id !== id);
  }, 1000); // 与动画时长一致
};
const showDamageMy = (index, value) => {
  if (!hitNumbersMy.value[index]) {
    hitNumbersMy.value[index] = [];
  }
  const id = Date.now() + Math.random();
  hitNumbersMy.value[index].push({ id, value });

  // 动画结束后移除
  setTimeout(() => {
    hitNumbersMy.value[index] = hitNumbersMy.value[index].filter((item) => item.id !== id);
  }, 1000); // 与动画时长一致
};
const showEndurance = (index, value) => {
  if (!hitEndurance.value[index]) {
    hitEndurance.value[index] = [];
  }
  const id = Date.now() + Math.random();
  hitEndurance.value[index].push({ id, value });

  // 动画结束后移除
  setTimeout(() => {
    hitEndurance.value[index] = hitEndurance.value[index].filter((item) => item.id !== id);
  }, 1000); // 与动画时长一致
};
//敌人回合
function direnhuihe(item) {
  if (!user.fight) return;
  const index = diren.value.findIndex((item1) => item1.id === item.id);
  const index2 = ArrList.value.findIndex((item1) => item1.id === diren.value[index].id); //自己在全部元素的索引
  const List = cloneDeep(ArrList.value.filter((item) => item.type === undefined));
  const random = Math.floor(Math.random() * List.length);
  const index1 = ArrList.value.findIndex((item) => item.name === List[random].name);
  const imgEl = imageRefs.value[index];
  const rect = imgEl.getBoundingClientRect();
  // 👉 中心点的像素坐标
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  // 👉 转换为 vw/vh 单位
  const centerXvw = (centerX / window.innerWidth) * 100;
  const centerYvh = (centerY / window.innerHeight) * 100;
  jineng = {
    type: "爪击",
    index: random,
    shanghai: item.strength,
  };
  const imgEl1 = myImgFace.value;
  const ceshi = { diren: List[random].name, wo: item.name }
  console.log('ceshi=',ceshi);
  direnTexiao({ x: centerXvw, y: centerYvh }, imgEl1, index1, index2, { diren: List[random].name, wo: item.name });
}
// 特效
const shoot = async (position, imgEl, index, index2, duixiang) => {
  if (effectVisible.value) {
    return;
  }
  const el = effectRef.value;
  if (jineng.type == "火焰弹") {
    el.src = fireballImg;
  } else if (jineng.type == "爪击") {
    el.src = zhua;
  }
  await sleep(150);

  // 👉 起点终点（使用 vw/vh 表示）
  const x1vw = 3;
  const y1vh = 75;
  const x2vw = position.x - 8;
  const y2vh = position.y - 6;

  // 👉 转换为像素计算角度
  const pxX1 = (x1vw / 100) * window.innerWidth;
  const pxY1 = (y1vh / 100) * window.innerHeight;
  const pxX2 = (x2vw / 100) * window.innerWidth;
  const pxY2 = (y2vh / 100) * window.innerHeight;

  const deltaX = pxX2 - pxX1;
  const deltaY = pxY2 - pxY1;
  const angleRadians = Math.atan2(deltaY, deltaX);
  const angleDegrees = angleRadians * (180 / Math.PI);
  // 💥 火焰弹特效
  if (jineng.type == "火焰弹") {
    gsap.killTweensOf(el);
    gsap.set(el, { clearProps: "all" });
    el.style.left = `${x1vw}vw`;
    el.style.top = `${y1vh}vh`;
    el.style.opacity = "1";
    el.style.transform = `rotate(${angleDegrees}deg)`;

    await nextTick();
    effectVisible.value = true;

    // 🔥 飞行动画
    gsap.to(el, {
      x: `${x2vw - x1vw}vw`,
      y: `${y2vh - y1vh}vh`,
      scale: 1.3,
      duration: 1,
      ease: "linear",
      onComplete: () => {
        el.src = explosionImg;
        el.style.transform = "rotate(0deg)";

        setTimeout(() => {
          imgEl.classList.add(`animate__bounceIn`);
        }, 150);

        gsap.fromTo(
          el,
          { scale: 1, rotate: 0 },
          {
            scale: 2,
            rotate: 10,
            duration: 0.2,
            yoyo: true,
            repeat: 3,
            ease: "power2.inOut",
            onComplete: async () => {
              diren.value[index].currentHp -= jineng.shanghai;
              gsap.set(el, { clearProps: "all" });
              skillShow.value = false;
              shanghai(duixiang, index2, index, imgEl);
            },
          }
        );
      },
    });
  } else if (jineng.type == "爪击") {
    // 设置抓挠图片初始状态
    gsap.killTweensOf(el);
    gsap.set(el, {
      clearProps: "all",
      x: position.x,
      y: position.y,
      scale: 1,
      opacity: 1,
    });
    el.style.left = `${position.x - 5}vw`;
    el.style.top = `${position.y - 10}vh`;
    el.style.transform = "rotate(0deg)";
    effectVisible.value = true;
    imgEl.classList.add(`animate__bounceIn`);
    // 👊 抓挠动画
    gsap.fromTo(
      el,
      { scale: 0.8, rotate: -15 },
      {
        scale: 2,
        x: -10,
        y: -10,
        rotate: 15,
        duration: 0.15,
        repeat: 2,
        yoyo: true,
        ease: "power2.inOut",
        onComplete: () => {
          gsap.to(el, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
              gsap.set(el, { clearProps: "all" });
              diren.value[index].currentHp -= jineng.shanghai;
              shanghai(duixiang, index2, imgEl);
            },
          });
        },
      }
    );
  }
};
//敌人特效
const direnTexiao = async (position, imgEl, index, index2, duixiang) => {
  const el = effectRef.value;
  if (jineng.type == "火焰弹") {
    el.src = fireballImg;
  } else if (jineng.type == "爪击") {
    el.src = zhua;
  }
  await sleep(150);

  // 👉 起点终点（使用 vw/vh 表示）
  const x1vw = 3;
  const y1vh = 75;
  const x2vw = position.x - 8;
  const y2vh = position.y - 6;

  // 👉 转换为像素计算角度
  const pxX1 = (x1vw / 100) * window.innerWidth;
  const pxY1 = (y1vh / 100) * window.innerHeight;
  const pxX2 = (x2vw / 100) * window.innerWidth;
  const pxY2 = (y2vh / 100) * window.innerHeight;

  const deltaX = pxX2 - pxX1;
  const deltaY = pxY2 - pxY1;
  const angleRadians = Math.atan2(deltaY, deltaX);
  const angleDegrees = angleRadians * (180 / Math.PI);
  // 💥 火焰弹特效
  if (jineng.type == "火焰弹") {
    gsap.killTweensOf(el);
    gsap.set(el, { clearProps: "all" });
    el.style.left = `${x1vw}vw`;
    el.style.top = `${y1vh}vh`;
    el.style.opacity = "1";
    el.style.transform = `rotate(${angleDegrees}deg)`;

    await nextTick();
    effectVisible.value = true;

    // 🔥 飞行动画
    gsap.to(el, {
      x: `${x2vw - x1vw}vw`,
      y: `${y2vh - y1vh}vh`,
      scale: 1.3,
      duration: 1,
      ease: "linear",
      onComplete: () => {
        el.src = explosionImg;
        el.style.transform = "rotate(0deg)";

        setTimeout(() => {
          imgEl.classList.add(`animate__bounceIn`);
        }, 150);

        gsap.fromTo(
          el,
          { scale: 1, rotate: 0 },
          {
            scale: 2,
            rotate: 10,
            duration: 0.2,
            yoyo: true,
            repeat: 3,
            ease: "power2.inOut",
            onComplete: async () => {
              gsap.set(el, { clearProps: "all" });
              ArrList.value[index].currentHp -= jineng.shanghai;
              if (ArrList.value[index].currentHp < 0) {
                ArrList.value[index].currentHp = 0;
              }
              shanghai(duixiang, index2, index, imgEl);
            },
          }
        );
      },
    });
  } else if (jineng.type == "爪击") {
    // 设置抓挠图片初始状态
    gsap.killTweensOf(el);
    gsap.set(el, {
      clearProps: "all",
      x: position.x,
      y: position.y,
      scale: 1,
      opacity: 1,
    });
    el.style.left = `0vw`;
    el.style.top = `75vh`;
    el.style.transform = "rotate(0deg)";
    effectVisible.value = true;
    imgEl.classList.add(`animate__bounceIn`);
    // 👊 抓挠动画
    await gsap.fromTo(
      el,
      { scale: 0.8, rotate: -15 },
      {
        scale: 2,
        x: -10,
        y: -10,
        rotate: 15,
        duration: 0.15,
        repeat: 2,
        yoyo: true,
        ease: "power2.inOut",
        onComplete: () => {
          gsap.to(el, {
            opacity: 0,
            duration: 0.3,
            onComplete: async () => {
              gsap.set(el, { clearProps: "all" });
              ArrList.value[index].currentHp -= jineng.shanghai;
              if (ArrList.value[index].currentHp < 0) {
                ArrList.value[index].currentHp = 0;
              }
              shanghai(duixiang, index2, imgEl);
            },
          });
        },
      }
    );
  }
};
function shanghai(duixiang, index2, imgEl) {
  effectVisible.value = false;
  selectDiren.value = false;
  duixiang.diren = duixiang.diren.replace(/\d+/g, "");
  duixiang.wo = duixiang.wo.replace(/\d+/g, "");
  console.log('jineng=',jineng);
  user.text = `${duixiang.wo}对${duixiang.diren}使用了${jineng.type},造成了${jineng.shanghai}点伤害`;
  showDamageMy(0, -Number(jineng.shanghai));
  startTimer();
  resetProgress(index2);
  checkHp();
  setTimeout(() => {
    imgEl.classList.remove(`animate__bounceIn`);
  }, 300);
}
let allHaveType = false; //检测存活人数
let allHaveTypeNo = false; //检测存活人数
let death = false;
//血量检测
async function checkHp() {
  death = ArrList.value.filter((unit) => unit.currentHp <= 0);
  for (let i = 0; i < death.length; i++) {
    const index = ArrList.value.findIndex((unit) => unit.name === death[i].name);
    ArrList.value.splice(index, 1);
    allHaveType = ArrList.value.every((item) => item.type);
    if (allHaveType) {
      fightOver(false);
    }
  }
  death = diren.value.filter((unit) => unit.currentHp <= 0);
  for (let i = 0; i < death.length; i++) {
    const index = diren.value.findIndex((unit) => unit.name === death[i].name);
    const index2 = ArrList.value.findIndex((unit) => unit.name === death[i].name);
    explodeImage(index);
    ArrList.value.splice(index2, 1);
    await sleep(1000);
    diren.value.splice(index, 1);
    allHaveTypeNo = diren.value.length === 0;
    if (allHaveTypeNo) {
      fightOver(true);
    }
  }
}
//战斗结束
function fightOver(params) {
  if (!params) {
    //失败
  } else {
  }
  console.log("user.attributes=", user.attributes);
  const index = ArrList.value.findIndex((item) => item.name === user.attributes.myName);
  console.log("index11=", index);
  user.fight = false;
  user.wupingShow = 1;
  setTimeout(() => {
    emitter.emit("text_num");
  }, 150);
}
// 敌人爆炸
const getPieceStyle = (index) => {
  const row = Math.floor(index / 4);
  const col = index % 4;
  return {
    left: `${col * 25}%`,
    top: `${row * 25}%`,
    backgroundPosition: `-${col * 25}% -${row * 25}%`,
  };
};

const explodeImage = (index) => {
  console.log("indexBz=", index);
  gsap.to(`.img-piece-${index}`, {
    duration: 1,
    x: gsap.utils.random(-100, 100),
    y: gsap.utils.random(-100, 100),
    rotation: gsap.utils.random(-180, 180),
    scale: 0,
    opacity: 0,
    ease: "power2.out",
  });
};
</script>
<style scoped>
:root {
  --el-font-size-base: 1.5vw;
}
:deep(.el-progress-bar__outer) {
  width: 6vw;
  margin: 0 1vw;
  margin-top: 0.3vh;
}
:deep(.el-progress__text) {
  display: none;
}
@keyframes fade-out-up {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}
.animate-fade-out-up {
  animation: fade-out-up 1.5s ease-out forwards;
}
</style>
